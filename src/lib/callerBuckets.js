// DeepBench v7.0.152 | callerBuckets.js | LOG-128 -- the predicate that tells automated traffic
// apart from genuinely-ambiguous browser traffic when neither carries a visitor id

/**
 * FEATURE: LOG-128 -- call_source values that mean "a machine John started", as opposed to a real
 * browser whose cookie had not come back yet.
 *
 * Deliberately a closed allow-list rather than "anything that isn't 'ui'". A NULL call_source is
 * NOT in here: it is the pre-LOG-121 unknown, and treating an absent fact as evidence of automation
 * is the backfill §19i forbids. A blank metric is the right failure; a confident wrong label is not.
 */
export const AUTOMATED_NOVID_SOURCES = new Set(["regression", "script", "session-test"]);

/**
 * True when this row is automated traffic that has no identity of its own to group by -- the exact
 * population that today merges into a named org's By Caller row purely because it shares an address.
 *
 * Pure: no I/O, no React, no Supabase. That is what lets the regression test prove the split without
 * rendering the screen.
 *
 * @param {{call_source?: string|null}} row - one ai_activity_log row
 * @param {boolean} hasVisitorId - whether the caller resolved a visitor id for this row
 * @returns {boolean}
 */
export function isAutomatedNoVidRow(row, hasVisitorId) {
  if (hasVisitorId) return false;
  const source = row?.call_source;
  return typeof source === "string" && AUTOMATED_NOVID_SOURCES.has(source);
}

/**
 * The By Caller identity an automated bucket gets. Kept next to the predicate so the key and the
 * label can never drift apart -- the `|automated` suffix is what stops it colliding with the
 * plain `ip:` bucket the same address still uses for its browser traffic.
 *
 * @param {string} ip - the masked address (never the raw one -- LOG-124)
 * @param {string|null} org - resolved org name, if ip_org_cache has one
 * @returns {{key: string, label: string}}
 */
export function automatedBucketIdentity(ip, org) {
  return { key: `ip:${ip}|automated`, label: `${org || ip} — Automated` };
}
