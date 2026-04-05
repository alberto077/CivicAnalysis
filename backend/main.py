import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from llm_engine import LLMEngine

app = FastAPI(title="Civic Spiegel Backend API")

# Configure CORS for Next.js localhost testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only (allow localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = LLMEngine()

# Pydantic schemas for the endpoint
class ChatRequest(BaseModel):
    query: str
    demographics: Dict[str, Optional[str]] = {}

def get_mock_db_context():
    """Reads the JSON pipeline output into memory as dummy RAG context."""
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), 
        "pipeline", "output", "mock_db.json"
    )
    
    if not os.path.exists(db_path):
        return []
        
    with open(db_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Flatten the chunks from the documents
    all_chunks = []
    for doc in data:
        for chunk in doc.get("chunks", []):
            all_chunks.append({
                "title": doc.get("title"),
                "text_content": chunk.get("text_content")
            })
            
    # For MVP, we just return the first 5 chunks since we don't have pgvector similarity search yet.
    return all_chunks[:5]

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Core RAG Endpoint.
    1. Fetches relevant documents (mocked mapping for now).
    2. Sends context + demographics + query to LLM.
    3. Returns mapped response.
    """
    context_chunks = get_mock_db_context()
    
    response = engine.generate_response(
        query=request.query,
        demographics=request.demographics,
        context_chunks=context_chunks
    )
    
    return {"reply": response, "sources_used": len(context_chunks)}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "mock_db_loaded": len(get_mock_db_context()) > 0}