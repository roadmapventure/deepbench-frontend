# AGT-37 — harvest

Detail moved out of `docs/FEATURES.md`'s `AGT-37` row 2026-07-29 by `S-HAR-21-design` (row was 3418 chars, over the 2000-char cap — `CLAUDE-DESIGN.md` step 9). **A move, not a delete:** everything below was the row's text verbatim at the moment of the move, plus this session's decisions appended at the end.

---

## Original finding (2026-07-28, `S-SES-31` QA run, reproduced from `durable_hops`)

**Truncated citation ids in agent prose get echoed into `source_chunk_ids` and correctly denied — believed at the time to be an agent-Skill (data) fix, not a code fix.**

Priya — Analyst writes chunk references into her theory-test prose in truncated 8-character form (e.g. `(id: 0cecd001)`); Elena — Reasoner's `reasoner-intent` instruction says *"Set source_chunk_ids to any the_library chunk_ids cited in flagged_answer"* (verified verbatim in `skill_profiles.traits->analysis_instructions`), so her model lifts those truncated strings and `lib/search-harness.js`'s AA-189 UUID guard denies them (`denied-source-chunk-cross-room-or-missing`). **The guard is right and stays untouched** (DAT-7: "This guard is not the bug"). Reproduces on the real screen — not a harness artifact.

Fix believed at the time to belong in Skill data via the normal Skill-edit path: constrain Elena — Reasoner to full 36-character UUIDs taken only from a structured citations field, never ids parsed out of prose; and/or stop Priya — Analyst truncating ids in prose. No code change. The structural fix — giving Elena — Reasoner a real citations field instead of parsing ids out of prose — remained open as code and was deliberately not done there (`AGT-37`, v6.3.214, data-only Skill edit).

## QA FAILED 2026-07-29 — the instruction-only fix does NOT hold

Skill edit shipped (v6.3.214) but `AGT-37` stayed OPEN. Design-session QA forced Elena Cho — The Reasoner down the consolidate branch directly (the coding session's 3× `upgrade-cycles` run was a **vacuous pass** — she chose `no_action` every time, so the amended text was never exercised).

Three controlled calls, deployed API:

| Input | Result |
|---|---|
| **B** — prose carrying a real full UUID | `consolidate`, `ids=["0cecd001-097d-4e92-b46d-519d9e8f96fe"]`, write OK |
| **C** — prose with no id-like text | `consolidate`, `ids=[]`, write OK |
| **A** — prose carrying the truncated `(id: 0cecd001)` | **DENIED**, reproduced twice |

So the amended instruction is correct and harmless — it did not silence consolidation — but it fails on the one input it was written for: the model copies an id-shaped decoy regardless of an explicit, emphatic prohibition.

**Second occurrence of this exact class:** DAT-7 mitigated Nadia Farouk — Data Expert's `chunk_id` by instruction too, and that also lost (`chunk_id="H1"` on 4 completed hops in the 0/24 run).

**Generalization: an id-shaped decoy defeats instruction-level guards; this needs a structural fix, and no further instruction wording should be attempted.**

Options presented to John at the time: (a) write-side sanitation — `reasoning-write`/`writeTheReasoning` strips non-UUID entries (logging what it dropped) so a malformed id yields the honest empty array instead of killing the hop, while a fabricated *full* UUID is still denied; (b) the durable fix — pass citations to Elena as structured data so she never parses prose (believed then to need code, screen + driver + assembly); (c) upstream prose hygiene on Priya Nair — Forecast/Theory/Performance Expert (same instruction-only class that just failed, so mitigation at best).

**Test-design note:** `--only upgrade-cycles` does NOT reliably exercise the consolidate branch — use a direct `memory-consolidation`/`reasoner-intent` call with reversal-shaped content.

---

## Resolution path decided 2026-07-29 (`S-HAR-21-design`, John's walkthrough)

Options (a) and (b) turned out not to compete, and (b) was cheaper than the original scoping assumed.

**Finding that changed the scope — no new assembly is needed.** The correct full-UUID citations already exist on the screen at commit time and are already handed to Nadia Farouk — Data Expert one line below the Elena call. `MarketIntelligenceScreen.jsx:4198` destructures `citations` alongside `flaggedAnswer`; `:4204` passes `citations[0]` to Nadia as `disputed_chunk_id`; Elena's `task_context` at `:4212` gets prose only. Priya Nair — Forecast/Theory/Performance Expert's theory-test sections are `{text, citations}` objects (`CHI-65`) and `:4205` joins only the `.text` halves, discarding three more citation arrays. Live confirmation of the shape, from `ai_activity_log`: `ci-answer-intent` → `citations: ["6bef824b-c56e-487b-a976-cccdefe567c4"]`.

**Not a harness artifact upstream:** `formatLibraryEntry` (`lib/librarian.js:60`) renders `[id: ${m.id}]` — the full UUID. The truncation is genuinely the model's own behaviour.

**No usable trusted fact on Elena's own call:** her `memory-consolidation` rows carry no `retrieved_chunk_ids` (she is handed text, she does not retrieve), so the id cannot be recovered from already-captured §19i facts. It has to travel from where it is known to where it is used.

**Split into two sessions:**
- **`HAR-21` (v6.3.222, session 1)** — new `lib/claim-resolver.js` platform service + `reasoning-write.js` consumes it. Malformed ids degrade to an honest `[]` instead of killing the write. Unblocks the button; provenance link may still be empty.
- **`AGT-37` (session 2)** — thread the real ids through `execute.js` → `request-receivable.js` → the handler, and drop `source_chunk_ids` from Elena Cho — The Reasoner's output contract so no model is asked for an id at all.

**John's calls in the walkthrough:** the rule covers **both** write paths, not just Elena's (`data-patch-execute-intent` routes to the same handler — verified in Supabase, contradicting `reasoning-write.js:7`'s stale comment). And it is a **service, not an agent action** — the principle recorded is *if the correct value is already known, no model touches it*.

## QA result 2026-07-29 (`S-AGT-37`, v6.3.224, `42f805e`) — 6 of 7, gate unmet

Code shipped. `handler_context` carries the ids past Elena Cho — The Reasoner to the write handler; `source_chunk_ids` removed from her output contract.

| Check | Result |
|---|---|
| real id supplied + truncated `(id: 0cecd001)` decoy in prose | row `6760642e` carries the **real** id |
| nothing supplied, no decoy | `[]`, no error |
| nothing supplied, decoy present | `[]`, no error — `HAR-21` not regressed |
| **fabricated** id *supplied* by the caller | **422 denied** — caller-supplied is not caller-trusted |
| observed consolidate | `self_reported_claims: null`, supplied id absent from `call_facts`, row still carried it |

**Unmet: QA 2, the real Store as Forecast click** — the only item that exercises Task 1 (the screen gathering the ids), and the stated closure gate. Blocked because Vercel's free-tier 100-deploy/day cap was exhausted (exactly 100 in the trailing 24h; `42f805e` never built) and no local full-stack path exists (`SES-55`). Row left `🔶 Partial` and unarchived deliberately — six green checks are not the gate.
