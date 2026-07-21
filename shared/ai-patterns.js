// DeepBench v6.3.0 | shared/ai-patterns.js | AA-190b -- canonical PATTERN_CATALOG, extracted so
// both the Vite frontend (src/hooks/useAIActivity.js) and Vercel serverless backend
// (lib/activity-log.js) import the exact same array instead of the frontend defining its own
// copy that server-side write sites have no way to reach. Zero framework code -- pure data,
// safe for both runtimes. This is the fix for AA-190's Finding 2: a pattern rename or addition
// now only has to happen in this one file to reach every consumer.
export const PATTERN_CATALOG = [
  { slug: 'rag',                name: 'RAG',                desc: 'Retrieval-Augmented Generation — embed query, search vector store, inject retrieved chunks into context before LLM call',             active: true,  patternType: 'structural' },
  { slug: 'react',              name: 'ReAct',              desc: 'Reasoning + Acting — LLM reasons about state, selects action, executes, observes result, repeats until terminal state',               active: false, patternType: 'reasoning'  },
  { slug: 'tool-use',           name: 'Tool Use',           desc: 'Structured function calling — LLM selects from a declared tool schema and returns a structured response',                              active: true,  patternType: 'reasoning'  },
  { slug: 'prompt-chaining',    name: 'Prompt Chaining',    desc: 'Sequential prompt assembly — output of one prompt feeds as input to the next; multiple calls form a pipeline',                        active: true,  patternType: 'reasoning'  },
  { slug: 'reflect',            name: 'Reflection',         desc: 'Agent critiques and improves its own prior output — self-review pass before returning result',                                         active: true,  patternType: 'reasoning' },
  // FEATURE: AA-190b -- renamed from 'Intelligent Synthesis' to the real published term
  // (LLMLingua/LongLLMLingua, Microsoft Research). slug unchanged -- see Section 1's caution.
  { slug: 'intelligent-synthesis', name: 'Prompt Compression', desc: 'Haiku full-prompt rewrite pass — rewrites the complete assembled prompt against the token budget after REFLECT runs; a rewrite, not a filter', active: true, patternType: 'reasoning' },
  { slug: 'streaming',          name: 'Streaming',          desc: 'Progressive output delivery via SSE — token deltas or discrete structured events, arriving as they happen instead of one final blob, where UX latency matters',                                    active: true,  patternType: 'structural' },
  { slug: 'structured-output',  name: 'Structured Output',  desc: 'Constrained generation — response conforms to a declared schema; no free-text JSON parsing required',                                 active: true,  patternType: 'structural' },
  { slug: 'embeddings',         name: 'Embeddings',         desc: 'Vector generation — text converted to dense vector for similarity search or storage in pgvector',                                     active: true,  patternType: 'structural' },
  { slug: 'browser-automation', name: 'Browser Automation', desc: 'Playwright-controlled browser execution — agent drives a real browser instance on Railway infrastructure',                            active: true,  patternType: 'structural' },
  { slug: 'hitl',               name: 'HITL',               desc: 'Human-in-the-Loop — agent pauses at a defined step gate and waits for human input before continuing',                                 active: false, patternType: 'reasoning',  hitlSpecial: true, roadmap: 'later', roadmapNote: 'Requires step execution (S11) to ship first, then HITL step gate (TI-18, unscheduled)' },
  // FEATURE: AA-190b -- renamed from 'Agent Delegation' to the real published term this pattern's
  // own desc already cited (Anthropic, "Building Effective Agents"). slug unchanged.
  { slug: 'agent-delegation', name: 'Orchestrator-Workers', desc: 'Orchestrator-workers pattern (Anthropic, "Building Effective Agents") -- an agent delegates a subtask to another agent via request_help/delegate_to_agent and synthesizes the delegated result into its own final output. Distinct from agent routing (pre-call selection): delegation happens inside a running multi-turn loop. ARCHITECTURE.md §19d.', active: true, patternType: 'reasoning' },
  { slug: 'few-shot-prompting',       name: 'Few-Shot Prompting',           desc: 'Providing worked examples inside the prompt to guide output format, style, and reasoning before the model generates its response. In use implicitly inside system prompts — not yet a named, tracked service call.', active: false, patternType: 'reasoning',  roadmap: 'next',  roadmapNote: 'Formal tracking when Prompt Assembly extracted as discrete service (S-INFRA-01)' },
  { slug: 'guardrails',               name: 'Guardrails / Output Filtering', desc: 'Post-generation safety and quality enforcement — checking model output against declared rules (always/never constraints, topic boundaries, format requirements) before returning to caller. Data concept exists in Playbook tab.', active: true,  patternType: 'structural' },
  { slug: 'memory-consolidation', name: 'Memory Consolidation', desc: 'An agent turns one human-confirmed decision into durable, structured reasoning -- the write half of closing a correction loop.', active: true, patternType: 'reasoning' },
  // FEATURE: AA-190b -- renamed from 'Transfer Learning' (a real ML term, misapplied -- that's
  // weight-level model adaptation, unrelated to what this does) to Case Retention, the correct
  // CBR-cycle term (Aamodt & Plaza 1994: Retrieve/Reuse/Revise/Retain) for generalizing one
  // confirmed case into a reusable rule -- pairs correctly with the case-based-reasoning sibling
  // pattern below. slug unchanged.
  { slug: 'transfer-learning', name: 'Case Retention', desc: 'Generalizing a specific correction into a pattern applicable to a class of future, related questions -- not just fixing the one answer.', active: true, patternType: 'reasoning' },
  { slug: 'case-based-reasoning', name: 'Case-Based Reasoning', desc: 'Retrieving a previously consolidated case/pattern to inform a new, related question -- the read half of closing a correction loop.', active: true, patternType: 'reasoning' },
  { slug: 'parallelization',          name: 'Parallelization',              desc: 'Multiple LLM calls executed simultaneously; results combined or compared. Test Team (TT-01/02) runs two agents on the same query in parallel and displays results side-by-side with a diff metric dashboard.', active: false, patternType: 'structural', partial: true, roadmap: 'next',  roadmapNote: 'Test Team (TT-01/02) is partial implementation; full wiring deferred to AW-17 (multi-agent step assignment)' },
  { slug: 'llm-as-judge',             name: 'LLM-as-Judge / Verifier',      desc: 'A second model evaluates the quality, accuracy, or compliance of a first model\'s output. Distinct from Reflection (self-critique): the judge is a separate call, often a different model or persona.', active: true,  patternType: 'reasoning' },
  { slug: 'multi-agent-debate',       name: 'Multi-Agent Debate',           desc: 'Two agents take opposing positions and argue against each other\'s output; a synthesis agent reads both arguments and produces a reconciled final answer. Agents are adversarially aware — each sees the other\'s response.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'Extends Test Team (TT-01/02); adds critique pass + synthesis agent. TT-03 design session required.' },
  { slug: 'chain-of-verification',    name: 'Chain-of-Verification (CoVe)', desc: 'After generating an answer, the model generates a checklist of verification questions about its own factual claims, answers each independently, then revises the original answer. Targets factual accuracy claim by claim.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'High compliance relevance for government procurement deliverables. No implementation planned yet.' },
  { slug: 'episodic-memory',          name: 'Episodic Memory',              desc: 'Agents recall the context of prior interactions with a specific user, task, or organization — separate from factual knowledge in RAG. RAG retrieves facts; episodic memory retrieves experience.', active: false, patternType: 'reasoning',  roadmap: 'later', roadmapNote: 'Differentiates AI workforce (colleagues with history) from AI tools (stateless responders). Phase 3+.' },
  { slug: 'hyde',                     name: 'HyDE',                         desc: 'Before retrieving from the knowledge base, generate a hypothetical ideal answer to the query, embed that hypothetical, and use the resulting vector for retrieval — significantly improves RAG quality for domain-specific terminology.', active: false, patternType: 'structural', roadmap: 'next',  roadmapNote: 'One-model change inside SVC-02 Knowledge Retrieval — no schema changes required' },
  { slug: 'adaptive-rag',             name: 'Adaptive RAG',                 desc: 'Dynamically adjusts retrieval depth and strategy based on query complexity. Simple queries: shallow retrieval (3 chunks). Complex analysis: deep retrieval (20+ chunks) with keyword fallback. Prevents over-retrieval cost waste.', active: false, patternType: 'structural', roadmap: 'next',  roadmapNote: 'Complexity classifier inside SVC-02 Knowledge Retrieval — no schema changes required' },
];

// FEATURE: AI-53 -- SERVICE_CATALOG moved here from src/hooks/useAIActivity.js, same treatment
// PATTERN_CATALOG already got from AA-190b: api/extract.js and api/brief.js (Vercel backend) had
// no shared source to pull a real service slug from, so each hardcoded its own literal -- exactly
// how the document-extraction naming collision happened. Both the Vite frontend and Vercel
// serverless backend now import this exact array instead of the frontend defining its own copy.
// FEATURE: AI-23 — AI Services catalog (14 services, client-side until S-INFRA-01 creates ai_services table)
export const SERVICE_CATALOG = [
  // FEATURE: BUG-22 — prompt-assembly is live; move off roadmap
  { slug: 'prompt-assembly',         name: 'Prompt Assembly',          serviceType: 'hybrid', patterns: ['Prompt Chaining','RAG'],                                      roadmap: 'now'  },
  // FEATURE: AA-43 — ai-enrichment service catalog entry (logAICall wired in S-PM-04)
  // FEATURE: BUG-17 — Reflection is live (BUG-15 active:true); surface it in AI Audit By Service view
  // FEATURE: BUG-22 — ai-enrichment is live (16 calls); move off roadmap
  { slug: 'ai-enrichment',           name: 'AI Enrichment',            serviceType: 'hybrid', patterns: ['RAG','Prompt Chaining','Reflection','Prompt Compression'],                                roadmap: 'now'  },
  // FEATURE: AA-44 — request-receivable SERVICE_CATALOG entry
  // FEATURE: BUG-22 — request-receivable shipped in S-PM-04b
  { slug: 'request-receivable',      name: 'Request & Receivable',     serviceType: 'ai',     patterns: ['Structured Output','Tool Use','Streaming','Prompt Chaining','Guardrails / Output Filtering'], roadmap: 'now'  },
  // FEATURE: AW-27 — goal suggestion: streaming Haiku + RAG
  { slug: 'goal-suggestion',         name: 'Goal Suggestion',          serviceType: 'ai',     patterns: ['Streaming', 'RAG'],                                                                           roadmap: 'now'  },
  // FEATURE: AW-28 — preview-prompt: DB Assembly + AI Enrichment without LLM call
  { slug: 'preview-prompt',          name: 'Prompt Preview',           serviceType: 'preview', patterns: ['RAG'],                                                                                        roadmap: 'now'  },
  { slug: 'knowledge-retrieval',     name: 'Knowledge Retrieval',      serviceType: 'hybrid', patterns: ['RAG','Embeddings'],                                           roadmap: 'now'  },
  { slug: 'autonomous-research',     name: 'Autonomous Research',       serviceType: 'ai',     patterns: ['ReAct','Browser Automation','Tool Use','Streaming'],           roadmap: 'now'  },
  // FEATURE: BUG-22 — knowledge-reinforcement live via TeachScreen + FetchContext
  // FEATURE: AI-53 -- corrected: real call site (lib/knowledge-write.js's embedAndUpsertEntry())
  // only ever logs patternsUsed: ['embeddings']; the old 'Structured Output' claim was stale and
  // never earned by the actual service.
  { slug: 'knowledge-reinforcement', name: 'Knowledge Reinforcement',   serviceType: 'ai',     patterns: ['Embeddings'],                             roadmap: 'now'  },
  { slug: 'pre-run-planning',        name: 'Pre-Run Planning',          serviceType: 'ai',     patterns: ['RAG'],                                                        roadmap: 'next' },
  { slug: 'task-planning',           name: 'Task Planning',             serviceType: 'ai',     patterns: ['Tool Use','Structured Output','Streaming'],                   roadmap: 'now'  },
  { slug: 'title-generation',        name: 'Title Generation',          serviceType: 'ai',     patterns: ['Structured Output'],                                          roadmap: 'now'  },
  { slug: 'agent-routing',           name: 'Agent Routing',             serviceType: 'ai',     patterns: ['RAG','Structured Output'],                                    roadmap: 'now'  },
  { slug: 'chat-response',           name: 'Chat / Consultative',       serviceType: 'ai',     patterns: ['RAG','Prompt Chaining','Streaming'],                          roadmap: 'now'  },
  // FEATURE: AI-53 -- split from the old single 'document-extraction' slug, which collided two
  // operationally distinct things under one feature string: a real Claude Sonnet 4.5 call
  // generating structured metadata (this entry) vs. api/extract.js's zero-cost deterministic
  // PDF/DOCX/TXT parser (document-parsing, below) vs. its separate CSV-upload action (csv-upload,
  // below). patterns left empty -- computed live from real patternsUsed by useAIActivity.js's
  // byService (Task 2), not hand-maintained.
  { slug: 'document-metadata-generation', name: 'Document Metadata Generation', serviceType: 'ai', patterns: [], roadmap: 'now' },
  { slug: 'document-parsing', name: 'Document Parsing', serviceType: 'logic', patterns: [], roadmap: 'now' },
  { slug: 'csv-upload', name: 'CSV Upload', serviceType: 'logic', patterns: [], roadmap: 'now' },
  { slug: 'persona-replication',     name: 'Persona Replication',       serviceType: 'ai',     patterns: ['RAG','Prompt Chaining'],                                     roadmap: 'later'},
  { slug: 'procurement-flags',       name: 'Procurement Flags',         serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  { slug: 'vendor-concentration',    name: 'Vendor Concentration',      serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  { slug: 'column-detection',        name: 'Column Detection',          serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  // FEATURE: AG-13 — DB Assembly service catalog entry (Dan's deterministic capability, AA-59)
  { slug: 'db-assembly',             name: 'DB Assembly',               serviceType: 'logic',  patterns: [],                                                             roadmap: 'now'  },
  // FEATURE: AG-27 — The Librarian (Eleanor Voss) Data Room broker service catalog entry
  { slug: 'librarian',               name: 'The Librarian',             serviceType: 'hybrid', patterns: ['RAG'],                                                       roadmap: 'now'  },
  // FEATURE: MI-10/MI-11 — Channel Intelligence (Marcus/CI-01): Intent Routing + Q&A Answer
  // FEATURE: MI-42 — Agent Delegation added (pre-existing gap: Marcus's own ci-answer-intent/
  // ci-answer-display-intent already use it via AA-164/S-ARCH-DISPLAY-LOOP-01, the catalog just
  // never reflected it) + Streaming (this session wires opt-in SSE streaming into every capability
  // this service exposes).
  // FEATURE: CHI-03b — ci-submission-ack-intent/ci-resolution-ack-intent added under this existing service, no new entry needed
  { slug: 'channel-intelligence',    name: 'Channel Intelligence',      serviceType: 'ai',     patterns: ['Structured Output', 'RAG', 'Case-Based Reasoning', 'Orchestrator-Workers', 'Streaming'],          roadmap: 'now'  },
  // FEATURE: MI-12 — Quality Gate (Owen/CI-04): combined Guardrail + Eval pre-display review
  // FEATURE: MI-01d — Agent Delegation added: Owen's own delegate_to_agent retry (Task 3) is this
  // service's first live delegating caller.
  // FEATURE: MI-42 — Streaming added (opt-in SSE streaming wired into every capability this service exposes).
  { slug: 'quality-gate',            name: 'Quality Gate',              serviceType: 'ai',     patterns: ['Structured Output', 'Guardrails / Output Filtering', 'LLM-as-Judge / Verifier', 'Orchestrator-Workers', 'Streaming'], roadmap: 'now'  },
  // FEATURE: LOG-14 -- guardrails-check had zero SERVICE_CATALOG entry and zero AI_TYPE_TO_SERVICE
  // mapping, so real guardrail-check calls (Alex's/Michelle's) never appeared in By-Service at all
  // (confirmed live 2026-07-16, ids 11044/11065). Patterns match the real logged patterns_used
  // exactly, not a guess.
  { slug: 'guardrails-check', name: 'Guardrails Check', serviceType: 'ai', patterns: ['Guardrails / Output Filtering', 'Prompt Chaining'], roadmap: 'now' },
  // FEATURE: AG-28 — hypothesis-evaluation capability (Priya Nair, Generate Hypotheses call).
  // RAG listed at capability level even though this specific call's design doc technical_services
  // don't name it — hyp-knowledge fires a RAG fetch unconditionally, same accepted behavior as
  // channel-intelligence's ci-routing-intent (Section 2 above). No AI_TYPE_TO_SERVICE entry needed:
  // ai_type will equal capability_slug ('hypothesis-evaluation') exactly, resolved by the existing
  // `|| e.type` fallback (line 280) — same pattern as channel-intelligence/quality-gate.
  { slug: 'hypothesis-evaluation',   name: 'Hypothesis Evaluation',     serviceType: 'ai',     patterns: ['Structured Output', 'RAG', 'Case-Based Reasoning'], roadmap: 'now'  },
  // FEATURE: AG-29 — pipeline-triage capability (Sam Reyes, Commit Triage + Failure Triage).
  // No AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('pipeline-triage')
  // exactly, resolved by the existing `|| e.type` fallback (line ~280) — same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation.
  // FEATURE: MI-01d — Agent Delegation added: Sam's intake-failure-intent gets its first live
  // caller this session (Task 2).
  // FEATURE: MI-42 — Streaming added (opt-in SSE streaming wired into every capability this service exposes).
  { slug: 'pipeline-triage', name: 'Pipeline Triage', serviceType: 'ai', patterns: ['Structured Output', 'Orchestrator-Workers', 'Streaming'], roadmap: 'now' },
  // FEATURE: AA-86 -- Michelle's roster broker (lib/project-manager.js). Deterministic read, no
  // LLM call of its own -- mirrors db-assembly's shape, not librarian's (no RAG/embedding step).
  { slug: 'agent-directory', name: 'Agent Directory', serviceType: 'logic', patterns: [], roadmap: 'now' },
  // FEATURE: AG-32 -- data-analysis capability (Nadia Farouk, Data Analyst, CI-03, Escalate).
  // No AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('data-analysis')
  // exactly, resolved by the existing `|| e.type` fallback -- same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation/pipeline-triage.
  // FEATURE: MI-01d — Agent Delegation added: live since S-APPLE-04b (Escalate delegates via
  // request_help/delegate_to_agent) but never retrofitted onto this catalog entry until now.
  { slug: 'data-analysis', name: 'Data Analysis', serviceType: 'ai', patterns: ['Structured Output', 'Orchestrator-Workers'], roadmap: 'now' },
  // FEATURE: AG-33 -- data-room-custody capability (Eleanor Voss, The Librarian, LB-01). The only
  // capability whose execution performs a real the_library write, via the existing writeLibrary()
  // broker -- not a new access path, the same one S-LIBRARIAN-02 already built. patterns gained
  // 'RAG' (Task 2b/4e) -- she now genuinely retrieves Library context before deciding.
  { slug: 'data-room-custody', name: 'Data Room Custody', serviceType: 'ai', patterns: ['Structured Output', 'RAG'], roadmap: 'now' },
  // FEATURE: SK-22 — Display/Format specialist capabilities (Alex Reeves, Riley Torres, Claire
  // Sutton). Previously dormant (zero live call sites); now legitimate live candidates for any
  // capability's request_help call once display routing is agent-reasoned (S-ARCH-HITL-RESUME-01).
  // No AI_TYPE_TO_SERVICE entry needed for any of the three: each capability_slug already equals
  // its own ai_type exactly (same `|| e.type` fallback pattern as data-analysis/quality-gate/etc.)
  { slug: 'screen-controls', name: 'Screen Controls (Alex Reeves)', serviceType: 'ai', patterns: ['Structured Output'], roadmap: 'now' },
  { slug: 'html-display',    name: 'HTML Display (Riley Torres)',   serviceType: 'ai', patterns: [], roadmap: 'now' },
  { slug: 'pdf-assembly',    name: 'PDF Assembly (Claire Sutton)',  serviceType: 'ai', patterns: [], roadmap: 'now' },
  // FEATURE: AG-24 -- memory-consolidation capability (Elena Cho, The Reasoner, CI-06). No
  // AI_TYPE_TO_SERVICE entry needed: ai_type will equal capability_slug ('memory-consolidation')
  // exactly, resolved by the existing `|| e.type` fallback -- same pattern as
  // channel-intelligence/quality-gate/hypothesis-evaluation/pipeline-triage/data-analysis.
  { slug: 'memory-consolidation', name: 'Memory Consolidation (Elena Cho)', serviceType: 'ai', patterns: ['Structured Output', 'Memory Consolidation', 'Case Retention'], roadmap: 'now' },
  // FEATURE: AA-122 -- Agent Turn (Delegation Loop Reasoning) service catalog entry. Logged by
  // AA-120's logAgentTurn() (execute.js) for every delegation-loop callModel() turn, any capability
  // -- generic and agent-agnostic, not Marcus-specific. No AI_TYPE_TO_SERVICE entry needed: ai_type
  // will equal this slug ('agent-turn') exactly, resolved by the existing `|| e.type` fallback --
  // same pattern as pipeline-triage/agent-directory/data-analysis/screen-controls/etc. above. Carries
  // no cost_usd/input_tokens by design (the real billed cost is already attributed to the capability-
  // level row sendRequest() writes separately) -- real call count + avg latency, $0 cost, as intended.
  { slug: 'agent-turn', name: 'Agent Turn (Delegation Loop Reasoning)', serviceType: 'ai', patterns: ['Tool Use', 'Orchestrator-Workers'], roadmap: 'now' },
  // FEATURE: AGT-026 -- web-search-news capability (Jordan Ellsworth, CI-07). No AI_TYPE_TO_SERVICE
  // entry needed -- same fallback pattern as data-analysis/pipeline-triage/hypothesis-evaluation.
  { slug: 'web-search-news', name: 'Web Search News (Jordan Ellsworth)', serviceType: 'ai', patterns: ['Tool Use', 'Orchestrator-Workers'], roadmap: 'now' },
  // FEATURE: CHI-33 -- article-extraction (api/fetch-article.js). Hybrid: primary path is a plain
  // fetch()+Readability extraction (no LLM call, no pattern), fallback path is a real Claude call
  // with web_search -- ai_type 'fallback-summary' needs an explicit AI_TYPE_TO_SERVICE entry
  // (src/hooks/useAIActivity.js) since this route is hand-rolled, not capability-dispatched.
  { slug: 'article-extraction', name: 'Article Extraction', serviceType: 'hybrid', patterns: [], roadmap: 'now' },
];

// FEATURE: AI-53 -- generated from SERVICE_CATALOG itself so a slug constant can never diverge
// from the catalog it's derived from. api/extract.js and api/brief.js import SERVICE_SLUG instead
// of hardcoding a literal -- this is the structural fix that makes a future naming collision
// impossible, not just detectable after the fact.
export const SERVICE_SLUG = Object.fromEntries(
  SERVICE_CATALOG.map(s => [s.slug.toUpperCase().replace(/-/g, '_'), s.slug])
);
