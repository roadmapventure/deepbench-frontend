# AI-35 (Step 2b) — Pattern Vocabulary Migration Log

**Date:** 2026-07-21/22
**What this is:** every one of the 24 old `PATTERN_CATALOG` entries (`shared/ai-patterns.js`), run individually through Susan Smith's real, citation-required review capability (`pattern-vocabulary-review`). Each was researched independently against real industry sources — the old file's names were never used as input to what Susan searched for or decided; they're shown here only for before/after comparison. Real logged-call counts (from `ai_activity_log`) were given to her only as evidence of whether a candidate reflects genuine platform usage, never as a source for naming.

**Mechanism note:** the first full run surfaced fabricated citations (real-sounding author names/arXiv IDs that didn't match the actual source). Susan's review instructions (`skill_profiles`, slug `pattern-vocabulary-review-intent`) were corrected twice this session — first to require verbatim transcription from her own `web_search` results rather than reconstruction from memory, then to stop at the first verified source instead of stacking additional unchecked ones. The results below are from the corrected mechanism, spot-verified against real sources.

## Results

| Old slug | Old name | Decision | New slug | New name | Real logged calls |
|---|---|---|---|---|---|
| `rag` | RAG | Promoted | `retrieval-augmented-generation` | Retrieval-Augmented Generation | 4,897 |
| `react` | ReAct | Promoted | `react-loop` | ReAct Loop | 0 |
| `tool-use` | Tool Use | Promoted | `function-calling` | Function Calling | 4,901 |
| `prompt-chaining` | Prompt Chaining | Promoted | `prompt-chaining` | Prompt Chaining | 3,176 |
| `reflect` | Reflection | Promoted | `reflection` | Reflection | 25 |
| `intelligent-synthesis` | Prompt Compression | Promoted (on recheck — see note) | `generative-prompt-compression` | Generative Prompt Compression | 25 |
| `streaming` | Streaming | Promoted | `token-streaming` | Token Streaming | 6 |
| `structured-output` | Structured Output | Promoted | `constrained-decoding` | Constrained Decoding | 6,452 |
| `embeddings` | Embeddings | **Merged** → `retrieval-augmented-generation` | — | — | 959 |
| `browser-automation` | Browser Automation | Promoted | `browser-agent` | Browser Agent | 0 |
| `hitl` | HITL | **Discarded** | — | — | 0 |
| `agent-delegation` | Orchestrator-Workers | Promoted | `agent-handoff` | Agent Handoff | 2,421 |
| `few-shot-prompting` | Few-Shot Prompting | Promoted | `few-shot-prompting` | Few-Shot Prompting | 0 |
| `guardrails` | Guardrails / Output Filtering | Promoted | `output-guardrails` | Output Guardrails | 3,615 (3,960 incl. related) |
| `memory-consolidation` | Memory Consolidation | Promoted | `persistent-advice-storage` | Persistent Advice Storage | 0 |
| `transfer-learning` | Case Retention | **Merged** → `persistent-advice-storage` | — | — | 0 |
| `case-based-reasoning` | Case-Based Reasoning | Promoted | `case-based-reasoning` | Case-Based Reasoning | 0 |
| `parallelization` | Parallelization | Promoted | `parallel-tool-calling` | Parallel Tool Calling | 0 |
| `llm-as-judge` | LLM-as-Judge / Verifier | Promoted | `llm-as-judge` | LLM-as-Judge | 548 |
| `multi-agent-debate` | Multi-Agent Debate | Promoted | `multi-agent-debate` | Multi-Agent Debate | 0 |
| `chain-of-verification` | Chain-of-Verification (CoVe) | Promoted | `self-verification-via-claim-questions` | Self-Verification via Claim Questions | 0 |
| `episodic-memory` | Episodic Memory | Promoted | `persistent-user-context-memory` | Persistent User Context Memory | 0 |
| `hyde` | HyDE | Promoted | `hypothetical-document-embeddings` | Hypothetical Document Embeddings | 0 |
| `adaptive-rag` | Adaptive RAG | Promoted | `adaptive-retrieval-depth` | Adaptive Retrieval Depth | 0 |

**Totals:** 21 promoted, 2 merged, 1 discarded (24 reviewed).

**`intelligent-synthesis` note:** discarded on the first pass — Susan's search centered on token-removal-style compression techniques (e.g. LLMLingua) and correctly found no match, since DeepBench's actual mechanism is a full generative rewrite, not token deletion. A follow-up review, resubmitted with a corrected framing pointing at the generative-vs-extractive distinction in the literature, found a real match (SCOPE, Zhang/Wang/Wang 2025, arXiv:2508.15813) and promoted it.

**`hitl` note:** discarded — the observed behavior ("pause and wait for human input") was judged too generic/implementation-level to be a distinct, citable industry pattern, and has zero real logged calls on this platform, so nothing currently needs it resolved further.

## Citations (full text, per promoted/merged entry)

Full citation strings and Susan's reasoning for every decision are stored in `pattern_candidates.resolution` (Supabase, `submitted_by` = `design-ai-35-2b-0721-migration` or `design-ai-35-2b-0721-recheck-intelligent-synthesis`) and in `pattern_vocabulary` for the 21 promoted entries — not duplicated here to avoid drift between this doc and the database. Several citations were independently spot-verified against real sources during this session (author names, arXiv IDs, titles cross-checked via live search) — see session transcript for specifics.

## What this migration did NOT do

- Did not touch `PATTERN_CATALOG` (`shared/ai-patterns.js`) — the old static file is untouched and still drives all logging and display today.
- Did not retag any historical `ai_activity_log` rows — old rows still carry their original slugs (`rag`, `tool-use`, etc.), unchanged.
- Did not wire the 4 display areas (AI Audit, Agent Routing drawer, About panel) to read from `pattern_vocabulary` — they still read the static file.

Making the new names actually visible anywhere in the app is separate, unscoped follow-on work (a live read-time lookup against `pattern_vocabulary`, discussed this session but not yet built).
