from typing import List
# from fastembed import TextEmbedding

class EmbeddingEngine:
    """
    Boilerplate module to handle chunking and FastEmbed execution.
    """
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        # self.embedding_model = TextEmbedding(model_name=self.model_name)
        print(f"Initialized EmbeddingEngine with model: {self.model_name}")

    def chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """
        TODO: Implement real RecursiveCharacterTextSplitter logic via Langchain or custom code.
        For now, here is a basic naive word chunker.
        """
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            chunks.append(chunk)
        return chunks

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        TODO: Uncomment actual fastembed logic once ready to download model local weights.
        """
        print(f"Simulating FastEmbed embedding generation for {len(texts)} chunks...")
        
        # embeddings = list(self.embedding_model.embed(texts))
        # return [emb.tolist() for emb in embeddings]
        
        # Return dummy vector (384 zero-floats matching FastEmbed Schema)
        return [[0.0] * 384 for _ in texts]
