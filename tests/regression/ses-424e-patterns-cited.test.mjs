// DeepBench v7.0.537 | tests/regression/ses-424e-patterns-cited.test.mjs | SES-424 slice 5
// (SES-416 build item 2) -- a governance answer NAMES the decision criteria it applied, those
// numbers land in public.decision_pattern_citations as rows, and a drifted cycle-card Knowledge
// row has a repair path that is still an imaged, ticketed agent-row write.
//
// WHAT WOULD BREAK SILENTLY WITHOUT THIS FILE, which is the only reason it is permanent.
//
// (1) THE CONTRACT IS A ROW, NOT CODE. `patterns_applied` lives in three
// `public.skill_profiles.traits.schema` objects, and nothing in the repo would notice it being
// dropped: the agents keep answering, the answers keep validating, and every citation silently
// stops being produced. Arm C is the byte-level assertion that the key is still there AND still
// `required` -- an optional key is one the model may simply omit, which is the same outcome as
// having no key at all.
//
// (2) THE CITATION WRITE IS THE HALF THAT IS EASY TO MAKE VACUOUS. "agent-log.js accepts
// --patterns-applied" is satisfied by a build that parses the flag and writes nothing. So arm C
// runs the REAL script against the REAL table, reads the rows back by activity_log_id, and then
// deletes the log row and asserts the citations went with it -- the `on delete cascade` is what
// makes a citation-without-a-turn unrepresentable, and it is invisible in every other assertion.
//
// (3) THE REPIN LADDER IS FOUR OUTCOMES AND ONLY THE FIRST IS TESTED BY ACCIDENT. A build that
// simply added `--repin` and wrote on drift would pass "drift exits 1" (it no longer would) and
// would happily re-pin an agent's live Knowledge with no cycle and no ticket -- the unimaged,
// unowned UPDATE §19v exists to prevent. Arm B drives all four rungs against a DRIFTED COPY and
// asserts the live pin is UNCHANGED across the whole arm, so "it exited 2" is proven to mean
// "nothing was written" rather than "something was written and then it exited 2".
//
// TEMP COPIES, NEVER THE COMMITTED CARD AND NEVER A HAND-EDITED LIVE ROW. Cycles run in parallel
// against one clone and one database (register B42), so arm B builds a pid-named tree under the OS
// temp dir, copies the real script into it beside a one-byte-edited card, and removes it in a
// `finally`. The only live row arm B touches is READ.
//
// EVERY LIVE ROW THIS FILE CAUSES IS REMOVED. Arm C's ai_activity_log row and its citations are
// deleted in a `finally`; nothing else is written.
//
// NO MODEL CALL AND NO SPEND. agent-prompt.js assembles from the database and prints; agent-log.js
// writes an audit row. Neither calls a model.
//
// ONE VOCABULARY (STANDARDS.md Section 13): selfRun()/notRun() from _lib/self-run.js.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { parsePatternsApplied } from "../../scripts/agent-log.js";
import { PA_SPEC, KEY, SLUGS, withPatternsApplied, schemaGap } from "../../scripts/contract-patterns-applied.js";
import { repinPlan, knowledgeRow, CARD_REL, KNOWLEDGE_SLUG } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARD = path.join(ROOT, CARD_REL);
const RENDER = path.join(ROOT, "scripts/render-cycle-card.js");
const AGENT_LOG = path.join(ROOT, "scripts/agent-log.js");
const AGENT_PROMPT = path.join(ROOT, "scripts/agent-prompt.js");

// The three assembled prompts and the agent/capability pair each is assembled from.
const ASSEMBLIES = Object.freeze([
  ["designer", "design-kickoff"],
  ["builder", "build-ticket"],
  ["devmanager", "run-project"],
]);

// MEASURED at this ship, not quoted: `grep -c '"patterns_applied"'` counts LINES, and the key
// lands on three of them in every assembled prompt -- the rendered "Required: ..." summary line,
// its entry in the schema's `required` array, and its own `properties` key. The kickoff's §2
// predicted 1/1/1, which is the same fact miscounted: a contract carrying the key in `properties`
// ALONE (never required, so always omittable) would score 1. 0/0/0 on the unchanged tree is the
// number the before/after ladder actually rests on, and it was measured this cycle.
const PROMPT_KEY_LINES = 3;

// The decision handle's SHAPE, never one cycle's uuid -- a later re-pin files its own and must
// satisfy this too.
const DECISION_TICKET = "SES-424";
const DECISION_KIND = "agent-row";
const DECISION_SUMMARY_NEEDLE = "patterns_applied";
const MIN_IMAGES = 3;

// A minimal well-formed argv for scripts/agent-log.js -- ses-423's BASE_ARGV, so the citation case
// differs from that file's cases in exactly the one flag under test.
const BASE_ARGV = Object.freeze([
  "--agent=designer",
  "--capability=design-kickoff",
  "--model=claude-opus-5",
  "--ai-type=agent-turn",
  "--feature=design-kickoff:ds-kickoff-intent:depth0",
]);
const CITED = [1, 163];

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

const node = (args, opts = {}) =>
  spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...opts });

export default async function run_() {
  // ---- (A) the three pure contracts, offline --------------------------------------------------

  // The four §4 cases. "absent" and "" are the SAME answer on purpose: a turn that cited nothing is
  // a legitimate turn, and an error there would make the flag unusable for the common case.
  assert.deepEqual(parsePatternsApplied(undefined), [],
    "an absent --patterns-applied must parse to [] -- a turn that cited nothing is not an error");
  assert.deepEqual(parsePatternsApplied(""), [],
    '--patterns-applied="" must parse to [] as well: a driver that always passes the flag and ' +
    "sometimes has nothing to put in it must not be refused");
  assert.deepEqual(parsePatternsApplied("163,1,163"), [1, 163],
    "the list is a SET, sorted: the unique (activity_log_id, pattern_no) constraint would refuse " +
    "the repeat, and a run must not fail over its own duplicate citation");
  assert.ok(parsePatternsApplied("pattern:163").error,
    "a non-integer must be refused BEFORE the log row is written -- silently dropping it would " +
    "log a turn whose citations nobody notices are missing");
  assert.ok(parsePatternsApplied("0").error,
    "0 must be refused: public.decision_patterns is numbered from 1, so 0 is not a criterion. " +
    "Without this the FK would refuse it later, after the audit row was already written.");

  // withPatternsApplied(): it ADDS the key, and adding it twice is the same as adding it once --
  // which is what lets --check be written as a fixpoint test instead of a second copy of the spec.
  const bare = { type: "object", required: ["a"], properties: { a: { type: "string" } } };
  const once = withPatternsApplied(bare);
  assert.deepEqual(once.properties[KEY], PA_SPEC,
    `withPatternsApplied() must write exactly PA_SPEC into properties.${KEY}`);
  assert.deepEqual(once.required, ["a", KEY],
    `${KEY} must be REQUIRED -- an optional key is one the model may omit, which is the same ` +
    "outcome as having no key at all, and no assertion about properties alone would catch it");
  const twice = withPatternsApplied(once);
  assert.deepEqual(twice, once, "withPatternsApplied() must be idempotent -- --check depends on it");
  assert.equal(twice.required.filter(k => k === KEY).length, 1,
    `a second application must not push a duplicate ${KEY} into required`);
  assert.deepEqual(bare.required, ["a"],
    "withPatternsApplied() must not mutate its argument -- the caller still needs the prior schema " +
    "to write a before-image from");
  // NON-VACUITY: the transform must actually change something, or every assertion above is about
  // a function that returns its input.
  assert.ok(schemaGap(bare),
    "schemaGap() must REPORT a schema that lacks the key -- a checker that reports nothing would " +
    "pass this file against a build that never wrote the contract at all");
  assert.equal(schemaGap(once), null, "schemaGap() must accept the transformed schema");

  // repinPlan(): a plan on drift, null when current. Both directions, because a planner that
  // always returned a plan would re-pin a row that needed nothing, and one that always returned
  // null would make the repair a no-op that reports success.
  const cardNow = knowledgeRow(fs.readFileSync(CARD, "utf8"));
  const drifted = repinPlan({ id: "11111111-1111-1111-1111-111111111111", traits: { source_sha256: "deadbeefdeadbeef" } }, cardNow);
  assert.ok(drifted, "repinPlan() must return a plan for a row pinned to something else");
  assert.equal(drifted.from, "deadbeefdeadbeef");
  assert.equal(drifted.to, cardNow.traits.source_sha256);
  assert.equal(drifted.patch.method, cardNow.method,
    "the patch must carry the METHOD as well as the traits -- the pin is a sha OF the method, so " +
    "patching traits alone writes a row whose pin describes bytes it does not hold, and that row " +
    "reads as `current` forever after");
  assert.deepEqual(drifted.patch.traits, cardNow.traits);
  assert.equal(repinPlan({ id: "x", traits: { source_sha256: cardNow.traits.source_sha256 } }, cardNow), null,
    "repinPlan() must return null for a row that is already current -- there is nothing to write");

  if (!hasCreds()) {
    notRun("SES-424e (B) the --repin ladder against a drifted copy, and (C) the three live " +
      "contracts, their images, and the citation round trip",
      `no Supabase credentials -- ${CRED_HINT}`);
    return;
  }

  const url = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, {
      ...init,
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        "Content-Type": "application/json", ...(init.headers || {}),
      },
    });
    if (!r.ok) assert.fail(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  const pinNow = async () => {
    const rows = await rest(`skill_profiles?slug=eq.${KNOWLEDGE_SLUG}&select=traits`);
    return rows.length ? rows[0].traits.source_sha256 : null;
  };

  // ---- (B) the repin ladder, driven on a DRIFTED COPY -----------------------------------------
  const pinBefore = await pinNow();
  const tmp = path.join(os.tmpdir(), `ses424e-${process.pid}`);
  try {
    fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "docs/runbooks"), { recursive: true });
    fs.copyFileSync(RENDER, path.join(tmp, "scripts/render-cycle-card.js"));
    // ONE BYTE. The card's bytes are the pin's subject, so a single trailing space is a full drift
    // -- and it keeps the copy otherwise byte-identical, so nothing else can explain the exits.
    fs.writeFileSync(path.join(tmp, CARD_REL), fs.readFileSync(CARD, "utf8") + " ", "utf8");
    const copy = path.join(tmp, "scripts/render-cycle-card.js");

    const rung1 = node([copy, "--sync-knowledge"]);
    assert.equal(rung1.status, 1,
      `a DRIFTED row must still exit 1 from a bare --sync-knowledge (got ${rung1.status}). A ` +
      `repair path that made drift exit 0 would be self-healing, which is exactly what ` +
      `AGENT-ROW-AGREED-TICKET forbids.\n${rung1.stderr}`);
    assert.ok(/--repin/.test(rung1.stderr),
      "the drift message must NAME the --repin command -- before this ticket a drifted row had no " +
      "documented path forward at all, and the repair got hand-written with no image");

    const rung2 = node([copy, "--sync-knowledge", "--repin"]);
    assert.equal(rung2.status, 2, `--repin with no --cycle-id must exit 2, got ${rung2.status}\n${rung2.stderr}`);
    assert.ok(/--cycle-id/.test(rung2.stderr),
      "the refusal must name --cycle-id: an agent-row write owes a before-image and an image needs an owner");

    const rung3 = node([copy, "--sync-knowledge", "--repin", `--cycle-id=${randomUUID()}`]);
    assert.equal(rung3.status, 2, `--repin with no --ticket must exit 2, got ${rung3.status}\n${rung3.stderr}`);
    assert.ok(/--ticket/.test(rung3.stderr),
      "the refusal must name --ticket -- a re-pin is build work only under a ticket that NAMES the " +
      "write, so the command cannot be run without one");

    assert.equal(await pinNow(), pinBefore,
      "the live pin must be UNCHANGED after the three refusals. Without this, 'it exited 2' is " +
      "equally satisfied by a build that wrote the row and then exited 2 -- the whole point of " +
      "checking both flags before any write.");

    // CONTROL: the same script, run for real, must classify the COMMITTED card as current. Without
    // it, every exit above is equally explained by a script that is simply broken.
    const real = node([RENDER, "--sync-knowledge"]);
    assert.equal(real.status, 0, `the real --sync-knowledge must exit 0, got ${real.status}\n${real.stderr}`);
    assert.ok(/current/.test(real.stdout),
      `the committed ${CARD_REL} and the live ${KNOWLEDGE_SLUG} row must classify as "current" -- ` +
      `if they did not, arm B's drift would not be the copy's one edited byte`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ---- (C) the three live contracts, their images, the citations, the assemblies ---------------
  for (const slug of SLUGS) {
    const rows = await rest(`skill_profiles?slug=eq.${slug}&select=id,traits`);
    assert.equal(rows.length, 1, `expected exactly one ${slug} row, got ${rows.length}`);
    const schema = rows[0].traits && rows[0].traits.schema;
    assert.equal(schemaGap(schema), null,
      `${slug}.traits.schema must carry ${KEY} exactly as PA_SPEC describes it -- ${schemaGap(schema)}. ` +
      `It is written by \`node scripts/contract-patterns-applied.js --write --cycle=<uuid> ` +
      `--decision=<uuid>\`, which images the row first, never by hand.`);
    assert.deepEqual(schema.properties[KEY], PA_SPEC);
    assert.ok(schema.required.includes(KEY),
      `${slug} must REQUIRE ${KEY}: the executor's driver refuses a missing required key, which is ` +
      `the only thing that makes the citation mandatory rather than polite`);
  }

  const decisions = await rest(
    `runner_decisions?backlog_id=eq.${DECISION_TICKET}&kind=eq.${DECISION_KIND}` +
    `&select=id,summary,status,reversed_at&order=decided_at.desc`);
  const standing = decisions.filter(d =>
    String(d.summary || "").includes(DECISION_SUMMARY_NEEDLE) && !d.reversed_at && d.status !== "reversed");
  assert.ok(standing.length >= 1,
    `no unreversed ${DECISION_TICKET} ${DECISION_KIND} decision whose summary names ` +
    `"${DECISION_SUMMARY_NEEDLE}" -- the three contracts were edited with no standing handle to ` +
    `undo them, which is the state §19v's before-image regime exists to prevent`);

  const images = await rest(
    `runner_before_images?decision_id=eq.${standing[standing.length - 1].id}` +
    `&table_name=eq.skill_profiles&select=table_name,pk_value,row_data`);
  assert.ok(images.length >= MIN_IMAGES,
    `that decision holds ${images.length} skill_profiles images, expected at least ${MIN_IMAGES} ` +
    `(one per contract). An agent-row write with no image is a write that cannot be undone.`);
  assert.ok(images.every(i => i.row_data !== null),
    `every image here must carry row_data NOT NULL: these were UPDATEs, so the undo is a RESTORE. ` +
    `A NULL row_data is the SES-89 convention for an INSERT and would make the undo a DELETE of an ` +
    `Intent Skill the three agents cannot run without.`);

  // The citation round trip, end to end through the real script and the real table.
  const trace = randomUUID();
  let logId = null;
  try {
    const wrote = node([AGENT_LOG, ...BASE_ARGV, `--trace=${trace}`,
      `--patterns-applied=${CITED.join(",")}`, "--json"]);
    assert.equal(wrote.status, 0, `agent-log.js exited ${wrote.status}\n${wrote.stderr}`);
    const out = JSON.parse(wrote.stdout.trim());
    logId = out.id;
    assert.equal(out.citations, CITED.length,
      `--json must report the citations the DATABASE accepted (${CITED.length}), not the count asked for`);

    const cites = await rest(`decision_pattern_citations?activity_log_id=eq.${logId}&select=pattern_no,agent_id,capability_slug`);
    assert.deepEqual(cites.map(c => c.pattern_no).sort((a, b) => a - b), CITED,
      `public.decision_pattern_citations must hold one row per cited pattern for log row ${logId} ` +
      `-- a flag that parses and writes nothing would satisfy every assertion above this one`);
    assert.ok(cites.every(c => c.agent_id === "designer" && c.capability_slug === "design-kickoff"),
      "each citation must carry the agent and capability that cited it -- the weekly view groups by " +
      "agent, and a citation with no attribution cannot be read back as anyone's");

    const weekly = await rest(`decision_pattern_citations_weekly?agent_id=eq.designer&select=citations,distinct_patterns`);
    assert.ok(weekly.length >= 1 && weekly.some(w => Number(w.citations) >= CITED.length),
      `the weekly view must report designer's citations for this week (>= ${CITED.length})`);

    // THE CASCADE. Deleting the turn must take its citations with it, or the table can hold a
    // citation with no turn behind it -- invisible in every assertion above.
    await rest(`ai_activity_log?id=eq.${logId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const after = await rest(`decision_pattern_citations?activity_log_id=eq.${logId}&select=pattern_no`);
    assert.equal(after.length, 0,
      `deleting ai_activity_log ${logId} must cascade its citations away, got ${after.length}`);
    logId = null;
  } finally {
    if (logId !== null) {
      await rest(`ai_activity_log?id=eq.${logId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
        .catch(() => {});
    }
  }

  // The assembly itself. The row carries the key is one fact; that the PROMPT the agent is handed
  // carries it is the one that matters, and it is what was 0 on the unchanged tree.
  for (const [agent, capability] of ASSEMBLIES) {
    const r = node([AGENT_PROMPT, `--agent=${agent}`, `--capability=${capability}`]);
    assert.equal(r.status, 0, `agent-prompt.js --agent=${agent} exited ${r.status}\n${r.stderr}`);
    const lines = r.stdout.split("\n").filter(l => l.includes(`"${KEY}"`)).length;
    assert.equal(lines, PROMPT_KEY_LINES,
      `the assembled ${agent}/${capability} prompt must carry "${KEY}" on ${PROMPT_KEY_LINES} lines ` +
      `(the rendered Required: summary, the required array entry, and the properties key), got ` +
      `${lines}. It was 0 before this ticket -- measured, not recalled. A count of 1 means the key ` +
      `is in properties but NOT required, which is a contract the model may silently ignore.`);
  }
}

selfRun(import.meta.url, run_);
