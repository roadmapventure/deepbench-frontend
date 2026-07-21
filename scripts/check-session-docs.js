#!/usr/bin/env node
// DeepBench v6.3.105 | scripts/check-session-docs.js | SES-011
//
// Mechanizes the `session-hygiene` skill's checks 1, 1b, 2, 3, 3c, 5, 5b, 5c, 5d --
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

// ---- Check 3 & 3c: Done-row leakage + Type-tag coverage ----
function checkFeatureFile(findings, filename, requireType) {
  const p = path.join(WORKTREE, "docs", filename);
  const text = readIfExists(p);
  if (text === null) return;

  const bytes = Buffer.byteLength(text, "utf8");
  const sizeBaselines = { "FEATURES.md": 40, "FEATURES-LATER.md": 150 };
  if (sizeBaselines[filename] && bytes > sizeBaselines[filename] * 1024) {
    findings.push({ check: "3", severity: "FLAG", detail: `${filename} is ${kb(bytes)} KB, over the ~${sizeBaselines[filename]} KB baseline` });
  }

  const lines = text.split("\n");
  for (const line of lines) {
    const idMatch = line.match(/^\|\s*([A-Z]{2,4}-[0-9]+[a-z]?(?:\s*\/\s*[A-Z]{2,4}-[0-9]+[a-z]?)*)\s*\|/);
    if (!idMatch) continue; // not a real data row (header/separator/prose)

    // Status is always the second-to-last cell, immediately before the final
    // Session cell and end-of-line -- anchoring on that shape (not a fixed
    // column index) survives embedded `|` characters earlier in the row
    // (e.g. a code snippet in the Feature cell), per the skill's documented
    // gotcha. Only a Status cell that STARTS with the emoji counts -- a
    // `✅ Done` mention inside another cell's prose (e.g. "Depends on: PE-04
    // ✅ Done") never satisfies "immediately before the final cell + EOL".
    const statusMatch = line.match(/\|\s*(✅[^|]*|🔶[^|]*|❌[^|]*)\|\s*[^|]*\|\s*$/);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      if (status.startsWith("✅")) {
        findings.push({ check: "3", severity: "FLAG", detail: `${filename}: ${idMatch[1]} has Status "${status}" but is still in the active file -- should be archived to docs/FEATURES-ARCHIVE.md` });
      }
      if (status !== "✅ Done" && status !== "🔶 Partial" && status !== "❌ Missing") {
        findings.push({ check: "3", severity: "FLAG", detail: `${filename}: ${idMatch[1]} has non-canonical Status text "${status}" (STANDARDS.md Section 7 requires exactly one of the three canonical values)` });
      }
    }

    if (requireType) {
      const typeMatch = line.match(/^\|\s*[^|]*\|\s*([^|]*)\|/);
      const type = typeMatch ? typeMatch[1].trim() : "";
      if (!type) {
        findings.push({ check: "3c", severity: "FLAG", detail: `${filename}: ${idMatch[1]} has a blank Type cell` });
      }
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
    const out = execFileSync("git", ["-C", SHARED_CHECKOUT, "ls-tree", "--name-only", "origin/dev", "--", relDirPath], { encoding: "utf8" });
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
  return freshDevDirEntries(".claude/inflight");
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

function checkEntryLengths(findings, stateText) {
  // "In flight now" (retargeted 2026-07-21, SES-011): each session's status is
  // now a whole .claude/inflight/<name>.md file, not a CLAUDE-STATE.md bullet
  // -- the file's full text is the "entry" this check caps.
  for (const entry of freshDevDirEntries(".claude/inflight")) {
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

  // Check 5: registered worktree, zero-ahead of dev, no bullet.
  // The currently-running session's own worktree is always exempt here: its
  // bullet was added locally (CLAUDE.md rule 6c) but isn't pushed to origin/dev
  // until close-out, so comparing it against the freshly-fetched dev copy would
  // always read as "no bullet" for the entire lifetime of the session that
  // added it -- a guaranteed false positive, not a real staleness signal.
  const selfName = path.basename(WORKTREE.replace(/\\/g, "/"));
  for (const wt of worktreesUnderManagement) {
    const name = wt.split("/").pop();
    if (name === selfName) continue;
    if (bulletNames.has(name)) continue;
    if (isAncestorOfDev(wt)) {
      findings.push({ check: "5", severity: "FLAG", detail: `worktree "${name}" has zero commits ahead of dev and no "In flight now" bullet -- likely finished but rule 8 (bullet cleanup) was skipped` });
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

// ---- Check 5c: "In flight now" bullet mentions an already-archived feature ID ----
function checkBulletStaleness(findings, stateText, archiveText) {
  if (!archiveText) return;
  const bullets = extractInFlightBullets(stateText);
  for (const b of bullets) {
    const idMentions = [...b.text.matchAll(/`([A-Z]{2,4}-[0-9]+[a-z]?)`/g)].map(m => m[1]);
    for (const id of idMentions) {
      if (archiveText.includes(`| ${id} |`) || archiveText.includes(`\`${id}\``)) {
        findings.push({ check: "5c", severity: "FLAG", detail: `"In flight now" bullet for "${b.name}" mentions ${id}, which already appears in docs/FEATURES-ARCHIVE.md -- bullet prose may be describing already-shipped work as pending` });
      }
    }
  }
}

function main() {
  const findings = [];
  const stateText = checkClaudeState(findings);
  checkEntryLengths(findings, stateText);
  checkFeatureFile(findings, "FEATURES.md", true);
  checkFeatureFile(findings, "FEATURES-NEXT.md", true);
  checkFeatureFile(findings, "FEATURES-LATER.md", false);

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
  console.log("\nReport only -- nothing auto-fixed. Review before editing CLAUDE-STATE.md/FEATURES.md.");
  process.exit(0);
}

main();
