from typing import List
import os
from fastembed import TextEmbedding


class EmbeddingEngine:
    """
    Handles text chunking and FastEmbed vector generation.
    Uses BAAI/bge-small-en-v1.5 (384-dim) via ONNX on CPU — no GPU required.
    """
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        # Use a local cache directory to avoid Temp folder issues
        cache_dir = os.path.join(os.path.dirname(__file__), ".cache")
        os.makedirs(cache_dir, exist_ok=True)
        self.embedding_model = TextEmbedding(model_name=self.model_name, cache_dir=cache_dir)
        print(f"EmbeddingEngine initialized with model: {self.model_name}")

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
