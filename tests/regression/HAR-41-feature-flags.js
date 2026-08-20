// DeepBench v7.0.109 | tests/regression/HAR-41-feature-flags.js | HAR-41
// FEATURE: HAR-41 -- the §19v exposure-rule flag mechanism. This suite guards the four
// properties that decide whether an unattended flagged ship is safe:
//
//   1. DEFAULT OFF is real. No row, a row saying enabled=false, a failed fetch (which the
//      reader turns into []), an unknown slug -- every one of them resolves false. If this
//      regressed, a P1-P4 surface built behind a flag would be live to every visitor the
//      moment it merged, which is the precise outcome §19v's exposure rule exists to prevent.
//   2. THE ROW IS ACTUALLY READ. The red control for #1: a resolver that returns false
//      unconditionally passes every default-off assertion and is worthless. enabled=true must
//      come back true, or the flag can never be turned ON and the mechanism is decorative.
//   3. THE OVERRIDE WINS, IN BOTH DIRECTIONS. ?ff=slug previews an off flag as on (John's
//      approved preview link, 2026-08-20: "url overide is fine"); ?ff=!slug forces a live flag
//      off. One-directional override would make the briefing link unable to preview.
//   4. A MANGLED LINK DEGRADES TO OFF, never to a throw. The override arrives from a URL --
//      i.e. from anyone -- so garbage in the parameter must be inert, not an exception that
//      takes the screen down.
//
// No network, no credentials, no disk. src/lib/featureFlags.js keeps its Supabase import
// dynamic and inside fetchFeatureFlags() precisely so this file can import the resolution
// logic in a plain Node run; if that ever regressed to a top-level import, this test would
// crash on module load (createClient with undefined env) -- which is itself worth catching.
// The live half of HAR-41's QA -- the anon key really reading the real table, and its writes
// really being denied -- is a seam proof run against Supabase and recorded in the cycle's
// runner_items evidence, not here.

import assert from "assert";
import { selfRun } from "./_lib/self-run.js";
import {
  FLAG_PARAM,
  parseFlagOverrides,
  resolveFlag,
} from "../../src/lib/featureFlags.js";

// Shape of what fetchFeatureFlags() resolves to: exactly the columns the reader selects.
const ROWS = [
  { slug: "adm-1-evidence-cards", enabled: false },
  { slug: "shipped-and-on", enabled: true },
];

// ---------------------------------------------------------------------------
// 1. Default off -- every way a flag can be unknown
// ---------------------------------------------------------------------------
function defaultsOff() {
  assert.strictEqual(
    resolveFlag("adm-1-evidence-cards", ROWS, {}), false,
    "a row saying enabled=false must resolve false",
  );
  assert.strictEqual(
    resolveFlag("never-filed", ROWS, {}), false,
    "a slug with no row at all must resolve false -- a flag nobody created is not on",
  );
  assert.strictEqual(
    resolveFlag("shipped-and-on", [], {}), false,
    "an empty row set (what a FAILED fetch resolves to) must resolve false, not throw or default on",
  );
  assert.strictEqual(
    resolveFlag("shipped-and-on", null, {}), false,
    "rows=null (fetch not finished yet) must resolve false -- no flash of an unapproved surface",
  );
  assert.strictEqual(
    resolveFlag("shipped-and-on", undefined, undefined), false,
    "both arguments missing must still be false",
  );
}

// ---------------------------------------------------------------------------
// 2. Red control -- the resolver is not just returning false
// ---------------------------------------------------------------------------
function theRowIsRead() {
  assert.strictEqual(
    resolveFlag("shipped-and-on", ROWS, {}), true,
    "enabled=true must resolve TRUE -- without this, every assertion above is vacuous",
  );
}

// ---------------------------------------------------------------------------
// 3. The URL override, both directions
// ---------------------------------------------------------------------------
function overrideWins() {
  const on = parseFlagOverrides("?ff=adm-1-evidence-cards");
  assert.deepStrictEqual(on, { "adm-1-evidence-cards": true });
  assert.strictEqual(
    resolveFlag("adm-1-evidence-cards", ROWS, on), true,
    "?ff=slug must preview an OFF flag as on -- this is the whole preview mechanism",
  );

  const off = parseFlagOverrides("?ff=!shipped-and-on");
  assert.deepStrictEqual(off, { "shipped-and-on": false });
  assert.strictEqual(
    resolveFlag("shipped-and-on", ROWS, off), false,
    "?ff=!slug must force a LIVE flag off",
  );

  // The override must not leak to its neighbours.
  assert.strictEqual(
    resolveFlag("shipped-and-on", ROWS, on), true,
    "overriding one slug must leave every other slug resolving from its own row",
  );

  // Multiple flags, mixed directions, one link.
  const both = parseFlagOverrides("?ff=adm-1-evidence-cards,!shipped-and-on");
  assert.deepStrictEqual(both, { "adm-1-evidence-cards": true, "shipped-and-on": false });

  // Repeated parameters and whitespace are the shapes a hand-edited link actually arrives in.
  assert.deepStrictEqual(
    parseFlagOverrides("?ff=one-flag&ff=two-flag"), { "one-flag": true, "two-flag": true },
    "a repeated ff parameter must accumulate, not overwrite",
  );
  assert.deepStrictEqual(
    parseFlagOverrides("?ff= one-flag , !two-flag "), { "one-flag": true, "two-flag": false },
    "whitespace around entries is tolerated",
  );
  assert.deepStrictEqual(
    parseFlagOverrides("?other=x&ff=one-flag"), { "one-flag": true },
    "unrelated query parameters are ignored",
  );
  assert.strictEqual(FLAG_PARAM, "ff", "the parameter name is part of the contract -- links carry it");
}

// ---------------------------------------------------------------------------
// 4. A mangled link is inert
// ---------------------------------------------------------------------------
function garbageIsInert() {
  for (const bad of ["", "?", "?ff=", "?ff=,,,", "?ff=!", "?nothing=here"]) {
    assert.deepStrictEqual(parseFlagOverrides(bad), {}, `"${bad}" must yield no overrides`);
  }
  for (const bad of [null, undefined, 42, {}]) {
    assert.deepStrictEqual(parseFlagOverrides(bad), {}, "a non-string search must yield no overrides");
  }

  // Slugs that do not match the table's CHECK constraint are dropped rather than honoured --
  // an override is only ever able to name a flag that could really exist.
  assert.deepStrictEqual(
    parseFlagOverrides("?ff=Bad_Slug!!,-leading,ok-slug"), { "ok-slug": true },
    "malformed slugs are dropped; the valid one in the same list still applies",
  );
  assert.strictEqual(
    resolveFlag("Bad_Slug", ROWS, { Bad_Slug: true }), false,
    "resolveFlag rejects a malformed slug even if an override names it",
  );
  assert.strictEqual(resolveFlag(null, ROWS, {}), false, "a non-string slug must be false, not a throw");

  // Truthiness is not enough: only a real boolean true turns a flag on, on either layer.
  assert.strictEqual(
    resolveFlag("one-flag", [{ slug: "one-flag", enabled: "true" }], {}), false,
    "a string 'true' in the row must NOT enable -- only boolean true does",
  );
  assert.strictEqual(
    resolveFlag("one-flag", ROWS, { "one-flag": "yes" }), false,
    "a non-boolean override value must NOT enable",
  );
}

export default async function run() {
  defaultsOff();
  theRowIsRead();
  overrideWins();
  garbageIsInert();
}

selfRun(import.meta.url, run);
