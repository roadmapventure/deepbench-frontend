// DeepBench v7.0.309 | lib/ip-org-resolver.js | LOG-141 -- Rule 1 short-circuits on "a resolution
// was ATTEMPTED" (resolver IS NOT NULL), not on "a row exists", and the write merges instead of
// ignoring. middleware.js writes a minimal first-sighting row before this ever runs, so the old
// existence test read that bare row as a cache hit: every address first seen since HAR-33
// (v7.0.77) kept org/city/region NULL permanently. Steady state is still zero outbound lookups --
// a failed lookup still writes resolver='ipinfo.io' with org=null and is never retried.
// DeepBench v7.0.39 | lib/ip-org-resolver.js | LOG-121 -- resolve a caller IP's org exactly once,
// ever, into ip_org_cache; every later sighting of that address is a cache hit and costs nothing
// FEATURE: LOG-121 (part b, Task 2) -- the By Platform User drawer wants a human-readable
// organisation next to an unlabelled caller ("Comcast · Austin" rather than a bare masked address).
// The org is deliberately NOT a column on ai_activity_log: it lives here, keyed by IP, and is joined
// at read time, so a later re-resolution corrects every historical row at once instead of requiring
// a backfill nobody would run (ARCHITECTURE.md §19i).
//
// STEADY STATE IS ZERO OUTBOUND LOOKUPS. One row exists per distinct address ever seen; the very
// first sighting spends one HTTP GET and every sighting after it spends one indexed primary-key
// read. That property is what makes it safe to hang this off the logging path at all, so the two
// rules that protect it are load-bearing:
//   1. A cache hit returns before any outbound request is constructed.
//   2. A FAILED lookup still writes its row, with org = null. A permanent negative-cache entry is
//      the whole defence: without it, one rate-limited or unroutable address would be re-queried on
//      every single call forever -- the one way this design could turn into per-call network
//      traffic.
//
// NOTHING HERE MAY THROW, REJECT, OR DELAY A RESPONSE. It is invoked fire-and-forget from inside
// lib/activity-log.js's existing waitUntil() chain, after the log row's own write has already been
// issued; the row is written and correct whether this resolves, fails, or hangs.
//
// DELIBERATE, DOCUMENTED EXCEPTION to .claude/rules/capability-logging.md, agreed in this session's
// kickoff (Section 3): this module must NEVER call the shared activity logger. It runs *inside* that
// logger's own continuation, so a write from here would trigger a resolve, which would trigger a
// write, without bound. Its platform_services row carries tracking_status 'untracked' for exactly
// that reason -- a legitimate value already used by 16 other rows. A future session must not "fix"
// this by adding instrumentation.

const IPINFO_TIMEOUT_MS = 5000;
const CACHE_TIMEOUT_MS = 5000;

// Loopback, private, link-local and unique-local space. These never leave the building, carry no
// org, and would burn a lookup (and a rate-limit slot) to learn nothing.
const PRIVATE_V4 = /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
const PRIVATE_V6 = /^(::1$|::$|fc|fd|fe80:)/i;

function isPlausiblePublicIp(ip) {
  if (typeof ip !== 'string') return false;
  const v = ip.trim();
  if (!v) return false;
  if (v.includes(':')) {
    // IPv6-shaped: hex groups, colons, and the embedded-IPv4 dotted tail.
    if (!/^[0-9a-f:.]+$/i.test(v) || !v.includes('::') && v.split(':').length < 3) return false;
    return !PRIVATE_V6.test(v);
  }
  const octets = v.split('.');
  if (octets.length !== 4) return false;
  for (const o of octets) {
    if (!/^\d{1,3}$/.test(o) || Number(o) > 255) return false;
  }
  return !PRIVATE_V4.test(v);
}

function timeoutSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined; // ancient runtime: no timeout rather than no request
  }
}

/**
 * Fire-and-forget: ensure ip_org_cache holds exactly one row for this address.
 * Returns a promise that always fulfils with undefined -- callers must never depend on its value,
 * and nothing on the request path may await it.
 */
export async function resolveOrgIfUnseen(ip) {
  try {
    if (!isPlausiblePublicIp(ip)) return;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    const auth = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    // Rule 1 -- the cache read comes first and short-circuits everything. The test is whether a
    // resolution was ever ATTEMPTED, not whether a row exists (LOG-141): middleware.js writes a
    // minimal first-sighting row (caller_ip, and at most country) before this ever runs, so
    // `select=caller_ip` -- the retired form -- read that bare row as a cache hit and the ipinfo
    // lookup never happened. Every address first seen after HAR-33 shipped therefore kept
    // org/city/region NULL permanently. `resolver` is the attempted-marker and needs no new column:
    // Rule 2's write sets it to 'ipinfo.io' on BOTH the success and the failure path.
    // NOT `resolved_at` -- it is non-NULL on rows this module never touched, so keying on it would
    // read a never-attempted row as attempted and rebuild the very bug (measured live: both
    // NULL-org rows carry a resolved_at and a NULL resolver).
    let cached;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/ip_org_cache?select=resolver&limit=1&caller_ip=eq.${encodeURIComponent(ip)}`,
        { headers: auth, signal: timeoutSignal(CACHE_TIMEOUT_MS) },
      );
      cached = res.ok ? await res.json() : null;
    } catch {
      cached = null;
    }
    // Resolved before -- or attempted and failed, which is the same permanent answer: no outbound
    // call, ever again. This is the anti-runaway, and it is unchanged by LOG-141; only the set of
    // rows that count as "attempted" narrowed.
    if (Array.isArray(cached) && cached.length > 0 && cached[0] && cached[0].resolver != null) return;
    // A cache read that FAILED (null, not an empty array) is not a miss -- treating it as one would
    // re-query the provider on every call for as long as Supabase reads are broken, which is
    // precisely the runaway this module is built to avoid. Skip this sighting; the next one retries.
    if (!Array.isArray(cached)) return;

    // Rule 2 -- a miss resolves once, and writes its row whatever the outcome.
    let info = null;
    try {
      // The anonymous tier is sufficient at this platform's volume, so the token is optional by
      // design: a missing IPINFO_TOKEN degrades to the anonymous endpoint, never to an error.
      const token = process.env.IPINFO_TOKEN;
      const res = await fetch(
        `https://ipinfo.io/${encodeURIComponent(ip)}/json${token ? `?token=${encodeURIComponent(token)}` : ''}`,
        { headers: { Accept: 'application/json' }, signal: timeoutSignal(IPINFO_TIMEOUT_MS) },
      );
      if (res.ok) {
        const body = await res.json();
        if (body && typeof body === 'object' && !Array.isArray(body)) info = body;
      }
    } catch {
      info = null; // non-200, timeout, malformed body, network error -- all one case: org unknown
    }

    // on_conflict + resolution=merge-duplicates is PostgREST's ON CONFLICT DO UPDATE, and it
    // updates ONLY the columns present in this payload. That is the second half of LOG-141 and
    // without it the Rule-1 fix above is inert: by the time this runs the gate's minimal row
    // already exists, so the retired `ignore-duplicates` (ON CONFLICT DO NOTHING) silently threw
    // away the lookup this call had just paid for. The gate's own columns -- permission,
    // spend_limit_usd, block_reason, blocked_at, blocked_attempts -- are absent from the payload
    // and are therefore never touched by this write. Two concurrent invocations racing the same
    // unresolved address is still normal and harmless: both merge the same values.
    await fetch(`${supabaseUrl}/rest/v1/ip_org_cache?on_conflict=caller_ip`, {
      method: 'POST',
      headers: {
        ...auth,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        caller_ip: ip,
        org: typeof info?.org === 'string' ? info.org : null,
        city: typeof info?.city === 'string' ? info.city : null,
        region: typeof info?.region === 'string' ? info.region : null,
        country: typeof info?.country === 'string' ? info.country : null,
        resolver: 'ipinfo.io',
        resolved_at: new Date().toISOString(),
        // caller_ip_masked is a GENERATED column (LOG-124) -- never written from here; any attempt
        // to include it errors the insert.
      }),
    }).catch(() => {});
  } catch {
    // Observability must never become a failure mode for the platform.
  }
}
