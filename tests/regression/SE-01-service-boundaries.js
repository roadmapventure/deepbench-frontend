#!/usr/bin/env node
// DeepBench v7.0.262 | tests/regression/SE-01-service-boundaries.js | SE-01 -- the guard on the
// §5/§6 service-boundary enforcement grep (scripts/check-service-boundaries.js).
//
// WHAT THIS TEST IS FOR, and why the obvious version of it is worthless. The obvious test runs the
// checker over the repo and asserts exit 0. That passes on a checker whose scanner matches NOTHING
// -- precisely the failure mode of a grep check, and precisely SES-199's rubber stamp (a tripwire
// that exit(0)'d on every path). A boundary check has to be shown to FIRE before its silence means
// anything. So every assertion below comes in a pair: the scanner finds a planted violation, AND it
// stays quiet on the shapes that are legitimate.
//
// THE FOUR LEGITIMATE LINES ARE THE POINT OF CLAUSE 2, not decoration. On the tree this shipped
// against, a naive grep for "/api/rag-query" and "playwright" returns four hits and ALL FOUR are
// sanctioned: the frontend fetch §5 names by name, a route string inside another check script, a UI
// label, and a capability description. If the matcher flags any of them the check reports 4
// violations where there are 0, and gets allowlisted into vacuity or deleted. Those exact lines are
// asserted clean here so a later "let's simplify the regex" cannot quietly reintroduce that.
//
// IT IMPORTS THE REAL FUNCTIONS AND NEVER RE-IMPLEMENTS THEM. That is SES-45's lesson -- "a test
// that recreates the logic under test instead of importing it passes against the bug it guards" --
// and SES-45 is an open member of this same Selfbuild M3 epic, so writing this file the other way
// would ship the exact defect a sibling ticket is open against. scanText(), checkWorktree(), walk()
// and both allowlists come from the shipped module.

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
  RAG_ROUTE_FILES,
  PLAYWRIGHT_FILES,
} from "../../scripts/check-service-boundaries.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function tmpTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se01-"));
  for (const d of ["api", "lib", "src", "shared"]) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  return root;
}

export default async function run() {
  // --- 1. THE NEGATIVE CONTROL: the matcher fires on each violation shape ----------------------
  // Each is a real way these boundaries would be broken. A scanner returning [] unconditionally
  // fails here, which is the assertion that makes clause 4's silence meaningful.

  const violations = [
    ["A", `  const r = await fetch("/api/rag-query", { method: "POST" });`, "bare fetch at the route"],
    ["A", `  const r = await fetch(\`\${base}/api/rag-query\`, opts);`, "template-literal fetch"],
    ["A", `  const { data } = await axios.post('/api/rag-query', body);`, "axios call"],
    ["A", `  const res = await got.post("https://x.vercel.app/api/rag-query", o);`, "got call"],
    ["B", `import { chromium } from "playwright";`, "static playwright import"],
    ["B", `const { chromium } = require('playwright-core');`, "CommonJS playwright-core require"],
    ["B", `const pw = await import("@playwright/test");`, "dynamic @playwright/test import"],
  ];

  for (const [assertion, line, what] of violations) {
    const hits = scanText("api/some-new-route.js", line, assertion);
    assert.ok(
      hits.length > 0,
      `scanText() missed assertion ${assertion} on ${what} -- the checker cannot see: ${line}`
    );
  }

  // --- 2. IT DOES NOT FIRE ON A MENTION, ONLY ON A CALL ---------------------------------------
  // The four live lines named in the header, verbatim in shape, plus the comment guard.

  const legitimate = [
    ["A", `  "/api/brief", "/api/plan", "/api/web-memory", "/api/rag-query", "/api/load-entries",`,
      "a route named as a string in a list (check-ai-logging-coverage.js)"],
    ["A", `  const ROUTE = "/api/rag-query";`, "assigning the path to a constant is not calling it"],
    ["B", `  <div style={{fontFamily:mono}}>{id} · claude-sonnet-4-5 · Playwright</div>`,
      "a UI label rendering the word (FetchScreen.jsx)"],
    ["B", `  { slug: 'browser-automation', desc: 'Playwright-controlled browser execution' },`,
      "a capability description string (shared/ai-patterns.js)"],
    ["B", `  const engine = "playwright";`, "a string value is not an import"],
  ];

  for (const [assertion, line, what] of legitimate) {
    assert.deepStrictEqual(
      scanText("api/some-file.js", line, assertion), [],
      `scanText() flagged a MENTION, not a call -- ${what}: ${line}`
    );
  }

  // Comment lines are skipped for BOTH assertions -- this repo documents its boundaries by name,
  // and check-service-boundaries.js's own header would flag itself without this.
  for (const [assertion, line] of [
    ["A", `// no capability route calls fetch("/api/rag-query") via internal HTTP`],
    ["B", ` * imports of playwright belong in Railway, never here -- require('playwright')`],
  ]) {
    assert.deepStrictEqual(
      scanText("lib/some-file.js", line, assertion), [],
      `scanText() flagged a COMMENT, which would fire on every file documenting the rule: ${line}`
    );
  }

  // --- 3. THE PERMISSION MODEL AND THE SCOPING, BOTH DIRECTIONS -------------------------------
  // A one-directional check passes on a scanner nobody can trip. The SAME planted line is moved
  // between a permitted path, an out-of-scope path, and an ordinary one.

  const root = tmpTree();
  try {
    const ragCall = `const r = await fetch("/api/rag-query", { method: "POST" });\n`;
    const pwImport = `import { chromium } from "playwright";\n`;

    // (a) api/rag-query.js IS the handler -- it may name its own route.
    fs.writeFileSync(path.join(root, "api/rag-query.js"), ragCall);
    let res = checkWorktree(root);
    assert.strictEqual(res.violations.length, 0, "the route's own handler must not be a violation");
    fs.unlinkSync(path.join(root, "api/rag-query.js"));

    // (b) any OTHER capability route doing it IS a violation.
    fs.writeFileSync(path.join(root, "api/rogue-route.js"), ragCall);
    res = checkWorktree(root);
    assert.strictEqual(res.violations.length, 1, "a capability route calling the RAG route must fail");
    assert.strictEqual(res.violations[0].assertion, "A");
    assert.strictEqual(res.violations[0].file, "api/rogue-route.js");
    fs.unlinkSync(path.join(root, "api/rogue-route.js"));

    // (c) THE SCOPING IS REAL: the identical line in src/ is the frontend caller §5 sanctions BY
    //     NAME. If assertion A ever widens its scan to src/, this is the assertion that catches it.
    fs.writeFileSync(path.join(root, "src/TestTeamScreen.jsx"), ragCall);
    res = checkWorktree(root);
    assert.strictEqual(
      res.violations.length, 0,
      "§5 sanctions frontend callers explicitly -- assertion A must not scan src/"
    );
    fs.unlinkSync(path.join(root, "src/TestTeamScreen.jsx"));

    // (d) assertion B spans the WHOLE Vercel side, not just api/ -- a Playwright import anywhere
    //     on it is a violation. Proven in each scanned dir so a narrowed scope is caught.
    for (const rel of ["api/x.js", "lib/y.js", "src/z.jsx", "shared/w.js"]) {
      fs.writeFileSync(path.join(root, rel), pwImport);
      res = checkWorktree(root);
      assert.strictEqual(
        res.violations.length, 1,
        `a Playwright import in ${rel} must be a violation -- §6 covers all of Vercel`
      );
      assert.strictEqual(res.violations[0].assertion, "B");
      fs.unlinkSync(path.join(root, rel));
    }

    // (e) both assertions fire together and are reported separately.
    fs.writeFileSync(path.join(root, "api/rogue-route.js"), ragCall + pwImport);
    res = checkWorktree(root);
    assert.strictEqual(res.violations.length, 2, "both assertions must report independently");
    assert.deepStrictEqual(
      res.violations.map(v => v.assertion).sort(), ["A", "B"],
      "one violation of each assertion expected"
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  // --- 4. THE REAL TREE IS CLEAN, AND THAT NOW MEANS SOMETHING --------------------------------
  // Only after clauses 1-3 have shown the scanner can fire does this silence carry information.

  const live = checkWorktree(REPO);
  assert.strictEqual(
    live.violations.length, 0,
    "the live tree must satisfy §5/§6: " +
      live.violations.map(v => `${v.file}:${v.line} (${v.assertion})`).join(", ")
  );
  assert.ok(live.scanned > 50, `scan went vacuous -- only ${live.scanned} files scanned`);

  // --- 5. THE PLAYWRIGHT ALLOWLIST IS EMPTY AND MUST STAY EMPTY -------------------------------
  // §6: "No Playwright in Vercel. This line is permanent." An entry here is not a fix, it is the
  // boundary being moved -- John's call on a card, never a session's way to get its import past
  // the check. RAG_ROUTE_FILES is asserted exact for the same reason.
  assert.strictEqual(
    PLAYWRIGHT_FILES.size, 0,
    "§6 is permanent -- a Playwright allowlist entry moves a LOCKED boundary; take it to a card"
  );
  assert.deepStrictEqual(
    [...RAG_ROUTE_FILES].sort(), ["api/rag-query.js"],
    "only the route's own handler may name /api/rag-query inside api/"
  );

  // walk() must actually reach the tree it is pointed at -- a walk returning [] would make every
  // checkWorktree() assertion above pass vacuously.
  assert.ok(walk(REPO, ["api"]).length > 10, "walk() found almost nothing under api/");
}

selfRun(import.meta.url, run);
