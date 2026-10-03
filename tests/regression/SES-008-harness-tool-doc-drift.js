// DeepBench v7.0.259 | tests/regression/SES-008-harness-tool-doc-drift.js | SES-008
//
// Asserts that the harness's ACTUAL gated-tool set matches ARCHITECTURE.md §1's documented list.
//
// THE DRIFT THIS EXISTS FOR IS ON RECORD, not hypothetical: web_search / HAR-05 shipped as a real,
// live third gated tool while §1's Loop entry still described two, and it sat wrong until an
// unrelated stress test (SES-001, 2026-07-20) happened to notice. Prose cannot be diffed against
// code, so nothing failed in between.
//
// THE SUBJECT IS THE REAL buildCallBody(), IMPORTED AND CALLED -- never a recreation of its tool
// assembly (STANDARDS.md Section 4's rule that outranks the categories, SES-45/v7.0.257). That is
// load-bearing here rather than ceremony: a test that rebuilt "canRequestHelp ? [help, delegate]
// : []" in this file would agree with itself forever and would have gone green through the exact
// HAR-05 drift it claims to catch.
//
// THE GATE BINDING IS READ FROM THE DOC, NOT HARDCODED HERE, and that is the second half of the
// idea. The table names the buildCallBody() PARAMETER alongside the Skill Profile trait; this test
// reads that parameter out of ARCHITECTURE.md and calls the real function with it. So a doc row
// naming a parameter the function does not have fails, and the trait -> parameter correspondence
// is asserted rather than being a second copy living in this file.
//
// WHAT IT DELIBERATELY DOES NOT COVER, so the boundary is not rediscovered: the schema tool is
// derived from the caller's own format_contract, is not a harness tool, and is excluded by
// construction (every probe passes output_type 'text', so no schema tool is ever emitted) rather
// than by name-matching it away. Stale PROSE is still not covered by anything -- SES-008's own
// ticket says so, and the process-side half is CLAUDE-DESIGN.md Step 4's Architect Review.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";
import { buildCallBody } from "../../api/prompt/request-receivable.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARCH_REL = "docs/ARCHITECTURE.md";

const OPEN = "{{harness-tools}}";
const CLOSE = "{{/harness-tools}}";

// --- the documented side ----------------------------------------------------------------------

// Slices the anchored block and reads its table rows. Anchored on the marker pair rather than on a
// line number or a heading, for the reason check 12 in check-session-docs.js is ID-anchored: a
// section that moves must not silently stop being checked.
export function parseDocumentedTools(archText) {
  const start = archText.indexOf(OPEN);
  const end = archText.indexOf(CLOSE);
  assert.ok(start !== -1, `${ARCH_REL}: the ${OPEN} marker is gone -- the documented harness-tool list has no anchor, so nothing can be asserted against it.`);
  assert.ok(end > start, `${ARCH_REL}: ${CLOSE} is missing or precedes ${OPEN}.`);

  const block = archText.slice(start, end);
  const cell = s => s.trim().replace(/^`|`$/g, "");
  const rows = [];
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.split("|").slice(1, -1).map(cell);
    if (cells.length < 3) continue;
    if (/^-+$/.test(cells[0]) || cells[0].toLowerCase() === "tool") continue; // header / separator
    rows.push({ tool: cells[0], trait: cells[1], param: cells[2] });
  }
  assert.ok(rows.length > 0, `${ARCH_REL}: the ${OPEN} block parsed to zero rows -- a reformat has made the documented list unreadable, which is a silent loss of this guard.`);
  return rows;
}

// --- the real side ----------------------------------------------------------------------------

// Calls the SHIPPED buildCallBody() and returns the tool names it actually emitted.
// output_type 'text' means format_contract yields no schema tool, so everything returned here is a
// harness tool by construction.
export function emittedToolNames(params) {
  const body = buildCallBody({
    format_contract: { output_type: "text" },
    systemPrompt: "SES-008 probe",
    model: "claude-probe",
    max_tokens: 64,
    temperature: 0,
    ...params,
  });
  return (body.tools || []).map(t => t.name);
}

// Every on/off combination of the parameters the DOC names.
function combinations(params) {
  let out = [{}];
  for (const p of params) out = out.flatMap(c => [{ ...c, [p]: false }, { ...c, [p]: true }]);
  return out;
}

export function observedToolNames(params) {
  const seen = new Set();
  for (const combo of combinations(params)) for (const n of emittedToolNames(combo)) seen.add(n);
  return seen;
}

// --- the assertions ---------------------------------------------------------------------------

function checkSetsMatch(rows) {
  const params = [...new Set(rows.map(r => r.param))];
  const documented = new Set(rows.map(r => r.tool));
  const observed = observedToolNames(params);

  const undocumented = [...observed].filter(n => !documented.has(n));
  assert.deepStrictEqual(undocumented, [],
    `the harness emits ${undocumented.map(n => `\`${n}\``).join(", ")}, which ${ARCH_REL}'s ${OPEN} table does not list. A tool was added to api/prompt/request-receivable.js without documenting it -- this is exactly the HAR-05 drift.`);

  const phantom = [...documented].filter(n => !observed.has(n));
  assert.deepStrictEqual(phantom, [],
    `${ARCH_REL} documents ${phantom.map(n => `\`${n}\``).join(", ")}, which the harness never emits under any combination of ${params.join("/")}. Either the tool was removed from the code and the doc kept it, or its gate is not the parameter the table names.`);
}

function checkGatesMatch(rows) {
  const params = [...new Set(rows.map(r => r.param))];
  for (const row of rows) {
    for (const combo of combinations(params)) {
      const present = emittedToolNames(combo).includes(row.tool);
      assert.strictEqual(present, combo[row.param] === true,
        `\`${row.tool}\` is documented as gated by \`${row.trait}\` (buildCallBody parameter \`${row.param}\`), but with ${JSON.stringify(combo)} the real buildCallBody() ${present ? "emitted" : "did not emit"} it. The documented gate is not the real gate.`);
    }
  }
}

// §1 states enable_parallel_tool_use "adds no new tool" (LOO-28). That is a doc claim like any
// other, so it is pinned rather than trusted.
function checkParallelToolUseAddsNothing(rows) {
  const params = [...new Set(rows.map(r => r.param))];
  for (const combo of combinations(params)) {
    const off = emittedToolNames(combo);
    const on = emittedToolNames({ ...combo, enableParallelToolUse: true });
    assert.deepStrictEqual(on, off,
      `${ARCH_REL} §1 says enable_parallel_tool_use adds no tool, but with ${JSON.stringify(combo)} the emitted set changed from [${off}] to [${on}].`);
  }
}

// --- negative controls ------------------------------------------------------------------------
//
// Asserting the CONTROLS, not just the clauses. Three of this session's own tickets found a fault
// in a guard rather than in its subject by doing exactly this, so a clause that cannot fail is
// treated here as a failure in itself.

function mustThrow(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, `NEGATIVE CONTROL FAILED: ${label} did not fail the assertion, so that clause proves nothing.`);
}

function checkControls(rows) {
  mustThrow("a phantom tool added to the documented list",
    () => checkSetsMatch([...rows, { tool: "not_a_real_tool", trait: "x", param: rows[0].param }]));

  mustThrow("a documented tool dropped from the list",
    () => checkSetsMatch(rows.slice(1)));

  const flipped = rows.map((r, i) => (i === 0 ? { ...r, param: otherParam(rows, r.param), trait: "flipped" } : r));
  if (flipped[0].param !== rows[0].param) {
    mustThrow("a documented gate pointed at the wrong parameter", () => checkGatesMatch(flipped));
  }

  mustThrow("the anchor comment removed from ARCHITECTURE.md",
    () => parseDocumentedTools(read(ARCH_REL).split(OPEN).join("{{gone}}")));
}

function otherParam(rows, param) {
  const all = [...new Set(rows.map(r => r.param))];
  return all.find(p => p !== param) || param;
}

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

export default function run() {
  const rows = parseDocumentedTools(read(ARCH_REL));

  checkSetsMatch(rows);
  checkGatesMatch(rows);
  checkParallelToolUseAddsNothing(rows);
  checkControls(rows);

  console.log(`SES-008: ${rows.length} documented harness tools match the real buildCallBody() emission, gates included.`);
}

selfRun(import.meta.url, run);
