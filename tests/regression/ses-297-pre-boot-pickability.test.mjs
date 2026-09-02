// DeepBench v7.0.364 | tests/regression/ses-297-pre-boot-pickability.test.mjs | SES-297
//
// FEATURE: SES-297 -- guards public.runner_should_boot(), the pre-boot pickability gate that makes
// the FIRST executable action of a runner cycle one cheap query instead of a full orientation.
// M6-09, absorbing M5-06 (the weekly wall) and M5-15 (no pick on a stale usage reading).
//
// WHAT THE DEFECT WAS, so a later editor does not "simplify" the ordering away: 53 scheduled cycles
// in the current weekly window booted cold, discovered there was nothing to do and closed --
// 32.4M tokens, average 611,321 each, shipping nothing -- because the decision happened AFTER
// orientation. THE ORDERING IS THE FEATURE, which is why this file's strongest doc assertion is a
// POSITION assertion (theGateBlockPrecedesStepZero) rather than a wording one.
//
// TWO ARMS, AND THE SPLIT IS DELIBERATE (the SES-281 / SES-218 / SES-275 precedent).
//   * The DOC arm always runs. docs/runbooks/runner-cycle.md is the canonical home of the gate's
//     CONTRACT -- what a cycle does with each verdict -- so the rules are READ OUT OF THE RUNBOOK,
//     never restated here. A test that copies the thing it guards passes forever while the shipped
//     thing rots. Every clause is paired with a negative control: "would this still pass if the
//     change did nothing?" must answer "no" for each, and a meta-assertion checks the controls
//     themselves (the SES-158 lesson -- a control that changes nothing proves nothing).
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. It calls rpc/runner_should_boot over
//     PostgREST and grades the six-branch PRECEDENCE LADDER against an INDEPENDENT ORACLE built
//     from the raw tables -- runner_settings, runner_usage_readings, runner_budget and
//     rpc/prime_directive_queue -- so it asserts the REASON, never merely should_boot=false. Five
//     branches could be dead and a should_boot-only assertion would still pass.
//
// PURITY IS ASSERTED BY SIDE EFFECT, because the property that matters is reachable even though
// pg_proc is not. If a later edit rewired the gate to call drain_epic_next(uuid) -- VOLATILE,
// retires a fully-done drain directive and writes a runner_before_images row -- then repeatedly
// calling the gate would eventually MOVE THE BOARD. So the live arm snapshots the queued-directive
// and before-image counts, calls the gate three times, and asserts nothing moved and all three
// answers agree. That is a difference a rewire cannot survive, unlike a comment saying "STABLE".
//
// DRY-RUN RESULT, measured against unchanged state BEFORE migration ses297_runner_should_boot was
// applied (STANDARDS.md Section 4), by the function-list query run this session rather than assumed:
// pg_proc held ZERO functions named runner_should_boot, so every live assertion FAILS (the RPC 404s)
// and the doc arm fails outright because the gate block did not exist in runner-cycle.md. NOTE for
// anyone re-running the fixtures: the 2026-09 runner_budget row DOES exist (inserted during the
// 2026-09-01 outage recovery), so a no_budget_row fixture must REMOVE it rather than rely on absence.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied -- see the notRun() at the foot: the
// function BODY ships as a Supabase migration and lives in the database, and this suite reaches
// Supabase only over PostgREST, which cannot read pg_proc.provolatile, pg_proc.prosrc or
// pg_get_functiondef, and cannot open a transaction -- so the six-refusal fixture matrix cannot be
// a permanent test without a permanent test that MUTATES runner_budget, runner_settings and the
// standing Prime Directive on the live board. It must not. Those measurements were taken live at
// this ship inside a deliberately failing DO block, all rolled back, and are recorded verbatim below.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const RUNBOOK = path.join(ROOT, RUNBOOK_REL);
const SESSIONS_REL = "docs/SESSIONS.md";
const SESSIONS = path.join(ROOT, SESSIONS_REL);

const BLOCK_START = "**PRE-BOOT GATE — ONE QUERY";
const BLOCK_END = "**0. Bootstrap.**";

// The six refusals plus the one pass. Held here ONLY as the closed set the live arm ranges over --
// what each one MEANS is read out of the runbook by the clauses below, never restated.
export const REASONS = [
  "scheduler_off",
  // SES-302: neither 'usage_reading_stale' nor 'pickable_degraded' is here. Staleness does not
  // refuse a run AND does not change this gate's verdict -- resolve_day_token_cap() RUNG 2 owns the
  // staleness brake (48h, stale-floor, box may not override). This gate carries no cap and no
  // threshold of its own; SES-298 gave it both at 24h and the two homes disagreed on live data.
  "weekly_wall",
  "no_budget_row",
  "nothing_pickable",
  "unaffordable",
];
export const PASS_REASON = "pickable";
// SES-302: exactly ONE reason boots. The set is kept rather than collapsed back to a string so a
// future pass reason is a one-line change here instead of a rewrite of the consistency check.
export const BOOTING_REASONS = new Set([PASS_REASON]);

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Slice a bounded block out of a markdown file. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Markdown here is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal
// match fails for a reason that has nothing to do with the rule (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

export const gateBlock = md => norm(extractBlock(md, BLOCK_START, BLOCK_END));

// ---------------------------------------------------------------------------
// The doc clauses. A clause earns its place only if REMOVING it would change what a cycle does.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "ordering-is-the-feature",
    detail:
      "the block must say this is the cycle's FIRST executable action, enumerate what does NOT " +
      "precede it (CLAUDE.md, CLAUDE-STATE.md, the standing brief, the briefing page), and tell a " +
      "refusing cycle to stop without reading anything else -- without that enumeration the next " +
      "editor moves the call somewhere convenient and the ticket's entire saving evaporates while " +
      "every word about a cheap query stays true",
    test: s =>
      /first\s+executable\s+action/i.test(s) &&
      /CLAUDE\.md/.test(s) && /CLAUDE-STATE\.md/.test(s) &&
      /standing-brief\.md/.test(s) && /briefing page/i.test(s) &&
      /stop without reading anything\s+else/i.test(s),
    breaks: s => s.replace(/first\s+executable\s+action/i, "a step of the cycle"),
  },
  {
    id: "the-defect-is-a-measurement",
    detail:
      "the block must carry the 53 cold-booted cycles, the 32.4M total and the 611,321 average -- " +
      "an ordering rule with no number behind it is an opinion, and this is the number that says " +
      "why the ordering may not be relaxed for convenience",
    test: s => /\b53\b/.test(s) && /32\.4M/.test(s) && /611,321/.test(s),
    breaks: s => s.replace(/611,321/g, "quite a lot"),
  },
  {
    id: "all-six-refusals-are-named",
    detail:
      "every one of the six reasons must appear by its exact string, with M5-15 / M5-06 / M6-09 " +
      "attributed -- a cycle that meets a reason this file does not name cannot write a truthful " +
      "last_step, and a reader cannot tell a refusal from a failure",
    test: s =>
      REASONS.every(r => s.includes(`\`${r}\``)) &&
      /M5-15/.test(s) && /M5-06/.test(s) && /M6-09/.test(s),
    breaks: s => s.split("`no_budget_row`").join("`some other refusal`"),
  },
  {
    id: "a-refusal-always-names-itself",
    detail:
      'the block must state that a bare `false` is the "NULL is not zero" defect -- drop it and a ' +
      "later simplification returns a boolean, at which point a parked runner is indistinguishable " +
      "from a broken one and the 2026-09-01 outage class recurs with no name on it",
    test: s => /bare\s+`false`/i.test(s) && /NULL is not zero/i.test(s),
    breaks: s => s.replace(/NULL is not zero/i, "a fine simplification"),
  },
  {
    id: "never-call-drain-epic-next",
    detail:
      "the block must forbid drain_epic_next by name, say WHY (VOLATILE; it retires a drain " +
      "directive and writes a runner_before_images row), and name prime_directive_queue as the " +
      "STABLE substitute that carries the same M5 filters. This is the single edit that would let " +
      "a read-only probe CLOSE John's standing drain as a side effect of asking a question",
    test: s =>
      /never calls `drain_epic_next/i.test(s) &&
      /VOLATILE/.test(s) &&
      /retires/i.test(s) &&
      /runner_before_images/.test(s) &&
      /prime_directive_queue/.test(s) &&
      /STABLE/.test(s),
    breaks: s => s.replace(/never calls `drain_epic_next/i, "calls `drain_epic_next"),
  },
  {
    id: "precedence-3-before-4-is-null-safe",
    detail:
      "the block must record that weekly_wall precedes no_budget_row deliberately and compares " +
      "NULL-safely, and must name the 2026-09-01 outage. Reverse them, or make the wall comparison " +
      "COALESCE to true, and a missing budget row is reported as a spent budget -- the exact " +
      "misdiagnosis that stopped the runner and then sat unread in a card",
    test: s =>
      /NULL-safe/i.test(s) &&
      /2026-09-01/.test(s) &&
      /falls through/i.test(s) &&
      /`no_budget_row`/.test(s) && /`weekly_wall`/.test(s),
    breaks: s => s.replace(/NULL-safe/i, "convenient"),
  },
  {
    id: "m5-06-asks-the-cheapest-not-the-pick",
    detail:
      "the block must say the affordability test is asked of the CHEAPEST pickable ticket and " +
      "never of the ticket that would be picked -- asking it of the pick makes the gate refuse to " +
      "boot while affordable work is sitting right behind it, i.e. the gate stopping the work it " +
      "exists to make cheap",
    test: s =>
      /cheapest/i.test(s) &&
      /never of the ticket that would be picked/i.test(s) &&
      /detail\.pick/.test(s) && /detail\.cheapest/.test(s),
    breaks: s => s.replace(/never of the ticket that would be picked/i, "and also of the ticket that would be picked"),
  },
  {
    id: "an-unpriced-ticket-is-unknown-not-free",
    detail:
      "the block must state that predicted_cycles IS NULL is excluded from the cheapest-cost " +
      "arithmetic, that an all-unpriced board FAILS OPEN, and that detail.unpriced_pickable reports " +
      "it -- counting NULL as 0 makes every board affordable and the unaffordable branch dies " +
      "silently; counting it as infinite refuses every board",
    test: s =>
      /predicted_cycles` IS NULL|predicted_cycles IS NULL/i.test(s) &&
      /fails open/i.test(s) &&
      /unpriced_pickable/.test(s) &&
      /Neither is a measurement/i.test(s),
    breaks: s => s.replace(/fails open/i, "counts those tickets as free"),
  },
  {
    id: "the-refusal-writes-a-did-not-run-row",
    detail:
      "the block must carry the runner_cycles INSERT with outcome='did_not_run' and the " +
      "'step 0 — pre-boot refusal' last_step -- a refusal that writes no row is invisible to " +
      "scheduler_gate's predecessor predicate, to the cadence watchdog and to the ledger, so the " +
      "saving would show up as the runner having silently died",
    test: s =>
      /runner_cycles/.test(s) &&
      /did_not_run/.test(s) &&
      /pre-boot refusal/.test(s) &&
      /last_step/.test(s),
    breaks: s => s.split("did_not_run").join("finished"),
  },
  {
    id: "the-month-is-johns-clock",
    detail:
      "the block must name America/Chicago and register B35 for the budget month, and say never " +
      "UTC -- a UTC month boundary silently refuses or admits fires for up to six hours around " +
      "every month end, on the one check whose absence already caused an outage",
    test: s => /America\/Chicago/.test(s) && /B35/.test(s) && /never UTC/i.test(s),
    breaks: s => s.replace(/America\/Chicago/g, "UTC"),
  },
  {
    id: "the-skipped-tail-consequence-is-declared",
    detail:
      "the block must say a refusal skips the serial tail, name what that costs (John's taps are " +
      "not harvested), and mark nothing_pickable as the UNBOUNDED case -- an undeclared cost is how " +
      "a later cycle 'fixes' this by restoring the tail and puts the 473.1 KB briefing read back on " +
      "the exact path the ticket exists to make cheap",
    test: s =>
      /serial tail/i.test(s) &&
      /harvest John's taps/i.test(s) &&
      /unbounded/i.test(s) &&
      /473\.1 KB/.test(s),
    breaks: s => s.replace(/unbounded/i, "fine"),
  },
  {
    id: "scheduler-gate-is-a-different-question",
    detail:
      "the block must say this gate and scheduler_gate() answer different questions and both hold " +
      "-- without it the next reader folds one into the other, and scheduler_gate needs a cycle row " +
      "to close and reads the fire's own started_at, neither of which exists before the boot decision",
    test: s => /scheduler_gate\(\)/.test(s) && /different question/i.test(s) && /both hold/i.test(s),
    breaks: s => s.replace(/different question/i, "the same question"),
  },
];

function readRunbook() {
  return fs.readFileSync(RUNBOOK, "utf8");
}

function theShippedGateBlockIsClean() {
  const s = gateBlock(readRunbook());
  assert.ok(
    s.length > 0,
    `the SES-297 pre-boot gate block is missing from ${RUNBOOK_REL} -- runner_should_boot() is in ` +
      "the database with nothing in the repo telling a cycle to call it, which is the same as not " +
      "having shipped it",
  );
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `${RUNBOOK_REL} lost clause "${c.id}": ${c.detail}`);
  }
}

// THE POSITION ASSERTION -- the strongest thing this file does. Every clause above could hold while
// the call sat at step 4, and the ticket would have shipped nothing.
function theGateBlockPrecedesStepZero() {
  const md = readRunbook();
  const gate = md.indexOf(BLOCK_START);
  const bootstrap = md.indexOf(BLOCK_END);
  const phase1 = md.indexOf("## Phase 1 — judgment first");
  assert.ok(gate > 0, `${RUNBOOK_REL} has no pre-boot gate block at all`);
  assert.ok(bootstrap > 0, `${RUNBOOK_REL} has no "0. Bootstrap." step to order against`);
  assert.ok(phase1 > 0, `${RUNBOOK_REL} has no "Phase 1" heading`);
  assert.ok(
    phase1 < gate && gate < bootstrap,
    `the pre-boot gate must sit at the START of Phase 1 and BEFORE step 0's bootstrap ` +
      `(phase1@${phase1}, gate@${gate}, bootstrap@${bootstrap}). Ordering IS the feature: a gate ` +
      "that runs after the clone, the leases and the orientation reads answers the same question " +
      "for the same 611,321 tokens it was filed to stop spending",
  );
  const before = md.slice(phase1, gate);
  assert.ok(
    !/git fetch|CLAUDE-STATE\.md|standing-brief/.test(before),
    "something that reads or clones now sits between the Phase 1 heading and the gate: " +
      JSON.stringify(before.slice(0, 200)),
  );
}

// FILE-LEVEL NEGATIVE CONTROL: an absent block must be reported as a finding, not crash. This is
// the arm that fails on the pre-change runbook, where the block does not exist at all.
function aMissingBlockIsFlagged() {
  assert.strictEqual(
    extractBlock("# a runbook with no pre-boot gate", BLOCK_START, BLOCK_END),
    "",
    "a missing gate block must return '' so the caller reports it",
  );
}

function everyClauseHasTeeth() {
  const block = gateBlock(readRunbook());
  for (const c of CLAUSES) {
    const mutated = c.breaks(block);
    assert.notStrictEqual(
      mutated,
      block,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyClauseHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl() {
  const s = gateBlock(readRunbook());
  assert.throws(
    () => {
      const mutated = s;
      assert.notStrictEqual(mutated, s, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// session-hygiene check 7: this ship added a stamp to the most-read runbook in the repo. The cap is
// the reason it is safe to keep adding them, so the cap is asserted where the addition was made.
function theRunbookStampCapHeld() {
  const lines = readRunbook().split(/\r?\n/);
  const stamps = lines.filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(
    stamps <= 5,
    `${RUNBOOK_REL} carries ${stamps} header stamps; session-hygiene check 7 caps it at 5. Before ` +
      "SES-164 this header reached 45 stamps -- 34.1% of the file -- re-read in full by every cycle",
  );
  const sessions = fs.readFileSync(SESSIONS, "utf8");
  assert.ok(
    sessions.includes("<!-- DeepBench v7.0.348 | runbooks/runner-cycle.md | SES-244"),
    `the stamp SES-297 retired is not in ${SESSIONS_REL} -- check 7 step 3 says the retired stamps ` +
      "move VERBATIM to the appendix, because git history is not where anyone looks",
  );
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase over PostgREST. Read-only and side-effect free by construction; the
// side-effect freedom is ASSERTED below rather than assumed.
// ---------------------------------------------------------------------------

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
  return res.json();
}

const asArray = (body, what) => {
  if (!Array.isArray(body)) throw new Error(`${what} returned a non-array payload`);
  return body;
};

// John's clock, not the runner's. Same boundary register B35 puts on every "today" in this system.
export function chicagoMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit",
  }).formatToParts(now);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  return `${y}-${m}`;
}

// THE INDEPENDENT ORACLE. Deliberately fed from the RAW TABLES rather than from the gate's own
// detail payload, so it can disagree with the function. It is not a second implementation of the
// pick predicate -- prime_directive_queue() is READ, never re-derived (the SES-45 boundary); what
// is reimplemented is only the six-branch LADDER, which is the thing under test.
export function expectedReason(f) {
  if (f.schedulerOn === false) return "scheduler_off";
  // SES-298: staleness is graded LAST and degrades rather than refusing. Held here in the ladder's
  // real position so this oracle keeps grading the shipped precedence, not a remembered one.
  if (f.weeklyRestPct !== null && f.allModelsPct !== null && f.allModelsPct >= f.weeklyRestPct)
    return "weekly_wall";
  if (!f.budgetRowExists) return "no_budget_row";
  if (f.pickableCount === 0) return "nothing_pickable";
  if (f.cheapestPctOfWeek !== null && f.cheapestPctOfWeek > f.weeklyHeadroomPct) return "unaffordable";
  // SES-302: no staleness branch. The reading's age is reported, never graded, by this gate.
  return PASS_REASON;
}

async function theLiveGateObeysItsOwnLadder() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: runner_should_boot()'s verdict against an independent oracle, its detail " +
        "payload, and its freedom from side effects",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "twelve clauses of the gate's contract, the position assertion and the stamp cap against " +
        "the committed runbook. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const call = async () =>
    asArray(await pg(url, key, "rpc/runner_should_boot", { method: "POST", body: "{}" }),
            "rpc/runner_should_boot");

  const rows = await call();
  assert.strictEqual(rows.length, 1, `runner_should_boot() returned ${rows.length} rows, expected exactly 1`);
  const v = rows[0];

  assert.ok(REASONS.includes(v.reason) || v.reason === PASS_REASON,
    `runner_should_boot() returned an unknown reason ${JSON.stringify(v.reason)}; the closed set is ` +
    `${[...REASONS, PASS_REASON].join(", ")}`);
  assert.strictEqual(
    v.should_boot, BOOTING_REASONS.has(v.reason),
    `should_boot=${v.should_boot} disagrees with reason=${v.reason}. The two must never be able to ` +
      "drift: a true with a refusal reason boots a cycle into a wall, a false with a booting reason " +
      "silences the runner with nothing to point at",
  );
  assert.ok(v.detail && typeof v.detail === "object",
    "the verdict carried no detail object -- a bare false is the 'NULL is not zero' defect this gate " +
    "was written to avoid");

  // --- Build the oracle from the raw tables.
  const settings = asArray(
    await pg(url, key, "runner_settings?select=id,scheduler_on&id=eq.1"), "runner_settings");
  const readings = asArray(
    await pg(url, key, "runner_usage_readings?select=taken_at,all_models_pct&order=taken_at.desc&limit=1"),
    "runner_usage_readings");
  const month = chicagoMonth();
  const budget = asArray(
    await pg(url, key, `runner_budget?select=month,weekly_rest_pct&month=eq.${month}`), "runner_budget");
  const queue = asArray(
    await pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" }),
    "rpc/prime_directive_queue");
  const pctPerCycle = Number(
    await pg(url, key, "rpc/runner_pct_per_cycle", { method: "POST", body: "{}" }));
  const items = asArray(
    await pg(url, key, "backlog_items?select=backlog_id,predicted_cycles&limit=2000"), "backlog_items");

  assert.ok(items.length > 100, `backlog_items returned ${items.length} rows -- refusing to grade a truncated read`);
  assert.ok(Number.isFinite(pctPerCycle) && pctPerCycle > 0,
    `runner_pct_per_cycle() returned ${pctPerCycle}; the oracle cannot price a ticket without it`);

  const cyclesOf = new Map(items.map(i => [i.backlog_id, i.predicted_cycles]));
  const lanes = queue.filter(r => r.lane === "drain" || r.lane === "selfbuild");
  // Unknown cost is UNKNOWN, never free -- same treatment the shipped function uses, and the
  // clause above is what stops the two drifting apart.
  const priced = lanes
    .map(r => cyclesOf.get(r.ref))
    .filter(c => c !== null && c !== undefined)
    .map(c => Math.round(Number(c) * pctPerCycle * 100) / 100);

  const takenAt = readings[0]?.taken_at ? Date.parse(readings[0].taken_at) : null;
  const allModelsPct = readings[0]?.all_models_pct === undefined || readings[0]?.all_models_pct === null
    ? null : Number(readings[0].all_models_pct);
  const facts = {
    schedulerOn: settings[0]?.scheduler_on ?? null,
    readingAgeHours: takenAt === null ? null : Math.round(((Date.now() - takenAt) / 3.6e6) * 100) / 100,
    allModelsPct,
    weeklyRestPct: budget[0]?.weekly_rest_pct ?? null,
    budgetRowExists: budget.length > 0,
    weeklyHeadroomPct: allModelsPct === null ? null : 100 - allModelsPct,
    pickableCount: lanes.length,
    cheapestPctOfWeek: priced.length ? Math.min(...priced) : null,
  };

  const want = expectedReason(facts);
  assert.strictEqual(
    v.reason, want,
    `runner_should_boot() answered "${v.reason}" but the raw tables say "${want}". Oracle facts: ` +
      JSON.stringify(facts) + ". This is the assertion that would catch a dead branch: five of the " +
      "six refusals could never fire and a should_boot-only check would still pass",
  );

  // ASSERT ON WHICH BRANCH FIRED, and on the detail that branch owes its reader (the LOO-013
  // lesson -- a pass is only meaningful if it says what actually happened).
  const d = v.detail;
  assert.strictEqual(d.month, month,
    `detail.month is ${JSON.stringify(d.month)}, expected ${month} on John's America/Chicago clock`);
  assert.ok(Object.prototype.hasOwnProperty.call(d, "pickable_count") &&
            Object.prototype.hasOwnProperty.call(d, "unpriced_pickable"),
    "detail must always carry pickable_count and unpriced_pickable -- they are how a reader tells " +
    "'no work' from 'work nobody priced'");
  assert.strictEqual(d.pickable_count, lanes.length,
    `detail.pickable_count=${d.pickable_count} but prime_directive_queue() returned ${lanes.length} ` +
    "drain/selfbuild rows -- the gate and the picker are reading different boards");

  // SES-302: the gate must NOT carry a cap or a staleness verdict of its own. These two assertions
  // are the guard against the defect reappearing -- resolve_day_token_cap() RUNG 2 owns staleness
  // at 48h, and a second home here at 24h returned the opposite answer on live data (35.4h reading:
  // resolver 196M, gate 3M). Asserting the absence is the only way to catch a re-add.
  assert.ok(!("token_cap" in d),
    "runner_should_boot must not carry detail.token_cap -- the day cap has exactly one home, " +
    "public.resolve_day_token_cap(), and a second copy here is free to disagree with it");
  assert.strictEqual(d.cap_authority, "public.resolve_day_token_cap()",
    "detail.cap_authority must name the resolver, so a reader of this payload is pointed at the " +
    "one place the ceiling is decided rather than inferring it from a field that is not here");
  assert.ok(d.reading_age_hours === null || typeof Number(d.reading_age_hours) === "number",
    "the reading's age is still REPORTED even though it is no longer graded here -- dropping it " +
    "would leave a reader unable to see a stale meter at all");
  if (v.reason === PASS_REASON) {
    assert.ok(d.pick && d.pick.backlog_id,
      "a 'pickable' verdict must name the ticket it would pick -- 'there is work' with no ticket is " +
      "not a decision anyone can act on");
    assert.ok(cyclesOf.has(d.pick.backlog_id),
      `detail.pick names ${d.pick.backlog_id}, which is not a backlog_items row`);
    assert.ok(typeof d.pick.title === "string" && d.pick.title.length > 0,
      "detail.pick carries no title -- SES-119: a ticket named anywhere John reads carries ID + title");
  }
  if (v.reason === "unaffordable") {
    assert.ok(d.cheapest && d.cheapest.predicted_pct_of_week !== null,
      "an 'unaffordable' verdict must name the cheapest ticket and its cost -- M5-06 is asked of " +
      "that ticket, so a refusal that cannot show it cannot be audited");
  }

  // --- PURITY, asserted by SIDE EFFECT because pg_proc is unreachable from here. A gate rewired to
  // call drain_epic_next(uuid) would retire a fully-done drain directive and write a before-image.
  const countOf = async q => {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
    });
    if (!res.ok) throw new Error(`${q} returned HTTP ${res.status}`);
    return Number((res.headers.get("content-range") || "/0").split("/")[1]);
  };
  // Design-session follow-up (2026-09-02, design-m6-build-0902): the board is SHARED. Attended
  // sessions and cycles write runner_before_images rows at any moment, so a single before/after
  // sample around the call can move for reasons that have nothing to do with the function -- CI
  // read exactly that on d1853cca while a close-out was writing images. The arm therefore samples
  // up to three times and fails only if the board moved across EVERY sample: a STABLE function
  // that writes would move it every time, a concurrent writer will not.
  const sample = async () => ({
    images: await countOf("runner_before_images?select=id"),
    queuedDirectives: await countOf("runner_directives?select=id&status=eq.queued"),
  });
  let before, after, again;
  for (let attempt = 0; attempt < 3; attempt++) {
    before = await sample();
    again = [await call(), await call()];
    after = await sample();
    if (JSON.stringify(after) === JSON.stringify(before)) break;
  }
  assert.deepStrictEqual(
    after, before,
    "calling runner_should_boot() moved the board. It is supposed to be STABLE and read-only; the " +
      "way this breaks is someone reusing drain_epic_next(uuid) for the pick predicate, which " +
      "RETIRES a fully-done drain directive and writes a runner_before_images row -- i.e. a probe " +
      `that closes John's standing drain by asking whether there is work. before=${JSON.stringify(before)} ` +
      `after=${JSON.stringify(after)}`,
  );
  assert.ok(
    again.every(r => r.length === 1 && r[0].reason === v.reason),
    "three consecutive calls to runner_should_boot() did not agree with each other -- a gate whose " +
      "answer changes because it was asked is not a gate",
  );
}

async function run() {
  theShippedGateBlockIsClean();
  theGateBlockPrecedesStepZero();
  aMissingBlockIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theRunbookStampCapHeld();
  await theLiveGateObeysItsOwnLadder();

  notRun(
    "runner_should_boot()'s pg_proc facts (provolatile, overload count, prosrc) and the six-refusal " +
      "fixture matrix",
    "the body ships as migration ses297_runner_should_boot and lives in the database, not this repo; " +
      "this suite reaches Supabase only over PostgREST, which cannot read pg_proc and cannot open a " +
      "transaction -- so a permanent fixture matrix would have to MUTATE runner_budget, " +
      "runner_settings and the standing Prime Directive on the live board, which a regression test " +
      "must never do (the SES-196 / SES-218 / SES-275 refusal). MEASURED AT THIS SHIP INSTEAD, live, " +
      "inside a deliberately failing DO block with every fixture rolled back, one variable each, and " +
      "every assertion on the REASON rather than on should_boot: baseline usage_reading_stale " +
      "(age 32.36h, 8 pickable); scheduler_off returned WHILE the reading was ALSO stale, so " +
      "precedence 1-over-2 is a difference and not a coincidence; pickable naming SES-184 at 0.44% " +
      "against 37% headroom; weekly_wall at all_models_pct 90 vs weekly_rest_pct 85; no_budget_row " +
      "with the wall condition STILL nominally true, which is the discrimination the 2026-09-01 " +
      "outage needed and did not have; nothing_pickable at pickable_count 0; unaffordable at headroom " +
      "0.1 vs cheapest 0.44, with its own negative control (headroom widened to 50 -> pickable); and " +
      "an all-unpriced board returning pickable with unpriced_pickable=8 and a null cheapest. Zero " +
      "fixture residue on re-read: 0 fixture readings, 2 runner_budget rows, weekly_rest_pct 85, " +
      "scheduler on, 1 queued Prime Directive, 41 priced Selfbuild tickets. pg_proc at the same ship: " +
      "provolatile='s', exactly 1 overload, prosrc free of 'drain_epic_next', EXECUTE granted to " +
      "service_role only. Cost: 16.794 ms execution, 9.819 ms planning, 3,518 shared buffer hits.",
  );
}

selfRun(import.meta.url, run);
export default run;
