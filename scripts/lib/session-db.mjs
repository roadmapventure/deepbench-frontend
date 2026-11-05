// DeepBench v7.0.963 | scripts/lib/session-db.mjs | AGT-464
//
// THE ONLY POSTGRES CALLER the two session scripts have. `open-session.js` and `close-session.js`
// make no network call of their own: every read and every write goes through `db()` below, so the
// key is held behind ONE module (John's call JOHN-0925, pattern:68) and a later editor who
// needs a new query adds it here rather than minting a second fetch with a second set of headers.
//
// AGT-464 -- THE LEAN LANE. This module now prefers `SUPABASE_LEAN_KEY` over `SUPABASE_SERVICE_KEY`,
// and every claim it makes goes through one of four SECURITY DEFINER functions (migration
// `agt464_lean_lane`, mirrored at `docs/design/agt-464-lean-lane.sql`) rather than through a
// table-level write. The point is that a session opened from a phone needs NO service key: the
// `lean_lane` role may EXECUTE those four functions and read the meter, and it holds zero write
// privileges on any table. An interactive session is never handed the service key, and no existing
// grant was widened to make that true -- every grant the migration issues is to the NEW role.
// The lane in writing, and John's one key-minting chore: `docs/runbooks/lean-lane.md`.
//
// WHAT EACH CLAIM WRAPS. `docs/runbooks/session-setup.md` is the contract these functions execute;
// each one carries the step's own fenced SQL VERBATIM in its header comment, so the SQL a reader
// greps for is in the module that performs it, and a drift between the two is visible by eye. The
// guards travel with the SQL: `status <> 'done'` and the claim window on the claim, the holder guard
// on the release, and `updated_at` LEFT UNTOUCHED on both (SES-316 -- bumping it made every decision
// on a picked ticket un-restorable, because reverse_decision() refuses a row written after the
// decision and a claim minutes later looks exactly like somebody else's later write).
//
// WHAT POSTGREST CAN AND CANNOT DO, because the claims are shaped differently for a measured
// reason and not a stylistic one:
//
//   * The TICKET claim, re-assert and release are now `POST rpc/lean_claim_ticket` and
//     `POST rpc/lean_release_claim`. They used to be filtered PATCHes, which worked but needed a
//     table-level write grant -- the one thing the lean lane must not have. Inside the function the
//     claim is still ONE `UPDATE ... WHERE ... RETURNING`, which is what rule B40's atomicity needs,
//     and moving it server-side fixed the part that could never ride in a URL:
//     `public.claim_exclusion_reason(claimed_by, claimed_at) IS NULL`. PostgREST cannot call a SQL
//     function inside a filter, so the PATCH form had to re-state the window and the stop as the two
//     conditions that function reads; the RPC calls the real function instead, so there is no
//     declared copy left to drift. `CLAIM_TTL_HOURS` / `STOP_CLAIM_PREFIX` stay exported below as
//     the documented values, no longer as the claim's own arithmetic.
//
//     `p_write` is the whole difference between the three: TRUE for the claim at pick time, FALSE
//     for register B42's re-assert and for the holder read. A `p_write: false` call writes nothing
//     and still reports the holder, which is why re-asserting can never quietly extend a window
//     that should be expiring. A 0-row claim returns the holder in the same answer, so the role
//     needs no SELECT on `backlog_items` at all -- and it has none.
//
//   * The VERSION claim (§3) is now `POST rpc/lean_claim_version`, and `claimVersion()` is ASYNC
//     and really claims. `patch = patch + 1` is arithmetic in the write and PostgREST's write API
//     takes column VALUES, not SQL expressions -- which is why this used to hand its SQL to the
//     Supabase connector rather than fake a number. `agt464_lean_lane` closed that gap by putting
//     the arithmetic inside a function, so the claim is atomic AND callable. It still never reads-
//     then-increments (the race CLAUDE.md's atomic-counter rule exists to stop).
//
//   * The ID-BLOCK claim (§3b) is UNCHANGED and still returns SQL for the connector: `claimIds()`
//     claims a block of N, and AGT-464 did not give the lane a block call. `fileTicket()` files
//     exactly ONE ticket through `rpc/lean_file_ticket`, which takes its own single id inside the
//     function. Never claim a single id and hand-count the rest -- that hand-count is the mechanism
//     behind every recorded ID collision in this repo. A function that cannot claim honestly must
//     not return a number that looks claimed, and `claimIds()` still says so in its `channel`.
//
// EXIT 2 `no-credentials` is this module's, not its callers'. A session that has exported neither
// SUPABASE_LEAN_KEY nor SUPABASE_SERVICE_KEY has not followed step 1b, and the failure a reader must
// never get is a run that silently skipped its database half and printed a summary anyway. That exit
// is also what stops a key-less session hand-composing its way past the pipeline instead.

const EXIT_NO_CREDENTIALS = 2;

// §2c's claim window and stop, as `public.claim_exclusion_reason()` reads them. Declared rather than
// queried for the reason the block comment gives; kept equal to `scripts/run-project.js`'s pair.
export const CLAIM_TTL_HOURS = 6;
export const STOP_CLAIM_PREFIX = "STOPPED-BY-JOHN";

// The SQL each claim wraps, verbatim from `docs/runbooks/session-setup.md`. `<...>` placeholders are
// the runbook's own; `fill()` substitutes them for the two functions that hand their SQL to the
// connector, and the three that execute keep the text as the statement of what they do.
export const SQL = Object.freeze({
  // §2c -- the atomic ticket claim. 1 row -> yours; 0 rows -> someone holds it.
  claimTicket: `UPDATE public.backlog_items
   SET claimed_by = '<short-session-name>', claimed_at = now()
 WHERE backlog_id = '<TICKET-ID>'
   AND status <> 'done'
   AND public.claim_exclusion_reason(claimed_by, claimed_at) IS NULL
RETURNING backlog_id;`,
  // §2c -- the one guarded release, AFTER the push, never in the status write.
  releaseClaim: `UPDATE public.backlog_items
   SET claimed_by = NULL, claimed_at = NULL
 WHERE backlog_id = '<TICKET-ID>' AND claimed_by = '<your session name>';`,
  // §3 -- the version claim. The write IS the reservation; no re-check before push.
  claimVersion: `UPDATE dev_version_counter
SET patch = patch + 1, updated_at = now(), updated_by_session = '<short-session-name>'
WHERE id = 1
RETURNING major, minor, patch;`,
  // §3b -- ONE block of N. Never claim one id and hand-count the rest.
  claimIds: `INSERT INTO feature_id_counter (prefix, last_issued_number, updated_by_session)
VALUES ('<PREFIX>', <N>, '<short-session-name>')
ON CONFLICT (prefix) DO UPDATE
  SET last_issued_number = feature_id_counter.last_issued_number + <N>,
      updated_at = now(),
      updated_by_session = EXCLUDED.updated_by_session
RETURNING last_issued_number;`,
});

function fill(sql, subs) {
  let out = sql;
  for (const [token, value] of Object.entries(subs)) out = out.split(token).join(String(value));
  return out;
}

// --- the one fetch -----------------------------------------------------------------------------
//
// `db(pathAndQuery, init)` is the whole transport. `pathAndQuery` is everything after `/rest/v1/`.
// Credentials are read per call rather than captured at import, so a test can set them and import
// this module in either order. Returns { status, rows, text }; a non-2xx is NOT thrown -- the caller
// decides, because a 0-row claim and a refused claim mean different things to rule B40.
// THE LEAN KEY COMES FIRST, and the order is the point rather than a preference. A session that has
// both exported is almost always a runner cycle; a session that has only `SUPABASE_LEAN_KEY` is the
// phone lane, and preferring the lean key means the lane's narrow role is what actually gets used
// where it is present instead of being quietly shadowed by a broader credential. Either one opens
// the module; neither is ever written to a file, and neither is ever printed.
export const LEAN_KEY_NAME = "SUPABASE_LEAN_KEY";
export const SERVICE_KEY_NAME = "SUPABASE_SERVICE_KEY";

export function credentials(env = process.env) {
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_LEAN_KEY ?? "").trim() || (env.SUPABASE_SERVICE_KEY ?? "").trim();
  return { url, key, ok: Boolean(url && key) };
}

// Names what is MISSING, never what is set. The two keys are one requirement with two acceptable
// answers, so they are reported as one entry: a reader told "SUPABASE_LEAN_KEY is not set" while a
// service key would have served would go looking for the wrong thing.
export function missingCredentialNames(env = process.env) {
  const missing = [];
  if (!String(env.SUPABASE_URL ?? "").trim()) missing.push("SUPABASE_URL");
  const haveKey = String(env[LEAN_KEY_NAME] ?? "").trim() || String(env[SERVICE_KEY_NAME] ?? "").trim();
  if (!haveKey) missing.push(`${LEAN_KEY_NAME} or ${SERVICE_KEY_NAME}`);
  return missing;
}

// The exit a credential-less run takes. Printed to stderr and named `no-credentials` so the reader
// gets the remedy (the lean key from the cloud environment's settings, or the service key BY NAME
// from public.runner_secrets exported inline for the one command, never into a file) instead of a
// stack trace. BOTH key names appear whichever one is missing, because the remedy differs by which
// one the reader can actually get: the lean lane's is John's one chore, the service key's is step 1b.
export function noCredentials(who, env = process.env, exit = process.exit) {
  const missing = missingCredentialNames(env);
  console.error(
    `${who}: no-credentials — ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set. ` +
    `\`.env.local\` carries publishable values only (ruling d7670e18). ${LEAN_KEY_NAME} is the lean ` +
    "lane's own narrow key: it lives in the cloud environment's settings and in public.runner_secrets " +
    "under that name, never in a file in this repo (docs/runbooks/lean-lane.md). " +
    `${SERVICE_KEY_NAME} is read BY NAME from public.runner_secrets and exported inline for one ` +
    "command (docs/runbooks/session-setup.md step 1b). Either one opens this module; an interactive " +
    "session should be given the lean key, never the service key.",
  );
  return exit(EXIT_NO_CREDENTIALS);
}

export async function db(pathAndQuery, init = {}, env = process.env, fetchImpl = fetch) {
  const { url, key, ok } = credentials(env);
  if (!ok) return noCredentials("session-db", env);
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers ?? {}),
  };
  const res = await fetchImpl(`${url}/rest/v1/${pathAndQuery}`, { ...init, headers });
  const text = await res.text();
  let rows = null;
  try { rows = text ? JSON.parse(text) : null; } catch { rows = null; }
  return { status: res.status, ok: res.ok, rows, text };
}

// --- §2c: the ticket claim ----------------------------------------------------------------------

// Rule B40's two-line rule, as a function: 1 row -> it's yours; 0 rows -> someone holds it, take the
// next queued ticket. More than one row from a filter on a unique backlog_id means the identity
// filter is gone, and that refuses rather than picking one. Kept as the written statement of the
// rule now that the row count is decided inside `lean_claim_ticket` (which returns `rows` too).
export function claimOutcome(rows) {
  const n = Array.isArray(rows) ? rows.length : 0;
  if (n === 1) return { ok: true, holder: rows[0]?.claimed_by ?? null, reason: null };
  if (n === 0) return { ok: false, holder: null, reason: "0 rows from the atomic claim: another session holds this ticket (or it is done)" };
  return { ok: false, holder: null, reason: `${n} rows from a claim filtered on a unique backlog_id — the identity filter is gone; refusing rather than picking one` };
}

// The one call all three of the ticket claims make. `lean_claim_ticket` returns jsonb, so PostgREST
// answers with the object itself rather than a row array -- an answer that is not an object is a
// transport or grant failure, never "nobody holds it", and the callers below say which.
async function leanClaimTicket(ticketId, session, write, env, fetchImpl) {
  const r = await db("rpc/lean_claim_ticket", {
    method: "POST",
    // No `updated_at` — SES-316. A claim is coordination, not a judgment write; the function
    // does not bump it either.
    body: JSON.stringify({ p_ticket: String(ticketId), p_session: String(session), p_write: Boolean(write) }),
  }, env, fetchImpl);
  const answer = r.rows && typeof r.rows === "object" && !Array.isArray(r.rows) ? r.rows : null;
  return { answer, status: r.status, ok: r.ok, text: r.text };
}

function noAnswer(what, status, text) {
  return `${what}: rpc/lean_claim_ticket answered ${status} with no claim object, so the claim is `
    + `UNKNOWN rather than lost — check the key's role can EXECUTE it (docs/runbooks/lean-lane.md): `
    + `${String(text ?? "").slice(0, 200)}`;
}

// §2c's atomic claim, `p_write: true`. One UPDATE ... RETURNING inside the function, with
// `claim_exclusion_reason()` called for real rather than restated as URL filters.
export async function claimTicket(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const { answer, status, text } = await leanClaimTicket(ticketId, claimer, true, env, fetchImpl);
  if (!answer) {
    return { ok: false, rows: 0, holder: null, claimed_by: null, claimed_at: null, status,
      reason: noAnswer("claimTicket", status, text) };
  }
  const ok = answer.claimed === true;
  return {
    ok,
    rows: Number(answer.rows ?? 0),
    status,
    holder: answer.claimed_by ?? null,
    claimed_by: answer.claimed_by ?? null,
    claimed_at: answer.claimed_at ?? null,
    ticket_status: answer.status ?? null,
    row: ok ? answer : null,
    reason: ok ? null : (answer.reason
      ?? "0 rows from the atomic claim: another session holds this ticket (or it is done)"),
  };
}

// Who holds it, for the report that must name WHO rather than only that it is held. `p_write: false`,
// so this is a read: the function hands back the holder in the same answer the claim would give.
export async function heldBy(ticketId, env = process.env, fetchImpl = fetch, asker = "(holder-read)") {
  const { answer } = await leanClaimTicket(ticketId, asker, false, env, fetchImpl);
  return {
    claimed_by: answer?.claimed_by ?? null,
    claimed_at: answer?.claimed_at ?? null,
    status: answer?.status ?? null,
  };
}

// Register B42's re-assertion, run before every irreversible act and again before the push.
// `p_write: false` is what makes it a re-assertion rather than a re-claim: it writes nothing, so it
// cannot reset `claimed_at` and quietly extend a window that should be expiring. `claimed` comes
// back TRUE only while `claimed_by` still equals this session's name, so FALSE IS the answer
// `claim-lost` names -- and the holder rides along in the same answer.
export async function reassertClaim(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const { answer, status, text } = await leanClaimTicket(ticketId, claimer, false, env, fetchImpl);
  if (!answer) {
    return { held: false, rows: 0, claimed_by: null, claimed_at: null, status,
      reason: noAnswer("reassertClaim", status, text) };
  }
  const held = answer.claimed === true;
  return {
    held,
    rows: held ? 1 : 0,
    status,
    claimed_by: answer.claimed_by ?? null,
    claimed_at: answer.claimed_at ?? null,
    ticket_status: answer.status ?? null,
  };
}

// SQL.releaseClaim — ONE guarded release, AFTER the push, never in the status write
// (q-claim-release-order, SES-106). The holder guard is the point, and it lives inside the function:
// a session can never clear a claim that has since moved. `lean_release_claim` returns the row count
// as a bare integer, so 1 is released and 0 is "the guard held". No `updated_at`, same as the claim.
export async function releaseClaim(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const r = await db("rpc/lean_release_claim", {
    method: "POST",
    body: JSON.stringify({ p_ticket: String(ticketId), p_session: String(claimer) }),
  }, env, fetchImpl);
  const n = Number(r.rows);
  return { released: n === 1, rows: Number.isFinite(n) ? n : 0, status: r.status };
}

// --- §3: the version claim, now a real one ------------------------------------------------------
//
// ASYNC as of AGT-464. `rpc/lean_claim_version` runs §3's `patch = patch + 1` inside the function,
// so the arithmetic PostgREST's write API cannot express happens in the one place that can do it
// atomically. The write IS the reservation, so there is no re-check before the push.
// `claimed` stays the load-bearing field: FALSE means no version was taken and a caller must not
// print one as claimed. The function returns `text`, so PostgREST answers with the string itself.

export async function claimVersion(sessionName, env = process.env, fetchImpl = fetch) {
  const r = await db("rpc/lean_claim_version", {
    method: "POST",
    body: JSON.stringify({ p_session: String(sessionName) }),
  }, env, fetchImpl);
  const version = typeof r.rows === "string" && /^v\d+\.\d+\.\d+$/.test(r.rows) ? r.rows : null;
  if (!version) {
    return {
      claimed: false,
      version: null,
      status: r.status,
      step: "docs/runbooks/session-setup.md §3",
      error: `rpc/lean_claim_version answered ${r.status} with ${JSON.stringify(r.rows)} rather than a `
        + `v<major>.<minor>.<patch> string — NO version was claimed. Never fall back to reading the `
        + `counter and incrementing it (CLAUDE.md's atomic-counter rule): ${String(r.text ?? "").slice(0, 200)}`,
    };
  }
  return { claimed: true, version, status: r.status, step: "docs/runbooks/session-setup.md §3" };
}

// --- §3c: file ONE ticket -----------------------------------------------------------------------
//
// `rpc/lean_file_ticket` takes its own id, writes the canonical row with `scope_origin` john-named
// (the lean lane IS John typing) and runs register B4's `recompute_backlog_queue()` -- all in one
// call, so a ticket can never exist with an id nothing filed or a board nothing recomputed. The
// function refuses a bare priority class and an empty rationale itself; both come back as the
// error text rather than as a silently filed row. ONE ticket per call: a block of N stays
// `claimIds()`'s business.

export async function fileTicket(
  { session, prefix, priority_class, title, rationale, description = null, type = "Bug" } = {},
  env = process.env, fetchImpl = fetch,
) {
  const r = await db("rpc/lean_file_ticket", {
    method: "POST",
    body: JSON.stringify({
      p_session: String(session),
      p_prefix: String(prefix),
      p_priority_class: String(priority_class),
      p_title: String(title),
      p_rationale: String(rationale),
      p_description: description == null ? null : String(description),
      p_type: String(type),
    }),
  }, env, fetchImpl);
  const backlogId = typeof r.rows === "string" && /^[A-Za-z]+-\d+$/.test(r.rows) ? r.rows : null;
  if (!backlogId) {
    return {
      filed: false,
      backlog_id: null,
      status: r.status,
      error: `rpc/lean_file_ticket answered ${r.status} with ${JSON.stringify(r.rows)} rather than a `
        + `<PREFIX>-<N> id — NOTHING was filed: ${String(r.text ?? "").slice(0, 300)}`,
    };
  }
  return { filed: true, backlog_id: backlogId, status: r.status };
}

// --- §3b: the one claim PostgREST still cannot express -------------------------------------------
//
// Returns the step's SQL with this session's values in it, plus the channel that can run it.

export function claimIds(prefix, n) {
  const count = Number(n);
  if (!Number.isInteger(count) || count < 1) {
    return { error: `claimIds needs a whole count of at least 1, got ${JSON.stringify(n)} — set <N> to how many rows you are about to file` };
  }
  return {
    claimed: false,
    channel: "supabase-connector",
    step: "docs/runbooks/session-setup.md §3b",
    prefix: String(prefix),
    n: count,
    sql: fill(SQL.claimIds, { "<PREFIX>": prefix, "<N>": count, "<short-session-name>": "<short-session-name>" }),
    block: `the returned last_issued_number is the LAST id of the block; the block is ${prefix}-(returned − ${count} + 1) through ${prefix}-returned`,
    why: "ONE call claims ONE contiguous block of N. Never claim a single id and hand-count the rest "
      + "— that hand-count is the mechanism behind every recorded ID collision in this repo.",
  };
}

// --- the meter and the budget -------------------------------------------------------------------

// The freshest `public.runner_usage_readings` row, with its AGE and its SOURCE, graded against
// `runner_settings.meter_stale_hours`. Age and source both ride on the line because a number alone
// cannot be acted on: a 94% reading four hours old and a 94% reading four minutes old are different
// facts, and which writer produced it (`routine-self-read`, `meter-reader`, `meter-reader-headers`)
// is how a reader tells a live meter from a stale laptop task.
export async function meter(env = process.env, fetchImpl = fetch, now = Date.now()) {
  const settings = await db("runner_settings?id=eq.1&select=meter_stale_hours", {}, env, fetchImpl);
  const staleHours = Array.isArray(settings.rows) ? settings.rows[0]?.meter_stale_hours ?? null : null;
  const r = await db(
    "runner_usage_readings?select=taken_at,source,all_models_pct,session_5h_pct,fable_pct,note&order=taken_at.desc&limit=1",
    {}, env, fetchImpl,
  );
  const row = Array.isArray(r.rows) ? r.rows[0] : null;
  if (!row) {
    return { reading: null, source: null, age_minutes: null, stale_hours: staleHours, stale: true,
      note: "no runner_usage_readings row at all — the pace gate has nothing to read" };
  }
  const ageMinutes = Math.round((now - Date.parse(row.taken_at)) / 60000);
  return {
    reading: row,
    source: row.source ?? null,
    taken_at: row.taken_at,
    age_minutes: ageMinutes,
    stale_hours: staleHours,
    stale: staleHours == null ? null : ageMinutes > Number(staleHours) * 60,
    all_models_pct: row.all_models_pct,
    session_5h_pct: row.session_5h_pct,
    fable_pct: row.fable_pct,
  };
}

// The session's own length rule, from the two columns AGT-460 added (migration
// `agt460_session_length`), beside the daily token wall that was already there. Read from the row
// rather than restated here: pattern:93 — never store a fact in a doc or a constant when a live
// source of truth exists.
export async function budget(env = process.env, fetchImpl = fetch) {
  const r = await db(
    "runner_settings?id=eq.1&select=session_max_tickets,session_max_context_tokens,daily_max_tokens_millions,claim_stale_hours",
    {}, env, fetchImpl,
  );
  const row = Array.isArray(r.rows) ? r.rows[0] : null;
  if (!row) return { error: "runner_settings id=1 did not come back — the session length rule is unreadable" };
  return {
    session_max_tickets: row.session_max_tickets,
    session_max_context_tokens: row.session_max_context_tokens,
    daily_max_tokens_millions: row.daily_max_tokens_millions,
    claim_stale_hours: row.claim_stale_hours,
    rule: `close out and continue in a fresh session after ${row.session_max_tickets} tickets or `
      + `${row.session_max_context_tokens} average context per turn, whichever comes first (AGT-460)`,
  };
}

// The queue recompute every close-out runs after a status write that completes/removes/files a
// classed ticket (register B4). One idempotent call; a board that did not move changes 0 rows.
export async function recomputeBacklogQueue(env = process.env, fetchImpl = fetch) {
  const r = await db("rpc/recompute_backlog_queue", { method: "POST", body: "{}" }, env, fetchImpl);
  return { ok: r.ok, status: r.status, rows: r.rows };
}

export { EXIT_NO_CREDENTIALS };
