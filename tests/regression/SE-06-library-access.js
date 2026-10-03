#!/usr/bin/env node
// DeepBench v7.0.260 | tests/regression/SE-06-library-access.js | SE-06 -- the guard on the
// Librarian full-CRUD enforcement grep (scripts/check-library-access.js).
//
// WHAT THIS TEST IS FOR, and why the obvious version of it is worthless. The obvious test runs the
// checker over the repo and asserts exit 0. That passes on a checker whose scanner matches NOTHING
// -- which is precisely the failure mode of a grep check, and precisely SES-199's rubber stamp (a
// tripwire that exit(0)'d on every path). A boundary check has to be shown to FIRE before its
// silence means anything. So every assertion below comes in a pair: the scanner finds a planted
// violation, AND it stays quiet on the real tree.
//
// IT IMPORTS THE REAL FUNCTIONS AND NEVER RE-IMPLEMENTS THEM. That is SES-45's lesson -- "a test
// that recreates the logic under test instead of importing it passes against the bug it guards" --
// and SES-45 is itself an open member of this same Selfbuild M3 epic, so writing this file the
// other way would have shipped the exact defect a sibling ticket is open against. scanText(),
// checkWorktree() and both allowlists come from the shipped module; a regex copied into this file
// would keep passing after someone broke the one in the script.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import {
  scanText,
  checkWorktree,
  walk,
  BROKER_FILES,
  PRIMITIVE_FILES,
  DECLARED_EXCEPTIONS,
} from "../../scripts/check-library-access.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function tmpTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se06-"));
  fs.mkdirSync(path.join(root, "api"), { recursive: true });
  fs.mkdirSync(path.join(root, "lib"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  return root;
}

export default async function run() {
  // --- 1. THE NEGATIVE CONTROL: the matcher fires on each violation shape ----------------------
  // Each of these is a real way the boundary has been or could be broken. A scanner that returned
  // [] unconditionally fails here, which is the assertion that makes clause 4's silence meaningful.

  const violations = [
    ["A", `import { queryLibrary } from '../../lib/librarian.js';`, "static import of the broker module"],
    ["A", `const { writeLibrary } = await import("../lib/librarian.js");`, "dynamic import of the broker module"],
    ["A", `const lib = require('../../../lib/librarian.js');`, "CommonJS require of the broker module"],
    ["B", `const r = await fetch(\`\${supabaseUrl}/rest/v1/the_library?id=eq.1\`);`, "direct PostgREST reach"],
    ["B", `supabase.from('the_library').select('id')`, "direct supabase-js table reach"],
    ["B", `const { data } = await supabase.rpc('match_the_library', args);`, "direct vector-search RPC"],
  ];

  for (const [assertion, line, what] of violations) {
    const hits = scanText("api/some-new-route.js", line);
    assert.ok(
      hits.some(h => h.assertion === assertion),
      `scanText() missed assertion ${assertion} on ${what} -- the checker cannot see: ${line}`
    );
  }

  // --- 2. IT DOES NOT FIRE ON PROSE -----------------------------------------------------------
  // 14 files in this repo mention the librarian in comments, and lib/vector-search.js's header
  // names BOTH broker files in one sentence. A matcher that flagged those would fire on every file
  // that documents the boundary, which is how an allowlist gets widened until it means nothing.

  const prose = [
    `// FEATURE: AG-30 -- writeLibrary() no longer calls this (lib/librarian.js now owns it)`,
    `  // RAG search (queryLibrary()'s uber_access branch requires an explicit tag).`,
    `  * both enforce their own access rules before reaching /rest/v1/the_library directly.`,
    `/* match_the_library's RETURNS TABLE gained a column in DAT-12. */`,
  ];
  for (const line of prose) {
    assert.deepStrictEqual(
      scanText("lib/some-file.js", line), [],
      `scanText() flagged a COMMENT, which would fire on every file documenting §19c: ${line}`
    );
  }

  // A source label that merely equals the string is not a table reach -- ai-enrichment.js and
  // search-harness.js both branch on `source`/`store` === 'the_library' as a routing value.
  assert.deepStrictEqual(
    scanText("api/prompt/ai-enrichment.js", `      : (fi.source === "the_library" || fi.source === "roster")`), [],
    "a fetch_instruction source label is a routing value, not a direct table reach"
  );

  // --- 3. THE PERMISSION MODEL, BOTH DIRECTIONS -----------------------------------------------
  // A one-directional check passes on a scanner nobody can trip. Same planted violation, moved
  // between an allowlisted path, a declared-exception path, and an ordinary one.

  const root = tmpTree();
  try {
    const offending = `import { writeLibrary } from '../lib/librarian.js';\n`;
    const directRead = `supabase.from('the_library').select('id')\n`;

    // (a) an allowlisted broker file may do it -- no violation, no exception
    fs.writeFileSync(path.join(root, "lib/search-harness.js"), offending);
    let res = checkWorktree(root);
    assert.strictEqual(res.violations.length, 0, "an allowlisted broker file must not be a violation");
    fs.unlinkSync(path.join(root, "lib/search-harness.js"));

    // (b) any other file doing the same thing IS a violation
    fs.writeFileSync(path.join(root, "api/rogue-route.js"), offending);
    res = checkWorktree(root);
    assert.strictEqual(res.violations.length, 1, "a non-allowlisted importer must be a violation");
    assert.strictEqual(res.violations[0].assertion, "A");
    assert.strictEqual(res.violations[0].file, "api/rogue-route.js");
    fs.unlinkSync(path.join(root, "api/rogue-route.js"));

    // (c) a DECLARED EXCEPTION is reported, carries its ticket, and does not fail the run
    fs.writeFileSync(path.join(root, "src/hooks-stub.js"), directRead);
    fs.mkdirSync(path.join(root, "src/hooks"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/hooks/useAgents.js"), directRead);
    res = checkWorktree(root);
    const exc = res.exceptions.find(e => e.file === "src/hooks/useAgents.js");
    assert.ok(exc, "the declared exception must be REPORTED, never silently dropped");
    assert.ok(exc.ticket && exc.reason, "a declared exception must carry its ticket and its reason");
    assert.ok(
      res.violations.some(v => v.file === "src/hooks-stub.js"),
      "an UNdeclared file doing the same thing must still fail -- the exception is per-file, not a blanket amnesty"
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  // --- 4. THE REAL TREE IS CLEAN, AND THE SCAN ACTUALLY REACHED IT ----------------------------
  // Only meaningful because clauses 1-3 proved the scanner fires. The file-count assertion is the
  // guard against a walk() that silently stopped finding anything (a renamed directory, a bad
  // skip rule) and reported a clean tree by scanning nothing.

  const scanned = walk(REPO);
  assert.ok(
    scanned.length > 50,
    `walk() found only ${scanned.length} code files -- the scan scope has broken, and a clean result means nothing`
  );
  assert.ok(scanned.includes("lib/librarian.js"), "walk() must reach lib/librarian.js");
  assert.ok(scanned.includes("src/hooks/useAgents.js"), "walk() must reach src/");

  const live = checkWorktree(REPO);
  assert.strictEqual(
    live.violations.length, 0,
    "the Library boundary is broken on this tree:\n" +
      live.violations.map(v => `  ${v.file}:${v.line} (assertion ${v.assertion}) ${v.excerpt}`).join("\n")
  );

  // --- 5. THE TWO LISTS STAY SEPARATE ---------------------------------------------------------
  // The one edit that would quietly gut this check is folding a declared exception into an
  // allowlist: the run goes green, the debt stops being reported, and a future reader cannot tell
  // a sanctioned broker from a thing somebody meant to fix. Assert they never overlap.

  for (const e of DECLARED_EXCEPTIONS) {
    assert.ok(e.reason && e.ticket, `declared exception ${e.file} must carry a reason and a ticket`);
    assert.ok(
      !BROKER_FILES.has(e.file) && !PRIMITIVE_FILES.has(e.file),
      `${e.file} is BOTH a declared exception and an allowlisted file -- known debt has been ` +
        `absorbed into the boundary, which is the one edit that turns this check green by ` +
        `deleting the finding instead of fixing it`
    );
  }
}

selfRun(import.meta.url, run);
