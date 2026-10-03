// DeepBench v7.0.495 | tests/regression/ses-396-environment-facts.test.mjs | SES-396 slice 1 --
// the environment-facts register, its validator, and the byte pin waiting on a gated row.
//
// WHAT WOULD PASS VACUOUSLY HERE, which is the only interesting question about a guard over a
// checker. "The validator exists and exits 0 on the committed file" is satisfied by a script whose
// body is `process.exit(0)`. So arm (b) is the load-bearing one: it MUTATES the register four ways
// on TEMP COPIES and requires the real CLI to exit 1 on each, plus exit 2 when the file is gone.
// A validator that accepted `SES-99999` -- a citation to a ticket that is not on the board -- would
// be inert, and the register's whole claim is that its provenance is real rather than decorative.
//
// TEMP COPIES, NEVER THE REAL FILE, and that is SES-382's lesson applied rather than quoted:
// cycles run in parallel against one clone and one database, so a test that mutated the committed
// register in place would corrupt whatever concurrent run read it, and would leave it corrupted if
// this file threw between the mutation and the restore. Every copy here is written under a name
// carrying this process's pid, so two simultaneous runs cannot collide even in the temp directory.
//
// ARM (d) IS DECLARED NOT RUN ON PURPOSE, AND THAT IS THE HONEST OUTCOME, NOT A GAP BEING EXCUSED.
// The point of `--render` is that the future `ds-knowledge-environment` Skill Profile's body IS
// these bytes. But creating that row is GATED: the Designer (`agents.designer`, GV-04) is
// `is_active = true`, and `.claude/rules/agent-roster-inert.md` (ARCHITECTURE §19v P5) bars an
// automated session from writing an active agent's rows. So the row does not exist yet, and a
// green (d) asserting nothing about a row that is absent would be exactly the vacuous pass this
// file exists to refuse. It declares itself NOT RUN, naming the slug, until the gated card SES-396
// task 4 filed is decided -- then the SAME assertion starts grading the real row's `method` byte
// for byte, with no edit to this arm. §19k: a guard that cannot run says so.
//
// ONE VOCABULARY (STANDARDS.md Section 13): notRun() from _lib/self-run.js, never a second word
// for the same idea and never a console.log the harness cannot read.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { RENDER_HEADER, parseRegister } from "../../scripts/check-environment-facts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTER = path.join(ROOT, "docs/runbooks/environment-facts.md");
const CHECKER = path.join(ROOT, "scripts/check-environment-facts.js");

const MIN_FACTS = 11;

// Three lines pinned byte for byte. Two carry a ticket SOURCE the validator checks against the
// board; the third is a cycle-sourced fact about a counter. They are quoted in full rather than
// matched by substring because the register's value is the EXACT sentence a later cycle reads --
// a line that drifted into a near-paraphrase would still match a loose test and would no longer
// be the thing that was measured.
const PINNED = [
  "- 2026-09-13 | SES-393 | CI clones at depth 1 (actions/checkout@v4, no fetch-depth), so a test rebuilding evidence from git history goes NOT RUN there.",
  "- 2026-09-12 | SES-384 | Every new public table is born readable by anon: the default ACL grants a SELECT no migration asked for.",
  "- 2026-09-15 | cycle:601227fb | feature_id_counter can drift behind the board (seen this cycle: it offered SES-389 while the board already held 398); claim with GREATEST(counter, max)+1, never the counter alone.",
];

const SLUG = "ds-knowledge-environment";
const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

// The CLI, run for real, so the exit CODE is what is asserted -- not a return value from an
// imported function, which could diverge from what the shell sees.
function runChecker(args) {
  const r = spawnSync(process.execPath, [CHECKER, ...args], { encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

let tmpSeq = 0;
function tempCopy(mutate) {
  const text = fs.readFileSync(REGISTER, "utf8");
  const p = path.join(os.tmpdir(), `ses396-${process.pid}-${tmpSeq++}.md`);
  fs.writeFileSync(p, mutate(text), "utf8");
  return p;
}

export default async function run() {
  // ---- (a) the committed register parses, and says what it is supposed to say -----------------
  assert.ok(fs.existsSync(REGISTER), "docs/runbooks/environment-facts.md is missing");
  const text = fs.readFileSync(REGISTER, "utf8");
  const { facts, errors } = parseRegister(text);
  assert.deepEqual(errors, [], `the committed register has malformed lines: ${JSON.stringify(errors)}`);
  assert.ok(facts.length >= MIN_FACTS,
    `expected at least ${MIN_FACTS} facts in the register, got ${facts.length}`);

  const raws = facts.map(f => f.raw);
  for (const line of PINNED) {
    assert.ok(raws.includes(line),
      `the register no longer carries this line byte for byte:\n    ${line}`);
  }

  const green = runChecker([]);
  assert.equal(green.code, 0, `the validator must exit 0 on the committed register; got ${green.code}\n${green.out}`);
  assert.match(green.out, /^\d+ facts, oldest \d{4}-\d{2}-\d{2}, newest \d{4}-\d{2}-\d{2}$/m,
    `the validator's summary line is missing or reshaped:\n${green.out}`);

  // ---- (b) the validator does work: four bad registers and one absent one ---------------------
  const mutations = [
    {
      name: "a date that is not a real calendar date",
      file: () => tempCopy(t => t.replace("- 2026-09-13 | SES-382 ", "- 2026-13-99 | SES-382 ")),
      expect: 1,
      names: /2026-13-99/,
    },
    {
      name: "a SOURCE naming a ticket that is not on the board",
      file: () => tempCopy(t => t.replace("| SES-384 |", "| SES-99999 |")),
      expect: 1,
      names: /SES-99999/,
    },
    {
      name: "a line missing a pipe",
      file: () => tempCopy(t => t.replace("| SES-399 | reverse", "| SES-399 reverse")),
      expect: 1,
      names: /3 pipe-separated fields/,
    },
    {
      name: "a verbatim duplicate line",
      file: () => tempCopy(t => t.replace(PINNED[0], `${PINNED[0]}\n${PINNED[0]}`)),
      expect: 1,
      names: /duplicate/,
    },
  ];

  for (const m of mutations) {
    const p = m.file();
    try {
      const r = runChecker([`--register=${p}`]);
      assert.equal(r.code, m.expect,
        `${m.name}: expected exit ${m.expect}, got ${r.code}. A validator that accepts this is ` +
        `inert.\n${r.out}`);
      assert.match(r.out, m.names, `${m.name}: the failure must NAME the offending line\n${r.out}`);
      assert.match(r.out, /line \d+:/, `${m.name}: the failure must give a line number\n${r.out}`);
    } finally {
      fs.rmSync(p, { force: true });
    }
  }

  // The register renamed away is a DIFFERENT failure from a bad line, and the exit codes keep it
  // that way -- 2, never 1, so "the mechanism is gone" cannot hide inside "you typed a bad line".
  const gone = runChecker([`--register=${path.join(os.tmpdir(), `ses396-${process.pid}-absent.md`)}`]);
  assert.equal(gone.code, 2, `a missing register must exit 2, got ${gone.code}\n${gone.out}`);
  assert.match(gone.out, /cannot read/, `the exit-2 message must say what it could not read\n${gone.out}`);

  // Negative control for the whole of (b): an UNMUTATED temp copy must still pass. Without it,
  // every arm above would also pass if --register simply broke and always failed.
  const control = tempCopy(t => t);
  try {
    const r = runChecker([`--register=${control}`]);
    assert.equal(r.code, 0,
      `control: an unmutated copy of the register must still exit 0, got ${r.code}\n${r.out}`);
  } finally {
    fs.rmSync(control, { force: true });
  }

  // ---- (c) --render is the row's body: header, then every fact in file order ------------------
  const rendered = runChecker(["--render"]);
  assert.equal(rendered.code, 0, `--render must exit 0, got ${rendered.code}\n${rendered.out}`);
  const renderedText = rendered.out.replace(/\r\n/g, "\n").replace(/\n$/, "");
  assert.ok(renderedText.startsWith(RENDER_HEADER),
    `--render must start with RENDER_HEADER.\nExpected: ${RENDER_HEADER}\nGot: ${renderedText.slice(0, 200)}`);

  const renderedLines = renderedText.split("\n");
  const factLines = renderedLines.filter(l => l.startsWith("- "));
  assert.deepEqual(factLines, raws,
    "--render must carry every fact line verbatim and in file order -- it is the bytes the gated " +
    "Knowledge row will be created from");

  // ---- (d) the byte pin, against a row that is gated out of this slice ------------------------
  if (!hasCreds()) {
    notRun(`SES-396 (d) byte pin: ${SLUG}.method === --render`, `no Supabase credentials -- ${CRED_HINT}`);
    return;
  }

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/skill_profiles?slug=eq.${SLUG}&select=slug,method`,
    { headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      } });
  // The body is read exactly once: building the failure message with `await res.text()` inside the
  // assert call would consume it eagerly on the SUCCESS path too, and res.json() then throws
  // "Body has already been read" -- a red that says nothing about the register.
  if (!res.ok) assert.fail(`skill_profiles read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();

  if (rows.length === 0) {
    notRun(`SES-396 (d) byte pin`,
      `${SLUG} does not exist yet -- gated, §19v P5; card filed by task 4`);
    return;
  }

  // The row exists: the pin is live from here on, with no edit to this arm.
  assert.equal(rows.length, 1, `expected exactly one ${SLUG} row, got ${rows.length}`);
  assert.equal(
    String(rows[0].method).replace(/\r\n/g, "\n").replace(/\n$/, ""),
    renderedText,
    `${SLUG}.method has drifted from \`node scripts/check-environment-facts.js --render\`. The row ` +
    `is created FROM the register, so the register wins: re-render and update the row.`);
}

selfRun(import.meta.url, run);
