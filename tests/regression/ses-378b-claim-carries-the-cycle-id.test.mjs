// DeepBench v7.0.503 | tests/regression/ses-378b-claim-carries-the-cycle-id.test.mjs | SES-378 slice 2
//
// FEATURE: SES-378 slice 2 -- the manager's claim IS the cycle's claim, and the handoff names the
// model the call will actually run on. Two defects in one file, one handoff apart.
//
// (1) THE CLAIMER WAS NOT PER-CYCLE. `scripts/run-project.js` claimed with
//     `` `run-project:${args.project}:${args.step}` ``. Live on 2026-09-16 that exact string --
//     `run-project:moat-support:1` -- sat on `SES-378` AND on `SES-399`, written by two different
//     cycles that the label cannot tell apart. Three consumers read `claimed_by` as a cycle id:
//     register B42 (`docs/runbooks/runner-cycle.md` L354) re-asserts `claimed_by = '<your cycle
//     id>'` before every irreversible act and reads 0 rows as "do not push"; `scripts/ticket-owner.js`
//     check 6 clears a 24h-old claim whose holder is not a live cycle; and `SES-401`'s measurement
//     at `tests/regression/_lib/board-state.js:40-43` found 3 claimed tickets, 2 live cycles, ZERO
//     matches. So the label did not merely look wrong -- it gated the holding cycle out of its own
//     push.
//
// (2) THE HANDOFF PRINTED THE STORED MODEL, NOT THE RUNNING ONE. `assembleFor` printed
//     `assembly.llm.model` -- the Skill rows' stored answer, `claude-fable-5-1` for all six
//     governance agents -- while `resolveJudgmentModel` asked `public.judgment_model()` the same
//     minute and answered `claude-opus-5` (`fable_rest`). Step 5(e) copies the driver's number into
//     `agent-log --model=`, so the activity log recorded the wrong model for the call.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE SHIPPED `claimerFor`, DRIVEN BOTH WAYS. A cycle id must come back VERBATIM -- not
//     decorated, not prefixed -- because B42 compares it with `=`, and any decoration makes the
//     re-assertion return 0 rows just as the old label did. And no cycle id must return `error` with
//     NO `claimer` key at all: the tempting shape is "no --cycle-id, fall back to the old label",
//     which restores defect (1) on the path nobody watches. Asserted as an absent key, not a falsy
//     one, so a `{ claimer: "" }` fallback cannot satisfy it.
//
// (b) A SOURCE PIN ON THE DRIVER. (a) proves the helper is right; it says nothing about whether the
//     write path uses it. The claim template must be GONE from `scripts/run-project.js`, and
//     `resolveJudgmentModel` must be imported from `./agent-prompt.js` -- imported, never
//     re-implemented (SES-45): a second copy of the degrade rule is the drift the Governance Agents
//     project exists to end, and it would drift toward disagreeing about which model a logged call
//     used.
//
// (c) THE LANE SEAM, INJECTED. No credentials, no network, so this arm ALWAYS runs. Both directions:
//     a judgment lane past its share degrades and carries `from` (the driver's own `lane.from` test
//     is what prints the `# lane:` line), and a lane inside its share must leave `from` ABSENT --
//     otherwise the driver would print a degrade note for a lane that never moved.
//
// (d) LIVE: `SES-378`'s own `claimed_by` is a cycle id or NULL, never a `run-project:` label. This
//     is the row that broke B42 this cycle. Declared NOT RUN without credentials rather than passing.
//
// (e) THE SES-158 NEGATIVE CONTROL. A source copy with the old template restored must make (b)
//     THROW. A control that changes nothing pins nothing.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { claimerFor } from "../../scripts/run-project.js";
import { resolveJudgmentModel } from "../../scripts/agent-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRIVER_REL = "scripts/run-project.js";
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// The old claim template, assembled rather than written, so this file can carry the needle without
// a template literal of its own interpolating it away.
const OLD_TEMPLATE = "run-project:$" + "{";

// == (a) the shipped claimer ====================================================================
function theClaimerIsTheCycleId() {
  const CYCLE = "aa7173c6-2d6e-4292-804c-509d3cb7eeaa";
  const held = claimerFor({ cycleId: CYCLE });
  assert.strictEqual(
    held.claimer,
    CYCLE,
    "claimerFor must return the --cycle-id VERBATIM: register B42 re-asserts `claimed_by = '<your " +
      "cycle id>'` with `=`, so any prefix, suffix or casing change makes the re-assertion return 0 " +
      `rows exactly as the old label did. got: ${JSON.stringify(held)}`,
  );
  assert.ok(!held.error, `a claim with a cycle id must not error. got: ${JSON.stringify(held)}`);

  for (const [label, arg] of [["missing", {}], ["empty", { cycleId: "" }], ["blank", { cycleId: "   " }], ["null", { cycleId: null }]]) {
    const refused = claimerFor(arg);
    assert.ok(
      refused.error && /cycle-id/.test(refused.error),
      `claimerFor with a ${label} cycle id must return an error naming --cycle-id. got: ${JSON.stringify(refused)}`,
    );
    // The KEY must be absent, not falsy. A `{ claimer: "" }` refusal would still be spread into a
    // PATCH body by a caller that only checks truthiness of the error.
    assert.ok(
      !("claimer" in refused),
      `claimerFor with a ${label} cycle id returned a \`claimer\` key (${JSON.stringify(refused)}). ` +
        "A claim nobody can re-assert is worse than none -- there must be no claimer to fall back to.",
    );
    assert.ok(
      !/^run-project:/.test(String(refused.claimer ?? "")),
      "the no-cycle-id path must not fall back to the `run-project:<project>:<step>` label -- that " +
        "label is defect (1) itself, and falling back restores it on the one path nobody watches",
    );
  }
  return held.claimer;
}

// == (b) the driver actually uses it, and imports the shipped lane read ==========================
// Takes the source so (e) can drive it against a mutated copy.
function theDriverCarriesTheCycleIdAndTheLane(src) {
  assert.ok(
    !src.includes(OLD_TEMPLATE),
    `${DRIVER_REL} still builds a claimer from the \`${OLD_TEMPLATE}...\` template. Two cycles running ` +
      "the same project's step 1 then write the identical `claimed_by`, which is how " +
      "`run-project:moat-support:1` came to sit on SES-378 and SES-399 at once.",
  );
  assert.ok(
    /claimerFor\(\{\s*cycleId:/.test(src),
    `${DRIVER_REL} does not call claimerFor({ cycleId: ... }) -- (a) would then pin a helper the ` +
      "write path never reaches",
  );
  assert.ok(
    // Either import form -- the static one, or the dynamic destructure this file already uses for
    // renderAssembly. What is pinned is the SOURCE of the function, not the syntax that reaches it.
    /\{[^}]*\bresolveJudgmentModel\b[^}]*\}\s*=\s*await\s+import\(\s*["']\.\/agent-prompt\.js["']\s*\)/.test(src)
      || /import\s*\{[^}]*\bresolveJudgmentModel\b[^}]*\}\s*from\s*["']\.\/agent-prompt\.js["']/.test(src),
    `${DRIVER_REL} does not import resolveJudgmentModel from "./agent-prompt.js". The degrade rule has ` +
      "one home (SES-45); a second copy here would drift, and it would drift toward disagreeing " +
      "about which model the activity log says a call ran on.",
  );
  return true;
}

// == (c) the lane seam, injected ================================================================
async function theLaneSeamMovesAndStaysPut() {
  const LANE_X = "claude-fable-5-1";
  const DEGRADED_Y = "claude-opus-5";
  const stub = rpcRows => {
    const seen = [];
    const fetchImpl = async url => {
      seen.push(String(url));
      const isRpc = String(url).includes("/rpc/judgment_model");
      return {
        ok: true,
        status: 200,
        json: async () => (isRpc ? rpcRows : [{ lane: "judgment", model_id: LANE_X }]),
      };
    };
    return { fetchImpl, seen };
  };
  const OPTS = { supabaseUrl: "https://seam.example/", headers: { apikey: "seam" } };

  const moved = stub([{ model_id: DEGRADED_Y, reason: "fable_rest" }]);
  const degraded = await resolveJudgmentModel({ llm: { model: LANE_X } }, { ...OPTS, fetchImpl: moved.fetchImpl });
  assert.strictEqual(degraded.model, DEGRADED_Y,
    `judgment_model() answering "${DEGRADED_Y}" must be what the handoff names -- the stored "${LANE_X}" ` +
      "is what the driver printed while the call ran on the other one");
  assert.strictEqual(degraded.from, LANE_X,
    "a degrade must carry the model it came FROM: the driver prints its `# lane:` note on `lane.from`, " +
      "and a bare model id cannot be audited");
  assert.ok(moved.seen.some(u => u.includes("/rpc/judgment_model")),
    "the degrade path must actually ask public.judgment_model() -- a hard-coded answer is not a reading");

  const held = stub([{ model_id: LANE_X, reason: "lane" }]);
  const same = await resolveJudgmentModel({ llm: { model: LANE_X } }, { ...OPTS, fetchImpl: held.fetchImpl });
  assert.strictEqual(same.model, LANE_X, "judgment_model() agreeing with the lane is the ordinary case");
  assert.ok(!("from" in same),
    `a lane that did not move must leave \`from\` ABSENT, or the driver prints a degrade note for a ` +
      `lane still on its own model. got: ${JSON.stringify(same)}`);
  return { degraded: degraded.model, from: degraded.from };
}

// == (e) the control ============================================================================
function controlGoesRed(src) {
  const mutated = src.replace(
    /const named = claimerFor\(\{ cycleId: args\.cycleId \}\);/,
    "const named = { claimer: `" + OLD_TEMPLATE + "args.project}:${args.step}` };",
  );
  assert.notStrictEqual(mutated, src, "control for (b) changed nothing (the SES-158 failure)");
  assert.throws(
    () => theDriverCarriesTheCycleIdAndTheLane(mutated),
    new RegExp(OLD_TEMPLATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "control: a source copy with the old claim template restored still passed (b) -- the pin is vacuous",
  );
}

export default async function run() {
  const src = readLf(DRIVER_REL);

  const claimer = theClaimerIsTheCycleId();             // (a)
  theDriverCarriesTheCycleIdAndTheLane(src);            // (b)
  const lane = await theLaneSeamMovesAndStaysPut();     // (c)
  controlGoesRed(src);                                  // (e)

  // == (d) Live arm: SES-378's own claim is a cycle id, never a label ============================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-378b (d) backlog_items.SES-378.claimed_by is a cycle id or NULL, never a `run-project:` label",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
        "(docs/runbooks/session-setup.md step 1b) and re-run: " +
        "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js",
    );
    console.log(`  [SES-378b] claimerFor returns the cycle id verbatim (${claimer.slice(0, 8)}...) and refuses with no claimer; ${DRIVER_REL} carries no \`${OLD_TEMPLATE}\` template and imports resolveJudgmentModel; the lane degrades ${lane.from} -> ${lane.degraded} and leaves \`from\` absent when it holds; the control goes red; (d) declared NOT RUN`);
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const r = await fetch(`${url}/rest/v1/backlog_items?backlog_id=eq.SES-378&select=backlog_id,claimed_by,claimed_at`, { headers: H });
  if (!r.ok) throw new Error(`backlog_items -> ${r.status} ${await r.text()}`);
  const rows = await r.json();
  assert.strictEqual(rows.length, 1, `expected exactly one SES-378 board row, got ${rows.length}`);
  const claimedBy = rows[0].claimed_by;

  assert.ok(
    claimedBy === null || !/^run-project:/.test(String(claimedBy)),
    `SES-378.claimed_by is "${claimedBy}" -- a \`run-project:\` label, not a cycle id. Register B42 ` +
      "re-asserts `claimed_by = '<your cycle id>'` before every irreversible act and reads 0 rows as " +
      "\"do not push, do not claim a counter\", so the cycle holding this ticket is gated out of its " +
      "own push by its own claim.",
  );
  if (claimedBy !== null) {
    assert.match(
      String(claimedBy),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      `SES-378.claimed_by is "${claimedBy}", neither NULL nor a runner_cycles UUID. ticket-owner.js ` +
        "check 6 and board-state.js:40-43 both match this column against live cycle ids; a value in " +
        "any other shape matches none of them.",
    );
  }

  console.log(`  [SES-378b] claimerFor returns the cycle id verbatim and refuses with no claimer; ${DRIVER_REL} carries no \`${OLD_TEMPLATE}\` template and imports resolveJudgmentModel from ./agent-prompt.js; the lane seam degrades ${lane.from} -> ${lane.degraded} and leaves \`from\` absent when it holds; the control goes red; (d) live: SES-378.claimed_by = ${claimedBy === null ? "NULL" : String(claimedBy)}`);
}

selfRun(import.meta.url, run);
