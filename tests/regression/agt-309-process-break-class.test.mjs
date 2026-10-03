// DeepBench v7.0.743 | tests/regression/agt-309-process-break-class.test.mjs | AGT-309 --
// THE PROCESS-BREAK CLASS: John's 2026-10-02 ruling (decision 874648b6) made into a rule row,
// Victoria's inline Knowledge, and ONE path a ticket of that class may take into an executing
// project's list.
//
// THE DEFECT, measured live 2026-10-02 on the unchanged tree rather than reasoned about. AGT-309's
// own row was moved into the executing Agent Training project by decision 35980d96 with a HAND-SET
// `need_source` -- no `requirement-check` turn, no verdict, no score. `runner_decisions` rows
// quoting 874648b6: 0. `capability_skill_profiles` where `capability_slug = 'requirement-check'`:
// two rows, both `*-intent`, so Victoria held 0 Knowledge rows and the class she is asked to rule
// against existed nowhere she could read it. `scripts/agent-row-gate.js` passed a hardcoded
// `decisionNamesTicket: false`, so the CLI could not see the authority the ticket's own row cited.
// `requirement_gate()` read traceability only -- a well-formed citation written by hand satisfied it.
//
// THE FOUR ARMS, and what each one can prove ALONE:
//   A  PURE, zero network (kickoff §6.3). validateReview()'s two new keys: each of H6's four
//      refusals fires BY ITSELF against an otherwise-clean review, both keys over an accepting
//      project are clean, and nextLines() pairs the i-th FILING group with tickets[i].
//   B  THE GATE CLI, live (kickoff §6.2). A fixture PAIR differing in exactly one column --
//      `need_source` set to the cited John decision vs NULL -- must move the verdict from `build`
//      / `agreed-ticket` to `gated` / `no-authority`, and the `judged on scope_origin alone`
//      footnote must appear on the NULL row and NOWHERE on the cited one (H7). Then the live
//      `AGT-309 --action=edit-active` call, which is the authority the migration's own writes run
//      under.
//   C  THE DISCRIMINATOR, live (kickoff §6.1). The trigger and the writer, four cases, on the
//      canonical deterministic pick of three real projects. Cases (i) and (ii) are RED on the
//      unchanged tree -- (i) because a hand-set source still moves a discovered ticket, (ii)
//      because `apply_requirement_verdict()` ignores `home_project` -- and that redness IS the
//      defect, not a broken test.
//   D  READ-ONLY (kickoff §6.4). The rule row and the Knowledge link exist, the rule's statement
//      carries John's own words, and the ASSEMBLED PROMPT a `requirement-check` prepare produces
//      actually contains the class test. The last one is the only assertion that proves
//      `traits.source = 'inline'` did its job (SES-341): a Knowledge row that assembles and renders
//      empty is a turn that silently never saw the class.
//
// RESIDUE, AND THE THREE PLACES IT IS NOT ZERO (declared, never discovered later).
//   * `backlog_items` -- zero. Every fixture row is deleted and the table's exact count is re-read
//     at the end of arms B and C. Each row carries an explicit `epic_id` (so `backlog_home_intake()`
//     returns early and no `Intake -- Z…` epic is created) and `source_file` under
//     `tests/regression/`, which is in `runner_settings.ticket_filing_exempt_sources`, so AGT-238's
//     deferred-filing rule is not what decides any case here.
//   * `audit_findings` -- EXACTLY ONE row, appended by case (iv)'s `not-needed` and then SETTLED to
//     `not-a-defect` with its ruling. The table is append-only (AGT-70: `audit_findings_guard()`
//     RAISES on DELETE, and permits only status / ruling / ruled_by / ruled_at /
//     filed_backlog_id / john_call to change), so settling is the only close available and the
//     arm does it rather than leaving an `open`/`listed` row on the Dev Manager's worklist. The
//     proposal text carries a per-run nonce because the writer dedupes on
//     `(fingerprint, iso_week)` -- without it the second run of a week appends nothing and the
//     "+1" assertion would silently stop measuring.
//   * `runner_decisions` / `runner_before_images` -- NOT EQUAL, AND NAMED AS A DEVIATION FROM
//     KICKOFF §6.1's "counts equal". `reverse_decision()` does not delete a decision: it inserts
//     its own `kind='reversal'` row, images the decision row, and marks the original `reversed`.
//     Both tables are deliberately OUT of its allowlist -- its own comment: "replaying them
//     rewrites the evidence instead of the effect, and would delete this reversal's own row". So
//     the ledger GROWS by construction and an equality assertion there would be asserting the
//     opposite of the design. What is asserted instead is the invariant that actually matters and
//     that a leaked fixture would break: after the undo, NO unreversed `requirement-check` decision
//     names either fixture. The deltas are printed as numbers.
//
// FIXTURE CONCURRENCY (SES-382), accepted on the `agt-280-requirement-gate` arm A precedent: F1 is
// pickable for the few hundred ms between case (ii) and the reverse. It is also why the fixtures
// carry `priority_class = 'P6 - Agent Enhancement'` rather than agt-280's `P10 - Tooling`:
// `ladder_work_class('P6 …')` is NULL, so the pass decision carries no rung and the reversal
// cannot DEMOTE a real ladder class on every run (pattern:76 -- a test run never mutates working
// data). Verified in arm C, not assumed.
//
// WHY NO ROLLED-BACK TRANSACTION, same wall as agt-280's: this suite reaches Supabase only over
// PostgREST, which cannot open one -- `Prefer: tx=rollback` was probed against this project at the
// AGT-280 ship and was NOT honoured. Hence refuse-or-write-then-undo with the counts re-read.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  validateReview, nextLines, homeAccepts, NEED_SOURCE_SHAPE,
  NEED_SOURCE_NEEDS_HOME, HOME_NEEDS_NEED_SOURCE, CLASS_KEYS_ROOT_CAUSE_ONLY,
  homeNotExecutingRefusal,
} from "../../scripts/audit-review.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = path.join(REPO, "scripts", "agent-row-gate.js");
const CHECK = path.join(REPO, "scripts", "requirement-check.js");

// SRC -- John's ruling, cited exactly as AGT-309's own row cites it (kickoff §2).
const SRC = "john:runner_decisions:874648b6-c254-4a1f-b152-5d94d6b28b72";
const RULE_ID = "JOHN-1002-PROCESS-BREAK-CLASS";
const KNOWLEDGE_SLUG = "vc-process-break-class";
// A phrase from John's OWN words, inside the span the migration reads out of 874648b6.reasoning.
const JOHN_PHRASE = "becomes a high priority to fix";
// A phrase from the class TEST appended to that ruling. The migration's H3 `v_method` required BOTH
// halves; decision 43808c03 (John 2026-10-02, "keep the change") re-read it from his own
// application to AGT-160: an agent breaking the ticket process is enough on its own.
const CLASS_PHRASE = "is in the class when its own text shows an agent breaking the ticket writing and review process";

// LETTERS ONLY BEFORE THE DASH, and that is not cosmetic: `runner_decisions_backlog_id_check` is
// `^[A-Z]+-[0-9]+[a-z]?$`, so agt-280's `ZAGT280-n` shape cannot be named by a decision at all --
// measured here as a 23514 out of record_decision() on the first run of this arm. Arm C's cases
// (ii) and (iv) DO record decisions on their fixtures, so the ids have to be nameable.
const FIXTURE_PREFIX = "ZAGTPBC";
const SOURCE_FILE = "tests/regression/agt-309-process-break-class.test.mjs";

// The three projects this ticket's path runs through, by SLUG -- read live in arms C and D so a
// status change shows up as a named not-run rather than as a mystery failure.
const HOME_OK = "agent-training";              // executing AND accepts_findings
const HOME_LOCKED = "dev-manager-capabilities"; // executing, locked, does NOT accept findings
const LIST_PROJECT = "dev-mgr-findings";        // planned -- the findings list a ticket waits on

// ---------------------------------------------------------------------------------------------
// transport
// ---------------------------------------------------------------------------------------------

async function req(url, key, q, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}

const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 300)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const cr = res.headers.get("content-range") ?? "";
  const n = Number(cr.split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status} content-range=${cr}`);
  return n;
}

const rpc = (url, key, fn, args, q = "") =>
  req(url, key, `rpc/${fn}${q}`, { method: "POST", body: args ?? {} });

// One fixture ticket body -- `agt-280-requirement-gate.test.mjs`'s `ticket()` shape, column for
// column, with `queue` added (pick_exclusions()'s `no queue number` clause would otherwise keep
// every fixture out of prime_directive_queue() and case (ii)'s queue assertion would be measuring
// that clause rather than AGT-309) and `priority_class` moved off a real ladder class (see header).
function ticket(n, epicId, extra) {
  return {
    backlog_id: `${FIXTURE_PREFIX}-${n}`,
    tier: "next",
    type: "Tooling",
    priority_class: "P6 - Agent Enhancement",
    title: `AGT-309 process-break-class probe ${n}`,
    status: "open",
    epic_id: epicId,
    source_file: SOURCE_FILE,
    scope_origin: "discovered",
    size_stamp: "S",
    defer_status: "no",
    scope_rationale: "regression probe",
    enhancement_claim: "none: probe",
    queue: 999309000 + n,
    row_ordinal: 999309000 + n,
    ...extra,
  };
}

// ---------------------------------------------------------------------------------------------
// Arm A -- PURE. H6's four refusals, each one firing ALONE, and nextLines()'s pairing.
// ---------------------------------------------------------------------------------------------
//
// THE BASELINE IS ASSERTED FIRST AND IT MUST BE EMPTY. Every case below is the baseline review with
// exactly one thing changed, so a refusal list that is not {the one expected} is a real failure and
// never "some other rule also fired". Without the empty baseline a validator that refused
// everything would pass every case here (the LOO-013 lesson, STANDARDS.md Section 4).
//
// `projects` is a FIXTURE of the two live rows, not a read of them -- this arm is offline. Arm C
// asserts the live rows still match it, so a status change cannot make this arm quietly wrong.
const PROJECTS = [
  { slug: HOME_OK, name: "Agent Training", status: "executing", accepts_findings: true },
  { slug: HOME_LOCKED, name: "Dev Manager Capabilities", status: "executing", accepts_findings: false },
  { slug: LIST_PROJECT, name: "Dev Mgr Findings", status: "planned", accepts_findings: false },
];

function armA() {
  const FID = "11111111-1111-4111-8111-111111111111";
  const worklist = [{
    id: FID, fingerprint: "fp-309", iso_week: "2026-W40", kind: "other", source: "auditor",
    finding_type: "other", family: "other", rank: 2, check_slug: "not-backlog-review",
    locations: [{ location: "scripts/agent-row-gate.js" }], governing_fact: "f",
    confidence: "high", proposed_resolution: "p", weeks_seen: 1, prior_rulings: [],
  }];
  const group = extra => ({
    kind: "root-cause", finding_ids: [FID],
    title: "t", root_cause: "rc", fix: "f", ...extra,
  });
  const check = (extra, expected, why) => {
    const v = validateReview({ groups: [group(extra)] }, worklist, undefined, undefined, undefined, PROJECTS);
    assert.deepEqual(v.refusals, expected, `${why}: refusals must be exactly ${JSON.stringify(expected)}`);
    assert.equal(v.ok, expected.length === 0, `${why}: ok must track the refusal list`);
  };

  // The baseline: no new key, nothing refused. Every case below moves ONE thing off this.
  check({}, [], "the baseline root-cause group with neither key");

  // H6 refusal 1 -- a citation with nowhere to send it.
  check({ need_source: SRC }, [NEED_SOURCE_NEEDS_HOME], "need_source with no home");

  // H6 refusal 2 -- a destination with no need behind it. The home here is the ACCEPTING project,
  // so refusal 3 cannot fire and this case can only be refusal 2.
  check({ home: HOME_OK }, [HOME_NEEDS_NEED_SOURCE], "home with no need_source");
  check({ home: HOME_OK, need_source: "not-a-source" }, [HOME_NEEDS_NEED_SOURCE],
    "home with a MALFORMED need_source -- the shape is the check, not mere presence");
  check({ home: HOME_OK, need_source: "   " }, [HOME_NEEDS_NEED_SOURCE],
    "home with a blank need_source");

  // H6 refusal 3 -- AGT-240's own condition. Both keys are well-formed; only the destination is wrong.
  check({ need_source: SRC, home: HOME_LOCKED }, [homeNotExecutingRefusal(HOME_LOCKED)],
    "home on an executing project that does NOT accept findings");
  check({ need_source: SRC, home: LIST_PROJECT }, [homeNotExecutingRefusal(LIST_PROJECT)],
    "home on a project that is not executing at all");
  check({ need_source: SRC, home: "no-such-project" }, [homeNotExecutingRefusal("no-such-project")],
    "home naming no projects row at all");

  // BOTH KEYS, THE ACCEPTING PROJECT: clean. This is the case the whole class depends on, and if it
  // refused, the manager could never propose a class ticket at all.
  check({ need_source: SRC, home: HOME_OK }, [], "both keys over the accepting project");

  // H6's last line -- the keys belong to a root-cause group and to no other kind. Asserted on a
  // kind that is otherwise perfectly valid, so the ONLY refusal can be this one.
  for (const [kind, fields] of [
    ["not-a-defect", { reason: "r" }],
    ["carry", { reason: "r" }],
    ["list", { reason: "r" }],
  ]) {
    for (const keys of [{ need_source: SRC }, { home: HOME_OK }, { need_source: SRC, home: HOME_OK }]) {
      const v = validateReview(
        { groups: [{ kind, finding_ids: [FID], ...fields, ...keys }] },
        worklist, undefined, undefined, undefined, PROJECTS);
      assert.deepEqual(v.refusals, [CLASS_KEYS_ROOT_CAUSE_ONLY],
        `a ${kind} group carrying ${Object.keys(keys).join("+")} must be refused with H6's last sentence`);
    }
  }

  // A root-cause group that REUSES a ticket may carry the keys too (H6: "filing or reuse").
  const reuse = validateReview(
    { groups: [{ kind: "root-cause", finding_ids: [FID], reuse_backlog_id: "AGT-287", need_source: SRC, home: HOME_OK }] },
    worklist, undefined, undefined, undefined, PROJECTS);
  assert.deepEqual(reuse.refusals, [], "a reuse group may carry both keys");

  // The shape itself, both directions -- the regex is H6's, not a re-derivation of it.
  assert.ok(NEED_SOURCE_SHAPE.test(SRC), "the cited John decision matches the who:table:id shape");
  // H6's regex is STRICTER THAN parseSource(), deliberately and measurably: `parseSource()` splits
  // on the first two colons and lets the id contain more ("an id may itself contain a colon"), while
  // `[^:]+` here refuses that. This arm pins the difference rather than papering over it -- the
  // review's key is a manager-typed proposal, and `requirement-check --prepare` re-parses it with
  // the looser rule anyway, so the strict shape costs nothing and catches a typo'd extra colon.
  assert.ok(!NEED_SOURCE_SHAPE.test("nathan:market_records:abc:def"),
    "H6's shape check refuses a colon inside the id, unlike parseSource() -- stricter on purpose");
  for (const bad of ["", "john", "john:runner_decisions", "John:runner_decisions:x", "john:runnerDecisions:x", "john::x"]) {
    assert.ok(!NEED_SOURCE_SHAPE.test(bad), `${JSON.stringify(bad)} is not a who:table:id`);
  }

  // homeAccepts() fails CLOSED on a row that carries no accepts_findings column (a pre-AGT-264
  // context), exactly as listLocked() does.
  assert.equal(homeAccepts({ slug: "x", status: "executing", accepts_findings: true }), true);
  assert.equal(homeAccepts({ slug: "x", status: "executing" }), false,
    "a context row with no accepts_findings is not an accepting home");
  assert.equal(homeAccepts({ slug: "x", status: "planned", accepts_findings: true }), false,
    "accepts_findings does not make a non-executing project a home");
  assert.equal(homeAccepts(undefined), false, "no row at all is not a home");

  // --- nextLines(): the PAIRING, which is the only part of the print that can be wrong ----------
  //
  // apply_audit_review() appends ONE id to `tickets` per FILING group, in group order. So the
  // cleanup group below takes T-A and the filing root-cause takes T-B; the reuse group filed
  // nothing and names its own ticket. A line naming the wrong ticket would send Victoria's turn at
  // a different row entirely, which is why this is asserted by value rather than by shape.
  const groups = [
    { kind: "cleanup", finding_ids: [FID], fix: "bundle" },
    { kind: "root-cause", finding_ids: [FID], title: "t", root_cause: "rc", fix: "f", need_source: SRC, home: HOME_OK },
    { kind: "root-cause", finding_ids: [FID], reuse_backlog_id: "AGT-287", need_source: SRC, home: HOME_OK },
    { kind: "not-a-defect", finding_ids: [FID], reason: "r" },
  ];
  assert.deepEqual(nextLines(groups, ["T-A", "T-B"]), [
    `next: node scripts/requirement-check.js --prepare --ticket=T-B --source=${SRC} --home=${HOME_OK}`,
    `next: node scripts/requirement-check.js --prepare --ticket=AGT-287 --source=${SRC} --home=${HOME_OK}`,
  ], "the i-th FILING group takes tickets[i]; a reuse group takes its own reuse_backlog_id");

  assert.deepEqual(nextLines(groups, []), [
    `next: node scripts/requirement-check.js --prepare --ticket=AGT-287 --source=${SRC} --home=${HOME_OK}`,
  ], "a filing group the function returned no id for prints NO line -- a wrong ticket is worse than none");

  assert.deepEqual(nextLines([groups[0], groups[3]], ["T-A"]), [],
    "a review with no group carrying the keys prints nothing at all");
  assert.deepEqual(nextLines(undefined, undefined), [], "no groups and no tickets is not a crash");
}

// ---------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------

async function run() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  await arm("A the two keys on a root-cause group (pure)", async () => { armA(); });

  if (!url || !key) {
    notRun("AGT-309 arms B, C and D",
      "no SUPABASE_URL / SUPABASE_SERVICE_KEY in env -- the gate is a database trigger, the writer " +
      "is a database function and the Knowledge row is a database row, so there is no offline half " +
      "of any of them (run with `node --env-file-if-exists=.env.local tests/regression/run-all.js`)");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
    return;
  }

  // ---- the canonical fixtures, read from the live board, deterministically --------------------
  const projects = await req(url, key,
    `projects?select=slug,name,status,accepts_findings&slug=in.(${HOME_OK},${HOME_LOCKED},${LIST_PROJECT})&order=slug.asc`);
  assert.ok(projects.ok, `the three projects must read; got ${describe(projects)}`);
  const bySlug = new Map((projects.json ?? []).map(p => [p.slug, p]));

  const epicsOf = async slug => {
    const r = await req(url, key,
      `epics?select=id,name,locked_at,projects!inner(slug,status,accepts_findings)&projects.slug=eq.${slug}&order=id.asc`);
    assert.ok(r.ok, `${slug}'s epics must read; got ${describe(r)}`);
    return r.json ?? [];
  };
  const atEpics = await epicsOf(HOME_OK);
  const lockedEpics = await epicsOf(HOME_LOCKED);
  const listEpics = await epicsOf(LIST_PROJECT);

  const shapeOk =
    homeAccepts(bySlug.get(HOME_OK)) &&
    bySlug.get(HOME_LOCKED)?.status === "executing" && bySlug.get(HOME_LOCKED)?.accepts_findings !== true &&
    bySlug.get(LIST_PROJECT)?.status !== "executing" &&
    atEpics.length === 1 && lockedEpics.length === 1 && listEpics.length === 1;

  if (!shapeOk) {
    notRun("AGT-309 arms B and C",
      `the live board no longer matches the three-project shape this path is measured against ` +
      `(${HOME_OK}: ${JSON.stringify(bySlug.get(HOME_OK) ?? null)}, ${atEpics.length} epic(s); ` +
      `${HOME_LOCKED}: ${JSON.stringify(bySlug.get(HOME_LOCKED) ?? null)}, ${lockedEpics.length} epic(s); ` +
      `${LIST_PROJECT}: ${JSON.stringify(bySlug.get(LIST_PROJECT) ?? null)}, ${listEpics.length} epic(s)) ` +
      `-- asserting against a substitute would measure something else, and arm A's PROJECTS fixture ` +
      `is written against this shape`);
  } else {
    const AT_EPIC = atEpics[0].id;
    const LIST_EPIC = listEpics[0].id;
    const LOCKED_EPIC_NAME = lockedEpics[0].name;

    // ---- B. the gate CLI, a fixture PAIR differing in one column ------------------------------
    await arm("B agent-row-gate reads a cited John decision", async () => {
      const before = await count(url, key, "backlog_items?select=id");
      const B1 = `${FIXTURE_PREFIX}-11`;   // need_source = the cited John decision
      const B2 = `${FIXTURE_PREFIX}-12`;   // need_source NULL -- the SAME row, one column moved
      const gate = (t, action) => spawnSync(process.execPath,
        [GATE, `--ticket=${t}`, `--action=${action}`], { encoding: "utf8" });
      const gateJson = (t, action) => {
        const r = spawnSync(process.execPath, [GATE, `--ticket=${t}`, `--action=${action}`, "--json"], { encoding: "utf8" });
        return { status: r.status, json: JSON.parse(`${r.stdout}`.trim() || "null") };
      };
      try {
        for (const [n, extra] of [[11, { need_source: SRC }], [12, {}]]) {
          const ins = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, LIST_EPIC, extra) });
          assert.ok(ins.ok, `the ${n === 11 ? "cited" : "source-less"} fixture must insert; got ${describe(ins)}`);
        }

        const cited = gate(B1, "edit-active");
        assert.equal(cited.status, 0,
          `${B1} cites an UNREVERSED John decision, so edit-active is build work; got exit ${cited.status}: ${cited.stdout}${cited.stderr}`);
        assert.ok(cited.stdout.includes("BUILD"), `and must print BUILD; got ${cited.stdout.trim()}`);
        assert.ok(cited.stdout.includes(` · need_source=${SRC} (unreversed John decision)`),
          `and must end with H7's need_source tag; got ${cited.stdout.trim()}`);
        assert.ok(!cited.stdout.includes("judged on scope_origin alone"),
          `and must NOT print the scope_origin-alone footnote -- the second limb WAS read; got ${cited.stdout.trim()}`);

        const bare = gate(B2, "edit-active");
        assert.equal(bare.status, 1,
          `${B2} is the SAME row with need_source NULL, so it is gated; got exit ${bare.status}`);
        const bareOut = `${bare.stdout}${bare.stderr}`;
        assert.ok(bareOut.includes("GATED"), `and must print GATED; got ${bareOut.trim()}`);
        assert.ok(bareOut.includes("judged on scope_origin alone"),
          `and must carry the footnote, which is true only of the no-authority clause; got ${bareOut.trim()}`);
        assert.ok(!bareOut.includes("need_source="),
          `and must not print a need_source tag it has no value for; got ${bareOut.trim()}`);

        const cj = gateJson(B1, "edit-active");
        assert.equal(cj.json.decision_names_ticket, true, "--json must carry decision_names_ticket true");
        assert.equal(cj.json.need_source, SRC, "--json must carry the need_source it read");
        assert.equal(cj.json.clause, "agreed-ticket", "and the clause that fired must be the authority one");
        const bj = gateJson(B2, "edit-active");
        assert.equal(bj.json.decision_names_ticket, false, "--json on the source-less row must carry false");
        assert.equal(bj.json.need_source, null, "and a null need_source");
        assert.equal(bj.json.clause, "no-authority", "and the no-authority clause");

        // `activate` stays John's however the ticket cites -- the one case most likely to be
        // "simplified" away, and the citation must not launder it.
        const act = gate(B1, "activate");
        assert.equal(act.status, 1, `activate on ${B1} must stay gated even with the citation; got ${act.status}`);
        const actOut = `${act.stdout}${act.stderr}`;
        assert.ok(actOut.includes("hire card") || actOut.includes("GATED"),
          `and must say so; got ${actOut.trim()}`);
        assert.ok(!actOut.includes("judged on scope_origin alone"),
          `a hire-card line must never claim a decision row could make it build work; got ${actOut.trim()}`);
      } finally {
        for (const n of [11, 12]) {
          await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
        }
      }
      assert.equal(await count(url, key, "backlog_items?select=id"), before,
        "ZERO RESIDUE: backlog_items' exact count must re-read unmoved after arm B");

      // The live call the migration's own agent-row writes run under (kickoff §6.2).
      const live = spawnSync(process.execPath, [GATE, "--ticket=AGT-309", "--action=edit-active", "--json"], { encoding: "utf8" });
      assert.equal(live.status, 0,
        `AGT-309 --action=edit-active must answer build; got exit ${live.status}: ${live.stdout}${live.stderr}`);
      const lj = JSON.parse(live.stdout.trim());
      assert.equal(lj.verdict, "build", "AGT-309's own row carries the authority");
      assert.equal(lj.need_source, SRC, "and it is the cited John decision");
      assert.equal(lj.decision_names_ticket, true, "read unreversed, live, this run");
      console.log(`    [AGT-309 arm B] list epic ${LIST_EPIC}, backlog_items ${before} before and after`);
    });

    // ---- C. THE DISCRIMINATOR ------------------------------------------------------------------
    await arm("C the gate clause and the homing writer", async () => {
      const F1 = `${FIXTURE_PREFIX}-1`;
      const F2 = `${FIXTURE_PREFIX}-2`;
      const SESSION = "agt-309-regression";
      const NONCE = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      const beforeItems = await count(url, key, "backlog_items?select=id");
      const beforeDec = await count(url, key, "runner_decisions?select=id");
      const beforeImg = await count(url, key, "runner_before_images?select=id");
      const beforeFind = await count(url, key, "audit_findings?select=id");

      const cases = [];
      const casefail = (label, e) => { cases.push(`(${label}) ${e.message}`); console.log(`      (${label}) FAIL -- ${e.message}`); };
      const row = async bid => {
        const r = await req(url, key, `backlog_items?backlog_id=eq.${bid}&select=id,epic_id,need_source,need_score,status`);
        assert.ok(r.ok, `${bid} must read; got ${describe(r)}`);
        return (r.json ?? [])[0] ?? null;
      };

      let passDecision = null;
      let findingId = null;
      try {
        // F1 and F2 both start on the findings list, `discovered`, with the citation PATCHed on
        // afterwards -- which is exactly the shape decision 35980d96 used on AGT-309 itself.
        for (const n of [1, 2]) {
          const ins = await req(url, key, "backlog_items", { method: "POST", body: ticket(n, LIST_EPIC) });
          assert.ok(ins.ok, `fixture ${n} must insert onto the ${LIST_PROJECT} list; got ${describe(ins)}`);
          const pat = await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`,
            { method: "PATCH", body: { need_source: SRC } });
          assert.ok(pat.ok, `fixture ${n}'s need_source must PATCH on (a need_source-only UPDATE fires no epic trigger); got ${describe(pat)}`);
        }
        const f1Start = await row(F1);
        assert.equal(f1Start.epic_id, LIST_EPIC, "F1 starts on the findings list");
        assert.equal(f1Start.need_source, SRC, "F1 carries the hand-set citation");
        assert.equal(f1Start.need_score, null, "and no score -- nobody has ruled it");

        // (i) THE GAP ITSELF. A traceable citation written by hand, PATCHed onto the executing
        //     project's epic. On the unchanged tree this SUCCEEDS; that success is the defect.
        try {
          const move = await req(url, key, `backlog_items?backlog_id=eq.${F1}`,
            { method: "PATCH", body: { epic_id: AT_EPIC } });
          assert.ok(!move.ok,
            `the hand-set-source MOVE must be REFUSED; it was ACCEPTED (${describe(move)}) -- this is the defect AGT-309 closes`);
          assert.ok(move.text.includes("AGT-309:"),
            `and refused BY AGT-309, not by another guard; got ${describe(move)}`);
          assert.ok(move.text.includes("waits on the findings list"),
            `and in the gate clause's own words; got ${describe(move)}`);
          assert.equal((await row(F1)).epic_id, LIST_EPIC, "a refused BEFORE-trigger UPDATE moves nothing");
        } catch (e) { casefail("i the hand-set move", e); }

        // Whatever (i) did, F1 goes back on the list before (ii) -- otherwise (ii) cannot tell a
        // working homing writer from a ticket that was already there.
        if ((await row(F1)).epic_id !== LIST_EPIC) {
          const back = await req(url, key, `backlog_items?backlog_id=eq.${F1}`,
            { method: "PATCH", body: { epic_id: LIST_EPIC } });
          assert.ok(back.ok, `F1 must be returned to the findings list before case (ii); got ${describe(back)}`);
        }

        // (ii) HER PASS, WITH A HOME. One call, and it must do all of it: score, move, and leave
        //      the ticket pickable.
        try {
          const pass = await rpc(url, key, "apply_requirement_verdict", {
            p_cycle: null, p_session: SESSION,
            p: {
              verdict: "pass", backlog_id: F1, need_source: SRC, need_score: 5,
              proposal: `AGT-309 regression probe ${NONCE}`,
              reason: "regression probe: the cited ruling is the need, and the class test is met",
              account: "Ruled one proposal", home_project: HOME_OK,
            },
          });
          assert.ok(pass.ok, `a pass naming home_project ${HOME_OK} must be accepted; got ${describe(pass)}`);
          passDecision = typeof pass.json === "string" ? pass.json : pass.json?.id ?? null;
          assert.ok(passDecision, `and must return its decision handle; got ${pass.text.slice(0, 200)}`);

          const moved = await row(F1);
          assert.equal(moved.epic_id, AT_EPIC,
            `the pass must MOVE F1 onto ${HOME_OK}'s epic; it is still on ${moved.epic_id}`);
          assert.equal(moved.need_score, 5, "and carry her score");
          assert.equal(moved.need_source, SRC, "and the source she echoed");

          const ex = await rpc(url, key, "pick_exclusions", {}, `?backlog_id=eq.${F1}&select=backlog_id,reasons`);
          assert.ok(ex.ok, `pick_exclusions must answer; got ${describe(ex)}`);
          assert.deepEqual((ex.json ?? [])[0]?.reasons, [],
            `a homed, scored ticket must have NO exclusion reasons; got ${JSON.stringify((ex.json ?? [])[0] ?? null)}`);

          const q = await rpc(url, key, "prime_directive_queue");
          assert.ok(q.ok, `prime_directive_queue must answer; got ${describe(q)}`);
          assert.ok((q.json ?? []).some(r => r.ref === F1),
            `and must hold ref ${F1}; it returned ${JSON.stringify((q.json ?? []).map(r => ({ lane: r.lane, ref: r.ref })))}`);
        } catch (e) { casefail("ii the pass that homes", e); }

        // (iii) THE MANAGER CANNOT OVERRULE AGT-240. A pass whose home is executing but does NOT
        //       accept findings: the lock refuses the move and rolls the WHOLE verdict back.
        try {
          const decBefore = await count(url, key, "runner_decisions?select=id");
          const locked = await rpc(url, key, "apply_requirement_verdict", {
            p_cycle: null, p_session: SESSION,
            p: {
              verdict: "pass", backlog_id: F2, need_source: SRC, need_score: 4,
              proposal: `AGT-309 regression probe locked ${NONCE}`,
              reason: "regression probe: the destination is a locked list",
              account: "Ruled one proposal", home_project: HOME_LOCKED,
            },
          });
          assert.ok(!locked.ok, `a pass homed to ${HOME_LOCKED} must be REFUSED; got ${describe(locked)}`);
          assert.ok(locked.text.includes("AGT-240:"),
            `and refused by AGT-240's lock, not by AGT-309; got ${describe(locked)}`);
          assert.ok(locked.text.includes(LOCKED_EPIC_NAME),
            `and name the locked list; got ${describe(locked)}`);

          const f2 = await row(F2);
          assert.equal(f2.epic_id, LIST_EPIC, "NOTHING WRITTEN: F2 stays on the findings list");
          assert.equal(f2.need_score, null, "and takes no score -- the refusal rolled the verdict back");
          assert.equal(await count(url, key, "runner_decisions?select=id"), decBefore,
            "and no decision row survives the rollback");
        } catch (e) { casefail("iii the locked home", e); }

        // (iv) NOT-NEEDED. The ticket stays where it is and her reason becomes a listed finding.
        try {
          const nn = await rpc(url, key, "apply_requirement_verdict", {
            p_cycle: null, p_session: SESSION,
            p: {
              verdict: "not-needed", backlog_id: F2,
              proposal: `AGT-309 regression probe not-needed ${NONCE}`,
              reason: "regression probe: the cited ruling does not cover this proposal",
              account: "Ruled one proposal",
            },
          });
          assert.ok(nn.ok, `a not-needed must be accepted; got ${describe(nn)}`);
          findingId = typeof nn.json === "string" ? nn.json : nn.json?.id ?? null;
          assert.ok(findingId, `and must return the findings handle; got ${nn.text.slice(0, 200)}`);

          const f2 = await row(F2);
          assert.equal(f2.epic_id, LIST_EPIC, "a not-needed moves no epic");
          assert.equal(f2.need_score, null, "and writes no score");
          assert.equal(await count(url, key, "audit_findings?select=id"), beforeFind + 1,
            "and appends EXACTLY ONE audit_findings row");
          const fr = await req(url, key, `audit_findings?id=eq.${findingId}&select=status,ruled_by,finding_type`);
          assert.equal((fr.json ?? [])[0]?.status, "listed", "whose status is listed");
          assert.equal((fr.json ?? [])[0]?.ruled_by, "victoria", "and whose ruler is Victoria");
        } catch (e) { casefail("iv the not-needed", e); }
      } finally {
        // ---- the undo, in reverse order, and it runs whatever happened above -------------------
        //
        // THE DECISIONS ARE QUERIED, NOT REMEMBERED, and that is this suite's own first-run lesson.
        // Before the migration, case (iii)'s pass is ACCEPTED (the writer ignores `home_project`),
        // so it records a decision the arm never expected -- and a cleanup that only reversed the
        // handle case (ii) returned left that one STANDING on the real ledger, naming a fixture that
        // had already been deleted. Reversing by query covers whichever cases actually wrote.
        // IT RUNS BEFORE THE DELETEs: reverse_decision() re-INSERTS a row whose image it holds
        // (`v_now is null` branch), so undoing after a delete resurrects the fixture instead.
        const mine = await req(url, key,
          "runner_decisions?select=id,backlog_id,decided_at&kind=eq.requirement-check" +
          `&reversed_at=is.null&backlog_id=in.(${F1},${F2})&order=decided_at.desc`);
        if (!mine.ok) cases.push(`undo: the fixtures' own decisions must read; got ${describe(mine)}`);
        for (const d of (mine.ok ? (mine.json ?? []) : [])) {
          const rev = await rpc(url, key, "reverse_decision", {
            p_decision: d.id, p_actor: "John",
            p_reason: `AGT-309 regression fixture: undo the probe's verdict on ${d.backlog_id}`,
          });
          if (!rev.ok) { cases.push(`undo: reverse_decision(${d.id}) -> ${describe(rev)}`); continue; }
          const out = (rev.json ?? [])[0] ?? {};
          console.log(`      [undo] reverse_decision ${d.id} (${d.backlog_id}): outcome=${out.outcome} ` +
            `restored=${out.restored} unverified=${out.restored_unverified} refused=${out.refused}`);
        }
        if (passDecision) {
          const back = await row(F1);
          if (back && back.epic_id !== LIST_EPIC) {
            cases.push(`undo: the reverse left F1 on ${back.epic_id}, not back on the findings list ${LIST_EPIC}`);
          }
          if (back && back.need_score !== null) {
            cases.push(`undo: the reverse left need_score ${back.need_score} on F1 rather than the image's NULL`);
          }
        }
        if (findingId) {
          // AGT-70: the row cannot be deleted, so it is SETTLED rather than left on the worklist.
          const settle = await req(url, key, `audit_findings?id=eq.${findingId}`, {
            method: "PATCH",
            body: {
              status: "not-a-defect", ruled_by: "victoria",
              ruling: "AGT-309 regression fixture (tests/regression/agt-309-process-break-class.test.mjs) -- settled, not a real finding",
            },
          });
          if (!settle.ok) cases.push(`undo: the fixture finding ${findingId} must settle to not-a-defect; got ${describe(settle)}`);
        }
        for (const n of [1, 2]) {
          const del = await req(url, key, `backlog_items?backlog_id=eq.${FIXTURE_PREFIX}-${n}`, { method: "DELETE" });
          if (!del.ok) cases.push(`undo: fixture ${n} must delete; got ${describe(del)}`);
        }
        // AND THE QUEUE IS PUT BACK. reverse_decision() calls recompute_backlog_queue() whenever it
        // restores a backlog_items row, and that is a deterministic FULL renumber of every eligible
        // ticket -- so it ran with the fixtures still present and shifted real rows by up to two
        // slots. Running it again now that they are gone returns the board to the same numbering it
        // would have had if this test had never run (pattern:76). The count it returns is printed,
        // never asserted: how many rows move depends on what the rest of the board did meanwhile.
        const requeue = await rpc(url, key, "recompute_backlog_queue");
        if (!requeue.ok) cases.push(`undo: recompute_backlog_queue must re-canonicalise the board; got ${describe(requeue)}`);
        else console.log(`      [undo] recompute_backlog_queue moved ${JSON.stringify(requeue.json)} row(s) back to canonical slots`);
      }

      // ---- the counts, re-read ------------------------------------------------------------------
      const afterItems = await count(url, key, "backlog_items?select=id");
      const afterDec = await count(url, key, "runner_decisions?select=id");
      const afterImg = await count(url, key, "runner_before_images?select=id");
      console.log(`      [counts] backlog_items ${beforeItems} -> ${afterItems}; ` +
        `runner_decisions ${beforeDec} -> ${afterDec}; runner_before_images ${beforeImg} -> ${afterImg}; ` +
        `audit_findings ${beforeFind} -> ${await count(url, key, "audit_findings?select=id")} (one settled)`);
      if (afterItems !== beforeItems) {
        cases.push(`ZERO RESIDUE: backlog_items read ${afterItems}, not ${beforeItems} -- a fixture leaked`);
      }
      // The ledger GROWS by design (see the header). What must be true is that nothing of this
      // fixture is still STANDING.
      const standing = await req(url, key,
        `runner_decisions?select=id,backlog_id,status&kind=eq.requirement-check&reversed_at=is.null&backlog_id=in.(${F1},${F2})`);
      if (!standing.ok || (standing.json ?? []).length !== 0) {
        cases.push(`the fixture left an UNREVERSED requirement-check decision standing: ${standing.text.slice(0, 300)}`);
      }

      if (cases.length) throw new Error(`${cases.length} case(s) failed:\n      ${cases.join("\n      ")}`);
    });
  }

  // ---- D. the rule row, the Knowledge link, and the prompt that carries them ------------------
  await arm("D the rule row and the assembled prompt", async () => {
    const rule = await req(url, key, `governance_rules?id=eq.${RULE_ID}&select=id,statement,status,enforcement,canonical_doc,source_group`);
    assert.ok(rule.ok, `governance_rules must read; got ${describe(rule)}`);
    assert.equal((rule.json ?? []).length, 1,
      `governance_rules ${RULE_ID} must read exactly 1 row (measured 0 before this ship); got ${(rule.json ?? []).length}`);
    const r0 = rule.json[0];
    assert.equal(r0.status, "live", "the rule is live");
    assert.ok(r0.statement.startsWith("My decisioning is that"),
      `the statement must be John's own sentence, read back from 874648b6; got ${JSON.stringify(r0.statement.slice(0, 80))}`);
    assert.ok(r0.statement.includes(JOHN_PHRASE),
      `and must carry ${JSON.stringify(JOHN_PHRASE)}; got ${JSON.stringify(r0.statement.slice(0, 400))}`);
    assert.ok(r0.statement.includes("decision 874648b6"),
      "and must name the decision it came from");

    const links = await req(url, key,
      "capability_skill_profiles?capability_slug=eq.requirement-check" +
      "&select=skill_profile_slug,display_order,is_required,skill_profiles!inner(skill_type_slug,method,traits)" +
      "&skill_profiles.skill_type_slug=eq.knowledge");
    assert.ok(links.ok, `the Knowledge links must read; got ${describe(links)}`);
    assert.equal((links.json ?? []).length, 1,
      `requirement-check must hold exactly 1 Knowledge link (measured 0 before this ship); got ${(links.json ?? []).length}`);
    const l0 = links.json[0];
    assert.equal(l0.skill_profile_slug, KNOWLEDGE_SLUG, "and it is the class row");
    assert.equal(l0.display_order, 3, "at display_order 3");
    assert.equal(l0.skill_profiles.traits?.source, "inline",
      "with traits.source = inline -- without it db-assembly.js renders the method as nothing (SES-341)");
    assert.ok(l0.skill_profiles.method.includes(CLASS_PHRASE),
      `and its method holds the class test; got ${JSON.stringify(String(l0.skill_profiles.method).slice(0, 200))}`);

    // THE ASSEMBLED PROMPT. A row that exists but renders empty is the real failure mode here, and
    // only this assertion can see it.
    //
    // NAMED DEVIATION from kickoff §6.4, which says `--prepare … --json` "prints it": the `--json`
    // payload carries the task_context and the model, never the rendered prompt (the prompt goes to
    // `--out`, or to stdout when neither flag is given). So this runs BOTH flags and asserts on the
    // file -- `--json` for the exit code and the model, `--out` for the text the turn would see.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agt309-prompt-"));
    try {
      const out = path.join(dir, "AGT-160.prompt.md");
      const p = spawnSync(process.execPath,
        [CHECK, "--prepare", "--ticket=AGT-160", `--source=${SRC}`, `--out=${out}`, "--json"],
        { encoding: "utf8" });
      assert.equal(p.status, 3,
        `--prepare must exit 3 (awaiting her answer); got ${p.status} stderr=${p.stderr.slice(0, 600)}`);
      const head = JSON.parse(p.stdout.trim());
      assert.equal(head.ticket, "AGT-160", "the prepare names the ticket it read");
      assert.equal(head.source, SRC, "and the source it was handed");
      assert.equal(head.home, null, "AGT-160 is prepared with NO home (kickoff T7) -- scored, not moved");
      assert.ok(head.model, "and names the model the turn would run on, never a hardcoded id (AGT-147)");

      const prompt = fs.readFileSync(out, "utf8");
      assert.ok(prompt.includes(JOHN_PHRASE),
        `the assembled prompt must carry John's ruling; it does not (${prompt.length} bytes, model ${head.model})`);
      assert.ok(prompt.includes(CLASS_PHRASE),
        `and the class test that turns it into a verdict; it does not (${prompt.length} bytes)`);
      console.log(`    [AGT-309 arm D] prompt ${prompt.length} bytes on ${head.model}; rule ${RULE_ID} live; ` +
        `requirement-check Knowledge links 1`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
