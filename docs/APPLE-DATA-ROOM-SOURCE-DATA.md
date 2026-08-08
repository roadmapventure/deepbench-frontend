# Apple Channel Intelligence — Data Room Source Data
**Recovered from `APPLE-AGENT-1-v2.md` (user's local copy) after that file was retired during the v5 design session — see `docs/APPLE-AGENT-1-v5-DESIGN.md` for the agent architecture that consumes this data.**
**Data verified at full article depth on June 29 2026. Not one-line summaries — real data with real numbers.**

This is the actual source material for S-APPLE-01b (Data Room seed). Datasets 1–5 are real, sourced, citeable. Dataset 6 is real industry-benchmark data used to ground the synthetic scenarios so they're anchored to real numbers rather than invented. **All 3 GEO briefings and 10 partner scenarios are now fully drafted below (2026-07-01)** — no outlines remain. Pending John's review before the S-APPLE-01b seed session runs.

---

## Dataset 1: Apple GEO Revenue 2023-2025
Source: Apple 10-K via Bullfincher (bullfincher.io/companies/apple/revenue-by-geography)
Type: Sourced | Citeable: YES | Verified: Full page fetched June 29 2026 | `business_category: market_data`

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

Chunking strategy: **S-APPLE-01b seeds this as ONE chunk** (whole dataset — table + key signals), not the original per-region-per-year granularity below, to keep the seed session's scope manageable (~21 total rows instead of ~60+). Finer per-region/per-year chunking is a future refinement if retrieval quality shows the coarser chunk underperforms. Original finer-grained plan, preserved for reference: one chunk per region per year with full metadata tags.

---

## Dataset 2: Smartphone Upgrade Cycles by Country (2009-2026)
Source: SellCell.com / Assurant / CIRP / Counterpoint Research
URL: sellcell.com/blog/how-often-do-people-upgrade-their-phone
Type: Sourced | Citeable: YES | Verified: Full article fetched June 29 2026 | `business_category: market_data`

Global replacement cycle by year: 2013: 2.4 yrs (lowest) · 2018: 3.0 yrs · 2020: 3.6 yrs · 2022: 3.7 yrs (highest) · 2024: 3.5 yrs · 2025: 3.5 yrs · 2026: 3.4 yrs (forecast, AI supercycle shortening cycles)

US replacement cycle (Assurant trade-in data): 2020: 3.16 yrs · 2021: 3.26 yrs · 2022: 3.39 yrs · 2023: 3.46 yrs · 2024: 3.64 yrs · 2025 Q1-Q3: 3.84 yrs — still lengthening

iPhone vs Android (Assurant): iPhone 3.27→3.67 yrs (2020-2024, +0.4) · Android 2.79→3.52 yrs (2020-2024, +0.73) · gap narrowing to 0.15 yrs in 2024

Country-level (Counterpoint Research): Japan 26 months (shortest major market) · Mexico 33% upgrade every 18 months · China 36→33 months (2024→2025) · Western Europe 40→33 months (2020→2025 forecast) · India premium 2.0-2.3 yrs · India mid-range 2.5-3.0 yrs · India entry-level 3.5-5.0 yrs · UK moving toward 3-4 yr lifespans

Why people upgrade (Counterpoint): Battery performance 75% · Screen damage 55% · Staying current 38% · Device no longer works 38% · Price/value 30%

iPhone upgrade by age: 18-24: 32% upgrade in 1-2 yrs · 25-34: 35% upgrade in 2-3 yrs · 55-64: 43% keep 3+ yrs · 65+: 65% keep 3+ yrs

Brand loyalty (SellCell 2026): 83.8% of iPhone users stayed with Apple 5+ years vs only 33.8% of Android users; users who delay upgrading are less likely to switch brands

Chunking strategy: **S-APPLE-01b seeds this as ONE chunk** (whole dataset), same scope-management reasoning as Dataset 1. Original finer-grained plan, preserved for reference: one chunk per country, one for global trend, one for iPhone vs Android, one for upgrade reasons, one for age demographics.

---

## Dataset 3: Emerging Markets Smartphone Growth Q3 2024
Source: KrASIA / 36Kr / Canalys / IDC
URL: kr-asia.com/emerging-markets-and-ai-fuel-a-global-smartphone-rebound
Type: Sourced | Citeable: YES | Verified: Full article fetched June 29 2026 | `business_category: market_data`

Regional shipments Q3 2024 (Canalys): SE Asia 25M units +15% YoY · Latin America 35.1M units +10% YoY · Africa 18.4M units +3% YoY · Middle East (ex-Turkey) 12.2M units +2% YoY

Global smartphone penetration: global avg 68% · North America/China 90%+ · MENA 54% · Sub-Saharan Africa 43%

Latin America economic context: median age 31, ~1/3 population under 20, poverty rate fell 45.4%→29.6% (2002-2018)

Africa market structure: 40%+ of smartphones under $100, another 40% at $100-200, premium tier small but growing

Competitive landscape: Transsion 50% share in Africa (+8% growth Q3'24) · Samsung fell 30% in Africa same period · Transsion 16% of SE Asia (+46% growth) · Transsion #3 globally in first 3 quarters 2024 · Chinese brands winning on localization (cameras for darker skin tones, heat-resistant casings, gaming partnerships)

AI smartphone forecast (IDC): 234M shipped 2024 → 827M forecast 2027, CAGR 100.7% — AI features expected to shorten upgrade cycles in emerging markets

Channel implication for Apple: Indonesia — iPhone 16 series banned, direct channel disruption in SE Asia's largest market · SE Asia — older iPhone models serve as ecosystem entry points · Africa — Apple limited to premium urban segment, Transsion owns volume

Chunking strategy: **S-APPLE-01b seeds this as ONE chunk** (whole dataset), same scope-management reasoning as Dataset 1. Original finer-grained plan, preserved for reference: one chunk per region, one for competitive landscape, one for AI forecast, one for economic context.

---

## Dataset 4: Apple in Emerging Markets
Source: Counterpoint Research, AppleMagazine, Apple Earnings Calls
Type: Sourced | Citeable: YES with attribution | `business_category: market_data`

Key signals: India iPhone shipments +35% in 2024 (Counterpoint) · Apple Q2 FY2025 revenue records in 25+ countries incl. Latin America, Middle East, India, South Asia · Apple global smartphone share 27.7% in 2024 (IDC) · iPhone 17 world best-selling smartphone Q1 2026, 6% global unit sales (Counterpoint) · US iPhone share 59.2% Q1 2026 · Greater China ~23% YoY iPhone growth early 2026 despite broader market declining 4% · SE Asia growth driven by urbanization/middle class expansion, older models as entry points

Chunking strategy: **S-APPLE-01b seeds this as ONE chunk** (whole dataset), same scope-management reasoning as Dataset 1. Original finer-grained plan, preserved for reference: one chunk per market, one for global market share context.

---

## Dataset 5: Apple Authorized Reseller Program Structure
Source: Apple Support pages, Apple Community, published reseller descriptions
Type: Inferred | Citeable: Partially (requirements YES, performance NO) | `business_category: program_structure`

What is public: Apple has 510 stores in 22 countries, resellers critical for 80+ country coverage · requirements: 2+ years in business, $100K min annual purchase commitment, staff certification required · premium reseller tier needs dedicated Apple Shop, Apple-like aesthetics · Apple not accepting new reseller applications as of 2024 · Best Buy is one of few locations with both authorized sales and service outside Apple Stores · Apple sometimes deploys own staff inside partner locations

**What is NOT public — do not allow the agent to claim it knows these:** co-op marketing budget structures/utilization rates, training completion rates by partner type or GEO, NPI compliance scores, partner tier performance metrics, individual partner sell-through data.

Chunking strategy: **S-APPLE-01b seeds this as TWO chunks** — (1) public program requirements + store standards combined, (2) the "what is NOT public" boundary kept as its own dedicated chunk since it directly instructs the Proofreader/Guardrail on what to block and shouldn't get buried inside a longer general chunk.

---

## Dataset 6: Industry Benchmark Data (grounds the synthetic scenarios)
Tag: `data_type: sourced` (industry benchmark, not Apple-specific), `citeable: YES with attribution to the benchmark, NOT to Apple`, `business_category: industry_benchmark`.

This is the answer to "can we find real data instead of making everything up" — yes. Channel partner industry benchmarks are well documented, not Apple-specific, but real and directly applicable. This upgrades the synthetic layer from "fully invented" to "synthesized scenario built on real industry benchmarks."

**Retail Training Completion & Turnover** (WorldMetrics, eduMe, TruRating, DailyPay — verified June 29 2026):
Avg corporate training completion 45% (only 25% fully engage) · retail lowest retention of any sector: 35% · tech companies highest: 65% · small businesses (<10 employees): 50% · companies 500+ employees: 45% · LMS usage +35-40% completion · AI-powered training platforms +50% retention via personalization · only 12% of training content retained after 30 days · emerging markets 25% lower training retention than mature markets (resource constraints) · US retail turnover ~60% annually (BLS) · part-time hourly retail staff 76% turnover (highest) · corporate retail positions 17% turnover (lowest) · best-in-class retailers 30-40% turnover vs 60%+ industry average · new hires ~8 weeks to full training completion · turnover cost per employee ~$4,896 (16% of median salary) · education programs (Starbucks/Chipotle model) → 50-250% longer retention.

*A synthetic scenario describing 40% training completion at a retail partner is roughly industry average (35-45%), not a dramatic outlier. 75%+ is a genuine outperformer.*

**Channel Partner MDF / Co-op Fund Utilization** (The Channel Company, Channel Fusion, Computer Market Research, Partnership KPIs — verified June 29 2026):
Co-op/MDF utilization industry-wide 40-60% typical, below 40% signals an enablement problem · top-performing SaaS/tech vendors 60%+ · ~60% of MDF industry-wide goes unused annually (admin bottlenecks) · manual/spreadsheet fund tracking causes 15-20% fund leakage · claim processing 30-45 days typical in legacy systems, under 45 days well-optimized · manual data entry/claim verification consumes 30%+ of a channel manager's work week · time-to-onboard a new partner 1yr-18mo to full proficiency, 60-90 days standard time-to-first-revenue for SaaS (under 45 days excellent) · partner activation rate (1+ deal within 90 days) above 40% good for early-stage programs, above 60% for mature.

*A scenario describing a carrier partner underutilizing co-op budget should land in the realistic 40-60% range, not an extreme outlier. 95%+ is genuine top-decile.*

---

## SYNTHETIC DATA — FULL DRAFT (S-APPLE-01b)

All entries below: `data_type: synthesized`, `citeable: false`. Each cites the Dataset 6 benchmark it's anchored to. Format locked in S-APPLE-01b-design (2026-07-01): metadata line, 2-3 paragraph narrative, key-data-points table. The table exists so Stress Test's `key_data_points`/`projected_state` output can be grounded in exact figures rather than re-deriving them from prose (see design doc §5.4) — the narrative is still the primary RAG-retrieved content; the table is a precision aid, not a replacement. Partner scenarios carry `partner_id` + `period` tags so a future period (e.g. Q4 for the same partner) can be linked as the same tracked entity — the retrieval/comparison mechanism itself is `FEATURES.md` AA-71 (not yet built); the tag is being seeded now because it's cheap to add at write time and expensive to retrofit.

### GEO Market Briefings (3)

---

**GEO Briefing 1 — Southeast Asia**
`business_category: geo_briefing` · `geo: Southeast Asia` · `program_area: channel-strategy`

Southeast Asia is one of Apple's structurally strongest emerging-market growth stories on unit volume, but the region's channel reality is split by country in a way that a single regional strategy can't address. Regional smartphone shipments ran 25 million units in Q3 2024 alone, up 15% year-over-year (Dataset 3) — comfortably ahead of Africa's +3% and Middle East's +2% over the same quarter — and Apple's broader Rest of Asia Pacific revenue segment (which SE Asia sits inside) grew 9.91% year-over-year in 2025, the highest of any GEO except Japan (Dataset 1). Older iPhone models function as the practical entry point into the ecosystem across most of the region, since Apple's premium pricing puts current-generation devices out of reach for the mass market that Transsion currently owns — Transsion grew 46% year-over-year in SE Asia in Q3 2024 alone and now holds roughly 16% regional share (Dataset 3).

Partner structure varies sharply by country. Indonesia and Thailand are carrier-heavy channel markets, while Vietnam and the Philippines lean monobrand, and Singapore is functionally saturated at 90%+ penetration with little volume upside left to chase. Indonesia carries an added structural complication: the iPhone 16 series is currently banned from direct sale there (Dataset 3), which pushes demand through grey-market and older-model channels rather than Apple's own authorized network — a channel disruption specific to SE Asia's single largest market that doesn't have a clean analog elsewhere in the region. The core channel challenge across all five countries is the same shape even where the specifics differ: winning the premium tier cleanly while Chinese mid-tier brands (Transsion foremost) own the volume tier and are actively moving upmarket.

| Metric | Value | Source |
|---|---|---|
| SE Asia Q3'24 shipments | 25M units, +15% YoY | Dataset 3 (Canalys) |
| Rest of Asia Pacific revenue growth 2025 | +9.91% YoY | Dataset 1 (Apple 10-K) |
| Transsion SE Asia share / growth | ~16% share, +46% YoY | Dataset 3 (Canalys) |
| Singapore smartphone penetration | 90%+ | Dataset 3 (Canalys/IDC) |

---

**GEO Briefing 2 — Latin America**
`business_category: geo_briefing` · `geo: Latin America` · `program_area: channel-strategy`

Latin America shipped 35.1 million smartphone units in Q3 2024, up 10% year-over-year (Dataset 3) — the largest single-quarter volume of any emerging region tracked here — but Apple's channel motion in the region is dominated by one structural fact: installment plans, not list price, are what determine whether a household can buy an iPhone at all. High import tariffs push list prices well above US/European equivalents, and carrier-financed installment plans are the mechanism that makes the premium tier reachable for a middle class that, per the region's economic profile, has a median age of 31 with roughly a third of the population under 20 (Dataset 3) — a demographic that skews toward first-time premium buyers rather than replacement-cycle upgraders.

Brazil is the clear anchor market, carrier-led and large enough to set the regional tone; Mexico moves faster, with roughly a third of its base upgrading within 18 months (Dataset 2) — among the shorter cycles of any emerging market tracked; Colombia and Argentina are considerably more volatile, with channel performance more exposed to currency and macroeconomic swings than to anything Apple or its partners control directly. The consistent regional channel challenge is price sensitivity translating into weak services attach — a customer who stretched to finance the device itself has less room in the monthly budget for Apple's services layer, which shows up as a services-revenue gap relative to unit volume that doesn't fully close even where iPhone share is strong.

| Metric | Value | Source |
|---|---|---|
| LatAm Q3'24 shipments | 35.1M units, +10% YoY | Dataset 3 (Canalys) |
| Regional median age | 31 (~1/3 population under 20) | Dataset 3 |
| Mexico 18-month upgrade rate | ~33% | Dataset 2 (Counterpoint) |
| Poverty rate trend (2002-2018) | 45.4% → 29.6% | Dataset 3 |

---

**GEO Briefing 3 — EMEA Emerging (India, Middle East, Africa)**
`business_category: geo_briefing` · `geo: EMEA Emerging` · `program_area: channel-strategy`

These three markets share a region on the org chart but almost nothing else in channel shape. India is the growth story: iPhone shipments grew 35% in 2024 alone (Dataset 4), and the premium segment there upgrades on a 2.0–2.3 year cycle (Dataset 2) — close to Japan's pace and far faster than India's own mid-range (2.5–3.0 years) or entry-level (3.5–5.0 years) segments, meaning the growth is concentrated in a fast-turning premium sliver sitting on top of a much slower-moving mass market. The Middle East is the inverse profile: high GDP per capita, high existing smartphone penetration, and a channel structure that's almost entirely carrier-led rather than open-market — a mature, stable market rather than a growth one.

Africa is the hardest of the three for Apple's channel to actually reach. Transsion holds roughly 50% share regionally and grew 8% year-over-year in Q3 2024 even as Samsung fell 30% in the same window (Dataset 3) — a competitive gap that's widening, not stabilizing. Smartphone penetration sits at just 43% in Sub-Saharan Africa against a global average of 68% (Dataset 3), and over 80% of the smartphones sold across the continent fall under $200, a price band Apple doesn't compete in at all. Apple's realistic channel footprint in Africa is the premium-urban segment only — the volume market belongs to Transsion and will for the foreseeable future given how far below Apple's price floor the mass-market device tier sits.

| Metric | Value | Source |
|---|---|---|
| India iPhone shipment growth 2024 | +35% | Dataset 4 (Counterpoint) |
| India premium-tier upgrade cycle | 2.0-2.3 years | Dataset 2 (Counterpoint) |
| Transsion Africa share / growth | ~50% share, +8% YoY | Dataset 3 (Canalys) |
| Sub-Saharan Africa smartphone penetration | 43% (vs. 68% global avg) | Dataset 3 |

---

### Partner Performance Scenarios (10)

---

**Scenario 1 — Carrier Partner, SE Asia: NPI Underperformance**
`business_category: partner_scenario` · `geo: Southeast Asia` · `program_area: NPI` · `partner_id: signal-mobile-th-id` · `period: 2025-Q4`

Signal Mobile, a carrier-channel partner operating across Thailand and Indonesia, launched the latest iPhone generation three weeks after Apple's official regional availability date — a meaningful gap in a launch window where early-adopter demand is heavily front-loaded. Store staff across both markets were confirmed untrained on the new installment plan structure introduced alongside this generation at the time of launch, which independently delayed point-of-sale readiness even after inventory had physically arrived at Signal's locations.

The delay lands in a region where Apple's competitive position is already contested — SE Asia shipped 25 million units in Q3 2024 alone, growing 15% year-over-year, with Transsion capturing a disproportionate share of that growth (+46% YoY) by moving fast on mid-tier volume (Dataset 3). A three-week NPI delay in a fast-moving competitive window is a larger opportunity cost here than the same delay would be in a slower, more saturated market. Indonesia's iPhone 16 sales ban compounds Signal's Indonesia-side exposure specifically, since normal launch-window channel motion is already disrupted there independent of anything Signal did or didn't do.

| Metric | Value | Note |
|---|---|---|
| Launch delay | 3 weeks post regional availability | Signal-specific |
| Staff training status at launch | Untrained on new installment structure | Signal-specific |
| SE Asia Q3'24 shipment growth | +15% YoY | Dataset 3 (regional context) |
| Transsion SE Asia growth (same window) | +46% YoY | Dataset 3 (competitive pressure) |

---

**Scenario 2 — Authorized Reseller, Latin America: Training Compliance Gap**
`business_category: partner_scenario` · `geo: Latin America` · `program_area: training` · `partner_id: vitrine-tech-br` · `period: 2025-Q3`

Vitrine Tech, a mid-size authorized reseller operating in Brazil, closed Q3 2025 with 40% completion on Apple's required product-training curriculum for retail staff — a figure that sits squarely inside the 35-45% range Dataset 6 identifies as typical for the retail sector generally, not a dramatic outlier against industry norms even though it's well below Apple's own compliance target.

Two structural factors line up with the industry data rather than pointing to anything unusual at Vitrine specifically. Retail carries the lowest training retention of any sector tracked (35%, against 65% for tech companies generally — Dataset 6), and Vitrine's store-level turnover runs close to the broader US/comparable-market retail benchmark of ~60% annually, with part-time hourly staff turning over at rates as high as 76% industry-wide (Dataset 6). Vitrine's own store managers have flagged, separately, that the training modules are difficult to complete during active shifts — there's no dedicated non-selling time carved out for it — which is consistent with new-hire training normally taking around 8 weeks to reach full completion under normal conditions (Dataset 6), a runway Vitrine's shift-only completion model doesn't realistically accommodate.

| Metric | Value | Note |
|---|---|---|
| Training completion | 40% | Vitrine-specific |
| Retail sector avg completion (industry) | 35-45% | Dataset 6 |
| Retail sector retention (industry) | 35% (vs. 65% tech) | Dataset 6 |
| Part-time hourly turnover (industry) | 76% | Dataset 6 |

---

**Scenario 3 — Large Retailer, EMEA: Co-op Budget Underutilization Q3**
`business_category: partner_scenario` · `geo: EMEA` · `program_area: co-op/MDF` · `partner_id: nordholm-retail-de-nl` · `period: 2025-Q3`

Nordholm Retail Group, a 34-store consumer electronics chain operating across Germany and the Netherlands and one of Apple's larger EMEA authorized resellers, utilized 55% of its allocated Q3 co-op marketing fund. That figure sits within the broad 40–60% range considered typical industry-wide for co-op/MDF utilization, but well short of the 60%+ mark that characterizes a top-performing partner — not a crisis, but a real gap worth understanding before Q4 planning locks in.

Nordholm's claim approval process currently runs about six weeks from submission to fund release, routed through a largely manual, spreadsheet-based tracking system shared between the regional channel manager and Nordholm's own marketing coordinator. Industry data puts typical claim processing at 30–45 days, with sub-45-day turnaround considered well-optimized; Nordholm's ~42-day cycle sits at the outer edge of that band. Manual, non-automated tracking systems of this kind are independently associated with 15–20% fund leakage industry-wide — claims partners are entitled to but never file, discouraged by the friction of the process itself.

Store-level engagement data complicates a simple process-bottleneck story, though. Of Nordholm's 34 locations, 11 filed zero co-op claims in Q3 despite running qualifying in-store promotions documented in their own marketing calendar — those stores' fund usage isn't just slow, it's absent, which a claims-backlog explanation doesn't fully account for. Store manager turnover at Nordholm has been elevated this year, and there's no confirmed record of a claims-eligibility refresher being delivered to newly promoted store staff. Both a workflow bottleneck (slow, manual approval discouraging claims that *are* filed) and an enablement gap (some store staff not knowing co-op funds exist or how to claim them) are independently supported by what's in the record — nothing here resolves which one, or how much of each, is driving the 55% number.

| Metric | Value | Note |
|---|---|---|
| Co-op budget utilization | 55% | vs. 40-60% industry-typical, 60%+ top-performer (Dataset 6) |
| Claim approval cycle | ~42 days (6 weeks) | vs. 30-45 day industry benchmark (Dataset 6) |
| Manual-tracking fund leakage (industry) | 15-20% | Dataset 6 — not Nordholm-specific |
| Stores with zero Q3 claims | 11 of 34 | Despite documented qualifying promotions |

---

**Scenario 4 — Carrier Partner, Japan: High Performance Benchmark**
`business_category: partner_scenario` · `geo: Japan` · `program_area: NPI, training` · `partner_id: nippo-carrier-jp` · `period: 2025-Q3`

Nippo Carrier, operating across Japan, closed Q3 2025 at 95% NPI compliance and 92% training completion — figures well above both the general corporate training-completion average (45%, Dataset 6) and Apple's own internal targets. Nippo embeds full-time Apple Specialist staff directly inside its retail locations rather than relying solely on its own trained employees, which sidesteps retail's structural turnover problem almost entirely: those staff are Apple's own hires, not subject to Nippo's retail-sector attrition at all.

The result lines up with what the regional data would predict for a well-run partner in this specific market. Japan has the shortest upgrade cycle of any major market tracked (26 months, Dataset 2) and was Apple's fastest-growing GEO in 2025 at +14.57% year-over-year (Dataset 1) — a market that rewards a partner who can execute launch windows cleanly and keep the sales floor consistently trained, since the replacement-purchase cadence is faster than almost anywhere else Apple sells. Nippo's approach — embedded specialist staff plus high compliance — is closer to Dataset 6's "education program" model (associated with 50-250% longer staff retention) than to a standard retail training pipeline, and the market conditions it operates in reward exactly that investment.

| Metric | Value | Note |
|---|---|---|
| NPI compliance | 95% | Nippo-specific |
| Training completion | 92% | Nippo-specific |
| Japan upgrade cycle | 26 months (shortest major market) | Dataset 2 |
| Japan 2025 GEO revenue growth | +14.57% YoY (fastest GEO) | Dataset 1 |

---

**Scenario 5 — Monobrand Partner, India: Rapid Expansion**
`business_category: partner_scenario` · `geo: India` · `program_area: staffing/training` · `partner_id: elevate-mobility-in` · `period: 2024-Q1 to 2025-Q2`

Elevate Mobility, a monobrand Apple partner in India, opened 12 new locations over an 18-month window — roughly one new store every six weeks. That pace sits well inside what India's growth numbers would justify commercially: iPhone shipments in India grew 35% in 2024 alone (Dataset 4), and the premium segment Elevate serves upgrades on a 2.0–2.3 year cycle (Dataset 2), among the fastest premium-tier cadences globally. The expansion isn't the problem; the staffing and training pipeline behind it hasn't kept pace with it.

Industry data puts the typical timeline to bring a new partner location to full proficiency at anywhere from 60-90 days for baseline revenue readiness up to 12-18 months for full proficiency (Dataset 6) — a six-week store-opening cadence means Elevate is opening a new location, on average, before the previous one has cleared even the fast end of that onboarding window. New-hire staff typically need around 8 weeks to reach full training completion under normal, non-rushed conditions (Dataset 6); at Elevate's current pace, corporate training and staffing resources are being spread across a growing number of simultaneously-onboarding stores rather than fully closing out one cohort before the next opens.

| Metric | Value | Note |
|---|---|---|
| New locations | 12 in 18 months | ~1 every 6 weeks |
| India iPhone shipment growth 2024 | +35% | Dataset 4 |
| India premium upgrade cycle | 2.0-2.3 years | Dataset 2 |
| Industry onboard-to-proficiency window | 60-90 days (revenue) to 12-18mo (full) | Dataset 6 |

---

**Scenario 6 — Authorized Reseller, Greater China: Post-Decline Repositioning**
`business_category: partner_scenario` · `geo: Greater China` · `program_area: merchandising` · `partner_id: jinhua-digital-cn` · `period: 2025-Q3`

Jinhua Digital, an authorized reseller in Greater China, has visibly shifted its floor merchandising and sales mix toward older iPhone models and accessories over the past two quarters, deprioritizing the newest generation in its promotional placement. The shift tracks the region's broader revenue trajectory: Greater China has been in multi-year decline for Apple overall, down 8% year-over-year in 2023-2024 and a further 3.85% in 2024-2025 (Dataset 1) — the only GEO in continuous decline across both periods.

The regional picture isn't uniformly negative, though, which complicates whether Jinhua's repositioning is the right call. Despite the broader market contracting roughly 4% in early 2026, iPhone specifically grew approximately 23% year-over-year in Greater China over that same window (Dataset 4) — a pocket of iPhone-specific resilience inside an otherwise declining regional trend. If that early-2026 pocket reflects a genuine turn rather than a one-quarter anomaly, Jinhua's shift toward older models and accessories may be optimizing for a market condition that's already starting to reverse, rather than the one still in front of it.

| Metric | Value | Note |
|---|---|---|
| Greater China revenue decline 2023-24 → 2024-25 | -8% → -3.85% | Dataset 1 |
| Greater China iPhone growth, early 2026 | +23% YoY (vs. broader market -4%) | Dataset 4 |
| Jinhua merchandising shift | Toward older models/accessories, last 2 quarters | Jinhua-specific |

---

**Scenario 7 — Carrier Partner, Americas: Upgrade Promotion Success**
`business_category: partner_scenario` · `geo: Americas` · `program_area: promotions` · `partner_id: crest-wireless-us` · `period: 2025-Q3`

Crest Wireless, a US carrier-channel partner, saw a 28% increase in upgrade conversion after retraining point-of-sale staff to lead with trade-in value framing rather than list price or plan terms. The change is a direct response to a market condition the underlying data supports clearly: the US upgrade cycle has been steadily lengthening, reaching 3.84 years across Q1–Q3 2025 (Dataset 2) — customers are holding devices longer than at any point in the tracked history — and Dataset 2's "why people upgrade" breakdown identifies price/value as a factor in roughly 30% of upgrade decisions, a lever trade-in framing speaks to directly rather than a factor like battery degradation (75%) or screen damage (55%) that a promotion can't influence.

Crest's result sits inside a GEO that's already growing steadily — Americas revenue was up 6.77% year-over-year in 2025 (Dataset 1) — but the improvement is specific to Crest's own point-of-sale script change, not a rising-tide effect visible across the full carrier channel; other Crest-comparable partners in the same region and quarter did not show a matching conversion shift.

| Metric | Value | Note |
|---|---|---|
| Upgrade conversion lift | +28% | Crest-specific |
| US upgrade cycle (Q1-Q3 2025) | 3.84 years | Dataset 2 |
| Price/value as upgrade driver (industry) | ~30% of decisions | Dataset 2 |
| Americas 2025 revenue growth | +6.77% YoY | Dataset 1 |

---

**Scenario 8 — Large Retailer, Europe: Digital Shelf Compliance Issue**
`business_category: partner_scenario` · `geo: Europe` · `program_area: merchandising` · `partner_id: meridian-electronics-fr-it` · `period: 2025-Q3`

Meridian Electronics, a large-format retailer operating across France and Italy, is running at 62% digital shelf compliance against Apple's 90% target — meaning over a third of its online product listings have outdated pricing, imagery, or spec content relative to Apple's current catalog. The root cause traced so far is a manual content-management workflow: listing updates require a member of Meridian's e-commerce team to individually edit each SKU rather than pulling from a syndicated feed, a bottleneck structurally similar to the manual-tracking problem Dataset 6 documents in the co-op/MDF context (where non-automated systems are associated with 15-20% leakage) — the specific number doesn't transfer directly to a digital-shelf context, but the underlying mechanism (manual process creating a compliance gap that compounds as catalog size grows) is the same pattern.

The timing carries real weight given the regional trend: Europe's Apple revenue grew 9.58% year-over-year in 2025, the second-fastest GEO acceleration behind Japan (Dataset 1), meaning Meridian's compliance gap is happening in a market where online-shelf accuracy plausibly has more revenue riding on it now than it did a year ago, not less.

| Metric | Value | Note |
|---|---|---|
| Digital shelf compliance | 62% (vs. 90% target) | Meridian-specific |
| Root cause | Manual, non-syndicated CMS updates | Meridian-specific |
| Europe 2025 revenue growth | +9.58% YoY (2nd-fastest GEO) | Dataset 1 |

---

**Scenario 9 — Monobrand Partner, SE Asia: NPI Readiness Strong**
`business_category: partner_scenario` · `geo: Southeast Asia` · `program_area: NPI` · `partner_id: horizon-store-vn` · `period: 2025-Q4`

Horizon Store, a monobrand partner in Vietnam, achieved zero day-one stockouts across its full location network at the latest iPhone generation's launch — a direct contrast to Signal Mobile's three-week launch delay in Thailand/Indonesia (Scenario 1) within the same regional launch window. Horizon's inventory and staffing team began a structured 6-month advance engagement process ahead of the launch date, coordinating allocation forecasts and staff scheduling well outside the normal pre-launch window most partners operate on.

Vietnam sits inside a regional partner-mix pattern where monobrand is already the stronger channel format relative to carrier-led markets like Indonesia and Thailand, and SE Asia overall is growing fast enough (25M units shipped Q3 2024, +15% YoY — Dataset 3) that launch-window execution has an outsized effect on capturing early-adopter share before Transsion's mid-tier alternatives absorb price-sensitive demand that would otherwise wait. Horizon's result is a useful positive counter-example precisely because it's the same region, the same launch window, and a materially different outcome driven by lead time rather than by any difference in underlying market conditions.

| Metric | Value | Note |
|---|---|---|
| Day-one stockouts | Zero, full network | Horizon-specific |
| Advance engagement lead time | 6 months | Horizon-specific |
| SE Asia Q3'24 shipment growth | +15% YoY | Dataset 3 (regional context) |

---

**Scenario 10 — Carrier Partner, Latin America: Installment Plan Activation**
`business_category: partner_scenario` · `geo: Latin America` · `program_area: sales-enablement` · `partner_id: altiplano-movil-mx` · `period: 2025-Q3`

Altiplano Móvil, a carrier partner in Mexico, is seeing only 15% customer awareness of available installment plan options at point of sale — floor staff default to leading conversations with device price and monthly plan terms rather than mentioning installment financing unless a customer asks directly. This matters more in Mexico specifically than it might elsewhere in the region: Mexican customers upgrade on one of the faster cycles tracked regionally, with roughly a third of the base upgrading within 18 months (Dataset 2), a replacement cadence that installment financing directly supports by lowering the effective barrier to each upgrade cycle.

The gap sits inside a regional channel challenge that's already well documented: Latin America's high import tariffs push list prices up regionwide, and installment plans are the primary mechanism that makes premium devices reachable for a price-sensitive, younger-skewing population (median age 31 — Dataset 3). Altiplano's staff-side awareness gap means the region's core affordability lever is going largely unused at the exact point of sale where it would matter most, in a market growing fast enough (Latin America shipped 35.1M units in Q3 2024, +10% YoY — Dataset 3) that the lost conversions are a real, not theoretical, opportunity cost.

| Metric | Value | Note |
|---|---|---|
| Customer awareness of installment plans (POS) | 15% | Altiplano-specific |
| Mexico 18-month upgrade rate | ~33% | Dataset 2 |
| LatAm Q3'24 shipment growth | +10% YoY | Dataset 3 (regional context) |

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
