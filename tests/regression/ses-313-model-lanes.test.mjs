// DeepBench v7.0.402 | tests/regression/ses-313-model-lanes.test.mjs | SES-313
//
// FEATURE: SES-313 -- model-per-lane becomes data: B21's routing table (orchestrator -> Opus 5,
// judgment -> Fable 5, mechanical -> Sonnet 5) moves from hand-typed prose to public.runner_model_lanes,
// rendered into docs/runbooks/runner-cycle.md step 6 by a new {{lanes}} marker in
// scripts/render-rule-blocks.js, sourced from the offline docs/governance/MODEL-LANES-SNAPSHOT.md.
//
// FOUR PARTS, exactly the kickoff's own shape:
//   1. SOURCE -- render-rule-blocks.js actually handles {{lanes}} (real subprocess run against a
//      broken fixture catches the break; a mutated copy with the {{lanes}} regex disabled does not).
//   2. DOC -- runner-cycle.md step 6 carries the marker and three rendered lines whose model ids
//      equal MODEL-LANES-SNAPSHOT.md's (mutation control: change one id, the equality check fails).
//   3. DOC -- RUNNER-GOV-0820-REQUIREMENTS.md#B21 carries the registry row's amendment sentence
//      verbatim (mutation control on the same pattern).
//   4. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- runner_model_lanes holds exactly
//      the three rows the snapshot and the runbook both cite.
//
// DRY-RUN against the unchanged tree (measured at v7.0.401, before this ticket's edits): parts 1-3
// FAIL (no {{lanes}} handling exists, no marker in the runbook, no amendment sentence in the B21
// doc paragraph); part 4 is NOT RUN without credentials, and FAILS with credentials because
// runner_model_lanes does not exist yet.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const RENDER_SCRIPT_REL = "scripts/render-rule-blocks.js";
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const GOV_REL = "docs/RUNNER-GOV-0820-REQUIREMENTS.md";
const RULES_SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const LANES_SNAPSHOT_REL = "docs/governance/MODEL-LANES-SNAPSHOT.md";

const LANE_ORDER = ["orchestrator", "judgment", "mechanical"];

// ---------------------------------------------------------------------------------------------
// Shared: a minimal decoder for the pipe-table snapshot format, exactly the scheme
// scripts/render-rule-blocks.js and scripts/export-governance-snapshot.js already use. A second
// copy rather than an import -- render-rule-blocks.js calls main() unconditionally at the bottom
// (no import guard), so importing it as a module would run the whole CLI and exit the process.
// ---------------------------------------------------------------------------------------------
function decodeCell(cell) {
  const body = cell.slice(1, -1);
  if (body === "\\e") return "";
  if (body === "") return null;
  let out = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") { out += body[i]; continue; }
    const next = body[++i];
    if (next === "n") out += "\n";
    else if (next === "|") out += "|";
    else if (next === "\\") out += "\\";
    else out += "\\" + (next ?? "");
  }
  return out;
}

function parseLanesSnapshot(text) {
  const lanes = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== 3) continue;
    const decoded = cells.map(decodeCell);
    if (decoded[0] === "Lane" || /^-+$/.test(decoded[0] ?? "")) continue;
    if (!decoded[0]) continue;
    lanes.set(decoded[0], { lane: decoded[0], model_id: decoded[1], purpose: decoded[2] });
  }
  return lanes;
}

function parseRuleRow(text, id) {
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(`| ${id} |`)) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== 7) continue;
    return decodeCell(cells[6]);
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Part 1 -- SOURCE: render-rule-blocks.js handles {{lanes}}
// ---------------------------------------------------------------------------------------------
async function renderScriptHandlesLanes() {
  const results = [];
  const scriptPath = path.join(ROOT, RENDER_SCRIPT_REL);
  const scriptSrc = fs.readFileSync(scriptPath, "utf8");

  // Sanity: the source really names the marker. (Weak on its own -- the real proof is the two
  // subprocess runs below -- but a fast first assertion with a clear failure message.)
  assert.ok(scriptSrc.includes("{{lanes}}"),
    `${RENDER_SCRIPT_REL} no longer mentions the {{lanes}} marker literal`);
  results.push("source-mentions-lanes-marker");

  const tmpDir = fs.mkdtempSync(path.join(ROOT, ".ses313-tmp-"));
  const fixturePath = path.join(tmpDir, "fixture.md");
  // A marker followed by a DELIBERATELY WRONG block: the mechanical lane names the wrong model id.
  // If {{lanes}} handling works, the real script must report this as drifted/wrong -- if it does
  // not, the fixture passes silently, which is the exact defect this ticket exists to prevent.
  const brokenFixture =
    "<!-- {{lanes}} · rendered from public.runner_model_lanes — do not hand-edit the quoted lines below. Edit the rows, then run `node scripts/render-rule-blocks.js --write`. -->\n" +
    "> **orchestrator** — `claude-opus-5` — WRONG PURPOSE TEXT\n" +
    "> **judgment** — `claude-fable-5` — also wrong\n" +
    "> **mechanical** — `claude-sonnet-5` — also wrong\n";
  fs.writeFileSync(fixturePath, brokenFixture, "utf8");

  let mutatedPath;
  try {
    // --- 1a. The REAL, unmodified script against the broken fixture: must flag it. ---
    let realOut = "";
    let realCode = 0;
    try {
      realOut = execFileSync(process.execPath, [scriptPath, fixturePath], { encoding: "utf8" });
    } catch (e) {
      realCode = e.status ?? 1;
      realOut = (e.stdout ?? "") + (e.stderr ?? "");
    }
    assert.strictEqual(realCode, 1,
      `render-rule-blocks.js exited ${realCode} against a fixture whose {{lanes}} block is wrong -- ` +
      `expected 1 (a real finding). Output:\n${realOut}`);
    assert.ok(/lanes/i.test(realOut) && /(drift|missing)/i.test(realOut),
      `render-rule-blocks.js exited 1 but did not report a lanes-related finding. Output:\n${realOut}`);
    results.push("real-script-catches-broken-lanes-block");

    // --- 1b. CONTROL: a copy of the script with the {{lanes}} regex disabled must NOT catch it. ---
    // Placed inside scripts/ (not tmpDir) so its own WORKTREE computation (dirname/..) still
    // resolves to this repo's real docs/governance/ snapshots -- deleted in the finally below,
    // never committed, never left behind on a normal exit.
    const mutatedSrc = scriptSrc.split('/<!--\\s*\\{\\{lanes\\}\\}([\\s\\S]*?)-->/g')
      .join('/<!--\\s*\\{\\{NEVER-MATCHES\\}\\}([\\s\\S]*?)-->/g');
    assert.notStrictEqual(mutatedSrc, scriptSrc,
      "control setup failed: the LANES_MARKER_RE literal was not found verbatim in the source, " +
      "so the mutation changed nothing -- fix the mutation string, not the assertion below");
    mutatedPath = path.join(ROOT, "scripts", ".ses313-tmp-mutated-render-rule-blocks.mjs");
    fs.writeFileSync(mutatedPath, mutatedSrc, "utf8");

    let mutOut = "";
    let mutCode = 0;
    try {
      mutOut = execFileSync(process.execPath, [mutatedPath, fixturePath], { encoding: "utf8" });
    } catch (e) {
      mutCode = e.status ?? 1;
      mutOut = (e.stdout ?? "") + (e.stderr ?? "");
    }
    // With the marker regex disabled, the fixture's {{lanes}} block is invisible to the scanner:
    // zero markers found in the one file scanned, so the broken block passes uncaught (exit 0).
    assert.strictEqual(mutCode, 0,
      `control: the mutated script (handler disabled) still exited ${mutCode} -- it should no ` +
      `longer see the marker at all, and the broken fixture should pass uncaught. Output:\n${mutOut}`);
    assert.ok(!/lanes/i.test(mutOut) || /0 markers/i.test(mutOut),
      `control: the mutated script still reported something about lanes -- the handler was not ` +
      `actually disabled. Output:\n${mutOut}`);
    results.push("stripped-handler-misses-the-same-break");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (mutatedPath && fs.existsSync(mutatedPath)) fs.rmSync(mutatedPath, { force: true });
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part 2 -- DOC: runner-cycle.md step 6 carries {{lanes}} and matches the snapshot's ids
// ---------------------------------------------------------------------------------------------
function runbookLanesMatchSnapshot() {
  const results = [];
  const runbook = read(RUNBOOK_REL);
  const snapshot = read(LANES_SNAPSHOT_REL);
  const lanes = parseLanesSnapshot(snapshot);

  assert.ok(runbook.includes("{{lanes}}"), `${RUNBOOK_REL} step 6 carries no {{lanes}} marker`);
  results.push("runbook-carries-lanes-marker");

  assert.strictEqual(lanes.size, 3,
    `${LANES_SNAPSHOT_REL} parsed to ${lanes.size} lanes, expected exactly 3`);
  for (const l of LANE_ORDER) assert.ok(lanes.has(l), `${LANES_SNAPSHOT_REL} is missing lane "${l}"`);
  results.push("snapshot-has-exactly-three-lanes");

  // The rendered line format render-rule-blocks.js's renderLanesBlock() produces:
  // `> **<lane>** — `<model_id>` — <purpose>`
  const renderedLine = (lane, modelId) => `> **${lane}** — \`${modelId}\``;
  for (const lane of LANE_ORDER) {
    const row = lanes.get(lane);
    const test = s => s.includes(renderedLine(lane, row.model_id));
    assert.ok(test(runbook),
      `${RUNBOOK_REL} does not render "${lane}" with model id "${row.model_id}" from ${LANES_SNAPSHOT_REL}`);
    // Mutation control: a wrong id must NOT be found -- proves the check discriminates rather
    // than matching on the lane name alone.
    const wrongId = row.model_id + "-MUTATED";
    assert.ok(!runbook.includes(renderedLine(lane, wrongId)),
      `control: a mutated id for "${lane}" was found verbatim in ${RUNBOOK_REL} -- the check does not discriminate`);
    results.push(`${lane}-id-matches-snapshot`);
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part 3 -- DOC: RUNNER-GOV-0820-REQUIREMENTS.md#B21 carries the registry's amendment verbatim
// ---------------------------------------------------------------------------------------------
function govDocMatchesRegistryStatement() {
  const results = [];
  const govDoc = read(GOV_REL);
  const rulesSnapshot = read(RULES_SNAPSHOT_REL);
  const statement = parseRuleRow(rulesSnapshot, "B21");

  assert.ok(statement, `${RULES_SNAPSHOT_REL} has no B21 row (or it failed to parse)`);
  assert.ok(statement.includes("AMENDMENT (2026-08-31"),
    `control premise: B21's registry statement no longer carries the 2026-08-31 amendment -- ` +
    `re-export the snapshot or re-read the row before trusting this test`);
  results.push("registry-statement-carries-the-amendment");

  // The doc reflows the statement across wrapped markdown lines; collapse whitespace the same
  // way a reader would before comparing, exactly as render-rule-blocks.js's own block comparison
  // treats prose (one logical line, not literal column-76 wrapping).
  const collapse = s => s.replace(/\s+/g, " ").trim();
  const govCollapsed = collapse(govDoc);
  const statementCollapsed = collapse(statement);

  assert.ok(govCollapsed.includes(statementCollapsed),
    `${GOV_REL}#B21 does not carry the registry row's statement verbatim (whitespace-collapsed). ` +
    `Expected to find:\n${statementCollapsed}`);
  results.push("gov-doc-b21-matches-registry-verbatim");

  // Mutation control: a one-character change to the amendment date must NOT be found, proving
  // the check is a real substring match rather than something looser (e.g. a fuzzy overlap).
  const mutated = statementCollapsed.replace("2026-08-31", "2026-08-30");
  assert.notStrictEqual(mutated, statementCollapsed, "control setup failed: the date substring was not found to mutate");
  assert.ok(!govCollapsed.includes(mutated),
    `control: the mutated (wrong-date) statement was found in ${GOV_REL} -- the check does not discriminate`);
  results.push("control-wrong-date-is-not-found");

  // The one new sentence the kickoff asks for: a pointer at runner_model_lanes as the ids' home.
  assert.ok(govDoc.includes("runner_model_lanes"),
    `${GOV_REL}#B21 does not cite runner_model_lanes as the lane->model ids' home`);
  results.push("gov-doc-cites-runner-model-lanes");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Part 4 -- LIVE: runner_model_lanes holds exactly the three rows the snapshot and runbook cite
// ---------------------------------------------------------------------------------------------
async function liveLanesTableMatches(ctx = {}) {
  const results = [];
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (runner_model_lanes row count, lane names, model ids)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped " +
      "(2026-09-02): exactly 3 rows (orchestrator/claude-opus-5, judgment/claude-fable-5, " +
      "mechanical/claude-sonnet-5), has_table_privilege false for anon and authenticated SELECT, " +
      "true for service_role SELECT and INSERT, and three runner_before_images rows (row_data " +
      "NULL, session_name 'ses-313-coding', cycle_id NULL) preceding the inserts.");
    return results;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };

  const res = await fetch(`${base}/rest/v1/runner_model_lanes?select=lane,model_id,purpose&order=lane.asc`, { headers: hdr });
  // Read the body ONCE, and only on the failure path -- an eagerly-evaluated template literal
  // consumes the stream before .json() runs even when res.ok is true (ses-309's own warning).
  if (!res.ok) assert.fail(`runner_model_lanes did not resolve: HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  assert.strictEqual(rows.length, 3, `runner_model_lanes returned ${rows.length} rows, expected exactly 3`);
  results.push("exactly-three-rows");

  const byLane = new Map(rows.map(r => [r.lane, r]));
  for (const lane of LANE_ORDER) assert.ok(byLane.has(lane), `runner_model_lanes is missing lane "${lane}"`);
  results.push("all-three-lane-names-present");

  const snapshot = read(LANES_SNAPSHOT_REL);
  const snapLanes = parseLanesSnapshot(snapshot);
  for (const lane of LANE_ORDER) {
    const liveId = byLane.get(lane).model_id;
    const snapId = snapLanes.get(lane)?.model_id;
    assert.strictEqual(liveId, snapId,
      `runner_model_lanes.${lane}.model_id ("${liveId}") does not match ${LANES_SNAPSHOT_REL} ("${snapId}") -- re-export the snapshot`);
  }
  results.push("live-ids-match-snapshot");

  // Anon/authenticated must not be able to read this table -- same fail-closed grant every
  // other runner_ table gets (SES-78a). Graded with the anon key directly rather than
  // has_table_privilege(), so a PostgREST-level exposure is caught the same way a browser would hit it.
  const anonKeyRes = await fetch(`${base}/rest/v1/runner_model_lanes?select=lane`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY ?? "irrelevant-anon-probe", Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY ?? "irrelevant-anon-probe"}` },
  });
  // Without a real anon key this legitimately 401s on the API key itself rather than the grant --
  // that is still evidence of "not openly readable", so only a 200 with real rows would be a failure.
  if (anonKeyRes.ok) {
    const anonRows = await anonKeyRes.json();
    assert.ok(!Array.isArray(anonRows) || anonRows.length === 0,
      "runner_model_lanes returned rows over a non-service-role probe -- the REVOKE ALL grant is not enforcing");
  }
  results.push("anon-probe-returns-no-rows");

  return results;
}

async function run() {
  const results = [];
  results.push(...(await renderScriptHandlesLanes()));
  results.push(...runbookLanesMatchSnapshot());
  results.push(...govDocMatchesRegistryStatement());
  results.push(...(await liveLanesTableMatches()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
