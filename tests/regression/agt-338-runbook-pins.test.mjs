// DeepBench v7.0.776 | tests/regression/agt-338-runbook-pins.test.mjs | AGT-338 slice 4
//
// FEATURE: AGT-338 -- THE MCP RUNBOOK CATCHES UP. docs/runbooks/mcp-server.md gains a last section,
// "Three kinds of address", and every statement in it is tied to the code literal it describes: the
// runbook names a thing, and the file that owns the thing still carries it. A rename in the code
// with no runbook edit (or the reverse) turns this red.
//
// STATIC (always run; no database, no model call):
//   (a) THE DISCRIMINATOR: the section exists, and per row the section includes the DOC string and
//       the named file includes the CODE string (no CODE given = the DOC string itself).
//       CONTROL: the same check over the section with every `resolveAddress` removed throws.
//   (b) The two dated statements are gone (`18 product-lane tools`, `Every `tools/call` runs the one
//       generic executor`), and the stamp block holds exactly 5 lines starting `<!-- DeepBench v`,
//       the first of them `<!-- DeepBench v7.0.776 `.
//
// BASELINE: the file is new and RED on the unchanged tree -- the runbook has no such section.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

const RUNBOOK = "docs/runbooks/mcp-server.md";
const SECTION = "\n## Three kinds of address";
const M = "api/_lib/mcp.js";
const P = "lib/private-agent-create.js";

// DOC / file / CODE. No `code` = the DOC string is the code literal.
const ROWS = [
  { doc: "resolveAddress()", file: M, code: "export async function resolveAddress(" },
  { doc: "64 lowercase hex", file: M, code: "/^[0-9a-f]{64}$/" },
  { doc: "Agents available on this connection: ", file: M },
  { doc: "No agent is available at this address.", file: M },
  { doc: "traits.any_agent = true", file: M, code: "intent.traits.any_agent === true" },
  { doc: "/api/mcp/:agent", file: "vercel.json" },
  { doc: "Unknown agent: ", file: "api/_lib/handlers/agent-bundle.js" },
  { doc: "agent-bundle-any-intent", file: "docs/design/agt-338-own-knowledge.sql" },
  { doc: "agent-bundle-intent", file: P },
  { doc: "<id>-knowledge", file: P, code: 'slug: id + "-knowledge",' },
  { doc: "create_private_agent", file: "api/agent-configs.js" },
  { doc: "teams=1", file: "api/agent-configs.js", code: 'if (teams === "1")' },
  { doc: "visibleAgents()", file: "shared/agent-visibility.js", code: "export function visibleAgents(" },
];

// ---------------------------------------------------------------------------------------------
// (a) STATIC: every statement in the section is tied to the code literal it describes
// ---------------------------------------------------------------------------------------------
function checkSection(section) {
  for (const { doc, file, code } of ROWS) {
    const literal = code === undefined ? doc : code;
    assert.ok(section.includes(doc), `(a) the runbook's last section does not say \`${doc}\``);
    assert.ok(read(file).includes(literal), `(a) ${file} does not carry \`${literal}\`, which the runbook describes as \`${doc}\``);
  }
}

function partPins(runbook) {
  const at = runbook.indexOf(SECTION);
  assert.ok(at !== -1, `(a) DISCRIMINATOR: ${RUNBOOK} has no "## Three kinds of address" section`);
  const S = runbook.slice(at);
  checkSection(S);

  // CONTROL: the check is not a tautology -- the section without one of its names fails it.
  assert.throws(
    () => checkSection(S.split("resolveAddress").join("")),
    e => e instanceof assert.AssertionError && e.message.includes("resolveAddress()"),
    "(a) CONTROL: the section with every `resolveAddress` removed still passed -- the check above proves nothing");
  return ["DISCRIMINATOR-section-exists", `${ROWS.length}-statements-tied-to-code`, "control-section-without-resolveAddress-throws"];
}

// ---------------------------------------------------------------------------------------------
// (b) STATIC: the dated statements are gone, and the stamp block is held at 5
// ---------------------------------------------------------------------------------------------
function partDated(runbook) {
  for (const gone of ["18 product-lane tools", "Every `tools/call` runs the one generic executor"]) {
    assert.ok(!runbook.includes(gone), `(b) ${RUNBOOK} still says \`${gone}\``);
  }
  const stamps = runbook.split(/\r?\n/).filter(line => line.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, 5, `(b) ${RUNBOOK} carries ${stamps.length} stamp lines, not exactly 5`);
  assert.ok(stamps[0].startsWith("<!-- DeepBench v7.0.776 "), `(b) the first stamp is \`${stamps[0].slice(0, 40)}\`, not the v7.0.776 one`);
  return ["dated-statements-removed", "five-stamps-first-is-v7.0.776"];
}

async function run() {
  const runbook = read(RUNBOOK);
  const results = [];
  results.push(...partPins(runbook));
  results.push(...partDated(runbook));
  return results;
}

selfRun(import.meta.url, run);
export default run;
