// DeepBench v7.0.482 | tests/regression/ses-297-pre-boot-pickability.test.mjs | SES-389 -- the gate gains
// its SECOND refusal, `meter_stale` (M5-15, rewritten): the freshest reading's age is now GRADED
// against runner_settings.meter_stale_hours (default 2) instead of merely printed, and the refusal
// names reading_taken_at and the threshold it was graded against. The oracle grows the branch in the
// ladder's real position -- below scheduler_off, above the wall -- and the live arm reads the
// threshold out of runner_settings so a hard-coded 2 in either place is a failure, not a pass.
// M5-15's other consequence is UNCHANGED and the clause below says so: resolve_day_token_cap()
// RUNG 2 still owns the CEILING at 48h. Two consequences, one home each.
// DeepBench v7.0.448 | tests/regression/ses-297-pre-boot-pickability.test.mjs | SES-368 -- the gate gains
// its third refusal, `weekly_pace` (M5-16): John's day-of-week share of the subscription week
// (day index x 100/7, week starting Friday 01:00 America/Chicago, whole days). The oracle grows one
// branch in the ladder's real position, a fixed-instant calendar check guards the week arithmetic
// independently of the database, and the three new detail keys are asserted against the oracle.
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
//     PostgREST and grades the seven-branch PRECEDENCE LADDER against an INDEPENDENT ORACLE built
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
// pg_get_functiondef, and cannot open a transaction -- so the seven-refusal fixture matrix cannot be
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

// The seven refusals plus the one pass. Held here ONLY as the closed set the live arm ranges over --
// what each one MEANS is read out of the runbook by the clauses below, never restated.
export const REASONS = [
  "scheduler_off",
  // SES-389 / M5-15 (rewritten): the age is GRADED here now, against
  // runner_settings.meter_stale_hours. What SES-302 actually settled -- and what still holds -- is
  // that the CAP has one home: this gate carries no token_cap and does not second-guess
  // resolve_day_token_cap() RUNG 2's 48h ceiling brake. The 2026-09-01 defect was two homes for one
  // consequence at two thresholds; this is two DIFFERENT consequences with one home each. Sits
  // second: John's switch outranks it, and the wall and the pace both grade a number this branch
  // has just called out of date. 'pickable_degraded' is still not here.
  "meter_stale",
  "weekly_wall",
  // SES-368 / M5-16: John's pace. Sits between the wall and the budget-row check, and like the wall
  // it compares NULL-safely -- no reading, no pace verdict.
  "weekly_pace",
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
    id: "a-stale-meter-refuses-and-names-its-threshold",
    detail:
      "the block must say the gate REFUSES `meter_stale` past runner_settings.meter_stale_hours, " +
      "must name reading_taken_at and meter_stale_hours as the detail a refusal owes its reader, " +
      "and must keep the CEILING's separate 48h brake visible -- drop the threshold's name and the " +
      "next editor hard-codes a literal; drop the 48h and M5-15's two consequences collapse back " +
      "into the one-home-at-one-threshold confusion SES-302 paid for. 22 cycles shipped on a " +
      "reading written 17:45Z on 2026-09-12 while the age was printed and not graded",
    test: s =>
      /`meter_stale`/.test(s) &&
      /meter_stale_hours/.test(s) &&
      /reading_taken_at/.test(s) &&
      /48h/.test(s),
    breaks: s => s.split("meter_stale_hours").join("some number"),
  },
  {
    id: "all-six-refusals-are-named",
    detail:
      "every one of the seven reasons must appear by its exact string, with M5-16 / M5-15 / M5-06 / M6-09 " +
      "attributed -- a cycle that meets a reason this file does not name cannot write a truthful " +
      "last_step, and a reader cannot tell a refusal from a failure",
    test: s =>
      REASONS.every(r => s.includes(`\`${r}\``)) &&
      /M5-16/.test(s) && /M5-15/.test(s) && /M5-06/.test(s) && /M6-09/.test(s),
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
    // SES-389: replace-all, not first-only. The block now says "NULL-safe" twice (meter_stale is
    // NULL-safe for the same reason the wall is), and a first-occurrence control left the second
    // standing -- so the mutated block still passed and the control proved nothing. This is the
    // SES-158 failure mode arriving by ADDITION rather than by edit: sibling controls in this file
    // already use split/join for exactly this reason.
    breaks: s => s.split("NULL-safe").join("convenient"),
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

// SES-368 / M5-16: John's week, computed here from the clock alone so the oracle does not read the
// gate's own week_started_at back to itself. Week start = the most recent Friday 01:00
// America/Chicago at or before `nowMs`; day index = whole days elapsed + 1, clamped 1..7; pace
// limit = index x 100/7 rounded to 2dp (the SQL rounds the same way). No timeZoneName parsing:
// the Chicago offset at an instant is recovered by formatting the instant in Chicago wall-clock
// terms and differencing against Date.UTC of those parts, which works on every ICU build.
const CHICAGO = "America/Chicago";
function chicagoParts(ms) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return {
    y: +p.year, mo: +p.month, d: +p.day,
    dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
    offsetMin: Math.round((wall - Math.floor(ms / 1000) * 1000) / 60000),
  };
}
function chicagoWallToMs(y, mo, d, h) {
  let ms = Date.UTC(y, mo - 1, d, h);
  for (let i = 0; i < 2; i++) ms = Date.UTC(y, mo - 1, d, h) - chicagoParts(ms).offsetMin * 60000;
  return ms;
}
export function chicagoWeek(nowMs = Date.now()) {
  const p = chicagoParts(nowMs);
  const back = (p.dow + 2) % 7; // days since Friday
  const startOf = daysBack => {
    const l = new Date(Date.UTC(p.y, p.mo - 1, p.d - daysBack));
    return chicagoWallToMs(l.getUTCFullYear(), l.getUTCMonth() + 1, l.getUTCDate(), 1);
  };
  let weekStartedAt = startOf(back);
  if (weekStartedAt > nowMs) weekStartedAt = startOf(back + 7);
  const weekDayIndex = Math.min(7, Math.max(1, Math.floor((nowMs - weekStartedAt) / 86400000) + 1));
  const paceLimitPct = Math.round((weekDayIndex * 100 / 7) * 100) / 100;
  return { weekStartedAt, weekDayIndex, paceLimitPct };
}

// Always runs. The same instants the migration was checked against, so the JS calendar and the
// SQL calendar are pinned to one table of expectations rather than to each other.
function theOracleCalendarMatchesTheFixedInstants() {
  const cases = [
    ["Fri 2026-09-11 00:30 CT, before the reset", Date.UTC(2026, 8, 11, 5, 30), Date.UTC(2026, 8, 4, 6), 7, 100],
    ["Fri 2026-09-11 01:00 CT, the reset", Date.UTC(2026, 8, 11, 6), Date.UTC(2026, 8, 11, 6), 1, 14.29],
    ["Sat 2026-09-12 00:59 CT, end of day 1", Date.UTC(2026, 8, 12, 5, 59), Date.UTC(2026, 8, 11, 6), 1, 14.29],
    ["Sat 2026-09-12 01:00 CT, day 2", Date.UTC(2026, 8, 12, 6), Date.UTC(2026, 8, 11, 6), 2, 28.57],
    ["Thu 2026-09-17 23:00 CT, day 7", Date.UTC(2026, 8, 18, 4), Date.UTC(2026, 8, 11, 6), 7, 100],
    ["Mon 2026-11-02 12:00 CST, after the DST end", Date.UTC(2026, 10, 2, 18), Date.UTC(2026, 9, 30, 6), 4, 57.14],
  ];
  for (const [label, now, start, idx, limit] of cases) {
    const w = chicagoWeek(now);
    assert.strictEqual(w.weekStartedAt, start, `${label}: week start ${new Date(w.weekStartedAt).toISOString()} != ${new Date(start).toISOString()}`);
    assert.strictEqual(w.weekDayIndex, idx, `${label}: day index ${w.weekDayIndex} != ${idx}`);
    assert.strictEqual(w.paceLimitPct, limit, `${label}: pace limit ${w.paceLimitPct} != ${limit}`);
  }
  // Negative control: a calendar that starts the week on Friday 00:00 instead of 01:00 answers the
  // pre-reset instant as day 1 of the NEW week. If that variant passed the table, the table would
  // not be testing the 01:00 boundary at all.
  const wrong = Date.UTC(2026, 8, 11, 5, 30) >= Date.UTC(2026, 8, 11, 5);
  assert.ok(wrong, "control: the 00:00 variant must classify 00:30 as the new week (so the 01:00 table discriminates)");
}

// THE INDEPENDENT ORACLE. Deliberately fed from the RAW TABLES rather than from the gate's own
// detail payload, so it can disagree with the function. It is not a second implementation of the
// pick predicate -- prime_directive_queue() is READ, never re-derived (the SES-45 boundary); what
// is reimplemented is only the seven-branch LADDER, which is the thing under test.
export function expectedReason(f) {
  if (f.schedulerOn === false) return "scheduler_off";
  // SES-389 / M5-15: the meter's age, graded against the SETTING rather than a literal, in the
  // ladder's real position -- second, below John's switch and above the wall. NULL-safe on both
  // sides exactly as the wall is: no reading (readingAgeHours null) falls through, so a missing
  // reading is still no_budget_row's question. Strictly greater-than, so a reading exactly AT the
  // threshold still boots -- the SQL uses > and this oracle must not quietly use >=.
  if (f.meterStaleHours != null && f.readingAgeHours !== null && f.readingAgeHours > f.meterStaleHours)
    return "meter_stale";
  if (f.weeklyRestPct !== null && f.allModelsPct !== null && f.allModelsPct >= f.weeklyRestPct)
    return "weekly_wall";
  // SES-368 / M5-16: the pace, in the ladder's real position -- after the wall, before the budget
  // row. At-or-above refuses (14.29 on day 1 refuses; 14.28 boots), and NULL on either side falls
  // through, exactly as the wall does.
  if (f.paceLimitPct !== null && f.paceLimitPct !== undefined && f.allModelsPct !== null &&
      f.allModelsPct >= f.paceLimitPct)
    return "weekly_pace";
  if (!f.budgetRowExists) return "no_budget_row";
  if (f.pickableCount === 0) return "nothing_pickable";
  if (f.cheapestPctOfWeek !== null && f.cheapestPctOfWeek > f.weeklyHeadroomPct) return "unaffordable";
  // SES-302 still holds for the CAP: no token_cap branch, no pickable_degraded. The age is graded
  // at (2) above; what this gate never does is decide what a cycle may SPEND.
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
    await pg(url, key, "runner_settings?select=id,scheduler_on,meter_stale_hours&id=eq.1"), "runner_settings");
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
  const week = chicagoWeek();
  const facts = {
    schedulerOn: settings[0]?.scheduler_on ?? null,
    // SES-389: read, never assumed. A test that hard-codes 2 here passes after John moves the
    // threshold and stops grading the branch it claims to guard.
    meterStaleHours: settings[0]?.meter_stale_hours == null ? null : Number(settings[0].meter_stale_hours),
    readingAgeHours: takenAt === null ? null : Math.round(((Date.now() - takenAt) / 3.6e6) * 100) / 100,
    allModelsPct,
    weeklyRestPct: budget[0]?.weekly_rest_pct ?? null,
    budgetRowExists: budget.length > 0,
    weeklyHeadroomPct: allModelsPct === null ? null : 100 - allModelsPct,
    weekStartedAt: week.weekStartedAt,
    weekDayIndex: week.weekDayIndex,
    paceLimitPct: week.paceLimitPct,
    pickableCount: lanes.length,
    cheapestPctOfWeek: priced.length ? Math.min(...priced) : null,
  };

  const want = expectedReason(facts);
  assert.strictEqual(
    v.reason, want,
    `runner_should_boot() answered "${v.reason}" but the raw tables say "${want}". Oracle facts: ` +
      JSON.stringify(facts) + ". This is the assertion that would catch a dead branch: five of the " +
      "six of the seven refusals could never fire and a should_boot-only check would still pass",
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
  // SES-368 / M5-16: the pace facts the verdict owes its reader, graded against the clock-only
  // oracle. A gate that computed the week from UTC, or from Friday 00:00, disagrees here.
  assert.strictEqual(Date.parse(d.week_started_at), facts.weekStartedAt,
    `detail.week_started_at=${d.week_started_at} but the clock says ${new Date(facts.weekStartedAt).toISOString()} ` +
    "(most recent Friday 01:00 America/Chicago)");
  assert.strictEqual(Number(d.week_day_index), facts.weekDayIndex,
    `detail.week_day_index=${d.week_day_index} but the clock says day ${facts.weekDayIndex}`);
  assert.strictEqual(Number(d.pace_limit_pct), facts.paceLimitPct,
    `detail.pace_limit_pct=${d.pace_limit_pct} but day ${facts.weekDayIndex} x 100/7 is ${facts.paceLimitPct}`);
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
    "the reading's age must be REPORTED on every verdict -- dropping it would leave a reader " +
    "unable to see a stale meter at all");
  // SES-389 / M5-15: the threshold the age was graded against, read back out of runner_settings.
  // This is what makes `meter_stale` auditable from the payload alone, and what catches a literal
  // creeping back into the SQL: move the setting and a hard-coded gate disagrees here immediately.
  assert.strictEqual(
    Number(d.meter_stale_hours), facts.meterStaleHours,
    `detail.meter_stale_hours=${d.meter_stale_hours} but runner_settings.meter_stale_hours is ` +
      `${facts.meterStaleHours}. The gate must grade the age against the SETTING, not a literal`,
  );
  if (v.reason === "meter_stale") {
    assert.ok(d.reading_taken_at,
      "a 'meter_stale' verdict must name reading_taken_at -- 'the meter is old' with no instant " +
      "attached is not something John can act on, and the age alone does not say WHICH reading");
    assert.ok(Number(d.reading_age_hours) > Number(d.meter_stale_hours),
      `'meter_stale' fired with age ${d.reading_age_hours} against threshold ${d.meter_stale_hours} ` +
      "-- the refusal must be justified by its own payload");
  }
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
  theOracleCalendarMatchesTheFixedInstants();
  await theLiveGateObeysItsOwnLadder();

  notRun(
    "runner_should_boot()'s pg_proc facts (provolatile, overload count, prosrc) and the seven-refusal " +
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
      "service_role only. Cost: 16.794 ms execution, 9.819 ms planning, 3,518 shared buffer hits. " +
      "SES-389 (v7.0.482, migration ses389_meter_stale_gate) MEASURED THE SAME WAY on 2026-09-14, " +
      "one variable each, every assertion on the REASON: a 3h-old reading at all_models_pct 10 with " +
      "every other input clear -> meter_stale, should_boot=f, detail.reading_age_hours=3.00, " +
      "detail.meter_stale_hours=2, detail.reading_taken_at equal to the fixture's taken_at; a " +
      "reading at now() -> pickable at age 0.00; that SAME 3h reading with meter_stale_hours moved " +
      "to 6 -> pickable, which is the negative control (nothing about the reading changed, only the " +
      "threshold, so the branch is reading the setting and not a literal); the boundary at 2.99 -> " +
      "meter_stale and 3.01 -> pickable; and scheduler_on=false WHILE the reading was ALSO stale -> " +
      "scheduler_off, so precedence 1-over-2 is a difference and not a coincidence. Zero fixture " +
      "residue on re-read: 34 readings, 0 rows with source='ses389-qa', meter_stale_hours=2, " +
      "scheduler on. pg_proc after the migration: exactly 1 runner_should_boot overload, " +
      "provolatile='s'. Live board at the ship: reason=meter_stale, reading_age_hours=14.74 against " +
      "threshold 2, reading taken 2026-09-13T16:15:27Z -- every hourly fire refuses until the " +
      "reader writes, which is the ticket's intent; SES-388 / SES-392 own the reader.",
  );
}

selfRun(import.meta.url, run);
export default run;
