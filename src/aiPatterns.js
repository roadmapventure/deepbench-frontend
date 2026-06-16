// DeepBench v5.2.8 | aiPatterns.js | AI-36 — Reflection removed from labels where active: false
// FEATURE: AI-28 — AiBadge label sweep: shared constants for all three badge sessions

// FEATURE: AI-36 — Reflection removed; active: false in PATTERN_CATALOG
// Pattern label strings — match AI Audit By Pattern section terminology exactly
export const AI_PAT = {
  TASK_PLANNING:           "Tool Use · Structured Output · Streaming",
  AGENT_ROUTING:           "RAG · Structured Output",
  CHAT_RESPONSE:           "RAG · Prompt Chaining · Streaming",
  PROMPT_ASSEMBLY:         "Prompt Chaining · RAG",
  KNOWLEDGE_TRAINING:      "RAG · Embeddings",
  KNOWLEDGE_REINFORCEMENT: "Embeddings · Structured Output",
  AUTONOMOUS_RESEARCH:     "ReAct · Browser Automation · Streaming",
  AI_REVIEW:               "RAG · Prompt Chaining",
  // DB-22 — full pattern set across the entire Create New Task → Assign Work flow
  CREATE_TASK_FULL: "RAG · Embeddings · Tool Use · Structured Output · Streaming · Prompt Chaining",
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
