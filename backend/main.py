import os, re, json, hashlib, math
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlmodel import Session, select
from sqlalchemy import func, or_, text
from sqlalchemy.exc import OperationalError

from db import engine
from schema import District, DocumentChunk, LegislationEvent, PolicyDocument, Politician, VoteRecord
from embed import get_query_embedding
from llm_engine import LLMEngine
import logging

logger = logging.getLogger("civic_spiegel.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Civic Spiegel Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civic-spiegel.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-IP rate limiter (in-memory; resets on process restart, fine for free-tier Render).
# Uses X-Forwarded-For via get_remote_address so it works behind Render's proxy.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

llm = LLMEngine()

# TagClassifier policy_area → POLICY_AREAS id mapping
TAG_AREA_MAP: Dict[str, List[str]] = {
    "Housing": ["Housing and Community Development"],
    "Criminal Justice": ["Crime and Law Enforcement"],
    "Transportation": ["Transportation and Public Works"],
    "Budget": ["Economics and Public Finance", "Government Operations and Politics"],
    "Education": ["Education"],
    "Environment": ["Environmental Protection", "Energy", "Public Lands and Natural Resources", "Agriculture and Food"],
    "Health": ["Health", "Social Welfare", "Families"],
    "Immigration": ["Immigration"],
    "Labor": ["Labor and Employment"],
    "Civil Rights": ["Civil Rights and Liberties, Minority Issues"],
}

# Reverse: frontend area id → classifier tag names to look for in metadata
AREA_TO_TAGS: Dict[str, List[str]] = {}
for tag, area_ids in TAG_AREA_MAP.items():
    for area_id in area_ids:
        AREA_TO_TAGS.setdefault(area_id, []).append(tag)

# Keyword fallback for areas not covered by TagClassifier
AREA_KEYWORDS: Dict[str, List[str]] = {
    "Housing and Community Development": ["housing", "rent", "tenant", "landlord", "hpd", "nycha", "zoning", "afford", "eviction"],
    "Education": ["school", "education", "student", "teacher", "doe", "curriculum", "literacy", "college"],
    "Crime and Law Enforcement": ["police", "nypd", "crime", "safety", "enforcement", "officer", "jail", "fire"],
    "Transportation and Public Works": ["transit", "mta", "bus", "subway", "street", "traffic", "parking", "bike", "ferry", "dot"],
    "Environmental Protection": ["environment", "climate", "green", "pollution", "emission", "waste", "park", "tree", "dep"],
    "Health": ["health", "medical", "hospital", "covid", "care", "mental", "wellness", "dohmh", "medicaid"],
    "Immigration": ["immigrant", "immigration", "visa", "asylum", "citizenship", "migrant"],
    "Taxation": ["tax", "levy", "assessment", "exemption", "abatement", "revenue", "fiscal"],
    "Labor and Employment": ["labor", "worker", "wage", "employment", "union", "job", "hire", "workplace"],
    "Commerce": ["business", "commerce", "retail", "vendor", "license", "market", "sbs"],
    "Families": ["famil", "child", "parent", "domestic", "foster", "elder", "senior", "youth", "acs"],
    "Government Operations and Politics": ["council", "mayor", "agency", "government", "election", "commission", "board"],
    "Economics and Public Finance": ["budget", "economy", "finance", "spending", "bond", "fiscal", "comptroller"],
    "Civil Rights and Liberties, Minority Issues": ["civil rights", "discrimination", "equity", "minority", "bias"],
    "Science, Technology, Communications": ["tech", "digital", "data", "broadband", "cyber", "ai", "internet"],
    "Social Welfare": ["welfare", "social service", "benefit", "snap", "medicaid", "voucher", "hra"],
    "Energy": ["energy", "solar", "utility", "electric", "grid", "power", "fuel"],
    "Arts, Culture, Religion": ["arts", "culture", "religion", "museum", "library", "heritage"],
    "Agriculture and Food": ["food", "agriculture", "farm", "restaurant", "nutrition", "grocery"],
    "Emergency Management": ["emergency", "disaster", "hurricane", "flood", "crisis", "oem"],
    "Public Lands and Natural Resources": ["park", "land", "forest", "waterfront", "open space", "preserve", "dpr"],
}

BOROUGH_ALIASES: Dict[str, str] = {
    "manhattan": "Manhattan", "brooklyn": "Brooklyn", "queens": "Queens",
    "bronx": "Bronx", "the bronx": "Bronx", "staten island": "Staten Island",
    "si": "Staten Island", "bk": "Brooklyn", "bx": "Bronx", "qns": "Queens", "mn": "Manhattan",
}
_DISTRICT_RE = re.compile(r"\b(?:council\s+district|district|cd)\s*(\d{1,2})\b", re.I)
_BOROUGH_RE  = re.compile(r"\b(manhattan|brooklyn|queens|the\s+bronx|bronx|staten\s+island)\b", re.I)
_LEGISTAR_RE = re.compile(r"legistar\.council\.nyc\.gov", re.I)
_COUNCIL_RE  = re.compile(r"council\.nyc\.gov", re.I)


def normalize_borough(raw: Optional[str]) -> Optional[str]:
    if not raw: return None
    return BOROUGH_ALIASES.get(raw.strip().lower(), raw.strip())


# district cache
_borough_to_dids: Optional[Dict[str, List[int]]] = None
_zip_to_dids: Optional[Dict[str, List[int]]] = None
_all_district_ids: Optional[List[int]] = None


def _ensure_district_cache(session: Session) -> None:
    global _borough_to_dids, _zip_to_dids, _all_district_ids
    if _borough_to_dids is not None: return
    _borough_to_dids, _zip_to_dids, _all_district_ids = {}, {}, []
    try:
        districts = session.exec(select(District).where(District.jurisdiction == "NYC Council")).all()
        for d in districts:
            if not d.district_number or not d.district_number.isdigit(): continue
            did = int(d.district_number)
            _all_district_ids.append(did)
            if d.borough: _borough_to_dids.setdefault(d.borough, []).append(did)
            for z in (d.zip_codes or []):
                if z: _zip_to_dids.setdefault(z.strip(), []).append(did)
    except Exception as e:
        logger.warning("District cache load failed: %s", e)


def infer_districts_from_text(
    session: Session,
    title: str,
    source_url: str,
    meta: Dict,
) -> List[int]:
    """
    Infer council district IDs for a PolicyDocument using all available signals,
    since metadata_tags is unstructured and usually empty of location data.

    Priority order:
    1. Explicit district fields in metadata_tags
    2. ZIP code in metadata_tags → District.zip_codes lookup
    3. District number in title text ("District 5", "CD-12")
    4. Borough in title text → all districts in that borough
    5. NYC-wide source (legistar, council.nyc.gov) → all 51 districts
    6. Nothing found → []

    Note: levels 4 and 5 assign many districts, which means the heatmap
    shows uniform color for city-wide docs. This is correct behavior —
    a city-wide bill affects all districts equally.
    """
    _ensure_district_cache(session)

    ids: Set[int] = set()

    # try explicit district in metadata fields first
    for key in ("council_district", "council_districts", "districts", "district"):
        val = meta.get(key)
        if val is None: continue
        if isinstance(val, int): ids.add(val)
        elif isinstance(val, list):
            for v in val:
                try: ids.add(int(v))
                except: pass
        elif isinstance(val, str):
            for part in re.split(r"[,\s]+", val):
                try: ids.add(int(part.strip()))
                except: pass
    if ids: return sorted(ids)

    for key in ("zip", "zip_code", "zipcode", "postal_code"):
        z = str(meta.get(key) or "").strip()
        if z and z.isdigit() and len(z) == 5:
            ids.update((_zip_to_dids or {}).get(z, []))
    if ids: return sorted(ids)

    m = _DISTRICT_RE.search(title or "")
    if m:
        try:
            did = int(m.group(1))
            if 1 <= did <= 51: ids.add(did)
        except ValueError: pass
    if ids: return sorted(ids)

    bm = _BOROUGH_RE.search(title or "")
    if bm:
        raw_boro = bm.group(1).replace("the ", "").strip().title()
        normed = normalize_borough(raw_boro)
        if normed and _borough_to_dids:
            ids.update(_borough_to_dids.get(normed, []))
    if ids: return sorted(ids)

    # nyc-wide source → assign all 51 council districts
    if _LEGISTAR_RE.search(source_url or "") or _COUNCIL_RE.search(source_url or ""):
        return sorted(_all_district_ids or [])

    src_type = str(meta.get("source_type") or "").lower()
    if any(kw in src_type for kw in ("nycc", "nyc legislation", "nyc council", "legistar", "transcript", "hearing")):
        return sorted(_all_district_ids or [])

    return []


def doc_matches_area(doc: PolicyDocument, area: str) -> bool:
    """
    Check if a PolicyDocument matches a policy area using:
    1. TagClassifier output in metadata_tags.policy_areas (preferred)
    2. Title/source_type keyword fallback
    """
    if not area or area.strip().lower() in ("all", "all issues", ""):
        return True

    meta = doc.metadata_tags or {}

    # use TagClassifier output
    classifier_tags = meta.get("policy_areas") or []
    if isinstance(classifier_tags, list) and classifier_tags:
        tags_to_match = AREA_TO_TAGS.get(area, [])
        if tags_to_match:
            if any(ct in tags_to_match for ct in classifier_tags):
                return True
            # try case-insensitive partial match
            area_lower = area.lower()
            for ct in classifier_tags:
                if area_lower in ct.lower() or ct.lower() in area_lower:
                    return True

    # keyword fallback on title + source_type
    kws = AREA_KEYWORDS.get(area, [])
    if kws:
        searchable = f"{doc.title or ''} {doc.source_type or ''}".lower()
        if any(kw in searchable for kw in kws):
            return True

    return False


# timeframe helper
def timeframe_to_days(timeframe: Optional[str]) -> Optional[int]:
    if not timeframe: return None
    t = timeframe.strip().lower()
    if "30" in t: return 30
    if "6 month" in t or "180" in t: return 180
    if "90" in t or "3 month" in t: return 90
    if "year" in t or "365" in t: return 365
    return None


# briefing cache
BRIEFING_CACHE_PATH = os.path.join(os.path.dirname(__file__), ".briefing_cache.json")
BRIEFING_CACHE_TTL_HOURS = 24


def _load_briefing_cache() -> Dict:
    try:
        with open(BRIEFING_CACHE_PATH, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_briefing_cache(cache: Dict) -> None:
    try:
        with open(BRIEFING_CACHE_PATH, "w") as f:
            json.dump(cache, f, indent=2, default=str)
    except Exception as e:
        logger.warning("Failed to write briefing cache: %s", e)


def _briefing_cache_key(area: str, location: Optional[str], profile_hash: str) -> str:
    raw = f"{area}|{location or 'all'}|{profile_hash}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def _profile_hash(demographics: Dict) -> str:
    """Short hash of user profile for cache key differentiation."""
    keys = sorted(["borough", "issues", "housing", "profile_active"])
    vals = "|".join(str(demographics.get(k) or "") for k in keys)
    return hashlib.md5(vals.encode()).hexdigest()[:8]


# profile context builder
def build_profile_context(demographics: Dict[str, Optional[str]]) -> str:
    if not demographics: return "(no profile information provided)"
    parts: List[str] = []
    borough = (demographics.get("borough") or "").strip()
    zip_code = (demographics.get("zip") or "").strip()
    if borough and zip_code: parts.append(f"The user lives in **{borough}** (ZIP {zip_code}).")
    elif borough: parts.append(f"The user lives in **{borough}**.")
    elif zip_code: parts.append(f"The user's ZIP code is **{zip_code}**.")
    housing = (demographics.get("housing") or "").strip()
    if housing: parts.append(f"Housing situation: **{housing}**.")
    issues_raw = (demographics.get("issues") or demographics.get("issue_area") or "").strip()
    if issues_raw:
        issue_list = [i.strip() for i in issues_raw.split(",") if i.strip()]
        if issue_list: parts.append(f"Policy interests: **{', '.join(issue_list)}**.")
    demo_tags = (demographics.get("demographics") or "").strip()
    if demo_tags:
        tags = [t.strip() for t in demo_tags.split(",") if t.strip()]
        if tags: parts.append(f"User describes themselves as: **{', '.join(tags)}**.")
    profile_active = (demographics.get("profile_active") or "").strip().lower()
    if profile_active == "true":
        parts.append("The user has a personalized profile active — tailor all implications and next steps to their specific situation.")
    return " ".join(parts) if parts else "(no profile information provided)"


# RAG helpers
def _normalize_chat_messages(raw):
    if not raw: return None
    out = []
    for m in raw:
        role = (m.role or "").strip().lower()
        if role not in ("user", "assistant"): continue
        content = (m.content or "").strip()
        if not content: continue
        out.append({"role": role, "content": content})
    return out or None


def _has_meaningful_text(value): return bool(value and value.strip())


def _expand_chunk_window(session, chunk, window_size=1):
    if chunk.document_id is None:
        return (chunk.text_content or "").strip(), chunk.chunk_index, chunk.chunk_index
    window = session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == chunk.document_id)
        .where(DocumentChunk.chunk_index >= chunk.chunk_index - window_size)
        .where(DocumentChunk.chunk_index <= chunk.chunk_index + window_size)
        .order_by(DocumentChunk.chunk_index.asc())
    ).all()
    paragraphs, s, e = [], chunk.chunk_index, chunk.chunk_index
    for w in window:
        t = (w.text_content or "").strip()
        if t: paragraphs.append(t)
        s, e = min(s, w.chunk_index), max(e, w.chunk_index)
    return ("\n\n".join(paragraphs) if paragraphs else (chunk.text_content or "").strip()), s, e


def _map_context(session, results, top_k):
    context, seen = [], set()
    for chunk, doc in results:
        key = (chunk.document_id, chunk.chunk_index)
        if key in seen: continue
        seen.add(key)
        text, s, e = _expand_chunk_window(session, chunk)
        if not _has_meaningful_text(text): continue
        context.append({
            "title": doc.title, "text_content": text, "source_type": doc.source_type,
            "source_url": doc.source_url,
            "published_date": doc.published_date.isoformat() if doc.published_date else None,
        })
        if len(context) >= top_k: break
    return context


def get_db_context(query: str, top_k: int = 8, demographics: Optional[Dict] = None) -> Tuple[List[Dict], str]:
    nq = query.strip()
    top_k = max(4, top_k)
    for attempt in (0, 1):
        try:
            with Session(engine) as session:
                loc_terms: List[str] = []
                for key in ("borough", "community_board"):
                    v = (demographics or {}).get(key, "")
                    if v and v.strip() and v.strip().lower() not in [t.lower() for t in loc_terms]:
                        loc_terms.append(v.strip())
                        if len(loc_terms) >= 3: break

                embed_q = f"{nq} {' '.join(loc_terms)}".strip() if loc_terms else nq
                qe = get_query_embedding(embed_q)

                vr = session.exec(
                    select(DocumentChunk, PolicyDocument)
                    .join(PolicyDocument)
                    .where(DocumentChunk.embedding.is_not(None))
                    .order_by(DocumentChunk.embedding.cosine_distance(qe))
                    .limit(top_k * 8)
                ).all()
                ctx = _map_context(session, vr, top_k)
                if ctx: return ctx, "vector"

                if nq:
                    terms = [t for t in nq.split() if len(t) >= 3][:6]
                    filters = [DocumentChunk.text_content.ilike(f"%{nq}%")] + \
                              [DocumentChunk.text_content.ilike(f"%{t}%") for t in terms]
                    lr = session.exec(
                        select(DocumentChunk, PolicyDocument)
                        .join(PolicyDocument)
                        .where(or_(*filters))
                        .limit(top_k * 8)
                    ).all()
                    ctx = _map_context(session, lr, top_k)
                    if ctx: return ctx, "lexical"

                rr = session.exec(
                    select(DocumentChunk, PolicyDocument)
                    .join(PolicyDocument)
                    .where(DocumentChunk.text_content.is_not(None))
                    .order_by(PolicyDocument.published_date.desc())
                    .limit(top_k * 8)
                ).all()
                ctx = _map_context(session, rr, top_k)
                if ctx: return ctx, "recent"
                return [], "none"
        except OperationalError as e:
            if attempt == 1: raise
            logger.warning("DB OperationalError attempt %d: %s", attempt + 1, e)
    raise RuntimeError("get_db_context: unexpected fall-through")


def build_retrieval_sources(context_chunks, max_items=8):
    seen, out = set(), []
    for ch in context_chunks:
        url = (ch.get("source_url") or "").strip()
        if not url or url in seen: continue
        seen.add(url)
        entry = {
            "title": (ch.get("title") or "Source").strip(),
            "source_url": url,
            "source_type": (ch.get("source_type") or "").strip(),
        }
        pd = str(ch.get("published_date") or "").strip()
        if pd: entry["published_date"] = pd
        out.append(entry)
        if len(out) >= max_items: break
    return out


# key-number grounding
def _money_suffix_to_mult(s):
    if not s: return 1.0
    t = s.lower()
    if t in ("k","thousand"): return 1e3
    if t in ("m","million"): return 1e6
    if t in ("b","billion"): return 1e9
    return 1.0

def _parse_money(num, suf):
    raw = (num or "").replace(",","").strip()
    if not raw: return None
    try: base = float(raw)
    except: return None
    return base * _money_suffix_to_mult(suf)

def _money_in_text(t):
    amounts, seen = [], set()
    for pat in (
        re.compile(r"\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|thousand|[kmb])?\b", re.I),
        re.compile(r"(?<![\w$])([\d,]+(?:\.\d+)?)\s+(million|billion)\b(?![\w])", re.I),
    ):
        for m in pat.finditer(t):
            suf = m.group(2) if m.lastindex and m.lastindex >= 2 else None
            v = _parse_money(m.group(1), suf)
            if v is None or v < 0: continue
            k = round(v, 4)
            if k not in seen: seen.add(k); amounts.append(v)
    return amounts

def _norm(s):
    t = (s or "").lower().replace("\u2013","-").replace("\u2014","-")
    return re.sub(r"\s+"," ",t).strip()

def _haystack(chunks):
    parts = []
    for ch in chunks or []:
        for k in ("title","text_content","source_url","published_date","source_type"):
            v = ch.get(k)
            if isinstance(v,str) and v.strip(): parts.append(v)
    sp = _norm("\n".join(parts))
    return sp, re.sub(r"\s+","",sp)

def _kn_grounded(line, hay_sp, hay_co):
    raw = (line or "").strip()
    if not raw or not re.search(r"\d", raw): return False
    nl = _norm(re.sub(r"\*+","",raw))
    for m in re.findall(r"\d{4,}", nl):
        if m not in hay_sp and m not in hay_co: return False
    lm = _money_in_text(nl)
    if lm:
        hm = set(_money_in_text(f"{hay_sp} {hay_co}"))
        for amt in lm:
            if not any(math.isclose(amt,h,rel_tol=1e-9,abs_tol=max(1.0,abs(amt)*1e-6)) for h in hm): return False
    return True

def filter_key_numbers(reply, chunks):
    raw = reply.get("key_numbers")
    if not isinstance(raw, list): reply["key_numbers"] = []; return
    sp, co = _haystack(chunks)
    if not co: reply["key_numbers"] = []; return
    reply["key_numbers"] = [i for i in raw if isinstance(i,str) and _kn_grounded(i,sp,co)]




class ChatMessagePayload(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    retrieval_query: Optional[str] = None
    demographics: Dict[str, Optional[str]] = {}
    response_style: Optional[str] = None
    messages: Optional[List[ChatMessagePayload]] = None
    session_preamble: Optional[str] = None





# ENDPOINTS

@app.get("/api/health")
async def health_check():
    try:
        with Session(engine) as session:
            count = len(session.exec(select(DocumentChunk).limit(1)).all())
        return {"status": "ok", "db_connected": True, "has_data": count > 0}
    except Exception as e:
        return {"status": "degraded", "db_connected": False, "error": str(e)}



@app.get("/api/policies")
async def get_recent_policies(
    borough: Optional[str] = None,
    area:    Optional[str] = None,
    timeframe: Optional[str] = None,
    days:    Optional[int] = None,
    limit:   int = 30,
):
    """
    Returns recent PolicyDocuments filtered by area (using TagClassifier metadata),
    borough, and timeframe. Districts are inferred from title/URL.
    """
    try:
        with Session(engine) as session:
            _ensure_district_cache(session)

            effective_days = days or timeframe_to_days(timeframe)
            cutoff: Optional[datetime] = None
            if effective_days:
                cutoff = datetime.now(timezone.utc) - timedelta(days=effective_days)

            stmt = select(PolicyDocument).order_by(PolicyDocument.published_date.desc())
            if cutoff:
                stmt = stmt.where(
                    or_(PolicyDocument.published_date.is_(None), PolicyDocument.published_date >= cutoff)
                )

            # Fetch a larger batch so Python-side filtering has room
            results = session.exec(stmt.limit(limit * 8)).all()
            normed_borough = normalize_borough(borough)
            filtered = []

            for p in results:
                meta = p.metadata_tags or {}

                # Borough filter (title + metadata)
                if normed_borough:
                    searchable_boro = f"{p.title or ''} {p.source_url or ''}".lower()
                    meta_borough = normalize_borough(str(meta.get("borough") or meta.get("boro") or ""))
                    if normed_borough.lower() not in searchable_boro and meta_borough != normed_borough:
                        continue

                # Area filter — uses TagClassifier metadata first, keyword fallback second
                if area and area.strip().lower() not in ("all", "all issues", ""):
                    if not doc_matches_area(p, area):
                        continue

                district_ids = infer_districts_from_text(session, p.title or "", p.source_url or "", meta)

                filtered.append({
                    "id": str(p.id),
                    "title": p.title or "Untitled Record",
                    "source_url": p.source_url or "#",
                    "source_type": p.source_type or "Record",
                    "published_date": p.published_date.isoformat() if p.published_date else None,
                    "impact":     meta.get("impact") or meta.get("summary") or "",
                    "affects":    meta.get("affects") or meta.get("affected_groups") or "",
                    "topic_tags": meta.get("tags") or meta.get("topic_tags") or meta.get("policy_areas") or [],
                    "districts":  district_ids,
                    "zips":       meta.get("zip_codes") or meta.get("zips") or [],
                    # Expose TagClassifier output for frontend
                    "policy_areas":    meta.get("policy_areas") or [],
                    "affected_groups": meta.get("affected_demographics") or [],
                    "policy_stage":    meta.get("policy_stage") or "",
                })

                if len(filtered) >= limit:
                    break

            return {"policies": filtered}

    except Exception as e:
        logger.error("Error fetching policies: %s", e)
        return {"policies": [], "error": str(e)}



@app.get("/api/briefings/{area_slug}")
@limiter.limit("20/minute")
async def get_area_briefing(
    request: Request,
    area_slug: str,
    location: Optional[str] = None,
    personalized: bool = False,
    borough: Optional[str] = None,
    issues: Optional[str] = None,
    housing: Optional[str] = None,
    demographics: Optional[str] = None,
):
    """
    Returns a cached daily AI briefing for a given policy area.
    Calls Groq at most ONCE per (area + location + profile_hash) per 24 hours.
    The cache is stored in a local JSON file on the backend server.

    area_slug: URL-safe area name e.g. "housing", "health", "transit"
    """
    # Normalise slug → area label
    slug_map = {
        "housing":      "Housing and Community Development",
        "education":    "Education",
        "transit":      "Transportation and Public Works",
        "environment":  "Environmental Protection",
        "health":       "Health",
        "policing":     "Crime and Law Enforcement",
        "immigration":  "Immigration",
        "budget":       "Economics and Public Finance",
        "labor":        "Labor and Employment",
        "all":          "All",
        "government":       "Government Operations and Politics",
        "civil-rights":     "Civil Rights and Liberties, Minority Issues",
        "families":         "Families",
        "technology":       "Science, Technology, Communications",
        "social-welfare":   "Social Welfare",
        "taxation":         "Taxation",
        "commerce":                               "Commerce",
        "arts-culture-religion":                  "Arts, Culture, Religion",
        "arts,-culture,-religion":                "Arts, Culture, Religion",
        "energy":                                 "Energy",
        "international-affairs":                  "International Affairs",
        "emergency-management":                   "Emergency Management",
        "public-lands-and-natural-resources":     "Public Lands and Natural Resources",
        "agriculture-and-food":                   "Agriculture and Food",
        "armed-forces-and-national-security":     "Armed Forces and National Security",
        "science,-technology,-communications":    "Science, Technology, Communications",
        "crime":        "Crime and Law Enforcement",
        "law":          "Crime and Law Enforcement",
        "transport":    "Transportation and Public Works",
        "finance":      "Economics and Public Finance",
        "civil":        "Civil Rights and Liberties, Minority Issues",
        "welfare":      "Social Welfare",
        "arts":         "Arts, Culture, Religion",
        "food":         "Agriculture and Food",
        "security":     "Armed Forces and National Security",
        "science":      "Science, Technology, Communications",
        "tech":         "Science, Technology, Communications",
        "parks":        "Public Lands and Natural Resources",
    }
    area = slug_map.get(area_slug.lower().strip(), area_slug)

    demographics: Dict[str, str] = {}
    if borough: demographics["borough"] = borough
    if issues:  demographics["issues"]  = issues
    if housing: demographics["housing"] = housing
    if demographics_param: demographics["demographics"] = demographics_param
    demographics["profile_active"] = "true" if personalized else "false"

    p_hash = _profile_hash(demographics) if personalized else "general"
    cache_key = _briefing_cache_key(area, location, p_hash)
    cache = _load_briefing_cache()

    # Return cached result if still fresh
    if cache_key in cache:
        entry = cache[cache_key]
        cached_at = datetime.fromisoformat(entry.get("cached_at", "2000-01-01"))
        age_hours = (datetime.now(timezone.utc) - cached_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
        if age_hours < BRIEFING_CACHE_TTL_HOURS:
            logger.info("Briefing cache HIT key=%s age=%.1fh", cache_key, age_hours)
            return {**entry["briefing"], "cached": True, "cached_at": entry["cached_at"], "cache_age_hours": round(age_hours, 1)}

    logger.info("Briefing cache MISS key=%s area=%s — calling LLM", cache_key, area)

    # Fetch relevant documents for this area
    try:
        with Session(engine) as session:
            _ensure_district_cache(session)
            docs_stmt = select(PolicyDocument).order_by(PolicyDocument.published_date.desc()).limit(200)
            all_docs = session.exec(docs_stmt).all()

        area_docs = [d for d in all_docs if doc_matches_area(d, area)][:20]

        if not area_docs:
            area_docs = all_docs[:10]  # fallback: most recent regardless of area

    except Exception as e:
        logger.error("DB error fetching briefing docs: %s", e)
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    # Build a query that represents this area
    query = f"What are the most important recent developments in {area} policy for NYC residents? What has changed, what matters, and what should people know?"
    if personalized and borough:
        query += f" Focus on how this affects {borough} residents."

    profile_context = build_profile_context(demographics)
    demographics["_profile_context"] = profile_context

    # Build context chunks from area docs
    context_chunks = []
    for doc in area_docs:
        with Session(engine) as session:
            chunks = session.exec(
                select(DocumentChunk)
                .where(DocumentChunk.document_id == doc.id)
                .order_by(DocumentChunk.chunk_index)
                .limit(2)
            ).all()
            for ch in chunks:
                if ch.text_content and ch.text_content.strip():
                    context_chunks.append({
                        "title": doc.title,
                        "text_content": ch.text_content.strip()[:1500],
                        "source_type": doc.source_type,
                        "source_url": doc.source_url,
                        "published_date": doc.published_date.isoformat() if doc.published_date else None,
                    })
        if len(context_chunks) >= 8:
            break

    # Call LLM
    response = llm.generate_response(
        query=query,
        demographics=demographics,
        context_chunks=context_chunks,
        response_style="structured",
    )

    if isinstance(response, dict) and response.get("error"):
        raise HTTPException(status_code=503, detail="AI service temporarily busy. Try again in a moment.")

    filter_key_numbers(response, context_chunks)

    # Add metadata
    response["area"] = area
    response["area_slug"] = area_slug
    response["record_count"] = len(area_docs)
    response["sources_used"] = len(context_chunks)
    response["retrieval_sources"] = build_retrieval_sources(context_chunks)

    # Cache the result
    cache[cache_key] = {
        "briefing": response,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_briefing_cache(cache)

    return {**response, "cached": False, "cached_at": datetime.now(timezone.utc).isoformat(), "cache_age_hours": 0}




@app.get("/api/votes")
async def get_votes(
    area:   Optional[str] = None,
    limit:  int = 20,
    offset: int = 0,
):
    """
    Returns recent LegislationEvents with their outcomes.
    Per-member VoteRecords are included when available but the Legistar NYC API
    does not expose them, so vote_breakdown will be zeroed and total_votes = 0.
    VoteTracker.tsx gracefully degrades in this case.
    """
    try:
        with Session(engine) as session:
            stmt = select(LegislationEvent).order_by(LegislationEvent.event_date.desc())
 
            # Area filter on title using keyword fallback
            if area and area.strip().lower() not in ("all", ""):
                kws = AREA_KEYWORDS.get(area, [])
                if kws:
                    title_filters = [LegislationEvent.title.ilike(f"%{kw}%") for kw in kws[:4]]
                    stmt = stmt.where(or_(*title_filters))
 
            total_count = session.exec(
                select(func.count(LegislationEvent.id))
            ).one()
 
            events = session.exec(stmt.offset(offset).limit(limit)).all()
 
            results = []
            for event in events:
                # Fetch per-member votes if they exist (will be empty for now)
                votes = session.exec(
                    select(VoteRecord, Politician)
                    .join(Politician, VoteRecord.politician_id == Politician.id)
                    .where(VoteRecord.legislation_event_id == event.id)
                ).all()
 
                vote_breakdown = {"Yea": 0, "Nay": 0, "Abstain": 0, "Absent": 0}
                vote_records = []
                for vr, pol in votes:
                    vote_breakdown[vr.vote_cast] = vote_breakdown.get(vr.vote_cast, 0) + 1
                    vote_records.append({
                        "politician_name": pol.full_name,
                        "politician_id":   pol.id,
                        "district":        pol.district_number,
                        "borough":         pol.location_borough,
                        "party":           pol.party,
                        "vote":            vr.vote_cast,
                    })
 
                total_votes = sum(vote_breakdown.values())
 
                # Outcome: use status field populated by populate_votes.py.
                # Fall back to computing from vote counts if VoteRecords exist.
                status = (event.status or "Pending").strip()
                if total_votes > 0:
                    yeas = vote_breakdown["Yea"]
                    nays = vote_breakdown["Nay"]
                    if yeas > nays:
                        outcome = "Passed"
                    elif nays > yeas:
                        outcome = "Failed"
                    else:
                        outcome = "Tied"
                elif status in ("Passed", "Failed", "Tied"):
                    outcome = status
                else:
                    outcome = "Pending"
 
                results.append({
                    "id":             event.id,
                    "title":          event.title,
                    "description":    event.description,
                    "jurisdiction":   event.jurisdiction,
                    "status":         event.status,
                    "event_date":     event.event_date.isoformat() if event.event_date else None,
                    "event_url":      event.event_url,
                    "outcome":        outcome,
                    "vote_breakdown": vote_breakdown,
                    "total_votes":    total_votes,
                    "votes":          vote_records,
                })
 
            return {
                "events": results,
                "total":  total_count,
                "offset": offset,
                "limit":  limit,
            }
 
    except Exception as e:
        logger.error("Error fetching votes: %s", e)
        return {"events": [], "total": 0, "error": str(e)}




@app.post("/api/chat")
@limiter.limit("10/minute")
async def chat_endpoint(request: Request, payload: ChatRequest):
    msg_list = _normalize_chat_messages(payload.messages)
    if msg_list and msg_list[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="Last message must have role `user`.")

    retrieval_q = payload.query.strip()
    if payload.messages:
        user_parts = [m.content for m in payload.messages if m.role == "user" and m.content]
        if user_parts: retrieval_q = "\n".join(user_parts)[:2000]

    enriched = dict(payload.demographics or {})
    try:
        context_chunks, tier = get_db_context(retrieval_q, demographics=enriched)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    enriched["_profile_context"] = build_profile_context(enriched)

    response = llm.generate_response(
        query=payload.query,
        demographics=enriched,
        context_chunks=context_chunks,
        response_style=(payload.response_style or "structured").strip().lower(),
        messages=msg_list,
        session_preamble=(payload.session_preamble or "").strip() or None,
    )

    if isinstance(response, dict) and str(response.get("error","")).startswith("Error connecting"):
        raise HTTPException(status_code=503, detail="AI service temporarily busy. Please try again in a moment.")

    if isinstance(response, dict) and not response.get("error"):
        filter_key_numbers(response, context_chunks)

    return {
        "reply": response,
        "sources_used": len(context_chunks),
        "retrieval_tier": tier,
        "retrieval_sources": build_retrieval_sources(context_chunks),
    }




@app.get("/api/politicians")
async def get_politicians(borough: Optional[str] = None, stance: Optional[str] = None):
    def infer_stance(party):
        p = (party or "").strip().lower()
        if p in {"democrat","working families"}: return "Progressive"
        if p in {"republican","conservative"}: return "Conservative"
        if p in {"independent","no party"}: return "Independent"
        return "Moderate"
    role_to_jur = {"Council Member":"NYC Council","State Senator":"NYS Senate","Assembly Member":"NYS Assembly"}
    try:
        with Session(engine) as session:
            cols = ["id","full_name","party","role","location_borough","district_number","bio_url"]
            q = select(*[getattr(Politician,c) for c in cols])
            nb = (borough or "").strip().lower()
            ns = (stance or "").strip().lower()
            if nb and nb != "all": q = q.where(func.lower(Politician.location_borough) == nb)
            rows = session.exec(q.order_by(Politician.full_name.asc())).all()
            districts = session.exec(select(District)).all()
            dbk = {(d.district_number, d.jurisdiction): d for d in districts}
            payload = []
            for p in rows:
                row = dict(zip(cols, p))
                cs = infer_stance(row.get("party"))
                if ns and ns != "all" and cs.lower() != ns: continue
                jur = role_to_jur.get(row.get("role") or "")
                dist = dbk.get((row.get("district_number"), jur)) if row.get("district_number") and jur else None
                payload.append({
                    "id": row.get("id"), "name": row.get("full_name"),
                    "office": row.get("role") or "Representative",
                    "borough": row.get("location_borough") or "Unknown",
                    "district": row.get("district_number"), "party": row.get("party") or "Unknown",
                    "political_stance": cs, "bio_url": row.get("bio_url"),
                    "zip_codes": dist.zip_codes if dist else [],
                    "neighborhoods": dist.neighborhoods if dist else [],
                    "data_source": "live_database",
                })
            return {"politicians": payload}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politicians: {e}")


@app.get("/api/politicians/filters")
async def get_politician_filters():
    def infer_stance(party):
        p = (party or "").strip().lower()
        if p in {"democrat","working families"}: return "Progressive"
        if p in {"republican","conservative"}: return "Conservative"
        if p in {"independent","no party"}: return "Independent"
        return "Moderate"
    try:
        with Session(engine) as session:
            rows = session.exec(select(Politician.location_borough, Politician.party)).all()
            return {
                "boroughs": sorted({b.strip() for b,_ in rows if b and b.strip()}),
                "stances":  sorted({infer_stance(p) for _,p in rows}),
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politician filters: {e}")


@app.get("/districts")
async def get_districts():
    try:
        with Session(engine) as session:
            districts = session.exec(select(District).where(District.jurisdiction=="NYC Council")).all()
            reps = session.exec(select(Politician.full_name, Politician.location_borough, Politician.district_number).where(Politician.role=="Council Member")).all()
            rep_by_dist = {dn:(fn,lb) for fn,lb,dn in reps if dn}
            out = []
            for d in districts:
                if not d.district_number or not d.district_number.isdigit(): continue
                rep = rep_by_dist.get(d.district_number)
                boro = d.borough or (rep[1] if rep else None)
                out.append({
                    "id": int(d.district_number), "district_number": d.district_number,
                    "jurisdiction": d.jurisdiction,
                    "name": f"District {d.district_number}" + (f" ({boro})" if boro else ""),
                    "borough": boro, "rep": rep[0] if rep else None,
                    "zip_codes": d.zip_codes or [], "neighborhoods": d.neighborhoods or [], "issues": [],
                })
            return {"districts": sorted(out, key=lambda x: x["id"])}
    except Exception as e:
        logger.warning("/districts failed: %s", e)
        return {"districts": []}


@app.get("/api/metrics/records")
async def get_records_metrics():
    try:
        with Session(engine) as session:
            now = datetime.now(timezone.utc)
            ms  = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            nms = datetime(now.year+(1 if now.month==12 else 0), (now.month%12)+1, 1, tzinfo=timezone.utc)
            return {
                "indexed_records_total":  int(session.exec(select(func.count(DocumentChunk.id)).where(DocumentChunk.embedding.is_not(None))).one() or 0),
                "documents_total":        int(session.exec(select(func.count(PolicyDocument.id))).one() or 0),
                "source_types_indexed":   int(session.exec(select(func.count(func.distinct(PolicyDocument.source_type))).where(PolicyDocument.source_type.is_not(None))).one() or 0),
                "unique_sources_indexed": int(session.exec(select(func.count(func.distinct(PolicyDocument.source_url))).where(PolicyDocument.source_url.is_not(None))).one() or 0),
                "new_records_this_month": int(session.exec(select(func.count(PolicyDocument.id)).where(or_((PolicyDocument.scraped_at>=ms)&(PolicyDocument.scraped_at<nms),(PolicyDocument.published_date.is_not(None))&(PolicyDocument.published_date>=ms)&(PolicyDocument.published_date<nms)))).one() or 0),
                "updated_at": now.isoformat(),
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load metrics: {e}")