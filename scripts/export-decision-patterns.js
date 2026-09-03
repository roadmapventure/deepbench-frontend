#!/usr/bin/env node
// DeepBench v7.0.410 | scripts/export-decision-patterns.js | SES-004 — THE ONE BRIDGE BETWEEN THE
// NARRATIVE INDEX AND THE CITABLE ROWS. docs/JOHN-DECISION-PATTERNS.md stays the file a human reads;
// public.decision_patterns is the form a cycle can CITE — a decision's reasoning names `pattern:N`
// and a trigger joins it. This script is the only thing that writes those rows, and it derives every
// one of them from the md. THE EDIT THIS FORBIDS: hand-typing a criterion into Supabase, or teaching
// anything else to write decision_patterns. A second copy of a criterion is a second thing to drift.
//
// WHY ROWS AT ALL (the M7 gate's ruling i, decision 05cc2722): a cycle cannot grep a 1,000-line file
// for the criterion it is about to lean on and then record which one it used. A row with a permanent
// number can be cited and joined; the md cannot.
//
// APPEND-ONLY, AND THE TABLE ENFORCES IT. Numbers are cited across the repo, so `pattern_no`,
// `section` and `imperative` are immutable on an existing row (the ses004_decision_patterns trigger
// raises). Only `body`, `seen_in` and `source_version` are upserted — which is exactly what
// --check treats as REPAIRABLE drift; a section or imperative that moved is drift this script
// reports and REFUSES to paper over, because papering over it would mean renumbering by stealth.
//
// WHITESPACE IS COLLAPSED ON BOTH SIDES, and that is not cosmetic: this repo is CRLF on Windows and
// LF in CI, and the md hard-wraps at ~100 cols, so a criterion's body is a different byte string on
// the two trees and across a re-wrap. Collapsing every whitespace run to one space makes the stored
// text — and therefore --check — immune to both. (Same class of bug as the CRLF false-green in
// scripts/render-rule-blocks.js, SES-313.)
//
// Usage:
//   node scripts/export-decision-patterns.js            # upsert every criterion (needs creds)
//   node scripts/export-decision-patterns.js --check    # compare to live, exit 1 on drift
//   node scripts/export-decision-patterns.js --print    # parse only, no network (exit 0)
// Credentials: SUPABASE_URL + SUPABASE_SERVICE_KEY (decision_patterns is service_role only).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(__dirname, "..");
export const DOC_REL = "docs/JOHN-DECISION-PATTERNS.md";

// pattern:0 is RESERVED and is seeded by the migration, never by this file: it means "no standing
// pattern applied — new judgment", so the join never has to special-case a decision that leaned on
// nothing. It is deliberately absent from the md, so --check must not read it as an extra row.
export const RESERVED_PATTERN_NO = 0;

/** The three columns an existing row may legally change. Everything else is the citable identity. */
export const MUTABLE_COLUMNS = ["body", "seen_in", "source_version"];

/** CRLF-proof, wrap-proof normalisation. Applied to every stored field. */
export function norm(s) {
  return String(s == null ? "" : s).replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

/**
 * The newest version stamp at the head of the md — `<!-- DeepBench v7.0.327 | … -->`. Stored on every
 * row as `source_version` so a row can say which ship of the file it was exported from. Null rather
 * than a guess when the file carries no stamp.
 */
export function sourceVersion(md) {
  const m = /<!--\s*DeepBench\s+(v[0-9][^\s|]*)\s*\|/.exec(String(md || ""));
  return m ? m[1] : null;
}

/**
 * PURE: markdown in, rows out. Driven from a fixture by
 * tests/regression/ses-004-decision-patterns.test.mjs.
 *
 * The entry split is deliberately the SAME shape scripts/check-decision-pattern-quotes.js already
 * uses — an entry starts at `**N. ` and ends at the next entry, the next `##`/`###` heading, or a
 * horizontal rule — because two parsers that disagree about where a criterion ends would ship a gate
 * and an exporter that grade different text. The one thing added here is the SECTION: the nearest
 * preceding `## ` heading, which is what the rows are grouped by.
 */
export function parsePatterns(md) {
  const doc = String(md || "").replace(/\r\n?/g, "\n");
  const version = sourceVersion(doc);

  // Every `## ` heading with its offset, so an entry can be attributed to the nearest one above it.
  const sections = [];
  const headingRe = /^##\s+(.+)$/gm;
  let h;
  while ((h = headingRe.exec(doc)) !== null) sections.push({ at: h.index, name: norm(h[1]) });
  const sectionAt = pos => {
    let name = null;
    for (const s of sections) { if (s.at < pos) name = s.name; else break; }
    return name;
  };

  const rows = [];
  const parts = doc.split(/^(?=\*\*\d+\.\s)/m);
  let cursor = 0;
  for (const part of parts) {
    if (!/^\*\*(\d+)\.\s/.test(part)) continue;
    const pos = doc.indexOf(part, cursor);
    cursor = pos + 1;

    const cut = part.search(/\n(?:#{2,3}\s|---\s*(?:\n|$))/);
    const text = cut === -1 ? part : part.slice(0, cut);

    // The bold run is the number and the imperative. Non-greedy to the FIRST closing `**`, so a body
    // that bolds a phrase of its own cannot swallow the imperative.
    const bold = /^\*\*(\d+)\.\s([\s\S]*?)\*\*/.exec(text);
    if (!bold) continue;
    const pattern_no = Number(bold[1]);
    const imperative = norm(bold[2]);
    const rest = text.slice(bold[0].length);

    // `*Seen in:*` hard-wraps in this file (found live on entry #112 by the quote gate), so the
    // marker is matched across the break rather than as a literal.
    const seenIdx = rest.search(/\*Seen\s+in:/);
    const body = norm(seenIdx === -1 ? rest : rest.slice(0, seenIdx));
    const seen_in = seenIdx === -1
      ? null
      : norm(rest.slice(seenIdx).replace(/^\*Seen\s+in:\*?/, "")) || null;

    rows.push({
      pattern_no,
      section: sectionAt(pos),
      imperative,
      body,
      seen_in,
      source_version: version,
    });
  }
  rows.sort((a, b) => a.pattern_no - b.pattern_no);
  return rows;
}

/**
 * PURE: the md's rows and the live table's rows in, a drift report out. Never touches the network, so
 * the guard drives it from fixtures.
 *
 * FOUR KINDS OF DRIFT, kept apart because the answer to each is different:
 *   - `missing`   — in the md, not in the table. Fixed by a plain run of this script.
 *   - `extra`     — in the table, not in the md (pattern 0 excluded: it is the reserved row).
 *                   NOT fixable by a run: the table is append-only, so a criterion deleted from the
 *                   md is a row that has to stay and be explained.
 *   - `mutable`   — body / seen_in / source_version differ. Fixed by a plain run.
 *   - `immutable` — section or imperative differ. The number is cited across the repo, so this is
 *                   reported and never rewritten; append a new criterion instead of moving one.
 */
export function compareRows(mdRows, liveRows) {
  const live = new Map(liveRows.map(r => [Number(r.pattern_no), r]));
  const drift = [];
  for (const m of mdRows) {
    const l = live.get(m.pattern_no);
    if (!l) { drift.push({ kind: "missing", pattern_no: m.pattern_no, field: null }); continue; }
    for (const f of ["section", "imperative"]) {
      if (norm(m[f]) !== norm(l[f])) {
        drift.push({ kind: "immutable", pattern_no: m.pattern_no, field: f, md: norm(m[f]), live: norm(l[f]) });
      }
    }
    for (const f of MUTABLE_COLUMNS) {
      if (norm(m[f]) !== norm(l[f])) {
        drift.push({ kind: "mutable", pattern_no: m.pattern_no, field: f, md: norm(m[f]), live: norm(l[f]) });
      }
    }
  }
  const inMd = new Set(mdRows.map(r => r.pattern_no));
  for (const l of liveRows) {
    const n = Number(l.pattern_no);
    if (n === RESERVED_PATTERN_NO) continue;
    if (!inMd.has(n)) drift.push({ kind: "extra", pattern_no: n, field: null });
  }
  drift.sort((a, b) => a.pattern_no - b.pattern_no || String(a.field).localeCompare(String(b.field)));
  return drift;
}

/**
 * PURE: the parsed rows in, the structural complaints out. This is the half that does not need the
 * database — a duplicate or a gap in the numbering is a defect in the md itself, and a run that
 * uploaded it would make the citable form disagree with the narrative one silently.
 */
export function auditNumbering(rows) {
  const problems = [];
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.pattern_no)) problems.push(`criterion ${r.pattern_no} appears more than once`);
    seen.add(r.pattern_no);
    if (!r.section) problems.push(`criterion ${r.pattern_no} sits under no "## " section heading`);
    if (!r.imperative) problems.push(`criterion ${r.pattern_no} has an empty imperative`);
    // AN EMPTY BODY IS NOT A DEFECT, and asserting otherwise was this parser's first bug: MEASURED on
    // the live md rather than assumed, 98 of the 161 criteria are an imperative followed straight by
    // `*Seen in:*` with no elaboration at all (#8 is the shape). The body column is the ELABORATION,
    // which many criteria simply do not have; the imperative is the criterion. An empty `seen_in` is
    // likewise legal — the quote gate is what grades evidence, and it already exempts the seed set.
  }
  const nums = rows.map(r => r.pattern_no);
  for (let i = 1; i <= nums.length; i++) {
    if (!seen.has(i)) problems.push(`criterion ${i} is missing — the numbering must be contiguous 1..${nums.length}`);
  }
  return problems;
}

// --- network -------------------------------------------------------------------------------------

// NOTHING IN THIS FILE CALLS process.exit() AFTER A fetch(), AND THAT IS A REAL BUG, NOT A STYLE
// RULE. Found live on this script's own first --check run (Windows, Node 22): exiting while undici
// still holds the keep-alive socket aborts the process with
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c` and an exit code of
// 127 -- so a CLEAN check reported a hard failure to whatever gate was reading the code. Every exit
// goes through process.exitCode and a return instead, and the entry point below drains the HTTP pool
// before the process is allowed to end.
class Die extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}
function die(msg, code = 2) {
  throw new Die(msg, code);
}

async function rest(url, key, pathAndQuery, init = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, ...(init.headers || {}) };
  let res;
  try {
    res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
  } catch (e) {
    die(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  if (!res.ok) die(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  const body = await res.text();
  return body ? JSON.parse(body) : null;
}

export async function fetchLive(url, key) {
  const rows = await rest(url, key,
    "decision_patterns?select=pattern_no,section,imperative,body,seen_in,source_version&order=pattern_no&limit=5000");
  if (!Array.isArray(rows)) die("decision_patterns did not return an array");
  return rows;
}

async function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const printOnly = argv.includes("--print");

  const docAbs = path.join(REPO, DOC_REL);
  if (!fs.existsSync(docAbs)) die(`${DOC_REL} is missing — refusing to export criteria from nothing`);
  const rows = parsePatterns(fs.readFileSync(docAbs, "utf8"));
  if (rows.length === 0) die(`${DOC_REL} parsed to ZERO criteria — refusing to write an empty table`);

  const problems = auditNumbering(rows);
  if (problems.length) {
    console.error(`export-decision-patterns: ${DOC_REL} is not exportable as it stands:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`export-decision-patterns: parsed ${rows.length} criteria from ${DOC_REL} ` +
    `(1..${rows[rows.length - 1].pattern_no}, source ${rows[0].source_version || "unstamped"}).`);
  if (printOnly) return;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) die(`missing ${[!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ")}`);

  const live = await fetchLive(url, key);

  if (check) {
    // The reserved row is part of the contract, not an accident: the join's `pattern:0` citation
    // resolves through it, so its ABSENCE is drift even though the md never mentions it.
    const reserved = live.some(r => Number(r.pattern_no) === RESERVED_PATTERN_NO);
    const drift = compareRows(rows, live);
    if (!reserved) {
      console.error(`export-decision-patterns --check: DRIFT — the reserved pattern:${RESERVED_PATTERN_NO} row ` +
        "(\"no standing pattern applied — new judgment\") is missing; re-apply the ses004_decision_patterns migration.");
    }
    if (drift.length) {
      console.error(`export-decision-patterns --check: DRIFT — ${drift.length} difference(s) between ${DOC_REL} and public.decision_patterns:`);
      for (const d of drift.slice(0, 40)) {
        if (d.kind === "missing") console.error(`  #${d.pattern_no}: in the md, not in the table — run this script with no flags.`);
        else if (d.kind === "extra") console.error(`  #${d.pattern_no}: in the table, not in the md — the table is APPEND-ONLY; restore the criterion or explain the row.`);
        else if (d.kind === "mutable") console.error(`  #${d.pattern_no}.${d.field}: differs — run this script with no flags.`);
        else console.error(`  #${d.pattern_no}.${d.field}: differs and is IMMUTABLE (numbers are cited; never renumber). md="${d.md.slice(0, 90)}" live="${d.live.slice(0, 90)}"`);
      }
      if (drift.length > 40) console.error(`  … and ${drift.length - 40} more.`);
    }
    if (!reserved || drift.length) { process.exitCode = 1; return; }
    console.log(`export-decision-patterns --check: no drift — ${rows.length} criteria match public.decision_patterns, ` +
      `and the reserved pattern:${RESERVED_PATTERN_NO} row is present.`);
    return;
  }

  // Upsert. `resolution=merge-duplicates` updates on the pattern_no conflict; the table's own trigger
  // is what refuses a section/imperative change, so an md that renumbered a criterion FAILS here
  // loudly instead of quietly rewriting a number the repo cites.
  await rest(url, key, "decision_patterns?on_conflict=pattern_no", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  const after = await fetchLive(url, key);
  const drift = compareRows(rows, after);
  if (drift.length) {
    die(`the upsert did not settle — ${drift.length} difference(s) remain after writing. Re-run with --check for the list.`, 1);
  }
  console.log(`export-decision-patterns: upserted ${rows.length} criteria; public.decision_patterns now holds ` +
    `${after.length} rows (${rows.length} from the md + the reserved pattern:${RESERVED_PATTERN_NO} row).`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "")) {
  main()
    .catch(e => {
      console.error(`export-decision-patterns: ${e.message}`);
      process.exitCode = e instanceof Die ? e.code : 2;
    });
}
