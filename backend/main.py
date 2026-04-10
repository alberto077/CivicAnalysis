from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from sqlmodel import Session, select
from db import engine
from schema import DocumentChunk, PolicyDocument
from embed import get_query_embedding
from llm_engine import LLMEngine
import sys
import os

# add pipeline directory to sys.path for cross-module imports
pipeline_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pipeline"))
if pipeline_path not in sys.path:
    sys.path.append(pipeline_path)

from run_pipeline import run_full_pipeline

app = FastAPI(title="Civic Spiegel Backend API")

# Configure CORS for Next.js localhost testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civic-spiegel.vercel.app"
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
async def health_check():
    try:
        with Session(engine) as session:
            # Simple check for connection
            session.exec(select(PolicyDocument).limit(1)).all()
        return {"status": "ok", "db_connected": True}
    except Exception as e:
        return {"status": "degraded", "db_connected": False, "error": str(e)}


@app.post("/api/pipeline/run")
async def run_pipeline(background_tasks: BackgroundTasks):
    """
    Trigger the full data pipeline in the background to avoid timeouts.
    """
    print("Pipeline execution requested via API endpoint.")
    background_tasks.add_task(run_full_pipeline, use_json=False)
    return {"message": "Pipeline execution started in background."}