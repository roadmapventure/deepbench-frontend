// DeepBench v7.0.999 | tests/regression/agt-618-skill-rules.test.mjs | AGT-618 -- THE REVIEW CARRIES
// JOHN'S NEED SOURCE, AND THE WHOLE SYMPTOM.
//
// WHAT WAS WRONG, measured live on the unchanged tree this cycle. scripts/audit-review.js has
// accepted `need_source` (who:table:id) and `home` (an executing projects.slug) on a root-cause
// group since AGT-309 and prints the `next: requirement-check` line from them, and
// runner_settings.need_source_kinds already admits john:runner_directives and john:runner_decisions
// -- but `need_source` occurred ZERO times in public.skill_profiles.method for ga-review-intent and
// ds-kickoff-intent, and ga-review-intent's `traits` group schema offered the reviewing model
// neither key. So no review carried either, every ticket landed in dev-mgr-findings (a `planned`,
// capture-only project), and AGT-280's requirement gate was right to refuse a placement citing no
// traceable need. `symptom` occurred ZERO times as well, so nothing required a root cause to account
// for every occurrence of a stated symptom: one cycle named the meter-reader cause and left 69 of
// the last 100 failed runs unexplained. docs/design/agt-618-skill-rules.sql appends the two
// paragraphs and the two traits keys.
//
// WHY THE ASSERTIONS ARE WHERE THEY ARE. The row carrying the text is one fact; the fact that
// matters is the PROMPT THE AGENT IS HANDED, because that is what was 0 before this ticket. So part
// A pins the shipped SQL (the text a reader checks is the text that shipped -- each paragraph sits
// in that file exactly once, by construction, and this arm is what keeps a second drifting copy
// out), and part B renders the two real capabilities through scripts/agent-prompt.js and counts the
// paragraphs in stdout.
//
// ONE ROW, ONE RULE -- AND THE ABSENCE IS ASSERTED TOO. N (the need source and the home) is the
// ARCHITECT's filing rule and has no subject in a Designer's kickoff turn, so part B asserts it is
// absent from the designer assembly as hard as it asserts it is present in the architect's. An arm
// that only checked presence would pass a migration that pasted both paragraphs into every row,
// which is a widened edit, not a harmless extra.
//
// THE UNDO IS PART OF THE SHIP. The two edits are agent-row writes under an agreed ticket, so each
// carries its own `runner_decisions` row and a FULL-ROW `runner_before_images` under it (the
// migration's down -- capture_migration_down() refuses an empty object array, and this migration
// creates no database object). Part B reads both back: two decisions, two images, and the images'
// `pk_value`s are the two skill_profiles uuids, so `reverse_decision()` has something to put back.
//
// THIS FILE WRITES NOTHING AND SPENDS NOTHING. Every live call is a READ; agent-prompt.js assembles
// from the database and prints, and calls no model.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun()/notRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATION_REL = "docs/design/agt-618-skill-rules.sql";
const AGENT_PROMPT = path.join(ROOT, "scripts/agent-prompt.js");

const GA = "84c096ec-0c5a-41a7-abef-e51ee440a4d9";  // ga-review-intent
const DS = "3203e5c9-8804-4fc1-82a7-c47577b4bb75";  // ds-kickoff-intent

// The two paragraphs, verbatim -- the kickoff section 4's own text. They are compared WHOLE and not
// by heading: a heading match would pass a paragraph that shipped truncated or reworded mid-sentence,
// which is exactly the half of the rule an agent would then not be following.
const N = "THE NEED SOURCE AND THE HOME (AGT-309, AGT-480, AGT-618). When a root-cause group's findings trace to a statement of John's -- a runner_directives or runner_decisions row, or any pair in runner_settings.need_source_kinds -- put two keys on the group, filing or reuse alike: need_source, the who:table:id of the row you read, and home, an executing project's slug from task_context.projects. Both or neither, root-cause only. They move nothing; --apply prints one next: requirement-check line per such group, the ticket's way to the build queue without John. Never cite an id you did not read.";
const E = "THE WHOLE SYMPTOM (AGT-618). When the work starts from a stated symptom -- John's problem statement, a failing check, a count -- enumerate EVERY occurrence in the window with a read-only query before naming a cause. Each occurrence gets a reproduced cause; the per-cause counts add up to the total, and any remainder is written as unexplained with its count. Real or expected, without reading why, is unexplained. Search the board once per cause and reuse the open ticket that covers it. A chore for John is never a cause or a fix: a John chore is a platform gap.";

// Occurrences, never `.includes()`. "Holds it" and "holds it once" are different facts, and only the
// second one refuses a second pasted copy.
const count = (haystack, needle) => haystack.split(needle).length - 1;

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

const node = (args, opts = {}) =>
  spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...opts });

export default async function run_() {
  // ---- (A) the shipped migration text, offline ------------------------------------------------
  const sql = fs.readFileSync(path.join(ROOT, MIGRATION_REL), "utf8");
  assert.strictEqual(count(sql, N), 1,
    `${MIGRATION_REL} must state THE NEED SOURCE AND THE HOME exactly once -- a second copy is a ` +
    "copy that can drift from the one that ships, and the gate block names the paragraph by its " +
    "heading for exactly this reason");
  assert.strictEqual(count(sql, E), 1,
    `${MIGRATION_REL} must state THE WHOLE SYMPTOM exactly once, for the same reason`);

  if (!hasCreds()) {
    notRun("AGT-618 (B) the two rendered capabilities and the two agent-row undos",
      `no Supabase credentials -- ${CRED_HINT}`);
    return;
  }

  // ---- (B) live: the prompt the agent is actually handed --------------------------------------
  //
  // The architect's review turn carries BOTH paragraphs and both group keys. `--intent` is omitted
  // on purpose: the capability's own `default_intent_slug` is what a real turn resolves, so passing
  // the slug by hand would prove the row and not the wiring.
  const ga = node([AGENT_PROMPT, "--agent=architect", "--capability=review-audit-worklist"]);
  assert.strictEqual(ga.status, 0,
    `agent-prompt.js --agent=architect --capability=review-audit-worklist exited ${ga.status}\n${ga.stderr}`);
  assert.strictEqual(count(ga.stdout, N), 1,
    "the assembled review prompt must carry THE NEED SOURCE AND THE HOME exactly once. It was 0 " +
    "before this ticket -- measured, not recalled -- which is why no review ever filed a " +
    "need_source and every ticket stalled in a planned holding project");
  assert.strictEqual(count(ga.stdout, E), 1,
    "the assembled review prompt must carry THE WHOLE SYMPTOM exactly once; it was 0 before this ticket");
  // The RULE tells the Architect to put the keys on a group; the CONTRACT has to let it. A rule
  // whose keys the output schema rejects is a rule the agent cannot obey.
  assert.ok(count(ga.stdout, '"need_source"') >= 1,
    'the review prompt must offer the "need_source" key -- the rule asks for it, so the group ' +
    "schema the model is handed has to admit it");
  assert.ok(count(ga.stdout, '"home"') >= 1, 'the review prompt must offer the "home" key for the same reason');

  // The designer's kickoff turn carries the whole-symptom rule and NOT the Architect's filing rule.
  const ds = node([AGENT_PROMPT, "--agent=designer", "--capability=design-kickoff", "--intent=ds-kickoff-intent"]);
  assert.strictEqual(ds.status, 0,
    `agent-prompt.js --agent=designer --capability=design-kickoff exited ${ds.status}\n${ds.stderr}`);
  assert.strictEqual(count(ds.stdout, E), 1,
    "the assembled kickoff prompt must carry THE WHOLE SYMPTOM exactly once -- the Designer's " +
    "premise check is the other turn that names a cause from a stated symptom");
  assert.strictEqual(count(ds.stdout, N), 0,
    "and must NOT carry THE NEED SOURCE AND THE HOME: filing a root-cause group is the Architect's " +
    "turn, and a copy here would be a widened edit no presence-only assertion would catch");

  // ---- (B, continued) the two undos --------------------------------------------------------
  const url = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  const rest = async q => {
    const r = await fetch(`${url}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    // The failure message is built ONLY on a failure: assert.ok evaluates its message eagerly, so
    // an inline `await r.text()` would consume the body every call and the happy path would throw
    // "Body has already been read" on a perfectly good 200.
    if (!r.ok) assert.fail(`GET ${q} answered HTTP ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    assert.ok(Array.isArray(rows), `GET ${q} came back non-array`);
    return rows;
  };

  const decisions = await rest("runner_decisions?select=id,backlog_id,kind&kind=eq.agent-row&backlog_id=eq.AGT-618&order=id");
  assert.strictEqual(decisions.length, 2,
    `AGT-618's two skill_profiles edits are agent-row writes under an agreed ticket, so each must ` +
    `carry its own decision: expected 2, got ${decisions.length}`);

  const ids = decisions.map(d => d.id).join(",");
  const images = await rest(
    `runner_before_images?select=id,table_name,pk_value,decision_id,row_data&decision_id=in.(${ids})&order=id`);
  assert.strictEqual(images.length, 2,
    `each decision must carry one FULL-ROW before-image -- that pair IS this migration's down, ` +
    `because capture_migration_down() refuses an empty object array and the migration creates no ` +
    `database object: expected 2, got ${images.length}`);
  assert.deepStrictEqual([...new Set(images.map(i => i.table_name))], ["skill_profiles"]);
  assert.deepStrictEqual(images.map(i => i.pk_value).sort(), [DS, GA].sort(),
    "the images must name the two skill_profiles rows by uuid -- a pk_value reverse_decision() " +
    "cannot resolve is an undo promise that cannot be kept");
  // A before-image is the text that stood BEFORE, so neither may already carry the paragraph its
  // row now carries: an image taken after the UPDATE would restore the edit it is supposed to undo.
  for (const img of images) {
    const before = img.row_data?.method;
    assert.strictEqual(typeof before, "string", `before-image ${img.id} carries no method text to restore`);
    assert.strictEqual(count(before, E), 0,
      `before-image ${img.id} (${img.pk_value}) already holds THE WHOLE SYMPTOM -- it was taken ` +
      "AFTER the update, so reversing it would restore the edit rather than undo it");
  }

  console.log(`[AGT-618] A: ${MIGRATION_REL} states each rule once. B: review prompt N×1 E×1 + ` +
    `need_source/home keys, kickoff prompt E×1 N×0, ${decisions.length} agent-row decisions / ` +
    `${images.length} pre-edit before-images (${images.map(i => i.pk_value.slice(0, 8)).sort().join(", ")})`);
}

selfRun(import.meta.url, run_);
