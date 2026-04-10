from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from sqlmodel import Session, select
from backend.db import engine
from backend.schema import DocumentChunk, PolicyDocument
from backend.embed import get_query_embedding
from backend.llm_engine import LLMEngine
from pipeline.run_pipeline import run_full_pipeline
import sys
import os
import time

# add pipeline directory to sys.path for cross-module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
@app.get("/health")
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


@app.post("/api/pipeline/run")
@app.post("/pipeline/run")
async def trigger_pipeline(
    background_tasks: BackgroundTasks,
    x_cron_token: Optional[str] = Header(None)
):
    """
    Webhook to trigger the full data pipeline.
    Runs as a background task to prevent HTTP timeouts.
    Requires X-Cron-Token header for production security.
    """
    # Security token check
    expected_token = os.getenv("CRON_SECRET")
    
    if expected_token and x_cron_token != expected_token:
        print("Unauthorized pipeline trigger attempt.")
        raise HTTPException(status_code=401, detail="Invalid cron token")
    
    print("Pipeline execution requested via API endpoint.")
    background_tasks.add_task(run_full_pipeline, use_json=False)
    
    return {
        "status": "success",
        "message": "Full pipeline triggered in background",
        "timestamp": time.time()
    }
