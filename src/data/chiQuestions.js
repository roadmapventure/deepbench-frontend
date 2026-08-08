// DeepBench v7.0.0 | chiQuestions.js | LAV-1a -- the 23 CHI example questions, single source (was three module-level consts in MarketIntelligenceScreen.jsx)
// FEATURE: LAV-1a

// FEATURE: CHI-30 — static seed question, always slot 2, never rotates.
export const STATIC_QUESTION = { id: "library-catalog", label: "What data is in the library and how can i use it?" };

// FEATURE: CHI-30 (split size patched by CHI-32) — 10-question rotation pool (today's confirmed
// positions 1, 3-11). On every empty-state render, 2 of these fill visible slots 1, 3; the other 8
// lead the drawer. Order here is the "default" order used verbatim (via splitRotation(pool, identity))
// before the splash has ever been dismissed this tab session.
export const ROTATING_POOL = [
  { id: "japan-geo",          label: "Japan is Apple's fastest-growing GEO in 2025 — what is driving that?" },
  { id: "crest-wireless",      label: "What made Crest Wireless's recent upgrade promotion successful, and can we replicate it with other US partners?" },
  { id: "geo-revenue",         label: "How has our GEO revenue trended from 2023 to 2025, and which regions are growing fastest?" },
  { id: "reseller-reqs",       label: "What are the public requirements for a partner to become an Apple Authorized Reseller?" },
  { id: "upgrade-cycles",      label: "How do smartphone upgrade cycles vary by country, and what does that mean for our channel replenishment planning?" },
  { id: "at-risk-accounts",    label: "Across all our channel partners globally, which ones are the biggest at-risk accounts this quarter, and why?" },
  { id: "horizon-store",       label: "Why is Horizon Store in Vietnam so much more ready for our new product introduction than Signal Mobile in Thailand and Indonesia?" },
  { id: "vitrine-tech",        label: "What's the training compliance gap at Vitrine Tech in Brazil, and what's the risk to their certification?" },
  { id: "smartphone-growth",   label: "What is the smartphone growth trajectory in emerging markets, and how should that shape our channel investment?" },
  { id: "coop-mdf-benchmark",  label: "How does our co-op/MDF utilization compare to industry benchmarks?" },
];

// FEATURE: CHI-30 — fixed drawer tail (today's confirmed positions 12-23). Never rotates, never
// reorders — always the last 12 questions in the drawer beneath whichever 8 pool leftovers lead it.
// (CHI-31 tried adding a 13th guardrail-demo question here; dropped per John's call -- the wording
// it landed on couldn't be made reliable enough not to mislead, and the underlying idea is spun off
// as its own follow-up design item instead. No demo question ships this session.)
export const FIXED_DRAWER_TAIL = [
  { id: "vietnam-reseller",             label: "How is our authorized reseller network performing in Vietnam?" },
  { id: "meridian-electronics",         label: "What's going on with Meridian Electronics' digital shelf compliance issue in France and Italy?" },
  { id: "emea-coop-large-format",       label: "Why is co-op budget utilization so low for our EMEA large-format retail partner this quarter?" },
  { id: "jinhua-digital",               label: "How is Jinhua Digital recovering after its sales decline in Greater China?" },
  { id: "elevate-mobility",             label: "What risks should we watch as Elevate Mobility rapidly expands in India?" },
  { id: "nippo-carrier",                label: "What is Nippo Carrier in Japan doing that makes them our top performer, and how do we scale it to other partners?" },
  { id: "altiplano-movil",              label: "How is the installment plan program performing with Altiplano Móvil in Mexico?" },
  { id: "emea-emerging",                label: "What is our channel strategy outlook for EMEA Emerging markets — India, Middle East, and Africa?" },
  { id: "southeast-asia",               label: "What is our channel strategy outlook for Southeast Asia?" },
  { id: "training-turnover-benchmark",  label: "How does our partner training and turnover rate compare to industry benchmarks?" },
  { id: "latin-america",                label: "What is our channel strategy outlook for Latin America this year?" },
  { id: "south-korea-coop",             label: "What is our co-op utilization rate for our partner in South Korea?" },
];
