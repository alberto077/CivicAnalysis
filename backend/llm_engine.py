import os
from typing import List, Dict

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

class LLMEngine:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.mock_mode = not self.api_key or not GROQ_AVAILABLE
        
        if self.mock_mode:
            print("LLMEngine initialized in MOCK MODE. No Groq API key found.")
        else:
            self.client = Groq(api_key=self.api_key)
            print("LLMEngine initialized with Groq API.")

    def generate_response(self, query: str, demographics: Dict[str, str], context_chunks: List[Dict]) -> str:
        """
        Takes the user query, their demographics, and the RAG chunks,
        then queries the LLM for a personalized response.
        """
        # Format the context text
        context_text = "\n\n".join([f"Source: {c.get('title', 'Unknown')}\n{c.get('text_content', '')}" for c in context_chunks])
        
        # Format demographics
        demo_text = "\n".join([f"- {k}: {v}" for k, v in demographics.items() if v])
        
        system_prompt = (
            "You are Civic Spiegel, an un-biased local civic research assistant. "
            "Your goal is to explain how local policies affect the user based on their specific demographics.\n\n"
            f"User Demographics:\n{demo_text}\n\n"
            f"Context Documents:\n{context_text}\n\n"
            "Instructions:\n"
            "1. Answer the user's question using ONLY the provided context.\n"
            "2. Specifically highlight how this policy affects their given demographics.\n"
            "3. If the context does not contain the answer, say you do not know."
        )

        if self.mock_mode:
            return (
                f"[MOCK BYPASS ENABLED] "
                f"You asked: '{query}'. "
                f"If the Groq API was connected, I would have analyzed {len(context_chunks)} retrieved chunks "
                f"from the mock database and generated a personalized response matching your profile!"
            )

        # Real Groq call
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                model="llama-3.1-8b-instant",
                temperature=0.3,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"Error connecting to LLM: {str(e)}"
