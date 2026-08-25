#!/usr/bin/env node
// DeepBench v7.0.263 | scripts/check-shared-pipeline.js | SE-02 -- the shared-pipeline
// no-conditionals grep. Mechanizes three [LOCKED] statements that all say the same thing about
// different files, and that nothing enforced.
//
//   A. §19 FOUNDING PRINCIPLE (NEVER VIOLATE) -- "If you find yourself writing an
//      `if (agentId === 'x')` or `if (deliverable_type === 'pdf')` inside db-assembly.js,
//      ai-enrichment.js, or request-receivable.js -- stop. The fix is a trait, not a conditional."
//   B. §19b -- "execute.js itself contains zero capability-specific logic -- no
//      `if (capability_slug === 'x')`, ever."
//   C. §19d extension (S-ARCH-AGENT-LOOP-01-design, 2026-07-02) -- the same rule one level up,
//      over the Agent Loop's delegate-dispatch and consequential-action-gate primitives.
//
// A PRESENCE CHECK IS NOT A CONDITIONAL ON IDENTITY, and this check would be worse than useless if
// it could not tell them apart. The naive form -- "an `if` mentioning agent_id in a governed file" --
// returns FOURTEEN hits on the clean tree this shipped against, and every one is legitimate:
//
//     db-assembly.js:525   if (!capability_slug && !agent_id) {   <- was an id supplied at all?
//     db-assembly.js:559   if (agent_id) { ... }                  <- branch on PRESENCE
//     execute.js:1704      if (!capability_slug) throw ...        <- an argument guard
//     execute.js:497       if (!res.ok) throw new Error(`..."${capability_slug}"`)  <- id in a MESSAGE
//
// The pipeline MUST branch on whether an id was supplied; that is argument handling, not
// intelligence about a particular agent. What the Founding Principle forbids is branching on WHICH
// agent or capability it is. So every matcher below keys on COMPARISON AGAINST A LITERAL --
// `=== 'alex'`, `!== "pdf"`, `switch (agentId)`, or membership in a literal id array -- and never on
// the identifier appearing near an `if`. Getting this wrong in the other direction is not a smaller
// mistake: a check that fires on all fourteen gets switched off in a week, and then nothing guards
// the rule at all.
//
// THE SCOPE IS THE RULE'S OWN AND IS NOT WIDENED HERE. §19 names three files, §19b names one, §19d
// names two primitives. Measured whole-platform at this ship, across api/ + lib/ + shared/, there is
// exactly ONE literal-id conditional anywhere: api/brief.js:90, `if (agent_id === "pat")` -- a
// deliberate, commented control-case bypass ("Pat ... cold every time, no configs, no RAG, no
// reflect"). brief.js is a capability route and is named by NONE of the three statements, so it is
// NOT a violation and must never fail this check: widening a LOCKED rule to cover a file it does not
// name is the runner granting itself scope (the boundary SES-196 kept when it left `removal proposed`
// out of the drain picker). Silently dropping the finding would be the opposite failure, so it is
// REPORTED on every run as an ADJACENT OBSERVATION, labelled as outside the rule's scope, in the
// shape check-library-access.js prints its declared exceptions. Whether §19 should widen to cover
// capability routes is John's call; this script surfaces the question and does not answer it.
//
// THE HONEST BOUND: this is a grep. A conditional built by indirection
// (`const t = ids[k]; if (agentId === t)`) evades it. That is not a hole to plug with cleverer
// patterns -- the drift this rule is written from (channel-intelligence.js / quality-gate.js,
// retired via S-CAPABILITY-EXEC-01/02) was written plainly, because nobody adding a special case is
// hiding. Aimed at the mistake, not at an adversary.
//
// Usage: node scripts/check-shared-pipeline.js [--worktree=<path>] [--json]
// Exit 0 = all three boundaries intact (adjacent observations still printed).
// Exit 1 = a real violation. Exit 2 = the check could not run -- never treat that as a pass.

import fs from "fs";
import path from "path";

// -- The boundary, as data -------------------------------------------------------------------

// A. §19's three prompt-service files, by name, from the section itself.
export const FOUNDING_FILES = Object.freeze([
  "api/prompt/db-assembly.js",
  "api/prompt/ai-enrichment.js",
  "api/prompt/request-receivable.js",
]);

// B. §19b's single file.
export const EXECUTE_FILE = "api/capabilities/execute.js";

// C. §19d's Agent Loop primitives -- delegate dispatch and the consequential-action gate.
export const LOOP_FILES = Object.freeze([
  "api/_lib/handlers/confirmation.js",
  "api/_lib/handlers/durable-loop.js",
]);

// The identifiers the rules name. deliverable_type is §19's own second example.
const IDENT = String.raw`agentId|agent_id|capability_slug|capabilitySlug|deliverable_type|deliverableType`;

// Where an ADJACENT observation may be looked for. Never fails the run -- see the header.
const ADJACENT_DIRS = ["api", "lib", "shared"];
const SCAN_EXTS = new Set([".js", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".vercel", "coverage"]);

// -- Matchers --------------------------------------------------------------------------------

const COMMENT_LINE = /^\s*(\/\/|\*|\/\*)/;

// Comparison against a STRING LITERAL: `agentId === 'alex'`, `deliverable_type !== "pdf"`,
// and the reversed form `'alex' === agentId`.
const LITERAL_COMPARE = new RegExp(
  String.raw`(?:\b(?:${IDENT})\s*[!=]==?\s*["'\`][^"'\`]+["'\`])` +
  String.raw`|(?:["'\`][^"'\`]+["'\`]\s*[!=]==?\s*\b(?:${IDENT})\b)`
);

// `switch (agentId)` -- the same branch-on-identity wearing a different keyword.
const SWITCH_ON_IDENT = new RegExp(String.raw`\bswitch\s*\(\s*(?:${IDENT})\b`);

// Membership in a literal id array: `['alex','marcus'].includes(agentId)` and the reversed
// `agentId in {...}` / `[...].indexOf(agentId)` forms.
const LITERAL_MEMBERSHIP = new RegExp(
  String.raw`\[[^\]]*["'\`][^"'\`]+["'\`][^\]]*\]\s*\.\s*(?:includes|indexOf)\s*\(\s*(?:${IDENT})\b`
);

const MATCHERS = [
  { rx: LITERAL_COMPARE, what: "compares an id against a string literal" },
  { rx: SWITCH_ON_IDENT, what: "switches on an id" },
  { rx: LITERAL_MEMBERSHIP, what: "tests an id for membership in a literal list" },
];

function isCode(file) {
  return SCAN_EXTS.has(path.extname(file));
}

export function walk(root, dirs = ADJACENT_DIRS) {
  const out = [];
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs)) continue;
    const stack = [abs];
    while (stack.length) {
      const cur = stack.pop();
      for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (!SKIP_DIRS.has(ent.name)) stack.push(path.join(cur, ent.name));
        } else if (ent.isFile() && isCode(ent.name)) {
          out.push(path.relative(root, path.join(cur, ent.name)).split(path.sep).join("/"));
        }
      }
    }
  }
  return out.sort();
}

// Scan one file's text. Returns hits before any scope is applied -- kept scope-free on purpose so a
// test can prove the MATCHER works independently of the file list. A scanner that finds nothing
// passes a scope test vacuously.
export function scanText(rel, text) {
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_LINE.test(line)) continue;
    for (const m of MATCHERS) {
      if (m.rx.test(line)) {
        hits.push({ file: rel, line: i + 1, what: m.what, excerpt: line.trim().slice(0, 160) });
        break;
      }
    }
  }
  return hits;
}

function assertionFor(rel) {
  if (FOUNDING_FILES.includes(rel)) return "A";
  if (rel === EXECUTE_FILE) return "B";
  if (LOOP_FILES.includes(rel)) return "C";
  return null;   // not named by any of the three statements -- adjacent, never a violation
}

// The whole check over a worktree. `violations` is what exit 1 is keyed on; `adjacent` is reported
// and never fails.
export function checkWorktree(root) {
  const violations = [];
  const adjacent = [];
  const governed = [...FOUNDING_FILES, EXECUTE_FILE, ...LOOP_FILES];
  const missing = governed.filter(rel => !fs.existsSync(path.join(root, rel)));

  for (const rel of walk(root)) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8");
    } catch {
      continue;
    }
    for (const hit of scanText(rel, text)) {
      const a = assertionFor(rel);
      if (a) violations.push({ ...hit, assertion: a });
      else adjacent.push(hit);
    }
  }
  return { violations, adjacent, missing, governed: governed.length };
}

// -- CLI -------------------------------------------------------------------------------------

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function main() {
  const root = path.resolve(arg("worktree", process.cwd()));
  let result;
  try {
    result = checkWorktree(root);
  } catch (err) {
    console.error(`check-shared-pipeline: could not run -- ${err.message}`);
    process.exit(2);
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.violations.length ? 1 : 0);
  }

  console.log(`check-shared-pipeline: ARCHITECTURE.md §19 / §19b / §19d, ${result.governed} governed files`);
  console.log("  A. §19  no conditional on WHICH agent/deliverable in the three prompt-service files");
  console.log("  B. §19b no capability-specific logic in execute.js");
  console.log("  C. §19d no conditional on WHICH agent/capability in the Agent Loop primitives");

  // A governed file that has moved is NOT a silent pass: the check would scan nothing and report
  // green, which is the vacuous-scanner failure this whole family of checks exists to avoid.
  if (result.missing.length) {
    console.error(
      `\ncheck-shared-pipeline: could not run -- ${result.missing.length} governed file(s) not found:\n` +
      result.missing.map(f => `  ${f}`).join("\n") +
      "\nThe rule names these by path. If one moved, update this script deliberately."
    );
    process.exit(2);
  }

  // Printed on EVERY run, pass or fail: outside the rule's named scope, so it never fails the
  // check -- but a known instance of the anti-pattern must stay visible or it becomes the norm.
  if (result.adjacent.length) {
    console.log(
      `\n  adjacent — the same shape OUTSIDE the three statements' named scope (${result.adjacent.length}, ` +
      `not a violation, not failing this run):`
    );
    for (const a of result.adjacent) {
      console.log(`    ${a.file}:${a.line} ${a.what}\n      ${a.excerpt}`);
    }
    console.log(
      "    §19 names db-assembly / ai-enrichment / request-receivable; §19b names execute.js;\n" +
      "    §19d names the Agent Loop primitives. Whether the rule should widen to cover capability\n" +
      "    routes is a decision for John, not for this script."
    );
  } else {
    console.log("\n  adjacent: none");
  }

  if (!result.violations.length) {
    console.log("\ncheck-shared-pipeline: PASS -- the shared pipeline branches on traits, not identity.");
    process.exit(0);
  }

  console.log(`\ncheck-shared-pipeline: FAIL -- ${result.violations.length} violation(s):`);
  for (const v of result.violations) {
    console.log(`  ${v.file}:${v.line} breaks assertion ${v.assertion} — ${v.what}\n    ${v.excerpt}`);
  }
  console.log(
    "\nThe Prompt Service is a dumb, agnostic assembler: all intelligence lives in skill profile\n" +
    "traits (§19, NEVER VIOLATE). THE FIX IS A TRAIT, NOT A CONDITIONAL — and it is not an\n" +
    "allowlist entry here either."
  );
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
