<!-- DeepBench v7.0.134 | docs/vision/evidence-sources.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Evidence Sources — the vision corpus's own bibliography

Purpose: before any cycle classifies (P1–P4), ranks, or reviews whitespace, it reads THIS doc to
know where strategy evidence lives, what each source is authoritative FOR, and how fresh/verified
it must be. Standing rule over everything below: a memory or doc claim is a pointer to go verify,
never sufficient evidence (worktree `CLAUDE.md`, "Verify, never assert from memory").

## Repo docs (read from a worktree freshly branched from origin/dev — never the shared checkout)

- [C-src-1] (HIGH) `docs/ARCHITECTURE.md` §0 is the canonical platform thesis/pitch language, and the §19-series is the locked architecture record — authoritative for what the platform IS and what is settled — still true? — *grounds:* SES-84 instructions name §0+§19; the amendment header dates every change (currently v7.0.125, 2026-08-21).
- [C-src-2] (HIGH) `docs/JOHN-DECISION-PATTERNS.md` (136 criteria) is the sole canonical file for John's decision criteria; verification gate is `node scripts/check-decision-pattern-quotes.js` — still true? — *grounds:* §19v names it the criteria source for every autonomous choice; the file's own footer names the checker as ship gate.
- [C-src-3] (HIGH) `docs/SESSIONS.md` (~2.3 MB) is authoritative for session history and the "found live" rationale behind every hard rule — read targeted (grep), never whole — still true? — *grounds:* worktree `CLAUDE.md` pointer table; file size measured 2026-08-21.
- [C-src-4] (HIGH) `docs/FEATURES-ARCHIVE.md` (~1.9 MB) is authoritative for what shipped and how each closed ticket resolved — the record of revealed strategy already executed — still true? — *grounds:* SES-79 mined criteria 6–100 from it plus SESSIONS.md; size measured 2026-08-21.
- [C-src-5] (HIGH) `docs/GOVERNANCE-MODES.md` + `ARCHITECTURE.md` §19v are authoritative for governance state (Automated LIVE since 2026-08-20, 3h cadence, stamp rule) — still true? — *grounds:* GOVERNANCE-MODES.md mode table read 2026-08-21.
- [C-src-6] (HIGH) `docs/WORKING-WITH-JOHN.md` is canonical for the decision-autonomy tiers (decide-and-report / decide-and-flag / ask-first) that bound what a cycle may decide alone — still true? — *grounds:* memory `feedback-decision-autonomy-tiers.md` names it canonical; worktree pointer table.
- [C-src-7] (HIGH) `docs/harvests/*.md` are the per-ticket coverage/privacy records — authoritative for what a mining pass actually read and excluded (e.g. `harvests/SES-90.md` for the local-archive pass) — still true? — *grounds:* JOHN-DECISION-PATTERNS.md header cites it; 60+ harvest files listed 2026-08-21.
- [C-src-8] (HIGH) `docs/SCREEN-INVENTORY.md` is the whitespace map for the INVENT engine — Product Focus Area → Screen taxonomy plus the ID format — still true? — *grounds:* John's INVENT charter names it explicitly ("it studies … the platform's own white space (SCREEN-INVENTORY.md, the §19-series, usage/audit data)", 2026-08-19).
- [C-src-9] (HIGH) `docs/runbooks/runner-cycle.md` step 5 holds the canonical backlog selection query, quoted exactly once — never re-derive it — still true? — *grounds:* `ARCHITECTURE.md` §19v SES-83 (d) block.
- [C-src-10] (MED) `docs/DeepBench-Business-Context.md` and `docs/PRD.md` carry business framing but are NOT verified-fresh sources — treat as background requiring corroboration before a claim cites them — still true? — *grounds:* inference; neither carries a verification gate or appears in §19v's criteria-source list.

## Supabase (project `rallojeqnkgtxgsdsnqm`; always query live — snapshots are convenience copies)

- [C-src-11] (HIGH) `public.backlog_items` is THE authority for every ticket's tier and priority class — the backlog IS revealed strategy; markdown parsing for selection is retired — still true? — *grounds:* John, typed into the briefing 2026-08-20: "Table is authority and files are no longer needed"; §19v SES-83 (d).
- [C-src-12] (HIGH) `docs/backlog/BACKLOG-SNAPSHOT.md` is only the table's git-history/offline copy, regenerated into every ship commit — usable for history diffs, never authoritative when the live table is reachable — still true? — *grounds:* §19v SES-83 (c)/(d).
- [C-src-13] (HIGH) `runner_items` is the briefing decision stream — John's Accept / Reverse / Rework taps with his one-line reasons — the primary ledger of strategy calls ratified or reversed after the fact — still true? — *grounds:* SES-78-RUNNER-DESIGN.md ("`runner_items` (briefing source + John's decisions)"); §19v classification-authority block.
- [C-src-14] (HIGH) `runner_cycles` is the audit trail of what the Automated lane actually did (stamp, outcome, cost, model, push SHA); `runner_directives` holds John's seeds and one-time budget overrides — still true? — *grounds:* SES-78-RUNNER-DESIGN.md table roster; SES-78a migration log.
- [C-src-15] (HIGH) `ai_activity_log` is authoritative for usage/spend/pattern evidence, with the standing counting rule that "AI calls" means real model calls only (LOG-81), not raw rows — still true? — *grounds:* memory `reference-ai-activity-log-counts.md` (LOG-81-done, 2026-07-29); verify the rule against the live view before citing any metric.
- [C-src-16] (HIGH) `visitor_labels` + `ip_org_cache` are authoritative for who-used-DeepBench attribution (dev-URL=John rule, cookie ledger, IP-tracking-since-Aug-1) — read the attribution memory before any usage/visitor claim — still true? — *grounds:* memory `reference-visitor-attribution.md` and `reference-deepbench-usage-report.md`.
- [C-src-17] (HIGH) `dev_version_counter` / `feature_id_counter` are the only legitimate sources of version numbers and ticket IDs (atomic claim, never read-and-increment) — still true? — *grounds:* worktree `CLAUDE.md` hard rule (2026-07-21, SES-18 collision history).

## The daily briefing (decision transport)

- [C-src-18] (HIGH) The daily briefing is a published Artifact with the `artifact` capability; John's taps (Accept/Reverse/Rework, reasons, budget-override approvals) save into the page owner-only, and the NEXT cycle reads the page and writes them to `runner_items` — still true? — *grounds:* SES-78-RUNNER-DESIGN.md "Decision transport"; chat remains the plain-words fallback.
- [C-src-19] (MED) Freshness rule: a briefing decision is not durable evidence until it has landed in `runner_items` — a cycle citing "John accepted X" must cite the `runner_items` row (or a dated §19-series amendment), not the page — still true? — *grounds:* inference from the transport design (page → next cycle → table); the table is the queryable ledger.

## John's own words

- [C-src-20] (HIGH) The local Claude Code session archive (`C:\Users\jleon\.claude\projects\C--Projects\*.jsonl`, 186 sessions, 2026-07-08 → 2026-08-21) is the highest-authority source for John's typed words — his words outrank inference everywhere in the corpus — still true? — *grounds:* SES-90 header (2,303 messages read in full); SES-84 instructions ("His words outrank inference").
- [C-src-21] (HIGH) Local-archive citations are quote+date durable but file-path best-effort — the archive is not in git, and `check-decision-pattern-quotes.js` skips them by design (with a count) — still true? — *grounds:* JOHN-DECISION-PATTERNS.md header + footer, verbatim.
- [C-src-22] (MED) `john-messages.txt` (scratchpad extraction of the archive) is a session-temporary convenience copy — regenerate from the archive rather than trusting an old extraction, since the scratchpad is session-scoped — still true? — *grounds:* inference; the file lives in a per-session scratchpad and the archive grows daily.
- [C-src-23] (HIGH) John's pasted external threads and screenshots (in-chat) are evidence only for the session that received them — anything worth keeping must land as a backlog row or doc before session end or it is lost — still true? — *grounds:* criterion #92 ("would another session see this?"); memory `feedback-log-session-only-findings.md`.
- [C-src-24] (HIGH) The locked one-paragraph pitch (memory `project-deepbench-pitch.md`, locked 2026-06-15) is canonical pitch language, with the full version in `ARCHITECTURE.md` §0 — still true? — *grounds:* memory file, "locked" status; SES-84 instructions name it canonical language.

## Memory files and outside research

- [C-src-25] (HIGH) Memory files (`C:\Users\jleon\.claude\projects\C--Projects\memory\`) are working-relationship and gotcha records — authoritative for HOW to work, never for checkable code/schema/data facts, which must be re-verified fresh — still true? — *grounds:* worktree `CLAUDE.md` "Verify, never assert from memory" hard rule (2026-07-15).
- [C-src-26] (HIGH) Market/competitor facts come only from live WebSearch, cited (name + one-line source), never fabricated and never from model recall — still true? — *grounds:* SES-84 instructions; criterion #101 (research industry standard before proposing) and #88 (verified published terms).
- [C-src-27] (HIGH) Git history on `origin/dev` is the source of truth for versions and what actually shipped — docs never store what git already knows ("just go to git") — still true? — *grounds:* criterion #93; deploy currency is verified via `meta.githubCommitSha` (Vercel API), never the alias (memory `reference-vercel-deploy-quota.md`).
- [C-src-28] (MED) Precedence when sources conflict: John's typed words (dated, latest wins) > `runner_items` decisions > §19-series amendments > JOHN-DECISION-PATTERNS.md criteria > other repo docs > memory files > inference — still true? — *grounds:* inference assembled from C-src-20's "words outrank inference," §19v's after-the-fact governance, and criterion #94 (live evidence beats a locked rule, but the locked section gets amended, never silently bypassed).

## Open questions for John

1. C-src-28 (the precedence ladder) is the highest-value unknown — is that ordering right, especially runner_items decisions above §19 amendments when they disagree?
2. C-src-19: should a briefing Accept count as ratified the moment you tap it (page state), or only once written to `runner_items` by the next cycle?
3. C-src-10: are DeepBench-Business-Context.md / PRD.md still live documents, or historical — may a cycle cite them at all?
4. Is there any strategy evidence OUTSIDE these sources (email threads, notes on your phone, conversations with the Apple contact) that cycles should know exists even if they can't read it?
