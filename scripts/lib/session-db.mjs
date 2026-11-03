// DeepBench v7.0.942 | scripts/lib/session-db.mjs | AGT-460
//
// THE ONLY POSTGRES CALLER the two session scripts have. `open-session.js` and `close-session.js`
// make no network call of their own: every read and every write goes through `db()` below, so the
// service key is held behind ONE module (John's call JOHN-0925, pattern:68) and a later editor who
// needs a new query adds it here rather than minting a second fetch with a second set of headers.
//
// WHAT EACH CLAIM WRAPS. `docs/runbooks/session-setup.md` is the contract these functions execute;
// each one carries the step's own fenced SQL VERBATIM in its header comment, so the SQL a reader
// greps for is in the module that performs it, and a drift between the two is visible by eye. The
// guards travel with the SQL: `status <> 'done'` and the claim window on the claim, the holder guard
// on the release, and `updated_at` LEFT UNTOUCHED on both (SES-316 -- bumping it made every decision
// on a picked ticket un-restorable, because reverse_decision() refuses a row written after the
// decision and a claim minutes later looks exactly like somebody else's later write).
//
// WHAT POSTGREST CAN AND CANNOT DO, because two of the five claims are shaped differently for a
// measured reason and not a stylistic one:
//
//   * The TICKET claim, re-assert and release are single-statement `UPDATE ... WHERE ... RETURNING`
//     over one table, which PostgREST expresses exactly as a filtered PATCH with
//     `Prefer: return=representation`. The server still does the whole thing in one statement, which
//     is what rule B40's atomicity needs. The one part that cannot ride in the URL is
//     `public.claim_exclusion_reason(claimed_by, claimed_at) IS NULL` -- PostgREST cannot call a SQL
//     function inside a filter -- so the window and the stop ride as the two conditions that
//     function reads, taken from `scripts/run-project.js`'s `claimQueryFor()` rather than re-derived
//     (`CLAIM_TTL_HOURS` 6, `STOP_CLAIM_PREFIX` STOPPED-BY-JOHN, both CHECKED copies: arm E of
//     `tests/regression/agt-482-claim-stop-fence.test.mjs` round-trips the sentinel through
//     `rpc/claim_exclusion_reason` every run).
//
//   * The VERSION claim (§3) and the ID-block claim (§3b) have ARITHMETIC in the write --
//     `patch = patch + 1`, `last_issued_number = feature_id_counter.last_issued_number + <N>` -- and
//     PostgREST's write API takes column VALUES, not SQL expressions. There is no RPC for either in
//     this project: re-verified live 2026-11-03 (`rpc/claim_feature_ids` -> 404 PGRST202; the only
//     version-named function in `public` is `record_issued_version()`, which is a TRIGGER on the
//     counter and not a callable claim). `scripts/heal-engine.js` reached this same wall on
//     2026-08-20 and answered it the same way, in terms this module does not reverse: adding an RPC
//     "would be a schema change this P10 - Tooling ticket has no mandate for", so the claim stays in
//     the one place that can do it correctly -- the Supabase connector, running §3/§3b's SQL
//     unaltered. So `claimVersion()` and `claimIds()` do not fake the claim and do not read-then-
//     increment (the race CLAUDE.md's atomic-counter rule exists to stop, and the mechanism behind
//     every recorded ID collision in this repo). They RETURN the step's SQL with the session's own
//     values substituted, for the operator's one connector call, and say so in their `channel`.
//     A function that cannot claim honestly must not return a number that looks claimed.
//
// EXIT 2 `no-credentials` is this module's, not its callers'. A session that has not exported
// SUPABASE_URL and SUPABASE_SERVICE_KEY has not followed step 1b, and the failure a reader must
// never get is a run that silently skipped its database half and printed a summary anyway.

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
  // §2c -- who holds it, when the claim comes back 0 rows.
  holder: `SELECT claimed_by, claimed_at FROM backlog_items WHERE backlog_id = '<ID>'`,
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
export function credentials(env = process.env) {
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_SERVICE_KEY ?? "").trim();
  return { url, key, ok: Boolean(url && key) };
}

export function missingCredentialNames(env = process.env) {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter(n => !String(env[n] ?? "").trim());
}

// The exit a credential-less run takes. Printed to stderr and named `no-credentials` so the reader
// gets the remedy (step 1b: read the value BY NAME from public.runner_secrets and export it inline
// for the one command, never into a file) instead of a stack trace.
export function noCredentials(who, env = process.env, exit = process.exit) {
  const missing = missingCredentialNames(env);
  console.error(
    `${who}: no-credentials — ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set. ` +
    "`.env.local` carries publishable values only (ruling d7670e18); read the service key BY NAME " +
    "from public.runner_secrets and export it inline for this one command, never into a file " +
    "(docs/runbooks/session-setup.md step 1b).",
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

function claimCutoffIso(now = Date.now()) {
  return new Date(now - CLAIM_TTL_HOURS * 3600 * 1000).toISOString();
}

// The PATCH that carries SQL.claimTicket. Built as a function so the regression suite can assert the
// URL without a live claim -- a suite run must never claim a real board ticket.
export function claimTicketQuery(ticketId, now = Date.now()) {
  const id = encodeURIComponent(String(ticketId));
  const cutoff = encodeURIComponent(claimCutoffIso(now));
  return `backlog_items?backlog_id=eq.${id}&status=neq.done`
    + `&or=(claimed_by.is.null,and(claimed_at.lt.${cutoff},claimed_by.not.like.${STOP_CLAIM_PREFIX}*))`
    + `&select=backlog_id,claimed_by,claimed_at`;
}

// Rule B40's two-line rule, as a function: 1 row -> it's yours; 0 rows -> someone holds it, take the
// next queued ticket. More than one row from a filter on a unique backlog_id means the identity
// filter is gone, and that refuses rather than picking one.
export function claimOutcome(rows) {
  const n = Array.isArray(rows) ? rows.length : 0;
  if (n === 1) return { ok: true, holder: rows[0]?.claimed_by ?? null, reason: null };
  if (n === 0) return { ok: false, holder: null, reason: "0 rows from the atomic claim: another session holds this ticket (or it is done)" };
  return { ok: false, holder: null, reason: `${n} rows from a claim filtered on a unique backlog_id — the identity filter is gone; refusing rather than picking one` };
}

export async function claimTicket(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const r = await db(claimTicketQuery(ticketId), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    // No `updated_at` — SES-316. A claim is coordination, not a judgment write.
    body: JSON.stringify({ claimed_by: String(claimer), claimed_at: new Date().toISOString() }),
  }, env, fetchImpl);
  const outcome = claimOutcome(r.rows);
  if (outcome.ok) return { ...outcome, status: r.status, row: r.rows[0] };
  const held = await heldBy(ticketId, env, fetchImpl);
  return { ...outcome, status: r.status, claimed_by: held.claimed_by, claimed_at: held.claimed_at };
}

// SQL.holder — what to print when the claim came back 0 rows, so the report names WHO holds it
// rather than only that it is held.
export async function heldBy(ticketId, env = process.env, fetchImpl = fetch) {
  const id = encodeURIComponent(String(ticketId));
  const r = await db(`backlog_items?backlog_id=eq.${id}&select=claimed_by,claimed_at,status`, {}, env, fetchImpl);
  const row = Array.isArray(r.rows) ? r.rows[0] : null;
  return { claimed_by: row?.claimed_by ?? null, claimed_at: row?.claimed_at ?? null, status: row?.status ?? null };
}

// Register B42's re-assertion, run before every irreversible act and again before the push. This is
// a READ with the holder guard in the filter: a row comes back only while this session still holds
// the claim, so 0 rows IS the answer `claim-lost` names. It writes nothing -- re-asserting by
// re-claiming would reset `claimed_at` and quietly extend a window that should be expiring.
export async function reassertClaim(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const id = encodeURIComponent(String(ticketId));
  const who = encodeURIComponent(String(claimer));
  const r = await db(`backlog_items?backlog_id=eq.${id}&claimed_by=eq.${who}&select=backlog_id,claimed_by,claimed_at`, {}, env, fetchImpl);
  const rows = Array.isArray(r.rows) ? r.rows : [];
  if (rows.length === 1) return { held: true, rows: 1, claimed_at: rows[0].claimed_at };
  const held = await heldBy(ticketId, env, fetchImpl);
  return { held: false, rows: rows.length, claimed_by: held.claimed_by, claimed_at: held.claimed_at };
}

// SQL.releaseClaim — ONE guarded release, AFTER the push, never in the status write
// (q-claim-release-order, SES-106). The holder guard is the point: a session can never clear a claim
// that has since moved. No `updated_at` here either, same reason as the claim.
export async function releaseClaim(ticketId, claimer, env = process.env, fetchImpl = fetch) {
  const id = encodeURIComponent(String(ticketId));
  const who = encodeURIComponent(String(claimer));
  const r = await db(`backlog_items?backlog_id=eq.${id}&claimed_by=eq.${who}&select=backlog_id`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ claimed_by: null, claimed_at: null }),
  }, env, fetchImpl);
  const rows = Array.isArray(r.rows) ? r.rows : [];
  return { released: rows.length === 1, rows: rows.length, status: r.status };
}

// --- §3 and §3b: the two claims PostgREST cannot express ----------------------------------------
//
// Both return the step's SQL with this session's values in it, plus the channel that can run it.
// `claimed: false` is the load-bearing field: a caller must not print a version or an ID block as
// claimed on the strength of these.

export function claimVersion(sessionName) {
  return {
    claimed: false,
    channel: "supabase-connector",
    step: "docs/runbooks/session-setup.md §3",
    sql: fill(SQL.claimVersion, { "<short-session-name>": sessionName }),
    why: "patch = patch + 1 is arithmetic in the write; PostgREST's write API takes column values, "
      + "not SQL expressions, and this project has no claim RPC for it. Run this one statement over "
      + "the Supabase connector — the write IS the reservation, so there is no re-check before push.",
  };
}

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
