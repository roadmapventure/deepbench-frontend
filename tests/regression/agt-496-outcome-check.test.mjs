// DeepBench v7.0.890 | tests/regression/agt-496-outcome-check.test.mjs | AGT-496
//
// FEATURE: AGT-496 -- ONE CHECK ASKS DAILY WHETHER THE PLATFORM PRODUCED ANYTHING. Kickoff:
// docs/kickoffs/v7.0.890-AGT-496-outcome-check.md section 4 and section 6.
//
// THE DEFECT, measured live 2026-10-23 on the unchanged tree (not reasoned about): all four of
// `public.audit_flow_checks()`'s arms grade an ARTEFACT -- a delivered ticket left open, a gate
// stuck red, a wasted cycle, a project filing faster than it closes. None of them asks whether
// work MOVED. On the day of the measurement the board held 0 `done` settles against 28
// `delivered` ones, 3 fully-settled `drain-epic` directives nobody had retired, and the rpc
// answered no finding about any of it, because a stalled platform and a quiet one look identical
// to a check that only reads artefacts.
//
// Block (e) `flow-nothing-produced` (family `blocked`) asks the four questions a stall answers
// badly: is anything pickable, is a fully-settled drain still unretired, did any ticket settle
// `done` this week, did any builder cycle move a ticket in the window. Every arm keys off
// `runner_decisions` / `runner_verdicts` / `push_sha` -- never `backlog_items.updated_at`, whose
// unreliability is AGT-463's open subject. One row per day: the Chicago date inside `location`
// plus `UNIQUE (fingerprint, iso_week)` on `audit_findings` IS the cadence, so a day that stalls
// all day files once and not once per audit run.
//
// ARMS (kickoff section 4). A and B need the service key and are declared notRun without it:
//   A  DISCRIMINATOR (service key, read-only) -- rpc/audit_flow_checks holds EXACTLY ONE element
//      whose check_slug is `flow-nothing-produced`, family `blocked`, with exactly one `locations`
//      entry whose `location` is `runner_cycles/outcome/` + today's America/Chicago date.
//      CONTROL: the same predicate run over each of the four pre-change slugs FAILS -- so the arm
//      is reading the new element, not merely counting that the rpc answered something.
//   B  ORACLE (service key, read-only) -- the four counts recomputed from this test's OWN REST
//      reads (runner_should_boot, runner_directives + runner_drain_scope + backlog_items,
//      runner_decisions, runner_cycles), each asserted against A's `text` through its own LABELLED
//      substring, so a number landing in the wrong slot is red. CONTROL: the recomputed builder
//      count is STRICTLY LESS than every cycle in the window, so a body that dropped the
//      `SCHEDULED-AGENT:` exclusion would fail this arm.
//   C  FIRE PREDICATE (pure, no credentials) -- the OR re-implemented locally: a healthy day
//      {pick:6, drains:0, done:1, builds:4} fires nothing, and each of the four degraded ALONE
//      fires. Asserts WHICH arm fired, never only that something did (STANDARDS.md Section 4,
//      the LOO-013 lesson).
//
// NO WRITES ANYWHERE IN THIS FILE (pattern:76). Every live call is a GET or a STABLE rpc read;
// nothing is inserted, tagged, reset or cleaned up.
//
// BASELINE: RED on the unchanged tree -- `audit_flow_checks()` answers no `flow-nothing-produced`
// element at all, so arm A fails on the pre-change body and arm B has no text to read.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const SLUG = "flow-nothing-produced";
// The four arms that existed before this ship. Arm A's control runs over exactly these.
const PRE_CHANGE_SLUGS = ["flow-ship-not-closed", "flow-verdict-gate-red", "flow-wasted-cycles", "flow-filing-outpaces-closing"];
const OPEN_STATUSES = ["open", "partial", "removal proposed"];
const WINDOW_HOURS = 24;              // runner_settings.flow_check_thresholds->>'window_hours'
// The fringe arm B allows around the sliding 24 h boundary: the rpc and this test read `now()` a
// few seconds apart, so a cycle that started within the fringe may be inside one window and
// outside the other. The band is reported, and when it collapses (the usual case) the arm
// asserts exact equality instead -- the tolerance is never silent.
const FRINGE_MS = 120_000;

// --- pure: the fire predicate, block (e)'s OR ---------------------------------------------------
// Exported so SES-28's self-run guard is not the only thing that can reach it.
export function firedArms({ pick, drains, done, builds }) {
  const fired = [];
  if (pick === 0) fired.push("pick");
  if (drains > 0) fired.push("drains");
  if (done === 0) fired.push("done");
  if (builds === 0) fired.push("builds");
  return fired;
}
export function fires(counts) {
  return firedArms(counts).length > 0;
}

// --- pure: the date and week boundary block (e) uses --------------------------------------------
// `(now() AT TIME ZONE 'America/Chicago')::date`, as en-CA renders it: YYYY-MM-DD.
export function chicagoDate(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}
// `date_trunc('week', now() AT TIME ZONE 'America/Chicago')` -- Monday 00:00 of the Chicago week.
// Postgres hands that timestamp (no zone) to a timestamptz comparison, which reads it in the
// server's TimeZone; this project's server is UTC (verified live this session), so the boundary
// the DB actually applies is Monday 00:00Z of the Chicago week. Reproduced here, not guessed.
export function chicagoWeekStartUTC(at = new Date()) {
  const day = chicagoDate(at);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(at);
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday];
  assert.notStrictEqual(back, undefined, `unrecognised weekday ${weekday}`);
  const monday = new Date(`${day}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - back);
  return monday.toISOString();
}

// --- live reads (read-only) ---------------------------------------------------------------------
async function rpcRead(name) {
  const res = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
    method: "POST", headers: { ...HEAD, "Content-Type": "application/json" }, body: "{}",
  });
  const text = await res.text();
  assert.notStrictEqual(res.status, 404, `rpc/${name} does not exist -- the pre-change red, never a pass`);
  assert.ok(res.ok, `rpc/${name} returned HTTP ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}
async function rows(table, query) {
  const res = await fetch(`${BASE}/rest/v1/${table}?${query}`, { headers: HEAD });
  const text = await res.text();
  assert.ok(res.ok, `GET ${table}?${query} returned HTTP ${res.status}: ${text.slice(0, 240)}`);
  return JSON.parse(text);
}
async function countOf(table, query) {
  const res = await fetch(`${BASE}/rest/v1/${table}?${query}&select=id`, {
    headers: { ...HEAD, Prefer: "count=exact", Range: "0-0" },
  });
  assert.ok(res.status === 200 || res.status === 206, `count ${table}?${query} returned HTTP ${res.status}`);
  const range = res.headers.get("content-range") ?? "";
  const n = Number(range.split("/")[1]);
  assert.ok(Number.isInteger(n), `content-range carried no exact count for ${table}?${query}: "${range}"`);
  return n;
}
const inList = vals => `in.(${vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")})`;
const chunk = (list, size) => list.reduce((acc, v, i) => (i % size ? acc[acc.length - 1].push(v) : acc.push([v]), acc), []);

// Every delivered `drain-epic` directive none of whose scope members is still open.
async function settledDrains() {
  const delivered = await rows("runner_directives",
    `type=eq.drain-epic&status=eq.delivered&select=id,created_at&order=created_at`);
  if (!delivered.length) return { n: 0, ids: [] };
  const scope = [];
  for (const part of chunk(delivered.map(d => d.id), 100)) {
    scope.push(...await rows("runner_drain_scope", `directive_id=${inList(part)}&select=directive_id,item_id`));
  }
  const itemIds = [...new Set(scope.map(s => s.item_id).filter(Boolean))];
  const stillOpen = new Set();
  for (const part of chunk(itemIds, 100)) {
    const open = await rows("backlog_items",
      `id=${inList(part)}&status=in.${encodeURIComponent(inList(OPEN_STATUSES).slice("in.".length))}&select=id`);
    for (const b of open) stillOpen.add(b.id);
  }
  const openByDirective = new Set(scope.filter(s => stillOpen.has(s.item_id)).map(s => s.directive_id));
  const settled = delivered.filter(d => !openByDirective.has(d.id));
  return { n: settled.length, ids: settled.map(d => d.id).slice(0, 10) };
}

// Cycles in the window that moved a ticket: a push_sha, or a decision or verdict carrying a
// backlog_id. SCHEDULED-AGENT cycles are excluded -- they are not builder cycles on a ticket.
async function builderCycles(sinceISO) {
  const cycles = await rows("runner_cycles", `started_at=gte.${sinceISO}&select=id,push_sha,notes,started_at`);
  const own = cycles.filter(c => !String(c.notes ?? "").startsWith("SCHEDULED-AGENT:"));
  const moved = new Set();
  for (const part of chunk(own.map(c => c.id), 100)) {
    for (const t of ["runner_decisions", "runner_verdicts"]) {
      const hit = await rows(t, `cycle_id=${inList(part)}&backlog_id=not.is.null&select=cycle_id`);
      for (const r of hit) moved.add(r.cycle_id);
    }
  }
  const counts = at => own.filter(c => new Date(c.started_at).getTime() >= at
    && (c.push_sha !== null || moved.has(c.id))).length;
  const since = new Date(sinceISO).getTime();
  return {
    total: cycles.length,
    lo: counts(since + FRINGE_MS),      // the narrowest window the rpc could have used
    hi: counts(since - FRINGE_MS),      // the widest
  };
}

// The predicate arm A asserts and its control re-runs: exactly one element for `slug`, family
// `blocked`, exactly one location, and that location is today's outcome path.
export function dayRowOf(list, slug, day) {
  const hits = list.filter(e => e && e.check_slug === slug);
  if (hits.length !== 1) return { ok: false, why: `${hits.length} element(s) for ${slug}, expected exactly 1` };
  const el = hits[0];
  if (el.family !== "blocked") return { ok: false, why: `${slug} family is ${el.family}, expected blocked` };
  if (!Array.isArray(el.locations) || el.locations.length !== 1) {
    return { ok: false, why: `${slug} carries ${el.locations?.length} location(s), expected exactly 1` };
  }
  const want = `runner_cycles/outcome/${day}`;
  if (el.locations[0].location !== want) {
    return { ok: false, why: `${slug} location is ${el.locations[0].location}, expected ${want}` };
  }
  return { ok: true, el };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  // --- C. the fire predicate (pure) -----------------------------------------------------------
  await arm("C fire predicate", () => {
    const healthy = { pick: 6, drains: 0, done: 1, builds: 4 };
    assert.deepStrictEqual(firedArms(healthy), [], "a day with all four arms producing fires nothing");
    assert.strictEqual(fires(healthy), false);
    // Each degraded ALONE fires, and the arm that fired is the one degraded -- never just "something".
    const only = (key, value) => firedArms({ ...healthy, [key]: value });
    assert.deepStrictEqual(only("pick", 0), ["pick"], "nothing pickable fires the pick arm alone");
    assert.deepStrictEqual(only("drains", 1), ["drains"], "an unretired settled drain fires the drains arm alone");
    assert.deepStrictEqual(only("done", 0), ["done"], "no `done` settle this week fires the done arm alone");
    assert.deepStrictEqual(only("builds", 0), ["builds"], "no builder cycle fires the builds arm alone");
    // Two degraded arms both report; the OR never collapses to one reason.
    assert.deepStrictEqual(firedArms({ pick: 0, drains: 2, done: 1, builds: 4 }), ["pick", "drains"]);
    // CONTROL: a pick of 6 and a drains of 0 are the healthy values -- a predicate that fired on
    // them would make the whole check unconditional.
    assert.strictEqual(fires({ ...healthy, pick: 1 }), false, "control: one pickable ticket is still production");
  });

  if (!BASE || !KEY) {
    notRun("AGT-496 live arms (A, B)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the flow-nothing-produced element and its four counts are unverified here. Run: node --env-file-if-exists=.env.local tests/regression/agt-496-outcome-check.test.mjs");
    if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
    console.log("[AGT-496] outcome check: fire predicate verified; the live arms were declared not run");
    return ["fire-predicate"];
  }

  let element = null;

  // --- A. the discriminator -------------------------------------------------------------------
  await arm("A live flow-nothing-produced is the day's one row", async () => {
    const list = await rpcRead("audit_flow_checks");
    assert.ok(Array.isArray(list), `audit_flow_checks answered ${typeof list}, expected an array`);
    const day = chicagoDate();
    const hit = dayRowOf(list, SLUG, day);
    assert.ok(hit.ok, `${SLUG} is not the day's one row: ${hit.why}`);
    element = hit.el;
    for (const key of ["kind", "finding_type", "confidence", "check_slug", "family", "locations", "governing_fact", "proposed_resolution"]) {
      assert.ok(key in element, `the element carries ${key}`);
    }
    assert.strictEqual(element.kind, "other");
    assert.strictEqual(element.finding_type, "defect");
    assert.strictEqual(element.confidence, "high");
    assert.match(element.governing_fact, /stalled platform, not a quiet one/,
      "the governing fact is the one the kickoff worded");
    // CONTROL: the identical predicate over each pre-change slug must FAIL -- none of them keys
    // its location off the day, so an arm that passed here would be reading nothing specific.
    for (const other of PRE_CHANGE_SLUGS) {
      assert.strictEqual(dayRowOf(list, other, day).ok, false,
        `control: ${other} must not satisfy the day-row predicate (it grades an artefact, not the day)`);
    }
    console.log(`      live: ${SLUG}@${element.locations[0].location}; rpc answered ${list.length} element(s)`);
  });

  // --- B. the oracle --------------------------------------------------------------------------
  await arm("B the four counts recomputed independently", async () => {
    assert.ok(element, "arm A must have found the element before its counts can be graded");
    const text = element.locations[0].text;

    const boot = await rpcRead("runner_should_boot");
    const detail = (Array.isArray(boot) ? boot[0] : boot)?.detail ?? {};
    const pick = Number(detail.pickable_count);
    assert.ok(Number.isInteger(pick), `runner_should_boot().detail.pickable_count is not an integer: ${JSON.stringify(detail).slice(0, 160)}`);

    const drains = await settledDrains();
    const done = await countOf("runner_decisions",
      `kind=eq.ticket-status&summary=like.${encodeURIComponent("*settles `done`*")}&decided_at=gte.${chicagoWeekStartUTC()}`);
    const sinceISO = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
    const builds = await builderCycles(sinceISO);

    // Each count against its OWN labelled slot in the text: a number in the wrong slot is red.
    assert.ok(text.includes(`${pick} ticket(s) pickable now`), `recomputed pickable ${pick} is not the text's: ${text}`);
    assert.ok(text.includes(`${drains.n} fully-settled drain-epic directive(s) still unretired`),
      `recomputed settled-drain count ${drains.n} is not the text's: ${text}`);
    for (const id of drains.ids) {
      assert.ok(text.includes(id), `the text names every settled drain it counted; ${id} is missing: ${text}`);
    }
    assert.ok(text.includes(`${done} ticket(s) settled \`done\` since`), `recomputed done ${done} is not the text's: ${text}`);
    assert.ok(text.includes(`in the last ${WINDOW_HOURS} h`), `the text names the window: ${text}`);

    // The builder count, with the sliding-boundary band made explicit rather than tolerated.
    const m = text.match(/(\d+) builder cycle\(s\) moved a ticket/);
    assert.ok(m, `the text names the builder count: ${text}`);
    const live = Number(m[1]);
    if (builds.lo === builds.hi) {
      assert.strictEqual(live, builds.lo, `recomputed builder count ${builds.lo} is not the text's ${live}`);
      console.log(`      oracle: pick ${pick}, drains ${drains.n}, done ${done}, builds ${live} (exact -- no cycle on the 24 h boundary)`);
    } else {
      assert.ok(live >= builds.lo && live <= builds.hi,
        `builder count ${live} is outside the boundary band [${builds.lo}, ${builds.hi}]`);
      console.log(`      oracle: pick ${pick}, drains ${drains.n}, done ${done}, builds ${live} within [${builds.lo}, ${builds.hi}] -- a cycle sits on the 24 h boundary`);
    }

    // CONTROL: the builder count is STRICTLY less than every cycle in the window, so a body that
    // dropped the SCHEDULED-AGENT exclusion (or counted cycles that moved nothing) fails here.
    assert.ok(builds.total > 0, `the window holds cycles to exclude from; got ${builds.total}`);
    assert.ok(builds.hi < builds.total,
      `control: builder cycles (${builds.hi}) must be strictly fewer than all ${builds.total} cycles in the window`);

    // The resolution names the arms that actually fired, and only those.
    const fired = firedArms({ pick, drains: drains.n, done, builds: live });
    assert.ok(fired.length > 0, "the element exists, so at least one arm fired");
    const says = {
      pick: "nothing is pickable",
      drains: "a drain-epic directive whose whole scope has settled was never retired",
      done: "no ticket settled `done` this week",
      builds: "no builder cycle moved a ticket in the window",
    };
    for (const key of Object.keys(says)) {
      assert.strictEqual(element.proposed_resolution.includes(says[key]), fired.includes(key),
        `the resolution names the ${key} arm only when it fired (fired: ${fired.join(", ")}): ${element.proposed_resolution}`);
    }
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n  - ${failures.join("\n  - ")}`);
  console.log("[AGT-496] outcome check: one flow-nothing-produced row per day, its four counts recomputed and its fired arms named");
  return ["fire-predicate", "discriminator", "oracle"];
}

selfRun(import.meta.url, run);
export default run;
