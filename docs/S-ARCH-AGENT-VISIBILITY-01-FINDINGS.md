# S-ARCH-AGENT-VISIBILITY-01 — Findings: Why Is the Librarian Invisible?

**Design session, 2026-07-13.** Spun off from the `MI-46` mobile chat-routing-display session to keep that session focused. John's question: *"Why is the Librarian handled differently from other agents? Shouldn't all agents act the same? Are there others like this? What about the Prompt Engineer?"*

No code changed. This is a findings/recommendation doc, not a kickoff doc — the right fix depends on a decision only John can make (see Finding A). All file/line citations below are read directly from `origin/dev`, not the shared checkout.

---

## Q1 — Is Eleanor a real dispatched agent, or a governance label?

**A governance/attribution label wrapping a deterministic function — she never takes a live agent turn.**

- `src/data/agents.js:171-174` — Eleanor Voss (LB-01) has a full roster entry (avatar, pronouns, specialty, quip).
- `lib/librarian.js` — her entire "capability" (`queryLibrary`, `writeLibrary`, `describeLibraryCatalog`) is a credential check (`getCredentials()`, a Postgres lookup against the *requesting* agent's `data_room_access`/`uber_access`) plus a vector search / PostgREST call. **There is no LLM call anywhere in this file.** Every call is logged (`logLibrarianCall`/`logLibrarianWrite`, lines 28-52) with `agent_id: "eleanor"` regardless of who actually asked or what was asked.
- Grepping the whole codebase for `eleanor` returns exactly two files: `agents.js` (roster metadata) and `librarian.js` (the logging label). She is never the `requestingAgentId` anywhere — no capability ever runs "as Eleanor."

So: real roster entry, zero live reasoning ever attributed to her. Every `ai_activity_log` row bearing `agent_id: "eleanor"` documents a deterministic access check, not an agent decision.

---

## Q2 — What ARCHITECTURE.md §19c/§19e actually say (verbatim)

**§19c (The Library / Data Room Model):**
> "Access rule, enforced structurally, not by opt-in: every read and write to `the_Library` goes through `lib/librarian.js` — `queryLibrary({ requestingAgentId, ... })` / `writeLibrary({ requestingAgentId, operation, ... })`. These check **the requesting agent's** `data_room_access`/`uber_access` against the `agents` table before resolving a `data_room_tag`... `the_Library`'s own query/embed-and-upsert primitives live inside `lib/librarian.js` itself and are not exported for use elsewhere — Eleanor's module is the only code in the platform that imports them. No other agent's capability, no Trainer pipeline, no future `api/` route touches `the_Library` directly, structurally, not by discipline."

**§19e (Resource Ownership Brokers), registry row:**
> `the_Library` (Data Room reads/writes) | Eleanor Voss (LB-01) | `lib/librarian.js` — `queryLibrary()`/`writeLibrary()` | ✅ Built

**§19e's own two-flavor table**, contrasting Eleanor against Dan Bingham:
> Who can call it: "Only the owner's broker code path" (Eleanor) vs. "Any agent — it's shared infrastructure" (Dan)
> What's enforced: "Structural: no other file imports the primitives; **credential check per caller**" (Eleanor) vs. "Nothing" (Dan)

That last line — "credential check **per caller**" — only makes sense if multiple different agents are expected to call through as themselves. Checking "the requesting agent's" credentials, over and over, for a caller that's always Eleanor would be meaningless.

---

## Q3 — Does `queryLibrary()`/`writeLibrary()` gate to Eleanor's own calls, or accept any `requestingAgentId`?

**It accepts any `requestingAgentId`, with a real per-caller credential check — not "no check."** Confirmed live: `api/prompt/ai-enrichment.js:36-38` calls `queryContent({ requestingAgentId: effectiveAgentId, store: fi.source, ... })` — `effectiveAgentId` is whichever agent's turn is being assembled (Marcus, Owen, Priya, whoever). This is unchanged, current, shipped code — not a hypothetical.

Read literally against the code, §19c/§19e's "Eleanor's module is the only code that imports [the primitives]" and "only the owner's broker code path" describe **code-path** exclusivity (nothing bypasses `lib/librarian.js` to hit the `the_library` table directly), not **identity** exclusivity (only Eleanor's own agent turn may call the exported functions). Under that reading, today's behavior is compliant: any credentialed agent calls the broker *interface*; the broker is Eleanor's in the sense that she's the only code that ever touches the underlying table.

### This directly contradicts a standing memory — flag, don't silently resolve

My memory (`project-librarian-gatekeeper`, written `S-APPLE-04a-design`, 2026-07-02) says the opposite, and says John stated it three times in one session: **"Eleanor-only" means full CRUD — no agent's own capability may call `queryLibrary()`/`writeLibrary()` itself, ever, even with valid credentials. Any such call is "the agent touching `the_Library` directly — Eleanor never did anything."** That memory explicitly names this exact code path as a violation:

> "Confirmed live violation, not a hypothetical: `api/prompt/ai-enrichment.js` (built `S-LIBRARIAN-01b`) calls `queryLibrary()` directly for Marcus/Priya's RAG fetches, passing their own `agent_id`, with zero Eleanor hop — this is shipped, in production, and violates the rule above. Needs its own fix session; not yet scoped or logged to `FEATURES.md` as of this note."

That fix session never happened. It was never added to `FEATURES.md`. Eleven days later, the exact same call site is still there, unchanged, and is the very thing John is now asking about from a different angle.

**Per the Architect Review's Locked-Section Staleness Check (`CLAUDE-DESIGN.md` Step 4.6): a locked section and an already-known fact disagree. That disagreement is the finding.** I'm not resolving it in either direction — this needs John's explicit word on which reading is correct, because it changes everything downstream:
- If the memory/John's 2026-07-02 statement is the real rule → `ai-enrichment.js`'s direct `the_library`/`the_library_catalog` calls are a live, currently-shipping architecture violation, unscoped for 11 days, and every RAG-backed MI answer today is technically non-compliant.
- If §19c's literal text (credential-check-per-caller) is the real rule → today's code is compliant, the 2026-07-02 memory was an overcorrection that never got reconciled back into the doc, and the memory itself needs correcting.

---

## Q4 — Is there a Prompt Engineer? Dan Bingham

**Yes — Dan Bingham (PS-01), "AI Prompt Strategist," `id: "dan"`, `isPromptArchitect: true`** (`src/data/agents.js:109-121`). Unlike Eleanor, his invisibility is **explicit, intentional, and architecturally settled** — not an open question:

- `ARCHITECTURE.md §19e`'s own contrast table classifies him as **Collaborative Service Attribution**, the deliberate opposite of Eleanor's Exclusive Access-Control Broker flavor: "No trust boundary — the specialist is a collaborator, not a gatekeeper."
- `ARCHITECTURE.md §19` (locked `S-PM-08-design`) spells out the intended UX explicitly: *"Dan does NOT appear as a separate step in the work order — his contribution is a background team collaboration. The UI shows a small collaboration indicator: '[Primary Agent] + Dan Bingham' wherever the Prompt Service fires."*
- Unlike Eleanor, Dan's attributed work is **real**: `api/prompt/ai-enrichment.js`'s REFLECT (lines 167-223) and Intelligent Synthesis (lines 231-270) steps are genuine Haiku LLM calls, logged under `agent_id: 'dan'` with real `input_tokens`/`model` (lines 281-314). When his name is attached to an `ai_activity_log` row, actual inference happened — the attribution is honest.
- The spec'd "[Primary Agent] + Dan Bingham" indicator **was built** — `src/components/PromptEvolutionModal.jsx:169-188` (`AA-65`) — but only inside that modal, never wired into the live MI chat status line or the Agent Routing feed. `src/components/AboutPanel.jsx:288` also documents his Reflection step as "✅ Live."

So Dan is not a governance gap — he's a correctly-attributed collaborator whose one small spec'd UI surface (the modal indicator) never made it into the newer live-routing surfaces (`MI-42`'s SSE event feed, `MI-45`'s pinned mobile feed) built after his own indicator shipped.

---

## Q5 — Other backend mechanisms with the same invisibility pattern?

Checked every `fetch_instruction.source` branch in `api/prompt/ai-enrichment.js`'s `fetchSection()` (lines 36-59):

| Source | Backing code | LLM call? | Logged to `ai_activity_log`? | Live delegation event? |
|---|---|---|---|---|
| `the_library` / `the_library_catalog` | `lib/librarian.js` (Eleanor) | No | Yes, `agent_id: "eleanor"` | No |
| `the_reasoning` | `lib/search-harness.js`'s `queryTheReasoning()`/`writeTheReasoning()` | No | **No — no log call exists at all** | No |
| `roster` | `lib/project-manager.js`'s `getRosterCandidates()` (Michelle) | No | Yes, `agent_id: "michelle"`, `ai_type: "agent-directory"` | No |
| everything else (default) | `lib/rag.js`'s `queryRAG()` — personal `knowledge_entries` | No | Not checked this session (out of scope — `§19c` explicitly says this path was "never meant to be brokered") | No |

**`the_reasoning` is a strictly worse case than Eleanor's or Michelle's** — it isn't just missing a live event, it has **zero audit trail today.** `lib/search-harness.js`'s `queryTheReasoning()`/`writeTheReasoning()` (lines 47-111) have no equivalent of `logLibrarianCall()`/`logDirectoryCall()`. A read or write against `the_reasoning` — content `§19f` itself calls "an IP moat, per-Data-Room" — produces no `ai_activity_log` row naming who read/wrote what. This is smaller in scope than the Eleanor question and not tangled in the Q3 ambiguity — it's an unambiguous logging gap, independent of how Q3 resolves.

Michelle's roster fetch (`getRosterCandidates()`) is architecturally identical to Eleanor's case: real per-caller credential check (`isActiveAgent()`), zero LLM call, logged under her name regardless of caller, no live event. The same Q3-style question applies to her too, though the file's own header comment (`lib/project-manager.js:1-10`) calls this "Structural analog to `lib/librarian.js`" — so whatever John decides for Eleanor's exclusivity almost certainly needs to apply identically here.

---

## Why this isn't one bug — three separable findings

**Finding A (blocking, needs John's explicit decision):** the Q3 contradiction above. Nothing else should be scoped as a "fix" until this is resolved, because it determines whether `ai-enrichment.js`'s current direct-call pattern is the violation or the correct behavior.

**Finding B (design decision, independent of A):** the live Agent Routing feed (`api/capabilities/execute.js`'s `onEvent({type:'delegation'|'delegation_return', ...})`, rendered by `MarketIntelligenceScreen.jsx`'s `RoutingEventRow`/`AuditColumn`) only fires for mid-turn, agent-initiated tool calls (`request_help`, `delegate_to_agent`, critique dispatch) — decisions a model makes about itself, per `§19d`. Prompt-assembly-time work (Eleanor, Michelle's roster fetch, Dan's REFLECT/Synthesis) happens *before* the agent's own turn even starts, assembling its context — categorically pre-turn infrastructure, not a mid-turn agent decision. It was never structurally possible for these to appear in that feed, by the feed's own design intent, regardless of Finding A. Separately, they *do* already surface in the aggregate **Agents drawer** (`MarketIntelligenceScreen.jsx`'s `PROPOSED_MI_AGENT_IDS`/`MI_LOOP_SCOPE`, lines 934-959 — confirmed `librarian`, `librarian-write`, `agent-directory`, `reflect`, `synthesis` are all already counted there) — so "invisible" is accurate for the live event feed specifically, not for all UI surfaces. The open design question: does the platform want a new, distinct (not `delegation`) event class for this kind of collaborative/access-broker work in the live feed, or is aggregate-drawer visibility the intended ceiling? This is a real design decision with UX and harness implications (a new event shape, a new visual treatment distinguishing it from real delegation so it doesn't misrepresent deterministic infra as agent reasoning) — not a quick patch.

**Finding C (small, unambiguous, independent of A/B):** `the_reasoning` has no audit logging at all. Straightforward to fix once scoped — add a log call to `lib/search-harness.js` mirroring `logLibrarianCall()`'s shape, attributed to the real `requestingAgentId` (not a synthetic agent name — nobody "owns" `the_reasoning` the way Eleanor owns `the_library`, per `§19f`'s own "Content-Owner Access" flavor, so self-attribution is already the correct model here, just not logged yet).

**Finding D (small, independent of A/B/C):** Dan's spec'd "[Primary Agent] + Dan Bingham" collaboration indicator exists (`PromptEvolutionModal.jsx`) but was never carried into the live MI chat surfaces built after it (`MI-42`/`MI-45`). Cosmetic/UX gap, not an architecture question.

---

## Recommendation

1. **John resolves Finding A first, explicitly.** Two honest options, not a false choice:
   - **(a) The memory's reading stands** ("Eleanor-only" = literal identity exclusivity, full CRUD, no exceptions) → `ai-enrichment.js`'s direct `the_library`/`the_library_catalog` calls and `project-manager.js`'s direct roster calls are confirmed live violations. This becomes a real fix session: every `the_library`/`roster` fetch during prompt assembly would need to become an actual `request_help`-style delegation hop to Eleanor/Michelle before the requesting agent's own turn can proceed — a materially bigger change than it sounds, since it turns a cheap parallel `Promise.all` fetch (`ai-enrichment.js:132-134`) into a serialized cross-agent round trip on every single RAG-backed turn, and reopens the hop-budget concerns `§19f` was written to relieve.
   - **(b) §19c's literal text stands** (credential-check-per-caller, code-path exclusivity not identity exclusivity) → today's code is already compliant. The fix becomes updating `project-librarian-gatekeeper` (and possibly `ARCHITECTURE.md §19c`'s prose, if it's read ambiguously) to stop asserting a violation that isn't one.

   I'm not picking one — this is exactly the kind of "John states a hard architectural fact" moment `project-librarian-gatekeeper`'s own postmortem warns must get written into `ARCHITECTURE.md` as LOCKED in the same session, not left to go stale again.

2. **Finding B** (live-feed event class for collaborative/broker work) is a real design session once Finding A is settled — it touches `execute.js`'s event vocabulary, `MarketIntelligenceScreen.jsx`'s rendering, and possibly `STYLE-GUIDE.md` (a new visual treatment distinct from delegation arrows, so as not to misrepresent deterministic work as agent reasoning — the same sniff-test concern `§19d` already applies to routing, applied here to attribution).

3. **Findings C and D** are small, independent, and can be scoped into a normal coding session kickoff whenever picked up — they don't need to wait on Finding A.

Logged to `docs/FEATURES.md` as `AA-177` (Finding C), `AA-178` (Finding A), `AA-179` (Finding B) — see that file for the tracked rows.
