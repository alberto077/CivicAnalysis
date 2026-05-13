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
                "Use the user's query and demographics to provide cautious, partial guidance."
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
            logger.info(
                "LLM context prepared blocks=%s sample_titles=%s",
                len(formatted_chunks),
                [c.get("title", "Unknown") for c in context_chunks[:3]],
            )

        # Format demographics
        demo_text = "\n".join([f"- {k}: {v}" for k, v in demographics.items() if v])

        if (response_style or "structured").strip().lower() == "plain":
            return self._generate_plain_markdown(
                query,
                demo_text,
                context_text,
                messages=messages,
                session_preamble=session_preamble,
            )

        system_prompt = (
            "You are Civic Spiegel, a New York City civic news assistant. Write like a clear, modern news "
            "briefing (think Apple News / Bloomberg / Linear): concise, layered, easy to skim on a phone.\n\n"
            f"User Demographics & Location:\n{demo_text}\n\n"
            f"Context Documents (retrieved from city archives/news):\n{context_text}\n\n"

            "VOICE & READABILITY:\n"
            "- Short sentences. Roughly 8th-grade reading level.\n"
            "- Conversational but informative—no legalese, no bureaucratic filler.\n"
            "- Avoid repetition across sections.\n"
            "- Prefer bullets over long paragraphs; each bullet one idea, usually under ~30 words (a bit more room "
            "when needed for agency names, amounts, or dates).\n"
            "- Use plain words residents use (rent, fine, vote, timeline, cost, neighborhood).\n\n"

            "BRIEFING DEPTH (when context supports it—still skimmable):\n"
            "- Aim for **4–6** bullets in what_happened, why_it_matters, whos_affected, and what_happens_next; "
            "use at least **3** when the documents clearly contain that many distinct facts.\n"
            "- It is OK to add **one short trailing clause** in a bullet (after a comma or em dash) for nuance—"
            "e.g. who votes, which fund pays, or what remains uncertain.\n"
            "- Put extra procedural detail, secondary dates, or background in **read_more** as **2–5** bullets; "
            "use [] only when the context is thin.\n\n"

            "HIGH-SIGNAL PRIORITIES (weave into bullets where relevant):\n"
            "- Who is affected, public effect, cost or budget impact, timeline, controversy or debate, what happens next.\n\n"

            "EMPHASIS (inside bullet strings only):\n"
            "- Wrap the most important phrase in each bullet with double asterisks, like **this**.\n"
            "- In key_numbers, lead with the numeric fact and bold that token (e.g. **125** or **$12.5M**)—"
            "only when that exact figure appears in the Context Documents below.\n\n"

            "ANTI-HALLUCINATION:\n"
            "- Do not reuse any numbers, dollar amounts, dates, or vote scores from this prompt as content. "
            "Every digit or figure in key_numbers must appear verbatim in the Context Documents block.\n\n"

            "LOCALITY:\n"
            "- If ZIP, borough, or neighborhood is known, tie impacts to that area in whos_affected and why_it_matters.\n"
            "- Name agencies or programs when the context supports it.\n\n"

            "CRITICAL OUTPUT RULE:\n"
            "Return ONLY valid JSON. No markdown fences, no commentary, no extra keys.\n\n"

            "JSON FORMAT (all keys required; use [] for empty arrays):\n"
            "{\n"
            '  "tldr": ["One or two short sentences total—plain text, no bullets inside a string."],\n'
            '  "topic_tags": ["2-5 short topic chips, Title Case, e.g. Housing", "Budget"],\n'
            '  "what_happened": ["often 4-6 bullets when context is rich", "..."],\n'
            '  "why_it_matters": ["often 4-6 bullets when context is rich", "..."],\n'
            '  "whos_affected": ["often 4-6 bullets when context is rich", "..."],\n'
            '  "key_numbers": [],\n'
            '  "what_happens_next": ["often 3-5 bullets for deadlines, votes, or implementation steps", "..."],\n'
            '  "read_more": ["2-5 optional bullets for procedure, history, or caveats when useful"],\n'
            '  "at_a_glance": ["same factual bullets as what_happened for backward compatibility"],\n'
            '  "key_takeaways": ["same as why_it_matters"],\n'
            '  "what_this_means": ["same as whos_affected"],\n'
            '  "relevant_actions": ["same as what_happens_next"],\n'
            '  "sources": [\n'
            '    {\n'
            '      "title": "Short official title from context",\n'
            '      "description": "One or two short sentences on why this source matters.",\n'
            '      "url": "https://... official URL copied exactly from context when present; otherwise empty string",\n'
            '      "source_type": "e.g. Report, Hearing, Law — from context or empty string",\n'
            '      "published_date": "ISO or human date from context, or empty string"\n'
            "    }\n"
            "  ]\n"
            "}\n\n"

            "RULES:\n"
            "- tldr: 1–2 strings only; each may include one extra short clause if it sharpens the headline "
            "(keep each string roughly under ~40 words); no jargon.\n"
            "- topic_tags: 2–5 items; 1–3 words each.\n"
            "- Never echo context labels like 'Context 1'.\n"
            "- Do not repeat the same fact in tldr and bullets unless tldr is a true headline summary.\n"
            "- read_more may be [] if nothing extra; do not pad with generic filler.\n"
            "- Prefer fuller sections when the retrieved context is long or detailed; err slightly longer rather than "
            "omitting useful facts the user would expect from the documents.\n"
            "- key_numbers: only strings whose numeric facts appear verbatim in the Context Documents (money with "
            "digits, calendar dates with numerals, vote counts, percentages, headcounts). Use [] if none. "
            "Never use placeholders like $X, XX, **Date**, or invented figures.\n"
            "- Mirror content: at_a_glance must equal what_happened; key_takeaways = why_it_matters; "
            "what_this_means = whos_affected; relevant_actions = what_happens_next (same strings, same order).\n\n"

            "SOURCES:\n"
            "- Use clean titles from context.\n"
            "- description: one or two short sentences on why it matters; no invented facts.\n"
            "- url: MUST be copied exactly from the \"Official URL (from index):\" line in that context block when "
            "present; otherwise use an empty string. Never invent or guess URLs.\n"
            "- source_type and published_date: from the same context block when present; else empty string.\n"
            "- Prefer 3–8 distinct sources when the context supports it; dedupe by URL.\n"
        )

        if self.mock_mode:
            return {
                "tldr": [
                    "The briefing API is in mock mode, so this is sample layout—not live policy text.",
                    "Add GROQ_API_KEY and restart the backend to get real structured briefings.",
                ],
                "topic_tags": ["Mock mode", "Developer", "NYC civic"],
                "what_happened": [
                    "**Structured JSON** is returned when Groq is configured.",
                    "Without a key, you still see this **card-style layout** in the app.",
                ],
                "why_it_matters": [
                    "Developers can verify **UI, spacing, and mobile readability** without burning tokens.",
                    "Residents will see **live** facts pulled from your indexed documents once enabled.",
                ],
                "whos_affected": [
                    "**You (the reader)** see placeholder content until the model runs.",
                    "**Residents** get clearer, shorter civic copy tuned for phones.",
                ],
                "key_numbers": [],
                "what_happens_next": [
                    "Set **GROQ_API_KEY** in backend/.env, then restart **uvicorn**.",
                    "Ask a real NYC policy question from the home search.",
                ],
                "read_more": [
                    "The model is asked for **8th-grade readability**, short sentences, and no bureaucratic tone.",
                    "Sections mirror legacy keys so older clients still parse the payload.",
                ],
                "at_a_glance": [
                    "**Structured JSON** is returned when Groq is configured.",
                    "Without a key, you still see this **card-style layout** in the app.",
                ],
                "key_takeaways": [
                    "Developers can verify **UI, spacing, and mobile readability** without burning tokens.",
                    "Residents will see **live** facts pulled from your indexed documents once enabled.",
                ],
                "what_this_means": [
                    "**You (the reader)** see placeholder content until the model runs.",
                    "**Residents** get clearer, shorter civic copy tuned for phones.",
                ],
                "relevant_actions": [
                    "Set **GROQ_API_KEY** in backend/.env, then restart **uvicorn**.",
                    "Ask a real NYC policy question from the home search.",
                ],
                "sources": [
                    {
                        "title": "Civic Spiegel — developer README (mock)",
                        "description": "Explains mock mode and how to enable live Groq-backed JSON.",
                        "url": "https://github.com/",
                        "source_type": "Documentation",
                        "published_date": "",
                    },
                    {
                        "title": "NYC Open Data — sample portal link (mock)",
                        "description": "Placeholder for how official portal links render in the briefing UI.",
                        "url": "https://opendata.cityofnewyork.us/",
                        "source_type": "Data portal",
                        "published_date": "",
                    },
                ],
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

        # Real Groq call
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}, *turn_messages],
                model="llama-3.1-8b-instant",
                temperature=0.34,
            )
            response_text = chat_completion.choices[0].message.content
            logger.info("LLM raw response length=%s", len(response_text or ""))
            try:
                return json.loads(response_text)
            except Exception:
                return {
                    "error": "Invalid JSON from LLM",
                    "raw": response_text,
                }
        except Exception as e:
            return {
                "error": f"Error connecting to LLM: {str(e)}",
                "raw": "",
            }

    def _generate_plain_markdown(
        self,
        query: str,
        demo_text: str,
        context_text: str,
        messages: Optional[List[Dict[str, str]]] = None,
        session_preamble: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Concise markdown answer; no JSON sections."""
        system_prompt = (
            "You are CivicAnalysis, a concise assistant for New York City civic policy and local government.\n\n"
            f"User profile notes (may be empty). May include borough, income band, housing, age, policy interests, "
            f"and tags such as Student or Veteran:\n{demo_text or '(none)'}\n\n"
            "When notes describe the user's situation (e.g. student, renter, age band), tailor implications and next "
            "steps where relevant; do not invent exact eligibility thresholds or fine-print rules not in the excerpts.\n\n"
            f"Reference excerpts from the document index (may be incomplete):\n{context_text}\n\n"
        )
        if session_preamble and session_preamble.strip():
            system_prompt += f"Session / page context:\n{session_preamble.strip()}\n\n"
        system_prompt += (
            "Use the full conversation below; follow-ups may refer to earlier turns.\n"
            "Answer the latest user message in light of prior context.\n\n"
            "FORMAT (readability):\n"
            "- Use a mix of short paragraphs and bullet lists in markdown—not only one or the other.\n"
            "- Open with one or two brief paragraphs that give the direct answer or framing.\n"
            "- Then use bullets for multiple distinct facts, steps, agencies, options, dates, or examples "
            "(typically 3–8 bullets when there is more than one item worth listing).\n"
            "- If the answer is very short, a single paragraph is fine; if it has several parts, combine paragraphs "
            "and bullets so it scans easily.\n"
            "- Do not use fixed section titles such as 'At a glance', 'Key takeaways', 'What this means', "
            "'Relevant actions', or a separate 'Sources' section.\n"
            "- You may mention a document title naturally in prose when it helps; avoid formal citation blocks.\n\n"
            "RESOURCES AND LINKS:\n"
            "- Never write placeholders such as [website URL], [URL], TBD, or example.com.\n"
            "- Do not paste raw URLs or markdown links in your reply; the app shows official links from the index "
            "separately below your message.\n"
            "- Name agencies, programs, and offices clearly (e.g. NYC HPD, Rent Guidelines Board, 311).\n"
            "- If context is thin, suggest concrete next steps: call 311, contact a council member, or search "
            "NYC.gov using a specific phrase—without fake links.\n"
            "- Ground claims in the excerpts when they apply; if excerpts are thin, give careful NYC-relevant guidance "
            "without meta-apologies about missing data.\n"
            "- Do not output JSON.\n"
        )

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
            return {
                "error": f"Error connecting to LLM: {str(e)}",
                "raw": "",
            }