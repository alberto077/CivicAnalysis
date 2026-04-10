import time
from typing import List
import os
from fastembed import TextEmbedding
from groq import Groq


class EmbeddingEngine:
    """
    Handles text chunking and FastEmbed vector generation.
    Uses BAAI/bge-small-en-v1.5 (384-dim) via ONNX on CPU — no GPU required.
    """
    _model_cache = {}

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        
        # Singleton pattern: check if model is already loaded in class cache
        if model_name not in EmbeddingEngine._model_cache:
            # Use a local cache directory to avoid Temp folder issues
            cache_dir = os.path.join(os.path.dirname(__file__), ".cache")
            os.makedirs(cache_dir, exist_ok=True)
            
            print(f"Loading Embedding model into memory: {self.model_name}...")
            EmbeddingEngine._model_cache[model_name] = TextEmbedding(
                model_name=self.model_name, cache_dir=cache_dir
            )
        
        self.embedding_model = EmbeddingEngine._model_cache[model_name]
        
        # Initialize Groq for summarization
        self.groq_client = None
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            self.groq_client = Groq(api_key=api_key)
            
        print(f"EmbeddingEngine ready (shared instance) for model: {self.model_name}")

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Improved sentence-aware chunker with word overlap.
        Splits text into chunks at sentence boundaries while respecting
        the maximum word count and providing overlap for context.
        """
        import re
        
        # Split into sentences (handles . ! ? followed by whitespace)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if not sentences:
            return []
            
        chunks = []
        current_chunk_sentences = []
        current_word_count = 0
        
        for sentence in sentences:
            sentence_words = sentence.split()
            count = len(sentence_words)
            
            # If adding this sentence exceeds chunk_size, close current chunk
            if current_word_count + count > chunk_size and current_chunk_sentences:
                chunks.append(" ".join(current_chunk_sentences))
                
                # Create overlap: take last sentences that fit in 'overlap' word budget
                overlap_sentences = []
                overlap_count = 0
                for s in reversed(current_chunk_sentences):
                    s_count = len(s.split())
                    if overlap_count + s_count > overlap:
                        break
                    overlap_sentences.insert(0, s)
                    overlap_count += s_count
                
                current_chunk_sentences = overlap_sentences + [sentence]
                current_word_count = overlap_count + count
            else:
                current_chunk_sentences.append(sentence)
                current_word_count += count
                
        if current_chunk_sentences:
            chunks.append(" ".join(current_chunk_sentences))
            
        return chunks

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generates 384-dimension float vectors for each text chunk via FastEmbed.
        Returns an empty list if no texts provided.
        """
        if not texts:
            return []
        print(f"Generating FastEmbed vectors for {len(texts)} chunk(s)...")
        embeddings = list(self.embedding_model.embed(texts))
        return [emb.tolist() for emb in embeddings]

    def summarize(self, text: str) -> str:
        """
        Uses Groq LLM to summarize long legislative documents into a dense civic briefing.
        Returns the original text if Groq is unavailable or fails.
        """
        if not self.groq_client or not text:
            return text
            
        if len(text.split()) < 300:
            return text # Don't summarize already short text
            
        print(f"Summarizing document via Groq ({len(text.split())} words)...")
        try:
            prompt = (
                "You are a civic data expert. Summarize the following legislative document into a dense, "
                "fact-heavy briefing. Focus on: What it does, who it affects, and major arguments. "
                "Keep the tone neutral and factual. Output only the summarized text (max 400 words).\n\n"
                f"DOCUMENT:\n{text}"
            )
            
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            summary = completion.choices[0].message.content
            if summary:
                print(f"  Successfully summarized down to ~{len(summary.split())} words.")
                # Rate limiting: small sleep to stay within Groq free tier RPM limits
                time.sleep(1)
                return summary
        except Exception as e:
            print(f"  Warning: Summarization failed ({e}). Using raw text.")
            
        return text
