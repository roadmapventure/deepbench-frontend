// DeepBench v7.0.22 | tests/regression/SES-67-confirmation-trace-identity.js | SES-67 --
// confirmation-gate and depth_exceeded returns carry their trace identity (§19p).
//
// Source-level parity guard, same class as SES-62's call-parity guard: found live 2026-07-31
// (design-chi-96, case 6, both runs), the pending_confirmation return -- and the rare
// depth_exceeded return -- were the last executor result shapes without trace_id/span_id, so a
// journey leg terminating at the human-confirmation gate vanished from the regression driver's
// REPORT_JSON.trace_ids (8 captured where 10 ran). This fails loudly if any of those object
// literals drifts back to the bare shape.
//
// Task 1 patched ALL four sites (both depth_exceeded literals verified in trace_id/span_id
// scope -- both live inside runLoop(), whose params declare them); no site was legitimately
// skipped, so no skip carve-out exists below.
//
// Follows the SES-28 self-run guard pattern (default export + selfRun) -- run-all.js calls each
// module's DEFAULT export, and a bare `node <file>` run would otherwise import the module, call
// nothing, and exit 0 (a vacuous green).

import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXECUTOR = readFileSync(path.join(REPO_ROOT, "api/capabilities/execute.js"), "utf8");

// Every OBJECT LITERAL containing `status: '<status>'` -- comments mention these statuses in
// prose ("error/pending_confirmation/depth_exceeded returns"), but never in `status: '...'`
// key-value form, so matching the key-value form is what scopes this to real literals. For each
// match, walk back to the literal's opening `{`, then brace-balance forward to its close, and
// return the whole literal's text.
function statusLiterals(src, status) {
  const re = new RegExp(`status:\\s*'${status}'`, "g");
  const literals = [];
  for (const m of src.matchAll(re)) {
    const open = src.lastIndexOf("{", m.index);
    assert.ok(open >= 0, `no opening brace before status: '${status}' at index ${m.index}`);
    let depth = 0;
    let close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) { close = i; break; }
      }
    }
    assert.ok(close > open, `unbalanced object literal for status: '${status}' at index ${m.index}`);
    assert.ok(close > m.index,
      `walk-back mis-anchored for status: '${status}' at index ${m.index} -- extracted literal closes before the status key`);
    literals.push(src.slice(open, close + 1));
  }
  return literals;
}

async function main() {
  // 1. The pending_confirmation shape exists where SES-67 found it: the gate's return literal
  //    AND its durable_hops result mirror. Fewer than 2 means the anchors drifted -- fail loudly
  //    rather than pass vacuously on a file this guard no longer understands.
  const pending = statusLiterals(EXECUTOR, "pending_confirmation");
  assert.ok(pending.length >= 2,
    `expected >= 2 pending_confirmation object literals (return + durable_hops mirror), found ${pending.length}`);

  // 2. Every one of them carries the loop's own trace identity (§19p: attached where born).
  for (const lit of pending) {
    assert.ok(/\btrace_id\b/.test(lit),
      `a pending_confirmation literal lacks trace_id (SES-67 regression):\n${lit}`);
    assert.ok(/\bspan_id\b/.test(lit),
      `a pending_confirmation literal lacks span_id (SES-67 regression):\n${lit}`);
  }

  // 3. Same for depth_exceeded: both return literals (confirmation-gate critique path + the
  //    delegate-hop ceiling) were patched -- neither was out of scope, so no site is exempt.
  const depth = statusLiterals(EXECUTOR, "depth_exceeded");
  assert.ok(depth.length >= 2,
    `expected >= 2 depth_exceeded object literals, found ${depth.length}`);
  for (const lit of depth) {
    assert.ok(/\btrace_id\b/.test(lit),
      `a depth_exceeded literal lacks trace_id (SES-67 regression):\n${lit}`);
    assert.ok(/\bspan_id\b/.test(lit),
      `a depth_exceeded literal lacks span_id (SES-67 regression):\n${lit}`);
  }

  // 4. The extractor itself discriminates (QA assertion must fail if the fix did nothing): a
  //    bare pre-SES-67 literal must be reported as lacking identity, and the current normal
  //    terminal path's identity fields must be visible to the same extraction.
  const bare = statusLiterals(
    "return { status: 'pending_confirmation', confirmation_id, depth, agent_id, capability_slug };",
    "pending_confirmation"
  );
  assert.strictEqual(bare.length, 1, "extractor must find the fixture literal");
  assert.ok(!/\btrace_id\b/.test(bare[0]), "extractor must see a bare literal as bare");

  return "SES-67 confirmation-gate trace identity: 4/4 PASS";
}

export default main;

selfRun(import.meta.url, main);
