import os
import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from typing import Dict, List, Optional, Set, Tuple
import logging
import math
from datetime import datetime, timezone, timedelta

from sqlmodel import Session, select
from sqlalchemy import func, or_
from sqlalchemy.exc import OperationalError
from db import engine
from schema import District, DocumentChunk, PolicyDocument, Politician
from embed import get_query_embedding
from llm_engine import LLMEngine

logger = logging.getLogger("civic_spiegel.rag")
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

# borough name normalization
BOROUGH_ALIASES: Dict[str, str] = {
    "manhattan": "Manhattan",
    "brooklyn": "Brooklyn",
    "queens": "Queens",
    "bronx": "Bronx",
    "the bronx": "Bronx",
    "staten island": "Staten Island",
    "si": "Staten Island",
    "bk": "Brooklyn",
    "bx": "Bronx",
    "qns": "Queens",
    "mn": "Manhattan",
}

# legistar district number patterns
_DISTRICT_RE = re.compile(
    r"\b(?:council\s+district|district|cd)\s*(\d{1,2})\b", re.I
)

# borough name pattern
_BOROUGH_RE = re.compile(
    r"\b(manhattan|brooklyn|queens|the\s+bronx|bronx|staten\s+island)\b", re.I
)

# nyc council url patterns
_LEGISTAR_RE = re.compile(r"legistar\.council\.nyc\.gov", re.I)
_COUNCIL_RE = re.compile(r"council\.nyc\.gov", re.I)
_NYCC_RE = re.compile(r"nycc|nyc\s*council|new\s*york\s*city\s*council", re.I)


def normalize_borough(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    cleaned = raw.strip().lower()
    return BOROUGH_ALIASES.get(cleaned, raw.strip())

# area keyword map
AREA_KEYWORDS: Dict[str, List[str]] = {
    "Housing": ["housing", "rent", "tenant", "landlord", "hpd", "nycha", "zoning",
                "afford", "eviction", "dwelling", "lease", "stabiliz"],
    "Education": ["school", "education", "student", "teacher", "doe", "curriculum",
                  "literacy", "college", "chancellor", "classroom"],
    "Policing": ["police", "nypd", "crime", "safety", "enforcement", "officer",
                 "prison", "jail", "fire", "ems", "correctional"],
    "Transit": ["transit", "mta", "bus", "subway", "train", "street", "traffic",
                "parking", "bike", "ferry", "dot", "commut", "crosswalk"],
    "Environment": ["environment", "climate", "green", "pollution", "emission",
                    "waste", "park", "tree", "dep", "solar", "energy", "carbon"],
    "Health": ["health", "medical", "hospital", "covid", "care", "mental",
               "wellness", "dohmh", "medicaid", "vaccine", "clinic", "opioid"],
    "Immigration": ["immigrant", "immigration", "visa", "asylum", "citizenship",
                    "migrant", "undocumented", "dhs", "ice"],
    "Taxation": ["tax", "levy", "assessment", "exemption", "abatement", "revenue",
                 "fiscal", "property tax"],
    "Labor": ["labor", "worker", "wage", "employment", "union", "job", "hire",
              "workplace", "minimum wage", "overtime"],
    "Housing and Community Development": ["housing", "rent", "tenant", "landlord",
                                          "hpd", "nycha", "zoning", "afford"],
    "Transportation and Public Works": ["transit", "mta", "bus", "subway", "street",
                                         "traffic", "dot"],
    "Environmental Protection": ["environment", "climate", "green", "pollution", "dep"],
    "Crime and Law Enforcement": ["police", "nypd", "crime", "safety", "enforcement"],
    "Economics and Public Finance": ["budget", "economy", "finance", "spending",
                                      "bond", "fiscal", "comptroller"],
    "Government Operations and Politics": ["council", "mayor", "agency",
                                            "government", "election", "hearing"],
    "Civil Rights and Liberties, Minority Issues": ["civil rights", "discrimination",
                                                     "equity", "minority", "bias"],
    "Science, Technology, Communications": ["tech", "digital", "data", "broadband",
                                             "cyber", "ai", "internet"],
    "Social Welfare": ["welfare", "social service", "benefit", "snap", "medicaid",
                       "voucher", "hra", "cash assist"],
    "Families": ["famil", "child", "parent", "domestic", "foster", "elder",
                 "senior", "youth", "acs", "aging"],
    "Agriculture and Food": ["food", "agriculture", "farm", "restaurant",
                              "nutrition", "grocery", "food bank"],
    "Energy": ["energy", "solar", "utility", "electric", "grid", "power", "fuel",
               "con ed", "coned"],
    "Arts, Culture, Religion": ["arts", "culture", "religion", "museum",
                                 "library", "heritage", "festival"],
}

# title/url based location inference
_borough_to_dids: Optional[Dict[str, List[int]]] = None
_zip_to_dids: Optional[Dict[str, List[int]]] = None
_all_district_ids: Optional[List[int]] = None


def _ensure_district_cache(session: Session) -> None:
    global _borough_to_dids, _zip_to_dids, _all_district_ids
    if _borough_to_dids is not None:
        return
    _borough_to_dids = {}
    _zip_to_dids = {}
    _all_district_ids = []
    try:
        districts = session.exec(
            select(District).where(District.jurisdiction == "NYC Council")
        ).all()
        for d in districts:
            if not d.district_number or not d.district_number.isdigit():
                continue
            did = int(d.district_number)
            _all_district_ids.append(did)
            if d.borough:
                _borough_to_dids.setdefault(d.borough, []).append(did)
            for z in (d.zip_codes or []):
                if z:
                    _zip_to_dids.setdefault(z.strip(), []).append(did)
        logger.info(
            "District cache loaded: %d districts, %d boroughs, %d ZIPs",
            len(_all_district_ids),
            len(_borough_to_dids),
            len(_zip_to_dids),
        )
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
    searchable = f"{title or ''} {source_url or ''}".lower()

    # try explicit district in metadata fields first
    for key in ("council_district", "council_districts", "districts", "district"):
        val = meta.get(key)
        if val is None:
            continue
        if isinstance(val, int):
            ids.add(val)
        elif isinstance(val, list):
            for v in val:
                try:
                    ids.add(int(v))
                except (TypeError, ValueError):
                    pass
        elif isinstance(val, str):
            for part in re.split(r"[,\s]+", val):
                try:
                    ids.add(int(part.strip()))
                except (TypeError, ValueError):
                    pass

    if ids:
        return sorted(ids)

    # zip in metadata
    for key in ("zip", "zip_code", "zipcode", "postal_code"):
        z = str(meta.get(key) or "").strip()
        if z and z.isdigit() and len(z) == 5:
            ids.update((_zip_to_dids or {}).get(z, []))
    if ids:
        return sorted(ids)

    # district number mentioned in title
    m = _DISTRICT_RE.search(title or "")
    if m:
        try:
            did = int(m.group(1))
            if 1 <= did <= 51:
                ids.add(did)
        except ValueError:
            pass
    if ids:
        return sorted(ids)

    # borough mentioned in title
    bm = _BOROUGH_RE.search(title or "")
    if bm:
        raw_boro = bm.group(1).replace("the ", "").strip().title()
        normed = normalize_borough(raw_boro)
        if normed and _borough_to_dids:
            ids.update(_borough_to_dids.get(normed, []))
    if ids:
        return sorted(ids)

    # nyc-wide source → assign all 51 council districts
    if _LEGISTAR_RE.search(source_url or "") or _COUNCIL_RE.search(source_url or ""):
        return sorted(_all_district_ids or [])

    # source type hints city-wide nyc content
    source_type_lower = str(meta.get("source_type") or "").lower()
    if any(kw in source_type_lower for kw in ("nycc", "nyc legislation", "nyc council",
                                               "legistar", "transcript", "hearing")):
        return sorted(_all_district_ids or [])

    return []




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


def _normalize_chat_messages(
    raw: Optional[List[ChatMessagePayload]],
) -> Optional[List[Dict[str, str]]]:
    if not raw:
        return None
    out: List[Dict[str, str]] = []
    for m in raw:
        role = (m.role or "").strip().lower()
        if role not in ("user", "assistant"):
            continue
        content = (m.content or "").strip()
        if not content:
            continue
        out.append({"role": role, "content": content})
    return out or None


MAX_LOCATION_TERMS = 3


def _derive_location_terms(demographics: Dict[str, Optional[str]]) -> List[str]:
    """Extract location terms already present in the demographics dict.

    Pure: no DB access. Returns at most MAX_LOCATION_TERMS terms. Callers can
    expand further (e.g. ZIP -> districts/neighborhoods) and re-cap.
    """
    if not demographics:
        return []
    terms: List[str] = []
    seen: set = set()
    for key in ("borough", "community_board"):
        raw = demographics.get(key)
        if not raw:
            continue
        value = raw.strip()
        if not value:
            continue
        if value.lower() in seen:
            continue
        seen.add(value.lower())
        terms.append(value)
        if len(terms) >= MAX_LOCATION_TERMS:
            break
    return terms


def _expand_location_terms_with_zip(
    session: Session,
    terms: List[str],
    zip_code: Optional[str],
) -> List[str]:
    if not zip_code:
        return terms
    z = zip_code.strip()
    if not (z.isdigit() and len(z) == 5):
        return terms
    if len(terms) >= MAX_LOCATION_TERMS:
        return terms

    seen = {t.lower() for t in terms}
    out = list(terms)

    districts = session.exec(select(District)).all()
    matching = [d for d in districts if z in (d.zip_codes or [])]
    if not matching:
        return out

    for d in matching:
        if d.borough and d.borough.lower() not in seen:
            out.append(d.borough)
            seen.add(d.borough.lower())
            if len(out) >= MAX_LOCATION_TERMS:
                return out
            break  # one borough is enough — multiple matching districts usually share it

    for d in matching:
        for nta in (d.neighborhoods or []):
            if not nta:
                continue
            key = nta.lower()
            if key in seen:
                continue
            out.append(nta)
            seen.add(key)
            if len(out) >= MAX_LOCATION_TERMS:
                return out

    return out


def _retrieval_query_from_request(request: ChatRequest) -> str:
    """Embed using recent user turns so follow-ups keep topical context."""
    if request.messages:
        user_parts = [
            (m.content or "").strip()
            for m in request.messages
            if (m.role or "").strip().lower() == "user" and (m.content or "").strip()
        ]
        if user_parts:
            joined = "\n".join(user_parts)
            return joined[:2000]
    rq = (request.retrieval_query or "").strip()
    if rq:
        return rq
    return (request.query or "").strip()


def _has_meaningful_text(value: Optional[str]) -> bool:
    return bool(value and value.strip())


def _expand_chunk_window(
    session: Session,
    chunk: DocumentChunk,
    window_size: int = 1,
) -> Tuple[str, int, int]:
    if chunk.document_id is None:
        text = chunk.text_content.strip() if chunk.text_content else ""
        return text, chunk.chunk_index, chunk.chunk_index

    window_results = session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == chunk.document_id)
        .where(DocumentChunk.chunk_index >= chunk.chunk_index - window_size)
        .where(DocumentChunk.chunk_index <= chunk.chunk_index + window_size)
        .order_by(DocumentChunk.chunk_index.asc())
    ).all()

    paragraphs: List[str] = []
    start_idx = chunk.chunk_index
    end_idx = chunk.chunk_index
    for w in window_results:
        text = w.text_content.strip() if w.text_content else ""
        if not _has_meaningful_text(text):
            continue
        paragraphs.append(text)
        start_idx = min(start_idx, w.chunk_index)
        end_idx = max(end_idx, w.chunk_index)

    if not paragraphs:
        text = chunk.text_content.strip() if chunk.text_content else ""
        return text, chunk.chunk_index, chunk.chunk_index

    return "\n\n".join(paragraphs), start_idx, end_idx


def _map_context(session: Session, results, top_k: int) -> List[Dict]:
    context: List[Dict] = []
    seen_chunk_keys: Set[Tuple] = set()
    for chunk, doc in results:
        key = (chunk.document_id, chunk.chunk_index)
        if key in seen_chunk_keys:
            continue
        seen_chunk_keys.add(key)

        text, span_start, span_end = _expand_chunk_window(session, chunk, window_size=1)
        if not _has_meaningful_text(text):
            continue
        context.append({
            "title": doc.title,
            "text_content": text,
            "source_type": doc.source_type,
            "source_url": doc.source_url,
            "published_date": doc.published_date.isoformat() if doc.published_date else None,
            "context_span": f"{span_start}-{span_end}",
        })
        if len(context) >= top_k:
            break
    return context


def get_db_context(
    query: str,
    top_k: int = 8,
    demographics: Optional[Dict[str, Optional[str]]] = None,
) -> Tuple[List[Dict], str]:
    """
    Embed the user query and run a pgvector cosine similarity search
    against DocumentChunk. Returns the top_k most relevant chunks
    joined with their parent PolicyDocument title, plus a retrieval tier:
    vector | lexical | recent | none.

    When `demographics` is provided, the embedded query is augmented with up
    to MAX_LOCATION_TERMS location terms (borough, neighborhoods derived from
    ZIP) to bias retrieval toward locally-relevant chunks. The original query
    is preserved for the lexical fallback.
    
    Default top_k=5 is tuned to keep token usage under Groq's 6K TPM ceiling.
    Each chunk is expanded with neighbors via _expand_chunk_window, so the
    LLM sees roughly 3x this many raw chunks of text.
    """
    normalized_query = query.strip()
    effective_top_k = max(4, top_k)
    logger.info("RAG retrieval start query='%s' top_k=%s", normalized_query, top_k)

    for _attempt in (0, 1):
        try:
            with Session(engine) as session:
                location_terms = _derive_location_terms(demographics or {})
                location_terms = _expand_location_terms_with_zip(
                    session, location_terms, (demographics or {}).get("zip")
                )
                embed_query = (
                    f"{normalized_query} {' '.join(location_terms)}".strip()
                    if location_terms else normalized_query
                )

                query_embedding = get_query_embedding(embed_query)
                embedding_dim = len(query_embedding) if isinstance(query_embedding, list) else 0
                logger.info(
                    "Query embedding generated dim=%s sample=%s",
                    embedding_dim,
                    query_embedding[:5] if isinstance(query_embedding, list) else [],
                )

                total_chunks = session.exec(select(func.count(DocumentChunk.id))).one()
                chunks_with_text = session.exec(
                    select(func.count(DocumentChunk.id)).where(DocumentChunk.text_content.is_not(None))
                ).one()
                chunks_with_embedding = session.exec(
                    select(func.count(DocumentChunk.id)).where(DocumentChunk.embedding.is_not(None))
                ).one()
                logger.info(
                    "DB stats total_chunks=%s chunks_with_text=%s chunks_with_embedding=%s",
                    total_chunks,
                    chunks_with_text,
                    chunks_with_embedding,
                )

                vector_results = session.exec(
                    select(DocumentChunk, PolicyDocument)
                    .join(PolicyDocument)
                    .where(DocumentChunk.embedding.is_not(None))
                    .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
                    .limit(effective_top_k * 8)
                ).all()
                logger.info("Vector search raw_results=%s", len(vector_results))

                context = _map_context(session, vector_results, effective_top_k)
                logger.info(
                    "Vector search mapped_context=%s filtered_out=%s",
                    len(context),
                    max(0, len(vector_results) - len(context)),
                )

                if context:
                    logger.info(
                        "Final context count=%s sample_titles=%s",
                        len(context),
                        [item["title"] for item in context[:3]],
                    )
                    return context, "vector"

                # Fallback retrieval when vector search returns no usable context.
                if normalized_query:
                    terms = [term for term in normalized_query.split() if len(term) >= 3][:6]
                    lexical_filters = [DocumentChunk.text_content.ilike(f"%{normalized_query}%")]
                    lexical_filters.extend(
                        [DocumentChunk.text_content.ilike(f"%{term}%") for term in terms]
                    )
                    lexical_results = session.exec(
                        select(DocumentChunk, PolicyDocument)
                        .join(PolicyDocument)
                        .where(or_(*lexical_filters))
                        .limit(effective_top_k * 8)
                    ).all()
                    logger.info(
                        "Lexical fallback raw_results=%s terms=%s",
                        len(lexical_results),
                        terms,
                    )
                    context = _map_context(session, lexical_results, effective_top_k)
                    logger.info("Lexical fallback mapped_context=%s", len(context))

                if context:
                    logger.info(
                        "Final context count=%s sample_titles=%s",
                        len(context),
                        [item["title"] for item in context[:3]],
                    )
                    return context, "lexical"

                # Final safety fallback: return latest raw documents if data exists.
                raw_results = session.exec(
                    select(DocumentChunk, PolicyDocument)
                    .join(PolicyDocument)
                    .where(DocumentChunk.text_content.is_not(None))
                    .order_by(PolicyDocument.published_date.desc(), DocumentChunk.id.desc())
                    .limit(effective_top_k * 8)
                ).all()
                logger.info("Raw fallback results=%s", len(raw_results))
                context = _map_context(session, raw_results, effective_top_k)
                logger.info("Raw fallback mapped_context=%s", len(context))

                if context:
                    logger.info(
                        "Final context count=%s sample_titles=%s",
                        len(context),
                        [item["title"] for item in context[:3]],
                    )
                    return context, "recent"

                logger.warning("Final context is empty after all retrieval steps")
                return [], "none"
        except OperationalError as e:
            logger.warning("RAG database OperationalError (attempt %s): %s", _attempt + 1, e)
            if _attempt == 1:
                raise
    raise RuntimeError("get_db_context: unexpected fall-through")


def build_retrieval_sources_payload(
    context_chunks: List[Dict], max_items: int = 8
) -> List[Dict]:
    """Deduplicated official URLs from retrieved chunks for client UI."""
    seen: Set[str] = set()
    out: List[Dict] = []
    for ch in context_chunks:
        url = (ch.get("source_url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        entry = {
            "title": (ch.get("title") or "Source").strip(),
            "source_url": url,
            "source_type": (ch.get("source_type") or "").strip(),
        }
        pd = str(ch.get("published_date") or "").strip()
        if pd:
            entry["published_date"] = pd
        out.append(entry)
        if len(out) >= max_items:
            break
    return out


def _money_suffix_to_mult(s: Optional[str]) -> float:
    if not s:
        return 1.0
    t = s.lower()
    if t in ("k", "thousand"):
        return 1e3
    if t in ("m", "million"):
        return 1e6
    if t in ("b", "billion"):
        return 1e9
    return 1.0


def _parse_money_groups(num: str, suffix: Optional[str]) -> Optional[float]:
    raw = (num or "").replace(",", "").strip()
    if not raw:
        return None
    try:
        base = float(raw)
    except ValueError:
        return None
    return base * _money_suffix_to_mult(suffix)


def _money_amounts_in_text(t: str) -> List[float]:
    """Parse dollar / million-style amounts from a line or haystack (lowercased text ok)."""
    amounts: List[float] = []
    seen: Set[float] = set()
    patterns = (
        re.compile(r"\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|thousand|[kmb])?\b", re.I),
        re.compile(r"(?<![\w$])([\d,]+(?:\.\d+)?)\s+(million|billion)\b(?![\w])", re.I),
    )
    for pat in patterns:
        for m in pat.finditer(t):
            suf = m.group(2) if m.lastindex and m.lastindex >= 2 else None
            v = _parse_money_groups(m.group(1), suf)
            if v is None or v < 0:
                continue
            key = round(v, 4)
            if key in seen:
                continue
            seen.add(key)
            amounts.append(v)
    return amounts


def _haystack_money_floats(hay_spaced: str, hay_compact: str) -> Set[float]:
    """All monetary values found in retrieved context (normalized + compact)."""
    return set(_money_amounts_in_text(f"{hay_spaced} {hay_compact}"))


def _money_amounts_close(a: float, b: float) -> bool:
    tol = max(1.0, abs(a) * 1e-6, abs(b) * 1e-6)
    return math.isclose(a, b, rel_tol=1e-9, abs_tol=tol)


def _norm_grounding_text(s: str) -> str:
    t = (s or "").lower()
    t = t.replace("\u2013", "-").replace("\u2014", "-")
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _haystack_from_context(context_chunks: List[Dict]) -> Tuple[str, str]:
    parts: List[str] = []
    for ch in context_chunks or []:
        for k in ("title", "text_content", "source_url", "published_date", "source_type"):
            v = ch.get(k)
            if isinstance(v, str) and v.strip():
                parts.append(v)
    joined = "\n".join(parts)
    spaced = _norm_grounding_text(joined)
    compact = re.sub(r"\s+", "", spaced)
    return spaced, compact


def _key_number_line_grounded(line: str, hay_spaced: str, hay_compact: str) -> bool:
    raw = (line or "").strip()
    if not raw or not re.search(r"\d", raw):
        return False
    nl = raw.lower()
    nl = nl.replace("\u2013", "-").replace("\u2014", "-")
    nl = re.sub(r"\*+", "", nl)
    nl = re.sub(r"\s+", " ", nl).strip()

    for m in re.findall(r"\d{4,}", nl):
        if m not in hay_spaced and m not in hay_compact:
            return False

    line_moneys = _money_amounts_in_text(nl)
    if line_moneys:
        hay_money = _haystack_money_floats(hay_spaced, hay_compact)
        for amt in line_moneys:
            if not any(_money_amounts_close(amt, h) for h in hay_money):
                return False

    if re.search(r"\d\s*-\s*\d", nl):
        vm = re.search(r"(\d{1,4})\s*-\s*(\d{1,4})", nl)
        if vm:
            vote = f"{vm.group(1)}-{vm.group(2)}"
            if vote not in hay_compact and vote not in re.sub(r"\s+", "", hay_spaced):
                return False

    if not re.search(r"\d{4,}", nl) and not line_moneys:
        runs = re.findall(r"\d[\d,]*\.?\d*", nl)
        stripped_runs: List[str] = []
        for r in runs:
            d = re.sub(r"[^\d]", "", r)
            if len(d) >= 3:
                stripped_runs.append(d)
        if stripped_runs:
            if not any(dr in hay_compact for dr in stripped_runs):
                return False
        elif re.search(r"\d", nl):
            return False

    return True


def filter_key_numbers_to_context(reply: Dict, context_chunks: List[Dict]) -> None:
    """Drop key_numbers lines whose figures are not supported by retrieved chunk text."""
    raw = reply.get("key_numbers")
    if raw is None:
        reply["key_numbers"] = []
        return
    if not isinstance(raw, list):
        return
    hay_spaced, hay_compact = _haystack_from_context(context_chunks)
    if not hay_compact:
        reply["key_numbers"] = []
        return
    kept: List[str] = []
    for item in raw:
        if isinstance(item, str) and _key_number_line_grounded(item, hay_spaced, hay_compact):
            kept.append(item)
    reply["key_numbers"] = kept


# build demographics string for the LLM
def build_profile_context(demographics: Dict[str, Optional[str]]) -> str:
    """
    Convert the flat demographics dict the frontend sends into a plain-English
    paragraph the LLM can use to personalize its response.

    Frontend sends keys like: borough, zip, issue_area, timeframe,
    location_scope, profile_active, housing, issues (comma-separated),
    demographics (comma-separated tags like 'renter,senior').
    """
    if not demographics:
        return "(no profile information provided)"

    parts: List[str] = []

    borough = (demographics.get("borough") or "").strip()
    zip_code = (demographics.get("zip") or "").strip()
    if borough and zip_code:
        parts.append(f"The user lives in **{borough}** (ZIP {zip_code}).")
    elif borough:
        parts.append(f"The user lives in **{borough}**.")
    elif zip_code:
        parts.append(f"The user's ZIP code is **{zip_code}**.")

    housing = (demographics.get("housing") or "").strip()
    if housing:
        parts.append(f"Housing situation: **{housing}**.")

    # issues can come as a comma-separated string or as issue_area
    issues_raw = (demographics.get("issues") or demographics.get("issue_area") or "").strip()
    if issues_raw:
        issue_list = [i.strip() for i in issues_raw.split(",") if i.strip()]
        if issue_list:
            parts.append(f"Policy interests: **{', '.join(issue_list)}**.")

    demo_tags = (demographics.get("demographics") or "").strip()
    if demo_tags:
        tags = [t.strip() for t in demo_tags.split(",") if t.strip()]
        if tags:
            parts.append(f"User describes themselves as: **{', '.join(tags)}**.")

    profile_active = (demographics.get("profile_active") or "").strip().lower()
    if profile_active == "true":
        parts.append(
            "The user has a personalized profile active — tailor all implications "
            "and next steps to their specific situation above."
        )

    timeframe = (demographics.get("timeframe") or "").strip()
    if timeframe and timeframe != "All Time":
        parts.append(f"Timeframe filter: {timeframe}.")

    return " ".join(parts) if parts else "(no profile information provided)"



def timeframe_to_days(timeframe: Optional[str]) -> Optional[int]:
    """Convert frontend timeframe string to number of days, or None for all time."""
    if not timeframe:
        return None
    t = timeframe.strip().lower()
    if "30" in t:
        return 30
    if "6 month" in t or "180" in t:
        return 180
    if "year" in t or "365" in t:
        return 365
    if "90" in t or "3 month" in t:
        return 90
    # "all time" or anything unrecognized → no filter
    return None



@app.post("/api/chat")
@limiter.limit("10/minute")
async def chat_endpoint(request: Request, payload: ChatRequest):
    msg_list = _normalize_chat_messages(payload.messages)
    if msg_list and msg_list[-1]["role"] != "user":
        raise HTTPException(
            status_code=400,
            detail="Last message must have role `user`.",
        )

    retrieval_q = _retrieval_query_from_request(payload)

    # enrich demographics with any issue_area from the query context
    enriched_demo = dict(payload.demographics or {})

    try:
        context_chunks, retrieval_tier = get_db_context(
            retrieval_q, demographics=enriched_demo
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    logger.info(
        "Passing context_chunks to LLM count=%s retrieval_tier=%s msg_turns=%s",
        len(context_chunks),
        retrieval_tier,
        len(msg_list) if msg_list else 0,
    )

    profile_context = build_profile_context(enriched_demo)
    enriched_demo["_profile_context"] = profile_context

    style = (payload.response_style or "structured").strip().lower()
    preamble = (payload.session_preamble or "").strip() or None

    response = llm.generate_response(
        query=payload.query,
        demographics=enriched_demo,
        context_chunks=context_chunks,
        response_style=style,
        messages=msg_list,
        session_preamble=preamble,
    )

    if isinstance(response, dict) and str(response.get("error", "")).startswith("Error connecting to LLM"):
        logger.warning("Upstream LLM unavailable: %s", response.get("error"))
        raise HTTPException(
            status_code=503,
            detail="The AI service is temporarily busy. Please try again in a moment.",
        )

    if isinstance(response, dict) and not response.get("error"):
        filter_key_numbers_to_context(response, context_chunks)

    return {
        "reply": response,
        "sources_used": len(context_chunks),
        "retrieval_tier": retrieval_tier,
        "retrieval_sources": build_retrieval_sources_payload(context_chunks),
    }


@app.get("/api/health")
async def health_check():
    try:
        with Session(engine) as session:
            count = len(session.exec(select(DocumentChunk).limit(1)).all())
        return {"status": "ok", "db_connected": True, "has_data": count > 0}
    except Exception as e:
        return {"status": "degraded", "db_connected": False, "error": str(e)}


@app.get("/api/metrics/records")
async def get_records_metrics():
    """Global data indexing metrics for KPI cards."""
    try:
        with Session(engine) as session:
            indexed_records_total = session.exec(
                select(func.count(DocumentChunk.id)).where(DocumentChunk.embedding.is_not(None))
            ).one()
            documents_total = session.exec(select(func.count(PolicyDocument.id))).one()
            source_types_indexed = session.exec(
                select(func.count(func.distinct(PolicyDocument.source_type)))
                .where(PolicyDocument.source_type.is_not(None))
            ).one()
            unique_sources_indexed = session.exec(
                select(func.count(func.distinct(PolicyDocument.source_url)))
                .where(PolicyDocument.source_url.is_not(None))
            ).one()

            now_utc = datetime.now(timezone.utc)
            month_start = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)
            if now_utc.month == 12:
                next_month_start = datetime(now_utc.year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                next_month_start = datetime(now_utc.year, now_utc.month + 1, 1, tzinfo=timezone.utc)
            new_records_this_month = session.exec(
                select(func.count(PolicyDocument.id))
                .where(or_(
                    (
                        (PolicyDocument.scraped_at >= month_start)
                        & (PolicyDocument.scraped_at < next_month_start)
                    ),
                    (
                        (PolicyDocument.published_date.is_not(None))
                        & (PolicyDocument.published_date >= month_start)
                        & (PolicyDocument.published_date < next_month_start)
                    ),
                ))
            ).one()

        return {
            "indexed_records_total": int(indexed_records_total or 0),
            "documents_total": int(documents_total or 0),
            "source_types_indexed": int(source_types_indexed or 0),
            "unique_sources_indexed": int(unique_sources_indexed or 0),
            "new_records_this_month": int(new_records_this_month or 0),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load record metrics: {e}")


@app.get("/api/politicians")
async def get_politicians(
    borough: Optional[str] = None,
    stance: Optional[str] = None,
):
    def infer_stance(party: Optional[str]) -> str:
        normalized = (party or "").strip().lower()
        if normalized in {"democrat", "working families"}: return "Progressive"
        if normalized in {"republican", "conservative"}: return "Conservative"
        if normalized in {"independent", "no party"}: return "Independent"
        return "Moderate"

    # Map politician role -> District.jurisdiction so we can join geography in.
    # Only Council Members are populated today; other roles fall through with empty zips/neighborhoods.
    role_to_jurisdiction = {
        "Council Member": "NYC Council",
        "State Senator": "NYS Senate",
        "Assembly Member": "NYS Assembly",
    }

    try:
        with Session(engine) as session:
            selected_cols = ["id", "full_name", "party", "role", "location_borough", "district_number", "bio_url"]
            query = select(*[getattr(Politician, c) for c in selected_cols])
            normalized_borough = (borough or "").strip().lower()
            normalized_stance = (stance or "").strip().lower()

            if normalized_borough and normalized_borough != "all":
                query = query.where(
                    func.lower(Politician.location_borough) == normalized_borough
                )

            rows = session.exec(query.order_by(Politician.full_name.asc())).all()

            districts = session.exec(select(District)).all()
            district_by_key = {(d.district_number, d.jurisdiction): d for d in districts}

            payload = []
            for p in rows:
                row = dict(zip(selected_cols, p))
                computed_stance = infer_stance(row.get("party"))
                if normalized_stance and normalized_stance != "all" and computed_stance.lower() != normalized_stance:
                    continue

                jurisdiction = role_to_jurisdiction.get((row.get("role") or ""))
                district = (
                    district_by_key.get((row.get("district_number"), jurisdiction))
                    if (row.get("district_number") and jurisdiction)
                    else None
                )
                payload.append({
                    "id": row.get("id"),
                    "name": row.get("full_name"),
                    "office": row.get("role") or "Representative",
                    "borough": row.get("location_borough") or "Unknown",
                    "district": row.get("district_number"),
                    "party": row.get("party") or "Unknown",
                    "political_stance": computed_stance,
                    "bio_url": row.get("bio_url"),
                    "zip_codes": district.zip_codes if district else [],
                    "neighborhoods": district.neighborhoods if district else [],
                    "data_source": "live_database",
                })
            return {"politicians": payload, "available_fields": ["name","office","borough","district","party","political_stance","bio_url","zip_codes","neighborhoods"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politicians: {e}")


@app.get("/api/policies")
async def get_recent_policies(
    borough: Optional[str] = None,
    area: Optional[str] = None,
    timeframe: Optional[str] = None,
    days: Optional[int] = None,
    limit: int = 30,
):
    """
    Returns recent PolicyDocuments with:
    - Timeframe filtering by published_date (uses `days` or `timeframe` string)
    - Borough filtering (title keyword match since metadata is unstructured)
    - Area/issue keyword filtering on title + source_type
    - District IDs inferred from title/URL since metadata_tags lacks location fields

    `timeframe` accepts: "Last 30 Days", "Last 6 Months", "All Time" (frontend values)
    `days` accepts: integer number of days (alternative direct param)
    """
    try:
        with Session(engine) as session:
            _ensure_district_cache(session)

            # resolve timeframe → cutoff date
            effective_days = days or timeframe_to_days(timeframe)
            cutoff: Optional[datetime] = None
            if effective_days:
                cutoff = datetime.now(timezone.utc) - timedelta(days=effective_days)

            stmt = select(PolicyDocument).order_by(PolicyDocument.published_date.desc())

            # apply published_date cutoff
            if cutoff:
                stmt = stmt.where(
                    or_(
                        PolicyDocument.published_date.is_(None),
                        PolicyDocument.published_date >= cutoff,
                    )
                )

            # fetch more than needed so Python-side filtering has room to trim
            results = session.exec(stmt.limit(limit * 6)).all()

            # area keyword filtering in Python
            area_keywords = (
                AREA_KEYWORDS.get(area or "", [])
                if area and area.strip().lower() not in ("all", "all issues", "")
                else []
            )

            # borough filter (title-based since metadata_tags is unstructured)
            normed_borough = normalize_borough(borough)

            filtered = []
            for p in results:
                meta = p.metadata_tags or {}

                # borough filter: check title and metadata
                if normed_borough:
                    searchable_boro = f"{p.title or ''} {p.source_url or ''}".lower()
                    meta_borough = normalize_borough(
                        str(meta.get("borough") or meta.get("boro") or "")
                    )
                    if (
                        normed_borough.lower() not in searchable_boro
                        and meta_borough != normed_borough
                    ):
                        continue

                # area keyword filter
                if area_keywords:
                    searchable_area = (
                        f"{p.title or ''} {p.source_type or ''} "
                        f"{' '.join(str(v) for v in meta.values() if isinstance(v, str))}"
                    ).lower()
                    if not any(kw in searchable_area for kw in area_keywords):
                        continue

                # infer district IDs from title/URL since metadata has no location
                district_ids = infer_districts_from_text(
                    session,
                    title=p.title or "",
                    source_url=p.source_url or "",
                    meta=meta,
                )

                filtered.append({
                    "id": str(p.id),
                    "title": p.title or "Untitled Record",
                    "source_url": p.source_url or "#",
                    "source_type": p.source_type or "Record",
                    "published_date": p.published_date.isoformat() if p.published_date else None,
                    "impact": meta.get("impact") or meta.get("summary") or "",
                    "affects": meta.get("affects") or meta.get("affected_groups") or "",
                    "topic_tags": meta.get("tags") or meta.get("topic_tags") or [],
                    # districts populated from ZIP/borough inference
                    "districts": district_ids,
                    "zips": meta.get("zip_codes") or meta.get("zips") or [],
                })

                if len(filtered) >= limit:
                    break

            return {"policies": filtered}

    except Exception as e:
        logger.error("Error fetching recent policies: %s", e)
        return {"policies": [], "error": str(e)}


@app.get("/api/politicians/filters")
async def get_politician_filters():
    def infer_stance(party: Optional[str]) -> str:
        normalized = (party or "").strip().lower()
        if normalized in {"democrat", "working families"}: return "Progressive"
        if normalized in {"republican", "conservative"}: return "Conservative"
        if normalized in {"independent", "no party"}: return "Independent"
        return "Moderate"

    try:
        with Session(engine) as session:
            rows = session.exec(select(Politician.location_borough, Politician.party)).all()
            boroughs = sorted({b.strip() for b, _ in rows if b and b.strip()})
            stances = sorted({infer_stance(p) for _, p in rows})
            return {"boroughs": boroughs, "stances": stances}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politician filters: {e}")


@app.get("/districts")
async def get_districts():
    try:
        with Session(engine) as session:
            districts = session.exec(
                select(District).where(District.jurisdiction == "NYC Council")
            ).all()
            reps = session.exec(
                select(
                    Politician.full_name,
                    Politician.location_borough,
                    Politician.district_number,
                ).where(Politician.role == "Council Member")
            ).all()
            rep_by_district = {
                dn: (fn, lb) for fn, lb, dn in reps if dn
            }

            out: List[Dict] = []
            for d in districts:
                if not d.district_number or not d.district_number.isdigit():
                    continue
                rep = rep_by_district.get(d.district_number)
                borough = d.borough or (rep[1] if rep else None)
                out.append({
                    "id": int(d.district_number),
                    "district_number": d.district_number,
                    "jurisdiction": d.jurisdiction,
                    "name": f"District {d.district_number}" + (f" ({borough})" if borough else ""),
                    "borough": borough,
                    "rep": rep[0] if rep else None,
                    "zip_codes": d.zip_codes or [],
                    "neighborhoods": d.neighborhoods or [],
                    "issues": [],
                })
            return {"districts": sorted(out, key=lambda x: x["id"])}
    except Exception as e:
        logger.warning("/districts failed: %s", e)
        return {"districts": []}
