// DeepBench v7.0.508 | tests/regression/ses-378c-staff-watch.test.mjs | SES-378 slice 3 --
// the staff watch gets rows: a per-agent finding has a table, a fingerprint that groups it, and a
// promotion bar that counts CYCLES rather than rows.
//
// FEATURE. Before this ship, `public` held 70 base tables and not one of them held a per-agent
// finding (`audit_findings` and `ticket_owner_findings` are about other things). The consequence is
// concrete rather than theoretical: slice 2's carried item -- `CLAIM LABEL COLLISION:
// run-project:moat-support:1 on SES-378 + SES-399` -- lives as prose at `docs/SESSIONS.md:28`, so
// it is ungroupable and uncountable and can never reach the ticket's 3-cycle promotion bar however
// many times it recurs. `public.runner_staff_findings` plus `scripts/staff-watch.js` is that home.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (a) THE FINGERPRINT GROUPS AND SEPARATES, BOTH DIRECTIONS. Every cycle writes its own uuid into
//     the prose it reports, so two reports of the SAME defect differ by a uuid and nothing else --
//     if those do not collapse to one fingerprint, the bar is unreachable by construction and the
//     table is a log nobody can act on. The mirror matters just as much: two genuinely different
//     defects must NOT collapse, or the first promotion carries a Skill edit for a defect that was
//     never seen. And an empty detail must return `error` with NO `fingerprint` key -- asserted as
//     an ABSENT key, not a falsy one, because `sha256("agent|kind|")` is a perfectly well-formed 16
//     hex characters that every empty detail would share, silently grouping unrelated findings
//     under one hash and promoting them together.
//
// (b) THE BAR COUNTS DISTINCT CYCLES. Three fixtures, and the third is the one that matters: three
//     rows written in ONE cycle is one cycle's observation recorded three times, not a defect seen
//     three times, and promoting on it turns a chatty cycle into a Skill edit.
//
// (c) LIVE. The table exists and holds what `--record` wrote, and the public roles hold nothing on
//     it. Declared NOT RUN without credentials rather than passed.
//
// (d) THE SES-158 NEGATIVE CONTROL. (b) is driven a second time with `count(distinct cycle_id)`
//     replaced by `count(*)` -- the one plausible wrong implementation -- and the third fixture must
//     then PROMOTE. A control that changes nothing pins nothing; this one changes exactly the
//     counter (b) exists to protect, so (b) cannot be passing for some other reason.
//
// NOTHING HERE WRITES. Every pure arm runs on fixtures and the live arm reads. The `--record` and
// `--promote` runs that produced the live row are the session's own, reported in its ship notes.

import assert from "node:assert/strict";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  fingerprintFor,
  promotionsFrom,
  distinctCycles,
  KINDS,
  PROMOTION_BAR,
  TABLE,
} from "../../scripts/staff-watch.js";

// The finding this session actually recorded, and the fingerprint the shipped helper produced for
// it. Recomputed below rather than pinned as a literal -- a hard-coded hash would pass against a
// helper that had stopped normalising entirely.
const LIVE_CYCLE = "620161e0-ef2d-46ca-b400-8e89db0ac0bd";
const LIVE_AGENT = "devmanager";
const LIVE_KIND = "assignment mismatch";
const LIVE_DETAIL = "CLAIM LABEL COLLISION: run-project:moat-support:1 on SES-378 + SES-399";

// Measured over the MCP at this ship (see (c)): this is what the credential-gated half would find.
const GRANTS_AT_SHIP = "0 anon/authenticated rows in information_schema.role_table_grants; "
  + "pg_class.relacl reads {postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}, so the "
  + "public roles hold nothing -- not even PG17 MAINTAIN (.claude/rules/supabase-column-grants.md "
  + "addendum, DAT-20)";

// == (a) the fingerprint ========================================================================
function theFingerprintGroupsAndSeparates() {
  const base = { agentId: LIVE_AGENT, kind: LIVE_KIND };

  // Same defect, two cycles, differing ONLY by the uuid each cycle stamped into its own prose --
  // plus the whitespace and trailing-stop noise two authors produce without meaning anything by it.
  const a = fingerprintFor({ ...base, detail: `claim label collision on cycle 620161e0-ef2d-46ca-b400-8e89db0ac0bd` });
  const b = fingerprintFor({ ...base, detail: `Claim  label\n collision on cycle aa7173c6-2d6e-4292-804c-509d3cb7eeaa.` });
  assert.ok(!a.error && !b.error, `both details are well-formed: ${JSON.stringify({ a, b })}`);
  assert.strictEqual(
    a.fingerprint, b.fingerprint,
    "two reports of the SAME defect that differ only by the uuid each cycle stamped into its prose "
    + "must carry ONE fingerprint. If they do not, every recurrence is its own singleton, "
    + `count(distinct cycle_id) never passes ${PROMOTION_BAR}, and the promotion bar is unreachable `
    + `by construction. got ${a.fingerprint} vs ${b.fingerprint}`,
  );

  // The mirror. Without it, "everything hashes to one value" also passes the assertion above.
  const other = fingerprintFor({ ...base, detail: "the kickoff named a file that does not exist" });
  assert.notStrictEqual(
    other.fingerprint, a.fingerprint,
    "two DIFFERENT defects must not share a fingerprint -- collapsing them promotes a Skill edit "
    + "for a defect no cycle ever saw",
  );
  // The group key is (fingerprint, agent_id, kind), so the same words from a different agent are a
  // different finding: a Skill edit is written for ONE agent.
  const sameWordsOtherAgent = fingerprintFor({
    agentId: "builder", kind: LIVE_KIND,
    detail: "claim label collision on cycle 620161e0-ef2d-46ca-b400-8e89db0ac0bd",
  });
  assert.notStrictEqual(
    sameWordsOtherAgent.fingerprint, a.fingerprint,
    "the same words attributed to a different agent must fingerprint differently -- a Skill edit "
    + "lands on one agent's Skill, and merging two agents' findings would aim it at the wrong one",
  );

  // Empty / missing detail: `error`, and NO fingerprint key at all.
  for (const [label, arg] of [
    ["missing", { ...base }],
    ["empty", { ...base, detail: "" }],
    ["whitespace", { ...base, detail: "   \n  " }],
    ["no agent", { kind: LIVE_KIND, detail: "something" }],
    ["no kind", { agentId: LIVE_AGENT, detail: "something" }],
  ]) {
    const refused = fingerprintFor(arg);
    assert.ok(
      refused.error && /agent, kind and detail/.test(refused.error),
      `fingerprintFor with a ${label} detail must return an error saying all three are required. `
      + `got: ${JSON.stringify(refused)}`,
    );
    assert.ok(
      !("fingerprint" in refused),
      `fingerprintFor with a ${label} detail returned a \`fingerprint\` key (${JSON.stringify(refused)}). `
      + "sha256(\"agent|kind|\") is a well-formed hash, so a caller checking only `error`'s falsiness "
      + "would file every empty-detail finding under one fingerprint and promote them as one defect.",
    );
  }
  return a.fingerprint;
}

// == (b) the promotion bar, and (d)'s control drive the SAME function ============================
//
// `counter` is the one thing (d) replaces. Everything else -- the fixtures, the grouping key, the
// bar -- is held fixed, so a divergence can only come from the counter.
const FP = "c31d654e8558c2b5";
const row = (cycle, extra = {}) => ({
  fingerprint: FP, agent_id: LIVE_AGENT, kind: LIVE_KIND, cycle_id: cycle,
  detail: LIVE_DETAIL, backlog_id: "SES-378", ...extra,
});

export const FIXTURES = {
  // One fingerprint, two DISTINCT cycles -- one short of the bar.
  twoDistinctCycles: [row("c1"), row("c2")],
  // The same, plus a third distinct cycle -- exactly at the bar.
  threeDistinctCycles: [row("c1"), row("c2"), row("c3")],
  // Three rows, ONE cycle. `unique (cycle_id, fingerprint)` makes this unreachable through
  // `--record`, which is precisely why the arithmetic must be right on its own: the constraint is
  // the belt, this is the braces, and a later mode that inserts by some other path gets neither.
  threeRowsOneCycle: [row("c1"), row("c1"), row("c1")],
};

function promotionCounts(counter) {
  return {
    twoDistinctCycles: promotionsFrom(FIXTURES.twoDistinctCycles, { counter }).length,
    threeDistinctCycles: promotionsFrom(FIXTURES.threeDistinctCycles, { counter }).length,
    threeRowsOneCycle: promotionsFrom(FIXTURES.threeRowsOneCycle, { counter }).length,
  };
}

function theBarCountsDistinctCycles() {
  const got = promotionCounts(distinctCycles);

  assert.strictEqual(got.twoDistinctCycles, 0,
    `one fingerprint on 2 distinct cycles must promote NOTHING -- the bar is ${PROMOTION_BAR}. got ${got.twoDistinctCycles}`);
  assert.strictEqual(got.threeDistinctCycles, 1,
    `one fingerprint on 3 distinct cycles must promote EXACTLY ONE ask -- not one per row, or the `
    + `manager files three Skill-edit asks for one defect. got ${got.threeDistinctCycles}`);
  assert.strictEqual(got.threeRowsOneCycle, 0,
    "three rows written in ONE cycle must promote NOTHING. That is one cycle's observation recorded "
    + "three times, not a defect seen by three cycles, and promoting on it lets a chatty cycle write "
    + `another agent's Skill by itself. got ${got.threeRowsOneCycle}`);

  // The promoted group carries the whole key back, or the ask cannot name who it is for.
  const [p] = promotionsFrom(FIXTURES.threeDistinctCycles);
  assert.deepStrictEqual(
    { fingerprint: p.fingerprint, agent_id: p.agent_id, kind: p.kind, cycles: p.cycles },
    { fingerprint: FP, agent_id: LIVE_AGENT, kind: LIVE_KIND, cycles: 3 },
    `a promotion must carry fingerprint, agent and kind and the DISTINCT-cycle count. got ${JSON.stringify(p)}`,
  );

  // Two different fingerprints at the bar promote separately; one group's rows never top up another.
  const mixed = [...FIXTURES.threeDistinctCycles,
                 row("c1", { fingerprint: "ffffffffffffffff" }), row("c2", { fingerprint: "ffffffffffffffff" })];
  assert.strictEqual(promotionsFrom(mixed).length, 1,
    "a second fingerprint one short of the bar must not be carried over the line by the first one's rows");
  return got;
}

// == (d) the control ============================================================================
function controlGoesRed() {
  const countRows = rows => rows.length;            // `count(*)`, the plausible wrong rule
  const control = promotionCounts(countRows);

  assert.notDeepStrictEqual(control, promotionCounts(distinctCycles),
    "control for (b) changed nothing (the SES-158 failure): count(*) and count(distinct cycle_id) "
    + "produced identical answers on every fixture, so (b) pins neither");
  assert.strictEqual(control.threeRowsOneCycle, 1,
    "control: with count(distinct cycle_id) replaced by count(*), three rows in ONE cycle must "
    + "PROMOTE -- that is the failure (b)'s third case exists to catch. It staying at 0 would mean "
    + "the fixture cannot distinguish the two rules and (b) is vacuous.");
  return control;
}

// == the four kinds are the ticket's own list ===================================================
function theKindsAreClosed() {
  assert.deepStrictEqual(
    [...KINDS].sort(),
    ["assignment mismatch", "kickoff lacked a fact", "over-cap refusal",
     "verdict block attributable to the kickoff"].sort(),
    "the four kinds are the ticket's own list and are mirrored by the table's CHECK constraint. A "
    + "value added here but not to the constraint inserts nothing and reports a 23514; one added to "
    + "the constraint but not here is refused before it reaches the database.",
  );
  assert.ok(KINDS.includes(LIVE_KIND), `the kind this session recorded must be a recorded kind: ${LIVE_KIND}`);
}

export default async function run() {
  const fp = theFingerprintGroupsAndSeparates();     // (a)
  const bar = theBarCountsDistinctCycles();          // (b)
  const control = controlGoesRed();                  // (d)
  theKindsAreClosed();

  const pure = `fingerprint groups across uuids (${fp}) and refuses an empty detail with no `
    + `fingerprint key; the bar promotes ${bar.twoDistinctCycles}/${bar.threeDistinctCycles}/`
    + `${bar.threeRowsOneCycle} on 2-distinct / 3-distinct / 3-rows-one-cycle; the count(*) control `
    + `turns that last one into ${control.threeRowsOneCycle}`;

  // == (c) LIVE ================================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      `SES-378c (c) public.${TABLE} exists, holds the recorded finding, and the public roles hold zero grants on it`,
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js. "
      + `Measured over the MCP at this ship instead: ${GRANTS_AT_SHIP}.`,
    );
    console.log(`  [SES-378c] ${pure}; (c) declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on ${q}: ${await r.text()}`);
    return r.json();
  };

  // THE READ THAT MUST STILL WORK. `.claude/rules/supabase-column-grants.md` is explicit that a
  // denial alone proves nothing -- the query can be failing for its own reasons -- so the legitimate
  // projection is asserted FIRST and by its contents. A 200 here is also the strongest statement of
  // `to_regclass('public.runner_staff_findings') is not null` available over PostgREST, which cannot
  // reach pg_catalog: a table that is not there answers PGRST205, not rows.
  const live = await get(
    `${TABLE}?select=id,cycle_id,agent_id,kind,backlog_id,detail,fingerprint`
    + `&cycle_id=eq.${LIVE_CYCLE}&fingerprint=eq.${FP}`);
  assert.strictEqual(live.length, 1,
    `public.${TABLE} must hold EXACTLY ONE row for (${LIVE_CYCLE}, ${FP}). This session ran the same `
    + "`--record` twice on purpose; two rows means `unique (cycle_id, fingerprint)` is not absorbing "
    + `the repeat and one cycle can walk its own observation to the ${PROMOTION_BAR}-cycle bar alone. `
    + `got ${live.length}`);
  assert.strictEqual(live[0].agent_id, LIVE_AGENT, `the recorded finding names ${LIVE_AGENT}`);
  assert.strictEqual(live[0].kind, LIVE_KIND, `the recorded finding's kind is "${LIVE_KIND}"`);
  assert.strictEqual(live[0].detail, LIVE_DETAIL,
    "the recorded detail must be slice 2's carried item verbatim -- it is the prose at "
    + "docs/SESSIONS.md:28 that this table exists to make countable");

  // And the fingerprint stored is the one the SHIPPED helper computes for that detail, so a change
  // to the normalisation that orphans every stored row fails here rather than silently.
  const recomputed = fingerprintFor({ agentId: live[0].agent_id, kind: live[0].kind, detail: live[0].detail });
  assert.strictEqual(recomputed.fingerprint, live[0].fingerprint,
    "the stored fingerprint must equal what fingerprintFor() computes for the stored detail today. A "
    + "divergence means the normalisation changed under the rows: every historical finding becomes "
    + "its own orphan group and nothing already recorded can ever reach the bar again.");

  // THE DENIAL DIRECTION. PostgREST exposes neither `information_schema` nor a raw-SQL RPC on this
  // project (both probed at this ship: `public.exec_readonly_sql` does not exist), so the grant
  // COUNT is unreadable from here. What is readable, when an anon key is present, is the fact the
  // count is for: the publishable key -- the one that ships in the browser bundle -- must not reach
  // this table. Declared rather than assumed when no anon key is in the environment.
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  let denial;
  if (!anon || anon === "regression-placeholder") {
    notRun(
      `SES-378c (c, denial half) the anon key cannot read public.${TABLE}`,
      "no anon key in the environment to prove the denial with, and information_schema is not "
      + "reachable over PostgREST on this project (no exec_readonly_sql RPC), so the grant count "
      + `cannot be read from a test. Measured over the MCP at this ship: ${GRANTS_AT_SHIP}.`,
    );
    denial = "declared";
  } else {
    const r = await fetch(`${base}/rest/v1/${TABLE}?select=id&limit=1`,
      { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    assert.ok([401, 403, 404].includes(r.status),
      `the anon key reached public.${TABLE} (HTTP ${r.status}). This table holds per-agent findings `
      + "and the migration revoked all on it from anon, authenticated -- a readable one means the "
      + "revoke did not take, exactly the failure .claude/rules/supabase-column-grants.md records.");
    denial = `anon refused with HTTP ${r.status}`;
  }

  console.log(`  [SES-378c] ${pure}; (c) live: public.${TABLE} holds exactly 1 row for this cycle `
    + `(${live[0].agent_id} / "${live[0].kind}" / ${live[0].backlog_id}), its stored fingerprint `
    + `recomputes to ${live[0].fingerprint}, denial half: ${denial}`);
}

selfRun(import.meta.url, run);
