// DeepBench v6.3.223 | tests/regression/DAT-11-supersede-operation-enum.js | DAT-11
// FEATURE: DAT-11 -- Category M persistence (STANDARDS.md Section 4/5). The operation vocabulary
// for a Library write lives in two places that can drift apart silently: the `operation` enum on
// the `library-write-intent` Skill row (Supabase data -- what the model is allowed to ask for) and
// writeLibrary()'s branches in lib/librarian.js (code -- what the broker can actually do). Either
// side moving alone is a real failure mode: an enum value with no branch reaches
// `denied-unknown-operation` at runtime, and a branch with no enum value is unreachable dead code
// the model can never select -- which is exactly what `supersede` would have been if Task 2 had
// shipped without Task 3.
//
// The broker half is read out of the REAL lib/librarian.js source, never a hardcoded list, so a
// future edit that drops the supersede branch is what this measures rather than a copy of it.
// (Source-read rather than import-and-call: the operation set is a set of string branches with no
// callable accessor, and calling writeLibrary() would need live credentials for every assertion.)
//
// The Skill-row half needs Supabase credentials. run-all.js is invoked without --env-file, so that
// half announces itself as skipped rather than passing quietly -- a green line that proved nothing
// is the failure mode this comment exists to prevent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARIAN = path.join(__dirname, "..", "..", "lib", "librarian.js");

// Every operation writeLibrary() can actually execute, read off its own branches.
export function brokerOperations(source) {
  const found = new Set();
  for (const m of source.matchAll(/operation\s*===\s*["']([a-z_]+)["']/g)) found.add(m[1]);
  return found;
}

export default async function run() {
  const source = fs.readFileSync(LIBRARIAN, "utf8");
  const ops = brokerOperations(source);

  assert.ok(ops.has("supersede"),
    "writeLibrary() must still have a `supersede` branch -- without it the Skill enum offers the model an operation the broker will answer with denied-unknown-operation");
  for (const op of ["insert", "update_status", "bulk_reset"]) {
    assert.ok(ops.has(op), `writeLibrary() must still handle \`${op}\` -- DAT-11 removes nothing`);
  }
  assert.equal(ops.size, 4,
    `writeLibrary() handles exactly 4 operations; found ${ops.size}: ${[...ops].join(", ")}. A new one must be added to library-write-intent's enum in the same change.`);

  // The baseline retirement gate is the other half of DAT-11 that only code can carry: update_status
  // must refuse to retire an is_baseline row, so that path is only reachable through supersede.
  assert.ok(
    source.includes("denied-baseline-retire-requires-supersede"),
    "update_status's baseline retirement gate is gone -- a bare status change could retire an is_baseline row again, which is what left 59eede59 orphan-superseded"
  );
  assert.equal(
    (source.match(/denied-baseline-retire-requires-supersede/g) || []).length, 1,
    "the baseline denial tier must be defined in exactly one place"
  );

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  [DAT-11] Skill-row half SKIPPED -- no Supabase credentials in env " +
      "(run with `node --env-file=.env.local tests/regression/run-all.js` to include it). " +
      "The broker half above did run.");
    return;
  }

  const res = await fetch(
    `${url}/rest/v1/skill_profiles?slug=eq.library-write-intent&select=traits`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  assert.ok(res.ok, `skill_profiles read failed: HTTP ${res.status}`);
  const [skill] = await res.json();
  assert.ok(skill, "library-write-intent Skill row is missing");

  const en = skill?.traits?.schema?.properties?.operation?.enum || [];
  assert.ok(en.includes("supersede"), `enum must contain supersede: ${JSON.stringify(en)}`);
  assert.ok(en.includes("insert") && en.includes("update_status"),
    `enum must still contain insert + update_status: ${JSON.stringify(en)}`);
  for (const op of en) {
    assert.ok(ops.has(op), `enum offers \`${op}\`, which writeLibrary() has no branch for`);
  }
  assert.equal(skill?.traits?.handler, "library-write",
    `handler must stay library-write, got ${skill?.traits?.handler}`);
}

selfRun(import.meta.url, run);
