#!/usr/bin/env node
// DeepBench v7.0.186 | scripts/check-session-docs.js | SES-011a, SES-009b, SES-23, SES-25a, SES-83 (d) c4, SES-110, SES-112, SES-115, SES-117, SES-120
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

function main() {
  const findings = [];
  const stateText = checkClaudeState(findings);
  checkEntryLengths(findings, stateText);
  checkTrimmedStubs(findings);
  checkBacklogSnapshot(findings);
  checkStandardsDrift(findings);

  // Worktree cross-reference checks need the freshest possible CLAUDE-STATE.md/
  // FEATURES-ARCHIVE.md -- see freshDevText()'s comment for why the local
  // worktree copy isn't good enough here.
  const freshStateText = freshDevText("CLAUDE-STATE.md", stateText);
  const freshArchiveText = freshDevText("docs/FEATURES-ARCHIVE.md", readIfExists(path.join(WORKTREE, "docs", "FEATURES-ARCHIVE.md")));
  checkWorktrees(findings, freshStateText);
  checkBulletStaleness(findings, freshStateText, freshArchiveText);

  const flags = findings.filter(f => f.severity === "FLAG");
  const warns = findings.filter(f => f.severity === "WARN");

  if (!flags.length && !warns.length) {
    console.log("session-hygiene: all clear.");
    process.exit(0);
  }

  console.log(`session-hygiene: ${flags.length} flagged, ${warns.length} warning\n`);
  for (const f of [...flags, ...warns]) {
    console.log(`  [check ${f.check}, ${f.severity}] ${f.detail}`);
  }
  console.log("\nReport only -- nothing auto-fixed. Review before editing CLAUDE-STATE.md or the backlog (public.backlog_items; the FEATURES*.md files are legend-only stubs).");
  process.exit(0);
}

main();
