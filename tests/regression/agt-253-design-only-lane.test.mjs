// DeepBench v7.0.738 | tests/regression/agt-253-design-only-lane.test.mjs | AGT-253
// FEATURE: AGT-253 -- A DESIGN-ONLY LANE THAT STOPS BEFORE THE BUILD. Kickoff:
// docs/kickoffs/v7.0.727-AGT-253-design-only-stop.md §5 task 5.
//
// The database half of this lane shipped at v7.0.676 and its repo half never did: that cycle
// blocked before its push, so `projects.design_only`, `ticket_design_only()`, `design_only_stop()`
// and `trg_runner_questions_design_only` were all live while `grep -rn design_only` over the tree
// hit nothing but a snapshot. An unprotected stop is a stop the runbook never tells a cycle to
// take. This guard is what makes that impossible to lose again.
//
// THREE ARMS; A runs offline, B and C need credentials and are declared notRun without them:
//   A  PURE -- step 6's OWN span in docs/runbooks/runner-cycle.md carries the design-only clause,
//      naming both ticket_design_only() and design_only_stop(); the file measures exactly
//      380,949 B and sits inside SES-336's 381,000-byte ceiling. NO STAMP ASSERTION (kickoff D1:
//      agt-133 and ses-424c pin line 1 at v7.0.658, and a new stamp would redden both for 106 B of
//      no value). CONTROLS: each assertion is paired with the mutation that must break it, so a
//      green here cannot be a green that could not go red (STANDARDS §4, LOO-013 -- assert WHICH
//      branch fired). The span is the load-bearing half: the same clause pasted into step 9 would
//      satisfy a bare file-wide includes() and tell no cycle anything.
//   B  LIVE, READ-ONLY -- projects.design_only is true on EXACTLY trainer-authored-agents, all three
//      members are still filed, and each member's (newest card decision, design_status, in
//      prime_directive_queue) triple is LEGAL for the state it is in, per memberStateReason(): no
//      card -> NULL and in the queue; an undecided card -> out of the queue and `designed` or
//      `needs-desktop`; `accept` -> `needs-desktop` and out (D2, his yes makes the build attended,
//      off main); `rework` -> NULL and back in. rpc/ticket_design_only reads true for AGT-250 and
//      FALSE for AGT-253 -- the pair is the discriminating one, since a function that returned true
//      for everything would pass the first half alone.
//      WHY A STATE MACHINE AND NOT THREE VALUES (pattern:162 -- a check grades the change, never the
//      live world): this arm first pinned design_status `[null, null, null]` and all three members
//      coming back from the queue, which was the true state for one hour after v7.0.727's own task 6
//      and false from the next cycle's stop onward -- a guard that could never go green again and so
//      protected nothing. The triple above holds through every state the lane's own trigger writes,
//      so the arm reddens when the LANE breaks and not when John answers a card.
//   C  LIVE, NO WRITES -- rpc/design_only_stop refuses on AGT-253 (not a design-only project) and on
//      AGT-250 under a cycle that does not hold the claim, each with ITS OWN sentence, not merely
//      "a 400"; the anon key is denied both new RPCs. Row counts are re-read equal afterwards.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSteps } from "../../scripts/render-cycle-card.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const CEILING = 381000;
// The bytes this ship measured. ses-413d's BYTES_AT_SHIP is the ONE home for the runbook's live
// size and ses-424f checks it against the file; this literal is the kickoff's own target, carried
// here so arm A states what it measured rather than agreeing with whatever the file happens to be.
// AGT-314 (v7.0.748) re-pinned it: a SECOND home for one number is exactly what the comment above
// warns about, and a later editing ship has to move both or this arm goes red on a change that has
// nothing to do with AGT-253's clause. Moving it is the narrowest fix; collapsing the two homes
// into one is tracked separately rather than done inline here (pattern:96).
const BYTES_AT_SHIP = 380944;
// Clause (c), step 6. The two function names are what make it load-bearing: a clause that named
// neither would leave a cycle with nothing to call.
const CLAUSE_C = "**Design-only project (`AGT-253`): when `public.ticket_design_only('<ID>')` is true, " +
  "`public.design_only_stop(cycle id, ID, kickoff path, plain_cant, plain_after, plain_worth)` " +
  "replaces this write — then close the cycle `gated_before_build`; never step 7.**";
const STEP = "6";

const DESIGN_ONLY_PROJECT = "trainer-authored-agents";
const MEMBERS = ["AGT-250", "AGT-251", "AGT-252"];
const RANDOM_CYCLE = "00000000-4253-4253-4253-000000000253";

const lf = t => String(t).replace(/\r\n/g, "\n");
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// The text of one step from its own marker to the next step's, so a needle in step 9 cannot pass
// for one in step 6 (the agt-133 / agt-137 convention, same helper shape).
function stepSpan(md, label) {
  const lines = lf(md).split("\n");
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `${CYCLE_REL} has no step **${label}.** marker`);
  const from = steps[i].line - 1;
  const to = i + 1 < steps.length ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(from, to).join("\n");
}

// PURE, and the whole of arm B's judgment. The four states below are the ONLY ones this lane's own
// writers produce, read this ship from pg_get_functiondef() on design_only_stop() and
// design_only_answer_applies():
//   no card        -- the lane has not fired; design_status NULL and the ticket is pickable.
//   undecided NULL -- design_only_stop() filed the card and wrote `designed` (or `needs-desktop`, a
//                     re-stop after an earlier yes); pick_exclusions()'s undecided-card clause keeps
//                     it out of prime_directive_queue() -- never picked again until John approves.
//   accept         -- John said yes; the trigger writes `needs-desktop`, which pick_blocking_flags()
//                     already reads, so the approved build waits for a session he attends (D2).
//   rework         -- John said no; the trigger clears design_status to NULL and the Designer redoes
//                     it, so the ticket is pickable again.
// Returns null when the triple is legal, else the sentence naming the violation.
export function memberStateReason(cardDecision, designStatus, inQueue) {
  if (cardDecision === undefined) {
    if (designStatus !== null) {
      return `no gated_before_build card, so design_only_stop() has not run and design_status must be NULL; got ${JSON.stringify(designStatus)}`;
    }
    if (inQueue !== true) {
      return "no gated_before_build card, so nothing excludes it and prime_directive_queue() must still return it; it did not";
    }
    return null;
  }
  if (cardDecision === null) {
    if (inQueue !== false) {
      return "the card is undecided and on John's desk, so pick_exclusions()'s undecided-card clause must keep it out of prime_directive_queue() -- never picked again until John approves; it came back";
    }
    if (designStatus !== "designed" && designStatus !== "needs-desktop") {
      return `the card is undecided, so design_status must be 'designed' (design_only_stop()'s own write) or 'needs-desktop' (a re-stop after an earlier yes); got ${JSON.stringify(designStatus)}`;
    }
    return null;
  }
  if (cardDecision === "accept") {
    if (designStatus !== "needs-desktop") {
      return `the card reads accept, so design_only_answer_applies() must have written design_status 'needs-desktop' -- D2, his yes makes the build attended, off main per the charter; got ${JSON.stringify(designStatus)}`;
    }
    if (inQueue !== false) {
      return "the card reads accept and needs-desktop is a pick_blocking_flags() flag, so the ticket must stay out of prime_directive_queue() until John runs it himself; it came back";
    }
    return null;
  }
  if (cardDecision === "rework") {
    if (designStatus !== null) {
      return `the card reads rework, so design_only_answer_applies() must have cleared design_status to NULL for the Designer to redo it; got ${JSON.stringify(designStatus)}`;
    }
    if (inQueue !== true) {
      return "the card reads rework, so the design is back with the Designer and prime_directive_queue() must return it again; it did not";
    }
    return null;
  }
  return `${JSON.stringify(cardDecision)} is not a decision this lane writes -- design_only_answer_applies() writes only accept or rework, and design_only_stop() files the card undecided`;
}

// Each of the four states paired with a wrong design_status and a wrong inQueue. Control (b) of
// STANDARDS §4: every entry must come back with a reason, or a branch that stopped judging would
// still read green against the live rows.
const WRONG_STATES = [
  [undefined, "designed", true, "no card / design_status"],
  [undefined, null, false, "no card / queue"],
  [null, null, false, "undecided / design_status"],
  [null, "designed", true, "undecided / queue"],
  ["accept", null, false, "accept / design_status"],
  ["accept", "needs-desktop", true, "accept / queue"],
  ["rework", "needs-desktop", true, "rework / design_status"],
  ["rework", null, false, "rework / queue"],
];

async function req(url, key, q, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const n = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status}`);
  return n;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // --- A. the clause, IN STEP 6's SPAN, and the bytes -------------------------------------------
  await arm("A step 6 clause, both function names, bytes", () => {
    const md = read(CYCLE_REL);
    const bytes = Buffer.byteLength(md, "utf8");
    const span6 = stepSpan(md, STEP);

    assert.ok(span6.includes(CLAUSE_C),
      `step ${STEP}'s own span must carry the design-only clause verbatim -- a cycle that reaches the ` +
      `kickoff write on a design-only ticket has nothing to read otherwise`);
    assert.ok(span6.includes("public.ticket_design_only("),
      `the clause must name the PREDICATE a cycle tests -- without it there is no "when" to the stop`);
    assert.ok(span6.includes("public.design_only_stop("),
      `the clause must name the CALL that replaces the kickoff write -- without it there is no stop`);
    assert.ok(/close the cycle `gated_before_build`; never step 7/.test(span6),
      "and it must say where the cycle ends: gated_before_build, never step 7");

    assert.strictEqual(bytes, BYTES_AT_SHIP,
      `${CYCLE_REL} measures ${bytes} B, expected ${BYTES_AT_SHIP}. AGT-253's own ship freed 259 B ` +
      "before adding its 263 B clause to land on 380949; AGT-314 then freed 452 B and added a 455 B " +
      "clause to land on 380944 -- a drift here means the byte wall moved without BOTH pins moving " +
      "with it (ses-413d's BYTES_AT_SHIP is the other one)");
    assert.ok(bytes <= CEILING,
      `${CYCLE_REL} is ${bytes} B against SES-336's ${CEILING} B ceiling -- this edit had to free bytes before adding any`);

    // CONTROLS. Each mutation is the SMALLEST one that should break its own assertion, and nothing
    // else. A clause assertion that still passed with the clause deleted would be decoration.
    const noClause = md.replace(CLAUSE_C, "");
    assert.ok(!noClause.includes(CLAUSE_C),
      "control: deleting clause (c) must break the clause assertion");
    assert.ok(!stepSpan(noClause, STEP).includes(CLAUSE_C),
      `control: with the clause deleted, step ${STEP}'s span must no longer carry it`);

    // THE SPAN CONTROL, which is the whole point of reading a span instead of the file: the same
    // clause moved OUT of step 6 and appended to the file must fail, even though a file-wide
    // includes() would still be satisfied by it.
    const moved = noClause + "\n" + CLAUSE_C + "\n";
    assert.ok(moved.includes(CLAUSE_C),
      "control: the moved clause is still in the file -- which is exactly what makes the next line meaningful");
    assert.ok(!stepSpan(moved, STEP).includes(CLAUSE_C),
      `control: a clause outside step ${STEP} must NOT satisfy the span assertion`);

    // The two function names must be load-bearing SEPARATELY: dropping either one alone breaks its
    // own assertion and no other.
    for (const fn of ["public.ticket_design_only(", "public.design_only_stop("]) {
      const without = md.replace(CLAUSE_C, CLAUSE_C.replace(fn, "public.SOMETHING_ELSE("));
      assert.ok(!stepSpan(without, STEP).includes(fn) || without.split(fn).length < md.split(fn).length,
        `control: renaming ${fn} out of the clause must be visible to its own assertion`);
    }

    // The byte assertion must be able to go red in BOTH directions.
    assert.notStrictEqual(Buffer.byteLength(md + "x", "utf8"), BYTES_AT_SHIP,
      "control: one byte added must break the exact-bytes assertion");
    assert.ok(!(Buffer.byteLength(md + "x".repeat(CEILING), "utf8") <= CEILING),
      "control: a file over the ceiling must break the ceiling assertion");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    notRun("AGT-253 live arms (B, C)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the design_only flag, the three cleared members, " +
      "ticket_design_only's true/false pair and design_only_stop's two refusals are unverified here. " +
      "Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    // --- B. the lane exists and is scoped to ONE project -------------------------------------------
    await arm("B design_only, the four member states, predicate", async () => {
      const on = await req(url, key, "projects?design_only=is.true&select=slug");
      assert.equal(on.status, 200, describe(on));
      assert.deepEqual(on.json.map(r => r.slug), [DESIGN_ONLY_PROJECT],
        `design_only must be true on EXACTLY ${DESIGN_ONLY_PROJECT} -- a second project means the lane leaked`);

      const mem = await req(url, key,
        `backlog_items?backlog_id=in.(${MEMBERS.join(",")})&select=backlog_id,design_status&order=backlog_id`);
      assert.equal(mem.status, 200, describe(mem));
      assert.deepEqual(mem.json.map(r => r.backlog_id), MEMBERS, "all three members are still filed");
      const statusOf = new Map(mem.json.map(r => [r.backlog_id, r.design_status]));

      const q = await req(url, key, "rpc/prime_directive_queue", { method: "POST", body: {} });
      assert.equal(q.status, 200, describe(q));
      const refs = q.json.map(r => r.ref);

      // CONTROL (a). An empty queue satisfies every `inQueue === false` branch below for the wrong
      // reason -- a runner that stopped picking anything at all would read as a working lane.
      assert.ok(refs.length >= 1,
        `prime_directive_queue() returned nothing at all, so no "out of the queue" judgment below means ` +
        `anything -- the lane cannot be graded against an empty queue`);

      // THE STATE MACHINE, per member: the newest card's decision, the ticket's design_status and
      // whether the queue returns it must form one of the four legal triples.
      for (const m of MEMBERS) {
        const card = await req(url, key,
          `runner_items?kind=eq.gated_before_build&backlog_id=eq.${m}&select=decision&order=created_at.desc&limit=1`);
        assert.equal(card.status, 200, describe(card));
        const decision = card.json.length ? card.json[0].decision : undefined;
        const designStatus = statusOf.get(m);
        const inQueue = refs.includes(m);
        const reason = memberStateReason(decision, designStatus, inQueue);
        assert.equal(reason, null,
          `${m}: newest gated_before_build card ${card.json.length ? JSON.stringify(decision) : "(no card)"}, ` +
          `design_status ${JSON.stringify(designStatus)}, in prime_directive_queue ${inQueue} -- ${reason}`);
      }

      // CONTROL (b). Every one of the four states, paired with a wrong design_status and a wrong
      // inQueue, must come back with a reason -- a branch that stopped judging would otherwise sit
      // green against whatever the live rows happen to be (STANDARDS §4, LOO-013).
      for (const [decision, designStatus, inQueue, label] of WRONG_STATES) {
        assert.notEqual(memberStateReason(decision, designStatus, inQueue), null,
          `control: the ${label} pairing (${JSON.stringify(decision) ?? "no card"}, ` +
          `${JSON.stringify(designStatus)}, ${inQueue}) is illegal and memberStateReason() returned null -- ` +
          `that branch has stopped grading the lane`);
      }

      // THE DISCRIMINATING PAIR. true alone would pass for a predicate hardcoded to true.
      const yes = await req(url, key, "rpc/ticket_design_only", { method: "POST", body: { p_backlog_id: "AGT-250" } });
      assert.equal(yes.status, 200, describe(yes));
      assert.equal(yes.json, true, "AGT-250 is on the design-only project");
      const no = await req(url, key, "rpc/ticket_design_only", { method: "POST", body: { p_backlog_id: "AGT-253" } });
      assert.equal(no.status, 200, describe(no));
      assert.equal(no.json, false,
        "AGT-253 is on Agent Training, NOT a design-only project -- this half is what makes the true above mean something");
    });

    // --- C. both refusals fire by their own sentence, and nothing is written -----------------------
    await arm("C refusals, no writes", async () => {
      const before = {
        cards: await count(url, key, "runner_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        questions: await count(url, key, "runner_questions?select=id"),
      };

      const body = p => ({
        p_cycle_id: RANDOM_CYCLE, p_backlog_id: p, p_kickoff_path: "docs/kickoffs/v7.0.999-probe.md",
        p_plain_cant: "a", p_plain_after: "b", p_plain_worth: "c",
      });

      const notLane = await req(url, key, "rpc/design_only_stop", { method: "POST", body: body("AGT-253") });
      assert.equal(notLane.status, 400, describe(notLane));
      assert.match(String(notLane.json?.message ?? ""),
        /^design_only_stop: AGT-253 is not on a design-only project/,
        `the refusal must be the NOT-DESIGN-ONLY branch, not merely a 400; got ${describe(notLane)}`);

      const notMine = await req(url, key, "rpc/design_only_stop", { method: "POST", body: body("AGT-250") });
      assert.equal(notMine.status, 400, describe(notMine));
      assert.match(String(notMine.json?.message ?? ""),
        /^design_only_stop: AGT-250 is claimed by .*not by cycle /,
        `AGT-250 IS design-only, so it must fall through to the CLAIM branch -- a different sentence here means the lane check swallowed it; got ${describe(notMine)}`);

      if (anon) {
        for (const [fn, b] of [["ticket_design_only", { p_backlog_id: "AGT-250" }], ["design_only_stop", body("AGT-250")]]) {
          const a = await req(url, anon, `rpc/${fn}`, { method: "POST", body: b });
          assert.notEqual(a.code, "PGRST202", `PGRST202 means ${fn} is missing, never a pass; got ${describe(a)}`);
          assert.ok(!a.ok && /42501|permission denied/.test(a.text),
            `the anon key must be denied ${fn}; got ${describe(a)}`);
        }
      } else {
        notRun("AGT-253 arm C (anon half)",
          "VITE_SUPABASE_ANON_KEY absent -- the anon denial on ticket_design_only and design_only_stop is " +
          "unverified here. Asserted in migration agt253_design_only_lane's own trailing DO block instead, " +
          "over pg_proc by oid: has_function_privilege('anon'|'authenticated', <oid>, 'execute') false on all " +
          "three new functions, in the SAME transaction that created them.");
      }

      const after = {
        cards: await count(url, key, "runner_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        questions: await count(url, key, "runner_questions?select=id"),
      };
      assert.deepEqual(after, before, "every probe above is a refusal -- none of them may write a row");
    });
  }

  notRun("AGT-253 the WRITE path (the stop itself, the trigger, and the pg_proc facts)",
    "public.design_only_stop() and the trg_runner_questions_design_only trigger are WRITERS of the card, " +
    "question, ticket and decision ledgers, and this suite reaches Supabase only over PostgREST, which " +
    "cannot read pg_proc and cannot open a transaction to roll a fixture back -- the SES-310 / SES-315 " +
    "refusal, unchanged. MEASURED AT THIS SHIP (v7.0.727) instead, inside migration " +
    "agt253_yes_is_attended's own nested probe block, ending in RAISE 'agt253-probe-rollback' so every " +
    "fixture row rolled back. PROBE (the stop, then yes, under D2): AGT-250 read needs-desktop before the " +
    "probe; after the stop the OPEN question John reads is verbatim 'yes = the build runs in a session you " +
    "attend, off main per the charter; no = the Designer redoes it with your note'; then yes -> card=accept, " +
    "design_status=needs-desktop, kickoff_link LEFT at the probe path, one backlog_items before-image " +
    "carrying the prior `designed` row, and prime_directive_queue() returns AGT-250 ZERO times WITH THE " +
    "CLAIM RELEASED -- that 0 is the discriminator, since before this migration `yes` put it back to 1. " +
    "pg_proc in the same transaction: exactly 1 public row each of design_only_stop and " +
    "design_only_answer_applies, so the CREATE OR REPLACE pair created no overload " +
    "(.claude/rules/supabase-function-signature.md). The down was captured FIRST under up_name " +
    "agt253_yes_is_attended: auto-downable, 2 objects, 0 refusals. ZERO RESIDUE on re-read: 0 runner_items " +
    "rows on AGT-250/251/252, 0 probe questions, and all three tickets back at needs-desktop with " +
    "kickoff_link and claimed_by NULL.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);

  console.log(`[AGT-253] design-only lane: step ${STEP}'s span carries the design-only clause naming ` +
    `ticket_design_only() and design_only_stop(); ${CYCLE_REL} is ` +
    `${Buffer.byteLength(read(CYCLE_REL), "utf8")}B <= ${CEILING}; the lane is on exactly one project and ` +
    `both design_only_stop refusals fire by their own sentence`);
}

selfRun(import.meta.url, run);
export default run;
