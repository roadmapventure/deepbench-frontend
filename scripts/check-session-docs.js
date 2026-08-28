#!/usr/bin/env node
// DeepBench v7.0.281 | scripts/check-session-docs.js | SES-45 -- CHECK 14, the remaining half of
// the ticket. STANDARDS.md's SES-45 rule (Section 4, "A test must assert against the REAL
// implementation. Logic recreated inside the test file is not a test -- it is a second
// implementation agreeing with itself.") already shipped as prose (v7.0.257) and named this lint
// as a "consider" left open. This ship mechanizes it as a check over docs/kickoffs.
//
// THE PREDICATE, all three parts required on one fenced block before it is reported:
//   1. The block sits in the kickoff's SECTION 8 region (heading forms seen live: `## 8. NODE.JS
//      TEST`, `## Section 8 -- NODE.JS TEST`). The region is bounded by nothing more than "the next
//      ##-level heading" -- which is why Section 8b (LIVE API TEST) needs no special case to be
//      excluded: it carries its own `## Section 8b -- ...` heading, so it simply IS the next
//      ##-level heading and ends the Section 8 region rather than extending it. (A first draft
//      special-cased "8b" as a continuation of Section 8 instead of a terminator and leaked its
//      LIVE API TEST blocks into the region -- caught by hand-checking v5.2.22-AA-57 against this
//      rule before shipping. A live-API-only block says nothing about whether the Node test
//      recreated logic; do not resurrect that special case.)
//   2. The block DEFINES a function (`function N(`, `async function N(`, `const N = (...) => `,
//      `const N = function`) whose name N is ALSO named, elsewhere in the same kickoff and outside
//      any fenced code, as a backticked `N()` -- i.e. the doc's own prose calls N the subject under
//      test, not just a helper the block happens to declare.
//   3. The block imports nothing real: no `import ... from`, `import(`, `require(`, or
//      `await import(`.
//   4. (THE DISCRIMINATOR, added beyond the ticket's original three-part predicate.) N must ALSO be
//      a real symbol defined in this repo's own `src/`, `api/`, or `lib/` -- built once per run by
//      walking those three directories for `.js`/`.jsx`/`.mjs` files (skipping `node_modules`) and
//      matching `/(?:function|const|let|var)\s+N\b/`. WITHOUT THIS, the check fires on ordinary
//      local test helpers a Section 8 block is entitled to define for itself (a fixture builder, a
//      stub, a small comparison function) -- those are not the shipped implementation and never
//      claimed to be, and flagging them is noise dressed as a finding. If none of the three source
//      dirs exist, the check reports nothing rather than firing on an unverifiable name -- a check
//      that cannot confirm the symbol is real must not guess.
//
// SEVERITY IS WARN, NOT FLAG, and the reason is the one v7.0.242 already used to draw the gating
// line and check 12's header already names for the identical shape: measured live on this clone,
// 20 hits across the 261 kickoffs (of 642) that carry a Section 8 code block at all -- the raw
// three-part predicate returns 23, and discriminator #4 is what removes the other 3 (names the
// prose cites and a block defines, but which are not top-level declarations in src/ | api/ | lib/,
// so they are not verifiably production logic). Quote the 20, never the 23: the 23 is the count
// BEFORE the discriminator this check actually ships with.
// Shipping FLAG makes the report red on arrival for a HISTORICAL migration
// backlog nobody has started draining yet, which is exactly the failure the gating-severity
// discipline exists to avoid -- a report red on arrival is a report nobody reads. Check 14 is
// therefore NOT added to GATING_CHECKS (9/10/11 only); it reports the same way check 12 does.
//
// AGGREGATED to ONE WARN finding, not one per hit -- the same convention checks 3c/3e already use,
// for the same reason stated there: reported as one line so it cannot bury the actionable flags
// above it. The detail names the count, up to 5 example `file -> recreatedName` pairs, and cites
// docs/STANDARDS.md Section 4's SES-45 rule by name.
//
// TWO EDITS THIS TICKET FORBIDS, both of which would look like a tidy-up to a later editor:
//   - Adding "14" to GATING_CHECKS. The 23-kickoff backlog is not new drift; see the severity note
//     above. Promoting it to gating is SES-45's own follow-up ticket's call to make once the
//     backlog is actually drained, not a default this file reaches for on its own.
//   - Dropping discriminator #4 (the repo-symbol check) "to simplify". Without it this check stops
//     being a fact about recreated PRODUCTION logic and starts firing on any local helper a test
//     legitimately defines for itself -- see the discriminator's own note above.
// Guarded by tests/regression/SES-45-recreated-logic-lint.js.
// DeepBench v7.0.243 | scripts/check-session-docs.js | SES-200 -- CHECKS 12 AND 13, two of the
// three pieces SES-176 shipped partial and left owned by no ticket. Check 12: a live rule's
// statement restated outside its canonical home with no {{rule:ID}} marker. Check 13: one
// procedure with two live homes. Both are documented in full at their definitions below; the two
// things not to undo from up here are that check 12 is ID-anchored with an overlap test (the
// registry statement is a paraphrase -- matching it against prose can never fire, which is check
// 9's own lesson) and reports WARN (the canonical text is intact; this is SES-201's migration
// backlog, and promoting it to FLAG changes what the v7.0.242 gate refuses). The THIRD piece --
// findings become backlog rows -- is a different mechanism (atomic id claim, an --apply path,
// dedup) and is filed as its own ticket rather than left ownerless, which is the exact crack
// SES-200 exists to close.
// Guarded by tests/regression/SES-200-rule-copy-and-procedure-homes.js.
// DeepBench v7.0.242 | scripts/check-session-docs.js | SES-199 -- THE TRIPWIRE CAN NOW GO RED.
// Until this ship main() ended in process.exit(0) on every path, so the check was a rubber stamp:
// the interim auto-done bar requires "tripwire green" and nothing could ever make it anything else.
// `--gate` is the second invocation the ticket asked for. Default behaviour is UNCHANGED and must
// stay that way -- no flag, always exit 0, same report -- because CI runs the bare form today.
//
// THE GATING SET IS NAMED CLASSES AT FLAG SEVERITY, AND BOTH HALVES OF THAT ARE DELIBERATE:
//   * CLASSES: checks 9/10/11 only -- the truth-registry checks, the ones that ask "do two files
//     still tell the same story?". The ticket draws exactly this line: "the over-cap description
//     flags are plainly advisory, while a rule statement drifted from its registry row plainly is
//     not." Checks 1-8 are size and shape ratchets; a doc a few KB over baseline is a thing to
//     tidy, never a reason to refuse a change.
//   * SEVERITY: FLAG, not FLAG+WARN. The script already spends this distinction carefully --
//     check 10 itself argues a stale anchor is "a stale anchor rather than a missing home -- WARN,
//     not FLAG" -- so gating on FLAG reuses a judgement already made per finding instead of
//     inventing a second axis over the top of it. MEASURED on the live board at this ship, and it
//     is why the line sits here: classes 9/10/11 hold 0 FLAGs and 2 WARNs (B31/B32's stale anchors,
//     which are SES-202's own ticket). So the gate ships GREEN. Gating on WARN too would have
//     shipped a job that is red on arrival for drift another ticket already owns -- which trains
//     everyone to ignore it, and is the rubber stamp's twin failure rather than its fix.
//   * FAIL-CLOSED FOR FREE, and this is the property not to lose: loadRules() reports "the truth
//     checks could not run at all" as a check-9 FLAG, so a missing or unparseable RULES-SNAPSHOT
//     fails the gate instead of passing it. A gate that goes green when it looked at nothing is
//     the exact defect this ticket exists to close.
// NOT DONE HERE, deliberately, and it is the ticket's own boundary: .github/workflows/ci.yml is
// NOT switched to `--gate`. This ticket makes the CHECK capable of failing; making a FAILURE block
// a merge needs branch protection and repository secrets, which are John's alone (M2 gate review
// item 8, never to be carded). Wiring the flag into CI is the follow-up, not this.
// Guarded by tests/regression/SES-199-tripwire-gating.js.
// DeepBench v7.0.219 | scripts/check-session-docs.js | SES-011a, SES-009b, SES-23, SES-25a, SES-83 (d) c4, SES-110, SES-112, SES-115, SES-117, SES-120, SES-176
// FIX v7.0.219 (SES-180's cycle, feature-owns-its-bugs): check 11 flagged its OWN documentation --
// prose writing `{{rule:ID}}` to explain the syntax was read as a broken marker. `ID` and its
// siblings are documentation placeholders, not rule names; see MARKER_PLACEHOLDERS.
// FEATURE: SES-176 -- checks 9/10/11, the TRUTH TRIPWIRE. Checks 1-8 ask "is this file too big /
// is this row shaped right?"; these ask "do two files still tell the same story?", reading the
// SES-174 rule registry through docs/governance/RULES-SNAPSHOT.md. Three design points a later
// editor is most likely to undo, each of which was wrong in a first implementation and is now
// covered by tests/regression/SES-176-truth-tripwire.js: check 9 is ID-anchored, never
// statement-anchored (the registry's `statement` is a paraphrase, so matching it against prose
// ships a check that can never fire); its window is the enclosing BLOCK with no character-count
// fallback (the fallback reaches into the previous register entry and clears a mention on a
// neighbouring rule's retirement vocabulary -- a silent false negative); and headingSlug() does
// NOT collapse consecutive spaces, because GitHub maps each space to its own hyphen and the live
// anchor `section-1-session-naming--versioning` depends on it.
// FEATURE: SES-120 -- check 3's stub size baselines are modernized off a live measurement.
// The old { FEATURES.md: 40, FEATURES-LATER.md: 150 } were row-era caps that could not fire
// against the v7.0.113 stubs (14.2 KB / 1.2 KB live), and FEATURES-NEXT.md had no cap at all.
// See STUB_SIZE_BASELINES_KB below for the numbers and the ratchet rule.
// FEATURE: SES-117 -- check 3c STATES the tier-scoped Type rule instead of bare-counting blanks.
// Type is not owed while a ticket sits in `later`; it fills at the later -> now/next promotion,
// and since this ticket that is structural, not remembered: ck_backlog_type_when_promoted on
// public.backlog_items rejects a blank Type on any now/next row. The count is unchanged; what it
// MEANS is the opposite of what the old wording read as (228 things to go fix vs. 228 rows that
// owe nothing). The check deliberately does not split by tier -- the snapshot carries no Tier
// column -- and says so rather than pretending otherwise.
// FEATURE: SES-115 -- check 3 stops flagging every `done` row (37 of this report's 49 findings,
// measured before the change) and flags only a history row that still holds live-board state,
// read from the snapshot's new appended History residue column. Register B1 as revised: history
// lives in the table, filtered -- a closed ticket keeps its row, it just loses queue/pin/claim.
// FEATURE: SES-112 -- the snapshot reader tolerates and reads the appended Design status /
// Kickoff columns; an empty Design status is read as untriaged, never as 'auto'.
// FEATURE: SES-110 -- the snapshot reader tolerates and reads the appended Epic column.
// FEATURE: SES-010 -- mechanizes the session-hygiene skill's checks as one script
// (retargeted to public.backlog_items by SES-83 (d) cycle 4; see the SNAPSHOT_REL note below)
//
// Mechanizes the `session-hygiene` skill's checks 1, 1b, 2, 3, 3c, 3d, 5, 5b, 5c, 5d, 5e, 6, 6b, 6c --
// previously a markdown checklist a session had to remember to run by hand
// (greps + git commands typed out fresh each time). This is the same logic as
// a single script, so "run session-hygiene" becomes "run this" instead of
// "re-derive these greps correctly, every session, from a description."
//
// Usage: node scripts/check-session-docs.js [--worktree=<path>]
// --worktree defaults to process.cwd() -- pass it explicitly when running from
// outside the target worktree (e.g. from a SessionStart hook whose cwd isn't
// guaranteed to be the worktree yet).
//
// Exit code is always 0 -- this is a tripwire (report and stop), never a
// build-breaking gate. Per the skill's own rule: findings first, no
// auto-fixing, a human/session decides what to do with what's flagged.
//
// SHARED_CHECKOUT is hardcoded to this repo's known shared-checkout path
// (C.md documents this pervasively as a fixed location, not portable across
// machines by design -- see CLAUDE.md's concurrent-sessions rule).

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { pathToFileURL } from "url";

const SHARED_CHECKOUT = "C:/Projects/deepbench-frontend";

// SES-83 (d) cycle 4, v7.0.115. The three FEATURES*.md files were emptied to
// legend-only stubs in cycle 2 (v7.0.113) -- `public.backlog_items` is the
// authority. Checks 3/3c/3d used to scan those files for ticket rows and, since
// the trim, found nothing and reported "all clear" (observed live by cycle 3,
// docs/SESSIONS.md:24). A lint that passes because its subject moved is worse
// than one that errors, so the row checks are retargeted here to the snapshot.
//
// Why the snapshot file and not Supabase directly: this script is a session-start
// tripwire and the session-hygiene skill's own standing rule is "keep every check
// cheap -- sizes and greps, never a full read." A network round trip does not
// belong in this path, and a checker that silently no-ops when credentials are
// absent would reintroduce exactly the false all-clear being fixed here. The
// snapshot is in-repo, needs no credentials, and is regenerated into every ship
// commit set (SES-83 (c)).
const SNAPSHOT_REL = "docs/backlog/BACKLOG-SNAPSHOT.md";
const BACKLOG_FILES = ["FEATURES.md", "FEATURES-NEXT.md", "FEATURES-LATER.md"];

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());

// ---- SES-199: the gating set --------------------------------------------------------------
// Kept next to arg() rather than beside the checks it names, because it is a POLICY statement
// about them, not part of any one check. See this file's header for why it is these classes at
// this severity; changing either is a decision, not a tidy-up.
const GATING_CHECKS = new Set(["9", "10", "11"]);
const GATING_SEVERITY = "FLAG";

// Pure: findings in, gating subset out. No disk, no network, no exit -- so the guard can drive it
// against fixtures, the same contract the check helpers below already keep.
function gatingFindings(findings) {
  return findings.filter(f => f.severity === GATING_SEVERITY && GATING_CHECKS.has(f.check));
}

function gateModeRequested(argv = process.argv) {
  return argv.slice(2).includes("--gate");
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

// ---- Check 1 & 2: CLAUDE-STATE.md size + rolling-window bullet count ----
function checkClaudeState(findings) {
  const p = path.join(WORKTREE, "CLAUDE-STATE.md");
  const text = readIfExists(p);
  if (text === null) {
    findings.push({ check: "1", severity: "WARN", detail: "CLAUDE-STATE.md not found" });
    return text;
  }
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > 10 * 1024) {
    findings.push({ check: "1", severity: "FLAG", detail: `CLAUDE-STATE.md is ${kb(bytes)} KB, over the ~10 KB baseline (post-cleanup baseline ~4.6 KB)` });
  }

  const lastSessionsIdx = text.indexOf("**Last 3 sessions:**");
  if (lastSessionsIdx !== -1) {
    const after = text.slice(lastSessionsIdx);
    // Stop at the next "---" section break or blank-then-heading, whichever's first.
    const sectionEnd = after.search(/\n---/);
    const window = sectionEnd === -1 ? after : after.slice(0, sectionEnd);
    const bulletCount = (window.match(/^\-\s/gm) || []).length;
    if (bulletCount > 3) {
      findings.push({ check: "2", severity: "FLAG", detail: `"Last 3 sessions" has ${bulletCount} bullets, over the rolling-window cap of 3` });
    }
  }
  return text;
}

// ---- Check 3s: the trimmed backlog stubs must stay empty of tickets ----
//
// Replaces the old row scan over these three files. Since cycle 2 (v7.0.113)
// they carry no ticket rows at all, so scanning them for Done-status leakage or
// blank Type cells is guaranteed to find nothing -- the false all-clear. What IS
// worth asserting about them is the inverse: a ticket row REAPPEARING here means
// a session filed into a stub instead of `public.backlog_items`, which is exactly
// the regression cycles 2 and 3 exist to prevent. Fires zero times today by
// construction; it is meant to be silent until it matters.
//
// The size baselines are MODERNIZED as of SES-120 (v7.0.186). They used to read
// { "FEATURES.md": 40, "FEATURES-LATER.md": 150 } -- row-era numbers, sized for
// files that still held every ticket. Against the post-v7.0.113 stubs those caps
// could not fire: measured live 2026-08-23, FEATURES.md is 14.2 KB against a
// 40 KB cap and FEATURES-LATER.md is 1.2 KB against a 150 KB cap, so the latter
// would have to grow 125x before saying anything. A cap that cannot fire is not
// a guard, it is a comment -- and this check's whole job is to notice a stub
// regrowing ticket rows. FEATURES-NEXT.md had no cap at all.
//
// The new numbers are each file's live size plus deliberate slack, so an edit to
// the legend/taxonomy prose these stubs legitimately carry stays quiet while a
// returning ticket table does not. This is a RATCHET, same discipline as
// ROW_LENGTH_CAP below: tighten toward the measured size as the stubs settle,
// never loosen to silence a real finding.
const STUB_SIZE_BASELINES_KB = {
  "FEATURES.md": 20,       // 14.2 KB live 2026-08-23 (Priority Class legend + Type taxonomy)
  "FEATURES-NEXT.md": 4,   //  1.2 KB live 2026-08-23 (legend-only stub)
  "FEATURES-LATER.md": 4,  //  1.2 KB live 2026-08-23 (legend-only stub)
};

function checkTrimmedStubs(findings) {
  for (const filename of BACKLOG_FILES) {
    const p = path.join(WORKTREE, "docs", filename);
    const text = readIfExists(p);
    if (text === null) {
      findings.push({ check: "3s", severity: "WARN", detail: `docs/${filename} not found -- cannot check it for stray ticket rows` });
      continue;
    }

    const bytes = Buffer.byteLength(text, "utf8");
    const baselineKb = STUB_SIZE_BASELINES_KB[filename];
    if (baselineKb && bytes > baselineKb * 1024) {
      findings.push({ check: "3", severity: "FLAG", detail: `docs/${filename} is ${kb(bytes)} KB, over the ~${baselineKb} KB stub baseline -- these files were trimmed to legend-only stubs (SES-83 (d), v7.0.113); growth here usually means ticket rows are being filed back into markdown instead of public.backlog_items` });
    }

    for (const line of text.split("\n")) {
      const idMatch = line.match(/^\|\s*([A-Z]{2,4}-[0-9]+[a-z]?(?:\s*\/\s*[A-Z]{2,4}-[0-9]+[a-z]?)*)\s*\|/);
      if (!idMatch) continue;
      findings.push({
        check: "3s",
        severity: "FLAG",
        detail: `docs/${filename} carries a ticket row for ${idMatch[1]}, but that file was trimmed to a legend-only stub (SES-83 (d), v7.0.113) -- new tickets are filed into public.backlog_items. Move it into the table; a ticket left here is invisible to work selection, which reads the table via SQL.`,
      });
    }
  }
}

// ---- Snapshot cell decoding (format documented in BACKLOG-SNAPSHOT.md's header) ----
//
// Escaping is applied in the order `\` -> `\\`, `|` -> `\|`, newline -> `\n`, so
// unescaping is a single left-to-right pass over those three sequences. An empty
// cell means SQL NULL; the literal marker `\e` means a stored empty string.
// Every cell is padded with EXACTLY one space per side and the reader removes one
// character per side rather than trimming -- four tickets store values with their
// own leading/trailing whitespace that a .trim() would silently eat.
function decodeCell(raw) {
  if (raw === undefined) return "";
  const inner = raw.slice(1, -1);
  if (inner === "") return "";
  if (inner === "\\e") return "";
  let out = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && i + 1 < inner.length) {
      const next = inner[i + 1];
      if (next === "\\") { out += "\\"; i++; continue; }
      if (next === "|") { out += "|"; i++; continue; }
      if (next === "n") { out += "\n"; i++; continue; }
    }
    out += inner[i];
  }
  return out;
}

function parseSnapshotRows(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    const l = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!/^\|\s*\d+\s*\|/.test(l)) continue; // data rows lead with the ordinal column
    const cells = l.split(/(?<!\\)\|/).slice(1, -1);
    // Deliberately `< 9`, not `!== 12`: cells[0..8] are the nine original fields,
    // the SES-110 `Epic` column is appended after them, SES-112's
    // `Design status` / `Kickoff` after that, and SES-115's `History residue`
    // after those -- so this reader keeps working on a pre-SES-110 snapshot
    // (9 cells), a pre-SES-112 one (10), a pre-SES-115 one (12), and a current
    // one (13). Tolerance is the right default here -- this is a lint over a generated
    // file, not the restore path. The strict cell-count guard lives in
    // export-backlog-snapshot.js's parseDocument(), which is the reference
    // reader and the thing that must fail loudly if writer and reader drift.
    if (cells.length < 9) continue;
    rows.push({
      id: decodeCell(cells[1]).trim(),
      type: decodeCell(cells[2]).trim(),
      pclass: decodeCell(cells[3]).trim(),
      status: decodeCell(cells[5]).trim(),
      description: decodeCell(cells[8]),
      // Empty on an older snapshot or an ungrouped ticket -- both mean "no epic".
      epic: decodeCell(cells[9]).trim(),
      // SES-112. Empty means "not yet triaged" on a current snapshot and "column
      // did not exist" on an older one; this lint treats both as untriaged, which
      // is the honest reading in either case. Never default it to 'auto' -- that
      // is the one substitution SES-112 exists to prevent.
      designStatus: decodeCell(cells[10]).trim(),
      kickoffLink: decodeCell(cells[11]).trim(),
      // SES-115. Derived by the exporter, empty for every active row and every
      // CLEAN history row; non-empty names the live-board state a done/removed
      // row should no longer hold. `cellCount` travels with it so check 3 can
      // tell "no residue anywhere" (healthy) from "this snapshot predates the
      // column" (the check cannot run) -- reporting those as the same thing is
      // the false all-clear this script's own header was rewritten to prevent.
      historyResidue: decodeCell(cells[12]).trim(),
      cellCount: cells.length,
    });
  }
  return rows;
}

// ---- Checks 3 / 3c / 3d, retargeted to public.backlog_items via the snapshot ----
//
// Thresholds were calibrated against the real 556-ticket board BEFORE being
// chosen, the same ratchet discipline SES-25a set for check 3d: `done` leakage
// fires 5 times and over-cap descriptions 3 times (both actionable and named
// individually), while blank Type fires 228 times and blank priority class 458.
// Emitting 686 individual findings would bury the 8 that can be acted on today,
// so those two report as one counted WARN line each. The 458 unclassed tickets
// are not a defect -- that is SES-85's known scope, and the line says so.
//
// SES-117 (v7.0.178) corrects what 3c's aggregated line SAYS, not what it counts:
// the 228 blank-Type rows are `later`-tier tickets that owe no Type under John's
// tier-scoped rule, so reporting them as a flat shortfall was aggregating the
// right rows behind the wrong sentence. See the 3c block below.
function checkBacklogSnapshot(findings) {
  const p = path.join(WORKTREE, SNAPSHOT_REL);
  const text = readIfExists(p);

  // A check that cannot run has to SAY so. Returning quietly here is the exact
  // failure this cycle exists to close: the caller would report "all clear" for
  // a backlog it never looked at.
  if (text === null) {
    findings.push({ check: "3", severity: "FLAG", detail: `${SNAPSHOT_REL} not found -- the backlog checks (3/3c/3d) could not run at all. Regenerate it with: node scripts/export-backlog-snapshot.js` });
    return;
  }

  const rows = parseSnapshotRows(text);
  if (rows.length === 0) {
    findings.push({ check: "3", severity: "FLAG", detail: `${SNAPSHOT_REL} parsed to zero ticket rows -- the backlog checks (3/3c/3d) could not run. The file is present but unreadable in the expected format; regenerate it with: node scripts/export-backlog-snapshot.js` });
    return;
  }

  // Check 3, RETARGETED by SES-115 (v7.0.173): a done/removed row is HISTORY, not drift.
  //
  // Register B1 as originally written ("archived/shipped tickets are history, never
  // imported or maintained") was read as "history leaves the table", so this check
  // flagged every `done` row it found. John's 2026-08-22 design revises that to
  // keep-and-filter: rows are NEVER deleted -- they stay in backlog_items forever as
  // live SQL history plus this snapshot's git log -- and "active" is a filter
  // (public.backlog_active) rather than a cleanup chore nobody was ever going to do.
  //
  // MEASURED before the retarget, on this clone: the old form emitted 37 FLAG lines
  // out of 49 total findings -- 76% of the report was noise, and it told every reader
  // to "close it out of the table", which is now precisely the wrong instruction.
  //
  // What remains genuinely wrong is a history row that never let go of the live board:
  // recompute_backlog_queue() clears a closed ticket's queue number and pin, and its
  // cycle releases the claim. Anything still set means a recompute was MISSED. The
  // exporter derives that into the `History residue` cell (see its residueOf()).
  const history = rows.filter(r => r.status === "done" || r.status === "removed");

  // A snapshot written before SES-115 has no residue column, so every cell reads
  // empty and this check would report a clean board it never actually looked at.
  // Say so instead -- same rule as the two guards above.
  if (history.length && !rows.some(r => r.cellCount >= 13)) {
    findings.push({ check: "3", severity: "FLAG", detail: `${SNAPSHOT_REL} predates SES-115 and carries no "History residue" column, so check 3 could not look at its ${history.length} history rows at all. Regenerate it with: node scripts/export-backlog-snapshot.js` });
  } else {
    for (const r of history.filter(r => r.historyResidue)) {
      findings.push({ check: "3", severity: "FLAG", detail: `backlog_items: ${r.id} is "${r.status}" but still holds live-board state (${r.historyResidue}) -- a closed ticket keeps its row (register B1, as revised: history lives in the table, filtered) but must lose its queue number, pin and claim. This is a missed recompute: run SELECT public.recompute_backlog_queue();` });
    }
  }

  // Check 3d, ported: the per-ticket length cap now applies to `description`,
  // which is where the narrative lives (CLAUDE-DESIGN.md step 9: move the detail
  // to docs/harvests/<ID>.md and leave the description a pointer).
  for (const r of rows) {
    if (r.description.length > ROW_LENGTH_CAP) {
      findings.push({
        check: "3d",
        severity: "FLAG",
        detail: `backlog_items: ${r.id} description is ${r.description.length} chars, over the ${ROW_LENGTH_CAP}-char cap -- move the detail to docs/harvests/${r.id}.md and leave a pointer (CLAUDE-DESIGN.md step 9). Never delete: append to the harvest file first, then trim the description.`,
      });
    }
  }

  // Check 3f, NEW -- duplicate ticket ids. Added because retargeting this script
  // surfaced one on the live board: CHI-48 exists twice with different Type and
  // description (two distinct tickets sharing one id), confirmed against
  // public.backlog_items directly and not just this snapshot. That is the exact
  // collision class CLAUDE.md's atomic-counter rule exists to prevent, and
  // nothing was watching for it -- the markdown-era files could not express it
  // cheaply because a ticket's id was not a queryable column. Fires once today,
  // so it is actionable rather than noise. Deliberately reports only: choosing
  // WHICH of two real tickets gets renumbered is a judgment call, not a lint's.
  const byId = new Map();
  for (const r of rows) {
    if (!r.id) continue;
    byId.set(r.id, (byId.get(r.id) || 0) + 1);
  }
  for (const [id, n] of byId) {
    if (n > 1) {
      findings.push({ check: "3f", severity: "FLAG", detail: `backlog_items: ticket id ${id} appears ${n} times -- two distinct tickets share one id. Claim ids atomically from feature_id_counter (CLAUDE.md) and renumber one of them; decide which by reading both, since each carries its own Type and description.` });
    }
  }

  // Check 3c, ported and aggregated -- see this function's header comment.
  //
  // SES-117 (v7.0.178): this line STATES the tier-scoped rule instead of bare-counting
  // blanks. The rule is John's, standing since 2026-07-08 and now structural rather than
  // remembered -- `ck_backlog_type_when_promoted` on public.backlog_items enforces
  // `tier = 'later' OR (type IS NOT NULL AND btrim(type) <> '')`. Type is not owed while a
  // ticket sits in `later`; it fills at the later -> now/next promotion, and the constraint
  // is what makes that self-enforcing.
  //
  // Why the wording mattered enough to change: bare-counting reported "228 of 556 have a
  // blank Type" as a WARN, which reads as 228 things to go fix. Every one of them is a
  // `later` row that owes nothing. The count is the same; what it MEANS is the opposite.
  //
  // The snapshot carries no Tier column (cells are #, ID, Type, Priority class, Title,
  // Status, Session, Harvest, Description, Epic, Design status, Kickoff, History residue),
  // so this check cannot split the count by tier itself -- and deliberately does not
  // pretend to. It reports the count and names the rule that governs it. Since the
  // constraint landed, a blank Type on a now/next row is not merely unlikely, it is
  // rejected by the database, so a blank here is a `later` row or the snapshot predates
  // the repair -- both worth one line, neither worth 228.
  const blankType = rows.filter(r => !r.type);
  if (blankType.length) {
    const examples = blankType.slice(0, 5).map(r => r.id).join(", ");
    findings.push({ check: "3c", severity: "WARN", detail: `backlog_items: ${blankType.length} of ${rows.length} tickets carry a blank Type (e.g. ${examples}). Type is tier-scoped, not universal: a \`later\` ticket owes no Type, and since SES-117 the constraint ck_backlog_type_when_promoted REJECTS a blank Type on any now/next row -- so these are later-tier rows (compliant, nothing to do) unless the snapshot predates that repair. Type fills at the later -> now/next promotion. Reported as one line rather than ${blankType.length} findings so it cannot bury the actionable flags above.` });
  }

  const unclassed = rows.filter(r => !r.pclass);
  if (unclassed.length) {
    findings.push({ check: "3e", severity: "WARN", detail: `backlog_items: ${unclassed.length} of ${rows.length} tickets carry no priority class and are therefore unpickable by work selection (runner-cycle.md step 5 requires priority_class IS NOT NULL). This is SES-85's classification sweep, not new drift -- expected until it lands.` });
  }
}

// ---- Checks 6, 6b, 6c: docs/STANDARDS.md drift (added SES-009b) ----
function checkStandardsDrift(findings) {
  const p = path.join(WORKTREE, "docs", "STANDARDS.md");
  const text = readIfExists(p);
  if (text === null) {
    findings.push({ check: "6", severity: "WARN", detail: "docs/STANDARDS.md not found" });
    return;
  }

  // 6: size baseline. 34 KB measured 2026-07-21 (SES-009b write time) -- 25%
  // slack before flagging, since this doc legitimately grows with new rules
  // over time (unlike FEATURES.md, unbounded growth here isn't automatically
  // bloat -- new standing rules are expected content, not drift).
  const bytes = Buffer.byteLength(text, "utf8");
  const STANDARDS_BASELINE_KB = 34;
  if (bytes > STANDARDS_BASELINE_KB * 1024 * 1.25) {
    findings.push({ check: "6", severity: "FLAG", detail: `docs/STANDARDS.md is ${kb(bytes)} KB, over the ~${STANDARDS_BASELINE_KB} KB baseline (+25% slack)` });
  }

  // 6b: duplicate category-letter definitions -- the exact bug SES-005 found
  // and fixed by hand in this same doc (Category K/M/L duplication).
  function findDupeLetters(regex, label) {
    const seen = new Map();
    for (const m of text.matchAll(regex)) {
      const letter = m[1];
      seen.set(letter, (seen.get(letter) || 0) + 1);
    }
    for (const [letter, count] of seen) {
      if (count > 1) {
        findings.push({ check: "6b", severity: "FLAG", detail: `docs/STANDARDS.md: ${label} "${letter}" defined ${count} times -- likely duplication (same class as the Category K/M/L bug SES-005 fixed by hand)` });
      }
    }
  }
  findDupeLetters(/^\*\*([A-Z])\.\s/gm, "Section 4 test category");
  findDupeLetters(/^### Category ([A-Z])\s/gm, "Section 5 checklist category");

  // 6c: dangling "Section N" cross-references -- extract real headers, flag
  // any prose mention of a Section number that isn't one of them.
  const realSections = new Set([...text.matchAll(/^## Section (\d+):/gm)].map(m => m[1]));
  const mentioned = new Set([...text.matchAll(/\bSection (\d+)\b/g)].map(m => m[1]));
  for (const n of mentioned) {
    if (!realSections.has(n)) {
      findings.push({ check: "6c", severity: "FLAG", detail: `docs/STANDARDS.md mentions "Section ${n}" but no "## Section ${n}:" heading exists -- likely a stale cross-reference from a since-renumbered/removed section` });
    }
  }
}

// ---- Checks 5, 5b, 5d: worktree <-> "In flight now" cross-reference ----
function gitWorktreeList() {
  let out;
  try {
    out = execFileSync("git", ["-C", SHARED_CHECKOUT, "worktree", "list", "--porcelain"], { encoding: "utf8" });
  } catch (e) {
    return null; // not fatal -- git may be unavailable in some sandboxes
  }
  const worktrees = [];
  for (const block of out.split("\n\n")) {
    const m = block.match(/^worktree (.+)$/m);
    if (m) worktrees.push(m[1].replace(/\\/g, "/"));
  }
  return worktrees;
}

function isAncestorOfDev(worktreePath) {
  try {
    execFileSync("git", ["-C", worktreePath, "merge-base", "--is-ancestor", "HEAD", "origin/dev"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Worktree lifecycle is a moving target -- other concurrent sessions add/remove
// worktrees and their own bullets while this script runs. Reading CLAUDE-STATE.md
// from THIS session's own (possibly hours-stale) worktree checkout for the
// cross-reference checks produces false positives: a bullet this session's
// snapshot still shows may have already been correctly removed upstream by the
// session that owned it. Fetch + read straight from origin/dev instead, same
// pattern CLAUDE.md's rule 3b fallback circuit-breaker already uses for exactly
// this staleness problem. Falls back to the local copy if git is unavailable.
function freshDevText(relPath, localFallbackText) {
  try {
    execFileSync("git", ["-C", SHARED_CHECKOUT, "fetch", "origin", "dev"], { stdio: "ignore" });
    return execFileSync("git", ["-C", SHARED_CHECKOUT, "show", `origin/dev:${relPath}`], { encoding: "utf8" });
  } catch {
    return localFallbackText;
  }
}

// Directory counterpart to freshDevText() -- same staleness rationale: another
// session's inflight file may have been added/removed on origin/dev more
// recently than this worktree's own checkout. Lists blob paths via ls-tree
// (works even though .claude/inflight/ may not exist locally in every worktree
// yet), then fetches each file's content the same way freshDevText() already does.
function freshDevDirEntries(relDirPath) {
  let names;
  try {
    const out = execFileSync("git", ["-C", SHARED_CHECKOUT, "ls-tree", "--name-only", "-r", "origin/dev", "--", relDirPath], { encoding: "utf8" });
    names = out.split("\n").map(l => l.trim()).filter(Boolean).map(p => path.basename(p));
  } catch {
    return []; // directory doesn't exist yet on origin/dev, or git unavailable
  }
  return names.map(name => ({
    name: name.replace(/\.md$/, ""),
    text: freshDevText(`${relDirPath}/${name}`, null),
  })).filter(e => e.text !== null);
}

// Generic section-bullet extractor -- "In flight now" and "Last 3 sessions"
// are both a bolded header followed by a run of "- " lines up to the next
// bolded header or "---" break. Shared by extractInFlightBullets() (needs the
// worktree-name capture) and the entry-length check (needs raw bullet text
// only, no name parsing).
function extractSectionLines(stateText, header) {
  if (!stateText) return [];
  const idx = stateText.indexOf(header);
  if (idx === -1) return [];
  const after = stateText.slice(idx);
  const end = after.search(/\n(\*\*[A-Z]|---)/); // next bolded header or section break
  const window = end === -1 ? after : after.slice(0, end);
  return window.split("\n").filter(l => /^\-\s/.test(l));
}

// (Retargeted 2026-07-21, SES-011 -- "In flight now" is no longer a
// CLAUDE-STATE.md text block a session's status lives in; each session now
// writes its own .claude/inflight/<short-session-name>.md file instead. The
// stateText param is intentionally unused now -- kept in the signature so
// call sites (checkWorktrees, checkBulletStaleness) don't need to change,
// only what feeds them.)
function extractInFlightBullets(stateText) {
  // Markers moved to repo-root inflight/ 2026-08-21 (John-approved, register B41 --
  // .claude/ paths fire the harness permission gate). Read the new home first; keep the
  // old path as a transition fallback so a marker pushed by a not-yet-rebased session
  // is still seen rather than its worktree misread as stale.
  return [...freshDevDirEntries("inflight"), ...freshDevDirEntries(".claude/inflight")];
}

// ---- Check 1b: per-entry character cap (added 2026-07-21, John asked directly
// after SES-010's own sweep flagged this as a Tier 1 item that never got built).
// Check 1 only catches the *whole file* growing past baseline -- a file that's
// technically under that cap can still hide one paragraph-length bullet that's
// exactly the bloat pattern the 2026-07-01/2026-07-07 cleanups existed to fix
// (STANDARDS.md's own rule: "2-4 sentences... not a single run-on sentence with
// a dozen clauses strung together with em-dashes"). 800 chars is calibrated
// against this file's own real entries at the time this check was written --
// generous enough for a genuinely detailed 3-4 sentence bullet, tight enough to
// catch a paragraph masquerading as one.
const ENTRY_LENGTH_CAP = 800;

// ---- Check 3d: per-ROW character cap (added SES-25a) ----
// CLAUDE-DESIGN.md line 214 has required "2-4 sentences" per FEATURES row since
// 2026-07-07, but nothing enforced it, so docs/FEATURES.md reached 290 KB across
// 175 rows (278 KB of that inside the rows themselves) while FEATURES-LATER.md
// holds 229 rows in 83 KB. Check 3 caps the FILE, which fires forever with no
// actionable target; this names the specific rows to fix.
//
// Deliberately set at 2000, not at the 2-4 sentences the prose asks for: 2000
// flags 33 of 175 rows -- the genuinely pathological ones -- where a 1000-char
// cap would flag 122 and be ignored as noise on day one. This is a RATCHET:
// tighten it toward ~1000 as the backlog drains. Do not tighten it in the same
// session that adds it.
const ROW_LENGTH_CAP = 2000;

function checkEntryLengths(findings, stateText) {
  // "In flight now" (retargeted 2026-07-21, SES-011): each session's status is
  // now a whole inflight/<name>.md file (repo root since 2026-08-21, B41; old
  // path kept as transition fallback), not a CLAUDE-STATE.md bullet
  // -- the file's full text is the "entry" this check caps.
  for (const entry of extractInFlightBullets(null)) {
    const len = entry.text.length;
    if (len > ENTRY_LENGTH_CAP) {
      findings.push({ check: "1b", severity: "FLAG", detail: `"In flight now" entry "${entry.name}" is ${len} chars, over the ${ENTRY_LENGTH_CAP}-char cap -- likely paragraph bloat (STANDARDS.md: default to 2-4 sentences, full narrative only for genuinely novel findings)` });
    }
  }

  // "Last 3 sessions" is unmoved (Context's explicit scope decision, SES-011)
  // -- still a CLAUDE-STATE.md text block, checked the same way as before.
  for (const line of extractSectionLines(stateText, "**Last 3 sessions:**")) {
    const len = line.length;
    if (len > ENTRY_LENGTH_CAP) {
      const nameMatch = line.match(/`([a-z0-9-]+-\d{4})`/i) || line.match(/^-\s*(\S+)/);
      const label2 = nameMatch ? nameMatch[1] : line.slice(0, 40) + "...";
      findings.push({ check: "1b", severity: "FLAG", detail: `"Last 3 sessions" entry "${label2}" is ${len} chars, over the ${ENTRY_LENGTH_CAP}-char cap -- likely paragraph bloat (STANDARDS.md: default to 2-4 sentences, full narrative only for genuinely novel findings)` });
    }
  }
}

function checkWorktrees(findings, stateText) {
  const registered = gitWorktreeList();
  if (registered === null) {
    findings.push({ check: "5", severity: "WARN", detail: "git worktree list failed -- skipping worktree cross-reference checks" });
    return;
  }
  const bullets = extractInFlightBullets(stateText);
  const bulletNames = new Set(bullets.map(b => b.name));

  // No self-exclusion here -- this session's own worktree is a real, currently
  // registered worktree with a real bullet (added right after setup, per
  // CLAUDE.md rule 6c), so it naturally passes every check below on its own
  // merits. Excluding it artificially previously caused check 5b/5d to treat
  // "registered but filtered out of the comparison set" as "not registered".
  const worktreesUnderManagement = registered.filter(p => p.includes("/.claude/worktrees/"));

  // Check 5: registered worktree, zero-ahead of dev, no marker.
  // The currently-running session's own worktree is always exempt here: its
  // marker was added locally (session-setup step 2) but isn't pushed to origin/dev
  // until its first commit, so comparing it against the freshly-fetched dev copy
  // would read as "no marker" until then -- a false positive, not a real
  // staleness signal.
  //
  // Check 5e (added 2026-07-23, SES-23): before calling a worktree stale, look on
  // its own disk for the marker. A session that created its marker correctly but
  // never staged it is INVISIBLE to the origin/dev comparison above -- and
  // presents with the exact signature check 5 reports as "finished, safe to
  // clean." Found live 2026-07-23: four worktrees at once, two of them under 45
  // minutes old, all four flagged as stale by check 5 while sitting on unstaged
  // markers. An on-disk marker means the session is (or recently was) real:
  // report the unpushed marker as the actual defect and suppress check 5's
  // misleading "likely finished" verdict for that worktree entirely.
  const selfName = path.basename(WORKTREE.replace(/\\/g, "/"));
  for (const wt of worktreesUnderManagement) {
    const name = wt.split("/").pop();
    if (name === selfName) continue;
    if (bulletNames.has(name)) continue;
    if (fs.existsSync(path.join(wt, "inflight", `${name}.md`)) ||
        fs.existsSync(path.join(wt, ".claude", "inflight", `${name}.md`))) {
      findings.push({ check: "5e", severity: "FLAG", detail: `worktree "${name}" has an inflight marker on disk that was never pushed to dev (session-setup step 2b) -- it is invisible to every other session and to check 5. Treat as LIVE, not stale: do NOT remove this worktree. The owning session should stage and push its marker.` });
      continue;
    }
    if (isAncestorOfDev(wt)) {
      findings.push({ check: "5", severity: "FLAG", detail: `worktree "${name}" has zero commits ahead of dev, no marker on dev, and no marker on disk -- likely finished but session-setup step 6 (cleanup) was skipped` });
    }
  }

  // Check 5b: directory on disk under .claude/worktrees/ that git never registered.
  const wtRoot = path.join(SHARED_CHECKOUT, ".claude", "worktrees");
  let onDisk = [];
  try {
    onDisk = fs.readdirSync(wtRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    // no worktrees dir yet -- nothing to check
  }
  const registeredNames = new Set(worktreesUnderManagement.map(p => p.split("/").pop()));
  for (const name of onDisk) {
    if (!registeredNames.has(name)) {
      findings.push({ check: "5b", severity: "FLAG", detail: `".claude/worktrees/${name}" exists on disk but was never registered by git worktree add -- likely an aborted/failed worktree add, safe to delete once confirmed no branch "session/${name}" exists either` });
    }
  }

  // Check 5d: bullet names a worktree that isn't registered at all (the inverse of check 5).
  const registeredNameSet = new Set(worktreesUnderManagement.map(p => p.split("/").pop()));
  for (const b of bullets) {
    if (!registeredNameSet.has(b.name)) {
      findings.push({ check: "5d", severity: "FLAG", detail: `"In flight now" bullet names worktree "${b.name}" which is not in git worktree list at all -- likely rule 7 (cleanup) ran without rule 8 (bullet removal)` });
    }
  }
}

// ---- Check 5c: inflight marker mentions an already-archived feature ID ----
//
// Recalibrated 2026-07-23 (SES-23's housekeeping pass). This check was matching
// EITHER a real archive row (`| ID |`) OR any backticked mention anywhere in the
// archive -- so an ID merely cross-referenced in some unrelated row's prose read
// as "archived." Two of eight live flags were wrong on that basis alone.
//
// The deeper limit is precision, not the matcher: a marker legitimately cites
// archived IDs as context -- the shipped mechanism it's fixing, or a record of
// what it logged -- and that is indistinguishable here from the bug this check
// exists to catch (prose describing shipped work as still pending). Measured
// against the real markers on dev, one of eight flags pointed at genuinely stale
// prose. So this is now a WARN worded as "go read the prose," not a FLAG worded
// as a defect -- the volume was what made housekeeping passes skim the group.
//
// A cleaner staleness signal exists and is deliberately NOT built here (its own
// item): marker age / worktree inactivity. The one genuinely stale marker found
// in that pass was six days old with a never-closed-out session -- ID archival
// was only an indirect proxy for that.
function checkBulletStaleness(findings, stateText, archiveText) {
  if (!archiveText) return;
  const archivedRow = id => new RegExp(`^\\|\\s*${id}\\s*\\|`, "m").test(archiveText);
  for (const b of extractInFlightBullets(stateText)) {
    // Dedupe per marker -- an ID named twice in one marker's prose is one
    // finding, not two (LOG-23 double-reported before this).
    const ids = [...new Set([...b.text.matchAll(/`([A-Z]{2,4}-[0-9]+[a-z]?)`/g)].map(m => m[1]))];
    for (const id of ids.filter(archivedRow)) {
      findings.push({ check: "5c", severity: "WARN", detail: `inflight marker "${b.name}" mentions ${id}, which has a row in docs/FEATURES-ARCHIVE.md -- read the prose before acting: citing an archived ID as context (the shipped mechanism being fixed, or a record of what this session logged) is legitimate and common. Only a marker presenting archived work as still pending is a real finding.` });
    }
  }
}


// ---- Check 8 (SES-172, Selfbuild M1): SESSIONS.md rotation tripwire ----
// SESSIONS.md hit 2.88 MB growing ~190 KB/day once Automated cycles began appending
// entries (measured 2026-08-23). SES-172 rotated pre-August entries to
// docs/SESSIONS-ARCHIVE-2026-0607.md and set the standing rule: the live file holds
// the current + previous month; older entries rotate VERBATIM (never summarized) to a
// dated sibling archive. This check is the tripwire that keeps the rotation happening.
function checkSessionsLogSize(findings) {
  const p8 = path.join(WORKTREE, 'docs', 'SESSIONS.md');
  const t = readIfExists(p8);
  if (t === null) return;
  const bytes = Buffer.byteLength(t, 'utf8');
  if (bytes > 1.5 * 1024 * 1024) {
    findings.push({ check: '8', severity: 'FLAG',
      detail: `docs/SESSIONS.md is ${kb(bytes)} KB, over the ~1.5 MB rotation threshold -- rotate entries older than the previous month VERBATIM into a dated docs/SESSIONS-ARCHIVE-*.md (SES-172 shape: byte-accounted move, pointer note left behind, stamp appendices stay in the live file)` });
  }
}

// ===========================================================================
// Checks 9, 10, 11 (SES-176, Selfbuild M2): THE TRUTH TRIPWIRE
// ===========================================================================
// Checks 1-8 ask "is this file too big / is this row shaped right?". These three ask a
// different question: "do two files still tell the same story?" They read the rule registry
// SES-174 built (public.governance_rules) through its repo-side snapshot.
//
// WHY THE SNAPSHOT AND NOT SUPABASE -- the same reason checks 3/3c/3d read BACKLOG-SNAPSHOT.md,
// stated at the top of this file: a network round trip does not belong in a session-start
// tripwire, and a checker that silently no-ops without credentials is a false all-clear.
// governance_rules is additionally service_role-only (SES-174 locked anon/authenticated to zero
// privileges), so a live read could not work here even in principle. A MISSING snapshot is
// therefore a loud FLAG naming the regeneration command -- never a silent skip.
const RULES_SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";

// Vocabulary that marks a mention as retirement-aware. A mention of a retired rule that sits
// inside a window carrying any of these is a doc correctly RECORDING the retirement; one with
// none is the doc still asserting the rule.
const RETIREMENT_VOCAB = [
  "retire", "retired", "retires", "retiring",
  "supersede", "superseded", "supersedes", "superseding",
  "struck", "strike", "removed", "removal",
  "replaced", "replaces", "replacement",
  "no longer", "not any more", "no more",
  "do not reinstate", "deprecat", "obsolete", "former", "formerly", "used to",
];

// Floor for the window read around each mention, used only when the enclosing block is smaller.
// The real unit is the enclosing block (see enclosingBlock) -- a fixed character count was the
// FIRST implementation of this check and it was wrong in both directions on live data, which is
// recorded here because the obvious version is the one a later editor will reach for again:
//   - FALSE POSITIVE at 280 chars: docs/runbooks/runner-cycle.md's paragraph opens "the
//     cycle-level lease is RETIRED (register B42)" and mentions B31 some 430 characters later, so
//     the marker fell outside the window and a correctly-retired passage was flagged.
//   - The block unit fixes that, because the marker and the mention are one paragraph.
const RETIREMENT_WINDOW = 280;

// ---- Rules-snapshot table reader. Reuses decodeCell() above, which is why the exporter writes
// ---- BACKLOG-SNAPSHOT.md's exact escaping: one format, one decoder.
const RULE_FIELDS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

function parseRulesSnapshot(text) {
  const rules = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    // Split on UNESCAPED pipes only -- the same negative lookbehind parseSnapshotRows() above
    // uses, and for the same reason. A rule statement may legitimately contain a `|` (stored as
    // `\|`), and a plain split("|") over-produces cells, fails the length guard below, and drops
    // the rule from the registry SILENTLY -- a check that quietly stops covering a rule is the
    // precise failure mode this whole file's header warns about.
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== RULE_FIELDS.length) continue;
    const decoded = cells.map(decodeCell);
    if (decoded[0] === "Rule" || /^-+$/.test(decoded[0])) continue; // header / separator
    const row = {};
    RULE_FIELDS.forEach((f, i) => { row[f] = decoded[i]; });
    if (!row.id) continue;
    rules.push(row);
  }
  return rules;
}

// A rule id is matched as a whole token so `B2` cannot match inside `B25` and `B25` cannot match
// inside `B250`. Ids are alphanumeric-with-hyphens, so the guard is "not adjacent to a word
// character", applied on both sides.
function ruleIdOccurrences(text, id) {
  const out = [];
  const needle = id;
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at === -1) return out;
    const before = at === 0 ? "" : text[at - 1];
    const after = text[at + needle.length] ?? "";
    const bad = /[A-Za-z0-9_]/;
    if (!bad.test(before) && !bad.test(after)) out.push(at);
    from = at + needle.length;
  }
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// The semantic unit these register docs are written in: one bullet, or one paragraph. Expands
// from a hit to the nearest enclosing block boundary on each side -- a blank line, a new list
// item (`- ` / `* `), a heading, or a bold lead-in (`**`), which is how RUNNER-GOV and the
// runbooks start every register entry. Falls back to +/-RETIREMENT_WINDOW characters when the
// block resolves smaller than that, so a one-line entry still gets a sentence of context.
// The leading `[ \t]*` on each alternative is load-bearing and was added after a live miss:
// RUNNER-GOV indents its sub-entries ("  **Second half of his line NOT actioned…"), so a pattern
// anchored at `\n**` skipped those boundaries entirely, the block ran back into the PREVIOUS
// register entry, and a live-voice mention of B31 cleared on retirement vocabulary that belonged
// to a different rule. A too-greedy block is a silent false NEGATIVE, which is the worse
// direction for a tripwire.
const BLOCK_START_RE = /\n[ \t]*\n|\n[ \t]*[-*]\s|\n[ \t]*#{1,6}\s|\n[ \t]*\*\*/g;

function enclosingBlock(text, index) {
  let start = 0;
  let end = text.length;
  BLOCK_START_RE.lastIndex = 0;
  for (const m of text.matchAll(BLOCK_START_RE)) {
    if (m.index < index) {
      start = m.index;
    } else {
      end = m.index;
      break;
    }
  }
  // NO character-count fallback for a short block, deliberately. The first version of this
  // function widened any block under 2*RETIREMENT_WINDOW back out to a fixed character window
  // "for context", and its own regression control caught what that does: on a two-line register
  // entry the widened window reaches into the PREVIOUS entry and clears the mention on that
  // rule's retirement vocabulary. A short block asserting a withdrawn rule with no marker is
  // exactly what this check is for -- it must flag, not borrow an alibi from its neighbour.
  return text.slice(start, end);
}

// HTML comments in these docs are the provenance/changelog chain (every ship prepends one), not
// live voice. They quote retired rule ids constantly -- RUNNER-GOV's header block alone names B1,
// B30, B31, B38 and B39 -- so scanning them produces findings about a file's HISTORY rather than
// what it currently asserts. Blanked to spaces rather than removed so every offset, and therefore
// every reported line number, stays exact.
function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, " "));
}

// GitHub-style heading slug: lowercase, drop anything but word chars/spaces/hyphens, spaces to
// hyphens. Used to resolve a `#anchor` against a markdown heading.
// CONSECUTIVE SPACES ARE NOT COLLAPSED, and that is the whole correctness of this function.
// GitHub maps each space to its own hyphen after dropping punctuation, so removing an `&` or an
// em-dash leaves the spaces that flanked it and yields a DOUBLE hyphen. Live proof, which a
// `\s+` collapse gets wrong: docs/STANDARDS.md's "## Section 1: Session Naming & Versioning"
// slugs to `section-1-session-naming--versioning`, which is byte-for-byte the anchor
// CAP-VERSION-STRICT-INCREMENT stores. Collapsing produced a single hyphen, failed to resolve a
// perfectly good pointer, and reported a WARN about a section that is right there.
function headingSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");
}

function anchorResolves(docText, anchor) {
  if (!anchor) return true; // no anchor to resolve
  // (a) a markdown heading whose slug matches
  for (const m of docText.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    if (headingSlug(m[1]) === anchor.toLowerCase()) return true;
  }
  // (b) an explicit anchor: <a name="x">, <a id="x">, or a {#x} attribute
  if (new RegExp(`<a\\s+(?:name|id)=["']${escapeRe(anchor)}["']`, "i").test(docText)) return true;
  if (docText.includes(`{#${anchor}}`)) return true;
  // (c) the register-entry form these docs actually use for rule ids: `- **B1. …` / `**B1:` /
  //     `**B1 —`. This is how RUNNER-GOV-0820-REQUIREMENTS.md writes all 40 of its B-rules.
  if (new RegExp(`\\*\\*${escapeRe(anchor)}[.:)\\s—-]`, "").test(docText)) return true;
  return false;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadRules(findings) {
  const p = path.join(WORKTREE, RULES_SNAPSHOT_REL);
  const text = readIfExists(p);
  if (text === null) {
    findings.push({ check: "9", severity: "FLAG", detail: `${RULES_SNAPSHOT_REL} not found -- the truth checks (9/10/11) could not run at all. Regenerate it with: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/export-governance-snapshot.js` });
    return null;
  }
  const rules = parseRulesSnapshot(text);
  if (!rules.length) {
    findings.push({ check: "9", severity: "FLAG", detail: `${RULES_SNAPSHOT_REL} parsed to zero rule rows -- the truth checks (9/10/11) could not run. The file is present but unreadable in the expected format; regenerate it with: node scripts/export-governance-snapshot.js` });
    return null;
  }
  return rules;
}

// ---- Check 9: a retired or superseded rule still stated in LIVE VOICE ----
// ID-anchored, deliberately, and this is the design decision most likely to be "simplified" into
// something that cannot fire. The registry's `statement` column is SES-174's PARAPHRASE of the
// rule, not the doc's literal sentence, so searching prose for the statement verbatim finds
// nothing and ships a check that passes forever. The rule ID is the one string that genuinely
// appears in both places.
function checkRetiredRulesInLiveVoice(findings, rules, docCache) {
  const dead = rules.filter(r => r.status && r.status !== "live");
  for (const rule of dead) {
    for (const [rel, raw] of docCache) {
      const text = stripHtmlComments(raw);
      const hits = ruleIdOccurrences(text, rule.id);
      if (!hits.length) continue;
      const bare = [];
      for (const at of hits) {
        const win = enclosingBlock(text, at).toLowerCase();
        if (!RETIREMENT_VOCAB.some(v => win.includes(v))) bare.push(lineOf(text, at));
      }
      if (bare.length) {
        const succ = rule.superseded_by ? ` (superseded by ${rule.superseded_by})` : "";
        findings.push({
          check: "9",
          severity: "FLAG",
          detail: `rule ${rule.id} is \`${rule.status}\`${succ} in the registry, but ${rel} states it in live voice at line${bare.length > 1 ? "s" : ""} ${bare.join(", ")} with no retirement marker in the surrounding text -- a session reading that doc would treat a withdrawn rule as current. Either mark the passage retired or flip the registry row back to live; the two must not disagree.`,
        });
      }
    }
  }
}

// ---- Check 10: every canonical_doc pointer resolves ----
// A rule whose canonical home does not exist is a rule with no authoritative text at all, which
// is the failure the registry was built to end.
function checkRulePointers(findings, rules, docCache) {
  const missingFile = new Map();   // docpath -> [ids]
  const missingAnchor = new Map(); // "docpath#anchor" -> [ids]
  for (const rule of rules) {
    const raw = (rule.canonical_doc || "").trim();
    if (!raw) {
      findings.push({ check: "10", severity: "FLAG", detail: `rule ${rule.id} has no canonical_doc -- it has no authoritative home. Set one on the governance_rules row and re-export the snapshot.` });
      continue;
    }
    const [docPath, anchor] = raw.split("#");
    const text = docCache.has(docPath) ? docCache.get(docPath) : readIfExists(path.join(WORKTREE, docPath));
    if (text === null) {
      if (!missingFile.has(docPath)) missingFile.set(docPath, []);
      missingFile.get(docPath).push(rule.id);
      continue;
    }
    if (!anchorResolves(text, anchor)) {
      const key = raw;
      if (!missingAnchor.has(key)) missingAnchor.set(key, []);
      missingAnchor.get(key).push(rule.id);
    }
  }
  // Aggregated: 40 rules pointing at one deleted file is one problem, not 40 findings.
  for (const [docPath, ids] of missingFile) {
    findings.push({ check: "10", severity: "FLAG", detail: `canonical_doc "${docPath}" does not exist, and ${ids.length} rule${ids.length > 1 ? "s" : ""} point at it (${ids.slice(0, 6).join(", ")}${ids.length > 6 ? ", …" : ""}) -- those rules have no authoritative text. Fix the path on the governance_rules rows or restore the file.` });
  }
  for (const [ref, ids] of missingAnchor) {
    findings.push({ check: "10", severity: "WARN", detail: `canonical_doc "${ref}" names a section that could not be located in that file (rule${ids.length > 1 ? "s" : ""} ${ids.slice(0, 6).join(", ")}${ids.length > 6 ? ", …" : ""}). The file exists, so this is a stale anchor rather than a missing home -- WARN, not FLAG.` });
  }
}

// ---- Check 11: every {{rule:ID}} marker resolves to a registry row ----
// FORWARD GUARD, stated as one rather than dressed up as a live catch. SES-175 introduces these
// markers and is `needs-john` at the time of writing, so a clean run today means "there are no
// markers yet", not "the markers are all fine". Measured before shipping: zero real markers exist
// (the only `{{rule:` strings in the repo are inside BACKLOG-SNAPSHOT.md TICKET TEXT describing
// SES-175 -- which is data, and is why the generated snapshots are excluded from the scan).
// The DOCUMENTATION PLACEHOLDER is not a marker. `{{rule:ID}}` is how SES-175's ticket text, this
// runbook family and session-hygiene.md all WRITE ABOUT the syntax, and `ID` is not a name any rule
// may have. Found immediately: the first run of check 11 after session-hygiene.md documented it
// flagged that documentation, which is the "a section fills with noise and stops being read"
// failure SES-127 warns about, arriving via a check meant to prevent drift.
const MARKER_PLACEHOLDERS = new Set(["ID", "<ID>", "RULE-ID", "<RULE-ID>", "rule-id"]);

function checkRuleMarkers(findings, rules, docCache) {
  const known = new Set(rules.map(r => r.id));
  for (const [rel, text] of docCache) {
    for (const m of text.matchAll(/\{\{rule:([^}]*)\}\}/g)) {
      const id = m[1].trim();
      if (known.has(id) || MARKER_PLACEHOLDERS.has(id)) continue;
      findings.push({ check: "11", severity: "FLAG", detail: `${rel} line ${lineOf(text, m.index)} carries the marker {{rule:${id}}}, which is not a rule id in ${RULES_SNAPSHOT_REL} -- it would render as nothing. Fix the id, or add the rule to public.governance_rules and re-export.` });
    }
  }
}

// The scan set is DERIVED from the registry (the distinct canonical_doc files) plus the runbooks
// directory, never hardcoded -- so adding a rule whose home is a new file extends the scan with
// no edit here. Generated data files are excluded: BACKLOG-SNAPSHOT.md carries ticket PROSE that
// quotes rule ids and marker syntax, and RULES-SNAPSHOT.md is the input itself.
const TRUTH_SCAN_EXCLUDE = new Set([RULES_SNAPSHOT_REL, "docs/backlog/BACKLOG-SNAPSHOT.md"]);

function buildDocCache(rules) {
  const rels = new Set();
  for (const r of rules) {
    const p = (r.canonical_doc || "").split("#")[0].trim();
    if (p) rels.add(p);
  }
  const runbookDir = path.join(WORKTREE, "docs", "runbooks");
  try {
    for (const f of fs.readdirSync(runbookDir)) {
      if (f.endsWith(".md")) rels.add(`docs/runbooks/${f}`);
    }
  } catch {
    // no runbooks directory in this checkout -- the registry-derived set still stands
  }
  const cache = new Map();
  for (const rel of [...rels].sort()) {
    if (TRUTH_SCAN_EXCLUDE.has(rel)) continue;
    const text = readIfExists(path.join(WORKTREE, rel));
    if (text !== null) cache.set(rel, text);
  }
  return cache;
}

// ---- Check 12 & 13: SES-200, the SES-176 remainder --------------------------------------------
// SES-176 shipped partial and named three unshipped pieces; two of them are here. (The third --
// findings become backlog rows -- is a different mechanism, needs the atomic id claim and an
// --apply path, and is filed as its own ticket rather than left ownerless, which is the crack this
// ticket exists to close.)
//
// CHECK 12 IS ID-ANCHORED WITH A STATEMENT-OVERLAP TEST, and the first half of that is inherited
// rather than invented: check 9's header already establishes that the registry `statement` is a
// PARAPHRASE, so a check matching it against prose can never fire. So the ID finds the candidate
// and the overlap decides whether the passage is a COPY or a CITATION -- the repo is full of
// legitimate citations ("register B42", "per B24"), and a check that flagged those would be noise.
// THE THRESHOLD IS MEASURED, NOT FELT. Live, at this ship: 113 live-rule ID occurrences outside
// their canonical homes; excluding rendered blocks, the overlap distribution is a continuum with no
// natural gap, so the line is drawn where the words themselves justify it -- 0.9 means the passage
// reproduces essentially the whole statement, which is a copy by any reading, where 0.5 only means
// it discusses the same subject. That yields 4 findings (B34, B12, B18 x2) and 0 at 0.95.
// WARN, NOT FLAG, and the reason is the same one v7.0.242 used to draw the gating line: the
// canonical text is intact and correct here -- these are duplications awaiting SES-201's marker
// migration, which is that ticket's whole job. Promoting check 12 to FLAG is the right move once
// SES-201 has driven the population to zero, and is deliberately not done in advance of it.
const RULE_COPY_OVERLAP = 0.9;

// Words this short, or this common, separate nothing -- every governance paragraph contains them.
const COPY_STOPWORDS = new Set(
  ("the a an and or of to in on for is are be by with that this it its from as at not never always " +
   "must should can cannot than then when which who what how any all one two").split(" ")
);

// Check 12 uses a PARAGRAPH window, not check 9's enclosingBlock(), and the difference is a
// different question rather than a preference. Check 9 asks "is there a retirement marker NEAR
// this id?" -- a proximity test, well served by a bounded +/-280-character window. Check 12 asks
// "does this passage REPRODUCE the statement?", and a governance paragraph routinely runs longer
// than that window: MEASURED, the 280-char form found 1 of the 4 copies a paragraph window finds
// (it caught B34 and missed B12 and both B18s, whose restatements sit inside long paragraphs).
// A checker that reports one quarter of what it can see is the "reports green while looking at
// nothing" failure in a milder costume.
function enclosingParagraph(text, index) {
  const a = text.lastIndexOf("\n\n", index);
  const b = text.indexOf("\n\n", index);
  return text.slice(a < 0 ? 0 : a + 2, b < 0 ? text.length : b);
}

function statementContentWords(statement) {
  const raw = String(statement ?? "").toLowerCase().match(/[a-z_][a-z0-9_]{4,}/g) || [];
  return [...new Set(raw)].filter(w => !COPY_STOPWORDS.has(w));
}

function statementOverlap(blockText, words) {
  if (!words.length) return 0;
  const hay = blockText.toLowerCase();
  return words.filter(w => hay.includes(w)).length / words.length;
}

function checkRuleTextOutsideHome(findings, rules, docCache) {
  for (const rule of rules.filter(r => r.status === "live")) {
    const home = (rule.canonical_doc || "").split("#")[0].trim();
    const words = statementContentWords(rule.statement);
    if (!words.length) continue;
    const sites = [];
    for (const [rel, raw] of docCache) {
      if (rel === home) continue;
      // Occurrences are found in the RAW text and the block is taken from it, because
      // stripHtmlComments() shifts every index after the first comment -- reading one and slicing
      // the other silently windows the wrong passage. Check 9 can strip first because it discards
      // comments wholesale; here the comment matters twice, so the stripping happens per BLOCK:
      // the marker test needs the raw block (stripping removes the `{{rule:ID}}` comment, which
      // would flag every rendered block -- the one sanctioned restatement -- at an overlap of 1.0),
      // and the overlap test needs it stripped (provenance prose is not a restatement of the rule).
      for (const at of ruleIdOccurrences(raw, rule.id)) {
        const rawBlock = enclosingParagraph(raw, at);
        if (rawBlock.includes(`{{rule:${rule.id}}}`)) continue;
        if (statementOverlap(stripHtmlComments(rawBlock), words) < RULE_COPY_OVERLAP) continue;
        sites.push(`${rel}:${lineOf(raw, at)}`);
      }
    }
    if (sites.length) {
      findings.push({
        check: "12",
        severity: "WARN",
        detail: `rule ${rule.id}'s statement is restated outside its canonical home (${home || "unset"}) at ${sites.join(", ")}, with no {{rule:${rule.id}}} marker -- so that copy will not move when the registry row does. Render it instead: add the marker and run node scripts/render-rule-blocks.js --write. This is the population SES-201 migrates; WARN rather than FLAG because the canonical text is intact.`,
      });
    }
  }
}

// CHECK 13 -- one procedure, two live homes. The ticket names the shape: the failure step 5 and
// step 7 had before v7.0.114, and the B40 claim SQL that GOVERNANCE-MODES.md carries as a third
// home today. A procedure is a fenced block, so this one is mechanical and needs no threshold:
// identical normalised bodies in two different docs is the finding, full stop.
//
// IT READS A WIDER SET THAN CHECKS 9-12 AND THAT IS DELIBERATE. Those scan the RULES' docs -- the
// canonical homes plus the runbooks. A duplicated procedure can live anywhere a procedure is
// written down, and the live case proves it: GOVERNANCE-MODES.md is nobody's canonical_doc, so the
// rule-doc set misses the very instance this ticket cites. The set is DERIVED (root *.md, docs/*.md,
// docs/runbooks/*.md) rather than hand-listed, minus the HISTORY files -- SESSIONS.md and
// FEATURES-ARCHIVE.md quote procedures as a RECORD of what was done, which is correct and must
// never be flagged as a second home. Same distinction check 9 makes when it strips provenance
// comments before reading for live voice.
// MEASURED at this ship: 63 docs, 181 qualifying blocks, exactly 1 duplicate -- the one the ticket
// names. FLAG, not WARN: two live copies of an executable procedure drift silently and one of them
// is then wrong, which is a different and worse thing than a restated sentence.
const PROCEDURE_MIN_CHARS = 60;
const PROCEDURE_HISTORY_DOCS = new Set(["docs/SESSIONS.md", "docs/FEATURES-ARCHIVE.md"]);

// Comment lines are stripped before hashing so the same procedure carrying two different
// explanatory headers still reads as one procedure -- which is the case worth catching.
function normalizeProcedure(body) {
  return String(body)
    .split("\n")
    .filter(l => !/^\s*(--|\/\/|#)/.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function collectProcedureBlocks(docs) {
  const blocks = new Map();
  for (const [rel, text] of docs) {
    const re = /```[a-z]*\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(text))) {
      const norm = normalizeProcedure(m[1]);
      if (norm.length < PROCEDURE_MIN_CHARS) continue;   // a one-liner is a fragment, not a procedure
      if (!blocks.has(norm)) blocks.set(norm, []);
      blocks.get(norm).push({ rel, line: lineOf(text, m.index) });
    }
  }
  return blocks;
}

function duplicateProcedureHomes(docs) {
  const dupes = [];
  for (const [norm, sites] of collectProcedureBlocks(docs)) {
    const homes = new Set(sites.map(s => s.rel));
    if (homes.size > 1) dupes.push({ norm, sites });
  }
  return dupes;
}

function buildProcedureDocs(findings) {
  const rels = [];
  const push = rel => { if (!PROCEDURE_HISTORY_DOCS.has(rel)) rels.push(rel); };
  try {
    for (const f of fs.readdirSync(WORKTREE)) if (f.endsWith(".md")) push(f);
    for (const f of fs.readdirSync(path.join(WORKTREE, "docs"))) if (f.endsWith(".md")) push(`docs/${f}`);
    for (const f of fs.readdirSync(path.join(WORKTREE, "docs", "runbooks"))) if (f.endsWith(".md")) push(`docs/runbooks/${f}`);
  } catch {
    // A partial listing still checks what it found; a checkout with no docs/ directory reports
    // nothing rather than throwing -- but say so, because a check that cannot run must not pass
    // silently (the same rule check 3 keeps about a missing snapshot).
    findings.push({ check: "13", severity: "WARN", detail: "could not list the doc tree -- check 13 (duplicate procedure homes) ran against a partial file set or not at all." });
  }
  const docs = new Map();
  for (const rel of rels.sort()) {
    const text = readIfExists(path.join(WORKTREE, rel));
    if (text !== null) docs.set(rel, text);
  }
  return docs;
}

function checkProcedureHomes(findings) {
  for (const d of duplicateProcedureHomes(buildProcedureDocs(findings))) {
    const where = d.sites.map(s => `${s.rel}:${s.line}`).join(", ");
    findings.push({
      check: "13",
      severity: "FLAG",
      detail: `one procedure, ${new Set(d.sites.map(s => s.rel)).size} live homes: an identical code block appears at ${where}. Two copies of an executable procedure drift silently and then one of them is wrong -- keep it in ONE doc and have the others cite that home. First 70 chars: "${d.norm.slice(0, 70)}"`,
    });
  }
}

function checkTruthTripwire(findings) {
  const rules = loadRules(findings);
  if (!rules) return;
  const docCache = buildDocCache(rules);
  checkRetiredRulesInLiveVoice(findings, rules, docCache);
  checkRulePointers(findings, rules, docCache);
  checkRuleMarkers(findings, rules, docCache);
  checkRuleTextOutsideHome(findings, rules, docCache);
  checkProcedureHomes(findings);
}

// ===========================================================================
// Check 14 (SES-45): a kickoff's Section 8 test RECREATES the logic under test
// ===========================================================================
// See this file's header for the full predicate, the WARN-not-FLAG reasoning, and the two edits
// this check forbids. Summary: Section-8-region fenced block, defines a function the doc's own
// prose names (backticked `N()`) as the subject under test, imports nothing real, AND that name is
// a real symbol in this repo's own src/ | api/ | lib/ -- all four required.

// Entry heading only. Deliberately `\b8\b` via the trailing word-boundary rather than a bare "8" --
// "8" followed immediately by a word character ("8b") fails the boundary and is correctly refused
// entry, so "## Section 8b -- LIVE API TEST" can never be mistaken for the start of Section 8 even
// before the "next ##-heading" rule below gets a chance to end an already-open region at it.
const SECTION_8_START_RE = /^##\s*(?:Section\s*)?8\b/i;

// Pure. The region is bounded by nothing more than "the next ##-level heading" -- see the header
// note on why that alone is what excludes Section 8b, with no special case for it needed here.
function section8Region(text) {
  const lines = text.split("\n");
  const out = [];
  let inSec = false;
  for (const line of lines) {
    if (!inSec && SECTION_8_START_RE.test(line)) {
      inSec = true;
      out.push(line);
      continue;
    }
    if (inSec && /^##\s/.test(line)) {
      inSec = false; // any next ##-level heading ends the region, Section 8b included
      continue;
    }
    if (inSec) out.push(line);
  }
  return out.join("\n");
}

// Pure. Fenced blocks in the region, restricted to JS-ish fences (an untagged fence defaults to
// being read, same as the probe this was measured with -- a Section 8 Node test is JS far more
// often than it is tagged, and an untagged real hit is worse to miss than a false read of a JSON
// fixture block, which defines no function and so cannot itself trip the predicate anyway).
const JS_FENCE_LANGS = new Set(["", "js", "javascript", "mjs", "node", "ts"]);
function codeFencesInRegion(region) {
  const out = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(region))) {
    const lang = (m[1] || "").toLowerCase();
    if (!JS_FENCE_LANGS.has(lang)) continue;
    out.push(m[2]);
  }
  return out;
}

// Pure. Function-definition names inside one fenced block.
const DEFINED_NAME_RE = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/g;
function definedFunctionNames(code) {
  const names = new Set();
  let m;
  DEFINED_NAME_RE.lastIndex = 0;
  while ((m = DEFINED_NAME_RE.exec(code))) names.add(m[1] || m[2] || m[3]);
  return names;
}

// Pure. True when the block imports a real implementation by any of the four forms.
const REAL_IMPORT_RE = /(?:^|\n)\s*import\s[\s\S]*?from\s*['"]|(?:^|\n)\s*import\s*\(|require\s*\(\s*['"]|await\s+import\s*\(/;
function importsRealImplementation(code) {
  return REAL_IMPORT_RE.test(code);
}

// Pure. Names the doc's own prose calls out as the subject under test: a backticked `name()`
// ANYWHERE in the doc, outside any fenced code -- deliberately not scoped to the Section 8 region,
// since a kickoff typically introduces its test subject in prose (Section 5 tasks, Section 7 scope)
// before Section 8 ever defines it.
function backtickedSubjectNames(text) {
  const stripped = text.replace(/```[\s\S]*?```/g, "");
  const names = new Set();
  const re = /`([A-Za-z_$][\w$]*)\(\)`/g;
  let m;
  while ((m = re.exec(stripped))) names.add(m[1]);
  return names;
}

// Pure: findings in, findings out, no disk/network -- same contract as checkRuleTextOutsideHome.
// kickoffDocs: Map<relPath, text>. repoSymbols: Set<name> of real symbols found in src/ | api/ |
// lib/ (discriminator #4 in the header). An empty repoSymbols means the discriminator could not be
// built at all (no source dirs found) -- report nothing rather than fire on an unverifiable name.
function checkRecreatedLogicInKickoffs(findings, kickoffDocs, repoSymbols) {
  if (!repoSymbols || repoSymbols.size === 0) return;
  const hits = [];
  for (const [rel, text] of kickoffDocs) {
    const region = section8Region(text);
    if (!region.trim()) continue;
    const blocks = codeFencesInRegion(region);
    if (!blocks.length) continue;
    const subjects = backtickedSubjectNames(text);
    if (!subjects.size) continue;
    for (const code of blocks) {
      if (importsRealImplementation(code)) continue;
      const defs = definedFunctionNames(code);
      const recreated = [...defs].filter(n => subjects.has(n) && repoSymbols.has(n));
      if (recreated.length) hits.push({ file: rel, recreated });
    }
  }
  if (!hits.length) return;
  const examples = hits.slice(0, 5).map(h => `${h.file} -> ${h.recreated.join(", ")}`).join("; ");
  findings.push({
    check: "14",
    severity: "WARN",
    detail: `${hits.length} kickoff Section 8 test block${hits.length > 1 ? "s" : ""} define a function the kickoff's own prose names as the subject under test (a backticked \`N()\` mention outside any fenced code), import nothing real, and that name is a real symbol in this repo's src/, api/, or lib/ -- e.g. ${examples}. docs/STANDARDS.md Section 4's SES-45 rule: "A test must assert against the REAL implementation. Logic recreated inside the test file is not a test -- it is a second implementation agreeing with itself." These are HISTORICAL kickoffs predating this lint -- a migration backlog, not new drift -- which is why this is WARN, not FLAG. Reported as one line rather than ${hits.length} findings so it cannot bury the actionable flags above.`,
  });
}

// ---- Impure edges: disk reads only, no policy. Kept thin so the guard drives the pure function
// above directly against fixtures instead of these.
const REPO_SYMBOL_DIRS = ["src", "api", "lib"];
const REPO_SYMBOL_EXTENSIONS = [".js", ".jsx", ".mjs"];
const REPO_SYMBOL_DEF_RE = /\b(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)\b/g;

function collectRepoSymbols(worktree) {
  const symbols = new Set();
  const roots = REPO_SYMBOL_DIRS.map(d => path.join(worktree, d)).filter(d => {
    try { return fs.statSync(d).isDirectory(); } catch { return false; }
  });
  const stack = [...roots];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!REPO_SYMBOL_EXTENSIONS.some(ext => entry.name.endsWith(ext))) continue;
      const text = readIfExists(full);
      if (text === null) continue;
      REPO_SYMBOL_DEF_RE.lastIndex = 0;
      let m;
      while ((m = REPO_SYMBOL_DEF_RE.exec(text))) symbols.add(m[1]);
    }
  }
  return symbols;
}

function collectKickoffDocs(worktree) {
  const dir = path.join(worktree, "docs", "kickoffs");
  let files;
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
  } catch {
    return new Map(); // docs/kickoffs missing -- degrade to reporting nothing, never throw
  }
  const docs = new Map();
  for (const f of files) {
    const text = readIfExists(path.join(dir, f));
    if (text !== null) docs.set(f, text);
  }
  return docs;
}

function checkRecreatedLogicLint(findings) {
  const kickoffDocs = collectKickoffDocs(WORKTREE);
  if (!kickoffDocs.size) return;
  const repoSymbols = collectRepoSymbols(WORKTREE);
  checkRecreatedLogicInKickoffs(findings, kickoffDocs, repoSymbols);
}

function main() {
  const findings = [];
  const stateText = checkClaudeState(findings);
  checkEntryLengths(findings, stateText);
  checkTrimmedStubs(findings);
  checkBacklogSnapshot(findings);
  checkStandardsDrift(findings);
  checkSessionsLogSize(findings);
  checkTruthTripwire(findings);
  checkRecreatedLogicLint(findings);

  // Worktree cross-reference checks need the freshest possible CLAUDE-STATE.md/
  // FEATURES-ARCHIVE.md -- see freshDevText()'s comment for why the local
  // worktree copy isn't good enough here.
  const freshStateText = freshDevText("CLAUDE-STATE.md", stateText);
  const freshArchiveText = freshDevText("docs/FEATURES-ARCHIVE.md", readIfExists(path.join(WORKTREE, "docs", "FEATURES-ARCHIVE.md")));
  checkWorktrees(findings, freshStateText);
  checkBulletStaleness(findings, freshStateText, freshArchiveText);

  const flags = findings.filter(f => f.severity === "FLAG");
  const warns = findings.filter(f => f.severity === "WARN");
  const gating = gateModeRequested() ? gatingFindings(findings) : null;

  if (!flags.length && !warns.length) {
    console.log("session-hygiene: all clear.");
    reportGate(gating);
    process.exit(gating && gating.length ? 1 : 0);
  }

  console.log(`session-hygiene: ${flags.length} flagged, ${warns.length} warning\n`);
  for (const f of [...flags, ...warns]) {
    console.log(`  [check ${f.check}, ${f.severity}] ${f.detail}`);
  }
  console.log("\nReport only -- nothing auto-fixed. Review before editing CLAUDE-STATE.md or the backlog (public.backlog_items; the FEATURES*.md files are legend-only stubs).");
  reportGate(gating);
  process.exit(gating && gating.length ? 1 : 0);
}

// SES-199. `gating === null` means the bare invocation: say nothing at all, so the reporting-only
// output CI reads today is byte-identical to what it read before this ship.
function reportGate(gating) {
  if (gating === null) return;
  const set = [...GATING_CHECKS].join("/");
  if (!gating.length) {
    console.log(`\nGATE: clear -- no ${GATING_SEVERITY} findings in the gating classes (checks ${set}). Exit 0.`);
    return;
  }
  console.log(`\nGATE: FAILED -- ${gating.length} ${GATING_SEVERITY} finding${gating.length > 1 ? "s" : ""} in the gating classes (checks ${set}). Exit 1.`);
  for (const f of gating) console.log(`  [check ${f.check}] ${f.detail}`);
  console.log("These are truth-registry findings: a rule statement and its registry row disagree, or the registry could not be read at all. Fix the drift or the snapshot -- do not widen the gating set to get past it.");
}

// SES-176: the truth-check helpers are pure (findings array in, findings array out -- no network,
// no disk, no process.exit) so tests/regression/SES-176-truth-tripwire.js can drive them against
// fixtures. Same contract heal-engine.js and export-backlog-snapshot.js already use, including the
// guard below: importing this module for its exports must never run the CLI report.
export {
  parseRulesSnapshot,
  ruleIdOccurrences,
  anchorResolves,
  headingSlug,
  checkRetiredRulesInLiveVoice,
  checkRulePointers,
  checkRuleMarkers,
  RETIREMENT_VOCAB,
  RETIREMENT_WINDOW,
  // SES-199 -- the gating policy, exported so the guard drives the real set rather than a copy.
  GATING_CHECKS,
  GATING_SEVERITY,
  gatingFindings,
  gateModeRequested,
  // SES-200 -- checks 12 and 13, pure halves only (findings in, findings out; no disk, no exit).
  enclosingParagraph,
  statementContentWords,
  statementOverlap,
  checkRuleTextOutsideHome,
  normalizeProcedure,
  collectProcedureBlocks,
  duplicateProcedureHomes,
  RULE_COPY_OVERLAP,
  PROCEDURE_MIN_CHARS,
  PROCEDURE_HISTORY_DOCS,
  // SES-45 -- check 14, pure pieces only (findings in, findings out; no disk, no exit).
  section8Region,
  codeFencesInRegion,
  definedFunctionNames,
  importsRealImplementation,
  backtickedSubjectNames,
  checkRecreatedLogicInKickoffs,
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
