from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Tuple
import logging

from sqlmodel import Session, select
from sqlalchemy import func, or_
from db import engine
from schema import DocumentChunk, PolicyDocument, Politician
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


class ChatRequest(BaseModel):
    query: str
    demographics: Dict[str, Optional[str]] = {}


def _has_meaningful_text(value: Optional[str]) -> bool:
    if not value:
        return False
    return bool(value.strip())


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
                "published_date": doc.published_date.isoformat() if doc.published_date else None,
                "context_span": f"{span_start}-{span_end}",
            }
        )
        if len(context) >= top_k:
            break
    return context


def get_db_context(query: str, top_k: int = 8) -> List[Dict]:
    """
    Embed the user query and run a pgvector cosine similarity search
    against DocumentChunk. Returns the top_k most relevant chunks
    joined with their parent PolicyDocument title.
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

        # Fallback retrieval when vector search returns no usable context.
        if not context and normalized_query:
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

        # Final safety fallback: return latest raw documents if data exists.
        if not context:
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
        else:
            logger.warning("Final context is empty after all retrieval steps")

        return context


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Core RAG endpoint.
    1. Runs pgvector similarity search against Neon.
    2. Sends context + demographics + query to LLM.
    """
    try:
        context_chunks = get_db_context(request.query)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

    logger.info(
        "Passing context_chunks to LLM count=%s query='%s'",
        len(context_chunks),
        request.query.strip(),
    )

    response = llm.generate_response(
        query=request.query,
        demographics=request.demographics,
        context_chunks=context_chunks,
    )

    return {
        "reply": response,
        "sources_used": len(context_chunks),
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

    try:
        with Session(engine) as session:
            query = select(Politician)
            normalized_borough = (borough or "").strip().lower()
            normalized_stance = (stance or "").strip().lower()

            if normalized_borough and normalized_borough != "all":
                query = query.where(
                    func.lower(Politician.location_borough) == normalized_borough
                )

            rows = session.exec(query.order_by(Politician.full_name.asc())).all()

            payload = []
            for p in rows:
                computed_stance = infer_stance(p.party)
                if normalized_stance and normalized_stance != "all" and computed_stance.lower() != normalized_stance:
                    continue

                payload.append(
                    {
                        "id": p.id,
                        "name": p.full_name,
                        "office": p.role or "Representative",
                        "borough": p.location_borough or "Unknown",
                        "district": p.district_number,
                        "party": p.party,
                        "political_stance": computed_stance,
                        "bio_url": p.bio_url,
                        "data_source": "database",
                    }
                )

            if payload:
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
                    ],
                }

            fallback = []
            for p in FALLBACK_POLITICIANS:
                computed_stance = infer_stance(p.get("party"))
                if normalized_borough and normalized_borough != "all" and p["borough"].lower() != normalized_borough:
                    continue
                if normalized_stance and normalized_stance != "all" and computed_stance.lower() != normalized_stance:
                    continue
                fallback.append(
                    {
                        **p,
                        "political_stance": computed_stance,
                        "data_source": "fallback_seed",
                    }
                )

            return {
                "politicians": fallback,
                "available_fields": [
                    "name",
                    "office",
                    "borough",
                    "district",
                    "party",
                    "political_stance",
                    "bio_url",
                ],
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politicians: {e}")


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
        with Session(engine) as session:
            rows = session.exec(select(Politician)).all()
            if rows:
                boroughs = sorted(
                    {
                        p.location_borough.strip()
                        for p in rows
                        if p.location_borough and p.location_borough.strip()
                    }
                )
                stances = sorted({infer_stance(p.party) for p in rows})
            else:
                boroughs = sorted({p["borough"] for p in FALLBACK_POLITICIANS})
                stances = sorted({infer_stance(p.get("party")) for p in FALLBACK_POLITICIANS})
            return {
                "boroughs": boroughs,
                "stances": stances,
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unable to load politician filters: {e}")