# Domain Nuances: NYC & NYS Politics

When building a civic tech platform like Civic Spiegel, naive data mapping (e.g., "They supported housing in their campaign, but voted Nay on the housing bill, therefore they are a hypocrite") is incredibly dangerous and often factually incorrect. 

This document outlines the real-world nuances of New York City (NYC Council) and New York State (NYS Assembly/Senate) politics. Understanding these nuances is critical for designing an MVP that treats politicians fairly and provides accurate context to users. This document is required reading for the Data/ML team before building any scraper or classification model.

---

## The Bodies of Government in Scope

### NYC Council
- 51 elected Council Members, each representing one of 51 districts across the 5 boroughs.
- Led by the **Speaker** (elected by the members), who controls the legislative agenda — which bills get heard, which committees exist, which budgets are passed.
- The Council's primary powers: passing local laws, approving the NYC budget (~$115B+/year), and oversight of city agencies.
- **Key committees** relevant to our MVP: Land Use, Finance, Housing & Buildings, Criminal Justice, Education, Health, Transportation, Environment, Immigration.

### NYS Legislature (State Level)
- **NYS Assembly** — 150 members. The Assembly Majority Leader (typically from NYC) controls the Assembly agenda.
- **NYS Senate** — 63 members. Led by the Majority Leader.
- Albany (the state capital) decides issues that affect all New Yorkers: rent regulations, education funding, criminal justice law, environmental standards, transit funding (MTA).
- The Governor is a co-equal branch — bills require the Governor's signature to become law.

### The Relationship Between City and State
This is a critical nuance for the app: many issues that NYC residents *think* are city decisions are actually **state law**.
- **Rent regulations** (rent stabilization, rent control) are governed by the NYS Housing Stability and Tenant Protection Act — passed in Albany, not City Hall.
- **NYPD reform**, **bail laws**, **eviction moratoria** — all state-level.
- The NYC Council can pass *local* laws only within its jurisdiction, but Albany can override or preempt them.
- For our app: a user asking "why is rent so high?" may need context about both NYC Housing Court and the NYS rent law, not just a City Council vote.

---

## Key Nuances for Data Modeling & ML

### 1. The "Package" or "Omnibus" Vote Dilemma
In both the City Council and the State Legislature, major decisions (especially the annual budget) are bundled into massive "package" or omnibus bills. This means hundreds of disparate policies are voted on via a single "Yea" or "Nay".

**Example:** The NYC budget might include $1 Billion for public schools (which a progressive member strongly supports) *and* a $200 Million increase for the NYPD (which that same member vehemently opposes).

- If the member votes "Yea" to secure school funding, a naive system will falsely register that they "supported raising the NYPD budget." If they vote "Nay" to protest the NYPD increase, the system falsely registers that they "voted to defund public schools."

> **MVP Design Impact:** Our `VoteRecord` table can store the raw vote, but the app **must not surface raw votes as the primary truth**. The LLM must use statement transcripts and news context (from `DocumentChunk`) to explain *why* a vote was cast.


### 2. Committee Votes vs. Floor Votes
By the time a bill reaches the final "Floor Vote," its passing is almost always a foregone conclusion. The Speaker rarely brings a bill to the floor without already having the votes.

The *actual* political battles happen during **Committee Hearings** — where members debate, amend, and fight over legislation. If a bill dies, it dies in committee and never gets a floor vote. A member's true stance is often revealed by whether they actively championed it in committee, testified, or silently let it die.

> **MVP Design Impact:** Floor vote data (`Yea/Nay`) is far less valuable than **Hearing Transcripts**. Our pipeline's primary scraping target should be meeting minutes and hearing transcripts (Legistar provides these). The LLM can then tell users what the politician *actually said* when debating the bill.


### 3. Primary Sponsor vs. Co-Sponsor
- **Primary Sponsor:** Wrote or introduced the bill; they are the champion. This is a very strong signal.
- **Co-Sponsor:** Supports the bill. Politicians often sign on late to get their name on popular legislation. Less meaningful as a solo signal.
- **Late co-sponsorships** right before a bill passes are particularly common and should NOT be treated as equal to early advocacy or primary sponsorship.

> **MVP Design Impact:** The `PolicyDocument.metadata_tags` field should capture sponsorship role if this data is available. Filtering UIs should let users see "Bills *introduced* by X" separately from "Bills *co-signed* by X."


### 4. Discretionary Funding ("Member Items")
Every NYC Council member receives discretionary funds (typically millions per year) allocated to local nonprofits, parks, and schools in their district. These allocations are **public record** via the NYC Checkbook and Council budget documents.

A member who *talks* about arts and culture but allocates 90% of their discretionary budget to policing-adjacent programs is revealing something meaningful about their real priorities.

> **MVP Design Impact:** Scraping discretionary funding allocations could be a high-value data source for the "alignment score" feature on Politician Cards — it is much harder to spin than a roll-call vote.


### 5. The Mayoral Veto & Veto Overrides
The NYC Mayor can veto any City Council bill. The Council can override a veto with a 2/3 vote (34 of 51 members). This matters for our data because:
- A bill that "passed" but was vetoed may never become law.
- A veto override is a significant political event — it means the Council is explicitly defying the Mayor.

> **MVP Design Impact:** `LegislationEvent.status` should capture the full legislative lifecycle: Introduced → Committee → Voted → Mayoral Review → Signed/Vetoed → (Override?).


### 6. Land Use & ULURP
The **Uniform Land Use Review Procedure (ULURP)** governs all major zoning changes in NYC. It involves the Community Board, the Borough President, the City Planning Commission, and ultimately the City Council.

ULURP decisions have enormous local impact — they determine whether a neighborhood gets a new shelter, a rezoning for luxury condos, or a new park. They are extremely localized (district-level), making them highly relevant to users filtered by borough or neighborhood.

> **MVP Design Impact:** ULURP filings are a high-value scraping target for users who filter by location. The NYC City Planning Commission publishes ULURP records publicly.


### 7. The NYC Budget Process (Annual Cycle)
Understanding the budget cycle helps us understand *when* data matters most:
- **January:** Mayor releases Preliminary Budget.
- **March–April:** City Council holds budget hearings by committee (high-value transcript data).
- **May:** Mayor releases Executive Budget.
- **June:** Negotiation and adoption deadline (June 30). Omnibus votes happen here.

> **MVP Design Impact:** Our cron scraping schedule should increase frequency in March–June to capture peak civic activity.


### 8. Community Boards
NYC has 59 Community Boards (approximately one per neighborhood cluster). They are **advisory only** — their votes do not bind the Council — but they are meaningful:
- They represent the most hyper-local political voice available.
- Their votes on land use and local issues often predict Council members' final positions.
- Meeting minutes are publicly available.

> **MVP Design Impact:** Community Board minutes are a relatively untapped data source that directly serves users filtered by neighborhood. Strong signal for the Dashboard's location filter.

---

## Key Policy Areas by Demographic Impact

This maps our Q5 ("issues that matter to you") answers to the NYC legislative bodies most relevant to each:

| Issue | Primary Body | Key Data Sources |
|-------|-------------|-----------------|
| Housing / Rent | NYS Legislature + NYC Council | Legistar, NYS Senate/Assembly legislation |
| Education | NYC Council (budget) + NYS (law) | Legistar budget hearings, NYSED |
| Criminal Justice / Policing | NYS Legislature + NYC Council (budget, oversight) | Legistar, Albany legislative records |
| Transportation / MTA | NYS Legislature (MTA is state authority) | MTA board minutes, Albany bills |
| Immigration | Federal (primary) + NYS / NYC policies | NYC Mayor's Office communications |
| Environment | NYS DEC + NYC DSNY/DEP + Council | Legistar, DEC public records |
| Healthcare | NYS DOH (primary) + NYC DOHMH | NYS regulations, Council oversight |
| Taxation | NYS Legislature (income/property) + City (property) | Albany records, NYC Finance |
| Labor / Employment | NYS (wage laws) + NYC Council (local workers) | Legistar, Albany |
| Immigration | NYS + NYC policies | Mayor's Office, City Council resolutions |

---

### 9. NYS Senate Biennial Cycle (API Nuance)
The New York State Legislature operates on a **biennial (two-year) cycle**. This is a major technical hurdle for data ingestion:
- **Session Year Logic:** To retrieve data for 2024, you must query the session start year (2023). Requesting an even year directly via the Open Legislation API often results in `400 Bad Request` or incomplete results.
- **Backfill Strategy:** Historical backfills must loop through odd years (2021, 2023, 2025) to capture the full legislative context of those sessions.

---

## Technical Scalability Nuances

### High-Density Signal Recovery
Capturing 8-10 years of civic history in a limited-storage environment (like Neon Free Tier) requires a shift from "Scrape Everything" to **"Signal Recovery"**:
- **Verbatim RAG Fidelity:** We preserve original source text instead of summarizing, because LLM summaries degrade cosine similarity matches. Batching (n=32) prevents processing crashes on huge transcripts.
- **Fail-Open Noise Filtering:** Rather than aggressive spaCy keyword matching which drops legitimate context, we utilize a narrow `is_junk_content` filter to only discard explicit placeholders or blank files.
- **Semantic Precision Targeting:** Standard 384-dimensional vectors are used to ensure the highest semantic match capability.

---

## Conclusion for the MVP

Users aren't coming to Civic Spiegel just to see a spreadsheet of "Yeas" and "Nays" — they can get that on the official government website. They come to **understand the context**.

Because of these nuances, our primary technical priority in the Data Pipeline should not be parsing roll-call votes cleanly. It should be **scraping the text of hearing transcripts, committee minutes, public statements, and news**. The RAG/LLM pipeline is uniquely suited to synthesize this text and tell the user the *real* story — sparing politicians from unfair "hypocrite" labels and empowering users with actual political intelligence.

The most important data quality principle for this app: **a roll-call vote without context is noise. A transcript with context is signal.**
