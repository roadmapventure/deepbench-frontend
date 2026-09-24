// DeepBench v7.0.580 | tests/regression/agt-88-constant-homes.test.mjs | AGT-88 slice 1 of 2 --
// shared pick/pacing constants get one home each, and four of the five consumers read it.
//
// THE DEFECT THIS PINS. Three governing facts were hand-copied as SQL literals into several function
// bodies with nothing asserting the copies agree: the filing-lane cut `DATE '2026-08-21'` (OD-07),
// the claim expiry `INTERVAL '24 hours'` (OD-08) and the pick-blocking flag list
// `ARRAY['needs-desktop']` (OD-09); and `scheduler_gate()` re-stated four NOT NULL column defaults
// as dead COALESCE shadows (OD-15). AGT-88 moved the first two into `runner_settings`
// (`filing_lane_cutoff`, `claim_stale_hours`), the third into `public.pick_blocking_flags()`, and
// retired the shadows. `drain_epic_next()` and `backlog_mode()` keep their copies until AGT-109.
//
// Arms:
//   (A) source, no credentials -- the registry snapshot's OD-07/08/09/15 name the new homes and name
//       AGT-109 for the copies that remain (a statement that still called the literals canonical
//       would be the registry lying about where the fact lives).
//   (B) LIVE, service key -- the homes exist and answer; scheduler_gate() echoes runner_settings.
//       READ-ONLY: it never writes runner_settings, because cycles run in parallel (SES-382) and a
//       shared-fixture write collides. The mutating controls ran once, transaction-wrapped, at ship.
//   (C) DECLARED notRun -- the function bodies themselves (pg_get_functiondef is not reachable over
//       PostgREST, SES-310's refusal).

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-234-operational-defaults.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = path.join(ROOT, "docs/governance/RULES-SNAPSHOT.md");

// Each row must name its home, and every row whose fact still has a copy must name AGT-109.
export const EXPECTED = {
  "OD-07": { home: "runner_settings.filing_lane_cutoff", remainder: true },
  "OD-08": { home: "runner_settings.claim_stale_hours", remainder: true },
  "OD-09": { home: "public.pick_blocking_flags()", remainder: true },
  "OD-15": { home: "as a reader of OD-14", remainder: false },
};

export function gradeRegistry(rules) {
  const byId = new Map(rules.map(r => [r.id, r]));
  for (const [id, { home, remainder }] of Object.entries(EXPECTED)) {
    const s = String(byId.get(id)?.statement ?? "");
    assert.ok(s.includes(home),
      `${id} must name its AGT-88 home (${home}); statement: ${s.slice(0, 160)}`);
    if (remainder) {
      assert.ok(s.includes("AGT-109"),
        `${id} must name AGT-109 for the copy drain_epic_next still carries -- slice 1 is partial and the registry has to say so`);
    }
  }
  assert.ok(!/re-states each pacing default as its own COALESCE literal/.test(String(byId.get("OD-15")?.statement)),
    "OD-15 still describes the retired COALESCE shadows as current");
}

function registryArmHasTeeth(rules) {
  const broken = rules.map(r => (r.id === "OD-07"
    ? { ...r, statement: r.statement.replaceAll("runner_settings.filing_lane_cutoff", "those three function bodies") }
    : r));
  assert.throws(() => gradeRegistry(broken), "the registry arm must go red when OD-07 stops naming its home");
  const noRemainder = rules.map(r => (r.id === "OD-09" ? { ...r, statement: r.statement.replaceAll("AGT-109", "later") } : r));
  assert.throws(() => gradeRegistry(noRemainder), "the registry arm must go red when OD-09 hides the remaining copy");
}

async function rest(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status}: ${text}`);
  return text.trim() === "" ? null : JSON.parse(text);
}

async function run() {
  // (A) source arm
  const rules = parseSnapshot(fs.readFileSync(SNAPSHOT, "utf8"));
  assert.ok(rules.length > 0, "RULES-SNAPSHOT.md parsed to zero rules -- the reader is broken, not the registry");
  gradeRegistry(rules);
  registryArmHasTeeth(rules);

  // (C) declared
  notRun(
    "AGT-88 (C): the shipped bodies of scheduler_gate, drain_chain_gate, prime_directive_queue and recompute_backlog_queue",
    "pg_get_functiondef is not reachable over PostgREST (SES-310). Measured at ship (2026-09-24, v7.0.580): " +
      "pg_proc holds exactly 1 overload of each of the five names; none of the four bodies matches " +
      "date '2026-08-21' | array['needs-desktop'] | interval '24 hours' | coalesce(s.<pacing column>; " +
      "scheduler_gate keeps `if v_interval < 1`; pick_blocking_flags ACL = postgres + service_role only. " +
      "Identical answers before/after: prime_directive_queue md5 e86058923bb0aa35f463a36c3a3307dd, " +
      "in-transaction recompute_backlog_queue digest 957b4650735ffbd6251f7373d26e3f04 (676 rows).",
  );

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-88 (B): the live homes and scheduler_gate's echo of runner_settings",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent (STANDARDS.md Section 2 rule 5).");
    return;
  }

  // (B) live arm -- read-only
  const flags = await rest(url, key, "rpc/pick_blocking_flags", { method: "POST", body: "{}" });
  assert.deepEqual(flags, ["needs-desktop"], `pick_blocking_flags() must return {needs-desktop}, got ${JSON.stringify(flags)}`);

  const settings = await rest(url, key,
    "runner_settings?id=eq.1&select=scheduler_on,interval_hours,cron_minute,grid_tolerance_min,filing_lane_cutoff,claim_stale_hours");
  assert.equal(settings?.length, 1, "runner_settings id=1 must exist -- scheduler_gate now raises without it");
  const s = settings[0];
  assert.match(String(s.filing_lane_cutoff), /^\d{4}-\d{2}-\d{2}$/, "runner_settings.filing_lane_cutoff must be a stored date");
  assert.ok(Number.isInteger(s.claim_stale_hours), "runner_settings.claim_stale_hours must be a stored integer");

  // scheduler_gate is read-only; with no cycle id it anchors to p_started. An on-grid fire (minute =
  // cron_minute) must echo every setting; the verdict must follow them.
  const onGrid = new Date(Date.UTC(2026, 8, 24, 14, s.cron_minute, 0)).toISOString();
  const g = (await rest(url, key, "rpc/scheduler_gate", {
    method: "POST", body: JSON.stringify({ p_cycle_id: null, p_trigger: "scheduled", p_started: onGrid }),
  }))[0];
  assert.equal(g.scheduler_on, s.scheduler_on, "scheduler_gate must echo runner_settings.scheduler_on");
  assert.equal(g.interval_hours, Math.max(1, s.interval_hours), "scheduler_gate must echo runner_settings.interval_hours (clamped at 1)");
  assert.equal(g.is_manual, false, "a fire exactly on runner_settings.cron_minute must not be manual");
  const hourCst = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Chicago" }).format(new Date(onGrid)));
  const expected = !s.scheduler_on ? "scheduler-off" : (hourCst % Math.max(1, s.interval_hours) !== 0 ? "paced" : "run");
  assert.equal(g.verdict, expected, `scheduler_gate verdict must follow runner_settings (expected ${expected}, got ${g.verdict})`);

  console.log(`[AGT-88] registry names 4 homes (+AGT-109 remainders), each red under its break; ` +
    `pick_blocking_flags()={needs-desktop}; cutoff ${s.filing_lane_cutoff}, stale ${s.claim_stale_hours}h; ` +
    `scheduler_gate echoes settings (${g.verdict}, every ${g.interval_hours}h)`);
}

selfRun(import.meta.url, run);
export default run;
