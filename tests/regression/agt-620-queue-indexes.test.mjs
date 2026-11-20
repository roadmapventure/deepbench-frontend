// DeepBench v7.0.1068 | tests/regression/agt-620-queue-indexes.test.mjs | AGT-620 -- the pick queue stops scanning the whole backlog once per ticket.
//
// THE DEFECT, measured 2026-11-20 with the service key under EXPLAIN (ANALYZE, BUFFERS) over 1,581
// backlog rows: `public.prime_directive_queue()` reads 2,432,278 shared buffers in 3,118 ms, and
// `public.audit_flow_checks()` -- which the boot gate and scripts/audit-run-review.js read -- pays
// that cost once per call (3,507 ms / 2,685,021 hits). Two missing indexes account for nearly all
// of it: `effective_need_score(b.id)` seq-scans backlog_items (1,026 pages) for `blocked_by = p_id`
// once per row (1,627,509 hits, 1,662 ms) though only 87 rows carry a `blocked_by`, and the
// `M_ design gate%` subplan walks backlog_items_epic_id_idx 1,581 times (104,171 hits) for 5
// matching rows. On a temp copy of the live rows the two partial indexes below take those to 1,667
// and 1,574 hits. The ceiling is 8 s, not 3 s: `anon` holds no EXECUTE on audit_flow_checks() and
// its caller uses the service key under `authenticator` (statement_timeout=8s).
//
// TWO ARMS.
//   A  repo -- the committed mirror of the migration carries BOTH partial indexes, each with the
//      predicate that makes it partial, and the buffer bar whose raise rolls the whole migration
//      back. What ships is the guarded form, never a draft.
//   B  live, READ-ONLY -- 2 POSTs, body `{}`, service key; writes nothing. Declared NOT RUN
//      without credentials (SES-180 notRun()), never silently skipped.
//
// WHY ARM B NEVER ASSERTS A TIME, and only prints one: a timing assertion grades the live world --
// a smaller board answers fast with the indexes still missing, and a loaded one answers slow with
// them in place (pattern:162). The bar that grades THIS CHANGE is the mirror's own `do` block,
// evaluated inside the apply, where a raise rolls the indexes back. Arm B's job is that the two
// rpcs still answer 200 with the same shape after the change, and its times are the evidence a
// reader wants next to the before/after EXPLAIN pair.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIRROR = path.join(ROOT, "docs/design/agt-620-queue-indexes.sql");

// Held as the mirror's own literals so arm A fails if any one of them is dropped from what ships.
const GUARDS = [
  ["backlog_items_blocked_by_idx", "the index that stops effective_need_score() seq-scanning the backlog per row"],
  ["where blocked_by is not null", "the predicate that keeps it to the 87 rows that have a blocker"],
  ["backlog_items_design_gate_idx", "the index the design-gate subplan must use instead of walking the epic index 1,581 times"],
  ["where title ilike 'M_ design gate%'", "the predicate that keeps it to the 5 design-gate rows"],
  ["hits >= 1200000", "the buffer bar whose raise rolls the migration back"],
];

const CREATE_INDEX = "create index";
const countOf = (haystack, needle) => String(haystack).split(needle).length - 1;

function armA() {
  const sql = fs.readFileSync(MIRROR, "utf8");
  for (const [needle, why] of GUARDS) {
    assert.ok(sql.includes(needle), `${MIRROR} is missing ${JSON.stringify(needle)} -- ${why}`);
  }
  const creates = countOf(sql, CREATE_INDEX);
  assert.equal(creates, 2,
    `the mirror holds ${JSON.stringify(CREATE_INDEX)} ${creates} times, expected exactly 2 -- one migration, both indexes, one undo (D3)`);
  console.log("    [AGT-620 arm A] the mirror carries both indexes and the buffer bar");
}

// Read-only POST. The message shape matches the AGT-116 transport watcher's own incident string.
async function rpc(base, key, name) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const text = await res.text();
  if (!res.ok) {
    let code = null;
    try { code = JSON.parse(text).code; } catch { /* not JSON: the status alone is the finding */ }
    throw new Error(`HTTP ${res.status}${code ? ` ${code}` : ""} on /rest/v1/rpc/${name}`);
  }
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function armB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "AGT-620 arm B (live rpcs)",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent, so the pick queue and the flow-check " +
        "audit could not be read and their answers could not be shaped-checked. Arm A above still " +
        "graded the committed migration's two partial indexes, their predicates and its buffer " +
        "bar. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  // B1 -- the pick queue still answers, with the board lane still in it.
  const t0 = Date.now();
  const queue = await rpc(url, key, "prime_directive_queue");
  const queueMs = Date.now() - t0;
  assert.equal(queue.status, 200, "prime_directive_queue() must answer 200 over REST");
  assert.ok(Array.isArray(queue.body), `prime_directive_queue() returned ${typeof queue.body}, expected an array`);
  const board = queue.body.filter(r => r && r.lane === "board");
  assert.ok(board.length >= 1,
    `the queue returned ${queue.body.length} rows and none has lane "board" -- the indexes must not change which rows the queue picks`);

  // B2 -- the audit the boot gate and scripts/audit-run-review.js read still answers.
  const t1 = Date.now();
  const audit = await rpc(url, key, "audit_flow_checks");
  const auditMs = Date.now() - t1;
  assert.equal(audit.status, 200, "audit_flow_checks() must answer 200 over REST");
  assert.ok(Array.isArray(audit.body), `audit_flow_checks() returned ${typeof audit.body}, expected an array`);

  console.log(
    `    [AGT-620 arm B] live: queue ${queue.body.length} rows in ${queueMs} ms; ` +
      `audit_flow_checks ${audit.status} in ${auditMs} ms`,
  );
}

export default async function run() {
  armA();
  await armB();
}

selfRun(import.meta.url, run);
