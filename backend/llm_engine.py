import os
from typing import List, Dict, Any, Optional
import json
import logging


try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

logger = logging.getLogger("civic_spiegel.llm")


class LLMEngine:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.mock_mode = not self.api_key or not GROQ_AVAILABLE
        
        if self.mock_mode:
            print("LLMEngine initialized in MOCK MODE. No Groq API key found.")
        else:
            self.client = Groq(api_key=self.api_key)
            print("LLMEngine initialized with Groq API.")

    def generate_response(
        self,
        query: str,
        demographics: Dict[str, str],
        context_chunks: List[Dict],
        response_style: str = "structured",
        messages: Optional[List[Dict[str, str]]] = None,
        session_preamble: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Takes the user query, their demographics, and the RAG chunks,
        then queries the LLM for a personalized response.

        response_style: "structured" (JSON briefing) or "plain" (concise markdown).
        messages: optional full user/assistant history (last turn should be user).
        session_preamble: optional UI/session text merged into the plain system prompt.
        """
        logger.info(
            "LLM generate_response start query_len=%s context_chunks=%s style=%s history_turns=%s",
            len((query or "").strip()),
            len(context_chunks),
            response_style,
            len(messages) if messages else 0,
        )


        context_text   = self._format_context(context_chunks)
        profile_context = (demographics.get("_profile_context") or "").strip() or "(no profile provided)"

        style = (response_style or "structured").strip().lower()
        if style == "plain":
            return self._plain_markdown(
                query, profile_context, context_text,
                messages=messages, session_preamble=session_preamble,
            )
        return self._structured_json(
            query, profile_context, context_text, messages=messages,
        )

    # Format the context text
    def _format_context(self, chunks: List[Dict]) -> str:
        if not chunks:
            return (
                "No directly relevant policy documents were retrieved. "
                "Use the query and profile to provide careful, partial guidance "
                "based on general NYC/NY State civic knowledge."
            )
        parts: List[str] = []
        for idx, ch in enumerate(chunks, 1):
            title        = (ch.get("title")        or "Unknown source").strip()
            source_type  = (ch.get("source_type")  or "").strip()
            published    = ch.get("published_date") or ""
            source_url   = (ch.get("source_url")   or "").strip()
            text         = (ch.get("text_content")  or "").strip()
            if len(text) > 1500:
                text = text[:1500] + "…"
            url_line = f"Official URL (from index): {source_url}\n" if source_url else ""
            parts.append(
                f"[Context {idx}]\n"
                f"Title: {title}\n"
                f"Source Type: {source_type}\n"
                f"Published: {published}\n"
                f"{url_line}"
                f"Text: {text}"
            )
        return "\n\n".join(parts)

    # structured JSON briefing
    def _structured_json(
        self,
        query: str,
        profile_context: str,
        context_text: str,
        messages: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:

        system_prompt = f"""You are Civic Spiegel, an expert civic assistant for New York City residents.
You translate government policy into plain English that everyday people — renters, commuters,
parents, seniors, small business owners — can immediately understand and act on.

LEGISLATIVE SCOPE (cover all three levels affecting NYC):
- NYC City Council: local laws, ULURP, agency rules, city budget, hearings
- New York State Legislature: Albany bills, state budget, MTA capital plans, DHCR rent rules
- Federal: HUD programs, FTA/FHWA grants, Medicaid, immigration enforcement, infrastructure funds
When state or federal action is relevant, prefix that bullet with [NY State] or [Federal].

USER PROFILE:
{profile_context}

PERSONALIZATION RULES:
- If the user has a borough, say "In Brooklyn..." or "For Queens residents..." — never "residents may be affected."
- If the user is a renter: lead with tenant protections, rent stabilization, eviction timelines.
- If the user is a homeowner: lead with property tax, homeowner programs, coop/condo rules.
- If the user has policy interests: prioritize bullets from those areas first.
- If profile_active is true: every section should feel personally relevant.
- If no profile: write for a general NYC resident — specific to NYC, never vague.

RETRIEVED POLICY DOCUMENTS:
{context_text}

VOICE & STYLE:
- Short sentences. Plain English. ~8th-grade reading level.
- Words real people use: rent, fine, vote, deadline, your building, your commute.
- Explain acronyms on first use: "HPD (Housing Preservation & Development)".
- Bold (**like this**) the most critical phrase in each bullet.
- Each bullet = one idea. Under ~30 words ideally.

SECTION DEPTH:
- what_happened: 4–6 bullets — what actually changed or was decided
- why_it_matters: 4–6 bullets — real-world impact, costs, timelines, controversy
- whos_affected: 4–6 bullets — name specific groups, neighborhoods, situations
- what_happens_next: 3–5 bullets — deadlines, votes, implementation, resident actions, who to contact
- read_more: 2–4 detail bullets ([] if nothing useful)

ANTI-HALLUCINATION:
- Only include key_numbers figures that appear verbatim in the Context Documents.
- Never invent dollar amounts, vote counts, dates, or percentages.
- If context is thin, say so in tldr rather than padding.

OUTPUT: Return ONLY valid JSON. No markdown fences. No text outside the JSON object.

JSON SCHEMA (all keys required; use [] for empty arrays):
{{
  "tldr": ["1–2 plain-English headline sentences"],
  "topic_tags": ["2–5 short tags, Title Case"],
  "what_happened": ["4–6 bullets"],
  "why_it_matters": ["4–6 bullets"],
  "whos_affected": ["4–6 bullets"],
  "key_numbers": [],
  "what_happens_next": ["3–5 bullets including resident actions + contacts"],
  "read_more": ["2–4 optional detail bullets"],
  "at_a_glance": ["mirror of what_happened"],
  "key_takeaways": ["mirror of why_it_matters"],
  "what_this_means": ["mirror of whos_affected"],
  "relevant_actions": ["mirror of what_happens_next"],
  "sources": [
    {{
      "title": "Official title from context",
      "description": "1–2 sentences on why this source matters to residents.",
      "url": "exact URL from 'Official URL (from index):' line — empty string if absent",
      "source_type": "from context or empty string",
      "published_date": "from context or empty string"
    }}
  ]
}}

RULES:
- tldr: 1–2 strings, each under ~40 words, no jargon.
- Mirror fields must be identical strings to their primary field.
- key_numbers: [] unless a specific number appears verbatim in context.
- sources: 3–8, deduped by URL; description explains why it matters to the reader.
- Never echo "Context 1" or index labels.
"""

        if self.mock_mode:
            return self._mock_structured()
        # Real Groq call
        turns = self._build_turns(messages, query)
        try:
            resp = self.client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, *turns],
                model="llama-3.1-8b-instant",
                temperature=0.3,
            )
            raw = resp.choices[0].message.content or ""
            logger.info("LLM structured response len=%d", len(raw))
            return self._parse_json(raw)
        except Exception as e:
            return {"error": f"Error connecting to LLM: {e}", "raw": ""}

    # plain markdown (floating chat + follow-ups)

    def _plain_markdown(
        self,
        query: str,
        profile_context: str,
        context_text: str,
        messages: Optional[List[Dict[str, str]]] = None,
        session_preamble: Optional[str] = None,
    ) -> Dict[str, Any]:

        system_prompt = f"""You are Spiegel, a plain-language civic assistant for New York City residents.
You explain government decisions, legislation, and policy like a knowledgeable friend — not a policy document.

SCOPE: NYC City Council, New York State Legislature, and federal policy affecting NYC.
When state or federal action is relevant, say so: "Albany passed..." or "A federal rule requires..."

USER PROFILE:
{profile_context}

RETRIEVED DOCUMENTS:
{context_text}

HOW TO ANSWER:
- Lead with the direct answer or most important fact first.
- If the user has a borough, neighborhood, or situation in their profile, connect the answer to them
  specifically. Say "As a Brooklyn renter..." or "For someone in your situation..." not just "residents."
- Use short paragraphs (2–3 sentences) followed by bullets for multiple facts, steps, or options.
- Aim for 3–6 bullets when listing items.
- Plain English only. Explain acronyms on first use.
- Specific is better than vague: name agencies, amounts, deadlines when context supports it.

PRACTICAL NEXT STEPS (include when relevant):
- Name the specific office or agency to contact.
- Suggest calling 311 or contacting a council member by name if known.
- Mention how to attend a public hearing or comment period.

WHAT NOT TO DO:
- Never write placeholder links like [website URL] or [URL here].
- Don't paste raw URLs — the app shows official links separately.
- Don't say "I don't have access to real-time data" — answer carefully and flag uncertainty.
- Don't use section headers like "At a glance" or "Key takeaways".
- Don't pad with generic filler when context is thin.
- Do not output JSON.

End substantive answers with a one-sentence "What this means for you:" line that connects
directly to the user's profile if one exists, or to a general NYC resident if not.
"""

        if session_preamble and session_preamble.strip():
            system_prompt += f"\n\nPage context:\n{session_preamble.strip()}"

        if self.mock_mode:
            return {"markdown": "**Mock mode:** Set `GROQ_API_KEY` in your backend environment for live answers."}

        turns = self._build_turns(messages, query)
        try:
            resp = self.client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, *turns],
                model="llama-3.1-8b-instant",
                temperature=0.25,
            )
            text = (resp.choices[0].message.content or "").strip()
            logger.info("LLM plain response len=%d", len(text))
            if not text:
                return {"error": "Empty response from LLM", "raw": ""}
            return {"markdown": text}
        except Exception as e:
            return {"error": f"Error connecting to LLM: {e}", "raw": ""}


    @staticmethod
    def _build_turns(
        messages: Optional[List[Dict[str, str]]],
        fallback_query: str,
    ) -> List[Dict[str, str]]:
        turns: List[Dict[str, str]] = []
        if messages:
            for m in messages:
                role    = (m.get("role") or "").strip().lower()
                content = (m.get("content") or "").strip()
                if role in ("user", "assistant") and content:
                    turns.append({"role": role, "content": content})
        if not turns:
            turns.append({"role": "user", "content": (fallback_query or "").strip() or "."})
        return turns

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any]:
        """Try to parse JSON; strip markdown fences if present."""
        text = raw.strip()
        if text.startswith("```"):
            parts = text.split("```")
            # take the middle part between first pair of fences
            if len(parts) >= 3:
                text = parts[1].lstrip("json").strip()
            elif len(parts) == 2:
                text = parts[1].strip()
        try:
            return json.loads(text)
        except Exception:
            return {"error": "Invalid JSON from LLM", "raw": raw}


    # mock data
    @staticmethod
    def _mock_structured() -> Dict[str, Any]:
        _bullets = [
            "**Structured JSON briefings** are returned when Groq is configured.",
            "Without an API key, you see this **placeholder layout** to verify the UI.",
        ]
        return {
            "tldr": [
                "The briefing API is in mock mode — this is placeholder content, not live policy.",
                "Add GROQ_API_KEY to your backend .env and restart to get real briefings.",
            ],
            "topic_tags": ["Mock Mode", "Developer", "NYC Civic"],
            "what_happened":    _bullets,
            "why_it_matters":   ["Developers can check **layout and readability** without burning tokens.", "Residents will see **live policy facts** from indexed documents once enabled."],
            "whos_affected":    ["**You** see placeholder content until the model is connected.", "**NYC residents** get plain-language briefings once live."],
            "key_numbers":      [],
            "what_happens_next":["Set **GROQ_API_KEY** in backend/.env.", "Restart **uvicorn** and ask a real NYC policy question."],
            "read_more":        ["The model targets **8th-grade reading level**, short bullets, and no bureaucratic tone."],
            "at_a_glance":      _bullets,
            "key_takeaways":    ["Developers can check **layout and readability** without burning tokens.", "Residents will see **live policy facts** from indexed documents once enabled."],
            "what_this_means":  ["**You** see placeholder content until the model is connected.", "**NYC residents** get plain-language briefings once live."],
            "relevant_actions": ["Set **GROQ_API_KEY** in backend/.env.", "Restart **uvicorn** and ask a real NYC policy question."],
            "sources": [
                {
                    "title": "Civic Spiegel — developer README (mock)",
                    "description": "Explains mock mode and how to enable live Groq-backed briefings.",
                    "url": "https://github.com/",
                    "source_type": "Documentation",
                    "published_date": "",
                },
            ],
        }