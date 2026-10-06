#!/usr/bin/env node
// DeepBench v7.0.793 | scripts/audit-suite-reds.js | AGT-391 -- the full suite's reds become findings.
//
// WHY. Since AGT-391 a build runs only its related test set (scripts/related-tests.js), so a test that
// goes red outside every build's related set would never be read by anyone. The full suite still runs
// -- weekly in the Auditor routine (docs/runbooks/auditor-routine.md Step 1) and before a production
// release (docs/runbooks/release-to-main.md) -- and this turns each `[FAIL] <file> -- <msg>` line of
// that run into ONE finding in scripts/audit-board.js's finding() shape, so the reds reach the
// Development Manager through the one findings intake (scripts/audit-ledger.js --ingest), never as a
// ticket INSERT and never as a question to John.
//
// Usage:
//   node scripts/audit-suite-reds.js --suite=<run-all.js output> --out=<json> [--week=<YYYY-Www>] [--found-by=<who>]
//
// Flags:
//   --suite=<file>     The saved stdout+stderr of a full `node tests/regression/run-all.js` run.
//   --out=<file>       Where the findings JSON is written: { week, found_by, finding_type, findings }.
//   --week=<YYYY-Www>  The ISO week (default: this UTC week, audit-ledger.js isoWeek()).
//   --found-by=<who>   Default `auditor:routine:suite`; the release runbook passes `release:<name>`.
//
// Exit codes: 0 the file was written (zero findings is a green suite, and is written too);
// 2 the suite output is unreadable or carries no `regression suite: x/y passed` summary line -- a run
// that never finished (a `[NOT RUN] regression suite` transport exit, a killed process) is not a
// green and not a set of reds, so nothing is written.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isoWeek } from "./audit-ledger.js";

export const CHECK_SLUG = "suite-red";
export const GOVERNING_FACT = "the full regression run (AGT-391) read this test red";
export const RESOLUTION = "repair ticket for the Development Manager";
export const DEFAULT_FOUND_BY = "auditor:routine:suite";
export const TEXT_MAX = 200;

const FAIL_RE = /^\s*\[FAIL\] (\S+) -- (.*)$/;
const SUMMARY_RE = /^regression suite: \d+\/\d+ passed\s*$/m;

function arg(argv, name) {
  const prefix = `--${name}=`;
  const hit = argv.find(a => a.startsWith(prefix));
  return hit === undefined ? undefined : hit.slice(prefix.length);
}

// One finding per red test, in audit-board.js finding()'s shape.
export function suiteRedFinding(file, msg) {
  return {
    check_slug: CHECK_SLUG,
    kind: "other",
    family: "service",
    locations: [{ location: `tests/regression/${file}`, text: String(msg).slice(0, TEXT_MAX) }],
    governing_fact: GOVERNING_FACT,
    confidence: "high",
    proposed_resolution: RESOLUTION,
  };
}

// Pure: the suite output -> { ok, findings } ; ok false when the run carries no summary line.
export function suiteReds(text) {
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  if (!SUMMARY_RE.test(s)) return { ok: false, findings: null };
  const findings = [];
  const seen = new Set();
  for (const line of s.split("\n")) {
    const m = line.match(FAIL_RE);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    findings.push(suiteRedFinding(m[1], m[2]));
  }
  return { ok: true, findings };
}

function main(argv) {
  const suite = arg(argv, "suite"), out = arg(argv, "out");
  if (!suite || !out) {
    console.error("audit-suite-reds: pass --suite=<run-all.js output> --out=<json>.");
    process.exit(2);
  }
  let text;
  try { text = fs.readFileSync(suite, "utf8"); }
  catch (e) { console.error(`audit-suite-reds: --suite=${suite} could not be read (${e.message}).`); process.exit(2); }
  const r = suiteReds(text);
  if (!r.ok) {
    console.error(`audit-suite-reds: ${suite} carries no \`regression suite: x/y passed\` line -- the run did not finish, so it is neither green nor a set of reds. Nothing written.`);
    process.exit(2);
  }
  const doc = {
    week: arg(argv, "week") || isoWeek(new Date()),
    found_by: arg(argv, "found-by") || DEFAULT_FOUND_BY,
    finding_type: "defect",
    findings: r.findings,
  };
  fs.writeFileSync(out, JSON.stringify(doc, null, 2));
  console.log(`audit-suite-reds ${doc.week}: ${r.findings.length} red test(s) -> ${out} (found_by ${doc.found_by})`);
}

// Importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}
