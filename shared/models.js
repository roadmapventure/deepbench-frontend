// DeepBench v6.3.98 | shared/models.js | LOG-35a -- single source of truth for canonical Anthropic model IDs
// FEATURE: LOG-35a -- see docs/STANDARDS.md Section 12 for the canonical-id rule this file exists to enforce
// structurally (one place to update, every call site imports it) instead of by convention alone.
export const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
};
