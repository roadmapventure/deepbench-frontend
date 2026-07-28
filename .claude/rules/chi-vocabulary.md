---
paths:
  - src/screens/MarketIntelligenceScreen.jsx
---
# CHI vocabulary & step numbering

Never title a drawer from `INTENT_LABEL`/intent — Candidates/Result are fixed
"Theories"/"Theory Result" (`CHI-49` overturned 2026-07-28). Never use
"hypothesis", "thesis", or "candidate" in user-facing copy — the object is a
"Theory"; "Forecast" names an *object* only at/after the Create Forecast act
(the breadcrumb's stage label and the Create Forecast control are exempt —
they name the map/act, not the object). Never hand
control back to the user in chat without naming exactly one step — number +
name together, matching the drawer's chip; never a bare number or bare name.
Step numbers come only from arrival order within the active journey — never
from a hardcoded path map; ambient drawers (News at rest) stay unnumbered.

Rationale: `docs/ARCHITECTURE.md` §19n; taxonomy history: `STYLE-GUIDE.md` §40.
