// DeepBench v6.3.36 | aiPatterns.js | LOG-20 — AI_PAT strings now sourced from canonical PATTERN_CATALOG
// FEATURE: AI-28 — AiBadge label sweep: shared constants for all three badge sessions

import { PATTERN_CATALOG } from '../shared/ai-patterns.js';

// FEATURE: LOG-20 -- looks up each slug's real display name in the canonical PATTERN_CATALOG
// (shared/ai-patterns.js -- the same catalog useAIActivity.js and lib/activity-log.js already
// treat as ground truth, per AA-190b) instead of a hand-typed duplicate string, so a future
// rename there reaches these badges automatically. Falls back to the raw slug (never
// "undefined") if a slug is ever removed from the catalog -- a visible fallback, not a crash.
const patternNamesBySlug = new Map(PATTERN_CATALOG.map(p => [p.slug, p.name]));
function names(...slugs) {
  return slugs.map(slug => patternNamesBySlug.get(slug) || slug).join(' · ');
}

// FEATURE: AI-36 — Reflection removed; active: false in PATTERN_CATALOG
// Pattern label strings — sourced from PATTERN_CATALOG via names() (LOG-20), not hand-typed.
// Every string below is byte-identical to the pre-LOG-20 hardcoded value today; the Node test
// asserts this exactly, so this is a sourcing change only, not a display change.
export const AI_PAT = {
  TASK_PLANNING:           names('tool-use', 'structured-output', 'streaming'),
  AGENT_ROUTING:           names('rag', 'structured-output'),
  CHAT_RESPONSE:           names('rag', 'prompt-chaining', 'streaming'),
  PROMPT_ASSEMBLY:         names('prompt-chaining', 'rag'),
  KNOWLEDGE_TRAINING:      names('rag', 'embeddings'),
  KNOWLEDGE_REINFORCEMENT: names('embeddings'),
  AUTONOMOUS_RESEARCH:     names('react', 'browser-automation', 'streaming'),
  AI_REVIEW:               names('rag', 'prompt-chaining'),
  // DB-22 — full pattern set across the entire Create New Task → Assign Work flow
  CREATE_TASK_FULL: names('rag', 'embeddings', 'tool-use', 'structured-output', 'streaming', 'prompt-chaining'),
};

// Agent code → execution patterns for step card badges (AI-29 — used in S-AI-BADGE-02)
// built: false = greyed dashed badge (pattern in catalog but not yet implemented for this agent)
export const AGENT_PATTERNS = {
  "DR-06": { patterns: AI_PAT.AUTONOMOUS_RESEARCH,      built: true  }, // Brent Matthews
  "IR-07": { patterns: AI_PAT.AUTONOMOUS_RESEARCH,      built: false }, // Pat Smiley — FT-06 deferred
  "JR-01": { patterns: AI_PAT.CHAT_RESPONSE,            built: true  }, // Chloe Okafor
  "SR-02": { patterns: AI_PAT.CHAT_RESPONSE,            built: true  }, // Mike Alvarez
  "PR-04": { patterns: AI_PAT.CHAT_RESPONSE,            built: true  }, // Bob Whitfield
  "CN-03": { patterns: AI_PAT.CHAT_RESPONSE,            built: true  }, // Robyn Castellanos
  "MK-05": { patterns: AI_PAT.CHAT_RESPONSE,            built: true  }, // Christy Park
  "PP-01": { patterns: AI_PAT.TASK_PLANNING,            built: true  }, // Michelle Manning
  "TR-08": { patterns: AI_PAT.KNOWLEDGE_REINFORCEMENT,  built: false }, // Susan Smith — S-BENCH-01b deferred
};
