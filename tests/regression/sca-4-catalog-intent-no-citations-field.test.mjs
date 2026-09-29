// DeepBench v7.0.717 | tests/regression/sca-4-catalog-intent-no-citations-field.test.mjs | SCA-4 --
// library-catalog-intent must never re-declare a `citations` output field. The row asked for the
// same citations twice: `traits.schema` declared a `citations` array AND `method` requires the
// inline `[id: ...]` value of at least one representative entry per category. All 5 `complete` hops
// returned the array; the method's inline ids are where the citations actually live.
//
// WHAT IT WOULD TAKE TO PASS THIS VACUOUSLY, and why each part is shaped against it:
//
// (a) STATIC, on the repo mirror. A static check over a file is the only part that runs with no
//     credentials at all, so it is the part most likely to rot into a word-count. It pins the FIVE
//     load-bearing fragments of the migration -- the row it targets, the jsonb path it deletes, the
//     before-image projection, the decision handle and the ticket id -- and then pins the cycle
//     literal at EXACTLY two occurrences. That exact count is the AGT-154 lesson made mechanical:
//     the handle and the image must hang off the cycle that made the write, and a third literal is
//     how a copied migration ends up recording one cycle's decision against another cycle's id.
//     The agent-name scan (§19d RULE #1) is proven to FIRE on a planted line before its silence on
//     the real file is allowed to mean anything -- a matcher never shown to fire is a rubber stamp
//     (SES-199), and this one has to survive comment lines that legitimately discuss other lanes.
//
// (b) LIVE, the board itself. (a) grades the mirror; only (b) grades the database, and they can
//     disagree -- a mirror committed without its migration applied passes (a) and fails (b), which
//     is exactly the discrimination worth having. It also asserts the two things this change must
//     NOT have touched: the `Cite the [id: ...] value` instruction in `method` and `max_tokens`
//     3000. A jsonb_set that took the instruction or the cap with it is a regression this file
//     catches, and a "drop the field" assertion alone would pass right over it. The before-image
//     assertion demands the PRE state (`citations` still present in the stored image): an image
//     captured AFTER the UPDATE satisfies every other assertion here and restores the change
//     instead of undoing it, so the reversal promise is graded on its content, not its existence
//     (pattern:169).
//
// (c) LIVE EXECUTOR, one real call, behind its own flag. (b) proves the CONTRACT changed; only (c)
//     proves the ANSWER still carries its citations -- the whole premise of dropping the field.
//     Its three assertions are one claim each: the inline ids are still emitted, the array is
//     really gone from the returned content, and the output still fits under the 3000-token cap
//     that closed the truncation half of the premise. Flag-gated because it bills a model call
//     (~$0.02, haiku): the suite must never quietly spend money on every run, so the flag is
//     opt-in and its absence is DECLARED through notRun(), never skipped silently (SES-180 -- an
//     invisible gap is indistinguishable from coverage).

import assert from "assert";
import fs from "fs";
import { selfRun, notRun } from "./_lib/self-run.js";
import { runCapability } from "../../api/capabilities/execute.js";

const MIRROR = new URL("../../docs/design/sca-4-catalog-intent-no-citations-field.sql", import.meta.url);
const SLUG = "library-catalog-intent";
const CYCLE = "35d7f94d-2f0a-458f-8b9b-de71c13c0c4c";
const INLINE_CITE = "Cite the [id: ...] value";

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

async function rows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// Pure, and exported so the planted-line control below drives the SAME function the real scan uses.
// A comment line may legitimately name another lane while reasoning about readers; a SQL line may
// not (§19d RULE #1 -- a Skill row's stored content never names another agent or its private store).
export const FORBIDDEN_NAMES = ["marcus", "michelle", "owen"];

export function namesOutsideComments(sql, names = FORBIDDEN_NAMES) {
  return sql
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith("--"))
    .flatMap(line => names.filter(n => line.toLowerCase().includes(n)));
}

export function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

export default async function run() {
  // ---- (a) STATIC: the repo mirror of migration sca4_catalog_intent_no_citations_field ---------

  assert.ok(fs.existsSync(MIRROR),
    "docs/design/sca-4-catalog-intent-no-citations-field.sql is missing -- the migration has no " +
    "reviewable mirror in the repo, so the dropped output field cannot be reviewed without a " +
    "database round-trip");
  const sql = fs.readFileSync(MIRROR, "utf8");
  assert.ok(sql.length > 500,
    `the mirror is ${sql.length} bytes -- a near-empty file passes every "includes" assertion below ` +
    "vacuously");

  for (const fragment of [
    `WHERE slug = '${SLUG}'`,
    "#- '{schema,properties,citations}'",
    "'skill_profiles', s.id::text, to_jsonb(s.*)",
    "record_decision(",
    "'SCA-4'",
  ]) {
    assert.ok(sql.includes(fragment),
      `the mirror must contain ${JSON.stringify(fragment)} -- without it the migration does not ` +
      "target this row, delete this path, capture the real pre-image, open a reversal handle, or " +
      "name the ticket it is acting for");
  }

  const cycleHits = countOccurrences(sql, CYCLE);
  assert.strictEqual(cycleHits, 2,
    `the mirror names cycle ${CYCLE} ${cycleHits} time(s); it must name it EXACTLY 2 -- once in ` +
    "record_decision() and once in the before-image INSERT. Fewer means the handle or the image " +
    "hangs off nothing; more means a copied literal, which is how one cycle's decision gets " +
    "recorded against another cycle's id and stops being reversible from here (the AGT-154 lesson)");

  // The agent-name scan, shown to FIRE before its silence is trusted. Only the comment marker
  // differs between the two inputs, so the pass/fail difference is attributable to nothing else.
  assert.deepStrictEqual(
    namesOutsideComments("UPDATE public.skill_profiles SET method = method || ' ask Marcus';"),
    ["marcus"],
    "the scan must FLAG a SQL line naming another agent -- a matcher never shown to fire makes its " +
    "own silence meaningless");
  assert.deepStrictEqual(
    namesOutsideComments("-- the delegating hop, which is Marcus today, reads the inline ids"),
    [],
    "the scan must stay QUIET on a `--` comment line naming another agent -- the rule governs the " +
    "row's stored content, not the migration's reasoning");
  assert.deepStrictEqual(namesOutsideComments(sql), [],
    "the mirror's SQL names another agent outside a `--` line -- §19d RULE #1: what this row stores " +
    "never names another agent or another agent's private store");

  console.log(`  (a) STATIC: mirror holds all 5 fragments, names cycle ${CYCLE.slice(0, 8)} exactly ` +
    "2x, no agent name outside a comment; scan proven to fire -- PASS");

  if (!hasCreds()) {
    notRun(`(b) the live ${SLUG} row and its before-image`, CRED_HINT);
    notRun("(c) the live library-catalog-intent executor call", CRED_HINT);
    return;
  }

  // ---- (b) LIVE: the row the contract is actually read from ------------------------------------
  // db-assembly.js:310-314 lifts traits.schema into formatContract verbatim, so this read grades
  // the exact bytes the live call is constrained by.

  const live = await rows(`skill_profiles?slug=eq.${SLUG}&select=method,traits,max_tokens`);
  assert.strictEqual(live.length, 1,
    `the live read returned ${live.length} row(s) for slug=${SLUG} -- an assertion over 0 rows is a ` +
    "vacuous pass, and over 2 it grades an ambiguous board");
  const [row] = live;
  const schema = row.traits?.schema;
  assert.ok(schema && typeof schema === "object",
    `${SLUG} has no traits.schema -- the format contract db-assembly.js reads is gone entirely, ` +
    "which is a bigger break than the field this ticket removed");

  assert.deepStrictEqual(schema.required, ["answer"],
    `traits.schema.required is ${JSON.stringify(schema.required)} -- it must be exactly ["answer"]. ` +
    "A schema that still REQUIRES a property it no longer declares fails every validation instead " +
    "of none");
  assert.strictEqual("citations" in (schema.properties || {}), false,
    `traits.schema.properties still declares \`citations\`: ${JSON.stringify(Object.keys(schema.properties || {}))} ` +
    "-- this is the field SCA-4 removes, and declaring it is what makes the model emit the array");
  assert.ok(row.method.includes(INLINE_CITE),
    `\`method\` no longer contains ${JSON.stringify(INLINE_CITE)} -- the inline ids are where the ` +
    "citations survive this change, so losing the instruction turns a de-duplication into a loss " +
    "of citations. The migration changes traits only; method is untouched by design");
  assert.strictEqual(row.max_tokens, 3000,
    `max_tokens is ${row.max_tokens}, expected 3000 -- the cap that closed the truncation half of ` +
    "this ticket's premise (0 truncations since HAR-9-done); a jsonb_set that moved it would " +
    "reopen it");

  const images = await rows(
    `runner_before_images?table_name=eq.skill_profiles&cycle_id=eq.${CYCLE}` +
    "&select=id,table_name,pk_value,row_data,decision_id");
  assert.strictEqual(images.length, 1,
    `this cycle filed ${images.length} skill_profiles before-image(s), expected exactly 1 -- the ` +
    "single reversal handle for the single row it changed");
  const [image] = images;
  assert.ok(image.row_data?.traits?.schema?.properties &&
            "citations" in image.row_data.traits.schema.properties,
    "the before-image does NOT carry `citations` in traits.schema.properties, so it is not the PRE " +
    "state -- an image captured after the UPDATE passes every other assertion here and would " +
    "RESTORE the change instead of undoing it (pattern:169: a recorded promise must be keepable)");
  assert.deepStrictEqual(image.row_data.traits.schema.required, ["answer", "citations"],
    "the before-image's stored `required` must be the pre-change " +
    '["answer","citations"] -- the exact value reverse_decision() has to put back');

  console.log(`  (b) LIVE: ${SLUG} required=["answer"], no citations property, method keeps the ` +
    `inline-cite instruction, max_tokens 3000; 1 pre-state before-image (${image.id}) -- PASS`);

  // ---- (c) LIVE EXECUTOR: the answer still carries its citations -------------------------------
  // (b) proves the contract changed. This proves the change did not cost the product anything: the
  // ids are still in the prose, the array is really gone from what the caller receives, and the
  // output still fits under the cap.

  if (process.env.SCA4_LIVE_EXECUTOR !== "1" || !process.env.ANTHROPIC_API_KEY) {
    notRun(
      "(c) the live library-catalog-intent call -- inline [id: ...] still emitted, no citations " +
      "array in r.content, output under the 3000-token cap",
      "set SCA4_LIVE_EXECUTOR=1 and ANTHROPIC_API_KEY (runner_secrets, exported inline per " +
      "docs/runbooks/session-setup.md step 1b) and re-run this file directly. It is flag-gated " +
      "because it bills one haiku call (~$0.02) and the suite must not spend on every run");
    return;
  }

  const r = await runCapability({
    capability_slug: "data-room-custody",
    intent_slug: SLUG,
    agent_id: "eleanor",
    task_context: { question: "What data and categories exist in the Data Room?" },
    tenant_id: "global",
  });

  assert.ok(r?.content && typeof r.content === "object",
    `the live call returned no parsed content (status ${JSON.stringify(r?.status)}) -- there is ` +
    "nothing to grade, which is a NOT-RUN wearing a pass, not a pass");

  const inline = String(r.content.answer || "").match(/\[id: [0-9a-f-]{36}\]/g) || [];
  assert.ok(inline.length >= 1,
    "the answer contains no inline `[id: ...]` citation -- dropping the citations FIELD is only " +
    "safe because the method still requires the inline ids, so an answer without one means this " +
    "change lost the citations rather than de-duplicating them");
  assert.strictEqual("citations" in r.content, false,
    `the returned content still carries a \`citations\` key: ${JSON.stringify(Object.keys(r.content))} ` +
    "-- the schema no longer declares it, so the model is still being asked for it somewhere, or " +
    "the contract the call used was not the row (b) just read");
  const outputTokens = r.debug?.tokens?.output_tokens;
  assert.strictEqual(typeof outputTokens, "number",
    `r.debug.tokens.output_tokens is ${JSON.stringify(outputTokens)}, not a number -- an unmeasured ` +
    "output cannot be asserted below the cap");
  assert.ok(outputTokens < 3000,
    `the call spent ${outputTokens} output tokens against a 3000 cap -- at or above the cap the ` +
    "answer is truncated, which is the half of this ticket's premise that was already closed");

  console.log(`  (c) LIVE EXECUTOR: ${inline.length} inline [id: ...] citation(s), "citations" in ` +
    `r.content = false, output_tokens ${outputTokens} < 3000 -- PASS`);
}

selfRun(import.meta.url, run);
