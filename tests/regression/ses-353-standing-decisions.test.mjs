// DeepBench v7.0.453 | tests/regression/ses-353-standing-decisions.test.mjs | SES-353 -- standing
// decisions leave the pick lane.
//
// WHAT SHIPPED, AND WHAT THIS FILE GRADES. Migration `ses353_standing_decisions_leave_pick_lane`
// added 'standing' to `runner_directives_status_check` and moved sixteen of John's rulings from
// `status='queued'` to `status='standing'` (the seventeenth, `dc6cd3a5`, was a resolved `PARKED:`
// alarm and was closed through `close_directive()`). `prime_directive_queue()` and
// `runner_should_boot()` were NOT changed: the lane's existing `status = 'queued'` predicate is
// the whole gate, which is the design's central claim and the thing arm (ii) grades.
//
// THE PRE-CHANGE RED, MEASURED NOT ASSUMED (STANDARDS.md Section 4). On the unedited tree every
// DOC clause below fails (the runbook paragraph, the template line and the builder branch did not
// exist) and LIVE (i) fails because on `origin/dev` the CHECK constraint forbids the value
// 'standing' outright, so the count could only ever be 0. LIVE (iii) failed too: the queue's first
// row was the directive `58db64ae` while the gate's pick was a ticket -- the disagreement this
// ship exists to end.
//
// THE NEGATIVE CONTROL IS A MUTATION, NOT A SECOND ASSERTION (the SES-158 rule). Part (a) re-runs
// its own clause function over a copy of the runbook block with `'standing'` rewritten to
// `'queued'`; a clause set that still passes that mutant is a clause set that is not reading the
// word it claims to read.
//
// WHICH BRANCH FIRED IS ANNOUNCED (the LOO-013 lesson). Parts (a) and (b) are source-only and
// always run. Part (c) needs Supabase and declares itself NOT RUN via notRun() otherwise. Inside
// (c), clause (iii) has two legitimate worlds -- an empty mission lane (the assertion runs) and a
// mission John has queued (the assertion is declared not-run with the mission's ref printed, never
// failed), because a queued mission outranking the board is the design working, not a regression.
// The live arm READS ONLY; it writes nothing and therefore needs no before-image.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");
const TEMPLATE = path.join(ROOT, "docs/runbooks/briefing-template.html");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");

const MIGRATION = "ses353_standing_decisions_leave_pick_lane";
const BLOCK_START = "**5. Pick ONE item.**";
const BLOCK_END = "(2) **John's automation queue";

const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

const norm = s => s.replace(/\r\n/g, "\n");

function between(text, startAnchor, endAnchor) {
  const i = text.indexOf(startAnchor);
  assert.notStrictEqual(i, -1, `the runbook no longer contains: ${startAnchor}`);
  const j = text.indexOf(endAnchor, i);
  assert.notStrictEqual(j, -1, `no end anchor after it: ${endAnchor}`);
  return text.slice(i, j).trim();
}

// The clause set, as a predicate over the step 5 block, so the negative control can run the SAME
// checks over a mutated copy. Returns the list of clause names that FAILED.
function failingClauses(block) {
  const clauses = [
    ["status = 'standing' is named in layer 1a", t => t.includes("`status = 'standing'`")],
    ["the block says a standing row is never picked", t => /no cycle picks/.test(t) && /never/.test(t)],
    ["the migration that created the state is named", t => t.includes(MIGRATION)],
  ];
  return clauses.filter(([, fn]) => !fn(block)).map(([name]) => name);
}

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function run() {
  const runbook = norm(fs.readFileSync(RUNBOOK, "utf8"));
  const template = norm(fs.readFileSync(TEMPLATE, "utf8"));
  const builder = norm(fs.readFileSync(BUILDER, "utf8"));

  // ---- (a) the runbook's step 5 block says standing is not this layer -------------------------
  const block = between(runbook, BLOCK_START, BLOCK_END);
  const failed = failingClauses(block);
  assert.deepStrictEqual(
    failed, [],
    `step 5's layer (1a) block does not carry SES-353's rule. Missing: ${failed.join("; ")}. ` +
      "A cycle reading this layer must be told that a 'standing' row binds it and is never its pick.",
  );
  // The SES-333 rule is AMENDED, not withdrawn: the pick is still the queue's first row.
  assert.ok(/the pick is its first row/i.test(runbook),
    "the runbook no longer says the pick IS the queue's first row -- SES-353 narrows WHICH rows the " +
    "directive lane admits, it does not retire SES-333's selection rule (ses-333 pins that sentence too)");
  // NEGATIVE CONTROL (SES-158): a mutant that says 'queued' where the ship says 'standing' must fail.
  const mutant = block.split("'standing'").join("'queued'");
  const mutantFailed = failingClauses(mutant);
  assert.ok(
    mutantFailed.length > 0,
    "the clause set passed a block with 'standing' rewritten to 'queued' -- it is matching on text " +
      "that did not change, so it would pass on the unedited runbook and prove nothing",
  );
  console.log(`  (a) step 5 layer (1a) carries the standing rule (3/3 clauses); the 'queued' mutant ` +
    `fails ${mutantFailed.length} of them -- PASS`);

  // ---- (b) the briefing vocabulary knows the state exists --------------------------------------
  const stateOf = between(template, "function stateOf(", "\n  }\n");
  assert.ok(stateOf.includes("status === 'standing'"),
    "briefing-template.html's stateOf() has no 'standing' branch, so a standing directive would fall " +
    "through to \"waiting -- the next cycle picks it up first\": the exact opposite of the truth " +
    "(briefing-page.md's drain-epic bullet states the rule)");
  assert.ok(/standing decision/.test(stateOf),
    "stateOf()'s standing branch must render the state in words, not a bare status string");
  assert.ok(builder.includes("newest.status === 'standing'"),
    "scripts/build-briefing.mjs's lastDirectiveTail has no 'standing' branch -- §7's tail would call " +
    "John's own standing ruling 'closed with no outcome recorded'");
  console.log("  (b) stateOf() and build-briefing.mjs both carry the standing branch -- PASS");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("(c) the live board: standing rows exist and the directive lane admits none of them", CRED_HINT);
    return;
  }

  // ---- (c) LIVE: the split is real on the board ------------------------------------------------
  const standing = await pg(url, key,
    "runner_directives?select=id,status&status=eq.standing&limit=200");
  const queuedMissions = await pg(url, key,
    "runner_directives?select=id,body&type=eq.directive&status=eq.queued&limit=200");
  // (i) non-vacuity, and the assertion that was RED before the migration: on origin/dev the CHECK
  // constraint rejects the value, so this count could not be anything but zero.
  assert.ok(
    standing.length >= 1,
    "no runner_directives row carries status='standing'. Either the migration " +
      `${MIGRATION} did not land, or the sixteen rulings were moved back -- and every clause below ` +
      "would then be grading an empty set",
  );

  const queue = await pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });
  const ranked = queue.filter(r => r.pos !== null && r.pos !== undefined);
  const standingRefs = new Set(standing.map(d => String(d.id).slice(0, 8)));
  const missionRefs = new Set(queuedMissions.map(d => String(d.id).slice(0, 8)));

  // (ii) the whole design claim: the lane's status='queued' predicate IS the gate.
  for (const row of ranked.filter(r => r.lane === "directive")) {
    assert.ok(
      missionRefs.has(String(row.ref)),
      `prime_directive_queue() ranked directive '${row.ref}' at position ${row.pos}, but no ` +
        "type='directive' status='queued' row has that id prefix -- the lane is admitting something " +
        "other than a mission",
    );
    assert.ok(
      !standingRefs.has(String(row.ref)),
      `prime_directive_queue() ranked '${row.ref}' in the directive lane while that row is ` +
        "status='standing'. A standing decision is read by every cycle and picked by none; ranking " +
        "one makes John's ruling the cycle's build order again, which is the defect SES-353 closed",
    );
  }

  // (iii) the two readers agree -- but only in the world where John has queued no mission.
  const [boot] = await pg(url, key, "rpc/runner_should_boot", { method: "POST", body: "{}" });
  assert.ok(boot && boot.detail, "runner_should_boot() returned no detail object to read the pick from");
  const bootPick = boot.detail.pick ? boot.detail.pick.backlog_id : null;
  const first = ranked.slice().sort((a, b) => Number(a.pos) - Number(b.pos))[0];
  assert.ok(first, "prime_directive_queue() returned no ranked row at all");
  if (queuedMissions.length === 0) {
    assert.strictEqual(
      String(first.ref), String(bootPick),
      `the queue's first row is '${first.ref}' (lane ${first.lane}) while runner_should_boot()'s ` +
        `pick is '${bootPick}'. With no queued mission the two readers must name the same item; ` +
        "they disagreed before SES-353 because the directive lane ranked standing rulings the gate " +
        "ignored",
    );
    assert.notStrictEqual(String(first.lane), "directive",
      `the queue's first row is still in the 'directive' lane ('${first.ref}') with zero queued ` +
      "missions on the board -- the lane is admitting a row that is not a mission");
    console.log(`  (c)(iii) no queued mission; queue head and gate pick agree on ${first.ref} -- PASS`);
  } else {
    const refs = [...missionRefs].join(", ");
    notRun(
      "(c)(iii) queue head equals the gate's pick",
      `John has ${queuedMissions.length} queued mission directive(s) (${refs}) outranking the board, ` +
        "which is layer 1a working as designed -- the gate ignores the directive lane, so the two " +
        "reads legitimately differ until the mission is closed",
    );
  }

  // (iv) the open question this ship answers is recorded as answered.
  const [q] = await pg(url, key,
    "runner_questions?select=qid,status,answer,answer_note&qid=eq.q-pd-mission-flag");
  assert.ok(q, "runner_questions has no q-pd-mission-flag row to grade");
  assert.strictEqual(q.status, "answered",
    `q-pd-mission-flag is '${q.status}'. SES-353 IS its answer (the split is a status, not a ` +
    "column); leaving it open re-asks John a question the platform already decided");
  assert.ok(/standing/.test(String(q.answer_note ?? "")),
    "q-pd-mission-flag's answer_note does not mention the 'standing' status -- the recorded answer " +
    "must say what shipped, and runner_questions.answer itself is a yes/no column (CHECK), so the " +
    "substance lives in the note");

  console.log(`  (c) live: ${standing.length} standing row(s), ${queuedMissions.length} queued ` +
    `mission(s), ${ranked.filter(r => r.lane === "directive").length} directive-lane row(s), ` +
    "q-pd-mission-flag answered -- PASS");
}

export default run;
selfRun(import.meta.url, run);
