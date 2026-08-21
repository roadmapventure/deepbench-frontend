<!-- DeepBench | harvest record | SES-90 | v7.0.111 -->
# SES-90 — mine the local session archive into `JOHN-DECISION-PATTERNS.md`

`docs/FEATURES.md`'s row is the pointer; this file holds the full scope, the constraints, and the
carry-over finding from `SES-79`.

## Origin — John's Rework line

John tapped **Rework** on the `SES-79` briefing card at 2026-08-20 23:54Z. His reason, verbatim:

> Pass. Also Create another ticket to mine local files

*"Pass."* — the `SES-79` ship (`bf070e8`, `v7.0.110`, 5 → 100 criteria) is fine; nothing reverted.
*"Create another ticket to mine local files"* — file the unmined half as its own ticket. Harvested
by runner cycle `cycle-20260820-2357` into `runner_directives.58e13c5d-fccb-4bcd-84e5-4c778f81b63f`,
`item_ref` → the reworked card `runner_items.0edac766-10e1-44c8-956e-b59c2bccd02b`. A Rework is
ladder-neutral: tooling stayed rung 3 / streak 3.

## What is unmined, and why

`docs/RUNNER-GOV-0820-REQUIREMENTS.md` line 106 scopes automation-queue step (4) as *"`SES-79`
expanded over the full local session archive + structured taps."* `SES-79` mined the two **in-repo**
corpora only — `docs/SESSIONS.md` (8,242 lines) and `docs/FEATURES-ARCHIVE.md` (1,490 lines) — and
said so out loud rather than burying it: `docs/SESSIONS.md` line 22, the `SES-79` row's "**Open:**"
clause, and the briefing card's "Out of scope, said out loud" paragraph all record the gap.

`ARCHITECTURE.md` §19v makes `docs/JOHN-DECISION-PATTERNS.md` the criteria source for **every**
autonomous choice, and fails anything it does not cover closed to the gated lane. Each criterion
added widens what Automated mode can decide well instead of escalating to John — which is the whole
value case for finishing the pass.

## ⚠ This ticket cannot run in the cloud

`~/.claude/projects` is on John's machine. It is not in this repository, not in Supabase, and not
reachable over the network from a runner container. No amount of cycle budget changes that.

`SES-90` is therefore written to be executed by **a session on John's laptop**, and says so in the
row, in `session_ref`, and here. A future cloud cycle that picks it up will find nothing to read;
the ticket's job is to prevent that wasted cycle, not merely to survive it.

## Scope

- **Output file:** `docs/JOHN-DECISION-PATTERNS.md` — the same file `SES-79` wrote.
- **Format, inherited verbatim:** one imperative line, then a concrete, checkable `Seen in:`
  instance. Appended into the existing seven themed sections — never a parallel structure.
- **Dedupe against the current 100 criteria** before adding anything.
- **Source:** the local Claude Code transcript archive, `~/.claude/projects` (searchable), plus any
  structured taps John has accumulated.

## Privacy — a constraint `SES-79` did not have

The in-repo corpora were already in git. The local archive never was: it is John's full transcript
history and may contain secrets, credentials, customer data, or personal material that has never
been in a repository. `SES-90` extracts **criteria**, and its `Seen in:` citations must be short
decision quotes plus a session reference — never bulk transcript text pasted into a committed file.

## Carry-over finding — `SES-79`'s QA checker was never committed

Verified 2026-08-20 by cycle `cycle-20260820-2357`, not recalled:

- `git log --name-only bf070e8` lists exactly five files — `CLAUDE-STATE.md`, `docs/FEATURES.md`,
  `docs/JOHN-DECISION-PATTERNS.md`, `docs/SESSIONS.md`, `docs/backlog/BACKLOG-SNAPSHOT.md` — and
  no script.
- Nothing matching `quote` or `pattern` exists under `scripts/` or `tests/`.

It was a throwaway `test-*.mjs`, which `docs/STANDARDS.md` correctly forbids committing. The
consequence is concrete: the gate that proved **112 of 112** evidence phrases real, and that caught
three near-miss fabrications before they shipped, would have to be rebuilt from the briefing card's
prose. `SES-90` commits it as **`scripts/check-decision-pattern-quotes.js`** so the bar survives as a
real, runnable gate — for this pass and for every later edit of the governing file.

## QA bar for the future pass

Inherited from `SES-79`, now mechanised by the committed checker: extract every quoted evidence
phrase from the shipped file and verify it back against its source; a **red control** (a fabricated
`Seen in:` injected into the real file) must make the check fail, so that a green result means the
evidence is real rather than that the check always says yes.

## Provenance

Filed by Automated runner cycle `cycle-20260820-2357` (`runner_cycles.c1660d2f-9032-4118-b98f-31d8a0cd8749`),
`v7.0.111`, 2026-08-21. Kickoff: `docs/kickoffs/v7.0.111-SES-90-local-session-archive-mining.md`.
Backlog row: `public.backlog_items.b119d535-1428-4acc-84b4-6cf4104e59c2` (before-image
`row_data = NULL` — Reverse is a DELETE of that pk).

---

# EXECUTION RECORD — shipped v7.0.126, 2026-08-21, attended session automation-review (Fable 5)

> The spec above was written at filing (v7.0.111). Everything below is the mining log of the run
> that completed it. Note for the record: the executing session initially overwrote this file with
> the log alone (cp without reading the target — the exact mistake WORKING-WITH-JOHN.md warns about);
> restored from git and merged in the follow-up commit.

# SES-90 mining log — local Claude Code archive → JOHN-DECISION-PATTERNS.md

Session: SES-90 (Tooling · P10 - Tooling), mining phase, 2026-08-21. Model: Fable 5.
All work read-only outside this scratchpad. No repo, worktree, or Supabase writes.

## What was mined

**Archive:** `C:\Users\jleon\.claude\projects\` — two project directories:

| Directory | .jsonl sessions | Size | Date range |
|---|---|---|---|
| `C--Projects` | 185 (184 at first listing; the live session's file appeared during the run) | ~388 MB | 2026-07-08 → 2026-08-21 |
| `C--Projects-deepbench-frontend` | 1 | 0.4 MB | 2026-07-23 (a skills-load diagnostic; nothing minable) |

**Method:** rather than sampling transcripts, a Node extraction script
(`extract-john.js`, this scratchpad) pulled **every message John personally typed** — JSONL
records with `type:"user"`, `origin.kind:"human"`, non-sidechain, excluding `tool_result`
blocks — across **all 186 files**. Yield: **2,303 messages (571 KB)**, which I then read in
full (100% of the extract, no sampling caps). This is deliberately the inverse of reading
bulk transcripts: John's own words are where the decisions live, and skipping Claude's side
keeps the privacy surface minimal.

**Extraction filters (the only things not read):**
- Assistant output, tool results, and sidechain (sub-agent) traffic — decisions were mined
  from John's side only; where context was needed I had the surrounding exchange from his
  next messages.
- Messages over 1,200 chars truncated to their first 1,200 and flagged `[TRUNC]` (~30
  messages — mostly pasted kickoff prompts, cross-session hand-off blocks, and screenshots'
  accompanying spec lists; their opening text was read).
- Bare acknowledgements filtered (`yes`, `ok`, `go`, `design`, `continue`, etc.).
- `<command-name>` slash-command noise filtered.

## Results

- **36 new criteria** (numbered 101–136 in `ses-90-new-criteria.md`), grouped for append
  into all seven themed sections: Mechanism and architecture (5), Diagnosing and fixing (3),
  What the platform is allowed to display (4), The user's experience (6), Scope/sequencing/
  backlog (8), Testing/QA/ship gates (4), Working with John (6).
- **4 AMENDMENTS** — existing criteria (#21, #50, #64, #74) whose original verbatim source
  turns out to live in the local archive; corroboration recorded, no wording changes.
- **~25 candidate patterns deduped away** against the existing 100 (itemized at the bottom of
  the criteria file) — the archive is dense with the *same* events SESSIONS.md recorded, so
  most correction moments ground criteria that already exist.
- **Quote verification:** all 51 quotes used anywhere in the deliverable (39 primary + 12 in
  amendments/dedup notes) were verified as verbatim JSON-escaped substrings of their named
  session files (`verify-quotes.js`, `verify-quotes2.js` — both runs ALL VERIFIED). No
  paraphrase is presented as verbatim.

## Checker (`ses-90-checker.js` → `scripts/check-decision-pattern-quotes.js`)

Tested live, read-only, against the automation-review worktree's real docs:

- **Clean pass on the current file:** 100 entries parsed, 88 in-repo entries / 120 quoted
  phrases checked, 0 failures, exit 0.
- **Discriminating fail proven** (per the QA-assertion-must-discriminate rule): a scratchpad
  copy with one corrupted quote exits 1 naming the entry; an injected local-archive entry is
  skipped with count 1. Both guarded branches fired; the pass is not vacuous.
- Three calibration findings the committing session should know:
  1. **Trailing punctuation** rides inside the doc's closing quote marks (American style) but
     is absent in the corpora — the checker strips leading/trailing `.,;:!?…—-` from
     extracted quotes; without this, 26 legitimate quotes false-fail.
  2. **The seed set (criteria 1–5)** quotes `design-log-38-0724`, which is not in
     SESSIONS.md/FEATURES-ARCHIVE.md (partially in `docs/harvests/LOG-38-signature-discovery-0724.md`).
     The checker skips the seed-set section with its own count; `docs/harvests/*.md` are also
     included as legitimate in-repo corpora (they ground e.g. seed #4's "runtime, not stored").
  3. **Nested quotes:** two entries (#23, #40) wrap a paraphrase around an inner
     'single-quoted' verbatim kernel; the checker falls back to matching the inner kernels.

## Privacy

- **Withholdings needed: none** — no criterion's only evidence was sensitive material, so
  there are no "withheld — sensitive source" entries.
- **Sensitive material observed and deliberately NOT copied into any deliverable:** John's
  home IP address and its label row; a personal LinkedIn exchange with a former boss
  (named individual, personal commentary); mentions of his girlfriend's wifi, travel
  locations (hotel/city), and personal Anthropic/API spend figures beyond what the criteria
  quotes themselves state. Criterion 111 records his no-public-email rule without
  reproducing the address; criterion 112 uses only the non-personal sentence of the
  LinkedIn-metrics exchange.
- **Secrets/credentials:** none encountered in John's typed messages (the extraction never
  read tool results, where env values would surface). Nothing key- or token-shaped was
  copied anywhere.
- The extract corpus (`john-messages.txt`) and helper scripts live only in this scratchpad
  and can be deleted after the merge session lands.

## Not covered / caveats

- Claude-side transcript text (proposals John was reacting to) was not read except where his
  own message restated it — a few criteria therefore describe the correction from his side
  only; each entry's wording sticks to what his message establishes.
- The `[TRUNC]` tails of ~30 long pasted prompts were not read past 1,200 chars; these are
  John pasting *Claude-authored* kickoff text, not decision moments.
- Sessions before 2026-07-08 do not exist in this archive (nothing older is on disk).
- The three `design lav-25` duplicate session files (identical content under three UUIDs)
  were read three times by construction; criteria cite one canonical file.

## Files

- `ses-90-new-criteria.md` — the append-ready criteria (this scratchpad)
- `ses-90-checker.js` — draft of `scripts/check-decision-pattern-quotes.js` (this scratchpad)
- `ses-90-mining-log.md` — this file
- Working artifacts: `extract-john.js`, `john-messages.txt`, `verify-quotes.js`, `verify-quotes2.js`
