from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from sqlmodel import Session, select
from backend.db import engine
from backend.schema import DocumentChunk, PolicyDocument
from backend.embed import get_query_embedding
from backend.llm_engine import LLMEngine
import os

app = FastAPI(title="Civic Spiegel Backend API")

# Configure CORS for Next.js (Local + Production)
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


@app.on_event("startup")
async def list_routes():
    """
    Diagnostic log to verify available routes in the Render console.
    """
    print("\n--- Registered Routes ---")
    for route in app.routes:
        methods = ", ".join(route.methods) if hasattr(route, 'methods') else "N/A"
        print(f"{methods.ljust(15)} {route.path}")
    print("------------------------\n")


# Pydantic schemas for the endpoint
class ChatRequest(BaseModel):
    query: str
    demographics: Dict[str, Optional[str]] = {}


def get_db_context(query: str, top_k: int = 5) -> List[Dict]:
    """
    Embed the user query and run a pgvector cosine similarity search
    against DocumentChunk. Returns the top_k most relevant chunks
    joined with their parent PolicyDocument title.
    """
    query_embedding = get_query_embedding(query)


    with Session(engine) as session:
        results = session.exec(
            select(DocumentChunk, PolicyDocument)
            .join(PolicyDocument)
            .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        ).all()

        if not results:
            return []

        return [
            {"title": doc.title, "text_content": chunk.text_content}
            for chunk, doc in results
        ]




@app.post("/api/chat")
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Core RAG endpoint.
    1. Runs pgvector similarity search against Neon.
    2. Sends context + demographics + query to LLM.
    """
    try:
        context_chunks = get_db_context(request.query)
    except Exception as e:
        print(f"Error fetching context: {e}")
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")


    response = llm.generate_response(
        query=request.query,
        demographics=request.demographics,
        context_chunks=context_chunks
    )


    return {
        "reply": response,
        "sources_used": len(context_chunks),
    }




@app.get("/api/health")
@app.get("/api/health/")
@app.get("/health")
@app.get("/health/")
async def health_check():
    """
    System status check.
    Ensures DB is reachable and contains data.
    """
    try:
        with Session(engine) as session:
            count = len(session.exec(select(DocumentChunk).limit(1)).all())
        return {"status": "ok", "db_connected": True, "has_data": count > 0}
    except Exception as e:
        return {"status": "degraded", "db_connected": False, "error": str(e)}
