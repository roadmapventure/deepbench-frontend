// DeepBench v7.0.1082 | tests/regression/agt-618-skill-rules.test.mjs | AGT-618 -- THE REVIEW CARRIES
// JOHN'S NEED, AND THE WHOLE SYMPTOM. Two paragraphs went into two live `skill_profiles` rows under
// migration `agt618_skill_rules`, and a Skill edit that lives only in a database row has nothing in
// the tree that goes red when it is reverted, re-worded, or quietly lost in a later edit of the same
// `method`. This file is that red.
//
// ARM A is static: the migration's own text, docs/design/agt-618-skill-rules.sql, carries BOTH
// paragraphs verbatim -- so the repo holds the words, not just a reference to them, and a paragraph
// re-worded in the row without a migration is a diff somebody has to write.
//
// ARM B is live, and it grades the ASSEMBLED PROMPT rather than the row: the Governance Architect's
// review turn must carry N once, E once, and the two group keys N tells the model to fill; the
// Designer's kickoff turn must carry E once and N never, because N is a filing rule with no subject
// in a kickoff. Reading the rendered prompt is what makes this an assertion about what the agent is
// told -- a `method` column with the right bytes that no capability assembles reaches no agent at
// all. The undo is asserted beside it: two `agent-row` decisions under AGT-618 carrying two full-row
// before-images, one per row, which is the whole of the migration's down (pattern:169).
//
// DECLARED DEVIATION from the kickoff's T2 (a): the kickoff asks arm A to read each paragraph "once"
// in the file. The migration is the two-DO-block shape the kickoff told it to copy from
// docs/design/agt-424-unroutable-dispositions.sql -- an apply block and a trailing `do $gate$` that
// re-declares the same constants to grade its own work -- so each paragraph sits in the file exactly
// TWICE, once per block, and the file is the applied migration's text byte for byte but for its
// version header. Arm A asserts that shape precisely: exactly one occurrence before `do $gate$` and
// exactly one after. That is strictly narrower than "at least once" -- an appended third copy, or a
// gate that stopped quoting the paragraph it grades, reddens it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATION_REL = "docs/design/agt-618-skill-rules.sql";
const GA = "84c096ec-0c5a-41a7-abef-e51ee440a4d9";   // ga-review-intent, the Governance Architect
const DS = "3203e5c9-8804-4fc1-82a7-c47577b4bb75";   // ds-kickoff-intent, the Designer
const GATE = "\ndo $gate$";   // at the start of a line: the header comment names it too

// The two headings, exactly as the paragraphs open. A heading is what a later edit would keep or
// drop whole; matching on it rather than on the full paragraph is what lets this file grade a
// rendered prompt that wraps or indents the body.
const N_HEAD = "THE NEED SOURCE AND THE HOME (AGT-309, AGT-480, AGT-618).";
const E_HEAD = "THE WHOLE SYMPTOM (AGT-618).";

const count = (haystack, needle) =>
  needle.length === 0 ? 0 : (haystack.length - haystack.split(needle).join("").length) / needle.length;

function renderPrompt(args) {
  return spawnSync(process.execPath, ["scripts/agent-prompt.js", ...args],
    { cwd: ROOT, env: process.env, encoding: "utf8" });
}

async function main() {
  // --- A: the migration's text carries both paragraphs, once per block (static) -----------------
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION_REL), "utf8");
  assert.strictEqual(count(sql, GATE), 1,
    `${MIGRATION_REL} must carry exactly one trailing \`do $gate$\` block: a migration that does not grade itself proves nothing`);
  const gateAt = sql.indexOf(GATE);
  const applyBlock = sql.slice(0, gateAt);
  const gateBlock = sql.slice(gateAt);
  for (const [name, head] of [["N", N_HEAD], ["E", E_HEAD]]) {
    assert.strictEqual(count(applyBlock, head), 1,
      `${name} must sit exactly once in ${MIGRATION_REL}'s apply block; sits ${count(applyBlock, head)} time(s)`);
    assert.strictEqual(count(gateBlock, head), 1,
      `${name} must sit exactly once in ${MIGRATION_REL}'s gate block; sits ${count(gateBlock, head)} time(s)`);
  }
  // The gate the migration shipped with, asserted as text: both directions, never a success flag
  // (.claude/rules/supabase-column-grants.md).
  assert.ok(sql.includes("N must NOT appear in ds-kickoff-intent"),
    "the migration's gate must assert N's ABSENCE from the Designer's row, not only E's presence");
  assert.ok(sql.includes("'need_source'") && sql.includes("'home'"),
    "the migration must name both group keys it adds to the Architect's traits");
  console.log(`[AGT-618] part A: ${MIGRATION_REL} carries N and E once per block, and a gate that asserts both directions`);

  // --- B: live -----------------------------------------------------------------------------------
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    const why = "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set; run with node --env-file-if-exists=.env.local tests/regression/run-all.js";
    notRun("the assembled prompts and the undo (part B)", why);
    return;
  }

  // (i) the Governance Architect's review turn: N once, E once, and the two keys N tells it to fill.
  const ga = renderPrompt(["--agent=architect", "--capability=review-audit-worklist"]);
  assert.strictEqual(ga.status, 0, `the architect's review prompt must assemble; stderr: ${ga.stderr}`);
  assert.strictEqual(count(ga.stdout, N_HEAD), 1,
    `the review prompt must carry N exactly once; carries ${count(ga.stdout, N_HEAD)} -- 0 is the defect AGT-618 was filed for, 2 is a double-applied migration`);
  assert.strictEqual(count(ga.stdout, E_HEAD), 1,
    `the review prompt must carry E exactly once; carries ${count(ga.stdout, E_HEAD)}`);
  // The rule is useless if the group schema does not offer the keys: the model answers a schema.
  assert.ok(count(ga.stdout, '"need_source"') >= 1,
    "the review prompt must offer `need_source` on a group, or the rule names a key the model cannot fill");
  assert.ok(count(ga.stdout, '"home"') >= 1,
    "the review prompt must offer `home` on a group, or the placement has nowhere to land");

  // (ii) the Designer's kickoff turn: E once, and N NEVER -- the one-variable half of the same read.
  const ds = renderPrompt(["--agent=designer", "--capability=design-kickoff", "--intent=ds-kickoff-intent"]);
  assert.strictEqual(ds.status, 0, `the designer's kickoff prompt must assemble; stderr: ${ds.stderr}`);
  assert.strictEqual(count(ds.stdout, E_HEAD), 1,
    `the kickoff prompt must carry E exactly once; carries ${count(ds.stdout, E_HEAD)}`);
  assert.strictEqual(count(ds.stdout, N_HEAD), 0,
    "N is the Architect's filing rule and has no subject in a kickoff turn: a copy here is a widened edit, not a harmless extra");
  console.log("[AGT-618] part B (i)(ii): the review turn carries N 1 / E 1 with both group keys; the kickoff turn E 1 / N 0");

  // (iii) THE UNDO. Two `agent-row` decisions under AGT-618, each carrying ONE full-row
  // `skill_profiles` before-image -- the whole of this migration's down, since it creates no database
  // object for capture_migration_down() to capture. A decision with no image is an unkeepable promise.
  const url = base.replace(/\/+$/, "");
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async pathAndQuery => {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: H });
    const body = await res.text();
    assert.ok(res.ok, `GET ${pathAndQuery} returned HTTP ${res.status} ${res.statusText}: ${body}`);
    return JSON.parse(body);
  };

  const decs = await rest("runner_decisions?select=id,kind,backlog_id&kind=eq.agent-row&backlog_id=eq.AGT-618&order=id");
  assert.strictEqual(decs.length, 2,
    `AGT-618's two Skill edits must carry exactly two agent-row decisions; found ${decs.length}`);
  const imgs = await rest(
    `runner_before_images?select=decision_id,table_name,pk_value,row_data&decision_id=in.(${decs.map(d => d.id).join(",")})&order=pk_value`);
  assert.strictEqual(imgs.length, 2,
    `each decision must carry exactly one before-image; found ${imgs.length} under ${decs.length} decisions`);
  assert.deepStrictEqual([...new Set(imgs.map(i => i.table_name))], ["skill_profiles"],
    "both images must be of skill_profiles -- no other table was edited");
  assert.deepStrictEqual(imgs.map(i => i.pk_value).sort(), [GA, DS].sort(),
    "the two images must be the Architect's row and the Designer's row, by uuid");
  assert.deepStrictEqual([...new Set(imgs.map(i => i.decision_id))].length, 2,
    "two images under ONE decision would be a single undo for two rows, not two independent ones");
  // A full-row image, not a patch: reverse_decision() puts the row back WHOLE, so the image must
  // carry the `method` the edit replaced.
  for (const i of imgs) {
    assert.ok(i.row_data && typeof i.row_data.method === "string",
      `the image for ${i.pk_value} must carry the whole row, method included`);
    assert.strictEqual(count(i.row_data.method, E_HEAD), 0,
      `the image for ${i.pk_value} must be the row BEFORE the edit: it still carries E, so it would re-apply it on a reverse`);
  }
  console.log(`[AGT-618] part B (iii): 2 agent-row decisions, 2 full-row before-images (${imgs.map(i => i.pk_value.slice(0, 8)).join(", ")}), each a separate undo`);
}

export default main;
selfRun(import.meta.url, main);
