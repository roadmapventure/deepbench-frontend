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
