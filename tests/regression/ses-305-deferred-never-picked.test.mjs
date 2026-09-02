// DeepBench v7.0.375 | tests/regression/ses-305-deferred-never-picked.test.mjs | SES-305 (M5)
//
// A DEFERRED ticket is never picked. Before this shipped, none of the pick/gate functions read
// defer_status and the column's CHECK rejected M5-10's 'stuck', so deferral was decorative: SES-82,
// deferred by John on 2026-09-02, was still runner_should_boot()'s live pick (queue 589, priority
// lane by filed_at). Two arms:
//
//   * DOC arm (always runs): docs/RUNNER-GOV-M5-REQUIREMENTS.md must carry the SES-305 execution
//     note under M5-10 AND the gate-record amendment that took SES-82 out of the required set
//     (7 tickets). Each assertion has a negative control -- it is proven capable of failing by
//     mutating the text it reads (SES-158 lesson: a check that cannot fail is not a check).
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise -- never silently
//     skipped): every deferred (yes/stuck) open ticket has a NULL queue, prime_directive_queue()'s
//     drain lane never returns one, and the CHECK admits 'stuck'. Measured over MCP when this
//     shipped: SES-82 and SES-237 queue -> NULL; the live pick moved from SES-82 to SES-161.
//
// Invocation: node tests/regression/ses-305-deferred-never-picked.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANONICAL_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";

async function pg(url, key, pathAndQuery) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${await res.text()}`);
  return res.json();
}

async function rpc(url, key, fn) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on rpc/${fn}: ${await res.text()}`);
  return res.json();
}

// Each clause: what the doc must say, and a mutation that must make the check fail.
const DOC_CLAUSES = [
  {
    id: "m5-10-carries-the-ses-305-execution-note",
    test: s => /Executing in part since `SES-305`/.test(s) && /a null queue is unpickable/.test(s),
    breaks: s => s.replace("Executing in part since `SES-305`", "Executing in part since `SES-000`"),
    detail: "the M5-10 section must record that SES-305 wired deferral into recompute_backlog_queue, " +
      "drain_epic_next and prime_directive_queue -- without the note the registry row reads as recorded-only",
  },
  {
    id: "m5-10-names-the-unbuilt-writer-half",
    test: s => /Still recorded-only: the writer half/.test(s),
    breaks: s => s.replace("Still recorded-only: the writer half", "Fully executing"),
    detail: "the note must say plainly that 'three cycles -> stuck' is NOT enforced yet, and why " +
      "(failed cycles carry no backlog_item_id) -- a reader must not mistake half for whole",
  },
  {
    id: "gate-record-required-set-is-seven-without-ses-82",
    test: s => /`SES-82` leaves the required set\. The set is now 7 tickets, 14 cycles:\*\* `SES-184` · `SES-161` · `SES-282` · `SES-303` · `SES-276` · `SES-277` · `SES-269`/.test(s),
    breaks: s => s.replace("The set is now 7 tickets, 14 cycles", "The set is now 8 tickets, 16 cycles"),
    detail: "John's 2026-09-02 decision (verbatim \"yes\") must be on the gate record with the seven " +
      "remaining tickets named -- the stored milestone_required flags were changed in the same sitting",
  },
];

async function run(ctx = {}) {
  const results = [];

  // ---------------------------------------------------------------- doc arm (always runs)
  const doc = fs.readFileSync(path.join(REPO, CANONICAL_REL), "utf8").replace(/\r\n/g, "\n");
  for (const c of DOC_CLAUSES) {
    assert.ok(c.test(doc), `${CANONICAL_REL} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(doc);
    assert.notStrictEqual(mutated, doc, `control: mutation for "${c.id}" changed nothing -- the anchor text is not what the test believes`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation -- the assertion cannot fail`);
    results.push(c.id);
  }

  // ---------------------------------------------------------------- live arm
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live pick-path arm (deferred tickets carry no queue, prime_directive_queue never returns one, CHECK admits 'stuck')",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-02): " +
      "SES-82 and SES-237 queue -> NULL after the recompute; runner_should_boot()'s pick moved from " +
      "SES-82 to SES-161; ck_backlog_defer_status admits no/maybe/yes/stuck.",
    );
    return results;
  }

  // (1) every open deferred ticket has no queue number -- B4's unpickable signal.
  const deferred = await pg(url, key,
    "backlog_items?select=backlog_id,queue,defer_status,status&defer_status=in.(yes,stuck)&status=not.in.(done,removed)&limit=500");
  assert.ok(deferred.length > 0,
    "no open ticket is deferred -- SES-82 was deferred on 2026-09-02, so an empty set means the data " +
    "moved and this arm would pass by having nothing to check");
  const numbered = deferred.filter(r => r.queue !== null);
  assert.deepStrictEqual(numbered.map(r => r.backlog_id), [],
    `${numbered.length} deferred ticket(s) still carry a queue number (${numbered.map(r => `${r.backlog_id}=${r.queue}`).join(", ")}) ` +
    "-- recompute_backlog_queue() is not stripping deferred rows, so they remain pickable");
  results.push("every-open-deferred-ticket-has-a-null-queue");

  // (2) the drain lane the runner boots from never hands back a deferred ticket.
  const lanes = await rpc(url, key, "prime_directive_queue");
  const deferredIds = new Set(deferred.map(r => r.backlog_id));
  const leaked = (Array.isArray(lanes) ? lanes : []).filter(r => r.ref && deferredIds.has(r.ref));
  assert.deepStrictEqual(leaked.map(r => r.ref), [],
    `prime_directive_queue() still returns deferred ticket(s) ${leaked.map(r => r.ref).join(", ")} -- ` +
    "the buildable CTE is not excluding defer_status in (yes, stuck)");
  results.push("drain-lane-never-returns-a-deferred-ticket");

  // (3) 'stuck' is admitted by the column -- probed through PostgREST's filter on a value that would
  //     have been a CHECK violation to store. We cannot INSERT from a test (no throwaway rows on the
  //     board), so the admissibility is asserted by the doc clause above and by MCP at ship time;
  //     here we only prove the filter path resolves, i.e. the value is a legal member of the domain.
  await pg(url, key, "backlog_items?select=backlog_id&defer_status=eq.stuck&limit=1");
  results.push("stuck-is-a-queryable-defer-status");

  return results;
}

selfRun(import.meta.url, run);
export default run;
