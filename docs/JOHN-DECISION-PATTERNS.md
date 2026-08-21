<!-- DeepBench v7.0.136 | docs/JOHN-DECISION-PATTERNS.md | p1p3-now-review — criterion 137 (P1–P4 pull tests, John 2026-08-21): P2 needs hard-to-replicate uniqueness, P4 needs "I have to buy this" pull, administrative expectations classify by function; FAANG-showcase promotes to P1. Live reclass: ADM-1 → P10, LOG-126 → P5, AGT-015 → P1. -->
<!-- DeepBench v7.0.126 | docs/JOHN-DECISION-PATTERNS.md | SES-90 — the local-archive mining pass: criteria 101–136, mined from John's own typed messages across all 186 local Claude Code sessions (2026-07-08 → 2026-08-21; 2,303 messages read in full, no sampling). Local-archive citations are quote+date durable, file-path best-effort (the archive is not in git); scripts/check-decision-pattern-quotes.js skips them by design and verifies everything in-repo. Coverage/privacy record: docs/harvests/SES-90.md. -->
<!-- DeepBench v7.0.110 | docs/JOHN-DECISION-PATTERNS.md | SES-79 — the full mining pass: the seed set of 5 criteria (one session, `design-log-38-0724`) grows to 100, mined from ~3 months of docs/SESSIONS.md + docs/FEATURES-ARCHIVE.md. Every "Seen in" is a real recorded exchange; every one was grepped back against its source before landing. -->

# John's Decision Patterns — Reference

> **This is now the full `SES-004`/`SES-79` mining pass, not the seed.** Criteria 1–5 are the original
> seed set, distilled from the four corrections in `design-log-38-0724`. Criteria 6–100 were mined
> 2026-08-20 (`SES-79`, `v7.0.110`) from ~3 months of `docs/SESSIONS.md` and
> `docs/FEATURES-ARCHIVE.md` — every recorded instance where Claude proposed one thing and John
> decided another, or where he stated a standing rule in his own words. Criteria 101–136 were mined
> 2026-08-21 (`SES-90`, `v7.0.126`) from the LOCAL Claude Code session archive — every message John
> personally typed across all 186 sessions (2026-07-08 → 2026-08-21), read in full — appended at the
> end of each themed section; their `Seen in:` cites the local archive (quote + date durable).
>
> **`ARCHITECTURE.md` §19v makes this file the criteria source for every autonomous choice, and
> anything it does not cover fails closed to the gated lane.** That is why density matters here:
> each criterion added is a decision the Automated mode can now make well instead of escalating.
>
> **What belongs here:** a criterion that would change a *future* decision. Not a one-off call, not
> history. Add to this file whenever a correction reveals a criterion rather than just a choice.
>
> **What must be true of every entry:** the `Seen in:` instance is real and checkable. A fabricated
> or half-remembered instance is worse than a missing criterion — it teaches a wrong prior to every
> autonomous decision downstream. Pairs with `WORKING-WITH-JOHN.md`'s "Adopt John's Practice
> Instinct First — Concede Fast."

**Why this file exists (from the `design-log-38-0724` retrospective):** Claude carries broad "best
practices," but a best practice is a *prior*, not a decision — the right answer is that prior *conditioned
on John's goal, constraints, and what "good" means for DeepBench*. Claude kept applying generic priors over
John's specific context and defending them. This file captures the criteria so a *fresh* session conditions
on them up front.

---

## The seed set (`design-log-38-0724`)

**1. Eliminate a problem; don't bound or accept it.** When Claude offers "accept the bounded/rare
downside," John's default is to remove the downside entirely if there's a way. *Seen in:* Claude proposed
living with bounded config-drift on history; John chose to backfill+freeze so drift is gone, not managed.

**2. Data-driven over code — hardcoding is the platform's premise to remove, not a convenience to weigh.**
Prefer a data row + one generic mechanism to N special cases in code. Adding a thing should be a data
insert, not a code deploy. *Seen in:* Claude defaulted to a per-pattern `CASE` ladder; John: "if the format
is the same, why per-pattern code?" → one generic `signature @> criteria` match, patterns as data.

**3. Stable / reproducible output beats convenient implementation.** Numbers and displays must not silently
change run-to-run or as internals shift. This outranks Claude's instinct to minimize storage or avoid
"redundant" work. *Seen in:* the whole reason the AI-Audit counts had to be deterministic, and the push to
*freeze* the signature rather than re-derive it live where drift could move it.

**4. A best-practice prior is conditioned on the goal — name the contextual exception, don't apply the
rule dogmatically.** "Don't store derived data / avoid staleness" is real, but had a genuine exception
here. *Seen in:* Claude locked "runtime, not stored"; John saw that a *write-time fact snapshot* is
consistent with facts already captured that way AND kills drift — so the rule's exception was the right
call. When a locked prior collides with the goal, the collision is the finding, not the rule.

**5. Model how work actually enters the pipeline, not just the design.** A settled piece of work needs the
*artifact that makes it invokable* — in DeepBench, a ticket ID — created now, or it's invisible. Design the
workflow, not only the architecture. *Seen in:* Claude proposed deferring ticket IDs; John: without an ID,
"how does it get invoked into a session?" → claim the IDs now, kickoffs later.

---

## Mechanism and architecture

**6. No pre-wired destination anywhere — a delegation or backup decision is live, traceable, logged model
judgment.** A fixed relationship fails the sniff test *even when stored as pure data*, and a "generic"
harness-level lookup is the same violation one layer down. *Seen in:* Claude proposed `available_delegates`
with `executing_agent_id`/`critique_agent`, then a harness lookup, then a pre-wired `capability_slug` fast
path; John rejected all three — "any backup/delegation decision must be traceable model judgment, logged"
— and the rule became `ARCHITECTURE.md` §19d's sniff test, where "a static or pre-wired destination fails
the test even as pure data."

**7. Fix agent behavior in the agent's own Skill content, not in the harness loop.** Caller-specific
branches and loop special cases for one agent's failure are the wrong layer. *Seen in:* a misrouted
news-card question could have been patched with caller-specific routing; John's constraint put the fix in
`ci-routing-intent.method` — "make the agent smarter, not change the loop rules" — which also covers any
future question of the same shape. Restated as a standing constraint on the `SES-29` fix wave: "when a fix
touches an agent's Skills, look there first."

**8. Fix at the narrowest layer that actually works — Supabase content and existing patterns before code,
and never widen the shared harness when a data-level change suffices.** *Seen in:* for the news-card
hand-off John's call was to "use the existing display-request pattern rather than widen the harness
envelope or add a content service" — 3 Supabase rows and 1 screen file, zero harness change.

**9. Never spend a model call where a deterministic mechanism serves.** Defaults, frames, and envelopes
are data or code; the model authors content only, and an honest blank beats a guess. *Seen in:* Claude
proposed a retry-once model call to recover a blank intent echo; John — "can you just pick the first intent
so we dont have to do a model call?" — and the shipped fix resolves it from the harness's own roster.

**10. When a correct value already exists deterministically, no model may be put in charge of it — and
after two failed instruction-level guards, go structural, never a third wording.** *Seen in:* two
instruction-only guards (`DAT-7`'s Nadia, `AGT-37`'s Elena) both lost to id-shaped decoys; John constrained
the next session to the structural options — "if the correct value is already known, no model touches it"
— so ids travel as data, never through a model.

**11. Never hardcode content judgments into the repo.** Banned-phrase lists and acceptable/unacceptable
content rules are an agent's governed judgment, not a static file. *Seen in:* Claude proposed a Platform
Service holding a banned-phrase list, citing `HAR-21` as precedent; John's challenge sent Claude back to
the code, which showed every precedent validated *structure*, never content — proposal withdrawn.

**12. The screen authors no content and holds no content policy.** *Seen in:* a screen-rendered fallback
line ("No input at this time") was designed and signed off; John overturned it — "it renders what the agent
returned and authors nothing" — and the session's defence of platform-authored copy is recorded in §19j as
a rationalization.

**13. Platform code is agent-agnostic, and every agent speaks in its own voice.** Code names no agent, and
nobody narrates anybody else's work. *Seen in:* John's ruling on the Assembly content failures —
"The code we create is agent agnostic — every agent must obey its functionality ask" — locked the receipt
contract: the requester authors the ask, the doer authors the account.

**14. When two code paths compute the same thing, build one shared core they both call.** Documenting the
divergence is not a resolution. *Seen in:* two independently-built aggregations over `ai_activity_log`
agreed only by coincidence; John's call was to "build a shared aggregation core, not just document the
divergence."

**15. A centralizing module must own the entire duplicated seam end to end.** If callers still update N
files or retain steps, it is not centralization — widen it until divergence is structurally impossible.
*Seen in:* Claude scoped the Article Context Resolver to a payload assembler leaving steps 3–4 duplicated
in both callers; John: "you are creating a service and still have to update 4 files? what are you
centralizing then?"

**16. Tracking systems must be self-maintaining.** New real data surfaces automatically; a hand-maintained
catalog that goes silently blind on uncatalogued reality is the bug. *Seen in:* static `SERVICE_CATALOG` /
`PATTERN_CATALOG` made any uncatalogued real slug invisible in AI Audit; John's ask framed the platform
rule — "if another AI pattern is used, it updates our system, not hardcode to something else."

**17. Extend a structure that already fits rather than standing up a parallel one.** *Seen in:* the IP
access gate's design space included a separate whitelist table; John keyed everything off the existing
`ip_org_cache` (one row per IP, `country` already present), adding columns instead.

**18. Prefer a fixed declared constant over runtime measurement when the fixed value is stable by
construction.** *Seen in:* keeping canvas cards clear of fixed chrome could have used runtime DOM
measurement; John chose a static reserved band — "cheaper, can't drift out of sync with the chrome."

**19. Gate a dangerous operation through an atomic correct path rather than hard-blocking it.** A hard
block that contradicts locked architecture turns every legitimate correction into the defect being fixed.
*Seen in:* for baseline-row retirement John chose gate-don't-hard-block — an agent may retire a row, but
"only through an operation that lands a replacement in the same transaction."

**20. When failures compound across a many-call pipeline, build one generic automatic-recovery layer
rather than chasing per-cause fixes.** *Seen in:* a census of 145 failed hops showed ~150+ calls per run
where any one kills its question, so per-cause work can never converge; the decided constraint was "one
automatic checkpoint-resume recovery per transient hop failure before anything surfaces."

**21. Prove a risky mechanism in an isolated POC that leaves the real code path untouched, before
retrofitting it into core infrastructure.** *Seen in:* with the execution substrate failing on the 60s
ceiling, John's call was to "prove checkpoint-and-resume across invocation boundaries via an isolated POC"
— the real retrofit was green-lit only after it proved out.

---

**101. Before committing to a novel mechanism, research how the industry does it and say which you are
proposing — a standard practice or a homegrown solution.** *Seen in:* designing the Conversations RAG
store, John's gate before the kickoff — "What we are propsoing, is it industry standard best practice for
multi-agent platforms? Research first and tell me if this is just our solution vs how others do it." *(local
archive `7ad2c4ae-cf0c-4727-8cbd-03ff21829b83.jsonl`, 2026-07-22)*

**102. Existing code is not evidence of intent — when the goal and the code conflict, condition on the goal:
rewriting is ok, and even the architecture doc may be wrong.** For foundational definitions, start from
published best practice outward, then make architecture and code fit. *Seen in:* John naming the root cause
of a two-day misalignment — "you also are sticking to your roots based on what the code is telling you" —
"and perhaps the architecture doc is wrong"; then, redefining pattern tracking: "i need you to stop looking
at existing code or current md documents to define this." *(local archive
`28a6f45d-e8d3-404c-912e-e630cc1b01cf.jsonl`, 2026-07-21)*

**103. External input — an article, a question, anything from outside the Library — travels intact through
the whole agent chain; any agent may verify the original, none is required to.** Never solve a provenance
gap by handing the artifact to named agents. *Seen in:* rejecting "give owen and marcus the article" as
hardcoding, John restated the class rule — "carry that information all the way through each agent
routing/orchestration" — with acceptance of the summary allowed. *(local archive
`aba9b6b9-7e86-4fee-a34d-afbb55f95082.jsonl`, 2026-07-21)*

**104. When an agent catches bad or missing content, the correction routes back to the producing agent to
fix and iterate — never patched downstream and never handed to the user as their problem.** *Seen in:* on a
hallucinated-numbers catch — "it needs to send that information back to the previous agent and tell them to
fix it"; surfacing the block to the user instead was ruled a failure of the platform's premise. *(local
archive `aba9b6b9-7e86-4fee-a34d-afbb55f95082.jsonl`, 2026-07-22)*

**105. Telemetry and attribution are best-effort — a declined cookie, a failed capture, a missing consent
never blocks or errors the product path.** *Seen in:* on visitor logging when a user rejects cookies — "the
system continues and does its best logging anyways? i don't want the platform to error out." *(local archive
`52a3da2a-35bc-4c1d-a97c-34248300fcec.jsonl`, 2026-08-01)*

---

## Diagnosing and fixing

**22. No blind fixes — root-cause measurement comes before any fix ships.** A plausible theory is not
enough. *Seen in:* a `max_tokens` bump shipped on theory with no A/B and measurably changed nothing; John
made it standing — "no fix ships without root-cause measurement first, going forward" — and the real cause
was found by capturing the model's raw output on a failing call.

**23. Verify the premise against live data before designing a fix, and demand a concrete
currently-occurring case.** *Seen in:* John's questioning during `SCA-2` scoping — "pointing out the
described scenario 'is not happening at this time'" — forced a live check that disproved the timeout
premise (1 real timeout in ~1,370 calls) and moved the row to `FEATURES-NEXT`.

**24. Never fix a systemic defect with a per-agent or per-site patch — one agent's anomaly implicates the
shared mechanism.** *Seen in:* Claude proposed editing one agent's `method` to point Jordan at
`task_description`; John — "why would we have to create a new one for one agent?" — named it a per-agent
patch that leaves the hole. On the footer-alignment bug the same instinct: "John's explicit call: fix the
pattern everywhere, not just the one card."

**25. When the same logic recurs at multiple sites, build one central shared service.** *Seen in:* Claude
proposed instrumenting timing at individual call sites (21 `logEvent` sites); John redirected — "this
should be a central service, not something hardcoded in multiple places."

**26. When fixes keep surfacing whack-a-mole, stop patching instances and build the mechanical check that
catches the whole class.** *Seen in:* after a day of one-at-a-time AI-logging fixes still missing things,
John directed a full architectural sweep whose deliverable was a static coverage-check script — "build the
mechanical check, don't just fix the list."

**27. Fix the root cause that makes the wrong path easier than the right one; a detector is separate,
second work.** *Seen in:* offered cause-fix versus detector for the `SES-18` ID-collision class, "John's
call: fix the *cause*, not add a detector" — drift detection was filed separately as `SES-38`.

**28. Scope an intervention only to where a failure is actually measured, and remove any target included
on assumption.** *Seen in:* Claude attached the platform-language guardrail broadly including
`channel-intelligence`; John challenged the scope and "the challenge produced the right answer:
re-checking the evidence" showed Marcus's answers never failed the criterion — the attachment was detached.

**29. Before declaring work blocked, separate whether the data is genuinely unreachable from whether the
access path you chose is merely too expensive — and re-measure a cheap variant.** *Seen in:* Claude
concluded per-pattern costs were blocked on `LOG-99`; John — "so you are saying we can't get a cost to each
pattern until log-99 is fixed?" — and the existing rollup traversal returned the ids for +32 ms, because
"the mapping was never unobtainable, it just must not cost a second traversal".

**30. Run the measuring instrument before scheduling fixes — backlog rows are suspects until a live run
convicts them.** *Seen in:* with 16 bucket-1 rows queued, John ruled no fix sessions start until the
`SES-29` regression run produces its failure list, because most recorded failure rates predated `HAR-17`'s
auto-recovery: "the 16 rows are suspects, not a queue."

**31. When a workaround would misrepresent the real mechanism, take the architecturally correct fix even
though it costs more.** *Seen in:* presented with the `logAgentTurn()` pattern-data gap, John — "i am not
sure of my options. i want the real deal" — chose the harness fix over the frontend workaround; same call
on Nadia's raw-markdown card.

---

**106. Before removing anything that looks vestigial, find why it was added — name the bug that returns if
it's gone.** *Seen in:* asked to delete a suspicious canvas element, John's condition — "there was a reason
that was added, first find out, because if you remove, what bug will kick off again?" *(local archive
`8b29a9b3-cf3f-4345-8cbf-6248c9ae0df5.jsonl`, 2026-08-01)*

**107. When one instance fails where its siblings work, diagnose from the working siblings — suspect a
hidden special case on the failing one, not a new mechanism.** *Seen in:* John's own differential on the
Michelle status bug — "if this works for all agents, why is michelle the only agent not working — is
something hardcoded"; the same instinct on the new-agent hop failure ("how come all the other agents are
hopping correctly"). *(local archive `7ad2c4ae-cf0c-4727-8cbd-03ff21829b83.jsonl`, 2026-07-22)*

**108. When shipped behavior diverges from the design language John approved, diagnose why the build lost
the intent and add a fidelity check — re-fixing the output alone is not the fix.** *Seen in:* the run-list
receipts shipped flat against an approved rich example; John's ask — "how do we make sure you follow
original design intent?" — and the session adopted the fidelity-check rule alongside the content fix.
*(local archive `49890d86-290b-4057-ba22-76d54d40977b.jsonl`, 2026-08-03)*

---

## What the platform is allowed to display

**32. Attribute a fact from what the call actually did, never from declared configuration.** A declared
field is a propensity, not evidence that the thing fired. *Seen in:* `sendRequest()` spread a declared
`intent_technical_services` list into `patterns_used` on every call; John's objection established that "a
pattern must never require a Supabase-declared field to be logged," and the fix reads the real per-call
booleans.

**33. If it can't be verified, don't show it; if it can, show it.** *Seen in:* John's rule for the 659
pre-fix rows whose patterns couldn't be trusted drove a `PATTERN_VERIFICATION_CUTOFF` so unverifiable
history stops displaying — "if it can't be verified, don't show it; if it can, show it."

**34. Render honest absence.** Never a fabricated zero, a padded group, or a parallel display that papers
over incomplete data — a visible gap is correct, an invented value is a bug. *Seen in:* John rejected a
proposed "Operations" group in the Agents drawer, "rejected as a parallel display papering over incomplete
classification"; on orphaned embedding calls his call was to "accept as unclassified" rather than force a
category.

**35. Every displayed number is live-wired and self-updating from its real source; show an em dash when it
hasn't resolved.** A confident wrong number — especially `0` — is worse than showing nothing. *Seen in:*
"John's rule: every number live-wired and self-updating" for the About metric grid; and on the `LOG-36`
About tile that rendered a confident wrong `0`, his call was to revert the tile rather than ship it.

**36. Displays enumerate what the logs actually contain; catalogs only supply names.** Never seed a display
from a catalog, and never build a reconciliation bridge to make old labels fit. *Seen in:* Claude concluded
`LOG-36` was blocked on vocabulary anomalies (13% match rate) and offered a bridge table; John rejected the
premise — "for all displays, it should only show patterns that have logs" and "The list of logs in the
display should be dynamic by what is available" — collapsing the fix to one line with no dependency.

**37. Treat pattern and service catalogs as provisional records of what is currently observed, never a
golden fixed standard.** *Seen in:* after Claude proposed hand-adding catalog entries, John stated they
"shouldn't be treated as golden — should be evaluated for retirement" (logged as `LOG-25`).

**38. An audit or spend surface counts everything that really happened — never narrow to a convenient
scope filter.** *Seen in:* Claude's fix for the AI Audit header undercount was to filter the views down to
`tenant_id='global'`; John's counter — "they actually called the model, correct?" — was adopted instead and
the header came up to all tenants.

**39. Every displayed count carries one explicitly chosen real-world semantic, applied consistently
wherever that entity appears.** *Seen in:* the CHI Agents drawer counted raw rows while AI Audit counted
model calls; John's call was "adopt AI Audit's definition — the drawer is keyed by agent," while By Service
deliberately keeps operations semantics as his documented, approved asymmetry.

**40. Two surfaces showing the same meaning must show the identical number; two surfaces showing genuinely
different meanings may differ — but then name each meaning precisely.** A small "expected" discrepancy
between surfaces measuring the same thing is a bug, not a subtlety. *Seen in:* on the hop caption John set
an unambiguous bar — "the label's number must always be the exact same number as the real last hop number
in Column 3" — overruling a lag previously archived as expected semantics. On the canvas-versus-engaged
counter, which measure "addressed" and "actually spoke," he confirmed the two are "allowed to disagree
('its ok with the split')."

**41. Never exclude real work from a user-visible count, and measure every unit of work — no permanent
"non-measurable" exception lists.** *Seen in:* Claude proposed excluding a background news-fetch hop from
numbering; John corrected it twice before the kickoff. On the 6-type `NON_MEASURABLE_EVENT_TYPES` list he
chose measure-everything on principle: "a hop is an instance that has work and time, no matter how brief."

**42. Never display deterministic plumbing as an agent acting.** If the screen credits an agent with work,
the agent's model must really have done it. *Seen in:* the run-start evidence fetch was hardcoded plumbing
rendered as Eleanor Voss acting; John's direction made it real — the requester's model reasons the need,
asks through the broker, and writes its own cited answer.

**43. Capture the real value in the data; apply masking only at the display layer.** Never destroy data at
write time to solve an exposure problem. *Seen in:* remediating the public IP leak, Claude weighed hashing
at capture; John: "make sure you are logging the real thing, you can obfuscate the ip address in the
viewer" — the raw column went service-key-only with a masked generated column for the frontend.

**44. When one output aggregates inputs of different trust tiers, resolve the whole to the weakest
contributing tier.** *Seen in:* `confidence_tier` split three ways across identical runs because no
resolution rule existed; John's direction fixed it as weakest-link — "one `synthesized` citation makes the
whole answer `synthesized`, never averaged up."

---

**109. Credit a behavior from the attempt, not the yield — a retrieval that returns zero rows is still a
real retrieval and earns its pattern credit.** *Seen in:* ruling on RAG attribution for empty vector
queries — "If you are attempting vector, then that is RAG" — because the agent "did query the vectors no
matter how small and should get credit." *(local archive `06603750-da50-4dde-90a9-534efb93930b.jsonl`,
2026-07-25)*

**110. Every displayed content element has a stateable provenance — hardcoded or agent-authored, and by
whom; when a surface is under review, present that as an explicit per-element matrix.** *Seen in:* John
demanding the source column twice on the assembly review — "i can't tell what is hardcoded for routing vs
assembly, can you recreate matrix and have a column for both" — then "What is the source of the hardcode for
each? Who created that content?" *(local archive `32d57824-c785-48d9-a89a-0070b8ec726a.jsonl`, 2026-08-07)*

**111. Never place John's personal contact details on a public surface — no email buttons, no direct
contact links; real users will know how to reach him.** *Seen in:* approving the spend-gate popup except one
element — "Don't have the email button. The true users will know how to get a hold of me. I don't want to
expose my email to everyone." *(local archive `2d6d2c59-f11d-4ce5-b613-e232389ae544.jsonl`, 2026-08-08)*

**112. Any number that leaves the platform — a post, a pitch, a public claim — is verified against its
source first and shipped with its defense: how it was measured, what counts, and the confidence.** *Seen
in:* before the LinkedIn metrics went out — "you mentioned verifying the metrics in the post. can you double
check and state how i can defend if asked" — which produced an end-to-end trace spot-check. *(local archive
`80539f2b-7273-4dd7-b766-3a716d4a73e6.jsonl`, 2026-07-24)*

---

## The user's experience

**45. User-facing surfaces show real activity only — no back-office mechanics, no roadmap placeholders, no
capture-boundary caveats.** The user screen is a product surface, not an engineering console. *Seen in:*
Claude mocked up capture-start boundary copy on the audit label, drawer footer, and an explanatory note;
John cut all of it — "too much info for the user about back office things" — and explicitly kept the ugly
reclassification count at full value rather than explaining it away.

**46. Write for a first-time user in plain activity narration — remove the jargon rather than adding a
legend to explain it, and keep the real substantive detail.** *Seen in:* Claude proposed a legend for
`confidence_tier` jargon; John's call was no legend at all and a rewrite of every pipeline-log case "to
plain activity-narration copy a first-time user would understand" — then, after an over-aggressive cut,
confirmed that real critique and escalation detail stays.

**47. Agent-voiced copy is a live, tailored generation in that agent's own voice — a static placeholder
fails the premise.** *Seen in:* `CHI-03a` shipped an interim static acknowledgment; after comparing static
and live mocks side by side John ordered real Marcus-voiced Intent Skills — "this has got to feel like you
are talking to a person."

**48. The system must visibly look alive while real work is happening.** A quiet or static window during
activity is a defect, not missing polish. *Seen in:* John repeatedly flagged static canvases, badges and
tabs — "it's not pulsing — the system does not look like anything is moving" — driving the badge pulse,
boot dial, answer cues and mobile bench pulse.

**49. Show the whole concurrent web while a run is live, not a spotlight; save prioritization and fading
for the settled post-run view.** *Seen in:* Claude's `LAV-5b` design lit one edge at a time; John's own
design animates every traffic-carrying edge simultaneously — "so the user sees 1 agent's loop requires all
N amount of agents talking at once" — and in `LAV-12`, "everytime a line is active it shows its name."

**50. A finished state is actively signaled until the user engages with it — never a one-time flourish or
a silent revert to idle.** *Seen in:* Claude had shipped a 3-second timeout reverting the "Complete" badge
to the idle look; John renamed it "Question Answered" and specified a continuous pulse "so the user knows
they can look at all the ending metrics."

**51. A failure lands in a visible, still-actionable state the user decides on — never a silent revert,
reset, or dead end that discards their context.** *Seen in:* offered revert-to-`pending` (zero new UI,
matching precedent) versus a new `accept_failed` status, John chose the visible state despite the extra UI
work — "give feedback to the user, and let them decide what to do next."

**52. Every human-in-the-loop decision point carries one identical signal, and shipping the new standard
means deleting every old variant.** *Seen in:* drawers signaled "pending" three different ways; John
answered two case-by-case questions with one principle — "remove all the old and go with the new. concept
is all decisions requiring hitl look the same so the user is not confused."

**53. One object gets one name everywhere the user sees it.** Vocabulary consistency beats context-dynamic
labeling, even when the dynamic labels were previously approved. *Seen in:* `CHI-49` shipped
intent-dynamic drawer titles John had confirmed at the time; after a live screenshot showed "one forecast
flow used six nouns for one object" he overturned his own earlier approval for fixed titles and a single
vocabulary. Same instinct on the dividers: literal "New question" everywhere, "John's explicit call, no
per-trigger copy."

**54. Each container holds exactly one kind of thing, and produced artifacts persist — resolution collapses
them, never destroys them.** *Seen in:* the single Theory drawer mixed candidate theories with the eventual
result; John's "papers on a desk" principle split it into Candidates and Result, matching every other
Evidence drawer.

**55. A visual boundary in a log or feed maps to a meaningful transition, not to a raw event.** *Seen in:*
the Agent Routing log rendered one bordered row per raw event; John's call defined the grammar — "a new
line should mean a hand-off happened, not an activity" — so consecutive same-agent events group into one
turn card and the count counts hand-offs.

**56. Displayed metrics must match what the user actually experiences — never blend structurally different
operations into one average.** *Seen in:* "John questioned why Marcus showed `4.1s` when he was personally
seeing 30+ second waits," and the blended stat was replaced with a by-kind breakdown.

**57. Size the vocabulary to what actually occurs live — cut legend entries and states that never render.**
*Seen in:* Claude's proposed settled-view design got a flat "no"; walking each legend element's real
trigger conditions showed most never fire, which explained John's observation — "all I ever see is two" —
and produced a 3-chip legend.

**58. For an attention cue, take the more noticeable treatment.** *Seen in:* offered a quieter brass-wash
middle option alongside solid fill for `MOB-19`'s armed Answer tab, John chose solid — the same instinct as
the continuous pulse in `LAV-9c`.

**59. A treatment shipped on one platform is mirrored on its sibling surface in the same pass, or filed
immediately.** *Seen in:* after approving the desktop Answer-drawer armed treatment John said in the same
conversation, "make sure mobile does that too."

**60. Decision controls live on the decision surface at the decision moment.** *Seen in:* "John's explicit
call: all decisions/interactions stay in Evidence only," with chat receiving the enriched card only at
resolution; in `MI-66` he moved the whole decision block to the top because the override warning "belongs
to the decision moment, not the whole flow."

**61. When the exact requested styling can't render uniformly across platforms, present the trade-off — he
takes the version that renders identically everywhere over a partial version of his ask.** *Seen in:*
asked for italics on the guardrail picker label, which native selects can't do on iOS, John picked literal
caps: "caps render identically everywhere and were John's pick when offered the trade."

**62. Approved UX outranks an implementation-efficiency saving.** *Seen in:* the `HAR-33` coding agent
omitted the stats RPC on the blocked-path popup as an efficiency call; the design session reversed it —
"approved UX outranked the saved RPC" — because John had approved the popup *with* its stats tiles.

**63. When gating access or spend, block only the cost-incurring actions and keep read paths open.** *Seen
in:* `HAR-33`'s gate lets OPTIONS and read endpoints pass ungated even for blocked IPs — "browse stays
open while blocked, John's vision" — and the popup offers "Keep browsing."

---

**113. A deliberately empty section stays visible, carrying the agent's own stated reason it's empty —
silent omission reads as an oversight.** The line is agent-authored (the screen still authors nothing), and
an occasional lapse is monitored, not screen-enforced. *Seen in:* on empty analysis sections — "If its not
shown, it may appear to have been overlooked" — with the agent stating why; "and if she forgets, that is ok.
We will catch it a future session with an agent guardrail." *(local archive
`673a6369-709e-4dd7-aecd-7cbe74db85aa.jsonl`, 2026-07-23)*

**114. Agent copy defines a term or abbreviation at first mention — the first sentence establishes the
definition and the abbreviation, and only then may the short form recur.** *Seen in:* the EMEA correction
on `CHI-19` — "the first sentence must establish the defintion and the abreviation." *(local archive
`0259eaca-6c7c-4a00-b068-d8ff2bbd0bad.jsonl`, 2026-07-17)*

**115. Recurring visual elements keep stable positions run-to-run — the user builds muscle memory for where
things live.** *Seen in:* the mobile bench spec — keep agent avatars "relitvely close so they always appear
near the same location in every run so the user gets used to seeing them in the same place." *(local archive
`6953a897-ca3a-4229-a11e-df74b578ad81.jsonl`, 2026-08-01)*

**116. A self-recovered failure is narrated honestly in the live status stream with an updated expectation —
never hidden, and never promoted into the artifact drawers.** This is the deliberate boundary on the
no-back-office rule: recovery status is user-relevant in the moment; drawers stay artifact-only. *Seen in:*
on `HAR-17` auto-recovery display — "do not put in drawer that status… its ok to let the user know you hit a
snag and selfed recovered", plus adjusting the expected time "so the user knows its ok." *(local archive
`b9b0773a-9eac-4bc8-9b5d-a8265529f3b0.jsonl`, 2026-07-28)*

**117. A run view must show what each agent tangibly delivered toward the final artifact — visible
choreography without visible output fails the premise.** *Seen in:* John's house-contractors framing of the
console gap — "All we have is the question, a bunch of busy agents, then a final ouptut" — which drove the
per-agent receipt design. *(local archive `49890d86-290b-4057-ba22-76d54d40977b.jsonl`, 2026-08-04)*

**118. A platform-wide vocabulary word must not collide with an existing surface or product name — check the
namespace before proposing it.** *Seen in:* naming the screen journey concept — "i don't want to use the
word workflow as a name across the entire platform, because we have a project management screen." *(local
archive `027e7f3c-54eb-4ad7-b796-f5aa808332d0.jsonl`, 2026-07-25)*

---

## Scope, sequencing, and the backlog

**64. One session works exactly one issue; everything else surfaced becomes its own backlog row.** *Seen
in:* on the AI Audit triage John directed that "this session is `LOG-15` only, all other issues will be
worked in a separate session"; he split `CHI-09`'s two bundled fixes and worked only the first.

**65. Default to the narrowest fix that resolves the flagged issue and park the general mechanism as a
separate ticket.** *Seen in:* for the news-fetch status wipe, "John chose option A over a general
owner-token model"; on `MI-62` he chose copy-only, "deferring the behavior change as a separate, bigger,
unscoped option."

**66. Cut a proposed build down to the minimum immediately-useful slice actually asked for.** *Seen in:*
Claude's mobile Spend Analyzer mock covered 3 screens; John narrowed it across several rounds — "could we
just do the analysis dashboard, and the add file - column layout?" — to 2 pages, upload-only.

**67. Every proposed cap, knob, or extra element must justify itself against a bound that already exists.**
*Seen in:* across the four-surface display standard, the record is "John cutting my proposal down each time
to something simpler"; in `LOO-28` his "why do we need a limit?" showed the proposed fan-width cap was
redundant with the existing hop pool, and it was dropped.

**68. Prefer the simple mechanism that works today over scoping to a dependency that hasn't landed.**
*Seen in:* asked whether the feature-flag override should wait for per-user scoping once Clerk lands, John
answered "url overide is fine" — URL override now, "no per-user scoping, no waiting on Clerk."

**69. Rank work by the priority axis John has currently named, not by generic severity labels.** *Seen in:*
`AA-191`, a write-bypass previously flagged urgent, moved from `now` to `next` by his explicit call — "not
currently worried about wrong-content-storage risk, Continuity is the actual priority right now."

**70. Taxonomy purity yields to his real prioritization workflow.** An ID scheme exists to let him batch
and triage, not to satisfy classification principles. *Seen in:* Claude recommended a `Type: Mobile` tag
per the inventory's own "ID = where, Type = what" rule; John overrode it and kept a `MOB` ID prefix — "It
helps me prioritize - i consider fixes for it as a single entitiy."

**71. Developer tooling never gates a release, however useful.** The ship board holds only what a reviewer
can see. *Seen in:* Claude added `SES-36` to `BETA.md` §2b; John directed its removal — "developer tooling,
invisible to a reviewer, so it does not belong on the beta board."

**72. The 3-file cap is John's to waive, never Claude's — ask when splitting would lose real value.** *Seen
in:* the `dispatch_latency_ms` column needed a fourth file; "John approved 4 files over the 3-file cap
rather than lose the measurement," and the same waiver recurs in `HAR-15`, `SH-23`, `LOG-36`, `LOG-67`.

---

**119. Optimize for showcase quality that survives expert scrutiny, not for a date.** *Seen in:* handed a
long pre-Apple fix list — "we are not going for a deadline, we are going for the best showcase of my
abilities that will not be scrutinized." *(local archive `28a6f45d-e8d3-404c-912e-e630cc1b01cf.jsonl`,
2026-07-20)*

**120. When the central mechanism is future architecture rather than a current fix, ship the working
per-instance version today and file the normalization as its own ticket.** *Seen in:* on format skills —
"right now all agents can have their own format skill", then "go with what works for now, and make a next
bucket ticket for the format future." *(local archive `027e7f3c-54eb-4ad7-b796-f5aa808332d0.jsonl`,
2026-07-27)*

**121. Don't re-architect a process that just stabilized — a working process's stability outranks a marginal
optimization.** *Seen in:* declining a process refactor the same day the session pipeline settled — "we
spent over 6 hours today to get where it is now, and it seems to be working ok." *(local archive
`567941f2-a34c-49c8-9201-29e8d50d41e1.jsonl`, 2026-07-24)*

**122. When a mechanism needs days more to finish, stop and audit it for over-engineering before continuing —
ask whether a leaner mechanism gets the same value.** *Seen in:* mid-build on the pattern pipeline — "tell
me if my ai audit log writer and displayer and pattern definer has been over engineered. Knowing its going
to take minimum 2 more days to fully build out, is it really worth it?" *(local archive
`610c3047-0cc3-4dab-8a7f-498690f97388.jsonl`, 2026-07-25)*

**123. The objective function is a platform that scales and generates fewer future tickets — never
closing the current ticket.** A fix that closes a row while leaving the class open is optimizing the wrong
thing. *Seen in:* John's charter for the working-relationship review — "your goal is not to close a ticket,
but to create a more efficient platform that scales and creates less tickets." *(local archive
`6cb78f08-92b1-416a-873c-370421999476.jsonl`, 2026-07-29)*

**124. A bug that a new feature itself introduces is fixed inside that feature's work before it ships —
filed tickets are for pre-existing gaps, not self-made ones.** *Seen in:* setting the automation rules —
"i have seen you create a list of bugs as tickets, instead of just fixing those as part of the new feature -
i want to keep new bugs appearing from new features at a minimum." *(local archive
`323a6e02-475b-45c4-83e8-2713b2a345b0.jsonl`, 2026-08-19)*

**125. Choose the model by total economics inside the budget cap — when a cheaper model will grind for
hours, a short run on the expensive model is the cheaper choice.** *Seen in:* the automation cost rules
($100/month cap) — "know when 4 hours of opus is not worth 30 min of using Fable instead." *(local archive
`323a6e02-475b-45c4-83e8-2713b2a345b0.jsonl`, 2026-08-19)*

**126. Batch pushes to ship points — never push per-ticket or per-finding.** *Seen in:* the same
automation-rules session — "you can save your pushes and aggregate - i have notice the number of times you
push is too much." *(local archive `323a6e02-475b-45c4-83e8-2713b2a345b0.jsonl`, 2026-08-19)*

---

**137. P1–P4 are pull tests, not category labels — administrative expectations never qualify.**
P2 - Inventive requires hard-to-replicate uniqueness ("easy to replicate" disqualifies); P4 - New
Customers requires functionality that makes a customer say *"I have to buy this"* — a capability
customers merely expect (accounts, admin screens) wins nobody and classifies by its actual function
(P5/P10). Conversely, a genuine FAANG-showcase read promotes to P1 - Improves John's Skills. *Seen
in:* live design conversation 2026-08-21 (`p1p3-now-review`) — John reversed Claude's classes on all
three reviewed tickets: ADM-1 "more or less 'administrative' expectations — it would not make my
product unique in the industry - easy to replicate" (P2 → P10 - Tooling); LOG-126 "would not bring
in new customers. Again administrative… I am looking for functionality that would make a customer
say 'I have to buy this'" (P4 → P5 - Enhancements); "I think AGT-015 would showcase me for FAANG"
(P2 → P1 - Improves John's Skills).

## Testing, QA, and ship gates

**73. A regression run passes only when every case delivers its final business outcome end-to-end.**
Harness survival, or correctly-classified failures, is not success. *Seen in:* Claude's 23-question run
reported a clean in-range result; John rejected the definition outright — "that is not what I am expecting
in a regression test. This is a failed test." — because only 13 of 23 reached a deliverable.

**74. A guardrail rejection is never an acceptable expected outcome — every block is red and gets probed.**
*Seen in:* Claude proposed "informative rejection" as an acceptable baseline outcome class; John — "I don't
accept the rejections… sometimes they work" — set any block as red plus a multi-try probe measuring the
accept/reject ratio.

**75. A ship gate's false green must be structurally impossible, not merely documented against — and scope
caps yield to that.** *Seen in:* between two fix shapes for regression tests that exited 0 without running,
John chose making bare `node <file>` invocation real, explicitly waiving the 3-file cap: "a ship gate needs
the false green to be *impossible*, not just discouraged."

**76. A test run never mutates working data — scope tests read-only over tagged data rather than resetting
or cleaning up after.** *Seen in:* Claude proposed a Demo Reset so regression runs would see a clean
corpus; John insisted three times — "We don't want to change existing data flow" and "a regression run must
never mutate working data" — because a reset would rewrite a corpus a live screen was reading mid-session.

**77. When a QA item genuinely cannot be verified directly, name it, present the indirect evidence, and get
an explicit go-ahead — never silently pass it and never silently skip it.** *Seen in:* the Vercel
function-log check couldn't be verified that session and was "accepted on indirect evidence (clean 200
responses, no errors) per John's go-ahead."

**78. Match verification depth to change risk, and surface the trade-off rather than deciding it
silently.** *Seen in:* with no `.env.local` in the worktree the session offered John three options; he
"explicitly chose to accept the build/test/live-Supabase evidence as sufficient" for a one-line formatter
change.

**79. A feature whose live test exposes an unresolved safety gap is reverted, not shipped on top of the
hole; the structural fix is tracked separately.** *Seen in:* `MI-53`'s Category L test twice let Michelle
route a formatting request to a write-capable agent, producing a real unconfirmed Library INSERT; the
session presented the finding rather than deciding, and John's call was "revert `MI-53` now, keep
`MI-54`."

**80. Spend caps and budget walls are John's protections alone.** A session blocked by one reports and
waits; it never raises, resets, or routes around the limit. *Seen in:* QA spending tripped his $10 IP spend
cap and 403'd every model call including his own browsing; the session left the block standing —
"Deliberately not changed unilaterally: it is his spend protection" — and he raised it himself that
evening.

---

**127. In an automated run, fix every branch choice to a deterministic canonical pick so runs are
reproducible and comparable.** *Seen in:* locking the true-regression decisions — "always pick the first
theory", then "always take the review path." *(local archive `10aedc75-8ce6-4240-82b8-cb3914650508.jsonl`,
2026-07-28)*

**128. State the dollar cost of a test plan before running it, scope the run to the smallest segment that
answers the question, and sanity-check the estimate against John's own observed per-run cost.** *Seen in:*
the console regression estimate — "you are telling me $100 to test 2 questions, give them 5 tries a piece?"
— against his measured ~$.31/run, collapsing to "how can we regression the 2 runs for under $2?" *(local
archive `49d6eff5-60f7-4a31-9a6e-a41e21694d23.jsonl`, 2026-08-02)*

**129. QA judges the content and context of what was generated, not just that output rendered — a
well-formed answer in the wrong register is a fail.** *Seen in:* failing a receipt that met the format but
missed the register — "QA must test also for context and content what is created." *(local archive
`b26025cf-3c14-4b9c-b19c-8c9c5cd9cbe0.jsonl`, 2026-08-07)*

**130. A regression suite covers every user entry door end-to-end, not just the canonical flow.** *Seen in:*
extending the 23-question suite the moment it was defined — "the 24th, choose an article from the web and
run it through end to end." *(local archive `10aedc75-8ce6-4240-82b8-cb3914650508.jsonl`, 2026-07-28)*

---

## Working with John

**81. Lead with the user-visible problem in plain language — problem, fix, expected outcome, real example;
mechanism, file paths and status codes last.** *Seen in:* after repeated failures John said it directly —
"You keep failing, because you write too much technical at first and i can't follow" — and the
use-case-first template was locked into `WORKING-WITH-JOHN.md`.

**82. Present one concrete use case at a time, never bundled.** *Seen in:* the standing preference on
record is that "John needs proposals broken into one concrete use case at a time, never bundled"; multi-item
UX passes are "9 items, worked one at a time per his request."

**83. Agreement on a session's goal is not sign-off on the specific artifact — walk him through the
concrete content before executing.** *Seen in:* Claude spawned `AGT-023`'s coding session immediately after
committing its kickoff; John interrupted, and the lesson was recorded as "general agreement on the
session's goal is not the same as sign-off on a specific kickoff's content."

**84. For any visible UI change, get explicit approval on a live mock or annotated screenshot before the
kickoff or any code, resolving open questions one at a time.** *Seen in:* `MI-43` "Mocked two options and
got explicit approval before coding," and `MI-27`, `MI-31`, `MI-55` and `SH-19` all resolved live before
code.

**85. Don't gate small, reversible calls on his approval — decide and flag.** Ask-first is for canonical
terminology, shared state, and reversing his decisions; over-asking recreates the fatigue the rule exists
to fix. *Seen in:* John raised that "design sessions have been checking in on too many small decisions
lately" and confirmed the 3-tier default, with the deliberate asymmetry that "defaulting everything to
Tier 3 recreates the exact fatigue this rule exists to fix."

**86. Process, tooling, and hygiene mechanics are fully delegated — decide and execute on best practices.**
*Seen in:* facing ~50 standing-rule compliance gaps Claude prepared to involve him; John: "just fix it
based on best practices, why do I need to be involved."

**87. Canonical terminology is built live with John, in his own words, one term per concept — never
solo-drafted.** *Seen in:* Claude proposed drafting the cross-reference index alone; John's condition was
direct involvement, because sessions "create their own language" and end up talking past him.

**88. Never invent a name for an AI or agent technique — use the real published industry term, verified
against the literature rather than recalled.** *Seen in:* the catalog carried invented labels
(`agent-delegation`, `intelligent-synthesis`, a wrong `transfer-learning`); John's standing directive names
it a repeated frustration — "I have been fighting claude this entire time to quit making up its own
terminology" — and his web-research ask exposed the Structural/Reasoning grouping as invented before it
could be adopted.

**89. When his wording conflicts with the verified current state, surface the discrepancy and confirm —
never silently correct him and never blindly implement the wrong string.** *Seen in:* John's `LAV-14` ask
named a screen title a fresh grep proved doesn't exist; the session asked rather than guessing, since it is
"expensive to guess wrong on a string that becomes canonical," and he confirmed he'd conflated two.

**90. Implement his spec literally — an unrequested extra category, rename, or edge case is a defect, and
his copy ships verbatim.** *Seen in:* shipped code carried a 4th "Internal (QA)" caller bucket "John never
asked for (his own spec was exactly three: him/Claude/public)" — removed and collapsed into Public.

**91. A close-out that ends in a credential or infrastructure chore written in jargon is unfinished work.**
The blocker is the session's to route around, never his to absorb. *Seen in:* `ABT-1b`'s close-out ended
with "This needs John to add the `workflow` scope to that PAT"; he said plainly he had no idea what it
meant and asked
for it to be handled — "a close-out that ends in a credential chore written in CI jargon is not a finished
piece of work" — and the next session eliminated the credential need entirely.

---

**131. A close-out answers exactly two questions first, directly: is the ticket complete, and what
newly-opened work is required — before any narrative.** John had to send the same recovery prompt to six
sessions in one morning. *Seen in:* verbatim, repeatedly — "I am confused. Can you be straight forward with
me. Is log-60 complete, and are there new tickets required for beta?" *(local archive
`1ce79e25-5f52-458a-9889-97dbe45e32f7.jsonl`, 2026-07-29; near-identical prompts in five sibling sessions
the same day)*

**132. State explicitly whether each item is being fixed now or only filed as a ticket — never blur doing
and filing.** *Seen in:* mid-close confusion — "hold on, are you fixing something, or just writing it up as
a ticket to fix?… I am confused on yoru solution here." *(local archive
`044f6d4d-c5fb-480a-9938-f0022b258ec7.jsonl`, 2026-07-27)*

**133. Opening a design session on a ticket returns the ticket's full story unprompted — problem, current
state, history — not a request for more input.** *Seen in:* the session-process review — "when i state an
issue i want to design, i expect it to come back with the full story right away." *(local archive
`567941f2-a34c-49c8-9201-29e8d50d41e1.jsonl`, 2026-07-24)*

**134. Every ticket and kickoff names its model, and any prompt John must launch is handed to him
paste-ready in chat.** *Seen in:* made standing on 2026-07-28 — "from now on, i need for each ticket, either
written in the ticket which model to use, and you tell me which model to kick off the session to use. also,
repost the prompt here so i can copy/paste." *(local archive `0b5f157c-4c1c-41e4-8cc1-d0a6051d51ba.jsonl`,
2026-07-28)*

**135. Never ask permission to run a read-only query that answers the open question — run it and report.**
*Seen in:* offered a data question as an option instead of an answer — "i don't get it. why do i not want
you to run a query to find out this data?" *(local archive `1f29550a-20a7-4792-b0c0-c70cf02cb933.jsonl`,
2026-08-11)*

**136. Every Skill change names the Skill's type and justifies the type choice.** *Seen in:* on a fix routed
through a Skill edit — "each time you update a skill, i need to know the type. It seems you are giving this
a type 'intent'? Why not 'format'?" *(local archive `027e7f3c-54eb-4ad7-b796-f5aa808332d0.jsonl`,
2026-07-27)*

---

## The record itself

**92. Persist every finding and decision where a cold future session will find it — real backlog IDs and
pushed docs, never only the current conversation.** *Seen in:* mid-session John asked "would another
session see this?" and the honest answer was no; `LOG-23`–`27` got real IDs immediately and the work was
checkpointed to `dev` mid-session, because he called cross-session context loss "the bane of my frustration
for 5 days."

**93. Never store a fact in a doc when a live source of truth already exists — point at the source.**
*Seen in:* Claude proposed correcting a stale version number in `CLAUDE-DESIGN.md`; John's sharper framing
questioned why it was stored at all — "if you want to know code numbers, just go to git - not sure why you
are storing it."

**94. When live evidence contradicts a locked rule, surface the conflict and amend the locked section in
the same session — never silently patch against it, and never silently obey it either.** *Seen in:* a
locked style-guide value (5.5px subtitle) proved illegible on a real device; John's call was to revise the
value and "amend Section 24 in the same session, not silently patch against a standing locked rule."

**95. A ticket closes only when every sentence in its own text is satisfied — never discharge residue by
refiling the ticket's own acceptance criterion under a new number.** *Seen in:* Claude closed `AGT-36`
while filing four new tickets, one of which restated `AGT-36`'s own criterion; John — "you think we are
done with agt-36, but you created 4 more tickets required for beta?" — reopened it, producing the standing
test: "does closing the parent leave a sentence in *its own* row unsatisfied?"

**96. When a gap surfaces outside the session's scope, log it with its own ID rather than patching inline
or blocking close-out.** *Seen in:* a Node test failure traced to a harness bug in an out-of-scope file and
the session stopped rather than patching; two attribution regressions found at QA were accepted "as known,
logged gaps rather than block the session."

**97. Restoring data the approved design already intended needs no permission; removing or altering a
visual element does.** Calibrate the approval gate to the change class, not to the fact that a mistake was
made. *Seen in:* a session asked permission to fix its own error; John asked "why wouldn't you make that
change?" and
named the boundary — "Restoring data the design already intended is not an approval-gate case; removing or
altering a visual element is."

**98. Gaps in governed content go through the governed reviewer as evidence-only candidates — never
declared exempt, hand-authored, or resolved by a bare status write.** *Seen in:* facing 17 unnamed hop
shapes, John's call was to file all of them for Susan's live review; "the unnamed schema-emission hops were
not accepted as pattern-less."

**99. Assign a displayed name or classification by a structural rule over provable facts — never by an
agent judging the hop or the model naming its own pattern.** *Seen in:* Claude quietly swapped
"reasoning-derived" for "evidence-derived" and closed the question without asking; put to John directly, he
settled that a hop's name comes from a Layer B rule — "never by an agent judging the hop and never by the
model naming its own pattern."

**100. Curate showcase content from measured run data, and label a deliberately-kept failing case as the
demo it is.** *Seen in:* John chose the console's questions by measured movement and reliability — the
"LAV screen offers only the 3 highest-movement questions" — and in `LAV-11` kept the 0%-pass question on
purpose as the guardrail showcase with an explicit demo-label prefix.

---

### Local-archive corroborations (SES-90 — no wording changes)

The `SES-90` pass found the verbatim origins of four existing criteria in the local archive, recorded here
so their provenance is on file: **#74** — "i don't accept the rejections. it seems like sometimes they work"
(`10aedc75-8ce6-4240-82b8-cb3914650508.jsonl`, 2026-07-28); **#64** — "no this session is log-15 only. all
other issues will be worked in a seperate session" (`516e6549-2d62-4771-9916-20cf14e7a907.jsonl`,
2026-07-17); **#50** — 'i mean "question completed" - so perhaps the satus is "Question Answered"'
(`7d32a87d-04c9-4996-a5fe-68bbf419cd0d.jsonl`, 2026-08-01); **#21** — "Do the structural fix, but let's
heavily test in a POC of concept first" (`196574a9-e824-4618-8c65-96d0d18650b6.jsonl`, 2026-07-20).

*Format for new entries: a one-line **criterion** (imperative), then a concrete **Seen in:** instance so it
stays grounded, not abstract. Only add a criterion that would change a *future* decision — not a one-off.
Every `Seen in:` must be checkable against `docs/SESSIONS.md`, `docs/FEATURES-ARCHIVE.md`, or
`docs/harvests/*.md` — verified by `node scripts/check-decision-pattern-quotes.js` (the ship gate; run it
after any edit here). Local-archive citations (`~/.claude/projects`, the `SES-90` pass) are the one
exception: not in git, skipped by the checker with a count, quote+date is the durable part. If you cannot
find the text, the criterion does not go in.*
