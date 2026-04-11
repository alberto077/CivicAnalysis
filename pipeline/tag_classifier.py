import spacy
from typing import List, Dict, Any, Set
import re

class TagClassifier:
    """
    Classifies civic documents into policy areas and affected demographics
    using a hybrid of keyword-based rules and spaCy Named Entity Recognition (NER).
    """

    POLICY_KEYWORDS = {
        "Housing": ["housing", "rent", "tenant", "landlord", "eviction", "affordable", "zoning", "buildings", "nycha", "homeless", "rent stabilization", "rent control"],
        "Criminal Justice": ["police", "nypd", "criminal", "policing", "law enforcement", "public safety", "jail", "correction", "bail", "parole", "prison", "district attorney"],
        "Transportation": ["transit", "mta", "subway", "bus", "transportation", "traffic", "street", "bike", "vision zero", "lirr", "metro-north", "thruway"],
        "Budget": ["budget", "funding", "expense", "finance", "fiscal", "tax", "appropriation", "spending", "discretionary", "revenue"],
        "Education": ["school", "education", "doe", "teacher", "student", "curriculum", "university", "cuny", "suny", "regents"],
        "Environment": ["climate", "environment", "sanitation", "energy", "park", "pollution", "sustainability", "waste", "dec", "clean energy"],
        "Health": ["health", "hospital", "medical", "mental health", "public health", "clinic", "disease", "medicaid", "doh"],
        "Immigration": ["immigrant", "immigration", "daca", "asylum", "undocumented", "refugee", "sanctuary"],
        "Labor": ["labor", "employment", "wage", "worker", "union", "job", "workforce", "minimum wage", "unemployment"],
        "Civil Rights": ["civil rights", "equality", "discrimination", "liberties", "protest", "justice", "voting rights"],
    }

    DEMOGRAPHIC_KEYWORDS = {
        "Renters": ["renter", "tenant", "apartment", "lease", "rent stabilized", "rent control"],
        "Homeowners": ["homeowner", "property owner", "mortgage", "property tax", "condo", "co-op"],
        "Low-income": ["low-income", "poverty", "affordable housing", "assistance", "snap", "welfare", "ebt"],
        "Students": ["student", "youth", "child", "teen", "school-age", "college"],
        "Veterans": ["veteran", "military", "armed forces", "service member"],
        "Small Business Owners": ["small business", "entrepreneur", "merchant", "vendor", "commercial tenant"],
        "Seniors": ["senior", "elderly", "aged", "retirement", "pension"],
        "Immigrants": ["immigrant", "daca", "non-citizen", "asylum seeker"],
    }

    JURISDICTION_MAP = {
        "NYC Council": ["council", "city hall", "borough", "mayor", "local law", "nycc", "legistar"],
        "NYS Legislature": ["albany", "senate", "assembly", "governor", "state law", "nys senate", "nys assembly", "legislative", "capitol"],
    }

    _model_cache = {}

    def __init__(self, model: str = "en_core_web_sm"):
        # Singleton pattern: prevent loading the same spaCy model multiple times
        if model not in TagClassifier._model_cache:
            try:
                print(f"Loading spaCy model into memory: {model}...")
                TagClassifier._model_cache[model] = spacy.load(model)
            except Exception as e:
                print(f"Warning: Could not load spaCy model {model}. NER will be disabled. Error: {e}")
                TagClassifier._model_cache[model] = None
        
        self.nlp = TagClassifier._model_cache[model]
        if self.nlp:
            print(f"TagClassifier ready (shared instance) with model: {model}")

    def _keyword_match(self, text: str, keyword_dict: Dict[str, List[str]], threshold: int = 2) -> List[str]:
        """Returns categories where at least 'threshold' keywords match (case-insensitive)."""
        matches = []
        text_lower = text.lower()
        for category, keywords in keyword_dict.items():
            count = 0
            for kw in keywords:
                # Use word boundary to avoid partial matches
                if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                    count += 1
            if count >= threshold or (count >= 1 and len(keywords) < 5): # Lower threshold for smaller lists
                matches.append(category)
        return matches

    def classify(self, title: str, content: str) -> Dict[str, Any]:
        """
        Runs the full classification pipeline on a document.
        Returns a dictionary suitable for the 'metadata_tags' field in PolicyDocument.
        """
        combined_text = f"{title}\n\n{content}"
        
        # 1. Keyword classification
        policy_areas = self._keyword_match(combined_text, self.POLICY_KEYWORDS, threshold=2)
        affected_demographics = self._keyword_match(combined_text, self.DEMOGRAPHIC_KEYWORDS, threshold=1)
        jurisdictions = self._keyword_match(combined_text, self.JURISDICTION_MAP, threshold=1)

        # 2. spaCy NER Extraction
        entities = {"politicians": set(), "agencies": set(), "locations": set()}
        if self.nlp:
            doc = self.nlp(combined_text[:10000]) # Limit text for performance
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    entities["politicians"].add(ent.text)
                elif ent.label_ == "ORG":
                    # Filter for government-like agencies
                    if any(kw in ent.text.lower() for kw in ["dept", "department", "office", "agency", "council", "board"]):
                        entities["agencies"].add(ent.text)
                elif ent.label_ in ["GPE", "LOC"]:
                    entities["locations"].add(ent.text)

        # 3. Policy Stage Detection
        policy_stage = "News/General"
        text_lower = combined_text.lower()
        if any(kw in text_lower for kw in ["voted", "passed", "approved", "adopted"]):
            policy_stage = "Voted/Passed"
        elif any(kw in text_lower for kw in ["introduced", "proposed", "tabled"]):
            policy_stage = "Introduced/Proposed"
        elif any(kw in text_lower for kw in ["hearing", "committee", "testimony"]):
            policy_stage = "Hearing/Committee"
        elif "budget" in text_lower:
            policy_stage = "Budget Negotiation"

        return {
            "policy_areas": list(set(policy_areas)),
            "affected_demographics": list(set(affected_demographics)),
            "jurisdiction_level": jurisdictions[0] if jurisdictions else "Mixed/Unknown",
            "policy_stage": policy_stage,
            "entities": {k: list(v) for k, v in entities.items()}
        }

    def is_high_signal(self, text: str) -> bool:
        """
        Determines if a chunk of text is worth storing or if it's 'procedural junk'.
        A chunk is high signal if it matches at least one policy/demographic keyword,
        or contains a politician's name.
        """

        """
        Semantic relevance check — NOT called at ingest time.
        
        Kept here for potential use as a query-time re-ranker: after pgvector
        returns the top-k chunks for a user query, this method could filter
        out chunks without policy/demographic keyword matches or named entities.
        
        Removed from the ingest path (base_scraper.py) because:
        1. It dropped legitimate content that didn't use specific policy vocabulary
        2. Its spaCy NER fallback failed silently when en_core_web_sm wasn't loaded
        3. Semantic filtering belongs after retrieval, not before storage
        
        Ingest-time junk detection now lives in base_scraper.is_junk_content,
        which only drops empty strings and placeholder sentinels.
        """
        text_lower = text.lower()
        
        # 1. Ignore common procedural/housekeeping phrases
        junk_phrases = ["roll call", "adjourn", "meeting called to order", "minutes of the meeting", "housekeeping"]
        if any(junk in text_lower for junk in junk_phrases) and len(text_lower) < 200:
            return False

        # 2. Check for policy/demographic signal
        for categories in [self.POLICY_KEYWORDS, self.DEMOGRAPHIC_KEYWORDS]:
            for keywords in categories.values():
                if any(re.search(rf"\b{re.escape(kw)}\b", text_lower) for kw in keywords):
                    return True
        
        # 3. Check for specific named entities (politicians/agencies)
        if self.nlp:
            doc = self.nlp(text[:2000])
            if any(ent.label_ in ["PERSON", "ORG"] for ent in doc.ents):
                return True
                
        return False

if __name__ == "__main__":
    classifier = TagClassifier()
    sample_title = "NYC Council passes new rent stabilization bill"
    sample_content = "The council today voted 45-2 to pass a bill protecting tenants from illegal evictions. Council Member Keith Powers championed the bill."
    tags = classifier.classify(sample_title, sample_content)
    import json
    print(json.dumps(tags, indent=2))
