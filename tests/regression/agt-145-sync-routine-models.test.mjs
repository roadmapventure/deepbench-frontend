// DeepBench v7.0.612 | tests/regression/agt-145-sync-routine-models.test.mjs | AGT-145 (P10 - Tooling)
//
// FEATURE: AGT-145 -- a routine's model pin follows public.model_assignments. scripts/sync-routine-models.js
// plans the change, builds the whole-`ccr` update body, grades the read-back and records the decision
// with a before-image; the `update` itself is an attended act, because a cloud run's `update_trigger`
// refuses a routine created via http_api (kickoff §2, measured 2026-09-25 19:06Z).
//
// FIVE PARTS, the kickoff's QA (docs/kickoffs/v7.0.593-AGT-145-sync-routine-models.md §6):
//   (a) OFFLINE -- `--plan` against an assignment naming a DIFFERENT model exits 3 and writes a body
//       whose only key is `job_config`; that body's `ccr`, with `session_context.model` put back,
//       deep-equals the fixture's `ccr` -- so the body moved exactly one leaf and nothing else.
//       Against an assignment naming the SAME model: exit 0 and no file at all.
//   (b) OFFLINE -- a `get` missing `session_context.allowed_tools` is REFUSED (exit 2, "partial ccr")
//       and no body is written. This is the 2026-09-11 silent reset, caught before it is built.
//   (c) OFFLINE -- `--verify` is green on a clean read-back, and red naming the field on each of the
//       three an `update` can destroy without being asked: `allowed_tools`, `enabled`, `cron_expression`.
//   (d) OFFLINE + LIVE -- pendingRows() files one row when the assignment moved after the last sync
//       and NONE when an open pending already names the routine. Live: every ROUTINES job has an
//       assignment row, and `--pending` writes nothing today (every `since` is null).
//   (e) docs/runbooks/routine-prompt.md carries the script, its PROMPT BLOCK is byte-identical
//       (sha256 pinned below), and ses-355 / agt-102 / agt-142 still run green.
//
// THE CONTROL: on origin/dev before this ship there is no scripts/sync-routine-models.js, so (a)-(d)
// fail at spawn (`Cannot find module`) and (e) finds no `sync-routine-models.js` in the runbook.
//
// EVERY ARM IS DRIVEN, NEVER DESCRIBED. Each red arm of (c) is produced by MUTATING one field of an
// otherwise-green read-back, so an assertion that only checked "exit 1" could not tell the three
// apart -- the LOO-013 lesson: assert WHICH branch fired. (a)'s same-model arm and (d)'s open-pending
// arm are the negative controls for their positive halves.
//
// NO MODEL CALL, NO SPEND, AND NO WRITE. Fixtures live in os.tmpdir(). The one live spawn is
// `--pending`, which is a write path that writes nothing while every assignment's `since` is null --
// and the count of routine-pin-pending decisions is re-read afterwards to prove it, rather than
// trusting the script's own "0 routines" line.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ROUTINES, pendingRows, SYNC_KIND, PENDING_KIND } from "../../scripts/sync-routine-models.js";
import { extractBlock, canon, ROUTINES as PROMPT_ROUTINES } from "../../scripts/check-routine-prompt.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SCRIPT = path.join(ROOT, "scripts", "sync-routine-models.js");
const RUNBOOK_REL = "docs/runbooks/routine-prompt.md";

// Measured on this tree 2026-09-26, and the point of pinning it is that AGT-145 adds a PARAGRAPH to
// this runbook: the prompt the live routine runs must not move by one byte because of it.
const PROMPT_BLOCK_SHA256 = "f3caf7c79f55c67677d0ab321e626b2119a7c46fa941ea55199778b021e4884c";

const PINNED = "claude-opus-5";
const INTENDED = "claude-opus-5-5";
const CRON = "40 */3 * * *";
// The ten tools measured live on the runner routine (routine-prompt.md's 2026-09-11 restore note).
const TOOLS = ["Bash", "Read", "Edit", "Write", "Glob", "Grep", "Agent", "WebFetch", "WebSearch", "Artifact"];

const ORCHESTRATOR = model => [{ job_kind: "lane", job_key: "orchestrator", model_id: model, since: null, decision_id: null }];

// The CONTEXT shape, kickoff §2: what a session's `get` actually returns.
const getFixture = (r, over = {}) => ({
  id: r.id,
  name: r.name,
  enabled: true,
  cron_expression: CRON,
  job_config: {
    ccr: {
      environment_id: "env_01GuEzm2nCHbCB5SumvQVEQ1",
      events: ["scheduled"],
      session_context: {
        allowed_tools: [...TOOLS],
        model: PINNED,
        outcomes: [],
        sources: [],
        autofix_on_pr_create: false,
      },
    },
  },
  derived_state: { model: PINNED },
  session_request: { config: { allowed_tools: [...TOOLS] } },
  ...over,
});

const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));
const at = (dir, r, suffix = "") => path.join(dir, `${r.id}${suffix}.json`);

// A fresh sitting directory holding a `get` for every routine. `shape` may drop or bend a field.
function sitting(shape = g => g) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt-145-"));
  for (const r of ROUTINES) write(at(dir, r), shape(getFixture(r), r));
  return dir;
}

function writeAssignments(dir, model) {
  const f = path.join(dir, `assignments-${model}.json`);
  write(f, ORCHESTRATOR(model));
  return f;
}

const run = (...args) => {
  const p = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
  return { status: p.status, out: `${p.stdout ?? ""}${p.stderr ?? ""}` };
};

const bodies = dir => ROUTINES.filter(r => fs.existsSync(at(dir, r, ".update")));

// ---- (a) the plan and the body ----------------------------------------------------------------

function partA() {
  const dir = sitting();
  const change = run("--plan", `--live=${dir}`, `--assignments=${writeAssignments(dir, INTENDED)}`);
  assert.strictEqual(change.status, 3, `--plan with a moved assignment must exit 3, got ${change.status}: ${change.out}`);
  assert.strictEqual(bodies(dir).length, ROUTINES.length, `--plan wrote ${bodies(dir).length} bodies, expected ${ROUTINES.length}`);

  for (const r of ROUTINES) {
    assert.match(change.out, new RegExp(`${r.name} ${r.id}: pinned ${PINNED} intended ${INTENDED} change`),
      `--plan did not report ${r.name} as a change`);
    const body = read(at(dir, r, ".update"));
    assert.deepStrictEqual(Object.keys(body), ["job_config"], `${r.name}: the body's keys must be exactly ["job_config"]`);
    assert.deepStrictEqual(Object.keys(body.job_config), ["ccr"], `${r.name}: job_config must carry only ccr`);
    const ccr = body.job_config.ccr;
    assert.strictEqual(ccr.session_context.model, INTENDED, `${r.name}: the body must carry the intended pin`);
    // enabled / cron_expression / name / mcp_connections are NEVER sent -- and they are never sent
    // because they are never in the body, which is a stronger claim than "the script does not set them".
    for (const forbidden of ["enabled", "cron_expression", "name", "mcp_connections"]) {
      assert.ok(!(forbidden in ccr), `${r.name}: the body carries ${forbidden} -- it must not`);
      assert.ok(!JSON.stringify(body).includes(`"${forbidden}"`), `${r.name}: ${forbidden} appears anywhere in the body`);
    }
    // THE WHOLE-ccr PROOF: put the one moved leaf back, and the body must be the `get`'s ccr exactly.
    const restored = { ...ccr, session_context: { ...ccr.session_context, model: PINNED } };
    assert.deepStrictEqual(restored, getFixture(r).job_config.ccr,
      `${r.name}: the body is not the fixture's ccr with only session_context.model changed`);
  }

  // Negative control: the same model is not a change, and a non-change writes nothing at all.
  const same = sitting();
  const none = run("--plan", `--live=${same}`, `--assignments=${writeAssignments(same, PINNED)}`);
  assert.strictEqual(none.status, 0, `--plan with an equal assignment must exit 0, got ${none.status}: ${none.out}`);
  assert.strictEqual(bodies(same).length, 0, "--plan wrote an update body for a routine already pinned as intended");
  assert.match(none.out, new RegExp(`pinned ${PINNED} intended ${PINNED} same`), "--plan did not report `same`");
  return ["a-plan-3-whole-ccr-one-leaf", "a-plan-0-same-no-file"];
}

// ---- (b) the partial-ccr refusal ---------------------------------------------------------------

function partB() {
  const dir = sitting(g => {
    delete g.job_config.ccr.session_context.allowed_tools;
    return g;
  });
  const r = run("--plan", `--live=${dir}`, `--assignments=${writeAssignments(dir, INTENDED)}`);
  assert.strictEqual(r.status, 2, `a get without allowed_tools must exit 2, got ${r.status}: ${r.out}`);
  assert.ok(r.out.includes("partial ccr"), `the refusal must say "partial ccr". Got: ${r.out.slice(0, 300)}`);
  assert.strictEqual(bodies(dir).length, 0, "a refused plan wrote an update body -- it must write nothing");
  return ["b-partial-ccr-refused-no-body"];
}

// ---- (c) the read-back ---------------------------------------------------------------------------

function afterFiles(dir, mutate = g => g) {
  for (const r of ROUTINES) {
    const after = getFixture(r);
    after.derived_state.model = INTENDED;
    after.job_config.ccr.session_context.model = INTENDED;
    write(at(dir, r, ".after"), r.id === ROUTINES[0].id ? mutate(after) : after);
  }
}

function partC() {
  const dir = sitting();
  assert.strictEqual(run("--plan", `--live=${dir}`, `--assignments=${writeAssignments(dir, INTENDED)}`).status, 3);

  afterFiles(dir);
  const green = run("--verify", `--live=${dir}`);
  assert.strictEqual(green.status, 0, `a clean read-back must verify green, got ${green.status}: ${green.out}`);
  assert.ok(green.out.includes(`verify: ${ROUTINES.length} of ${ROUTINES.length} routines green`), green.out.slice(0, 300));

  // Three mutants, one field each, all on the FIRST routine so nothing green precedes the failure.
  const first = ROUTINES[0];
  const mutants = [
    ["session_request.config.allowed_tools", g => { g.session_request.config.allowed_tools = TOOLS.slice(0, -1); return g; }],
    ["enabled", g => { g.enabled = false; return g; }],
    ["cron_expression", g => { g.cron_expression = "0 * * * *"; return g; }],
  ];
  for (const [field, mutate] of mutants) {
    afterFiles(dir, mutate);
    const red = run("--verify", `--live=${dir}`);
    assert.strictEqual(red.status, 1, `a ${field} mutant must exit 1, got ${red.status}: ${red.out}`);
    assert.match(red.out, new RegExp(`^${first.name}: ${field.replace(/\./g, "\\.")} expected .* got .*$`, "m"),
      `the failure must name ${field} with both values. Got: ${red.out.slice(0, 300)}`);
  }
  // Restore the clean state and re-verify, so the three reds are attributable to the mutation alone.
  afterFiles(dir);
  assert.strictEqual(run("--verify", `--live=${dir}`).status, 0, "the read-back did not return to green after the mutants");
  return ["c-verify-green", "c-verify-red-allowed_tools-enabled-cron"];
}

// ---- (d) the pending record ---------------------------------------------------------------------

function partD() {
  const target = ROUTINES[0];
  const moved = "2026-09-26T12:00:00Z";
  const assignments = [{ job_kind: "lane", job_key: "orchestrator", model_id: INTENDED, since: moved, decision_id: null }];
  // Every OTHER routine is already synced after the move; only the target's sync predates it.
  const decisions = ROUTINES.map(r => ({
    id: `dec-${r.id}`, kind: SYNC_KIND, status: "final",
    summary: `${r.name} ${r.id}: pin ${PINNED} -> ${INTENDED}`,
    decided_at: r.id === target.id ? "2026-09-25T00:00:00Z" : "2026-09-26T18:00:00Z",
  }));

  const one = pendingRows(assignments, decisions);
  assert.strictEqual(one.length, 1, `expected exactly the one routine whose sync predates the move, got ${one.length}`);
  assert.strictEqual(one[0].id, target.id, `the pending row names ${one[0].id}, expected ${target.id}`);
  assert.strictEqual(one[0].summary, `${target.name} ${target.id}: pin sync to ${INTENDED} awaits an attended session`);

  // Negative control: an OPEN pending already naming it suppresses a second one.
  const suppressed = pendingRows(assignments, [
    ...decisions,
    { id: "open-1", kind: PENDING_KIND, status: "open", summary: one[0].summary, decided_at: "2026-09-26T13:00:00Z" },
  ]);
  assert.strictEqual(suppressed.length, 0, `an open ${PENDING_KIND} must suppress a second row, got ${suppressed.length}`);
  // ...and a CLOSED one does not, which is what makes the status check load-bearing rather than decorative.
  const reopened = pendingRows(assignments, [
    ...decisions,
    { id: "final-1", kind: PENDING_KIND, status: "final", summary: one[0].summary, decided_at: "2026-09-26T13:00:00Z" },
  ]);
  assert.strictEqual(reopened.length, 1, "a finalized pending must not suppress a new one");

  // A null `since` is "never switched" -- nothing is owed, which is today's live state.
  assert.deepStrictEqual(pendingRows(ORCHESTRATOR(INTENDED), []), [], "a null `since` must owe nothing");
  return ["d-pending-one-row", "d-open-pending-suppresses", "d-null-since-owes-nothing"];
}

async function partDLive() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-145 (d) live: assignment coverage and the --pending no-op",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- export them from public.runner_secrets by name");
    return [];
  }
  const base = url.replace(/\/+$/, "");
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) assert.fail(`GET ${q} -> HTTP ${res.status} ${await res.text()}`);
    return res.json();
  };

  const assigns = await get("model_assignments?select=job_kind,job_key,model_id,since");
  for (const r of ROUTINES) {
    const a = assigns.find(x => x.job_kind === r.job_kind && x.job_key === r.job_key);
    assert.ok(a?.model_id, `${r.name} runs ${r.job_kind}/${r.job_key}, which has no model_assignments row`);
  }

  const countPending = async () => (await get(`runner_decisions?select=id&kind=eq.${PENDING_KIND}`)).length;
  const before = await countPending();
  const p = run("--pending", "--session-name=agt-145-qa");
  assert.strictEqual(p.status, 0, `--pending must exit 0, got ${p.status}: ${p.out}`);
  const owed = pendingRows(assigns, await get(
    `runner_decisions?select=id,kind,status,summary,decided_at&kind=in.(${SYNC_KIND},${PENDING_KIND})&limit=1000`));
  assert.strictEqual(owed.length, 0, `today nothing is owed (every since is null), but pendingRows returned ${owed.length}`);
  assert.ok(p.out.includes("pending: 0 routines"), `--pending should have reported 0. Got: ${p.out.slice(0, 300)}`);
  // The count, not the script's own sentence: a run that wrote AND said 0 would pass a message-only check.
  assert.strictEqual(await countPending(), before, `--pending wrote a ${PENDING_KIND} row -- nothing is owed today`);
  return ["d-live-every-job-has-an-assignment", "d-live-pending-wrote-nothing"];
}

// ---- (e) the runbook and its neighbours -----------------------------------------------------------

async function partE() {
  const md = fs.readFileSync(path.join(ROOT, RUNBOOK_REL), "utf8");
  assert.ok(md.includes("sync-routine-models.js"), `${RUNBOOK_REL} does not name the script`);
  assert.ok(md.includes("The pin follows the table"), `${RUNBOOK_REL} is missing AGT-145's paragraph`);
  const block = canon(extractBlock(md, PROMPT_ROUTINES.runner).text);
  const sha = crypto.createHash("sha256").update(block).digest("hex");
  assert.strictEqual(sha, PROMPT_BLOCK_SHA256,
    `the prompt block moved: sha256 ${sha}, expected ${PROMPT_BLOCK_SHA256}. The live routine runs these bytes.`);

  for (const neighbour of ["ses-355-routine-prompt.test.mjs", "agt-102-routine-prompt-drift.test.mjs", "agt-142-model-catalog.test.mjs"]) {
    await (await import(`./${neighbour}`)).default();
  }
  return ["e-runbook-names-the-script", "e-prompt-block-byte-identical", "e-ses-355-agt-102-agt-142-green"];
}

async function runTest() {
  const results = [
    ...partA(), ...partB(), ...partC(), ...partD(),
    ...(await partDLive()), ...(await partE()),
  ];
  console.log(`AGT-145: ${results.length} checks passed -- ${results.join(", ")}`);
  return results;
}

selfRun(import.meta.url, runTest);
export default runTest;
