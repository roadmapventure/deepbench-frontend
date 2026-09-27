// DeepBench v7.0.658 | tests/regression/agt-237-db-health.test.mjs | AGT-237 -- the runner reads the
// database's health every 5 minutes and stops starting work into an outage.
//
// WHAT THIS GUARDS, and why each arm discriminates (STANDARDS.md Section 4, the LOO-013 lesson):
//   A  PURE -- scripts/db-pressure.js: the exit-code contract (0 green / 1 amber / 3 red, unsafe,
//      non-200 or no answer / 2 no credentials) and --hold's backoff and cap, driven with an injected
//      fetch, clock and sleep. A --hold against a red database must exit 4 at --max-minutes=1 having
//      printed one line per wait, and must RELEASE on amber -- asserting only "exited" would pass a
//      loop that never waited at all.
//   B  LIVE, READ-ONLY (SUPABASE_URL + SUPABASE_SERVICE_KEY; notRun otherwise) -- rpc/db_health_parse
//      over a fixture cut from the REAL metrics endpoint (2026-09-27 18:5x UTC, the thrashing NANO
//      instance), rpc/db_health_grade over a table built from the LIVE thresholds (each threshold
//      -1 / at / +1, the probe status edges, no answer, no metrics and the restart reset), and
//      rpc/db_health_level's closed set. Nothing here calls db_health_tick() with the service key:
//      a tick fires two HTTP requests and writes a reading, and a regression run never mutates
//      working data (pattern:76).
//   C  ANON IS REFUSED (VITE_SUPABASE_ANON_KEY; notRun otherwise) -- db_health_level, db_health_tick
//      and the db_health_readings table, while B proves the service key still reads them (both
//      directions, .claude/rules/supabase-column-grants.md).
//
// DRY-RUN against the tree before this ticket: A fails at import (scripts/db-pressure.js does not
// exist), B fails at its first request (PostgREST answers rpc/db_health_parse with 404) and C's
// denials would pass vacuously -- which is why C only runs after B has proved the objects exist.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  parseArgs, checkCode, holds, nextWait, main, FIRST_WAIT_MS, MAX_WAIT_MS,
} from "../../scripts/db-pressure.js";

// Cut verbatim from GET /customer/v1/privileged/metrics, 2026-09-27, including the HELP/TYPE lines
// and the node_cpu_guest_seconds_total family, which shares a prefix with the counter summed and
// must NOT be summed. Two CPUs, as measured.
const L = 'supabase_project_ref="rallojeqnkgtxgsdsnqm",supabase_identifier="rallojeqnkgtxgsdsnqm"';
export const METRICS_FIXTURE = [
  "# HELP node_cpu_seconds_total Seconds the CPUs spent in each mode.",
  "# TYPE node_cpu_seconds_total counter",
  ...[
    ["0", "idle", "6056.16"], ["0", "iowait", "428.52"], ["0", "irq", "0"], ["0", "nice", "0.08"],
    ["0", "softirq", "12.36"], ["0", "steal", "17.72"], ["0", "system", "144.49"], ["0", "user", "403.05"],
    ["1", "idle", "6067.14"], ["1", "iowait", "428.89"], ["1", "irq", "0"], ["1", "nice", "0.15"],
    ["1", "softirq", "12.26"], ["1", "steal", "17.89"], ["1", "system", "145.93"], ["1", "user", "389.97"],
  ].map(([cpu, mode, v]) => `node_cpu_seconds_total{${L},service_type="db",cpu="${cpu}",mode="${mode}"} ${v}`),
  `node_cpu_guest_seconds_total{${L},service_type="db",cpu="0",mode="nice"} 0`,
  `node_cpu_guest_seconds_total{${L},service_type="db",cpu="0",mode="user"} 0`,
  "# HELP node_memory_MemAvailable_bytes Memory information field MemAvailable_bytes.",
  "# TYPE node_memory_MemAvailable_bytes gauge",
  `node_memory_MemAvailable_bytes{${L},service_type="db"} 1.09006848e+08`,
  `node_memory_SwapTotal_bytes{${L},service_type="db"} 1.073737728e+09`,
  `node_memory_SwapFree_bytes{${L},service_type="db"} 6.25496064e+08`,
  "# HELP node_vmstat_pswpin /proc/vmstat information field pswpin.",
  "# TYPE node_vmstat_pswpin untyped",
  `node_vmstat_pswpin{${L},service_type="db"} 2.010925e+06`,
  `node_vmstat_pswpout{${L},service_type="db"} 1.886852e+06`,
  "# HELP pg_stat_database_num_backends The number of active backends",
  "# TYPE pg_stat_database_num_backends gauge",
  `pg_stat_database_num_backends{${L},service_type="postgresql",server="localhost:5432"} 10`,
].join("\n");

// Hand-summed from the sixteen lines above -- an independent oracle, not read back off the parser.
export const FIXTURE_EXPECTED = {
  cpu_iowait_s: 857.41,                 // 428.52 + 428.89
  cpu_total_s: 14124.61,                // 7062.38 (cpu0) + 7062.23 (cpu1)
  mem_available_bytes: 109006848,
  swap_total_bytes: 1073737728,
  swap_free_bytes: 625496064,
  pswpin: 2010925,
  pswpout: 1886852,
  backends: 10,
};

// ---------------------------------------------------------------------------------------------
// A -- scripts/db-pressure.js, pure
// ---------------------------------------------------------------------------------------------

const ENV = { SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_KEY: "k" };
const answer = (level, status = 200) => async () => ({
  status,
  text: async () => JSON.stringify([{ level, reasons: [`fixture ${level}`], age_minutes: 1, reading_at: null }]),
});

async function armPure() {
  assert.deepStrictEqual(parseArgs(["--check"]), { mode: "check", maxMinutes: 60 });
  assert.deepStrictEqual(parseArgs(["--hold", "--max-minutes=1"]), { mode: "hold", maxMinutes: 1 });
  for (const bad of [[], ["--check", "--hold"], ["--check", "--max-minutes=5"], ["--hold", "--max-minutes=0"], ["--hold", "--x"]]) {
    assert.ok(parseArgs(bad).error, `parseArgs(${JSON.stringify(bad)}) must be a usage error`);
  }

  assert.strictEqual(checkCode("green"), 0);
  assert.strictEqual(checkCode("amber"), 1);
  for (const l of ["red", "unsafe", null, undefined, "purple"]) {
    assert.strictEqual(checkCode(l), 3, `${l} must fail closed to 3 (ARCHITECTURE.md §19o)`);
  }
  assert.strictEqual(holds("amber"), false, "--hold waits only while red or unsafe; amber releases");
  assert.strictEqual(holds("red"), true);
  assert.strictEqual(holds("unsafe"), true);

  const waits = [];
  for (let w = 0, i = 0; i < 7; i++) waits.push((w = nextWait(w)));
  assert.deepStrictEqual(waits, [5000, 10000, 20000, 40000, 80000, 120000, 120000],
    `the backoff is 5 s doubling to 120 s; got ${waits}`);
  assert.strictEqual(FIRST_WAIT_MS, 5000);
  assert.strictEqual(MAX_WAIT_MS, 120000);

  const quiet = [];
  const out = s => quiet.push(s);
  assert.strictEqual(await main(["--check"], { env: {}, out }), 2, "no credentials is exit 2");
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: answer("green"), out }), 0);
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: answer("amber"), out }), 1);
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: answer("red"), out }), 3);
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: answer("unsafe"), out }), 3);
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: answer("green", 503), out }), 3,
    "a non-200 is 3 even when the body says green");
  assert.strictEqual(await main(["--check"], { env: ENV, doFetch: async () => { throw new Error("ECONNRESET"); }, out }), 3,
    "no answer is 3");

  // THE QA CASE: --hold against red exits 4 at --max-minutes=1, having waited 5+10+20+25 s.
  let clock = 0;
  const lines = [];
  const code = await main(["--hold", "--max-minutes=1"], {
    env: ENV, doFetch: answer("red"), now: () => clock, sleep: async ms => { clock += ms; }, out: s => lines.push(s),
  });
  assert.strictEqual(code, 4, `--hold against red must exit 4 at the cap; got ${code}\n${lines.join("\n")}`);
  const holding = lines.filter(l => l.includes("holding"));
  assert.deepStrictEqual(holding.map(l => /next look in (\d+) s/.exec(l)?.[1]), ["5", "10", "20", "25"],
    `one printed line per wait, 5 s doubling, the last one clipped to the cap; got\n${lines.join("\n")}`);
  assert.ok(/still held after 1 min/.test(lines.at(-1)), `the last line names the cap; got ${lines.at(-1)}`);

  // Release: red, red, then amber -> 0 after exactly two waits.
  clock = 0;
  const seq = ["red", "red", "amber"];
  const rel = [];
  const code2 = await main(["--hold"], {
    env: ENV, doFetch: async (...a) => answer(seq.shift() ?? "amber")(...a),
    now: () => clock, sleep: async ms => { clock += ms; }, out: s => rel.push(s),
  });
  assert.strictEqual(code2, 0, "amber releases a hold");
  assert.strictEqual(rel.filter(l => l.includes("holding")).length, 2, `two waits, then release; got\n${rel.join("\n")}`);
  assert.strictEqual(clock, 15000, "5 s + 10 s waited before the release");
  return "db-pressure.js contract";
}

// ---------------------------------------------------------------------------------------------
// B / C -- live, read-only
// ---------------------------------------------------------------------------------------------

async function rpc(base, key, fn, body) {
  const r = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const text = await r.text();
  if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const close = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;

async function armLive(base, key) {
  // Parse: every key, against the hand-summed oracle.
  const parsed = await rpc(base, key, "db_health_parse", { p_text: METRICS_FIXTURE });
  for (const [k, v] of Object.entries(FIXTURE_EXPECTED)) {
    assert.ok(close(parsed[k], v), `db_health_parse().${k} = ${parsed[k]}, expected ${v}`);
  }
  // Discriminating control: drop cpu1's iowait line and the sum must move by exactly 428.89.
  const minusOne = METRICS_FIXTURE.split("\n").filter(l => !(l.includes('cpu="1"') && l.includes('mode="iowait"'))).join("\n");
  assert.notStrictEqual(minusOne, METRICS_FIXTURE, "control: the mutation changed nothing (the SES-158 failure)");
  const parsed2 = await rpc(base, key, "db_health_parse", { p_text: minusOne });
  assert.ok(close(parsed2.cpu_iowait_s, 428.52), `iowait must sum over CPUs; dropping cpu1 left ${parsed2.cpu_iowait_s}`);
  const empty = await rpc(base, key, "db_health_parse", { p_text: "# HELP nothing\nfoo NaN\n" });
  assert.strictEqual(empty.cpu_total_s, null, "a metric absent from the text is null, never 0");

  // Grade: built from the LIVE thresholds, never a literal -- move the setting and this table moves.
  const settings = await (await fetch(`${base}/rest/v1/runner_settings?id=eq.1&select=db_health_thresholds`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })).json();
  const t = settings?.[0]?.db_health_thresholds;
  assert.ok(t && Number.isFinite(Number(t.red_iowait_pct)) && Number.isFinite(Number(t.amber_probe_ms)),
    `runner_settings.db_health_thresholds is missing or malformed: ${JSON.stringify(t)}`);
  const prev = { cpu_iowait_s: 0, cpu_total_s: 0 };
  const io = pct => ({ cpu_iowait_s: pct, cpu_total_s: 100 });
  const grade = async (p, c, status, ms) =>
    (await rpc(base, key, "db_health_grade", { prev: p, cur: c, probe_status: status, probe_ms: ms, t }))[0];
  const ra = Number(t.red_iowait_pct), aa = Number(t.amber_iowait_pct);
  const rp = Number(t.red_probe_ms), ap = Number(t.amber_probe_ms);
  const table = [
    ["iowait amber-1", prev, io(aa - 1), 200, 10, "green"],
    ["iowait amber", prev, io(aa), 200, 10, "amber"],
    ["iowait amber+1", prev, io(aa + 1), 200, 10, "amber"],
    ["iowait red-1", prev, io(ra - 1), 200, 10, "amber"],
    ["iowait red", prev, io(ra), 200, 10, "red"],
    ["iowait red+1", prev, io(ra + 1), 200, 10, "red"],
    ["probe amber-1 ms", prev, io(0), 200, ap - 1, "green"],
    ["probe amber ms", prev, io(0), 200, ap, "amber"],
    ["probe amber+1 ms", prev, io(0), 200, ap + 1, "amber"],
    ["probe red-1 ms", prev, io(0), 200, rp - 1, "amber"],
    ["probe red ms", prev, io(0), 200, rp, "red"],
    ["probe red+1 ms", prev, io(0), 200, rp + 1, "red"],
    ["probe HTTP 199", prev, io(0), 199, 10, "red"],
    ["probe HTTP 200", prev, io(0), 200, 10, "green"],
    ["probe HTTP 299", prev, io(0), 299, 10, "green"],
    ["probe HTTP 300", prev, io(0), 300, 10, "red"],
    ["probe HTTP 503", prev, io(0), 503, 10, "red"],
    ["probe no answer", prev, io(0), null, null, "red"],
    ["no metrics", prev, null, 200, 10, "amber"],
    ["first reading", null, io(99), 200, 10, "green"],
    // THE RESTART RESET: the counters went DOWN, so a 90% "delta" must not be graded at all.
    ["restart reset", { cpu_iowait_s: 500, cpu_total_s: 9000 }, { cpu_iowait_s: 90, cpu_total_s: 100 }, 200, 10, "green"],
  ];
  for (const [label, p, c, status, ms, want] of table) {
    const g = await grade(p, c, status, ms);
    assert.strictEqual(g.level, want, `${label}: graded ${g.level}, expected ${want} (reasons ${JSON.stringify(g.reasons)})`);
  }
  const reset = await grade(table.at(-1)[1], table.at(-1)[2], 200, 10);
  assert.strictEqual(reset.iowait_pct, null, "the restart case must store no iowait_pct");
  assert.ok(reset.reasons.some(r => /went down/.test(r)), `the restart case must SAY why it was not graded: ${reset.reasons}`);
  // Control for the reset: the same 90% on a counter that went UP is red -- so "green" above is the
  // reset branch firing, not iowait being ignored.
  const up = await grade({ cpu_iowait_s: 0, cpu_total_s: 0 }, { cpu_iowait_s: 90, cpu_total_s: 100 }, 200, 10);
  assert.strictEqual(up.level, "red", "control: 90% on rising counters must be red");

  const level = await rpc(base, key, "db_health_level");
  assert.strictEqual(level.length, 1, `db_health_level() returned ${level.length} rows`);
  assert.ok(["green", "amber", "red", "unsafe"].includes(level[0].level),
    `db_health_level() answered ${JSON.stringify(level[0].level)}`);
  const read = await fetch(`${base}/rest/v1/db_health_readings?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(read.ok, `the service key must still read db_health_readings (HTTP ${read.status})`);
  return `parse, ${table.length}-case grade table, level=${level[0].level}`;
}

async function armAnon(base, anon) {
  const h = { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" };
  for (const fn of ["db_health_level", "db_health_tick"]) {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: h, body: "{}" });
    await r.text().catch(() => "");
    assert.ok(!r.ok, `anon executed ${fn} (HTTP ${r.status}) -- the REVOKE did not take`);
  }
  const t = await fetch(`${base}/rest/v1/db_health_readings?select=id&limit=1`, { headers: h });
  await t.text().catch(() => "");
  assert.ok(!t.ok, `anon read db_health_readings (HTTP ${t.status}) -- the table REVOKE did not take`);
  return "anon refused on db_health_level, db_health_tick and db_health_readings";
}

async function run() {
  const results = [await armPure()];
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("the live arm (parse fixture, grade table, level, anon refusal)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Canonical invocation: STANDARDS.md Section 2 rule 5.");
    return results;
  }
  results.push(await armLive(base, key));
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (anon) {
    results.push(await armAnon(base, anon));
  } else {
    notRun("the anon-denied half of the grant check",
      "VITE_SUPABASE_ANON_KEY absent; the service_role half above still ran. The migration's own trailing " +
      "DO block asserted has_function_privilege('anon'|'authenticated', ..., 'EXECUTE') = false on all six " +
      "functions and zero anon/authenticated grant rows on db_health_readings.");
  }
  console.log(`[AGT-237] ${results.join("; ")}`);
  return results;
}

selfRun(import.meta.url, run);
export default run;
