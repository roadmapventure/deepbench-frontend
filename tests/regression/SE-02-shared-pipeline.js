#!/usr/bin/env node
// DeepBench v7.0.263 | tests/regression/SE-02-shared-pipeline.js | SE-02 -- the guard on the
// shared-pipeline no-conditionals grep (scripts/check-shared-pipeline.js).
//
// WHY THE OBVIOUS TEST IS WORTHLESS: run the checker, assert exit 0. That passes on a scanner that
// matches NOTHING -- the standing failure mode of a grep check (SES-199's rubber stamp). Silence
// only means something after the scanner has been shown to fire. Every clause below comes in a pair.
//
// THE CLAUSE THAT CARRIES THIS TICKET is clause 2. On the tree this shipped against, the NAIVE form
// of this check -- "an `if` mentioning agent_id in a governed file" -- returns FOURTEEN hits and all
// fourteen are legitimate presence checks and error messages. A check that fires on them is switched
// off within a week, and then the Founding Principle has no guard at all. Those exact live line
// shapes are asserted clean here so a later "simplify the regex" cannot quietly reintroduce them.
//
// CLAUSE 4 IS THE SCOPE BOUNDARY AND IS NOT DECORATION. api/brief.js:90 really does carry
// `if (agent_id === "pat")`. It is NOT a violation -- §19 names three files, §19b one, §19d two
// primitives, and brief.js is none of them -- so the check must REPORT it and must NOT fail on it.
// Both halves are asserted: reported (or the finding is lost) and non-failing (or the check widens a
// LOCKED rule on its own authority, which is what SES-196 refused to do for `removal proposed`).
//
// IT IMPORTS THE REAL FUNCTIONS AND NEVER RE-IMPLEMENTS THEM (SES-45 -- itself an open member of
// this same Selfbuild M3 epic, so writing this file the other way would ship the exact defect a
// sibling ticket is open against).

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
  FOUNDING_FILES,
  EXECUTE_FILE,
  LOOP_FILES,
} from "../../scripts/check-shared-pipeline.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function tmpTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "se02-"));
  for (const rel of [...FOUNDING_FILES, EXECUTE_FILE, ...LOOP_FILES]) {
    fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), "// clean\n");
  }
  return root;
}

export default async function run() {
  // --- 1. THE MATCHER FIRES ON EVERY BRANCH-ON-IDENTITY SHAPE ---------------------------------
  const violations = [
    `  if (agent_id === "alex") { return special(); }`,
    `  if (agentId !== 'marcus') { return null; }`,
    `  if (deliverable_type === "pdf") { renderPdf(); }`,
    `  if (capability_slug === \`channel-intelligence\`) { legacy(); }`,
    `  if ("pat" === agent_id) { bypass(); }`,
    `  switch (agentId) { case 'owen': return gate(); }`,
    `  if (['alex','marcus'].includes(agentId)) { return true; }`,
    `  if (['alex','marcus'].indexOf(agent_id) >= 0) { return true; }`,
  ];
  for (const line of violations) {
    const hits = scanText("api/prompt/db-assembly.js", line);
    assert.ok(hits.length > 0, `scanText() missed a branch-on-identity: ${line}`);
  }

  // --- 2. IT DOES NOT FIRE ON A PRESENCE CHECK ------------------------------------------------
  // These are the live shapes from the governed files. All fourteen naive hits reduce to these.
  const legitimate = [
    `  if (capability_slug) cfg.capability_slug = capability_slug;`,
    `  if (!capability_slug && !agent_id) {`,
    `  if (agent_id) {`,
    `  } else if (agent_id) {`,
    `  if (deliverableType) workOrderParts.push(\`Deliverable type: \${deliverableType}\`);`,
    `  if (!capability_slug) throw new Error('capability_slug required');`,
    `  if (!agent_id) throw new Error('agent_id required');`,
    `  if (!agentId) return null;`,
    // an id interpolated into an ERROR MESSAGE is not a branch on it
    `  if (!res.ok) throw new Error(\`Failed to resolve holder of capability "\${capability_slug}"\`);`,
    `  if (!rows.length) throw new Error(\`No agent currently holds capability "\${capability_slug}"\`);`,
    // assignment and comparison between two variables are both fine
    `  const agentId = row.agent_id;`,
    `  if (agentId === expectedAgentId) { proceed(); }`,
  ];
  for (const line of legitimate) {
    assert.deepStrictEqual(
      scanText("api/prompt/db-assembly.js", line), [],
      `scanText() flagged a PRESENCE CHECK or a message — the naive-grep failure: ${line}`
    );
  }

  // Comments are skipped: §19's own text quotes `if (agentId === 'x')`, and this script's header
  // quotes it a dozen times. A matcher that read comments would flag the rule's own statement.
  for (const line of [
    `// stop. The fix is a trait, not a conditional: if (agentId === 'x') is forbidden`,
    ` * no capability-specific logic -- no if (capability_slug === 'x'), ever.`,
  ]) {
    assert.deepStrictEqual(scanText("lib/x.js", line), [], `scanText() flagged a COMMENT: ${line}`);
  }

  // --- 3. THE THREE ASSERTIONS ARE SCOPED TO THE RIGHT FILES ----------------------------------
  const root = tmpTree();
  try {
    const planted = `if (agent_id === "alex") { return 1; }\n`;

    for (const [rel, expected] of [
      [FOUNDING_FILES[0], "A"], [FOUNDING_FILES[1], "A"], [FOUNDING_FILES[2], "A"],
      [EXECUTE_FILE, "B"],
      [LOOP_FILES[0], "C"], [LOOP_FILES[1], "C"],
    ]) {
      fs.writeFileSync(path.join(root, rel), planted);
      const res = checkWorktree(root);
      assert.strictEqual(res.violations.length, 1, `a planted conditional in ${rel} must be a violation`);
      assert.strictEqual(
        res.violations[0].assertion, expected,
        `${rel} must report under assertion ${expected}`
      );
      assert.strictEqual(res.adjacent.length, 0, `${rel} is governed — it must not report as adjacent`);
      fs.writeFileSync(path.join(root, rel), "// clean\n");
    }

    // --- 4. THE SCOPE BOUNDARY: an UNGOVERNED file is reported, and does NOT fail --------------
    fs.mkdirSync(path.join(root, "api"), { recursive: true });
    fs.writeFileSync(path.join(root, "api/brief.js"), planted);
    let res = checkWorktree(root);
    assert.strictEqual(
      res.violations.length, 0,
      "an ungoverned capability route must NOT fail the check — §19 does not name it"
    );
    assert.strictEqual(
      res.adjacent.length, 1,
      "an ungoverned hit must still be REPORTED, or the finding is silently lost"
    );
    assert.strictEqual(res.adjacent[0].file, "api/brief.js");

    // --- 5. A MOVED GOVERNED FILE IS exit 2, NEVER A SILENT PASS ------------------------------
    fs.unlinkSync(path.join(root, EXECUTE_FILE));
    res = checkWorktree(root);
    assert.ok(
      res.missing.includes(EXECUTE_FILE),
      "a governed file that has moved must be reported missing, not scanned as absent-and-green"
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  // --- 6. THE REAL TREE, AND NOW ITS SILENCE MEANS SOMETHING ----------------------------------
  const live = checkWorktree(REPO);
  assert.deepStrictEqual(
    live.missing, [],
    "every governed file the rule names must exist: " + live.missing.join(", ")
  );
  assert.strictEqual(
    live.violations.length, 0,
    "the live tree must satisfy §19/§19b/§19d: " +
      live.violations.map(v => `${v.file}:${v.line} (${v.assertion})`).join(", ")
  );
  // THE ANTI-VACUITY CLAUSE IS SEMANTIC, NOT A THRESHOLD, and that is a correction rather than a
  // preference: the first draft asserted `> 50` files, which was a number invented rather than
  // measured — the real surface of api/ + lib/ + shared/ is 34 — and the clause failed on its first
  // run for that reason. A count is also the wrong shape here: it goes stale every time a file is
  // added or removed. Asserting the walk actually REACHES the six files the rule names cannot go
  // stale and is what "the scan is not vacuous" actually means.
  const walked = walk(REPO);
  for (const rel of [...FOUNDING_FILES, EXECUTE_FILE, ...LOOP_FILES]) {
    assert.ok(walked.includes(rel), `walk() never reached the governed file ${rel} — scan is vacuous`);
  }

  // The known adjacent instance is pinned by FILE, not by count: a new one appearing is fine
  // (it reports), but this one disappearing means someone changed brief.js and the scope question
  // this check exists to surface has moved.
  assert.ok(
    live.adjacent.some(a => a.file === "api/brief.js"),
    "api/brief.js's literal-id conditional is the known adjacent instance — if it is gone, " +
      "confirm deliberately and update this clause rather than deleting it"
  );
}

selfRun(import.meta.url, run);
