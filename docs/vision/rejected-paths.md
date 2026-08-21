<!-- DeepBench v7.0.134 | docs/vision/rejected-paths.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Rejected Paths — approaches John has explicitly said no to

Purpose: no future cycle (EXECUTE / HEAL / INVENT) re-proposes an approach John already rejected or
reversed. Each claim reads "John rejected X because Y — still true?" — a tap confirms the rejection
still stands; a Reverse here means the door has re-opened and this doc must be amended same-cycle.
Deeper treatment of most items: `docs/JOHN-DECISION-PATTERNS.md` (the criterion number is cited).

## Architecture and mechanism

- [C-rejected-1] (HIGH) John rejected pre-wired delegation/backup destinations — in code, as data, or as a harness lookup — because any routing decision must be live, traceable, logged model judgment — still true? — *grounds:* criterion #6; locked as `ARCHITECTURE.md` §19d's sniff test ("a static or pre-wired destination fails the test even as pure data").
- [C-rejected-2] (HIGH) John rejected per-agent patches for systemic defects because one agent's anomaly implicates the shared mechanism — still true? — *grounds:* "why is there not just a content service that all agents use, why would we have to create a new one for one agent?" (2026-07-29); criterion #24.
- [C-rejected-3] (HIGH) John rejected fixing agent behavior via harness-loop special cases because the fix belongs in the agent's own Skill content ("make the agent smarter, not change the loop rules") — still true? — *grounds:* criterion #7; restated as a standing constraint on the SES-29 fix wave.
- [C-rejected-4] (HIGH) John rejected deterministic code governing what an agent may accept/reject because "the whole purpose is the agent is to reason with prompt or skills — not being governed by code" — still true? — *grounds:* verbatim, on HAR-14 (2026-07-28, local archive `b9b0773a`).
- [C-rejected-5] (HIGH) John rejected hand-rolled per-pattern/per-case code where one generic data-driven mechanism serves ("if the prose and signature are formatted the same always, why would you need to write individual case statements?") — still true? — *grounds:* verbatim 2026-07-25 (local archive `c34ef763`); criterion #2.
- [C-rejected-6] (HIGH) John rejected handing an external artifact to named agents ("give owen and marcus the article") because naming agents in data flow is hardcoding — carry the input through the whole chain instead — still true? — *grounds:* "i don't like when you say 'give owen and marcus' the article. That sounds like hardcoding." (2026-07-21); criterion #103.
- [C-rejected-7] (HIGH) John rejected spending a model call where a deterministic mechanism serves ("can you just pick the first intent so we dont have to do a model call?") — still true? — *grounds:* criterion #9; shipped fix resolves from the harness roster.
- [C-rejected-8] (HIGH) John rejected a third instruction-wording attempt after two instruction-level guards failed — go structural; a known-correct value never travels through a model — still true? — *grounds:* criterion #10 (DAT-7 Nadia, AGT-37 Elena); memory `feedback-id-decoys-defeat-instructions.md`.
- [C-rejected-9] (HIGH) John rejected hardcoding content judgments (banned-phrase lists, content policy) into repo files because content rules are an agent's governed judgment — still true? — *grounds:* criterion #11; every cited precedent validated structure, never content.
- [C-rejected-10] (HIGH) John rejected screen-authored copy of any kind — including fallback lines — because "it renders what the agent returned and authors nothing" — still true? — *grounds:* criterion #12; recorded in §19j as a rationalization.
- [C-rejected-11] (HIGH) John rejected replacing working live routing with a new mechanism to close a ticket ("no. why are you breaking rules and not using the existing routing that is working?") — still true? — *grounds:* verbatim 2026-07-22 (local archive `09c581df`).
- [C-rejected-12] (HIGH) John rejected defining foundational infrastructure from existing code or current md docs because code is not evidence of intent — start from published best practice, then make architecture and code fit — still true? — *grounds:* "i need you to stop looking at existing code or current md documents to define this" (2026-07-21); criterion #102.
- [C-rejected-13] (HIGH) John rejected locking a fixed pattern vocabulary into the software because new patterns must auto-register as models evolve ("if another AI pattern is used, it updates our system, not hardcode") — still true? — *grounds:* criterion #16; his pattern-tracking charter 2026-07-27 ("we want to auto except new patterns, no matter the model").
- [C-rejected-14] (HIGH) John rejected a centralizing service that still leaves callers updating N files ("you are creating a service and still have to update 4 files? what are you centralizing then?") — still true? — *grounds:* criterion #15, Article Context Resolver scoping.
- [C-rejected-15] (HIGH) John rejected bypassing an existing central service with new per-file calls ("We created a single AI Pattern service for the entire platform… why would you propose updating a files existing ai pattern calling when it is supposed to use our new service?") — still true? — *grounds:* verbatim 2026-07-16 (local archive `7a4466f7`).

## Display and honesty

- [C-rejected-16] (HIGH) John rejected attributing behavior from declared configuration instead of what the call actually did, because a declared field is a propensity, not evidence — still true? — *grounds:* criterion #32; "a pattern must never require a Supabase-declared field to be logged."
- [C-rejected-17] (HIGH) John rejected fabricated zeros, padded groups, and parallel displays that paper over incomplete data — honest absence renders instead — still true? — *grounds:* criteria #34–35; the LOG-36 tile was reverted rather than ship a confident wrong `0`.
- [C-rejected-18] (HIGH) John rejected reconciliation bridges and catalog-seeded displays because displays enumerate what the logs actually contain ("it should only show patterns that have logs") — still true? — *grounds:* criterion #36, collapsing the LOG-36 "blocked" premise to one line.
- [C-rejected-19] (HIGH) John rejected narrowing audit/spend counts to a convenient scope filter ("they actually called the model, correct?") — still true? — *grounds:* verbatim 2026-07-28 (local archive `2bf711ec`); criterion #38.
- [C-rejected-20] (HIGH) John rejected destroying data at write time to solve an exposure problem — capture the real value, mask at display — still true? — *grounds:* criterion #43; "make sure you are logging the real thing, you can obfuscate the ip address in the viewer."
- [C-rejected-21] (HIGH) John rejected showing capabilities where the user asked for AI patterns — the two vocabularies never blur ("I don't want to see capabilities. I just want to see AI patterns, like rag, routing, orchestration") — still true? — *grounds:* verbatim 2026-07-17 (local archive `516e6549`).
- [C-rejected-22] (HIGH) John rejected back-office mechanics, roadmap placeholders, and capture-boundary caveats on user surfaces ("too much info for the user about back office things") — still true? — *grounds:* criterion #45; the AI Audit "roadmap" drawer was removed on his direct order 2026-07-28.
- [C-rejected-23] (HIGH) John rejected explaining jargon with a legend instead of removing the jargon from the copy — still true? — *grounds:* criterion #46, the confidence_tier legend call.
- [C-rejected-24] (HIGH) John rejected static placeholder copy where an agent voice is promised ("this has got to feel like you are talking to a person") — still true? — *grounds:* criterion #47, CHI-03a interim acknowledgment overturned.
- [C-rejected-25] (HIGH) John reversed his own approval of context-dynamic drawer titles because one object gets one name everywhere ("one forecast flow used six nouns for one object") — still true? — *grounds:* criterion #53, CHI-49.
- [C-rejected-26] (HIGH) John rejected excluding any real work from user-visible counts, including "non-measurable" exception lists ("a hop is an instance that has work and time, no matter how brief") — still true? — *grounds:* criterion #41.
- [C-rejected-27] (HIGH) John rejected blending structurally different operations into one displayed average after seeing "4.1s" against his own 30+ second waits — still true? — *grounds:* criterion #56.

## Public surface and exposure

- [C-rejected-28] (HIGH) John rejected exposing his email on any public surface ("Don't have the email button. The true users will know how to get a hold of me.") — still true? — *grounds:* verbatim 2026-08-08 (local archive `2d6d2c59`); criterion #111.
- [C-rejected-29] (HIGH) John rejected blocking read paths when gating spend — only cost-incurring actions gate; "browse stays open while blocked" — still true? — *grounds:* criterion #63, HAR-33.
- [C-rejected-30] (HIGH) John rejected erroring the product path on failed telemetry or declined cookies ("i don't want the platform to error out") — still true? — *grounds:* verbatim 2026-08-01 (local archive `52a3da2a`); criterion #105.
- [C-rejected-31] (HIGH) John rejected shipping any outward-facing number without a stated defense (how measured, what counts, confidence) — still true? — *grounds:* criterion #112, the LinkedIn-metrics verification ask (2026-07-24).

## Process, scope, and the backlog

- [C-rejected-32] (HIGH) John rejected deadline-driven scope because the objective is showcase quality that survives expert scrutiny ("we are not going for a deadline") — still true? — *grounds:* verbatim 2026-07-20 (local archive `28a6f45d`); criterion #119.
- [C-rejected-33] (HIGH) John retired the beta/non-beta gate entirely in favor of tier + named P1–P10 priority classes ("beta has been pushed. I am no longer categrozing tickets as beta vs non-beta") — still true? — *grounds:* verbatim 2026-08-20 (local archive `323a6e02`); `ARCHITECTURE.md` §19v backlog-integration block.
- [C-rejected-34] (HIGH) John reversed markdown files as backlog authority — `public.backlog_items` is the authority, files are snapshot/reference only ("Table is authority and files are no longer needed") — still true? — *grounds:* SES-83 (d) supersession block, `ARCHITECTURE.md` §19v, Accepted 2026-08-21T00:19Z.
- [C-rejected-35] (HIGH) John rejected per-ticket/per-finding pushes — batch to ship points ("the number of times you push is too much") — still true? — *grounds:* verbatim 2026-08-19 (local archive `323a6e02`); criterion #126.
- [C-rejected-36] (HIGH) John rejected filing tickets for bugs a new feature itself introduced — those are fixed inside the feature's work before it ships — still true? — *grounds:* criterion #124 (2026-08-19).
- [C-rejected-37] (HIGH) John rejected closing a ticket while refiling its own acceptance criterion under a new number ("you think we are done with agt-36, but you created 4 more tickets required for beta?") — still true? — *grounds:* criterion #95.
- [C-rejected-38] (HIGH) John rejected spinning research work into extra tickets instead of just doing it ("No. you are over complicating… No writing of extra tickets. Just a research project and data update") — still true? — *grounds:* verbatim 2026-07-28 (local archive `59965e44`).
- [C-rejected-39] (HIGH) John rejected re-architecting a process that just stabilized for a marginal optimization ("we spent over 6 hours today to get where it is now, and it seems to be working ok") — still true? — *grounds:* criterion #121 (2026-07-24).
- [C-rejected-40] (HIGH) John rejected taxonomy purity over his real triage workflow — kept the MOB ID prefix against the inventory's own rule because "i consider fixes for it as a single entitiy" — still true? — *grounds:* criterion #70.
- [C-rejected-41] (HIGH) John rejected developer tooling on any release/ship board because the board holds only what a reviewer can see — still true? — *grounds:* criterion #71 (SES-36 removal).
- [C-rejected-42] (HIGH) John rejected storing facts a live source already owns (version numbers in docs: "just go to git — not sure why you are storing it") — still true? — *grounds:* criterion #93.
- [C-rejected-43] (HIGH) John rejected Google Drive docs as a session information source because they will be stale next to the md files ("turn it off? I don't want you to access that for information") — still true? — *grounds:* verbatim 2026-07-15 (local archive `9ab0c226`).

## Testing and QA

- [C-rejected-44] (HIGH) John rejected "harness survived / failures correctly classified" as a regression pass — only end-to-end business outcomes count ("this is a failed test") — still true? — *grounds:* verbatim 2026-07-28 (local archive `10aedc75`); criterion #73.
- [C-rejected-45] (HIGH) John rejected guardrail rejections as an acceptable expected outcome — every block is red and gets a multi-try probe ("i don't accept the rejections. it seems like sometimes they work") — still true? — *grounds:* verbatim 2026-07-28; criterion #74.
- [C-rejected-46] (HIGH) John rejected any test that mutates working data, including a Demo Reset — regression runs read-only over tagged data ("We don't want to change existing data flow that is working data. That will be a fail.") — still true? — *grounds:* verbatim 2026-07-29 (local archive `be7ab91d`); criterion #76.
- [C-rejected-47] (HIGH) John rejected unpriced test plans after a ~$100 estimate against his measured ~$0.31/run ("you are telling me $100 to test 2 questions?") — state cost first, scope to the smallest answering segment — still true? — *grounds:* criterion #128 (2026-08-02).

## Language and terminology

- [C-rejected-48] (HIGH) John rejected invented names for AI techniques — real published industry terms only, verified against the literature ("I have been fighting claude this entire time to quit making up its own terminology") — still true? — *grounds:* criterion #88; memory `feedback-standard-ai-terminology.md`.
- [C-rejected-49] (MED) John rejected layperson analogies for platform concepts — DeepBench-native terms (Skill, Capability, Agent, Intent, Product Focus Area, Layer) in every explanation — still true? — *grounds:* memory `feedback-deepbench-native-terminology.md` (standing correction record; no single verbatim quote located in-repo).
- [C-rejected-50] (HIGH) John rejected "workflow" as a platform-wide vocabulary word because it collides with the project-management screen — check the namespace before proposing a name — still true? — *grounds:* verbatim 2026-07-25 (local archive `027e7f3c`); criterion #118.
- [C-rejected-51] (HIGH) John rejected solo-drafted canonical terminology because sessions "create their own language" and talk past him — terms are built live with him, one per concept — still true? — *grounds:* criterion #87.

## Open questions for John

1. C-rejected-49 (layperson analogies) is the only MED here — is the rule "never use an analogy," or "analogy allowed as a supplement after the native term is established"?
2. Does the beta retirement (C-rejected-33) also retire the "beta-marked first" tie-break inside a priority class, or does that marker stay meaningful indefinitely?
3. C-rejected-46: is the read-only rule absolute for the Automated lane too, or may a runner cycle mutate data it created itself in the same cycle (before-image logged)?
4. C-rejected-11 vs the P8 - Determinism Removal class: when does "don't break working routing" yield to "remove determinism" — only via an Accepted briefing card?
5. Are there rejected paths from BEFORE 2026-07-08 (pre-archive window) that should be added here from your memory — e.g. anything from the June design sessions?
