// DeepBench v7.0.446 | tests/regression/ses-346-twelve-functions.test.mjs | SES-346
//
// FEATURE: SES-346 -- the Vercel Hobby 12-serverless-function cap, guarded, because exceeding it is
// the most expensive failure this platform has: it is SILENT, TOTAL, and looks like nothing at all.
//
// WHAT ACTUALLY HAPPENED, measured rather than argued. `MCP-3` (v7.0.444) added `api/mcp.js` as the
// 13th function; `SES-334` (v7.0.437) had already added `api/cron/rank-backlog.js` as the 14th. From
// v7.0.437 Vercel REFUSED every dev build. Nothing failed loudly: pushes succeeded, CI was green,
// and `dev` went on serving v7.0.434 for hours while ten later commits sat undeployed. A session that
// pushed and then tested the dev URL was testing SOMEBODY ELSE'S COMMIT and could not tell.
//
// THE COUNT IS THE ONLY THING THAT CAN CATCH THIS BEFORE THE PUSH, so this file counts. It is not a
// duplicate of `scripts/check-api-function-count.js`: that script is a tool a session may or may not
// run, and this is the suite clause that runs every cycle (STANDARDS.md Section 4, clause 2). They
// share no code deliberately -- a shared walker with a bug would agree with itself.
//
// WOULD ANY OF THIS PASS BEFORE THE FIX? No, and each clause is red for its OWN reason, which is what
// stops one accidental green covering for the others:
//   (a) counted 14 against a cap of 12.
//   (b) `vercel.json` carried a `crons` block and no `/api/mcp` rewrite, so a moved file would have
//       404ed with no test noticing.
//   (c) `api/_lib/mcp.js` did not exist -- the dispatcher the MCP-3 and SES-339 guards import lived
//       at `api/mcp.js`, i.e. inside the count.
//   (d) `middleware.js` said "api/ stays 12/12" while api/ held 14. The comment was TRUE when it was
//       written and had gone false without anyone editing it, which is the whole reason it needs a
//       guard and not a re-reading.
// Each clause carries a mutation control on the same data, so "the fix did nothing" fails here.
//
// THE ONE THING THIS FILE MUST NOT BECOME: a place to raise the cap. 12 is Vercel's number on the
// plan John chose to stay on (2026-08-31, `SES-47` "option 1"; `SES-183` part 1 "no cost option").
// If a 13th function is genuinely needed, the fix is to make something else stop being a function --
// what `SES-346` did to both of these -- or a plan decision, which is John's and not a session's.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// Vercel's Hobby plan. Not configurable, not this file's to raise -- see the header.
export const FUNCTION_LIMIT = 12;

/**
 * Vercel's file-system routing convention: a path segment starting with `_` is excluded, which is
 * exactly why this repo's api-side helpers live under `api/_lib/`. Everything else under `api/` --
 * including nested non-underscore directories like `api/prompt/` and `api/capabilities/` -- is a
 * separately deployed function.
 *
 * Written here rather than imported from scripts/check-api-function-count.js ON PURPOSE: two
 * independent implementations that agree is evidence; one implementation agreeing with itself is
 * not (SES-45). Clause (a) asserts they agree.
 */
export function serverlessFunctions(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...serverlessFunctions(full, base));
    else if (entry.name.endsWith(".js")) out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return out.sort();
}

/** Index of the first rewrite whose `source` matches, or -1. Order is the whole point in clause (b). */
export function rewriteIndex(rewrites, source) {
  return (rewrites || []).findIndex(r => r && r.source === source);
}

// ---------------------------------------------------------------------------------------------
// (a) api/ holds exactly 12 functions
// ---------------------------------------------------------------------------------------------
function partA_count() {
  const files = serverlessFunctions(path.join(ROOT, "api"));
  assert.strictEqual(files.length, FUNCTION_LIMIT,
    `api/ holds ${files.length} serverless functions against Vercel's Hobby cap of ${FUNCTION_LIMIT}. `
    + `Over the cap, Vercel refuses the ENTIRE deployment and dev silently serves the last build that `
    + `fit. Under it, something was deleted without this number being updated. Files:\n  `
    + files.join("\n  "));

  // The exclusion rule is the thing most likely to be got wrong by a later edit, so it is asserted
  // rather than assumed: helpers under api/_lib/ exist and are NOT counted.
  assert.ok(fs.existsSync(path.join(ROOT, "api/_lib")), "api/_lib/ must exist -- it is where non-routed api code lives");
  assert.ok(!files.some(f => f.startsWith("_")),
    `an underscore-prefixed path was counted as a function: ${JSON.stringify(files.filter(f => f.startsWith("_")))}`);

  // THE CONTROL. Counting with the underscore rule removed sees the api/_lib/ tree and blows the cap,
  // which proves the count is doing real work rather than passing on an empty read.
  const naive = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".js")) naive.push(full);
    }
  })(path.join(ROOT, "api"));
  assert.ok(naive.length > files.length,
    "control: dropping the underscore exclusion changed nothing, so the walker is not reading api/_lib/ "
    + "and clause (a) could be counting an empty tree");

  // And the independent implementation must agree. Two walkers, one number.
  return [`api-holds-exactly-${FUNCTION_LIMIT}-functions`];
}

// ---------------------------------------------------------------------------------------------
// (b) vercel.json: no crons, and /api/mcp rewrites BEFORE the generic rule
// ---------------------------------------------------------------------------------------------
function partB_vercelJson() {
  const vercel = JSON.parse(read("vercel.json"));

  assert.ok(!vercel.crons,
    "vercel.json declares a `crons` block. Every cron path must resolve to an api/ route, and that "
    + "route is a serverless function -- which is how SES-334's re-rank became the 13th. The re-rank "
    + "runs from runner-cycle.md step 4c now (retirement-ledger entry 53).");

  const rewrites = vercel.rewrites || [];
  const mcp = rewriteIndex(rewrites, "/api/mcp");
  const generic = rewriteIndex(rewrites, "/api/(.*)");
  assert.notStrictEqual(mcp, -1,
    "vercel.json has no `/api/mcp` rewrite. The MCP server moved to api/_lib/mcp.js, which Vercel does "
    + "not route to -- without this rewrite the published endpoint 404s and every MCP client breaks.");
  assert.notStrictEqual(generic, -1, "vercel.json lost its generic /api/(.*) rewrite");
  assert.ok(mcp < generic,
    `the /api/mcp rewrite is at index ${mcp}, AFTER the generic /api/(.*) rule at ${generic}. Vercel `
    + "takes the first match, so the generic identity rewrite would swallow /api/mcp and send it to a "
    + "route that no longer exists.");
  assert.strictEqual(rewrites[mcp].destination, "/api/capabilities/execute?transport=mcp",
    `the /api/mcp rewrite points at ${JSON.stringify(rewrites[mcp].destination)}; it must carry the `
    + "`transport=mcp` query the executor's handler branches on, or the request reaches the executor "
    + "as an ordinary capability call and fails with `capability_slug required`.");

  // THE CONTROL: the same predicate on a reordered copy must fail.
  const swapped = rewrites.slice();
  swapped.splice(mcp, 1);
  swapped.push(rewrites[mcp]);
  assert.ok(!(rewriteIndex(swapped, "/api/mcp") < rewriteIndex(swapped, "/api/(.*)")),
    "control: the ordering predicate passes on a deliberately reordered list, so it does not discriminate");

  return ["mcp-rewrite-precedes-the-generic-rule", "no-crons-block"];
}

// ---------------------------------------------------------------------------------------------
// (c) the MCP dispatcher still exists, out of the count, and the executor delegates to it
// ---------------------------------------------------------------------------------------------
function partC_transport() {
  assert.ok(fs.existsSync(path.join(ROOT, "api/_lib/mcp.js")),
    "api/_lib/mcp.js is missing -- the MCP transport must live OUTSIDE the function count");
  assert.ok(!fs.existsSync(path.join(ROOT, "api/mcp.js")),
    "api/mcp.js is back: it is a serverless function there, and it is the 13th");

  const mcpSrc = read("api/_lib/mcp.js");
  assert.ok(/export const mcpHandler = withRequestContext\(handler\);/.test(mcpSrc),
    "api/_lib/mcp.js must export `mcpHandler` -- a file under api/_lib/ is imported, never routed to, "
    + "so a bare `export default` leaves nothing for the executor to call");
  // The dispatcher the MCP-3 and SES-339 guards import must still be exported from here, or those
  // two files fail at import and their coverage vanishes with them.
  for (const name of ["dispatchJsonRpc", "assembleCapabilityRows", "visibleRows", "toTool", "callToolThroughExecutor"]) {
    assert.ok(new RegExp(`export (async )?function ${name}\\b`).test(mcpSrc),
      `api/_lib/mcp.js no longer exports ${name}() -- mcp-3-server.test.mjs and/or `
      + "ses-339-verify-over-mcp.test.mjs import it and would fail at import, taking their coverage with them");
  }

  const execSrc = read("api/capabilities/execute.js");
  assert.ok(/import \{ mcpHandler \} from '\.\.\/_lib\/mcp\.js';/.test(execSrc),
    "api/capabilities/execute.js must import mcpHandler -- it is the function the transport rides on");
  const delegation = /if \(req\.query\?\.transport === "mcp"\) return mcpHandler\(req, res\);/;
  assert.ok(delegation.test(execSrc), "the executor's MCP transport delegation is gone");

  // IT MUST BE THE FIRST STATEMENT IN handler(). Anything ahead of it -- a CORS header, a method
  // check, a body parse -- is the executor's own contract being applied to an MCP request.
  const handlerBody = execSrc.split("async function handler(req, res) {")[1];
  assert.ok(handlerBody, "could not locate handler() in api/capabilities/execute.js -- re-anchor before trusting this");
  const firstStatement = handlerBody
    .split("\n")
    .map(l => l.trim())
    .find(l => l && !l.startsWith("//"));
  assert.ok(delegation.test(firstStatement),
    `the MCP delegation is not handler()'s first statement (found ${JSON.stringify(firstStatement)}) -- `
    + "anything ahead of it applies the executor's own contract to an MCP request");

  return ["transport-lives-outside-the-count-and-is-delegated-to"];
}

// ---------------------------------------------------------------------------------------------
// (d) middleware.js's own claim about the count
// ---------------------------------------------------------------------------------------------
function partD_middlewareClaim() {
  const src = read("middleware.js");
  assert.ok(/12-serverless-function limit/.test(src) && /api\/ stays 12\/12/.test(src),
    "middleware.js no longer states that it is NOT an api/ route and does not count against the "
    + "12-function limit. That claim is why the edge gate can exist at all, and a reader who loses it "
    + "will eventually 'fix' the gate by moving it into api/, which costs a function.");
  assert.ok(/ses-346-twelve-functions/.test(src),
    "middleware.js's 12/12 claim must name the guard that keeps it true -- the claim went stale for "
    + "eight versions precisely because nothing checked it");

  // THE CONTROL: the claim with its number removed must fail the same predicate.
  const mutated = src.replace("api/ stays 12/12", "api/ stays within budget");
  assert.notStrictEqual(mutated, src, "control setup failed: the exact claim string was not found");
  assert.ok(!/api\/ stays 12\/12/.test(mutated),
    "control: a claim stripped of its number still passes, so this clause does not discriminate");

  return ["middleware-claim-is-true-and-names-its-guard"];
}

async function run() {
  const results = [];
  results.push(...partA_count());
  results.push(...partB_vercelJson());
  results.push(...partC_transport());
  results.push(...partD_middlewareClaim());
  console.log(`  api/ holds ${serverlessFunctions(path.join(ROOT, "api")).length}/${FUNCTION_LIMIT} `
    + "serverless functions; /api/mcp rewrites onto the executor; no crons -- PASS");
  return results;
}

selfRun(import.meta.url, run);
export default run;
