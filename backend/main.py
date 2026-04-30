from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Tuple
import logging

from sqlmodel import Session, select
from sqlalchemy import func, inspect, or_
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
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = LLMEngine()

FALLBACK_POLITICIANS = [
    {
        "id": None,
        "name": "Julie Won",
        "office": "City Council Member",
        "borough": "Queens",
        "district": "26",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/julie-won/",
    },
    {
        "id": None,
        "name": "Carlina Rivera",
        "office": "City Council Member",
        "borough": "Manhattan",
        "district": "2",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/carlina-rivera/",
    },
    {
        "id": None,
        "name": "Justin Brannan",
        "office": "City Council Member",
        "borough": "Brooklyn",
        "district": "47",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/justin-brannan/",
    },
    {
        "id": None,
        "name": "Gale A. Brewer",
        "office": "City Council Member",
        "borough": "Manhattan",
        "district": "6",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/gale-a-brewer/",
    },
    {
        "id": None,
        "name": "Vickie Paladino",
        "office": "City Council Member",
        "borough": "Queens",
        "district": "19",
        "party": "Republican",
        "bio_url": "https://council.nyc.gov/vickie-paladino/",
    },
    {
        "id": None,
        "name": "Rita Joseph",
        "office": "City Council Member",
        "borough": "Brooklyn",
        "district": "40",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/rita-joseph/",
    },
    {
        "id": None,
        "name": "Kevin C. Riley",
        "office": "City Council Member",
        "borough": "Bronx",
        "district": "12",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/kevin-c-riley/",
    },
    {
        "id": None,
        "name": "Kamillah Hanks",
        "office": "City Council Member",
        "borough": "Staten Island",
        "district": "49",
        "party": "Democrat",
        "bio_url": "https://council.nyc.gov/kamillah-hanks/",
    },
]


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
    if not value:
        return False
    return bool(value.strip())


def _table_columns(table_name: str) -> set[str]:
    try:
        inspector = inspect(engine)
        return {c["name"] for c in inspector.get_columns(table_name)}
    except Exception as e:
        logger.warning("Unable to inspect table '%s': %s", table_name, e)
        return set()


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
    seen_chunk_keys = set()
    for chunk, doc in results:
        key = (chunk.document_id, chunk.chunk_index)
        if key in seen_chunk_keys:
            continue
        seen_chunk_keys.add(key)

        text, span_start, span_end = _expand_chunk_window(session, chunk, window_size=1)
        if not _has_meaningful_text(text):
            continue
        context.append(
            {
                "title": doc.title,
                "text_content": text,
                "source_type": doc.source_type,
                "source_url": doc.source_url,
                "published_date": doc.published_date.isoformat() if doc.published_date else None,
                "context_span": f"{span_start}-{span_end}",
            }
        )
        if len(context) >= top_k:
            break
    return context


def get_db_context(query: str, top_k: int = 8) -> Tuple[List[Dict], str]:
    """
    Embed the user query and run a pgvector cosine similarity search
    against DocumentChunk. Returns the top_k most relevant chunks
    joined with their parent PolicyDocument title, plus a retrieval tier:
    vector | lexical | recent | none.
    """
    normalized_query = query.strip()
    effective_top_k = max(6, top_k)
    logger.info("RAG retrieval start query='%s' top_k=%s", normalized_query, top_k)
    query_embedding = get_query_embedding(normalized_query)
    embedding_dim = len(query_embedding) if isinstance(query_embedding, list) else 0
    logger.info(
        "Query embedding generated dim=%s sample=%s",
        embedding_dim,
        query_embedding[:5] if isinstance(query_embedding, list) else [],
    )

    with Session(engine) as session:
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


def build_retrieval_sources_payload(
    context_chunks: List[Dict], max_items: int = 8
) -> List[Dict]:
    """Deduplicated official URLs from retrieved chunks for client UI."""
    seen = set()
    out: List[Dict] = []
    for ch in context_chunks:
        url = (ch.get("source_url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(
            {
                "title": (ch.get("title") or "Source").strip(),
                "source_url": url,
                "source_type": (ch.get("source_type") or "").strip(),
            }
        )
        if len(out) >= max_items:
            break
    return out


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Core RAG endpoint.
    1. Runs pgvector similarity search against Neon.
    2. Sends context + demographics + query to LLM.

    Optional `messages` (user/assistant turns) enables multi-turn; optional
    `session_preamble` is merged into the system prompt for plain responses.
    """
    msg_list = _normalize_chat_messages(request.messages)
    if msg_list and msg_list[-1]["role"] != "user":
        raise HTTPException(
            status_code=400,
            detail="When `messages` is provided, the last message must have role `user`.",
        )

    retrieval_q = _retrieval_query_from_request(request)
    try:
        context_chunks, retrieval_tier = get_db_context(retrieval_q)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    logger.info(
        "Passing context_chunks to LLM count=%s retrieval_tier=%s msg_turns=%s",
        len(context_chunks),
        retrieval_tier,
        len(msg_list) if msg_list else 0,
    )

    style = (request.response_style or "structured").strip().lower()
    preamble = (request.session_preamble or "").strip() or None
    response = llm.generate_response(
        query=request.query,
        demographics=request.demographics,
        context_chunks=context_chunks,
        response_style=style,
        messages=msg_list,
        session_preamble=preamble,
    )

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


@app.get("/api/politicians")
async def get_politicians(
    borough: Optional[str] = None,
    stance: Optional[str] = None,
):
    def infer_stance(party: Optional[str]) -> str:
        normalized = (party or "").strip().lower()
        if normalized in {"democrat", "working families"}:
            return "Progressive"
        if normalized in {"republican", "conservative"}:
            return "Conservative"
        if normalized in {"independent", "no party"}:
            return "Independent"
        return "Moderate"

    # Map politician role -> District.jurisdiction so we can join geography in.
    # Only Council Members are populated today; other roles fall through with empty zips/neighborhoods.
    role_to_jurisdiction = {
        "Council Member": "NYC Council",
        "State Senator": "NYS Senate",
        "Assembly Member": "NYS Assembly",
    }

    try:
        politician_columns = _table_columns("politician")
        has_district_table = bool(_table_columns("district"))

        required_live_columns = {
            "id",
            "full_name",
            "party",
            "role",
            "location_borough",
            "district_number",
            "bio_url",
        }
        if not required_live_columns.issubset(politician_columns):
            missing = sorted(required_live_columns - politician_columns)
            raise RuntimeError(f"politician table missing required columns: {missing}")

        with Session(engine) as session:
            selected_politician_columns = [
                "id",
                "full_name",
                "party",
                "role",
                "location_borough",
                "district_number",
                "bio_url",
            ]
            query = select(
                *[getattr(Politician, c) for c in selected_politician_columns]
            )
            normalized_borough = (borough or "").strip().lower()
            normalized_stance = (stance or "").strip().lower()

            if normalized_borough and normalized_borough != "all":
                query = query.where(
                    func.lower(Politician.location_borough) == normalized_borough
                )

            rows = session.exec(query.order_by(Politician.full_name.asc())).all()

            districts = []
            if has_district_table:
                try:
                    districts = session.exec(select(District)).all()
                except Exception as district_error:
                    # Some deployments haven't run district table migrations yet.
                    logger.warning(
                        "District table unavailable; serving politicians without district geo: %s",
                        district_error,
                    )
            district_by_key = {(d.district_number, d.jurisdiction): d for d in districts}

            payload = []
            for p in rows:
                row = dict(zip(selected_politician_columns, p))
                politician_id = row.get("id")
                full_name = row.get("full_name")
                party = row.get("party")
                role = row.get("role")
                location_borough = row.get("location_borough")
                district_number = row.get("district_number")
                bio_url = row.get("bio_url")
                computed_stance = infer_stance(party)
                if normalized_stance and normalized_stance != "all" and computed_stance.lower() != normalized_stance:
                    continue

                jurisdiction = role_to_jurisdiction.get(role or "")
                district = (
                    district_by_key.get((district_number, jurisdiction))
                    if (district_number and jurisdiction)
                    else None
                )

                payload.append(
                    {
                        "id": politician_id,
                        "name": full_name,
                        "office": role or "Representative",
                        "borough": location_borough or "Unknown",
                        "district": district_number,
                        "party": party or "Unknown",
                        "political_stance": computed_stance,
                        "bio_url": bio_url,
                        "zip_codes": district.zip_codes if district else [],
                        "neighborhoods": district.neighborhoods if district else [],
                        "data_source": "live_database",
                    }
                )

            return {
                "politicians": payload,
                "available_fields": [
                    "name",
                    "office",
                    "borough",
                    "district",
                    "party",
                    "political_stance",
                    "bio_url",
                    "zip_codes",
                    "neighborhoods",
                ],
            }
    except Exception as e:
        err = str(e)
        if "UndefinedColumn" in err or "UndefinedTable" in err or "does not exist" in err:
            logger.warning("Politicians schema mismatch; serving fallback data: %s", err)
            normalized_borough = (borough or "").strip().lower()
            normalized_stance = (stance or "").strip().lower()
            payload = []
            for p in FALLBACK_POLITICIANS:
                computed_stance = infer_stance(p.get("party"))
                fallback_borough = (p.get("borough") or "").strip().lower()
                if normalized_borough and normalized_borough != "all" and fallback_borough != normalized_borough:
                    continue
                if normalized_stance and normalized_stance != "all" and computed_stance.lower() != normalized_stance:
                    continue
                payload.append(
                    {
                        **p,
                        "office": p.get("office") or "Representative",
                        "borough": p.get("borough") or "Unknown",
                        "district": p.get("district"),
                        "party": p.get("party") or "Unknown",
                        "political_stance": computed_stance,
                        "zip_codes": [],
                        "neighborhoods": [],
                        "data_source": "fallback_mock",
                    }
                )
            return {
                "politicians": payload,
                "available_fields": [
                    "name",
                    "office",
                    "borough",
                    "district",
                    "party",
                    "political_stance",
                    "bio_url",
                    "zip_codes",
                    "neighborhoods",
                ],
            }
        raise HTTPException(status_code=503, detail=f"Unable to load politicians: {e}")


@app.get("/api/policies")
async def get_recent_policies(
    borough: Optional[str] = None,
    area: Optional[str] = None,
    limit: int = 10
):
    try:
        with Session(engine) as session:
            statement = select(PolicyDocument).order_by(PolicyDocument.published_date.desc())
            
            # Temporary: remove filtering to isolate the connection issue
            results = session.exec(statement.limit(limit)).all()
            
            return {
                "policies": [
                    {
                        "id": p.id,
                        "title": p.title,
                        "source_url": p.source_url,
                        "source_type": p.source_type,
                        "published_date": p.published_date.isoformat() if p.published_date else None,
                        "metadata": p.metadata_tags
                    }
                    for p in results
                ]
            }
    except Exception as e:
        logger.error(f"Error fetching recent policies: {e}")
        return {"policies": [], "error": str(e)}


@app.get("/api/politicians/filters")
async def get_politician_filters():
    def infer_stance(party: Optional[str]) -> str:
        normalized = (party or "").strip().lower()
        if normalized in {"democrat", "working families"}:
            return "Progressive"
        if normalized in {"republican", "conservative"}:
            return "Conservative"
        if normalized in {"independent", "no party"}:
            return "Independent"
        return "Moderate"

    try:
        politician_columns = _table_columns("politician")
        if not {"location_borough", "party"}.issubset(politician_columns):
            missing = sorted({"location_borough", "party"} - politician_columns)
            raise RuntimeError(f"politician table missing filter columns: {missing}")

        with Session(engine) as session:
            rows = session.exec(
                select(
                    Politician.location_borough,
                    Politician.party,
                )
            ).all()
            if rows:
                boroughs = sorted(
                    {
                        location_borough.strip()
                        for location_borough, _party in rows
                        if location_borough and location_borough.strip()
                    }
                )
                stances = sorted({infer_stance(party) for _location_borough, party in rows})
            else:
                boroughs = sorted({p["borough"] for p in FALLBACK_POLITICIANS})
                stances = sorted({infer_stance(p.get("party")) for p in FALLBACK_POLITICIANS})
            return {
                "boroughs": boroughs,
                "stances": stances,
            }
    except Exception as e:
        err = str(e)
        if "UndefinedColumn" in err or "UndefinedTable" in err or "does not exist" in err:
            logger.warning("Politician filters schema mismatch; serving fallback filters: %s", err)
            boroughs = sorted({p["borough"] for p in FALLBACK_POLITICIANS})
            stances = sorted({infer_stance(p.get("party")) for p in FALLBACK_POLITICIANS})
            return {
                "boroughs": boroughs,
                "stances": stances,
            }
        raise HTTPException(status_code=503, detail=f"Unable to load politician filters: {e}")

@app.get("/api/districts/map")
async def get_districts_map():
    import json
    import os
    
    file_path = os.path.join(os.path.dirname(__file__), "districts.geojson")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="GeoJSON map data not found. Please run sync script.")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/api/neighborhoods/map")
async def get_neighborhoods_map():
    import json
    import os

    file_path = os.path.join(os.path.dirname(__file__), "neighborhoods.geojson")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Neighborhood GeoJSON not found.")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/api/districts")
async def get_districts():
    try:
        with Session(engine) as session:
            districts = session.exec(
                select(District).where(District.jurisdiction == "NYC Council")
            ).all()
            reps = session.exec(
                select(Politician).where(Politician.role == "Council Member")
            ).all()
            rep_by_district = {p.district_number: p for p in reps if p.district_number}

            out: List[Dict] = []
            for d in districts:
                if not d.district_number or not d.district_number.isdigit():
                    continue
                rep = rep_by_district.get(d.district_number)
                borough = d.borough or (rep.location_borough if rep else None)
                out.append({
                    "id": int(d.district_number),
                    "district_number": d.district_number,
                    "jurisdiction": d.jurisdiction,
                    "name": f"District {d.district_number}" + (f" ({borough})" if borough else ""),
                    "borough": borough,
                    "rep": rep.full_name if rep else None,
                    "zip_codes": d.zip_codes or [],
                    "neighborhoods": d.neighborhoods or [],
                    "issues": [],
                })
            return {"districts": sorted(out, key=lambda x: x["id"])}
    except Exception as e:
        logger.warning(f"/api/districts failed: {e}")
        return {"districts": []}
