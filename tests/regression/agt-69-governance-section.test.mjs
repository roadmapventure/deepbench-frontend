// DeepBench v7.0.456 | tests/regression/agt-69-governance-section.test.mjs | AGT-69 -- the Bench
// grows a read-only Governance section, and the six governance agents become visible on EXACTLY
// that one surface and on no other.
//
// WHAT MAKES THIS DISCRIMINATING, stated as the pair rather than as a list. Six checks below fail
// on the unchanged tree and pass after the build -- (a) the deleted list, (b) the mount, (c) the
// component's own contract, (r) the render, (e) the view, (h) the flag row. Three checks pass
// BEFORE and AFTER -- (d) the two SES-330 lane filters, (f) the broker's roster, (g) the product
// lane's membership. A guard made only of the first group would go green on a build that shipped
// the section AND quietly widened the broker; a guard made only of the second would go green on a
// build that shipped nothing at all. The ticket's claim is the conjunction, so the test is too.
//
// DRY-RUN AGAINST THE UNCHANGED TREE (measured 2026-09-12, before this session's first edit, with
// SUPABASE_URL / SUPABASE_SERVICE_KEY set and against the live database before the migration):
// 6 of 9 checks FAILED -- (a) OFF_BENCH_AGENT_IDS still present in src/data/agents.js; (b) no
// import and no mount in RosterScreen.jsx; (c) src/components/GovernanceSection.jsx absent;
// (r) the render arm could not compile an absent file; (e) governance_agent_activity_7d 404;
// (h) no feature_flags row for the slug. 3 of 9 PASSED -- (d), (f), (g). Check (a) passing on a
// dry run would have meant the tree had already been changed, and the run stops in that case.
//
// TWO MECHANICAL DEPARTURES FROM THE KICKOFF'S RECIPE, both forced, neither a scope change:
//   1. "six `<svg`" is counted as six AVATAR svgs (`viewBox="0 0 72 72"`), not six occurrences of
//      the string `<svg`. SharedUI's <Corners/> emits four decorative 10x10 svgs per card, so a
//      bare `<svg` count is 30 and would have to be written as 30 -- a number that says nothing
//      about portraits. The avatar viewBox counts the thing the clause is about.
//   2. (a) scans src/ with COMMENTS STRIPPED rather than raw text. agents.js carries five existing
//      AGT-63..68 stamps naming the export, and §4e prescribes a sixth recording its deletion by
//      name; a raw scan is unsatisfiable without deleting history the kickoff leaves alone. Full
//      reasoning at checkA_listDeletedFromSrc(). Re-measured against the unchanged tree in this
//      stripped form before the first edit: still RED, because the `export const` line is code.
//   3. esbuild is given `jsx: "automatic"` and react / react-dom / react/jsx-runtime are left
//      EXTERNAL. esbuild 0.21's default classic transform emits `React.createElement`, and neither
//      the component nor any file it imports has a default `React` binding -- log-143b never hit
//      this because it only calls compiled helper exports and never renders. External react also
//      keeps ONE React instance in the process rather than a bundled second copy.
// The single-esbuild.build() rule from log-143b's header is obeyed: exactly one build call here.
//
// NO MODEL CALL, NO SPEND, AND NO WRITE. Every live clause is a GET. The view is read, never
// created; the flag row is read for its backlog_id and NOT for `enabled`, because flipping that
// flag is John's Accept and a test that asserted its value would either pin it off forever or go
// red the moment he accepts.

import assert from "assert";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";
import { fileURLToPath, pathToFileURL } from "url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SRC_DIR = "src";
const COMPONENT_REL = "src/components/GovernanceSection.jsx";
const ROSTER_REL = "src/screens/RosterScreen.jsx";
const BROKER_REL = "lib/project-manager.js";
const WORK_ORDER_REL = "src/screens/CreateWorkOrderScreen.jsx";

const FLAG_SLUG = "agt-69-governance-section";
const VIEW_NAME = "governance_agent_activity_7d";
const BACKLOG_ID = "AGT-69";
const DELETED_EXPORT = "OFF_BENCH_AGENT_IDS";

// The two SES-330 strings, verbatim. They are the "and on no other surface" half of the claim.
const BROKER_FILTER = "is_active=eq.true&lane=eq.product&select=";
const WORK_ORDER_FILTER = ".eq('lane', 'product')";

// The agent ids that used to live in the deleted list. They appear HERE, in a test, on purpose --
// Rule #1 forbids them in the component, and this is the file that proves they are not in it.
const AGENT_ID_LITERALS = ["prioritizer", "researcher", "designer", "builder", "verifier", "devmanager"];

// Hire-card / marketplace vocabulary the read-only section must not have borrowed from AgentCard.
const FORBIDDEN_IN_COMPONENT = ["fmt$", "salary", "SkillBar", "navigate(", "onViewProfile", "rating", "/bench/"];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const exists = rel => fs.existsSync(path.join(ROOT, rel));

// Comments out, code left -- log-143b's shape. Needed because both the component and the screen
// DOCUMENT what they deliberately do not do, and a raw substring scan would fail the build for
// explaining the rule it obeys.
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// Exported so the literal scan is checkable rather than invisible inside one assertion; the
// negative control below runs it against a mutated copy of the real source.
export function agentIdLiteralsIn(code) {
  return AGENT_ID_LITERALS.filter(id => code.includes(`"${id}"`) || code.includes(`'${id}'`));
}

function walkFiles(absDir, out = []) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

// Six fixture rows that name NO real agent -- ids zz-gov-1..6, names Fixture One..Six. A fixture
// carrying a real id would make the "no agent id literal" clause above unenforceable in this file.
const FIXTURE = [
  { agent_id: "zz-gov-1", code: "ZZ-01", name: "Fixture One",   role: "Fixture Role One",   specialty: "Fixture specialty one",   calls: 1313, input_tokens: 2041612, output_tokens: 87922, cycles: 16 },
  { agent_id: "zz-gov-2", code: "ZZ-02", name: "Fixture Two",   role: "Fixture Role Two",   specialty: "Fixture specialty two",   calls: 9,    input_tokens: 900,     output_tokens: 90,    cycles: 2  },
  { agent_id: "zz-gov-3", code: "ZZ-03", name: "Fixture Three", role: "Fixture Role Three", specialty: "Fixture specialty three", calls: 6,    input_tokens: 600,     output_tokens: 60,    cycles: 1  },
  { agent_id: "zz-gov-4", code: "ZZ-04", name: "Fixture Four",  role: "Fixture Role Four",  specialty: "Fixture specialty four",  calls: 2,    input_tokens: 200,     output_tokens: 20,    cycles: 1  },
  { agent_id: "zz-gov-5", code: "ZZ-05", name: "Fixture Five",  role: "Fixture Role Five",  specialty: "Fixture specialty five",  calls: 1,    input_tokens: 100,     output_tokens: 10,    cycles: 1  },
  { agent_id: "zz-gov-6", code: "ZZ-06", name: "Fixture Six",   role: "Fixture Role Six",   specialty: "Fixture specialty six",   calls: 1,    input_tokens: 100,     output_tokens: 10,    cycles: 1  },
];

// Same stub shape LAV-25 / log-143b arrived at: a real supabase client throws "supabaseUrl is
// required" at module load, so without this the module fails to LOAD and the render arm is vacuous.
const stubSupabase = {
  name: "agt69-stub-supabase",
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])supabase\.js$/ }, () => ({
      path: "agt69-stub-supabase", namespace: "agt69-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "agt69-stub" }, () => ({
      contents: "export const supabase = { from: () => { throw new Error('stub'); } };", loader: "js",
    }));
  },
};

async function loadComponent() {
  const dir = fs.mkdtempSync(path.join(ROOT, "node_modules", ".agt69-"));
  try {
    // EXACTLY ONE esbuild.build() call in this file (log-143b's header: two left the service's
    // libuv handle mid-close and aborted the process AFTER printing [PASS]).
    await esbuild.build({
      entryPoints: [path.join(ROOT, COMPONENT_REL)],
      bundle: true, format: "esm", platform: "node", outdir: dir,
      loader: { ".js": "jsx", ".jsx": "jsx" },
      jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime", "react-dom/server"],
      define: { "import.meta.env": "{}" },
      plugins: [stubSupabase],
      logLevel: "silent",
    });
    const out = path.join(dir, path.basename(COMPONENT_REL).replace(/\.jsx$/, ".js"));
    return await import(pathToFileURL(out).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The checks, named. run() executes them in order and lets assert throw; they are exported as a
// registry so the pre-change dry-run could count how many failed without re-implementing any of
// them. Each entry says whether it was RED or GREEN on the unchanged tree.
// ─────────────────────────────────────────────────────────────────────────────────────────────

// (a) RED pre-change -- the list is deleted, from every file under src/, not just from agents.js.
//
// COMMENTS ARE STRIPPED BEFORE THE SCAN, and that is not a loosening. agents.js carries five
// pre-existing AGT-63..AGT-68 header stamps that name OFF_BENCH_AGENT_IDS, and §4e of this
// ticket's kickoff prescribes a SIXTH stamp recording the deletion by name. Those lines are the
// file's ledger of what happened to the export; a raw substring scan would fail the build for
// explaining the rule it obeys (log-143b's header names the same trap), and satisfying it would
// mean deleting six historical stamps the kickoff explicitly leaves alone. The claim under test is
// that no file under src/ still USES the export -- which is a claim about code.
function checkA_listDeletedFromSrc() {
  const offenders = walkFiles(path.join(ROOT, SRC_DIR))
    .filter(abs => {
      let text;
      try { text = fs.readFileSync(abs, "utf8"); } catch { return false; }
      return stripComments(text).includes(DELETED_EXPORT);
    })
    .map(abs => path.relative(ROOT, abs).replace(/\\/g, "/"));
  assert.deepStrictEqual(offenders, [],
    `${DELETED_EXPORT} still appears under ${SRC_DIR}/ in: ${offenders.join(", ")} -- AGT-69 deletes ` +
    "the list outright; the Bench's Governance section reads live lane=governance rows instead");
}

// (b) RED pre-change -- one import, one mount, and the screen gains nothing else.
function checkB_rosterMount() {
  const code = stripComments(read(ROSTER_REL));
  const importLine = `import GovernanceSection from "../components/GovernanceSection.jsx"`;
  assert.strictEqual(countOccurrences(code, importLine), 1,
    `${ROSTER_REL} must carry EXACTLY one \`${importLine}\` (found ${countOccurrences(code, importLine)})`);
  assert.strictEqual(countOccurrences(code, "<GovernanceSection />"), 1,
    `${ROSTER_REL} must mount <GovernanceSection /> EXACTLY once (found ` +
    `${countOccurrences(code, "<GovernanceSection />")}) -- one import + one mount is the whole ` +
    "permitted change to an existing screen (.claude/rules/autonomous-surface-changes.md)");
  // The flag read lives INSIDE the component. A flag read on the screen would be the second line
  // of change the rule forbids, and would also put the slug in two places.
  assert.ok(!code.includes(FLAG_SLUG),
    `${ROSTER_REL} must not name the flag slug -- the flag is read inside GovernanceSection.jsx`);
}

// (c) RED pre-change -- the component's own contract, and what it must NOT have borrowed.
function checkC_componentContract() {
  assert.ok(exists(COMPONENT_REL), `${COMPONENT_REL} does not exist`);
  const code = stripComments(read(COMPONENT_REL));

  for (const needle of [
    "useFeatureFlag(GOVERNANCE_FLAG)",
    ".from(GOVERNANCE_VIEW)",
    `GOVERNANCE_FLAG = "${FLAG_SLUG}"`,
    `GOVERNANCE_VIEW = "${VIEW_NAME}"`,
  ]) {
    assert.ok(code.includes(needle), `${COMPONENT_REL} must contain \`${needle}\``);
  }

  // Rule #1 (ARCHITECTURE.md §19e): no agent's data names another agent. The section renders rows.
  assert.deepStrictEqual(agentIdLiteralsIn(code), [],
    `${COMPONENT_REL} names ${agentIdLiteralsIn(code).join(", ")} as a literal -- the Governance ` +
    "section renders the rows the view returns, never a list of ids in src/");

  for (const needle of FORBIDDEN_IN_COMPONENT) {
    assert.ok(!code.includes(needle),
      `${COMPONENT_REL} must not contain \`${needle}\` -- the section is READ-ONLY: no profile link, ` +
      "no rating, no salary, no skill bar, no hire path");
  }

  // NEGATIVE CONTROL: a scanner that cannot reject the mutant measures nothing.
  const mutant = stripComments(read(COMPONENT_REL) + `\nconst zz = "${AGENT_ID_LITERALS[0]}";\n`);
  assert.deepStrictEqual(agentIdLiteralsIn(mutant), [AGENT_ID_LITERALS[0]],
    "control: the literal scan must FAIL on a copy of the real source with " +
    `\`const zz = "${AGENT_ID_LITERALS[0]}";\` appended -- if it does not, the clause above is vacuous`);
}

// (d) GREEN before AND after -- the SES-330 lane filters are untouched by this ticket.
function checkD_ses330FiltersHold() {
  assert.ok(read(BROKER_REL).includes(BROKER_FILTER),
    `${BROKER_REL} lost the SES-330 roster filter \`${BROKER_FILTER}\` -- the broker must still ` +
    "never see a governance agent");
  assert.ok(read(WORK_ORDER_REL).includes(WORK_ORDER_FILTER),
    `${WORK_ORDER_REL} lost the SES-330 work-order filter \`${WORK_ORDER_FILTER}\``);
}

// (r) RED pre-change -- the component actually renders the six rows, the numbers and nothing else.
async function checkR_render() {
  assert.ok(exists(COMPONENT_REL), `${COMPONENT_REL} does not exist -- nothing to compile`);
  const mod = await loadComponent();
  assert.strictEqual(typeof mod.GovernanceSectionView, "function",
    `${COMPONENT_REL} must export GovernanceSectionView`);

  const html = renderToStaticMarkup(
    createElement(mod.GovernanceSectionView, { rows: FIXTURE, isMobile: false }));

  // Six portraits. AgentAvatar's own viewBox, not the bare `<svg` string -- <Corners/> emits four
  // 10x10 svgs per card, so `<svg` counts decoration, not agents. See header departure (1).
  assert.strictEqual(countOccurrences(html, 'viewBox="0 0 72 72"'), 6,
    `expected 6 agent portraits, found ${countOccurrences(html, 'viewBox="0 0 72 72"')}`);

  for (const row of FIXTURE) {
    assert.ok(html.includes(row.name), `rendered markup is missing "${row.name}"`);
  }

  // The three numbers, formatted. 1313 calls, 2041612+87922 = 2129534 tokens, 16 cycles.
  assert.ok(html.includes("1,313"), "rendered markup is missing the 7-day call count 1,313");
  assert.ok(html.includes("2,129,534"),
    "rendered markup is missing the summed 7-day token count 2,129,534 -- input+output, not one of them");
  assert.ok(/>16</.test(html), "rendered markup is missing the cycle count 16");

  assert.ok(/governance/i.test(html) && html.includes("GOVERNANCE"),
    "rendered markup must name the section Governance");

  for (const forbidden of ["$", "Salary", "Hire", "Add a Player", "href"]) {
    assert.ok(!html.includes(forbidden),
      `rendered markup contains "${forbidden}" -- the Governance section is read-only: no money, ` +
      "no hire control, no link off the card");
  }

  assert.strictEqual(
    renderToStaticMarkup(createElement(mod.GovernanceSectionView, { rows: [], isMobile: false })), "",
    "with no rows the section must render NOTHING -- no empty heading, no placeholder line " +
    "(.claude/rules/agent-section-rendering.md)");
}

// ── Live arm helpers ──────────────────────────────────────────────────────────────────────────
async function getJson(base, hdr, pathAndQuery) {
  const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, { headers: hdr });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : await res.text() };
}

// (e) RED pre-change -- the view exists, and it is exactly the six live governance rows.
async function checkE_viewMatchesLiveRows(base, hdr) {
  const view = await getJson(base, hdr, `${VIEW_NAME}?select=agent_id,calls,cycles`);
  assert.ok(view.ok, `GET ${VIEW_NAME} failed: HTTP ${view.status} ${view.body}`);
  assert.strictEqual(view.body.length, 6,
    `${VIEW_NAME} returned ${view.body.length} rows, expected 6`);

  const agents = await getJson(base, hdr, "agents?lane=eq.governance&is_active=eq.true&select=id");
  assert.ok(agents.ok, `GET agents failed: HTTP ${agents.status} ${agents.body}`);
  assert.deepStrictEqual(
    view.body.map(r => r.agent_id).sort(),
    agents.body.map(r => r.id).sort(),
    `${VIEW_NAME}'s id set must equal the live is_active lane=governance id set -- the section is ` +
    "the live rows, not a snapshot");
}

// (f) GREEN before AND after -- the broker still surfaces none of them. The ticket's other half.
async function checkF_brokerStillExcludesThem(base, hdr) {
  const agents = await getJson(base, hdr, "agents?lane=eq.governance&is_active=eq.true&select=id");
  assert.ok(agents.ok, `GET agents failed: HTTP ${agents.status} ${agents.body}`);
  const govIds = agents.body.map(r => r.id);
  assert.strictEqual(govIds.length, 6, `expected 6 governance agents, found ${govIds.length}`);

  const { getRosterCandidates } = await import("../../lib/project-manager.js");
  const roster = await getRosterCandidates({ requestingAgentId: "michelle" });
  assert.strictEqual(roster?._project_manager?.granted, true,
    "getRosterCandidates() denied the roster for \"michelle\" -- " +
    `${JSON.stringify(roster?._project_manager)} (confirm that id is still lane='product', is_active=true)`);

  const chunkIds = (roster.chunks ?? []).map(c => c.id);
  const leakedChunks = govIds.filter(id => chunkIds.includes(id));
  assert.deepStrictEqual(leakedChunks, [],
    `getRosterCandidates() surfaced governance agent(s) ${leakedChunks.join(", ")} in its chunks -- ` +
    "that is a SES-330 regression, not an AGT-69 defect");

  const context = JSON.stringify(roster.context ?? roster);
  const leakedContext = govIds.filter(id => context.includes(id));
  assert.deepStrictEqual(leakedContext, [],
    `getRosterCandidates()'s context names governance agent(s) ${leakedContext.join(", ")} -- ` +
    "a SES-330 regression");
}

// (g) GREEN before AND after -- none of the six drifted into the product lane to become visible.
async function checkG_noneInProductLane(base, hdr) {
  const agents = await getJson(base, hdr, "agents?lane=eq.governance&is_active=eq.true&select=id");
  assert.ok(agents.ok, `GET agents failed: HTTP ${agents.status} ${agents.body}`);
  const govIds = agents.body.map(r => r.id);
  const probe = await getJson(base, hdr,
    `agents?lane=eq.product&id=in.(${govIds.join(",")})&select=id`);
  assert.ok(probe.ok, `GET agents (product probe) failed: HTTP ${probe.status} ${probe.body}`);
  assert.deepStrictEqual(probe.body, [],
    "a governance agent is also in the product lane -- the section would then be the SECOND " +
    "surface it reaches, and SES-330's fence would be a no-op for it");
}

// (h) RED pre-change -- the flag row exists and is tied to this ticket. `enabled` is NOT asserted:
// flipping it is John's Accept, and pinning it either way makes this test his blocker.
async function checkH_flagRow(base, hdr) {
  const flag = await getJson(base, hdr, `feature_flags?slug=eq.${FLAG_SLUG}&select=backlog_id`);
  assert.ok(flag.ok, `GET feature_flags failed: HTTP ${flag.status} ${flag.body}`);
  assert.strictEqual(flag.body.length, 1,
    `expected exactly 1 feature_flags row for "${FLAG_SLUG}", found ${flag.body.length}`);
  assert.strictEqual(flag.body[0].backlog_id, BACKLOG_ID,
    `the "${FLAG_SLUG}" row must carry backlog_id ${BACKLOG_ID}`);
}

export const CHECKS = [
  { name: "(a) OFF_BENCH_AGENT_IDS deleted from src/", live: false, preChange: "RED",   fn: checkA_listDeletedFromSrc },
  { name: "(b) RosterScreen: one import + one mount",  live: false, preChange: "RED",   fn: checkB_rosterMount },
  { name: "(c) GovernanceSection.jsx contract",        live: false, preChange: "RED",   fn: checkC_componentContract },
  { name: "(d) SES-330 lane filters still in place",   live: false, preChange: "GREEN", fn: checkD_ses330FiltersHold },
  { name: "(r) render arm: six rows, three numbers",   live: false, preChange: "RED",   fn: checkR_render },
  { name: "(e) view == the live governance rows",      live: true,  preChange: "RED",   fn: checkE_viewMatchesLiveRows },
  { name: "(f) broker still excludes all six",         live: true,  preChange: "GREEN", fn: checkF_brokerStillExcludesThem },
  { name: "(g) none of the six is in the product lane", live: true, preChange: "GREEN", fn: checkG_noneInProductLane },
  { name: "(h) the feature_flags row for this ticket", live: true,  preChange: "RED",   fn: checkH_flagRow },
];

export default async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const base = url ? url.replace(/\/+$/, "") : null;
  const hdr = key ? { apikey: key, Authorization: `Bearer ${key}` } : null;

  for (const check of CHECKS) {
    if (check.live && !base) continue;
    await check.fn(base, hdr);
    console.log(`  [AGT-69] ${check.name} -- PASS`);
  }

  if (!base) {
    notRun(
      "AGT-69 live arm -- (e) the view equals the live is_active lane=governance rows, (f) the " +
      "broker still surfaces none of them, (g) none is in the product lane, (h) the feature_flags row",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Read them from public.runner_secrets by name " +
      "and export them inline. Measured when this shipped (2026-09-12): the view returned exactly " +
      "the six GV-01..GV-06 ids, getRosterCandidates() surfaced none of them, the product-lane " +
      "probe returned [], and the flag row carried backlog_id AGT-69."
    );
  }
}

selfRun(import.meta.url, run);
