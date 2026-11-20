// DeepBench v7.0.1074 | tests/regression/agt-310-plan-limit-notice.test.mjs | AGT-310 -- a plan-limit
// refusal becomes exactly one alert per outage, and one no-run row per missed window after it lifts.
//
// FEATURE: AGT-310 -- the plan-limit notice in scripts/read-usage-meter.js. The meter reader is the
// only sensor that runs OUTSIDE a cycle, so it is the only thing that can report a limit that refuses
// cycles before they boot. Measured 2026-11-20: 109 readings at 100%, one outage (2026-09-29T23:45Z to
// 10-02T05:45Z), and not one of them became a john_alerts row -- the week went dark and nothing said so.
//
// OFFLINE, ALWAYS RUNS. Every arm drives the SHIPPED functions against an in-memory PostgREST fake, so
// it needs no service key and no login and writes nothing. The fake is deliberately strict where the
// ticket's central claim rests on PostgREST's own behaviour rather than on ours: a POST to john_alerts
// that does not carry on_conflict=fingerprint AND Prefer resolution=ignore-duplicates gets the 409 the
// real table's unique index would give it, so "exactly one alert per outage" cannot pass by accident of
// the fake's own bookkeeping.
//
// Every clause has a negative control -- "would this still pass if the notice did nothing?"

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  limitNotice, rejectionFacts, missedWindows, noRunRow, watchLimit,
  NOTICE_SOURCE, NO_RUN_STAMP, NO_RUN_STEP, readViaHeaders, HEADER_MODELS,
} from "../../scripts/read-usage-meter.js";
import { selfRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQL_FILE = path.join(REPO, "docs", "design", "agt-310-plan-limit.sql");

// The live fixture, read read-only from runner_settings id=1 on 2026-11-20: scheduler on, cron minute
// 40, interval 1h. K is the taken_at of the newest reading UNDER the warning line before the measured
// outage; it is the key every fire of one climb builds its fingerprint from.
const SETTINGS = { scheduler_on: true, plan_limit_warn_pct: 95, cron_minute: 40, interval_hours: 1 };
const K = "2026-09-29T20:54:55.034162+00:00";
const CLOCK = "2026-09-30T01:25:58Z";
const CREDS = { url: "https://fake.supabase.test", key: "not-a-real-key" };
// The only header the measured 429s are known to carry a name for. The reset and overage header names
// are UNMEASURED (no live 429 was observable), which is why the notice prints whatever unified-* headers
// arrive and says "not reported" for a name that did not -- and why this test never invents one.
const HEADERS_429 = { "anthropic-ratelimit-unified-overage-status": "rejected" };

// --- the in-memory PostgREST ------------------------------------------------------------------

function newDb(overrides = {}) {
  return {
    now: CLOCK,
    settings: { ...SETTINGS, ...(overrides.settings || {}) },
    readings: overrides.readings || [{ taken_at: K, all_models_pct: 94 }],
    alerts: [],
    cycles: [],
    calls: [],
  };
}

function cmp(a, b) {
  const na = Number(a), nb = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  const da = Date.parse(a), db = Date.parse(b);
  if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

const META = new Set(["select", "order", "limit", "offset", "on_conflict"]);

function matches(row, q) {
  for (const [col, raw] of q.entries()) {
    if (META.has(col)) continue;
    const m = /^([a-z]+)\.([\s\S]*)$/.exec(raw);
    if (!m) throw new Error(`fake: cannot parse filter ${col}=${raw}`);
    const [, op, want] = m;
    const have = row[col];
    if (op === "eq") { if (String(have) !== want) return false; }
    else if (op === "neq") { if (String(have) === want) return false; }
    else if (op === "lt") { if (!(cmp(have, want) < 0)) return false; }
    else if (op === "gt") { if (!(cmp(have, want) > 0)) return false; }
    else if (op === "gte") { if (!(cmp(have, want) >= 0)) return false; }
    else if (op === "like") {
      const re = new RegExp("^" + want.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]*") + "$");
      if (!re.test(String(have))) return false;
    } else throw new Error(`fake: unsupported operator ${op}`);
  }
  return true;
}

function fake(db) {
  return async (url, init = {}) => {
    const u = new URL(url);
    const table = u.pathname.split("/rest/v1/")[1];
    const q = u.searchParams;
    const method = init.method || "GET";
    const headers = init.headers || {};
    db.calls.push({ table, method, search: u.search, body: init.body ? JSON.parse(init.body) : null });
    assert.strictEqual(headers.apikey, CREDS.key, "every call must carry the key the caller was handed");
    const ok = payload => ({ ok: true, status: 200, text: async () => (payload === undefined ? "" : JSON.stringify(payload)) });

    if (method === "GET") {
      const store = { runner_settings: () => [{ id: 1, ...db.settings }], runner_usage_readings: () => db.readings.slice(),
        john_alerts: () => db.alerts.slice(), runner_cycles: () => db.cycles.slice() }[table];
      if (!store) throw new Error(`fake: no GET route for ${table}`);
      let rows = store().filter(r => matches(r, q));
      const ord = q.get("order");
      if (ord) { const [col, dir] = ord.split("."); rows.sort((a, b) => cmp(a[col], b[col]) * (dir === "desc" ? -1 : 1)); }
      const lim = q.get("limit");
      if (lim) rows = rows.slice(0, Number(lim));
      return ok(rows);
    }

    if (table === "john_alerts") {
      const prefer = String(headers.Prefer || "");
      const body = JSON.parse(init.body);
      const duplicate = db.alerts.some(a => a.fingerprint === body.fingerprint);
      // The real table's unique index on fingerprint is what makes one outage one alert; the writer has
      // to ASK for the duplicate to be ignored, so a writer that forgot gets the 409 it would really get.
      if (q.get("on_conflict") !== "fingerprint" || !prefer.includes("resolution=ignore-duplicates")) {
        if (duplicate) return { ok: false, status: 409, text: async () => 'duplicate key value violates unique constraint "john_alerts_fingerprint_key"' };
      }
      if (duplicate) return ok([]);
      const row = { id: db.alerts.length + 1, created_at: db.now, ...body };
      db.alerts.push(row);
      return ok(prefer.includes("return=representation") ? [row] : undefined);
    }

    if (table === "runner_cycles") {
      const rows = JSON.parse(init.body);
      db.cycles.push(...(Array.isArray(rows) ? rows : [rows]));
      return ok(undefined);            // Prefer: return=minimal -- an empty body, as PostgREST sends
    }
    throw new Error(`fake: no ${method} route for ${table}`);
  };
}

// --- QA 1: the discriminator -- one climb is one alert ----------------------------------------

async function oneClimbIsOneAlert() {
  const db = newDb();
  const f = fake(db);
  const first = await watchLimit(CREDS, { allModelsPct: 100 }, f, Date.parse(CLOCK));
  assert.strictEqual(first.kind, "bound", `100% with the scheduler on is bound; got ${JSON.stringify(first)}`);
  assert.strictEqual(first.wrote, true, "the first fire of an outage must write the alert");
  assert.strictEqual(first.noRunRows, 0, "the ledger is never written while the limit is still up");

  const second = await watchLimit(CREDS, { allModelsPct: 100 }, f, Date.parse(CLOCK));
  assert.strictEqual(second.kind, "bound");
  assert.strictEqual(second.wrote, false, "the second fire of the SAME climb must not write a second alert");
  assert.strictEqual(db.alerts.length, 1, `one outage is one row; got ${db.alerts.length}`);

  const row = db.alerts[0];
  assert.strictEqual(row.fingerprint, `plan-limit-bound:${K}`, "the fingerprint is keyed on the last reading under the line");
  assert.strictEqual(row.source, NOTICE_SOURCE);
  assert.strictEqual(row.john_call, "money", "only John can buy extra usage, so the call is his");
  assert.strictEqual(row.ref_table, "runner_usage_readings");
  assert.ok(row.summary.includes("Sep 29, 8:25pm (America/Chicago)"),
    `the summary must say when it was first seen, in John's zone: ${row.summary}`);
  assert.ok(row.detail.includes("changes no limit and buys nothing"),
    `the notice must say it changed nothing -- spend caps are John's alone: ${row.detail}`);

  // CONTROL: the scheduler is the gate. With it off nothing is being refused, so there is nothing to say.
  const off = newDb({ settings: { scheduler_on: false } });
  const quiet = await watchLimit(CREDS, { allModelsPct: 100 }, fake(off), Date.parse(CLOCK));
  assert.strictEqual(quiet.kind, "clear", "scheduler off must be clear, not bound");
  assert.strictEqual(quiet.wrote, false);
  assert.strictEqual(off.alerts.length, 0, "the scheduler being off must write no row at all");
}

// --- QA 2: the sensor is the reader's own 429 --------------------------------------------------

async function theRejectionIsTheSignal() {
  const db = newDb();
  const r = await watchLimit(CREDS, { rejected: true, headers: HEADERS_429 }, fake(db), Date.parse(CLOCK));
  assert.strictEqual(r.kind, "bound", "a 429 to the reader's own call is the limit, whatever the meter last read");
  assert.strictEqual(r.wrote, true);
  assert.strictEqual(db.alerts.length, 1);
  const row = db.alerts[0];
  assert.strictEqual(row.john_call, "money");
  assert.ok(row.detail.includes("HTTP 429"), `the detail must name what was seen: ${row.detail}`);
  assert.ok(row.summary.includes("overage-status=rejected"), `the summary must carry the header verbatim: ${row.summary}`);
  // The names are unmeasured, so an absent one must read "not reported" rather than be guessed at.
  assert.ok(row.summary.includes("Resets not reported"), `an unmeasured reset header must say so: ${row.summary}`);

  // CONTROL: only anthropic-ratelimit-unified-* travels. A header whose meaning was never measured here
  // must not be printed as if it had been.
  const db2 = newDb();
  await watchLimit(CREDS, { rejected: true, headers: { "retry-after": "3600", "x-request-id": "req_1", ...HEADERS_429 } }, fake(db2), Date.parse(CLOCK));
  assert.ok(!db2.alerts[0].detail.includes("retry-after"), `only unified-* headers are printed: ${db2.alerts[0].detail}`);
  assert.ok(!db2.alerts[0].detail.includes("req_1"));
  assert.ok(db2.alerts[0].detail.includes("overage-status=rejected"));
}

// --- QA 3: the warning line is read, not hardcoded --------------------------------------------

async function theLineIsRead() {
  const db = newDb();
  const r = await watchLimit(CREDS, { allModelsPct: 96 }, fake(db), Date.parse(CLOCK));
  assert.strictEqual(r.kind, "warn", `96% against a line of 95 is a warning; got ${JSON.stringify(r)}`);
  assert.strictEqual(db.alerts.length, 1);
  assert.strictEqual(db.alerts[0].fingerprint, `plan-limit-warn:${K}`);
  assert.strictEqual(db.alerts[0].john_call, null, "a warning is not yet a decision for John to make");
  assert.ok(db.alerts[0].summary.includes("96%"), db.alerts[0].summary);
  assert.ok(db.alerts[0].summary.includes("95%"), `the summary must name the line it crossed: ${db.alerts[0].summary}`);

  // CONTROL: the line is John's column, not a constant. Move it to 97 and the same 96% is silent.
  const higher = newDb({ settings: { plan_limit_warn_pct: 97 } });
  const silent = await watchLimit(CREDS, { allModelsPct: 96 }, fake(higher), Date.parse(CLOCK));
  assert.strictEqual(silent.kind, "clear", "96% under a line of 97 must be clear -- the column decides, not the code");
  assert.strictEqual(higher.alerts.length, 0);
}

// --- QA 4: the ledger, written only after the limit lifts -------------------------------------

async function theLedgerIsBackFilledOnlyAfterItLifts() {
  const db = newDb();
  const f = fake(db);
  await watchLimit(CREDS, { allModelsPct: 100 }, f, Date.parse(CLOCK));      // the outage's one alert

  // CONTROL: the limit is still up -- no reading under the line after the alert, so no ledger. A
  // `scheduled` row written DURING the outage would reset runner_silence()'s clock and hide the silence.
  const during = await watchLimit(CREDS, { allModelsPct: 0 }, f, Date.parse("2026-10-02T06:00:00Z"));
  assert.strictEqual(during.noRunRows, 0, "no window may be back-filled before a reading proves the limit lifted");
  assert.strictEqual(db.cycles.length, 0);

  db.readings.push({ taken_at: "2026-10-02T06:15:04.9+00:00", all_models_pct: 0 });
  const after = await watchLimit(CREDS, { allModelsPct: 0 }, f, Date.parse("2026-10-02T06:15:05Z"));
  assert.strictEqual(after.kind, "clear", "a reading under the line says nothing new");
  assert.strictEqual(after.noRunRows, 53, `52 hours of hourly windows is 53 rows; got ${after.noRunRows}`);
  assert.strictEqual(db.cycles.length, 53);
  assert.strictEqual(db.cycles[0].started_at, "2026-09-30T01:40:00.000Z", "the first window is the cron minute after the alert");
  assert.strictEqual(db.cycles[52].started_at, "2026-10-02T05:40:00.000Z", "the last window is the one before the lifting reading");
  for (const row of db.cycles) {
    assert.strictEqual(row.trigger, "scheduled", "the window WAS scheduled -- that is the whole claim");
    assert.strictEqual(row.outcome, "did_not_run");
    assert.strictEqual(row.stamp, NO_RUN_STAMP);
    assert.strictEqual(row.last_step, NO_RUN_STEP);
    assert.strictEqual(row.ended_at, row.started_at, "a run that never started takes no time");
    assert.strictEqual(row.heartbeat_at, row.started_at);
    assert.ok(row.notes.includes(`plan-limit-bound:${K}`), `each row must point at the alert it was derived from: ${row.notes}`);
  }

  // Idempotent by construction, not by a flag: the rows it wrote are themselves fires in those windows.
  const again = await watchLimit(CREDS, { allModelsPct: 0 }, f, Date.parse("2026-10-02T07:15:05Z"));
  assert.strictEqual(again.noRunRows, 0, "a second pass must find every window already filled");
  assert.strictEqual(db.cycles.length, 53, "a second pass must not double the ledger");
}

// --- QA 5: the pure halves --------------------------------------------------------------------

function thePureHalvesHold() {
  const missed = missedWindows({ fromIso: "2026-09-30T01:25:58Z", toIso: "2026-09-30T05:00:00Z", cronMinute: 40, intervalHours: 1, fireIsos: ["2026-09-30T02:41:53.339Z"] });
  assert.deepStrictEqual(missed, ["2026-09-30T01:40:00.000Z", "2026-09-30T03:40:00.000Z", "2026-09-30T04:40:00.000Z"],
    `a window that held a fire is not missed; got ${JSON.stringify(missed)}`);
  // CONTROL: without that fire the 02:40 window is missed too -- so the fire, not the arithmetic, removed it.
  const none = missedWindows({ fromIso: "2026-09-30T01:25:58Z", toIso: "2026-09-30T05:00:00Z", cronMinute: 40, intervalHours: 1, fireIsos: [] });
  assert.deepStrictEqual(none, ["2026-09-30T01:40:00.000Z", "2026-09-30T02:40:00.000Z", "2026-09-30T03:40:00.000Z", "2026-09-30T04:40:00.000Z"]);
  // CONTROL: an unparseable bound is no windows, never a guess.
  assert.deepStrictEqual(missedWindows({ fromIso: "whenever", toIso: "2026-09-30T05:00:00Z", cronMinute: 40, intervalHours: 1, fireIsos: [] }), []);

  const facts = rejectionFacts({ "anthropic-ratelimit-unified-7d-reset": "1790920800" });
  assert.strictEqual(facts.resets, "Oct 2, 1am (America/Chicago)", `the reset epoch is rendered in John's zone; got ${facts.resets}`);
  assert.strictEqual(facts.overage, null, "no overage header is no overage claim");
  // CONTROL: a bag with nothing unified in it yields nothing at all.
  const empty = rejectionFacts({ "x-request-id": "req_1" });
  assert.strictEqual(empty.headers, "");
  assert.strictEqual(empty.resets, null);
  assert.strictEqual(empty.overage, null);

  // limitNotice is the one decision, and the scheduler gates it before anything else is read.
  assert.strictEqual(limitNotice({ schedulerOn: false, warnPct: 95, allModelsPct: 100, sinceKey: K, seenAtMs: Date.parse(CLOCK) }), null);
  assert.strictEqual(limitNotice({ schedulerOn: true, warnPct: 95, allModelsPct: 94, sinceKey: K, seenAtMs: Date.parse(CLOCK) }), null,
    "94% under a line of 95 says nothing");
  const bound = limitNotice({ schedulerOn: true, warnPct: 95, rejected: true, sinceKey: K, seenAtMs: Date.parse(CLOCK) });
  assert.strictEqual(bound.kind, "bound");
  assert.strictEqual(bound.fingerprint, `plan-limit-bound:${K}`);
  // A missing key still builds a stable fingerprint rather than `undefined`.
  assert.strictEqual(limitNotice({ schedulerOn: true, warnPct: 95, rejected: true, sinceKey: null, seenAtMs: Date.parse(CLOCK) }).fingerprint, "plan-limit-bound:none");

  const row = noRunRow("2026-09-30T01:40:00.000Z", `plan-limit-bound:${K}`);
  assert.strictEqual(row.trigger, "scheduled");
  assert.strictEqual(row.outcome, "did_not_run");
  assert.strictEqual(row.stamp, NO_RUN_STAMP);
  assert.strictEqual(row.last_step, NO_RUN_STEP);
  assert.ok(row.notes.includes("AGT-310"), `the row must say what wrote it and why: ${row.notes}`);
}

// --- QA 6: the seam -- a 429 on the GENERAL probe is the one that means the plan refused us ----

async function theSeamCarriesTheRefusal() {
  // SEAM PROOF (labelled as one): the SHIPPED readViaHeaders is driven with a stub fetch, so what is
  // asserted is what the real function returns to main(), not a description of it.
  let n = 0;
  const generalRefuses = async () => (++n === 1
    ? { status: 429, headers: HEADERS_429, text: async () => "rate limited" }
    : { status: 200, headers: {}, text: async () => "" });
  const p = await readViaHeaders("tok", generalRefuses);
  assert.strictEqual(p.error, "headers-refused", `a 429 must still be a refusal, never a reading; got ${JSON.stringify(p)}`);
  assert.strictEqual(p.status, 429, "the status must ride back so main() can tell 429 from 403");
  assert.strictEqual(p.general, true, "the general probe's refusal must be marked as the general one");
  assert.strictEqual(p.headers["anthropic-ratelimit-unified-overage-status"], "rejected",
    "the 429's own headers are the only facts the alert will ever have about it");
  assert.ok(p.detail.includes(HEADER_MODELS.general), `the detail must name the model that was refused: ${p.detail}`);

  // CONTROL: the FABLE probe refusing is not the plan refusing the reader -- no `general`, so no alert.
  let m = 0;
  const fableRefuses = async () => (++m === 1
    ? { status: 200, headers: { "anthropic-ratelimit-unified-7d-utilization": "0.57", "anthropic-ratelimit-unified-7d-reset": "1789711200" }, text: async () => "" }
    : { status: 429, headers: {}, text: async () => "rate limited" });
  const q = await readViaHeaders("tok", fableRefuses);
  assert.strictEqual(q.error, "headers-refused");
  assert.strictEqual(q.status, 429);
  assert.notStrictEqual(q.general, true, "only the general probe's 429 may be read as the plan refusing the reader");
  assert.ok(q.detail.includes(HEADER_MODELS.fable), `the detail must name the Fable model: ${q.detail}`);

  // CONTROL: a 403 is still a refusal and still carries its status, so nothing here is 429-only luck.
  const forbidden = async () => ({ status: 403, headers: {}, text: async () => JSON.stringify({ error: { type: "oauth_scope_insufficient" } }) });
  const r = await readViaHeaders("tok", forbidden);
  assert.strictEqual(r.error, "headers-refused");
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.general, true);
}

// --- QA 7: the migration mirror ---------------------------------------------------------------

function theMigrationMirrorIsOnDisk() {
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  const up = [
    "alter table public.runner_settings add column plan_limit_warn_pct numeric not null default 95 check (plan_limit_warn_pct between 1 and 99);",
    "insert into public.runner_waste_causes (cause, candidate_tickets, counts_as_waste, plain) values ('plan_limit_rejected', '{}', true, 'The Claude plan limit refused the scheduled run before it started, so nothing ran and the slot was lost.');",
  ];
  const down = [
    "alter table public.runner_settings drop column plan_limit_warn_pct;",
    "delete from public.runner_waste_causes where cause = 'plan_limit_rejected';",
  ];
  for (const stmt of [...up, ...down]) {
    assert.ok(sql.includes(stmt), `the mirror must hold this statement verbatim: ${stmt}`);
  }
  assert.ok(sql.includes("AGT-310"), "the header must name the ticket");
  assert.ok(sql.includes("v7.0.1074"), "the header must name the version");
  const downAt = sql.search(/^-- down$/m);
  assert.ok(downAt > 0, "the down marker must be a line of its own so the undo can be lifted whole");
  // CONTROL on the order: an undo that sits above its own up statements would be applied as the migration.
  for (const stmt of up) assert.ok(sql.indexOf(stmt) < downAt, `an up statement must precede the down marker: ${stmt}`);
  for (const stmt of down) assert.ok(sql.indexOf(stmt) > downAt, `a down statement must follow the down marker: ${stmt}`);
}

export async function run() {
  await oneClimbIsOneAlert();
  await theRejectionIsTheSignal();
  await theLineIsRead();
  await theLedgerIsBackFilledOnlyAfterItLifts();
  thePureHalvesHold();
  await theSeamCarriesTheRefusal();
  theMigrationMirrorIsOnDisk();
  console.log("  [PASS] agt-310-plan-limit-notice.test.mjs");
  console.log("         notice: 100% twice -> 1 john_alerts row plan-limit-bound:<K>, wrote true then false, first seen Sep 29, 8:25pm CT; scheduler off -> clear, 0 rows");
  console.log("         sensor: the reader's own 429 -> bound, john_call money, HTTP 429 in the detail, overage-status=rejected verbatim, unmeasured reset reads 'not reported'; non-unified headers dropped");
  console.log("         line: 96% vs 95 -> plan-limit-warn:<K> with both numbers; CONTROL line 97 -> clear, 0 rows");
  console.log("         ledger: after the lift, 53 no-run rows 2026-09-30T01:40Z..2026-10-02T05:40Z, each scheduled/did_not_run; during the outage 0; second pass 0 new");
  console.log("         pure: missedWindows skips the window that held a fire (3 of 4); reset epoch -> Oct 2, 1am CT; seam-proved 429 carries status 429 + general true, Fable's 429 does not");
  console.log("         static: docs/design/agt-310-plan-limit.sql holds all four statements, up before the down marker");
}

selfRun(import.meta.url, run);
export default run;
