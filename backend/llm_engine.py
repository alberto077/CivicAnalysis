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

        # Format the context text
        if not context_chunks:
            context_text = (
                "No directly relevant policy documents were retrieved. "
                "Use the user's query and profile to provide careful, partial guidance "
                "based on general NYC/NY State civic knowledge."
            )
        else:
            formatted_chunks: List[str] = []
            for idx, chunk in enumerate(context_chunks, start=1):
                title = (chunk.get("title") or "Unknown source").strip()
                source_type = (chunk.get("source_type") or "Unknown source type").strip()
                published_date = chunk.get("published_date") or "Unknown publication date"
                source_url = (chunk.get("source_url") or "").strip()
                url_line = f"Official URL (from index): {source_url}\n" if source_url else ""
                text_content = (chunk.get("text_content") or "").strip()
                if len(text_content) > 1500:
                    text_content = f"{text_content[:1500]}..."
                formatted_chunks.append(
                    f"[Context {idx}]\n"
                    f"Title: {title}\n"
                    f"Source Type: {source_type}\n"
                    f"Published Date: {published_date}\n"
                    f"{url_line}"
                    f"Key Text: {text_content}"
                )
            context_text = "\n\n".join(formatted_chunks)

        # main.py injects _profile_context as a pre-built plain-English string
        profile_context = (demographics.get("_profile_context") or "").strip()
        if not profile_context:
            # Fallback: build a basic one from raw fields
            borough = (demographics.get("borough") or "").strip()
            profile_context = f"User borough: {borough}." if borough else "(no profile provided)"

        if (response_style or "structured").strip().lower() == "plain":
            return self._generate_plain_markdown(
                query,
                profile_context,
                context_text,
                messages=messages,
                session_preamble=session_preamble,
            )

        system_prompt = f"""You are Civic Spiegel, a New York City civic assistant that explains government \
decisions to everyday residents — renters, commuters, parents, small business owners, seniors, and anyone \
affected by local policy. Write like a trusted friend who happens to know city government well.

SCOPE: Cover all three levels that affect NYC residents:
- NYC City Council (local laws, ULURP, agency rules, budget)
- New York State Legislature (Albany bills, state budget, MTA, DHCR rent rules, state programs)
- Federal government (HUD, FTA grants, Medicaid, immigration enforcement, infrastructure funding)
When state or federal action is relevant, start that bullet with [NY State] or [Federal] so readers know.

USER PROFILE:
{profile_context}

RETRIEVED POLICY DOCUMENTS:
{context_text}

PERSONALIZATION RULES:
- If the user has a borough, ZIP, or neighborhood: name that place in whos_affected and why_it_matters.
  Say "In Brooklyn..." or "For Bronx residents..." not just "residents may be affected."
- If the user is a renter: lead with tenant protections, rent stabilization, eviction rules, housing vouchers.
- If the user is a homeowner: lead with property tax, co-op/condo rules, homeowner programs.
- If the user has policy interests (housing, transit, health, etc.): prioritize bullets from those areas.
- If the user is a senior, veteran, student, or other group: surface programs and impacts specific to them.
- If profile_active is true: every section should feel personally relevant, not generic.
- If no profile: write for a general NYC resident — still specific to NYC, never vague.

VOICE & READABILITY:
- Short sentences. Plain English. 8th-grade reading level.
- Use words real people use: rent, fine, vote, deadline, cost, neighborhood, your building, your commute.
- No bureaucratic filler. No legalese. Explain acronyms on first use (e.g. "HPD (Housing Preservation)").
- Each bullet = one idea, one implication, or one action. Under ~30 words ideally.
- Bold (**like this**) the most important phrase in each bullet.

SECTION DEPTH:
- what_happened: 4–6 bullets of what actually changed or was decided
- why_it_matters: 4–6 bullets on real-world impact — costs, timelines, enforcement, controversy
- whos_affected: 4–6 bullets naming specific groups, neighborhoods, or situations
- what_happens_next: 3–5 bullets on deadlines, votes, implementation, or what residents can do
- read_more: 2–4 bullets for background, procedure, or caveats ([] if nothing useful)

WHAT_HAPPENS_NEXT should include practical resident actions where relevant:
- Who to contact (council member, agency, 311)
- How to attend a hearing or comment period
- What to do if this affects you directly

ANTI-HALLUCINATION:
- Only include key_numbers figures that appear verbatim in the Context Documents.
- Never invent dollar amounts, vote counts, dates, or percentages.
- If context is thin, say so in tldr rather than padding with invented facts.

CRITICAL OUTPUT RULE:
Return ONLY valid JSON. No markdown fences, no commentary outside the JSON.

JSON FORMAT (all keys required; use [] for empty arrays):
{{
  "tldr": ["One plain-English headline sentence.", "Optional second sentence with key implication."],
  "topic_tags": ["2–5 short tags, Title Case"],
  "what_happened": ["4–6 bullets on decisions, votes, or changes"],
  "why_it_matters": ["4–6 bullets on real-world impact for residents"],
  "whos_affected": ["4–6 bullets naming specific people, places, groups"],
  "key_numbers": [],
  "what_happens_next": ["3–5 bullets including resident actions and contacts"],
  "read_more": ["2–4 optional detail bullets"],
  "at_a_glance": ["mirror of what_happened"],
  "key_takeaways": ["mirror of why_it_matters"],
  "what_this_means": ["mirror of whos_affected"],
  "relevant_actions": ["mirror of what_happens_next"],
  "sources": [
    {{
      "title": "Official title from context",
      "description": "One or two sentences on why this source matters.",
      "url": "exact URL from context 'Official URL' line, or empty string",
      "source_type": "from context or empty string",
      "published_date": "from context or empty string"
    }}
  ]
}}

RULES:
- tldr: 1–2 strings, each under ~40 words, no jargon.
- topic_tags: 2–5 items, 1–3 words each.
- Mirror fields must be identical strings to their source field.
- key_numbers: [] unless a specific number appears verbatim in context.
- sources: 3–8 sources, deduped by URL; description explains why it matters to the reader.
- Never echo "Context 1" or index labels.
"""

        if self.mock_mode:
            return self._mock_structured_response()

        turn_messages: List[Dict[str, str]] = []
        if messages:
            for m in messages:
                role = (m.get("role") or "").strip().lower()
                content = (m.get("content") or "").strip()
                if role in ("user", "assistant") and content:
                    turn_messages.append({"role": role, "content": content})
        if not turn_messages:
            turn_messages.append({"role": "user", "content": (query or "").strip() or "."})

        # Real Groq call
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, *turn_messages],
                model="llama-3.1-8b-instant",
                temperature=0.3,
            )
            response_text = chat_completion.choices[0].message.content
            logger.info("LLM structured response length=%s", len(response_text or ""))
            try:
                return json.loads(response_text)
            except Exception:
                # try stripping markdown fences if model added them
                clean = (response_text or "").strip()
                if clean.startswith("```"):
                    clean = clean.split("```", 2)[-1] if clean.count("```") >= 2 else clean
                    clean = clean.lstrip("json").strip()
                try:
                    return json.loads(clean)
                except Exception:
                    return {"error": "Invalid JSON from LLM", "raw": response_text}
        except Exception as e:
            return {
                "error": f"Error connecting to LLM: {str(e)}",
                "raw": "",
            }

    def _generate_plain_markdown(
        self,
        query: str,
        profile_context: str,
        context_text: str,
        messages: Optional[List[Dict[str, str]]] = None,
        session_preamble: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Plain markdown for the floating chat and follow-up questions.
        Resident-facing language, grounded in context, personalized to profile.
        """
        system_prompt = f"""You are Spiegel, a plain-language civic assistant for New York City residents. \
You explain government decisions, legislation, and policy in clear, direct language — like a knowledgeable \
friend, not a policy document.

SCOPE: NYC City Council, New York State Legislature, and federal policy affecting NYC.
When state or federal action is relevant, say so: "Albany passed..." or "A federal rule requires..."

USER PROFILE:
{profile_context}

RETRIEVED DOCUMENTS FROM THE CIVIC INDEX:
{context_text}

HOW TO ANSWER:
- Lead with the direct answer or most important fact first.
- If the user has a borough, neighborhood, or situation in their profile, connect the answer to them
  specifically. Say "As a Brooklyn renter..." or "For someone in your situation..." not just "residents."
- Use short paragraphs (2–3 sentences) followed by bullets for multiple facts, steps, or options.
- Aim for 3–6 bullets when listing items; don't use only bullets or only one long block.
- Plain English only. Explain acronyms on first use.
- Specific is better than vague: name agencies, dollar amounts, deadlines, and district numbers
  when the context supports it.

PRACTICAL NEXT STEPS (include when relevant):
- Name the specific office or agency to contact
- Suggest calling 311 or contacting a council member by name if known
- Mention how to attend a public hearing or comment period
- What to do if the policy directly affects the user

WHAT NOT TO DO:
- Never write placeholder links like [website URL] or [URL here]
- Don't paste raw URLs — the app shows official links separately
- Don't say "I don't have access to real-time data" — just answer carefully
- Don't use section headers like "At a glance" or "Key takeaways"
- Don't pad with generic filler when context is thin — be honest about uncertainty
- Don't repeat the same point in multiple forms
- Do not output JSON

End substantive answers with a one-sentence "What this means for you:" line that connects
directly to the user's profile if one exists, or to a general NYC resident if not.
"""
        if session_preamble and session_preamble.strip():
            system_prompt += f"\n\nPage context:\n{session_preamble.strip()}"

        if self.mock_mode:
            return {
                "markdown": "**Mock mode:** Set `GROQ_API_KEY` in the backend environment for live answers.",
            }

        turn_messages: List[Dict[str, str]] = []
        if messages:
            for m in messages:
                role = (m.get("role") or "").strip().lower()
                content = (m.get("content") or "").strip()
                if role in ("user", "assistant") and content:
                    turn_messages.append({"role": role, "content": content})
        if not turn_messages:
            turn_messages.append({"role": "user", "content": (query or "").strip() or "."})

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, *turn_messages],
                model="llama-3.1-8b-instant",
                temperature=0.25,
            )
            response_text = (chat_completion.choices[0].message.content or "").strip()
            logger.info("LLM plain response length=%s", len(response_text))
            if not response_text:
                return {"error": "Empty response from LLM", "raw": ""}
            return {"markdown": response_text}
        except Exception as e:
            return {"error": f"Error connecting to LLM: {str(e)}", "raw": ""}

    def _mock_structured_response(self) -> Dict[str, Any]:
        return {
            "tldr": [
                "The briefing API is in mock mode — this is placeholder layout, not live policy.",
                "Add GROQ_API_KEY to your backend .env and restart to get real briefings.",
            ],
            "topic_tags": ["Mock Mode", "Developer", "NYC Civic"],
            "what_happened": [
                "**Structured JSON briefings** are returned when Groq is configured.",
                "Without an API key, you see this **placeholder layout** to verify the UI.",
            ],
            "why_it_matters": [
                "Developers can check **layout, spacing, and readability** without burning tokens.",
                "Residents will see **live policy facts** from your indexed documents once enabled.",
            ],
            "whos_affected": [
                "**You** see placeholder content until the model is connected.",
                "**NYC residents** get plain-language briefings once live.",
            ],
            "key_numbers": [],
            "what_happens_next": [
                "Set **GROQ_API_KEY** in backend/.env.",
                "Restart **uvicorn** and ask a real NYC policy question.",
            ],
            "read_more": [
                "The model targets **8th-grade reading level**, short bullets, and no bureaucratic tone.",
            ],
            "at_a_glance": [
                "**Structured JSON briefings** are returned when Groq is configured.",
                "Without an API key, you see this **placeholder layout** to verify the UI.",
            ],
            "key_takeaways": [
                "Developers can check **layout, spacing, and readability** without burning tokens.",
                "Residents will see **live policy facts** from your indexed documents once enabled.",
            ],
            "what_this_means": [
                "**You** see placeholder content until the model is connected.",
                "**NYC residents** get plain-language briefings once live.",
            ],
            "relevant_actions": [
                "Set **GROQ_API_KEY** in backend/.env.",
                "Restart **uvicorn** and ask a real NYC policy question.",
            ],
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