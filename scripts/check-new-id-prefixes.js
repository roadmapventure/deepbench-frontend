#!/usr/bin/env node
// DeepBench v7.0.115 | scripts/check-new-id-prefixes.js | SES-010 Tier 2, SES-83 (d) c4
// FEATURE: SES-010 -- mechanizes CLAUDE-DESIGN.md's new-ID prefix rule (docs/SCREEN-INVENTORY.md)
//
// CLAUDE-DESIGN.md: "check docs/SCREEN-INVENTORY.md's taxonomy for the correct
// prefix -- do not default to an old [AREA]-[NUMBER] prefix by pattern-
// matching nearby rows, even ones logged recently." Checks only NEWLY ADDED
// rows (diffed against a base ref, same merge-base approach as
// check-version-headers.js) -- the ~250 existing legacy-prefixed rows are
// frozen and correct as-is; this only catches a *new* row using a legacy
// prefix by habit/pattern-matching.
//
// ACTIVE_PREFIXES is the confirmed set from docs/SCREEN-INVENTORY.md's
// "Platform Layers" table (HAR/SCA/LOO/LOG/MCP/MKT/DAT/AGT/SES/MOB) plus
// Screen codes actually observed in its own "Applied" mapping table (CHI,
// PRO) -- deliberately NOT a guess at every possible Screen code (Home,
// Bench, Spend Analysis, etc. don't have a clearly-established prefix in the
// doc yet). Anything outside this list is flagged for a human to check
// against the doc directly, not asserted as definitely wrong -- some legacy
// prefixes (AA, MI, AI, TI, AZ, ...) are legitimately frozen and this script
// can't tell "a new row correctly using a still-open Screen code not on this
// list yet" from "a new row incorrectly defaulting to a legacy prefix"
// without a human reading the actual taxonomy doc.
//
// RETARGETED SES-83 (d) cycle 4, v7.0.115: new tickets are filed into
// `public.backlog_items`, not into the three FEATURES*.md files, which cycle 2
// (v7.0.113) emptied to legend-only stubs. Diffing those files can no longer
// surface a newly-filed ticket, so this check silently passed forever -- the same
// false all-clear that check-session-docs.js carried. It now reads
// docs/backlog/BACKLOG-SNAPSHOT.md, the table's in-repo copy regenerated into
// every ship commit set (SES-83 (c)), which needs no credentials.
//
// It compares ID SETS across the merge-base rather than diffing lines, and that
// is load-bearing rather than stylistic: the snapshot is ordered
// `source_file.asc, row_ordinal.asc` and carries a leading sequential `| N |`
// column, so filing ONE ticket renumbers every row beneath it. A line diff then
// presents hundreds of untouched legacy rows as newly added, and every legacy
// prefix (AA, MI, AI, TI, AZ, ...) would be flagged on a single filing. A set
// difference is immune to renumbering. Note the ID is column 2 in the snapshot;
// it was column 1 in the old files.
//
// Usage: node scripts/check-new-id-prefixes.js [--worktree=<path>] [--base=origin/dev]
// Exit code 1 if any newly-filed ticket uses a prefix outside ACTIVE_PREFIXES, 0 otherwise.

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ACTIVE_PREFIXES = new Set(["HAR", "SCA", "LOO", "LOG", "MCP", "MKT", "DAT", "AGT", "SES", "MOB", "CHI", "PRO"]);
const SNAPSHOT_REL = "docs/backlog/BACKLOG-SNAPSHOT.md";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const BASE = arg("base", "origin/dev");

// Every ticket id in a snapshot, read from column 2 of the data rows. Data rows
// lead with the sequential ordinal column, which is what distinguishes them from
// the header/separator/prose lines above the table.
function snapshotIds(text) {
  const ids = new Map(); // id -> the row text, for the finding's excerpt
  if (!text) return ids;
  for (const line of text.split("\n")) {
    const l = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!/^\|\s*\d+\s*\|/.test(l)) continue;
    const cells = l.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length < 2) continue;
    const id = cells[1].slice(1, -1).trim();
    const m = id.match(/^([A-Z]{2,4})-[0-9]+[a-z]?$/);
    if (m && !ids.has(id)) ids.set(id, { prefix: m[1], row: l });
  }
  return ids;
}

// Newly-filed tickets = ids present in the snapshot at HEAD but absent from it at
// the merge-base. HEAD is read from the working tree, not from git, so a ticket
// filed and exported but not yet committed is still checked (the old line-diff
// behaved the same way).
function newlyFiled() {
  // Same merge-base fix as check-version-headers.js: comparing against BASE's
  // live tip picks up concurrent sessions' already-merged changes, not just this
  // session's own additions.
  let mergeBase;
  try {
    mergeBase = execFileSync("git", ["-C", WORKTREE, "merge-base", BASE, "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return { error: `could not compute merge-base against ${BASE}` };
  }

  const headText = (() => {
    try {
      return fs.readFileSync(path.join(WORKTREE, SNAPSHOT_REL), "utf8");
    } catch {
      return null;
    }
  })();
  if (headText === null) {
    return { error: `${SNAPSHOT_REL} not found in the worktree -- the new-ID prefix check could not run. Regenerate it with: node scripts/export-backlog-snapshot.js` };
  }

  let baseText;
  try {
    baseText = execFileSync("git", ["-C", WORKTREE, "show", `${mergeBase}:${SNAPSHOT_REL}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    // The snapshot did not exist at the merge-base. Treating all of its ids as
    // "new" would flag the whole legacy backlog on the commit that introduces
    // the file; say so and skip instead.
    return { skipped: `${SNAPSHOT_REL} does not exist at the merge-base -- every ticket would read as newly filed, so the prefix check is skipped for this diff (not a pass).` };
  }

  const baseIds = snapshotIds(baseText);
  const headIds = snapshotIds(headText);
  if (headIds.size === 0) {
    return { error: `${SNAPSHOT_REL} parsed to zero ticket rows -- the new-ID prefix check could not run.` };
  }

  const added = [];
  for (const [id, meta] of headIds) {
    if (!baseIds.has(id)) added.push({ id, ...meta });
  }
  return { added, baseCount: baseIds.size, headCount: headIds.size };
}

function main() {
  console.log(`\nNew-ID Prefix Check (vs ${BASE})\n`);

  const { added, error, skipped, baseCount, headCount } = newlyFiled();
  if (error) {
    console.log(`  [WARN] ${error}`);
    process.exit(0);
  }
  if (skipped) {
    console.log(`  [SKIPPED] ${skipped}`);
    process.exit(0);
  }

  const findings = [];
  for (const { id, prefix, row } of added) {
    if (!ACTIVE_PREFIXES.has(prefix)) {
      findings.push(`${SNAPSHOT_REL}: newly-filed ticket ${id} uses prefix "${prefix}" -- not in the confirmed active taxonomy (${[...ACTIVE_PREFIXES].join("/")}). Check docs/SCREEN-INVENTORY.md before assuming this is correct: ${row.slice(0, 100)}...`);
    }
  }

  console.log(`  ${baseCount} tickets at the merge-base, ${headCount} now, ${added.length} newly filed.`);
  if (findings.length) {
    for (const f of findings) console.log(`  [FLAG] ${f}`);
  } else {
    console.log("  No newly-filed tickets use a prefix outside the confirmed active taxonomy.");
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
