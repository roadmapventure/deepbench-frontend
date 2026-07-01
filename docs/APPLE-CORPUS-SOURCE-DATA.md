# Apple Channel Intelligence — Corpus Source Data
**Recovered from `APPLE-AGENT-1-v2.md` (user's local copy) after that file was retired during the v5 design session — see `docs/APPLE-AGENT-1-v5-DESIGN.md` for the agent architecture that consumes this data.**
**Data verified at full article depth on June 29 2026. Not one-line summaries — real data with real numbers.**

This is the actual source material for S-APPLE-01b (corpus seed). Datasets 1–5 are real, sourced, citeable. Dataset 6 is real industry-benchmark data used to ground the synthetic scenarios so they're anchored to real numbers rather than invented — see "How to use this dataset" below.

---

## Dataset 1: Apple GEO Revenue 2023-2025
Source: Apple 10-K via Bullfincher (bullfincher.io/companies/apple/revenue-by-geography)
Type: Sourced | Citeable: YES | Verified: Full page fetched June 29 2026

Three-year table:

| Region | 2023 | 2024 | 2025 | YoY 24-25 |
|---|---|---|---|---|
| Americas | $162.56B 42% | $167.05B 43% | $178.35B 43% | +6.77% |
| Europe | $94.29B 25% | $101.33B 26% | $111.03B 27% | +9.58% |
| Greater China | $72.56B 19% | $66.95B 17% | $64.38B 15% | -3.85% |
| Japan | $24.26B 6% | $25.05B 6% | $28.70B 7% | +14.57% |
| Rest of Asia Pac | $29.62B 8% | $30.66B 8% | $33.70B 8% | +9.91% |
| Total | $383.29B | $391.04B | $416.16B | +6.43% |

Key signals for agent reasoning:
- Greater China in multi-year decline: -8% in 2023-2024, -3.85% in 2024-2025
- Japan fastest growing GEO in 2025 (+14.57%) despite smallest upgrade cycle globally (26 months)
- Rest of Asia Pacific growing +9.91% from smallest base — highest upside potential
- Europe accelerating (+9.58%) — mature market but growing channel investment

Chunking strategy: One chunk per region per year with full metadata tags.

---

## Dataset 2: Smartphone Upgrade Cycles by Country (2009-2026)
Source: SellCell.com / Assurant / CIRP / Counterpoint Research
URL: sellcell.com/blog/how-often-do-people-upgrade-their-phone
Type: Sourced | Citeable: YES | Verified: Full article fetched June 29 2026

Global replacement cycle by year: 2013: 2.4 yrs (lowest) · 2018: 3.0 yrs · 2020: 3.6 yrs · 2022: 3.7 yrs (highest) · 2024: 3.5 yrs · 2025: 3.5 yrs · 2026: 3.4 yrs (forecast, AI supercycle shortening cycles)

US replacement cycle (Assurant trade-in data): 2020: 3.16 yrs · 2021: 3.26 yrs · 2022: 3.39 yrs · 2023: 3.46 yrs · 2024: 3.64 yrs · 2025 Q1-Q3: 3.84 yrs — still lengthening

iPhone vs Android (Assurant): iPhone 3.27→3.67 yrs (2020-2024, +0.4) · Android 2.79→3.52 yrs (2020-2024, +0.73) · gap narrowing to 0.15 yrs in 2024

Country-level (Counterpoint Research): Japan 26 months (shortest major market) · Mexico 33% upgrade every 18 months · China 36→33 months (2024→2025) · Western Europe 40→33 months (2020→2025 forecast) · India premium 2.0-2.3 yrs · India mid-range 2.5-3.0 yrs · India entry-level 3.5-5.0 yrs · UK moving toward 3-4 yr lifespans

Why people upgrade (Counterpoint): Battery performance 75% · Screen damage 55% · Staying current 38% · Device no longer works 38% · Price/value 30%

iPhone upgrade by age: 18-24: 32% upgrade in 1-2 yrs · 25-34: 35% upgrade in 2-3 yrs · 55-64: 43% keep 3+ yrs · 65+: 65% keep 3+ yrs

Brand loyalty (SellCell 2026): 83.8% of iPhone users stayed with Apple 5+ years vs only 33.8% of Android users; users who delay upgrading are less likely to switch brands

Chunking strategy: one chunk per country, one for global trend, one for iPhone vs Android, one for upgrade reasons, one for age demographics.

---

## Dataset 3: Emerging Markets Smartphone Growth Q3 2024
Source: KrASIA / 36Kr / Canalys / IDC
URL: kr-asia.com/emerging-markets-and-ai-fuel-a-global-smartphone-rebound
Type: Sourced | Citeable: YES | Verified: Full article fetched June 29 2026

Regional shipments Q3 2024 (Canalys): SE Asia 25M units +15% YoY · Latin America 35.1M units +10% YoY · Africa 18.4M units +3% YoY · Middle East (ex-Turkey) 12.2M units +2% YoY

Global smartphone penetration: global avg 68% · North America/China 90%+ · MENA 54% · Sub-Saharan Africa 43%

Latin America economic context: median age 31, ~1/3 population under 20, poverty rate fell 45.4%→29.6% (2002-2018)

Africa market structure: 40%+ of smartphones under $100, another 40% at $100-200, premium tier small but growing

Competitive landscape: Transsion 50% share in Africa (+8% growth Q3'24) · Samsung fell 30% in Africa same period · Transsion 16% of SE Asia (+46% growth) · Transsion #3 globally in first 3 quarters 2024 · Chinese brands winning on localization (cameras for darker skin tones, heat-resistant casings, gaming partnerships)

AI smartphone forecast (IDC): 234M shipped 2024 → 827M forecast 2027, CAGR 100.7% — AI features expected to shorten upgrade cycles in emerging markets

Channel implication for Apple: Indonesia — iPhone 16 series banned, direct channel disruption in SE Asia's largest market · SE Asia — older iPhone models serve as ecosystem entry points · Africa — Apple limited to premium urban segment, Transsion owns volume

Chunking strategy: one chunk per region, one for competitive landscape, one for AI forecast, one for economic context.

---

## Dataset 4: Apple in Emerging Markets
Source: Counterpoint Research, AppleMagazine, Apple Earnings Calls
Type: Sourced | Citeable: YES with attribution

Key signals: India iPhone shipments +35% in 2024 (Counterpoint) · Apple Q2 FY2025 revenue records in 25+ countries incl. Latin America, Middle East, India, South Asia · Apple global smartphone share 27.7% in 2024 (IDC) · iPhone 17 world best-selling smartphone Q1 2026, 6% global unit sales (Counterpoint) · US iPhone share 59.2% Q1 2026 · Greater China ~23% YoY iPhone growth early 2026 despite broader market declining 4% · SE Asia growth driven by urbanization/middle class expansion, older models as entry points

Chunking strategy: one chunk per market, one for global market share context.

---

## Dataset 5: Apple Authorized Reseller Program Structure
Source: Apple Support pages, Apple Community, published reseller descriptions
Type: Inferred | Citeable: Partially (requirements YES, performance NO)

What is public: Apple has 510 stores in 22 countries, resellers critical for 80+ country coverage · requirements: 2+ years in business, $100K min annual purchase commitment, staff certification required · premium reseller tier needs dedicated Apple Shop, Apple-like aesthetics · Apple not accepting new reseller applications as of 2024 · Best Buy is one of few locations with both authorized sales and service outside Apple Stores · Apple sometimes deploys own staff inside partner locations

**What is NOT public — do not allow the agent to claim it knows these:** co-op marketing budget structures/utilization rates, training completion rates by partner type or GEO, NPI compliance scores, partner tier performance metrics, individual partner sell-through data.

Chunking strategy: one chunk for program requirements, one for store standards, one explicitly documenting what data does not exist publicly (instructs the Proofreader/Guardrail on what to block).

---

## Dataset 6: Industry Benchmark Data (grounds the synthetic scenarios)
Tag: `data_type: sourced` (industry benchmark, not Apple-specific), `citeable: YES with attribution to the benchmark, NOT to Apple`.

This is the answer to "can we find real data instead of making everything up" — yes. Channel partner industry benchmarks are well documented, not Apple-specific, but real and directly applicable. This upgrades the synthetic layer from "fully invented" to "synthesized scenario built on real industry benchmarks."

**Retail Training Completion & Turnover** (WorldMetrics, eduMe, TruRating, DailyPay — verified June 29 2026):
Avg corporate training completion 45% (only 25% fully engage) · retail lowest retention of any sector: 35% · tech companies highest: 65% · small businesses (<10 employees): 50% · companies 500+ employees: 45% · LMS usage +35-40% completion · AI-powered training platforms +50% retention via personalization · only 12% of training content retained after 30 days · emerging markets 25% lower training retention than mature markets (resource constraints) · US retail turnover ~60% annually (BLS) · part-time hourly retail staff 76% turnover (highest) · corporate retail positions 17% turnover (lowest) · best-in-class retailers 30-40% turnover vs 60%+ industry average · new hires ~8 weeks to full training completion · turnover cost per employee ~$4,896 (16% of median salary) · education programs (Starbucks/Chipotle model) → 50-250% longer retention.

*A synthetic scenario describing 40% training completion at a retail partner is roughly industry average (35-45%), not a dramatic outlier. 75%+ is a genuine outperformer.*

**Channel Partner MDF / Co-op Fund Utilization** (The Channel Company, Channel Fusion, Computer Market Research, Partnership KPIs — verified June 29 2026):
Co-op/MDF utilization industry-wide 40-60% typical, below 40% signals an enablement problem · top-performing SaaS/tech vendors 60%+ · ~60% of MDF industry-wide goes unused annually (admin bottlenecks) · manual/spreadsheet fund tracking causes 15-20% fund leakage · claim processing 30-45 days typical in legacy systems, under 45 days well-optimized · manual data entry/claim verification consumes 30%+ of a channel manager's work week · time-to-onboard a new partner 1yr-18mo to full proficiency, 60-90 days standard time-to-first-revenue for SaaS (under 45 days excellent) · partner activation rate (1+ deal within 90 days) above 40% good for early-stage programs, above 60% for mature.

*A scenario describing a carrier partner underutilizing co-op budget should land in the realistic 40-60% range, not an extreme outlier. 95%+ is genuine top-decile.*

---

## SYNTHETIC DATA TO WRITE FOR S-APPLE-01b

These are **outlines**, not finished prose — full 2-3 paragraph narratives still need drafting (recommend a Claude.ai chat session, per the existing S-APPLE-01b plan). Tag all: `data_type: synthesized, citeable: false`. Each must explicitly cite the Dataset 6 benchmark it's anchored to.

### GEO Market Briefings (3 — outline only)
1. **Southeast Asia** — iPhone market position (older models as entry points, Indonesia ban impact) · partner mix (carrier-heavy Indonesia/Thailand, monobrand-strong Vietnam/Philippines, saturated Singapore) · key challenge (Chinese brand mid-tier competition, premium-only win)
2. **Latin America** — iPhone market (Brazil largest, installment plans critical, high import tariffs) · key markets (Brazil carrier-led, Mexico fast cycle, Colombia/Argentina volatility) · channel challenge (price sensitivity, low services attach)
3. **EMEA Emerging (India, Middle East, Africa)** — India (fastest growing, +35% 2024, 2-2.3yr premium cycle) · Middle East (high GDP, high penetration, carrier-led) · Africa (Transsion dominates volume, Apple premium-urban only)

### Partner Performance Scenarios (10 — outline only, numbered as originally scoped)
1. Carrier Partner, SE Asia — NPI Underperformance: launched 3 weeks late, staff untrained on new installment plan structure
2. Authorized Reseller, Latin America — Training Compliance Gap: 40% completion (in line with 35-45% retail average), high turnover + hard-to-complete-during-shift training
3. Large Retailer, EMEA — Co-op Budget Underutilization Q3: 55% utilization (near the 40% enablement-problem threshold), 6-week internal approval process (consistent with 30-45 day claim processing norm)
4. Carrier Partner, Japan — High Performance Benchmark: 95% NPI compliance, 92% training completion, embedded Apple Specialist staff avoiding retail turnover entirely
5. Monobrand Partner, India — Rapid Expansion: 12 new locations/18mo outpacing staffing/training capacity
6. Authorized Reseller, Greater China — Post-Decline Repositioning: shifting to older models/accessories as revenue declines
7. Carrier Partner, Americas — Upgrade Promotion Success: +28% conversion from POS trade-in value communication
8. Large Retailer, Europe — Digital Shelf Compliance Issue: 62% vs 90% target, manual CMS update bottleneck
9. Monobrand Partner, SE Asia — NPI Readiness Strong: zero day-one stockout via 6-month advance engagement program
10. Carrier Partner, Latin America — Installment Plan Activation: only 15% customer awareness at POS, staff lead with price not payment

---

## QUESTION BANK — candidates for on-load example questions

### Questions the agent handles well (clean sourced answers)
1. Which GEO markets have the highest iPhone upgrade opportunity in the next 12 months?
2. Why is Greater China in a multi-year revenue decline and what does that mean for channel strategy?
3. Japan is Apple's fastest-growing GEO in 2025 — what is driving that?
4. Where in Southeast Asia is Apple winning and where is it losing?
5. What is the competitive threat from Transsion in emerging markets?
6. How does Japan's 26-month upgrade cycle compare to the global average?
7. Which market segment in India upgrades most frequently and why does that matter for Apple's channel?
8. What is causing iPhone users globally to hold devices longer?
9. How is Apple Intelligence expected to affect upgrade cycles in 2026?
10. Compare upgrade cycle behavior in Brazil vs Japan — what channel motion does each suggest?
11. Given Southeast Asia's upgrade cycle data and Apple's Rest of Asia Pacific revenue trend, where should we prioritize channel investment? *(true cross-reference: pulls sourced market data across two datasets)*
12. Which markets have both high upgrade potential AND growing Apple revenue? Rank them.
13. Where is there a gap between smartphone penetration growth and Apple revenue growth? What does that gap mean?
14. Give me a 3-paragraph channel briefing on Latin America.
15. What do I need to know about the India market before a partner meeting?

### Questions that trigger needs_review (synthesized data presented as a recommendation — the HITL/Reasoner moment)
- Map directly to the 10 partner scenarios above, e.g.: "Why is the Thailand carrier partner underperforming on co-op utilization this quarter?" (original v4 example) or "Why is [EMEA retailer]'s co-op budget utilization stuck around 55% this quarter?" (scenario 3)

### Questions that expose the gap (graceful failure — proves guardrails are real)
16. How is our authorized reseller network performing in Vietnam? → *expected: "I do not have partner-level performance data..."*
17. Which carrier partners are underutilizing their co-op budgets this quarter? → *expected: "Co-op utilization data is internal and not in my knowledge base..."*
18. What is blocking NPI compliance in Latin America for our top 10 partners? → *expected: "I do not have NPI compliance data..."*
