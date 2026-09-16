// DeepBench v7.0.504 | tests/regression/ses-396b-designer-knowledge-row.test.mjs | SES-396 slice 2
// -- the Designer's environment-facts Knowledge row exists and is inlined, `--check-row` actually
// grades it, the Intent carries the BASELINE step, and the baseline helper can tell a red test from
// a green one.
//
// WHAT THIS FILE IS *NOT*, so it is not merged into its sibling. tests/regression/
// ses-396-environment-facts.test.mjs owns the REGISTER and the byte pin between the register and
// the row (its arm (d), which went live the moment this ticket created the row, with no edit to it).
// This file owns everything slice 2 added AROUND that pin: the row's SHAPE, the two new flags, the
// Intent's new step, and scripts/baseline-red-set.js. Duplicating the byte pin here would be a
// second implementation agreeing with itself (SES-45) and would double every future append's cost.
//
// ARM (b) IS THE ONE THAT COULD GO VACUOUS, and the shape it is written in is the defence. "The
// checker exits 0 against the live row" is satisfied by a `--check-row` that returns 0 without
// reading anything -- exactly the false all-clear the checker's own header warns about, and exactly
// what its no-credentials branch deliberately does. So (b) runs the SAME command a second time
// against a MUTATED render and requires exit 1. The mutation is a temp COPY of the register with one
// fact's text altered in a way that is still VALID -- proven by running the bare validator over that
// same copy first and requiring exit 0. Without that control, a 1 from the mutated run could equally
// mean "the copy is malformed", and the arm would be measuring the parser instead of the row.
//
// TEMP COPIES, NEVER THE COMMITTED REGISTER AND NEVER THE LIVE ROW. Cycles run in parallel against
// one clone and one database (register B42, and environment-facts.md's own SES-382 line): a test
// that mutated either in place would corrupt a concurrent run and would leave it corrupted if this
// file threw before restoring. Every temp path here carries this process's pid. Nothing in this file
// writes to Supabase at all -- the row was written once, by the build, under its decision handle.
//
// NO MODEL CALL AND NO SPEND. Whether the Designer's kickoffs actually improve now that it holds the
// measured environment facts is a question for the ticket's own QA and the staff watch, not for a
// permanent regression test that would bill an Anthropic call on every run.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun()/notRun() from _lib/self-run.js, never a
// console.log the harness cannot read.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { RENDER_HEADER, ROW_SLUG, ROW_CAPABILITY, ROW_DISPLAY_ORDER }
  from "../../scripts/check-environment-facts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKER = path.join(ROOT, "scripts/check-environment-facts.js");
const BASELINE = path.join(ROOT, "scripts/baseline-red-set.js");
const REGISTER = path.join(ROOT, "docs/runbooks/environment-facts.md");

const INTENT_SLUG = "ds-kickoff-intent";

// Byte for byte, and quoted in full rather than matched by substring: the value of a step in a live
// Skill's method is the EXACT sentence the model reads. A near-paraphrase would still satisfy a
// loose match and would no longer be the instruction this ticket shipped.
const BASELINE_STEP =
  "(3b) BASELINE: before writing tasks, run the test files the ticket names on the UNCHANGED tree " +
  "via node scripts/baseline-red-set.js --tests=<paths> (mechanical, no model call) and copy its " +
  "block into CONTEXT, so the Builder's baseline proof and the Verifier read one red set.";

// The Intent's output contract. Unchanged by this ticket, and asserted HERE because this ticket
// rewrote that row's `method`: a PATCH that also disturbed `traits` would be invisible in every
// other arm of this file and would break the runner's read-back of the Designer's return.
const INTENT_REQUIRED = [
  "backlog_id", "premise", "kickoff_path", "kickoff_markdown", "files", "tasks", "model", "qa_discriminator",
];

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

function run(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

let tmpSeq = 0;
function tempFile(name, body) {
  const p = path.join(os.tmpdir(), `ses396b-${process.pid}-${tmpSeq++}-${name}`);
  fs.writeFileSync(p, body, "utf8");
  return p;
}

export default async function run_() {
  // ---- (a) the row exists, is inlined, and its objective is the render header ------------------
  // ---- (b) --check-row grades the row: 0 live, 1 against a mutated render ----------------------
  // ---- (c) the Intent carries the BASELINE step and its contract is untouched ------------------
  if (!hasCreds()) {
    notRun(`SES-396b (a)-(c): the ${ROW_SLUG} row, --check-row, and ${INTENT_SLUG}'s BASELINE step`,
      `no Supabase credentials -- ${CRED_HINT}`);
  } else {
    const url = process.env.SUPABASE_URL.replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_KEY;
    const rest = async p => {
      const r = await fetch(`${url}/rest/v1/${p}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (!r.ok) assert.fail(`GET ${p} -> ${r.status} ${await r.text()}`);
      return r.json();
    };

    // ---- (a) -----------------------------------------------------------------------------------
    const rows = await rest(`skill_profiles?slug=eq.${ROW_SLUG}&select=slug,skill_type_slug,objective,traits`);
    assert.equal(rows.length, 1,
      `expected exactly one ${ROW_SLUG} row, got ${rows.length}. It is created by ` +
      `\`node scripts/check-environment-facts.js --write-row --cycle=<uuid> --decision=<uuid>\`, ` +
      `which images it first -- never by hand.`);
    const row = rows[0];
    assert.equal(row.skill_type_slug, "knowledge");
    assert.equal(row.traits && row.traits.source, "inline",
      `${ROW_SLUG}.traits.source must be "inline" (SES-341) -- api/prompt/db-assembly.js:207 only ` +
      "inlines a knowledge Skill's stored text on that trait; without it the section renders empty " +
      "and is DROPPED, and the Designer runs with no environment facts while still returning a " +
      "well-formed kickoff. Invisible in every other arm here.");
    assert.equal(row.objective, RENDER_HEADER,
      `${ROW_SLUG}.objective must be the render's header, the sentence that tells the model how to ` +
      `read the lines beneath it`);

    const links = await rest(
      `capability_skill_profiles?capability_slug=eq.${ROW_CAPABILITY}` +
      `&skill_profile_slug=eq.${ROW_SLUG}&select=display_order,level,is_required`);
    assert.equal(links.length, 1,
      `${ROW_SLUG} must be linked to ${ROW_CAPABILITY} exactly once, got ${links.length} links -- ` +
      "an unlinked Knowledge row is a row the Designer never reads");
    assert.equal(links[0].display_order, ROW_DISPLAY_ORDER);
    assert.equal(links[0].is_required, true);

    // ---- (b) -----------------------------------------------------------------------------------
    const live = run(CHECKER, ["--check-row"]);
    assert.equal(live.code, 0,
      `--check-row must exit 0 against the live row; got ${live.code}\n${live.out}`);

    // Still-valid, different bytes. The control below proves the "still valid" half rather than
    // assuming it.
    const registerText = fs.readFileSync(REGISTER, "utf8");
    const mutatedText = registerText.replace(
      "CI clones at depth 1", "CI clones at depth 9");
    assert.notEqual(mutatedText, registerText,
      "the fixture line this arm mutates is no longer in the register -- pick another valid line " +
      "rather than deleting the arm; an unmutated copy would make the assertion below vacuous");
    const mutated = tempFile("register.md", mutatedText);
    try {
      const control = run(CHECKER, [`--register=${mutated}`]);
      assert.equal(control.code, 0,
        `control: the mutated copy must still be a VALID register (exit 0), else the exit 1 below ` +
        `measures the parser and not the row; got ${control.code}\n${control.out}`);

      const drifted = run(CHECKER, [`--register=${mutated}`, "--check-row"]);
      assert.equal(drifted.code, 1,
        `--check-row must exit 1 when the render and the row disagree; got ${drifted.code}. ` +
        `A 0 here means it is comparing the render to itself.\n${drifted.out}`);
      assert.match(drifted.out, /drifted/,
        `the exit-1 message must say the row drifted\n${drifted.out}`);
      assert.match(drifted.out, /depth 9|line \d+/,
        `the exit-1 message must NAME where they differ, not just that they do\n${drifted.out}`);
    } finally {
      fs.rmSync(mutated, { force: true });
    }

    // ---- (c) -----------------------------------------------------------------------------------
    const intents = await rest(`skill_profiles?slug=eq.${INTENT_SLUG}&select=slug,method,traits`);
    assert.equal(intents.length, 1, `expected exactly one ${INTENT_SLUG} row, got ${intents.length}`);
    const method = String(intents[0].method);
    assert.ok(method.includes(BASELINE_STEP),
      `${INTENT_SLUG}.method must carry the BASELINE step byte for byte:\n    ${BASELINE_STEP}\n` +
      `Without it the Designer writes tasks with no measured red set and the Builder and the ` +
      `Verifier each re-measure their own.`);
    assert.equal(method.split("(3b) BASELINE:").length - 1, 1,
      `${INTENT_SLUG}.method must carry the BASELINE step ONCE -- a second copy is a re-run of the ` +
      `patch, and two copies of one instruction is how they drift apart`);
    assert.ok(method.indexOf(BASELINE_STEP) > method.indexOf("(3) read the governing"),
      "the BASELINE step must sit AFTER step (3): it is a measurement taken before tasks are " +
      "written, not before the files are read");
    assert.ok(method.indexOf(BASELINE_STEP) < method.indexOf("(4) write the kickoff"),
      "the BASELINE step must sit BEFORE step (4) -- a baseline measured after the tasks are " +
      "written is a baseline that could not have informed them");

    const schema = intents[0].traits && intents[0].traits.schema;
    assert.ok(schema && Array.isArray(schema.required),
      `${INTENT_SLUG}.traits.schema must still parse as an object schema with a \`required\` array ` +
      `-- this ticket PATCHed this row's method, and a PATCH that also disturbed traits would ` +
      `break the runner's read-back of the Designer's return with no other symptom here`);
    for (const k of INTENT_REQUIRED) {
      assert.ok(schema.required.includes(k),
        `${INTENT_SLUG}'s schema must still require "${k}" -- unchanged by SES-396`);
    }
  }

  // ---- (d) the baseline helper discriminates, and is honest about a missing path ---------------
  // No credentials needed: a pair of temp test files, one that throws and one that does not.
  const red = tempFile("red.mjs",
    'import assert from "assert";\nassert.equal(1, 2, "ses396b fixture: this one is meant to throw");\n');
  const green = tempFile("green.mjs", 'console.log("ses396b fixture: this one passes");\n');
  try {
    const r = run(BASELINE, [`--tests=${red},${green}`]);
    assert.equal(r.code, 0,
      `baseline-red-set.js REPORTS, it does not gate: it must exit 0 even with a red in the set, ` +
      `got ${r.code}\n${r.out}`);
    assert.match(r.out, /^Red set: 1 of 2$/m,
      `the block must end \`Red set: 1 of 2\`. A helper calling every file green, or counting the ` +
      `passing one red, cannot be used to separate a pre-existing red from one the build caused.` +
      `\n${r.out}`);
    const redLine = r.out.split("\n").find(l => l.includes(path.basename(red)));
    assert.ok(redLine && /— RED \(exit 1\)/.test(redLine),
      `the thrower must be named RED with its exit code\n${r.out}`);
    assert.match(redLine, /meant to throw/,
      `the RED line must carry the ASSERTION that fired -- a bare "RED" sends its reader back to ` +
      `re-run the test, which is the re-measurement this helper exists to stop\n${r.out}`);
    const greenLine = r.out.split("\n").find(l => l.includes(path.basename(green)));
    assert.ok(greenLine && /— green$/.test(greenLine),
      `the passing file must be reported green, with no exit code\n${r.out}`);

    // A path that is not there is this script's OWN failure (exit 2), not a green: a missing test
    // silently counted "no failures" would put an unmeasured file in a kickoff's baseline.
    const absent = path.join(os.tmpdir(), `ses396b-${process.pid}-absent.mjs`);
    const missing = run(BASELINE, [`--tests=${green},${absent}`]);
    assert.equal(missing.code, 2,
      `a missing path must exit 2, got ${missing.code}\n${missing.out}`);
    assert.match(missing.out, /do not exist/,
      `the exit-2 message must say what it could not find\n${missing.out}`);
    assert.ok(!/Red set:/.test(missing.out),
      `a refused run must print NO block -- a half-measured baseline is the one most likely to be ` +
      `pasted into a kickoff anyway\n${missing.out}`);
  } finally {
    fs.rmSync(red, { force: true });
    fs.rmSync(green, { force: true });
  }
}

selfRun(import.meta.url, run_);
