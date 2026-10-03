<!-- DeepBench v7.0.408 | docs/research/LOG-143-bench-report-card-research.md | LOG-143 — THE FIRST
     PLATFORM-ORIGINATED FEATURE'S RESEARCH LEG AND RATIFICATION RECORD (charter criterion 7, M7 ruling (i),
     SES-160's first-feature exception). Research run 2026-09-02 by an Opus 5 agent under attended session
     design-m7-gate-0902 (live web + the vision corpus, read-only); the pitch delivered in chat by the
     session; John's ratification verbatim. The proposal row is LOG-143 (scope_origin = enhancement,
     EL-01); the decision that rewrote it is the truth and this file is the repo-side copy. -->

# LOG-143 — Bench Report Card: research leg, pitch, and John's ratification

**Ticket:** `LOG-143 — Bench Report Card: DeepBench grades its own answers (LLM-as-judge over real
runs, scores on Agent profiles, low score names the Skill row)` (Observability,
**P1 - Improves John's Skills**, `scope_origin = enhancement`, admitted under `EL-01`).
**Origin:** `SES-131` candidate (2026-08-23), re-proposed 2026-09-02 as the first feature under
`docs/design/SES-186-m7-inventor-gate.md` ruling (i).
**Ratified by John, 2026-09-02 21:3x CST, verbatim: "Yes"** — the explicit yes the M7 gate's
Tier-3 ruling requires for the first invented feature. From the second proposal on, the 72-hour
window ratifies.

## The pitch as delivered (attended session design-m7-gate-0902)

DeepBench's entire claim is expertise. Michelle Manning — Project Manager picks the right Agent;
that Agent draws on the Library through Eleanor Voss — The Librarian; and its Skills shape the
answer. Today nothing checks whether any of that actually happened on a real run. The verifier lane
grades code. Nothing grades answers. A visitor choosing an expert reads a capability blurb, not
evidence.

The feature is one judging Capability, run through the generic executor (`ARCHITECTURE.md` §19b)
after each run. It reads the logged hops and the Library content the answer used and scores three
things per Agent: did the delegation match the Intent to an Agent whose Skills cover it, is each
claim grounded in retrieved Library content, and were the Agent's own Skills used. Scores are rows.
They roll up onto each Agent's profile in the Layer visitors already browse, and a low score names
the exact Skill row to improve.

Why the system needs it, in order:

1. **It is the missing half of the self-building loop.** The factory can now build without John. It
   still cannot tell whether the product got better. A score that points at a Skill row turns quality
   into what the locked pitch calls a training operation, not a software release.
2. **It passes the P1 pull test on evidence.** Evaluation frameworks for agent behavior were the
   single most-named skill across the Anthropic and Google postings read on 2026-09-02, and Anthropic
   published the canonical method on 2026-01-09.
3. **It proves criterion 7 for free.** Every judge run is a model call, so it lands in
   `ai_activity_log` with visitor attribution (`LOG-121a`). Real-visitor usage is measurable with
   telemetry that already exists.
4. **It is M-sized on mechanisms that exist.** One Capability as data, one scores table, one panel
   on a screen that already ships. No new harness.

The honest risk: read as an admin dashboard it would be P5/P10 and fail the pull test (criterion
137). So the visible part is on the Agent profile where visitors pick experts, not on the briefing
page, and it enumerates only what the logs contain, never a fabricated zero (`C-rejected-17`,
`C-rejected-18`, `C-rejected-27`).

## What the market says (live research, 2026-09-02)

- Every production agent stack in 2026 sits on the same seven layers — model, orchestration,
  tools/MCP, memory, observability, evals, guardrails — and the stack is rarely the differentiator;
  the discipline of operating each layer is. ([O'Reilly, AI Agents Stack 2026 Edition](https://www.oreilly.com/radar/the-ai-agents-stack-2026-edition/))
- **Evals.** Anthropic's guidance (2026-01-09) names three measurement dimensions —
  transcript/trace analysis, outcome verification, behavioral quality — plus rubric-based
  LLM-as-judge with an explicit "Unknown" out.
  ([anthropic.com/engineering/demystifying-evals-for-ai-agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents))
- **Observability.** Microsoft's Build 2026 push is framework-agnostic agent observability on
  OpenTelemetry GenAI conventions ([Microsoft Foundry blog](https://devblogs.microsoft.com/foundry/build-2026-from-observability-to-roi-for-ai-agents-on-any-framework/));
  AWS ships evaluation decoupled from framework ([Bedrock AgentCore Evaluations](https://aws.amazon.com/blogs/machine-learning/evaluate-any-agent-framework-with-amazon-bedrock-agentcore-evaluations/)).
- **Interop and memory** (context for the runners-up): A2A passed 150+ organizations under Linux
  Foundation governance by 2026-04-09 ([press release](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year));
  persistent agent memory moved to production capability in 2026 with benchmarks unsettled
  ([mem0, State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)).

## What the job postings name

1. **Anthropic — AI Engineer, GTM Claudification** (fetched): "Develop evaluation frameworks for
   agent behavior, and run them in development and in production"; "Instrument model and tool calls
   in production, and build the observability and measurement"; "Ship MCP servers".
   ([greenhouse](https://job-boards.greenhouse.io/anthropic/jobs/5390966008))
2. **Anthropic — Software Engineer, Agent Platform**: "long-lived agents, memory, professional
   documents, skills, and evals for agentic capabilities." ([mirror](https://jobs.menlovc.com/companies/anthropic/jobs/61150455-software-engineer-agent-platform) — body from search summary, unverified)
3. **Anthropic — Engineering Manager, Agent Prompts & Evals**: "eval frameworks, system prompt
   pipelines, and regression-detection systems." ([greenhouse](https://job-boards.greenhouse.io/anthropic/jobs/5159608008) — title verified, body unverified)
4. **Google — Group PM, AI Agent Security and Authorization**: secure agent systems, tool-calling,
   prompt safety, exfiltration prevention. ([Google Careers](https://www.google.com/about/careers/applications/jobs/results/75437862740206278-group-product-manager/) — page truncated, unverified)
5. **Google — Senior PM, Agentic AI and Insights Platform**. ([Google Careers](https://www.google.com/about/careers/applications/jobs/results/107380396198372038-senior-product-manager/) — unverified)

## Vision-corpus grounding cited on the row

- §0 locked pitch: quality improves as *a training operation, not a software release*.
- `C-MAP-17`, `C-MAP-25`: data-model whitespace ranks above surface whitespace.
- Criterion 137 (`docs/JOHN-DECISION-PATTERNS.md`): P1 = FAANG-showcase; administrative
  expectations classify by function.
- `C-rejected-17`, `C-rejected-18`, `C-rejected-27`: no fabricated zeros; displays enumerate what
  the logs contain; no blended average across structurally different operations.

## The two runners-up, and why they ranked lower

- **Governed Working Memory** (extends `AGT-60`, P2 - Inventive, L): Librarian-brokered,
  per-write-audited, visitor-correctable memory. Best visitor-usage story; ranked lower because it
  is an L that stores visitor data, where John's rulings are strictest (`C-rejected-20`,
  `C-rejected-31`), and criterion 143 ranks automation/tooling above classified backlog while
  automation is incomplete.
- **Answer Receipt** (extends `LOG-144`, P1, M): per-run trace tree from the CHI Audit Pipeline Log.
  Weakest usage signal (opening a span makes no model call) and overlaps §19h, §19q, §19r, §19s.

## How it reaches the build queue — measured, not assumed

`public.prime_directive_queue()`'s `buildable` set INNER JOINs `epics` on `name ILIKE 'Selfbuild%'`
before the `EL-01` clause is applied, so an admitted enhancement with no Selfbuild epic is **not**
served — the enhancement-lane register's *"filed unlinked … under this lane it is buildable"* use
case is false in code (filed as `SES-321`). `LOG-143` is therefore linked to
`Selfbuild M7 - The Inventor` as a non-required member (criterion 7 is M7's own exit criterion), under
a second recorded decision. It is served in the `selfbuild` lane after the M7 drain's named members;
with the drain picking `SES-84` → `SES-159` → `SES-160` → `SES-004` first, the build starts once
those are done or blocked, unless John pins it.

## Usage signal that proves criterion 7

Each judge run is an `ai_activity_log` row carrying the judged run's `visitor_id`. The measure is
judge runs attributed to non-John visitors (the dev-URL-is-John rule in the visitor ledger) over a
rolling window, rendered on the Project panel; a profile-sort tap needs one added event and is
deliberately not the primary signal.
