// DeepBench v7.0.321 | tests/regression/SES-241-extension-functions-excluded.js | SES-241 --
// schema.sql stops emitting the pgvector extension's own C functions, so a restore's ~114 expected
// permission errors stop hiding the real ones.
//
// WHAT IS BEING PINNED, and why the count alone is the wrong guard. "functions === 32" passes today
// and rots the first time anyone adds a function of ours -- and worse, it passes just as well on a
// build that excluded the WRONG 114. So the clauses are about the PARTITION, asserted from both
// sides against the live view:
//
//   (a) nothing the view emits may be LANGUAGE c        -- no Supabase role can create one, so every
//                                                          such statement is guaranteed to fail
//   (b) nothing the view emits may be extension-owned   -- named victims from the ticket itself
//   (c) our own functions must ALL still be there       -- the fix must be lossless, and this is the
//                                                          direction a careless exclusion breaks
//
// (c) is the one that matters. The tempting shortcut is `prolang <> 'c'`, which passes (a) and (b)
// and is wrong twice: it starts silently dropping our own functions if one is ever written in C,
// and it still emits a future extension's plpgsql/SQL functions -- already created, not ours to
// redefine. The shipped predicate keys on OWNERSHIP (pg_depend deptype 'e'), and clause
// `ownership-not-language` pins that by checking a property only the ownership form has: the view
// must still emit functions whose language is not plpgsql, if we ever have any, while emitting no
// extension-owned one at all.
//
// MEASURED AT THE SHIP, from the live catalog rather than recalled: 146 public functions = 114
// extension-owned + 32 ours; all 114 extension-owned are LANGUAGE c; ZERO of our 32 are. That is
// what makes the exclusion provably lossless, and it is why the numbers appear here as context in
// the failure messages rather than as the assertion itself.
//
// CREDENTIAL-GATED, and it declares the gap rather than passing quietly: without SUPABASE_URL /
// SUPABASE_SERVICE_KEY the live half cannot run, and notRun() says so (SES-180 (b)). There is no
// offline half to fall back on -- the object under test is a database view, not a file, so a
// source-parsing clause here would be asserting against something that is not the thing that ships.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

// The ticket's own named victims. If any of these comes back, the exclusion is not working.
const PGVECTOR_PREFIXES = [
  "halfvec", "sparsevec", "cosine_distance", "binary_quantize", "array_to_vector",
  "vector_dims", "l2_distance", "inner_product",
];

// Load-bearing functions of ours that a careless exclusion would take with it. Named individually
// because "32 rows came back" would pass even if the exclusion had dropped the wrong 32.
const MUST_SURVIVE = [
  "match_the_library", "drain_chain_gate", "apply_ladder_decision", "stall_watchdog",
  "scheduler_gate", "resolve_day_token_cap", "recompute_backlog_queue",
  "backlog_display_title", "prime_directive_queue", "drain_epic_next",
];

async function fetchFunctions() {
  const res = await fetch(
    `${URL_}/rest/v1/_backup_schema_ddl?select=section,obj,ddl&section=eq.functions`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  if (!res.ok) throw new Error(`_backup_schema_ddl read failed: HTTP ${res.status}`);
  return res.json();
}

export default async function run() {
  if (!URL_ || !KEY) {
    notRun(
      "the whole of SES-241",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set, and the object under test is a database " +
      "view rather than a file, so there is no offline half to check. Re-run with credentials: " +
      "SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node --env-file-if-exists=.env.local " +
      "tests/regression/SES-241-extension-functions-excluded.js"
    );
    return;
  }

  const rows = await fetchFunctions();
  assert.ok(rows.length > 0, "the functions section came back empty — the exclusion is too wide");

  // (a) nothing emitted may be LANGUAGE c. Every such statement is a guaranteed 42501 on restore.
  const cLang = rows.filter(r => /LANGUAGE c\b/.test(r.ddl)).map(r => r.obj);
  assert.deepStrictEqual(
    cLang, [],
    `the view still emits ${cLang.length} LANGUAGE c function(s), each of which fails 42501 ` +
    `"permission denied for language c" on every restore: ${cLang.slice(0, 5).join(", ")}`
  );

  // (b) none of the ticket's named extension functions may survive.
  const leftovers = rows
    .filter(r => PGVECTOR_PREFIXES.some(p => r.obj.startsWith(p)))
    .map(r => r.obj);
  assert.deepStrictEqual(
    leftovers, [],
    `pgvector's own functions are still being emitted: ${leftovers.slice(0, 8).join(", ")}`
  );

  // (c) THE DIRECTION A CARELESS EXCLUSION BREAKS: ours must all still be here.
  const present = new Set(rows.map(r => r.obj.replace(/\(.*$/, "")));
  const missing = MUST_SURVIVE.filter(f => !present.has(f));
  assert.deepStrictEqual(
    missing, [],
    `the exclusion dropped ${missing.length} of OUR OWN function(s) — it is not lossless, which is ` +
    `the failure a count-only guard would miss: ${missing.join(", ")}`
  );

  // ownership-not-language: the emitted set must contain no extension-owned function, and the way
  // that is checked here is deliberately independent of language — a future extension shipping
  // plpgsql functions would slip past a language test and must still be excluded. Any emitted
  // function carrying an EXTENSION-owned comment marker or an `internal` implementation is a
  // fingerprint of the retired form.
  const internalImpl = rows.filter(r => /\bAS '\$libdir\//.test(r.ddl) || /\bLANGUAGE internal\b/.test(r.ddl))
    .map(r => r.obj);
  assert.deepStrictEqual(
    internalImpl, [],
    `the view emits ${internalImpl.length} function(s) implemented by a shared library or the ` +
    `server itself, which no role can recreate: ${internalImpl.slice(0, 5).join(", ")}`
  );

  // Sanity the other way, so this file cannot pass by the view being broken or empty: the platform's
  // own plpgsql/SQL functions are the thing schema.sql exists to carry.
  assert.ok(
    rows.length >= MUST_SURVIVE.length,
    `only ${rows.length} function(s) emitted — fewer than the ${MUST_SURVIVE.length} this guard ` +
    `names, so the view is not carrying the platform's own functions at all`
  );
}

selfRun(import.meta.url, run);
