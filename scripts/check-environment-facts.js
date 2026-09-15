#!/usr/bin/env node
// DeepBench v7.0.495 | scripts/check-environment-facts.js | SES-396 slice 1 — the environment-facts
// register's validator, and the `--render` that IS the future Knowledge row's body.
//
// WHAT THIS IS FOR. A cycle re-measures the same handful of environment truths every run — the
// default branch is stale, the runbook is at its byte ceiling, a counter drifts, CI clones shallow
// — and each re-measurement costs a session's attention or, worse, is skipped and guessed. The
// register is the one committed place those facts live, and this script is what stops it rotting
// into a list of plausible sentences nobody checked. A line that names a ticket must name a ticket
// that EXISTS on the board, because a register whose provenance is decorative is worse than no
// register: it launders a guess into a citation.
//
// WHY THE KNOWLEDGE-ROW HALF IS NOT IN THIS SLICE, stated here because the obvious next edit is to
// add it. The Designer (`agents` row `designer`, GV-04, governance lane) is `is_active = true`, and
// `.claude/rules/agent-roster-inert.md` (ARCHITECTURE §19v P5) bars an automated session from
// writing any row belonging to an active agent. Creating `ds-knowledge-environment` and linking it
// to `design-kickoff` is therefore GATED — it needs John, not this cycle. So slice 1 ships the
// file, this validator, and a guard; `--render` exists now so that when the gated row IS created it
// is created from bytes a test already pins, rather than hand-retyped into Supabase. The card
// carrying that remainder is filed by SES-396 task 4.
//
// NO NETWORK, NO CREDENTIALS, BY CONSTRUCTION — the same rule scripts/render-rule-blocks.js states
// at length: a network round trip does not belong in a pre-commit tripwire, and a checker that
// silently no-ops without credentials is a FALSE ALL-CLEAR. The ticket-existence check therefore
// reads the committed docs/backlog/BACKLOG-SNAPSHOT.md, never Supabase. A missing snapshot is a
// loud failure naming the regeneration command, never a skip.
//
// EXIT CODES ARE THE INTERFACE: 0 valid (prints the summary line), 1 the register is present but a
// line is wrong (prints the line number and the offending text), 2 the register is missing or
// unreadable. 1 and 2 are kept distinct deliberately — "you wrote a bad line" and "the file this
// whole mechanism depends on is gone" are different problems with different fixes, and a single
// non-zero would let the second hide inside the first.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER_REL = "docs/runbooks/environment-facts.md";
const SNAPSHOT_REL = "docs/backlog/BACKLOG-SNAPSHOT.md";

// The exact body of the future `ds-knowledge-environment` Skill Profile. Exported so the guard can
// assert the row's `method` equals `--render` byte for byte once the gated row exists — one home
// for the header text, never a copy in the test and a copy here.
export const RENDER_HEADER =
  "Environment facts this platform has measured. Each line: date | the ticket or cycle that " +
  "found it | the fact. Revalidate a premise that contradicts one.";

export const FACTS_HEADING = "## Facts";
export const MIN_FACT_CHARS = 20;

// A ticket-form source (`SES-396`, `LOG-124`, `AGT-79a`) is checked against the board. A
// cycle-form source (`cycle:601227fb`) names a runner_cycles row, which the snapshot does not
// carry, so it is accepted on its shape alone — the cycle id is in the commit that added the line.
export const SOURCE_RE = /^(?:[A-Z]{2,4}-\d+[a-z]?|cycle:[0-9a-f]{8})$/;
export const TICKET_SOURCE_RE = /^[A-Z]{2,4}-\d+[a-z]?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // Round-trips only if the calendar accepted it: catches 2026-13-01 and 2026-02-30, which the
  // regex alone is happy with.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Parses the register. Returns { facts, errors } — never throws for a CONTENT problem, because the
// caller needs every bad line at once, not the first one.
export function parseRegister(text) {
  const lines = String(text).split(/\r?\n/);
  const facts = [];
  const errors = [];
  const seen = new Map();

  let inFacts = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmedRight = raw.replace(/\s+$/, "");

    if (trimmedRight.trim() === FACTS_HEADING) { inFacts = true; continue; }
    if (!inFacts) continue;
    // A later `## Heading` closes the fact block; prose and blank lines inside it are ignored, so
    // the file can carry a note without every sentence having to be a fact.
    if (/^##\s/.test(trimmedRight)) { inFacts = false; continue; }
    if (trimmedRight.trim() === "") continue;
    if (!trimmedRight.startsWith("- ")) continue;

    const body = trimmedRight.slice(2);
    const parts = body.split("|");
    if (parts.length !== 3) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `expected exactly 3 pipe-separated fields (date | SOURCE | fact), got ${parts.length}` });
      continue;
    }
    const [dateRaw, sourceRaw, factRaw] = parts.map(p => p.trim());

    if (!isRealDate(dateRaw)) {
      errors.push({ lineNo, text: trimmedRight, reason: `date "${dateRaw}" is not a real YYYY-MM-DD date` });
      continue;
    }
    if (!SOURCE_RE.test(sourceRaw)) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `SOURCE "${sourceRaw}" must match a ticket id (SES-396) or a cycle (cycle:601227fb)` });
      continue;
    }
    if (factRaw.length < MIN_FACT_CHARS) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `the fact is ${factRaw.length} characters; under ${MIN_FACT_CHARS} is a label, not a fact` });
      continue;
    }
    const prior = seen.get(trimmedRight);
    if (prior) {
      errors.push({ lineNo, text: trimmedRight, reason: `verbatim duplicate of line ${prior}` });
      continue;
    }
    seen.set(trimmedRight, lineNo);
    facts.push({ lineNo, date: dateRaw, source: sourceRaw, fact: factRaw, raw: trimmedRight });
  }
  return { facts, errors };
}

// The provenance check. `snapshot` is the committed BACKLOG-SNAPSHOT.md text; a ticket-form SOURCE
// must appear in it as a table cell `| <ID> |`. Substring-free on purpose: matching bare "SES-38"
// would be satisfied by SES-384, so the pipes are load-bearing.
export function checkSources(facts, snapshot) {
  const errors = [];
  for (const f of facts) {
    if (!TICKET_SOURCE_RE.test(f.source)) continue;
    if (!snapshot.includes(`| ${f.source} |`)) {
      errors.push({ lineNo: f.lineNo, text: f.raw,
        reason: `SOURCE ${f.source} does not appear in ${SNAPSHOT_REL} as \`| ${f.source} |\` — ` +
                `a citation to a ticket that is not on the board` });
    }
  }
  return errors;
}

export function render(facts) {
  return [RENDER_HEADER, "", ...facts.map(f => f.raw)].join("\n");
}

// `--register=<path>` points the check at a copy instead of the committed register. It exists so
// the guard can prove each failure mode on a TEMP COPY: a mutation test that had to edit the real
// file in place would race every other cycle sharing this clone and could leave a corrupted
// register behind if it threw. The snapshot path is deliberately NOT overridable — the provenance
// check must always be answered by the real board.
function registerPathFrom(argv) {
  const flag = argv.find(a => a.startsWith("--register="));
  return flag ? path.resolve(flag.slice("--register=".length)) : path.join(ROOT, REGISTER_REL);
}

function main(argv) {
  const registerPath = registerPathFrom(argv);
  let text;
  try {
    text = fs.readFileSync(registerPath, "utf8");
  } catch (e) {
    const shown = path.relative(ROOT, registerPath) || REGISTER_REL;
    console.error(`check-environment-facts: cannot read ${shown} (${e.code || e.message}). ` +
      `The register is the file this check exists to validate; recreate it or revert its deletion.`);
    return 2;
  }

  const { facts, errors } = parseRegister(text);

  let snapshot = null;
  try {
    snapshot = fs.readFileSync(path.join(ROOT, SNAPSHOT_REL), "utf8");
  } catch {
    console.error(`check-environment-facts: cannot read ${SNAPSHOT_REL}; regenerate it with ` +
      `\`node scripts/export-backlog-snapshot.js\` — a ticket SOURCE cannot be checked without it.`);
    return 2;
  }
  const allErrors = errors.concat(checkSources(facts, snapshot));

  if (allErrors.length) {
    for (const e of allErrors.sort((a, b) => a.lineNo - b.lineNo)) {
      console.error(`check-environment-facts: line ${e.lineNo}: ${e.reason}\n    ${e.text}`);
    }
    return 1;
  }

  if (facts.length === 0) {
    console.error(`check-environment-facts: ${REGISTER_REL} parses but carries no facts under ` +
      `"${FACTS_HEADING}" — an empty register is a check that can never fail.`);
    return 1;
  }

  if (argv.includes("--render")) {
    console.log(render(facts));
    return 0;
  }

  const dates = facts.map(f => f.date).sort();
  console.log(`${facts.length} facts, oldest ${dates[0]}, newest ${dates[dates.length - 1]}`);
  return 0;
}

const isEntry = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isEntry) process.exit(main(process.argv.slice(2)));
