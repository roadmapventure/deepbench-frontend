// DeepBench v7.0.76 | middleware.js | HAR-33 PATCH-1 -- every reason='spend_cap' refusal carries
// the stats object, repeat refusals included, because HAR-33b's John-approved superuser popup
// always renders three stat tiles; a stats-less spend_cap refusal would be a different popup
// than the one signed off. See refuse() and the stored-blocked branch.
// DeepBench v7.0.76 | middleware.js | HAR-33 -- per-IP access gate at the edge: US callers get a
// $5 trial spend cap, non-US callers are blocked on their first model-triggering call, and every
// refusal is a structured 403 that HAR-33b turns into a friendly popup.
//
// FEATURE: HAR-33 (part a, backend) -- DeepBench is live on the open internet with API auto-reload
// credits, so anyone holding the URL can trigger real model calls without limit. This is the only
// place that can stop that spend before it happens: Vercel Edge Middleware runs ahead of the
// serverless function, so a refused request never boots a route, never reaches Anthropic/OpenAI,
// and costs $0. It is NOT an api/ route and does not count against the Vercel Hobby
// 12-serverless-function limit (api/ stays 12/12).
//
// EVERYTHING KEYS OFF ip_org_cache -- one row per unique caller IP, already written by
// lib/ip-org-resolver.js on the logging path. There is deliberately no separate whitelist table
// and no environment-variable allowlist: John manages access by editing rows.
//   permission='unlimited' -> always pass (the hand-set whitelist value)
//   permission='blocked'   -> always refuse, with the row's block_reason
//   permission='trial'     -> the default: US only, capped by the row's spend_limit_usd
//
// SPEND IS COMPUTED, NEVER STORED. get_ip_stats(p_ip) sums ai_activity_log tokens against
// model_pricing rates at check time. A running total would drift the moment any write path missed
// an increment, and ai_activity_log.cost_usd is legacy (43 of 33,427 rows) and must never be used.
//
// THIS FILE MUST FAIL OPEN. Cost protection may never become an outage for good users: a Supabase
// timeout, a non-2xx REST response, a malformed row, a missing env var, or any thrown error logs
// exactly one console.error line (visible in the Vercel function logs) and lets the request
// through. The only paths that refuse are the ones where the gate positively established that this
// IP is out of budget or out of country. There are no retries.
//
// IP DERIVATION MUST STAY BYTE-FOR-BYTE EQUIVALENT to deriveCallerIp() in lib/request-context.js
// (first comma-separated entry of x-forwarded-for, trimmed, empty -> null). That function decides
// what ai_activity_log.caller_ip stores, and get_ip_stats sums on that column -- if the two ever
// disagree, spend lookups silently miss every row and the cap stops existing. Vercel overwrites a
// client-supplied x-forwarded-for at the edge, so the value is not spoofable in production; no
// derivable IP (local `vercel dev`) passes through rather than blocking local work.
//
// NEVER LOG THE BYPASS SECRET OR THE SERVICE KEY. The one error line carries a stage name, the
// caller IP, and an error message -- nothing else.

export const config = { matcher: '/api/:path*' };

// Read-only, non-model routes the whole site depends on for browsing. A blocked visitor keeps full
// read access to the site and its data -- only model-triggering calls are refused -- so these two
// are answered with ZERO Supabase reads. Everything else under /api/* is treated as a potential
// model/embedding trigger and is gated. Do not extend this list without a design decision: every
// entry is a hole in the cap.
const PASS_THROUGH_GETS = new Set(['/api/agent-configs', '/api/load-entries']);

// Mirrors the three headers vercel.json sets on /api/(.*). A short-circuited middleware response
// never reaches that config, so a refusal without these would surface in the browser as an opaque
// CORS failure instead of the structured body HAR-33b is written against.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Matches ip_org_cache.spend_limit_usd's column default. Used only when no row exists yet.
const DEFAULT_SPEND_LIMIT_USD = 5.0;

// Two sequential fetches sit on the request path, so each one is capped. A slow Supabase must
// degrade to "pass through" quickly, not hold every API call open for the platform default.
const SUPABASE_TIMEOUT_MS = 4000;

/**
 * The Vercel Edge Middleware "continue to the destination" response -- byte-identical to what
 * @vercel/edge's next() emits (an empty response carrying x-middleware-next: 1). Inlined rather
 * than imported because this session adds no npm dependencies and edge middleware may use nothing
 * but fetch.
 */
function passThrough() {
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

/**
 * The exact part-b contract. `stats` accompanies EVERY reason='spend_cap' refusal -- the first one
 * and every repeat alike -- because HAR-33b's superuser popup always renders three stat tiles
 * (LLM calls / tokens / usage) and John signed off on that shape; a stats-less spend_cap refusal
 * would be a different popup than the approved one (PATCH-1). geo and manual refusals never carry
 * stats and cost no RPC. The one permitted omission is an RPC failure on a repeat refusal: the
 * refusal must never depend on the RPC, so it degrades to no tiles rather than opening the gate.
 */
function refuse(reason, ip, stats) {
  const body = { deepbench_gate: true, reason, ip };
  if (stats) body.stats = stats;
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function failOpen(stage, ip, err) {
  // One line, no secrets. Grep target for QA item 8: this should never appear during a clean run.
  console.error(
    `[HAR-33 gate] fail-open at ${stage} for ip=${ip || 'unknown'}: ${err && err.message ? err.message : String(err)}`,
  );
  return passThrough();
}

function timeoutSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined; // no timeout is better than no request
  }
}

// Identical in behaviour to deriveCallerIp() in lib/request-context.js -- see the file header for
// why that equivalence is load-bearing.
function deriveCallerIp(headers) {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return null;
  const first = String(xff).split(',')[0].trim();
  return first || null;
}

function supabaseAuth(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function attemptsPlusOne(row) {
  return (row ? Number(row.blocked_attempts) || 0 : 0) + 1;
}

/** Fire-and-forget writes: never awaited on the request path, never allowed to reject. */
function background(context, promise) {
  const safe = Promise.resolve(promise).catch(() => {});
  try {
    if (context && typeof context.waitUntil === 'function') context.waitUntil(safe);
  } catch {
    // waitUntil unavailable (local dev): the fetch is already in flight either way.
  }
}

/**
 * Spend for one IP, computed at check time from ai_activity_log x model_pricing. Throws on any
 * failure -- the two callers want opposite behaviour on error (the trial path fails OPEN because
 * it has not yet established that this caller is over budget; the stored-blocked path stays
 * CLOSED because the row already settled that question), so neither may inherit a default.
 */
async function fetchStats(url, key, ip) {
  const res = await fetch(`${url}/rest/v1/rpc/get_ip_stats`, {
    method: 'POST',
    headers: { ...supabaseAuth(key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_ip: ip }),
    signal: timeoutSignal(SUPABASE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const body = await res.json();
  const stats = Array.isArray(body) ? body[0] : body;
  if (!stats || typeof stats !== 'object') throw new Error('empty stats');
  return stats;
}

/** The three numbers HAR-33b's popup tiles render. cost_usd is rounded to cents for display. */
function shapeStats(stats) {
  return {
    llm_calls: Number(stats.llm_calls) || 0,
    total_tokens: Number(stats.total_tokens) || 0,
    cost_usd: Math.round((Number(stats.cost_usd) || 0) * 100) / 100,
  };
}

function writeRow(url, key, ip, payload, resolution) {
  return fetch(`${url}/rest/v1/ip_org_cache?on_conflict=caller_ip`, {
    method: 'POST',
    headers: {
      ...supabaseAuth(key),
      'Content-Type': 'application/json',
      Prefer: `resolution=${resolution},return=minimal`,
    },
    // caller_ip_masked is a GENERATED column (LOG-124) -- including it errors the write.
    body: JSON.stringify({ caller_ip: ip, ...payload }),
    signal: timeoutSignal(SUPABASE_TIMEOUT_MS),
  });
}

export default async function middleware(request, context) {
  let ip = null;
  try {
    const { pathname } = new URL(request.url);
    const headers = request.headers;

    // 1. Free passes, zero Supabase reads: CORS preflight and the two browse-safe reads.
    if (request.method === 'OPTIONS') return passThrough();
    if (request.method === 'GET' && PASS_THROUGH_GETS.has(pathname)) return passThrough();

    // 2. Bypass header -- the John-approved exemption for Claude QA scripts and the regression
    //    drivers, which must keep working against a capped or blocked IP. Only honoured when the
    //    env var is actually set, so an unset variable can never match an empty header.
    const bypassSecret = process.env.GATE_BYPASS_SECRET;
    if (bypassSecret && headers.get('x-db-gate-bypass') === bypassSecret) return passThrough();

    // 3. Caller identity. No IP at all means local `vercel dev` -- pass through.
    ip = deriveCallerIp(headers);
    if (!ip) return passThrough();
    const country = headers.get('x-vercel-ip-country') || null;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return failOpen('env', ip, new Error('supabase env missing'));

    // 4. The row. blocked_attempts/blocked_at are selected because PostgREST cannot express
    //    `blocked_attempts = blocked_attempts + 1`; the increment is computed from what we read.
    //    A lost update between two simultaneous blocked requests undercounts an attempt counter --
    //    acceptable for a diagnostic column, and never affects whether the gate refuses.
    let row = null;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/ip_org_cache?caller_ip=eq.${encodeURIComponent(ip)}` +
          '&select=permission,spend_limit_usd,block_reason,country,blocked_attempts,blocked_at&limit=1',
        { headers: supabaseAuth(supabaseKey), signal: timeoutSignal(SUPABASE_TIMEOUT_MS) },
      );
      if (!res.ok) return failOpen('row-fetch', ip, new Error(`status ${res.status}`));
      const rows = await res.json();
      if (!Array.isArray(rows)) return failOpen('row-fetch', ip, new Error('non-array body'));
      row = rows[0] || null;
    } catch (err) {
      return failOpen('row-fetch', ip, err);
    }

    if (row && row.permission === 'unlimited') return passThrough();

    if (row && row.permission === 'blocked') {
      background(
        context,
        fetch(`${supabaseUrl}/rest/v1/ip_org_cache?caller_ip=eq.${encodeURIComponent(ip)}`, {
          method: 'PATCH',
          headers: {
            ...supabaseAuth(supabaseKey),
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            blocked_attempts: (Number(row.blocked_attempts) || 0) + 1,
            blocked_at: row.blocked_at || new Date().toISOString(),
          }),
        }),
      );
      // PATCH-1: a repeat spend_cap refusal carries the same three stat tiles as the first one,
      // so HAR-33b's approved popup renders identically whether this is the call that crossed the
      // cap or the hundredth call after it. Deliberately scoped to spend_cap: geo and manual
      // blocks render no tiles, so they still cost zero RPC.
      const reason = row.block_reason || 'manual';
      let stats = null;
      if (reason === 'spend_cap') {
        try {
          stats = shapeStats(await fetchStats(supabaseUrl, supabaseKey, ip));
        } catch (err) {
          // NOT a fail-open: the row already established this caller is blocked, so an unavailable
          // RPC costs the popup its tiles, never the gate its refusal. Distinct log prefix so the
          // "did the fail-open path fire?" QA grep stays honest.
          console.error(
            `[HAR-33 gate] stats-unavailable on stored spend_cap refusal for ip=${ip}: ${err && err.message ? err.message : String(err)}`,
          );
        }
      }
      return refuse(reason, ip, stats);
    }

    // 5. Trial (or first sighting).
    if (country && country !== 'US') {
      background(
        context,
        writeRow(
          supabaseUrl,
          supabaseKey,
          ip,
          {
            permission: 'blocked',
            block_reason: 'geo',
            blocked_at: new Date().toISOString(),
            country,
            blocked_attempts: attemptsPlusOne(row),
          },
          'merge-duplicates',
        ),
      );
      return refuse('geo', ip, null);
    }

    let stats = null;
    try {
      stats = await fetchStats(supabaseUrl, supabaseKey, ip);
    } catch (err) {
      // Fails OPEN, unlike the stored-blocked path above: nothing has yet established that this
      // caller is over budget, so refusing on a broken RPC would block good users.
      return failOpen('spend-rpc', ip, err);
    }

    const spent = Number(stats.cost_usd) || 0;
    const limit = row && row.spend_limit_usd != null ? Number(row.spend_limit_usd) : DEFAULT_SPEND_LIMIT_USD;

    if (Number.isFinite(limit) && spent >= limit) {
      background(
        context,
        writeRow(
          supabaseUrl,
          supabaseKey,
          ip,
          {
            permission: 'blocked',
            block_reason: 'spend_cap',
            blocked_at: new Date().toISOString(),
            blocked_attempts: attemptsPlusOne(row),
            ...(country ? { country } : {}),
          },
          'merge-duplicates',
        ),
      );
      return refuse('spend_cap', ip, shapeStats(stats));
    }

    // Under the cap. First sighting gets a minimal trial row so John sees every IP that has ever
    // reached a model route -- ignore-duplicates so this can never clobber the org/city/region
    // lib/ip-org-resolver.js writes for the same address.
    if (!row) {
      background(
        context,
        writeRow(supabaseUrl, supabaseKey, ip, country ? { country } : {}, 'ignore-duplicates'),
      );
    }
    return passThrough();
  } catch (err) {
    return failOpen('unhandled', ip, err);
  }
}
