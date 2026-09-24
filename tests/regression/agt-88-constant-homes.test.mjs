// DeepBench v7.0.584 | tests/regression/agt-88-constant-homes.test.mjs | AGT-88, both slices --
// shared pick/pacing constants get one home each, and EVERY consumer reads it.
//
// THE DEFECT THIS PINS. Three governing facts were hand-copied as SQL literals into several function
// bodies with nothing asserting the copies agree: the filing-lane cut `DATE '2026-08-21'` (OD-07),
// the claim expiry `INTERVAL '24 hours'` (OD-08) and the pick-blocking flag list
// `ARRAY['needs-desktop']` (OD-09); and `scheduler_gate()` re-stated four NOT NULL column defaults
// as dead COALESCE shadows (OD-15). AGT-88 moved the first two into `runner_settings`
// (`filing_lane_cutoff`, `claim_stale_hours`), the third into `public.pick_blocking_flags()`, and
// retired the shadows.
//
// AGT-109 (v7.0.584) CLOSED THE REMAINDER, so this file's registry arm INVERTED. Slice 1 asserted
// that OD-07/08/09 each still named AGT-109 as an outstanding copy; `drain_epic_next` and
// `backlog_mode` now read the homes, so that assertion would pin a fact that is no longer true. The
// arm now asserts the opposite: each row names its home AND records that the last consumer reads it
// SINCE AGT-109, and no row may describe a copy as still outstanding. Both directions have teeth
// below -- a row that re-opens the copy and a row that quietly drops the completion each go red.
//
// Arms:
//   (A) source, no credentials -- the registry snapshot's OD-07/08/09/15 name the new homes, and
//       OD-07/08/09 record the AGT-109 completion with no outstanding copy (a statement that still
//       called the literals canonical would be the registry lying about where the fact lives).
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

// Each row must name its home. `closedBy` marks the three rows whose last copy AGT-109 retired:
// they must record the completion, and they must NOT describe a copy as still outstanding.
export const EXPECTED = {
  "OD-07": { home: "runner_settings.filing_lane_cutoff", closedBy: "AGT-109" },
  "OD-08": { home: "runner_settings.claim_stale_hours", closedBy: "AGT-109" },
  "OD-09": { home: "public.pick_blocking_flags()", closedBy: "AGT-109" },
  "OD-15": { home: "as a reader of OD-14" },
};

// The shapes a statement uses to say a consumer has NOT been re-pointed yet. Matching any of these
// after AGT-109 means the registry is describing a copy that no longer exists.
const OUTSTANDING_COPY = /\b(?:until|pending|ahead of|before)\s+AGT-109\b|\bstill\s+(?:spells|carry|carries|declares|keeps|holds)\b|\bkeeps? (?:its own|three) (?:identical )?cop(?:y|ies)\b/i;

export function gradeRegistry(rules) {
  const byId = new Map(rules.map(r => [r.id, r]));
  for (const [id, { home, closedBy }] of Object.entries(EXPECTED)) {
    const s = String(byId.get(id)?.statement ?? "");
    assert.ok(s.includes(home),
      `${id} must name its AGT-88 home (${home}); statement: ${s.slice(0, 160)}`);
    if (closedBy) {
      assert.ok(new RegExp(`since\\s+${closedBy}\\b`).test(s),
        `${id} must record that its last consumer reads the home since ${closedBy} -- AGT-109 shipped, and a registry that does not say so leaves the fact looking half-homed; statement: ${s.slice(0, 200)}`);
      assert.ok(!OUTSTANDING_COPY.test(s),
        `${id} still describes a hand-copied literal as outstanding, but ${closedBy} retired the last one -- the registry must not point at a copy that no longer exists; statement: ${s.slice(0, 200)}`);
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

  // AGT-109 inverted the remainder, so the break inverted with it: the failure to catch is now a row
  // that RE-OPENS the copy slice 2 closed -- the exact sentence this ticket deleted.
  const reopened = rules.map(r => (r.id === "OD-09"
    ? { ...r, statement: `${r.statement} public.drain_epic_next() still declares its own identical c_flagged array until AGT-109.` }
    : r));
  assert.throws(() => gradeRegistry(reopened),
    "the registry arm must go red when OD-09 re-declares drain_epic_next's copy as outstanding");

  // and the other direction: a row that drops the completion says nothing about where the fact lives.
  const silent = rules.map(r => (r.id === "OD-08"
    ? { ...r, statement: r.statement.replaceAll("since AGT-109", "eventually") }
    : r));
  assert.throws(() => gradeRegistry(silent),
    "the registry arm must go red when OD-08 stops recording that its last consumers read the home");
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
    "AGT-88 (C): the shipped bodies of scheduler_gate, drain_chain_gate, prime_directive_queue, " +
      "recompute_backlog_queue, drain_epic_next and backlog_mode",
    "pg_get_functiondef is not reachable over PostgREST (SES-310). Slice 1 (2026-09-24, v7.0.580): " +
      "pg_proc holds exactly 1 overload of each of the five names; none of the four bodies matches " +
      "date '2026-08-21' | array['needs-desktop'] | interval '24 hours' | coalesce(s.<pacing column>; " +
      "scheduler_gate keeps `if v_interval < 1`; pick_blocking_flags ACL = postgres + service_role only. " +
      "Identical answers before/after: prime_directive_queue md5 e86058923bb0aa35f463a36c3a3307dd, " +
      "in-transaction recompute_backlog_queue digest 957b4650735ffbd6251f7373d26e3f04 (676 rows). " +
      "Slice 2 (2026-09-24, v7.0.584, migration agt109_constant_homes_slice2, each body patched from its " +
      "own pg_get_functiondef output): pg_proc holds exactly 1 overload of drain_epic_next, backlog_mode " +
      "and drain_chain_gate, and across those three bodies the count of DATE '2026-08-21' | " +
      "INTERVAL '24 hours' | ARRAY['needs-desktop'] | COALESCE(v_set.chain_max_noship_streak is 0/0/0/0; " +
      "drain_epic_next now reads pick_blocking_flags() x1, filing_lane_cutoff x1, claim_stale_hours x2, " +
      "with c_flagged's nine other uses untouched. Value preservation, rolled-back transactions: the " +
      "seeded drain returns byte-identical blocked_detail before and after, and each knob moves only " +
      "after -- claim_stale_hours=0 turns blocked into pick AGT-109; filing_lane_cutoff=2027-01-01 drops " +
      "'1 awaiting a scope rationale (AGT-88)'; widening pick_blocking_flags() turns '1 blocked on " +
      "another ticket' into '1 waiting on you (AGT-88 (needs-decision))'; backlog_mode's 3h call goes " +
      "'in development' to 'open'. drain_chain_gate's COALESCE removal is DEAD-CODE ONLY " +
      "(chain_max_noship_streak is NOT NULL, live value 4): no arm can move it, and the zero count above " +
      "is its whole proof.",
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

  console.log(`[AGT-88] registry names 4 homes, 3 closed by AGT-109 with no copy outstanding, each red under its break; ` +
    `pick_blocking_flags()={needs-desktop}; cutoff ${s.filing_lane_cutoff}, stale ${s.claim_stale_hours}h; ` +
    `scheduler_gate echoes settings (${g.verdict}, every ${g.interval_hours}h)`);
}

selfRun(import.meta.url, run);
export default run;
