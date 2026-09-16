// DeepBench v7.0.511 | tests/regression/ses-378e-staff-watch-brief.test.mjs | SES-378 slice 5 --
// the staff watch reaches the brief, and the ask vocabulary admits the ask the watch writes.
//
// FEATURE. Two halves of one gap, both measured live before the edit. (i) `grep -n
// runner_staff_findings scripts/render-standing-brief.js` returned ZERO hits: the table slice 3
// shipped and the counter slice 4 shipped were displayed NOWHERE, so a finding the Development
// Manager recorded about one of the runner's own agents reached no reader. (ii)
// `pg_get_constraintdef` for `runner_card_asks_target_kind_check` read `CHECK ((target_kind = ANY
// (ARRAY['item'::text, 'question'::text])))`, so `staff-watch.js --promote --apply` -- which writes
// `target_kind: 'skill-edit'` -- was refused 23514 (deviation D1, reported at slice 4 rather than
// routed around). They ship together: widening the constraint alone files asks no surface shows,
// and the brief group alone renders a table nothing can promote out of.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE CONSTRAINT, BOTH DIRECTIONS, AND THE MIDDLE CASE IS THE ONE THAT MATTERS. A probe INSERT
//     of `'skill-edit'` must be ACCEPTED; a probe INSERT of `'not-a-kind'` must still be REFUSED
//     with 23514; `'item'` must still be accepted. A constraint that was DROPPED instead of widened
//     passes the first and third and fails the second, so the refusal is what separates "widened"
//     from "gone" -- the same both-directions rule `.claude/rules/supabase-column-grants.md` records
//     for a grant. The probe is a DIRECT INSERT rather than `staff-watch.js --promote --apply` on
//     purpose: the promotion bar is 3 distinct cycles and the ledger holds 1 finding from 1 cycle,
//     so that command exits 0 on the unchanged tree and discriminates nothing.
//
// (2) PER ROLE. A Skill edit lands on ONE agent's Skill, so the group's rows are per `agent_id`. A
//     fixture holding two agents must name BOTH, each with its own counts, and the per-agent
//     findings must sum to the fixture's length -- a render that silently dropped an agent, or
//     merged two into one, is exactly the failure that would aim a Skill edit at the wrong agent.
//
// (3) ABSENT IS NOT ZERO, asserted as two sentences that must not overlap. "The ledger was not read"
//     and "no findings" are opposite facts, and a group that prints the second when it means the
//     first publishes a clean-looking staff nobody measured.
//
// (4) IT IS IN THE BRIEF, AND IN ITS PLACE. `renderBlock()` must carry the lead AFTER the Ticket
//     hygiene lead and BEFORE the Human gates lead -- Human gates stays last deliberately (SES-386).
//     Asserting the helper alone would pass against a helper nothing calls, which is precisely the
//     state this slice found the table in.
//
// (5) LIVE SHAPE. The real read is an array whose rows carry the three columns the group groups and
//     counts by. It asserts the recorded finding is PRESENT and every row is well-formed, and it
//     reports the count rather than pinning it: a guard that demanded exactly 1 row would go red the
//     next time a cycle records a finding -- a red that grades the day rather than the change, which
//     is the failure SES-386's own header names.
//
// EVERY WRITE HERE IS IMAGED AND CLEANED UP. The probe rows are the only writes; each gets a
// `runner_before_images` row recording its prior state (ABSENT -- `row_data` null) before the INSERT
// is attempted, the probes are deleted afterwards, the deletion is VERIFIED by re-reading, and the
// images are deleted with them so a suite that runs nightly leaves no residue of its own.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  renderBlock, renderStaffWatch, asOf,
} from "../../scripts/render-standing-brief.js";

const T1 = "2026-09-16T18:20:00.000Z";
const STAMP = asOf(T1);

// The finding the ledger actually holds, recorded by slice 3's own `--record` run.
const LIVE_AGENT = "devmanager";
const LIVE_FP = "c31d654e8558c2b5";

// Read off `pg_get_constraintdef` after the migration `ses378e_card_ask_skill_edit` applied. Kept as
// the exact string so a later widening that REPLACES rather than extends the list is visible here.
const CONSTRAINT_AT_SHIP =
  "CHECK ((target_kind = ANY (ARRAY['item'::text, 'question'::text, 'skill-edit'::text])))";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const finding = (agent, fp, cycle, created) => ({
  agent_id: agent, kind: "assignment mismatch", fingerprint: fp, cycle_id: cycle, created_at: created,
});

// Two agents, and deliberately uneven: devmanager has 3 rows over 2 fingerprints and 3 cycles,
// builder has 2 rows over 1 fingerprint and 2 cycles. Row count, fingerprint count and cycle count
// are three DIFFERENT numbers per agent, so a render that printed one of them three times cannot
// pass (2) by accident.
const TWO_AGENTS = [
  finding("devmanager", LIVE_FP, "c1", "2026-09-10T10:00:00Z"),
  finding("devmanager", LIVE_FP, "c2", "2026-09-11T10:00:00Z"),
  finding("devmanager", "aaaaaaaaaaaaaaaa", "c3", "2026-09-12T10:00:00Z"),
  finding("builder", "bbbbbbbbbbbbbbbb", "c1", "2026-09-09T10:00:00Z"),
  finding("builder", "bbbbbbbbbbbbbbbb", "c4", "2026-09-13T10:00:00Z"),
];

const ITEMS = [{ id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 }];
const FACTS = (over = {}) => ({
  items: ITEMS, settings: null, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: [{ judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 0, proposed: 0, rejected: 0, total: 0, newest_root_claim_ref: null, newest_root_claim: null }],
  johnModel: [{ ord: 0, scope: "overall", pattern_no: null, imperative: null, citing_decisions: 0, finalised_unreversed: 0, reversed: 0, open: 0, agreement_rate: null }],
  inventionUse: [{ window: "all", ord: 3, judge_runs: 1, judge_runs_real_visitors: 0, distinct_real_visitors: 0, first_real_visitor_at: null, last_real_visitor_at: null }],
  staff: TWO_AGENTS,
  ...over,
});

// == (2) per role ================================================================================
function theGroupNamesEveryAgentWithItsOwnCounts() {
  const out = renderStaffWatch(TWO_AGENTS, STAMP);

  for (const agent of ["devmanager", "builder"]) {
    assert.ok(out.includes(`\`${agent}\``),
      `the group must name every agent_id in the ledger -- \`${agent}\` is missing. A Skill edit is `
      + `written for ONE agent, so an agent the brief never names is a finding nobody can act on. got:\n${out}`);
  }

  // Each agent's own row, with the three counts that are three different numbers.
  assert.ok(out.includes("| `devmanager` | 3 | 2 | 3 |"),
    `devmanager's row must read 3 findings / 2 distinct fingerprints / 3 distinct cycles: \n${out}`);
  assert.ok(out.includes("| `builder` | 2 | 1 | 2 |"),
    `builder's row must read 2 findings / 1 distinct fingerprint / 2 distinct cycles. If it reads 2 `
    + `distinct fingerprints, the group is counting ROWS where it claims to count fingerprints -- the `
    + `same conflation the 3-cycle promotion bar exists to refuse. got:\n${out}`);

  // The counts sum to the fixture's own length, asserted by parsing the rendered table back rather
  // than by re-reading the fixture: a group that dropped a row would still print a plausible table.
  const findings = [...out.matchAll(/^\| `[^`]+` \| (\d+) \| \d+ \| \d+ \|/gm)].map(m => Number(m[1]));
  assert.strictEqual(findings.length, 2, `exactly two agent rows must be rendered, got ${findings.length}:\n${out}`);
  assert.strictEqual(findings.reduce((a, b) => a + b, 0), TWO_AGENTS.length,
    `the per-agent findings must sum to the ledger's ${TWO_AGENTS.length} rows -- a row assigned to no `
    + `agent, or counted twice, makes every number above it unreadable. got ${findings.join(" + ")}`);

  // No rate, ever -- the same design rule every counting group in this file keeps.
  assert.ok(!out.includes("%"), `no '%' may appear anywhere in the render:\n${out}`);
  return out;
}

// == (3) absent is not zero ======================================================================
function absentIsNotZero() {
  const notRead = renderStaffWatch(undefined, STAMP);
  const zero = renderStaffWatch([], STAMP);

  assert.notStrictEqual(notRead, zero,
    "the control is vacuous unless the unread and measured-zero renders really differ");

  assert.ok(/was not read/i.test(notRead),
    `an unread ledger must SAY it was not read, got:\n${notRead}`);
  assert.ok(!/no findings/i.test(notRead),
    `an unread ledger must NOT print the measured-zero sentence -- "the read did not happen" and "the `
    + `ledger is empty" are opposite facts and the brief must not blur them. got:\n${notRead}`);
  assert.ok(!/\| `/.test(notRead), `an unread ledger must render no table rows at all:\n${notRead}`);

  assert.ok(/no findings/i.test(zero) && /measured zero/i.test(zero),
    `an empty ledger must say so in the words of a measurement, got:\n${zero}`);
  assert.ok(!/was not read/i.test(zero),
    `a measured zero must not also claim the ledger went unread, got:\n${zero}`);

  // null and a non-array take the unread branch too -- a failed PostgREST read is not always
  // `undefined`, and an object landing here must never be counted as zero rows.
  for (const bad of [null, {}, "", 0]) {
    const out = renderStaffWatch(bad, STAMP);
    assert.ok(/was not read/i.test(out) && !/no findings/i.test(out),
      `renderStaffWatch(${JSON.stringify(bad)}) must take the unread branch, got:\n${out}`);
  }
}

// == (4) it is in the brief, between the two groups it was placed between =========================
function theGroupSitsBetweenTicketHygieneAndHumanGates() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);

  assert.ok(at("**Ticket hygiene, last night**") > -1, "renderBlock() must carry the Ticket hygiene lead");
  assert.ok(at("**Staff watch**") > -1,
    "renderBlock() must carry the Staff watch lead. A helper nothing calls is exactly the state this "
    + "slice found `public.runner_staff_findings` in -- shipped, and displayed nowhere.");
  assert.ok(at("**Human gates**") > -1, "renderBlock() must carry the Human gates lead");

  assert.ok(at("**Ticket hygiene, last night**") < at("**Staff watch**"),
    "Staff watch must come AFTER Ticket hygiene (kickoff Task 2)");
  assert.ok(at("**Staff watch**") < at("**Human gates**"),
    "Staff watch must come BEFORE Human gates -- Human gates is the LAST group deliberately (SES-386): "
    + "it is the one that says whether anything above it is waiting on a person.");
  assert.ok(at("**Human gates**") < at("*Provenance:"), "and all of it before the provenance line");

  // The group survives an unread ledger inside the assembled block, rather than the block losing it.
  const unread = renderBlock(FACTS({ staff: undefined }), T1);
  assert.ok(/\*\*Staff watch\*\*/.test(unread) && /was not read/i.test(unread),
    "renderBlock() must still carry the group and say the ledger was not read when staff is absent");
  assert.ok(unread.includes(STAMP), "every generated group carries the as-of stamp");
}

export default async function run() {
  theGroupNamesEveryAgentWithItsOwnCounts();                    // (2)
  absentIsNotZero();                                            // (3)
  theGroupSitsBetweenTicketHygieneAndHumanGates();              // (4)

  const pure = "the group names both agents with 3/2/3 and 2/1/2, an unread ledger says so without "
    + "saying \"no findings\", and renderBlock() places it after Ticket hygiene and before Human gates";

  // == (1) and (5): LIVE =========================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "SES-378e (1) runner_card_asks admits 'skill-edit' and still refuses an unknown kind, and "
      + "(5) public.runner_staff_findings returns the shape the group groups by",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js. "
      + `Measured over the MCP at this ship instead: pg_get_constraintdef reads ${CONSTRAINT_AT_SHIP}, `
      + `and the ledger held 1 row (${LIVE_AGENT} / ${LIVE_FP}).`,
    );
    console.log(`  [SES-378e] ${pure}; (1) and (5) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on GET ${q}: ${await r.text()}`);
    return r.json();
  };
  const post = async (q, body) => {
    const r = await fetch(`${base}/rest/v1/${q}`, {
      method: "POST", headers: { ...hdr, Prefer: "return=representation" }, body: JSON.stringify(body),
    });
    return { status: r.status, text: await r.text() };
  };
  const del = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { method: "DELETE", headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on DELETE ${q}: ${await r.text()}`);
  };

  // ---- (1) the constraint, both directions ----------------------------------------------------
  //
  // One run tag, so the cleanup below can name every row this run wrote and nothing else. `asked_at`
  // is unique per run, which keeps `uniq_card_ask (target_id, asked_at, question)` from absorbing a
  // re-run's probe into the previous one's row and turning a real INSERT into a silent no-op.
  const TAG = `ses-378e-probe-${Date.now()}`;
  const QUESTION = `SES-378e regression probe (${TAG}) — written and deleted by this test`;
  const IMAGE_SESSION = "ses-378e-staff-watch-brief.test.mjs";
  const probe = kind => ({
    target_kind: kind,
    target_id: `${TAG}-${kind}`,
    question: QUESTION,
    asked_at: new Date().toISOString(),
    status: "open",
  });

  const results = {};
  try {
    // THE BEFORE-IMAGE FIRST, for a row whose prior state is ABSENT: `row_data` null is that state
    // said out loud, and the cleanup below restores exactly it. Imaging AFTER the write would record
    // what the write did, which is an image that restores the probe rather than removing it.
    const imaged = await post("runner_before_images", ["skill-edit", "not-a-kind", "item"].map(kind => ({
      session_name: IMAGE_SESSION,
      table_name: "runner_card_asks",
      pk_value: `${TAG}-${kind}`,
      row_data: null,
    })));
    assert.strictEqual(imaged.status, 201,
      `the probe's before-images must be written before any probe INSERT is attempted: ${imaged.status} ${imaged.text}`);

    // Direction one: the newly admitted value INSERTS.
    const admitted = await post("runner_card_asks", [probe("skill-edit")]);
    assert.strictEqual(admitted.status, 201,
      "a `runner_card_asks` INSERT with target_kind='skill-edit' must be ACCEPTED as of v7.0.511 "
      + "(migration ses378e_card_ask_skill_edit). This is the INSERT `staff-watch.js --promote --apply` "
      + `has been writing since slice 4 and being refused 23514 for (deviation D1). got ${admitted.status} ${admitted.text}`);
    results["skill-edit"] = `accepted (HTTP ${admitted.status})`;

    // Direction two, and it is the one that separates WIDENED from DROPPED.
    const refused = await post("runner_card_asks", [probe("not-a-kind")]);
    assert.ok(refused.status >= 400,
      "a `runner_card_asks` INSERT with target_kind='not-a-kind' must still be REFUSED. A 2xx here "
      + "means the constraint was DROPPED rather than widened, and the vocabulary is no longer closed "
      + `at all -- which the 'skill-edit' assertion above would pass against just as happily. got ${refused.status} ${refused.text}`);
    assert.ok(/23514/.test(refused.text),
      "the refusal must be the CHECK constraint's own 23514, not some other error that happens to "
      + `fail the insert (a bad column, a 401) -- otherwise this assertion proves nothing about the constraint. got: ${refused.text}`);
    results["not-a-kind"] = `refused 23514 (HTTP ${refused.status})`;

    // And the vocabulary that was already there still works: a widening that replaced the list
    // instead of extending it would break every ask already on the board.
    const still = await post("runner_card_asks", [probe("item")]);
    assert.strictEqual(still.status, 201,
      `target_kind='item' must STILL be accepted -- the migration extended the list, it did not `
      + `replace it. got ${still.status} ${still.text}`);
    results["item"] = `accepted (HTTP ${still.status})`;
  } finally {
    // CLEANED UP, AND THE CLEANUP IS VERIFIED. A delete that silently matched nothing would leave
    // probe asks on the board for the Development Manager to read as real ones.
    await del(`runner_card_asks?question=eq.${encodeURIComponent(QUESTION)}`);
    await del(`runner_before_images?session_name=eq.${encodeURIComponent(IMAGE_SESSION)}`);
  }
  const leftover = await get(`runner_card_asks?select=id&question=eq.${encodeURIComponent(QUESTION)}`);
  assert.strictEqual(leftover.length, 0,
    `every probe row this test wrote must be gone: ${leftover.length} left behind`);
  const leftImages = await get(
    `runner_before_images?select=id&session_name=eq.${encodeURIComponent(IMAGE_SESSION)}`);
  assert.strictEqual(leftImages.length, 0,
    `every before-image this test wrote must be gone: ${leftImages.length} left behind`);

  // ---- (5) live shape ---------------------------------------------------------------------------
  //
  // The SAME projection fetchFacts() makes, columns NAMED (.claude/rules/supabase-column-grants.md).
  // A 200 carrying rows is also the strongest statement available over PostgREST that the table is
  // there at all -- a table that is not answers PGRST205, not rows.
  const live = await get(
    "runner_staff_findings?select=agent_id,kind,fingerprint,cycle_id,created_at&order=created_at.desc&limit=10000");
  assert.ok(Array.isArray(live), `the live staff read must be an array, got ${typeof live}`);
  assert.ok(live.length >= 1,
    "the ledger must hold at least the finding slice 3 recorded -- an empty one means the row this "
    + "group exists to display is gone");
  for (const r of live) {
    for (const col of ["agent_id", "fingerprint", "cycle_id"]) {
      assert.ok(r[col] != null && String(r[col]).length > 0,
        `every row must carry a non-empty \`${col}\` -- the group GROUPS by agent and COUNTS distinct `
        + `fingerprints and cycles, so a null in any of the three silently merges unrelated findings. got ${JSON.stringify(r)}`);
    }
  }
  assert.ok(live.some(r => r.agent_id === LIVE_AGENT && r.fingerprint === LIVE_FP),
    `the recorded finding (${LIVE_AGENT} / ${LIVE_FP}) must still be in the ledger`);

  // The real rows through the real helper: the group must render the live ledger, not just fixtures.
  const liveRender = renderStaffWatch(live, STAMP);
  assert.ok(liveRender.includes(`\`${LIVE_AGENT}\``) && !/was not read/i.test(liveRender),
    `the live ledger must render as a measured group naming ${LIVE_AGENT}:\n${liveRender}`);

  console.log(`  [SES-378e] ${pure}; (1) live: skill-edit ${results["skill-edit"]}, `
    + `not-a-kind ${results["not-a-kind"]}, item ${results["item"]}, all probes and their `
    + `before-images deleted; (5) live: ${live.length} finding(s), `
    + `${new Set(live.map(r => r.agent_id)).size} agent(s), recorded finding present`);
}

selfRun(import.meta.url, run);
