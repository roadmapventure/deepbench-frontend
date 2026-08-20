// DeepBench v7.0.109 | featureFlags.js | HAR-41 — the §19v exposure-rule flag mechanism
// FEATURE: HAR-41 — flags are DATA ROWS (public.feature_flags), not code constants: a new flag
// is an INSERT, not a deploy. One shared reader for the whole frontend. Default OFF, always.
//
// Resolution order, highest first:
//   1. URL override   ?ff=slug-a,!slug-b   (slug-a forced ON, slug-b forced OFF)
//   2. the data row    feature_flags.enabled
//   3. false           — no row, failed fetch, unknown slug, malformed param
//
// Every unknown answer is OFF. That direction is deliberate: §19v ships a new surface behind a
// default-off flag, so the failure mode of this module must be "John doesn't see the new thing
// yet", never "every visitor sees an unapproved surface because a network call failed."
//
// The URL override is the preview mechanism John approved on 2026-08-20 ("url overide is fine"):
// a briefing link carrying ?ff=<slug> shows him a flagged feature switched on while every other
// visitor still sees it off. It is a preview convenience, NOT a security boundary — anyone who
// guesses a slug can flip their own view on, which is exactly why the gated lane (§19v) is what
// keeps unapproved *surfaces* unshipped, and why nothing behind a flag may be a correctness fix.
//
// NOTE: src/lib/supabase.js is imported DYNAMICALLY inside fetchFeatureFlags(), never at module
// top level. The pure resolution logic below has to be importable by a plain Node test run
// (STANDARDS.md Node test) where import.meta.env does not exist and createClient() would throw
// on undefined credentials — the same module-load crash supabase.js's own header documents.

import { useEffect, useState } from "react";

/** The query parameter that carries per-visitor overrides. */
export const FLAG_PARAM = "ff";

/** Slugs are kebab-case so they survive a URL untouched; mirrors the table's CHECK constraint. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

/**
 * Parse `?ff=slug-a,!slug-b` into { "slug-a": true, "slug-b": false }.
 * Anything unparseable is dropped rather than thrown: a mangled link must degrade to "no
 * override" (and therefore to the data row, and therefore to off), never to a broken page.
 *
 * @param {string} search - a location.search string, with or without the leading "?".
 * @returns {Record<string, boolean>}
 */
export function parseFlagOverrides(search) {
  const out = {};
  if (typeof search !== "string" || search === "") return out;

  let raw;
  try {
    raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).getAll(FLAG_PARAM);
  } catch {
    return out;
  }

  for (const value of raw) {
    for (const entry of value.split(",")) {
      const token = entry.trim();
      if (token === "") continue;
      const off = token.startsWith("!");
      const slug = (off ? token.slice(1) : token).toLowerCase();
      if (!SLUG_RE.test(slug)) continue; // unknown shape -> no override -> off
      out[slug] = !off;
    }
  }
  return out;
}

/**
 * Resolve one flag. This is the whole decision, in one place, with no I/O — which is what makes
 * it testable and what makes "default off" checkable rather than asserted.
 *
 * @param {string} slug
 * @param {Array<{slug: string, enabled: boolean}>|null|undefined} rows - rows from feature_flags.
 * @param {Record<string, boolean>|null|undefined} overrides - from parseFlagOverrides().
 * @returns {boolean}
 */
export function resolveFlag(slug, rows, overrides) {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) return false;

  if (overrides && Object.prototype.hasOwnProperty.call(overrides, slug)) {
    return overrides[slug] === true;
  }

  if (!Array.isArray(rows)) return false;
  const row = rows.find(r => r && r.slug === slug);
  return row ? row.enabled === true : false;
}

/** Reads location.search when there is a browser to read it from; "" otherwise. */
export function currentSearch() {
  if (typeof window === "undefined" || !window.location) return "";
  return window.location.search || "";
}

// One in-flight fetch shared by every caller. Ten components asking for ten flags must not
// become ten round trips, and they must all see the same answer within one page load.
let flagsPromise = null;

/**
 * Fetch every flag row with the anon key. Resolves to [] on any failure — see the fail-closed
 * note at the top of this file; resolveFlag() turns [] into false for every slug.
 *
 * @param {{force?: boolean}} [opts] - force:true drops the cache (tests, and a future manual refresh).
 * @returns {Promise<Array<{slug: string, enabled: boolean}>>}
 */
export function fetchFeatureFlags(opts) {
  if (opts && opts.force) flagsPromise = null;
  if (flagsPromise) return flagsPromise;

  flagsPromise = (async () => {
    try {
      const { supabase } = await import("./supabase.js");
      const { data, error } = await supabase.from("feature_flags").select("slug, enabled");
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  })();

  return flagsPromise;
}

/** Test/debug seam: forget the cached fetch. */
export function resetFeatureFlagCache() {
  flagsPromise = null;
}

/**
 * React hook: `const showThing = useFeatureFlag("adm-1-evidence-cards");`
 *
 * Starts false and stays false until a row says otherwise, so a flagged surface cannot flash
 * on during the fetch. An override in the URL is applied on the first render — no wait at all —
 * because the preview link has to work even if the table read is slow or fails outright.
 *
 * @param {string} slug
 * @returns {boolean}
 */
export function useFeatureFlag(slug) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let live = true;
    fetchFeatureFlags().then(r => { if (live) setRows(r); });
    return () => { live = false; };
  }, []);

  return resolveFlag(slug, rows, parseFlagOverrides(currentSearch()));
}
