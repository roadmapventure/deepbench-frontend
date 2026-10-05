// DeepBench v7.0.788 | tests/regression/agt-384-bench-home.test.mjs | AGT-384 -- Bench home, the
// Connect to AI page, the Test AI page and the left nav the five Bench pages share.
//
// FEATURE: AGT-384 -- clicking Bench opens a home page (masthead, brass rule, stats bar, four
// cards) instead of the roster; the roster moves to /bench/roster?filter=<id>; the Connect popup
// becomes a page with a "Which agent?" picker; the teaching and comparison wording moves to its own
// Test AI page; the nav reads Bench Home, All, Private Agents, the groups, Product Team. Every
// title, line, icon and label below is John's approved copy (docs/harvests/AGT-384.md) -- this file
// holds its own copy on purpose: reading the strings back out of the screens would pass on any text.
//
// STATIC, read as text -- no DOM, no network, no live arm. Ten arms, each with a CONTROL: the same
// check run on a mutated copy of the real source MUST fail, or the arm measures nothing.
//   a  src/data/agents.js             the Private group's label is "Private Agents"
//   b  src/components/BenchNav.jsx    both exports, the breadcrumb, All above Private Agents, the
//                                     filter click going to the roster address
//   c  src/screens/RosterScreen.jsx   the four cards (title, icon, line, target once each); no
//                                     "+ Add a Player", no workspace tag, no pre-selected filter
//                                     state; the filter read from the address; the vacancy tile once
//   d  src/components/ConnectAgentPopup.jsx   no modal shell, no close control, no teaching or
//                                     comparison render; the ConnectSteps export and the Test AI line
//   e  src/screens/ConnectAiScreen.jsx the picker, the ?agent= read, one address build, the steps
//   f  src/screens/TestAiScreen.jsx   the two shared sections, no per-tool steps
//   g  src/screens/PersonnelScreen.jsx both Connect buttons go to the page; the popup is not imported
//   h  src/screens/BenchNewScreen.jsx a created agent lands on the roster under Private Agents
//   i  src/main.jsx                   the four routes; /bench/test still Test My Team
//   j  RULE #1 and the no-secret gate (agt-334's) on the three new files
//
// BASELINE: on the unchanged tree (kickoff commit, pre v7.0.788) arm (a) fails first -- the label
// reads "Private" -- and every other arm would fail too: BenchNav.jsx, ConnectAiScreen.jsx and
// TestAiScreen.jsx are absent, RosterScreen carries "+ Add a Player" twice and no card, the popup
// carries its modal shell, PersonnelScreen imports the popup, and main.jsx has none of the routes.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const AGENTS_REL = "src/data/agents.js";
const NAV_REL = "src/components/BenchNav.jsx";
const ROSTER_REL = "src/screens/RosterScreen.jsx";
const STEPS_REL = "src/components/ConnectAgentPopup.jsx";
const CONNECT_REL = "src/screens/ConnectAiScreen.jsx";
const TEST_AI_REL = "src/screens/TestAiScreen.jsx";
const PERSONNEL_REL = "src/screens/PersonnelScreen.jsx";
const NEW_REL = "src/screens/BenchNewScreen.jsx";
const MAIN_REL = "src/main.jsx";

// Comments out, code left (agt-332's): a screen may DOCUMENT what it no longer renders.
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const count = (text, needle) => text.split(needle).length - 1;

// One shape for every arm: [needle, wanted count] pairs in, the failures out by name; [] is green.
// A wanted count of null means "at least once".
function failures(text, wants) {
  const out = [];
  for (const [needle, want] of wants) {
    const n = count(text, needle);
    if (want === null ? n < 1 : n !== want) out.push(`\`${needle}\` ${n} times, want ${want === null ? "1 or more" : want}`);
  }
  return out;
}

// ── (a) the label ────────────────────────────────────────────────────────────────────────────
const LABEL = 'label: "Private Agents"';
const A_WANTS = [[`export const BENCH_PRIVATE = { id: "private", ${LABEL} };`, 1]];

function armA() {
  const src = read(AGENTS_REL);
  assert.deepEqual(failures(src, A_WANTS), [], `(a) ${AGENTS_REL} must label the Private group "Private Agents"`);
  const old = src.replace(LABEL, 'label: "Private"');
  assert.notEqual(old, src, "(a) CONTROL: the label must be found to be reverted");
  assert.equal(failures(old, A_WANTS).length, 1, "(a) CONTROL: the old label \"Private\" must fail");
}

// ── (b) the shared nav ───────────────────────────────────────────────────────────────────────
const NAV_ORDER = "return [all, priv, ...groups, ...productTeamEntry];";
const B_WANTS = [
  ["export function useBenchNavItems()", 1],
  ["export function BenchNav({ current, activeFilter })", 1],
  ["export function BenchNavChips({ current, activeFilter })", 1],
  [">Bench Home<", 1],
  ['navigate("/bench")', 1],
  ['{" › "}{current}', 1],
  [NAV_ORDER, 1],
  ["return [priv, all", 0],
  ["label: BENCH_PRIVATE.label", 1],
  ["navigate(`/bench/roster?filter=${item.id}`)", 2],
  ["setActiveFilter", 0],
];

function armB() {
  assert.ok(exists(NAV_REL), `(b) ${NAV_REL} must exist -- the five Bench pages share it`);
  const code = stripComments(read(NAV_REL));
  assert.deepEqual(failures(code, B_WANTS), [],
    `(b) ${NAV_REL} must export the hook, the sidebar and the chip row, open with the Bench Home breadcrumb, list All above Private Agents and send a filter click to the roster`);
  const swapped = code.replace(NAV_ORDER, "return [priv, all, ...groups, ...productTeamEntry];");
  assert.notEqual(swapped, code, "(b) CONTROL: the nav order line must be found to be swapped");
  assert.equal(failures(swapped, B_WANTS).length, 2, "(b) CONTROL: Private above All must fail the order needle and the absent needle");
}

// ── (c) the home page and the roster ─────────────────────────────────────────────────────────
// John's four cards, verbatim (docs/harvests/AGT-384.md). The third icon is U+FF0B, not "+".
const CARDS = [
  { title: "View or train my roster", icon: "👥", line: "See your private agents, open their files and add to their training.", to: "/bench/roster?filter=private" },
  { title: "Connect to AI",           icon: "🔌", line: "Use your agents inside Claude, ChatGPT or Grok.",                       to: "/bench/connect" },
  { title: "Add a player",            icon: "＋", line: "Create a new agent and start building their expertise.",             to: "/bench/new" },
  { title: "Test AI",                 icon: "🧪", line: "Teach your agent, then see what your training adds.",                    to: "/bench/test-ai" },
];
const C_WANTS = [
  ...CARDS.flatMap(c => [
    [`title: "${c.title}"`, 1],
    [`icon: "${c.icon}"`, 1],
    [`line: "${c.line}"`, 1],
    [`to: "${c.to}"`, 1],
  ]),
  ["+ Add a Player", 0],
  ["{CURRENT_USER.workspace}", 0],
  ["CURRENT_USER", 0],
  ["useState(BENCH_PRIVATE.id)", 0],
  ['searchParams.get("filter")', 1],
  ["export default function RosterScreen({ home = false })", 1],
  ["const statAgents = home ? agents : filteredAgents;", 1],
  ["Vacancy · Position 08", 1],
  ["Your agent roster.", 1],
  ["<BenchNav ", 1],
  ["<BenchNavChips ", 1],
];

function armC() {
  const code = stripComments(read(ROSTER_REL));
  assert.deepEqual(failures(code, C_WANTS), [],
    `(c) ${ROSTER_REL} must carry the four cards once each, no "+ Add a Player", no workspace tag, the filter read from the address and the vacancy tile once`);
  // The cards sit in John's order.
  const at = CARDS.map(c => code.indexOf(`title: "${c.title}"`));
  assert.ok(at.every((p, i) => p >= 0 && (i === 0 || at[i - 1] < p)), "(c) the four cards must sit in John's order");
  const withButton = code.replace("Vacancy · Position 08", "Vacancy · Position 08 + Add a Player");
  assert.notEqual(withButton, code, "(c) CONTROL: the splice point must be found");
  assert.deepEqual(failures(withButton, C_WANTS), ["`+ Add a Player` 1 times, want 0"],
    "(c) CONTROL: a returned \"+ Add a Player\" must fail, and only that");
  const plainPlus = code.replace('icon: "＋"', 'icon: "+"');
  assert.notEqual(plainPlus, code, "(c) CONTROL: the U+FF0B icon must be found to be replaced");
  assert.equal(failures(plainPlus, C_WANTS).length, 1, "(c) CONTROL: a plain \"+\" icon must fail the icon needle");
}

// ── (d) the steps component (the file keeps its path: agt-338 and agt-348 pin it) ─────────────
const STEPS_EXPORT = "export default function ConnectSteps({ agent, address })";
const D_WANTS = [
  ["hModalPopIn", 0],
  ["hModalFadeIn", 0],
  ['aria-label="Close"', 0],
  ["onClose", 0],
  ['"Escape"', 0],
  ["teachingHeading}</h2>", 0],
  ["comparisonSteps.map", 0],
  [STEPS_EXPORT, 1],
  ['nextTest: "Connected? Next: Test AI →"', 1],
  ["{CONNECT_SHARED.nextTest}", 1],
  ['navigate("/bench/test-ai")', 1],
  ["if (agent.team) return;", 1],
  ["export const h2Style", 1],
  ["export const pStyle", 1],
  ["export const olStyle", 1],
  ["export const liStyle", 1],
];

function armD() {
  const src = read(STEPS_REL); // RAW: a retired mechanic named in a comment is still in the file
  assert.deepEqual(failures(src, D_WANTS), [],
    `(d) ${STEPS_REL} must carry no modal shell, close control or teaching/comparison render, and must export ConnectSteps ending on the Test AI line`);
  const withShell = src.replace(STEPS_EXPORT, `// onClose\n${STEPS_EXPORT}`);
  assert.notEqual(withShell, src, "(d) CONTROL: the export line must be found");
  assert.deepEqual(failures(withShell, D_WANTS), ["`onClose` 1 times, want 0"], "(d) CONTROL: a returned onClose must fail, and only that");
}

// ── (e) the Connect to AI page ───────────────────────────────────────────────────────────────
const E_WANTS = [
  [">Which agent?<", 1],
  ['searchParams.get("agent")', 1],
  ["/api/mcp/${", 1],
  ["<ConnectSteps ", 2],
  ["useAgents().filter(isPrivateAgent)", 1],
  ["&teams=1", 1],
  ["(team)", 1],
  [">Pick an agent to see the steps.<", 1],
  [">You have no private agents yet.<", 1],
  [">Add a player →<", 1],
  ['<BenchNav current="Connect to AI"', 1],
  ['<BenchNavChips current="Connect to AI"', 1],
  ["CONNECT_SHARED.teachingHeading", 0],
  // The page title is always "Connect to AI"; the steps carry the one "Connect <first name> ..." title.
  ["CONNECT_SHARED.title", 0],
];

function armE() {
  assert.ok(exists(CONNECT_REL), `(e) ${CONNECT_REL} must exist -- /bench/connect renders nothing without it`);
  const code = stripComments(read(CONNECT_REL));
  assert.deepEqual(failures(code, E_WANTS), [],
    `(e) ${CONNECT_REL} must carry the picker, the ?agent= read, one agent address build and the steps`);
  const noPicker = code.replace(">Which agent?<", "><");
  assert.notEqual(noPicker, code, "(e) CONTROL: the picker heading must be found to be removed");
  assert.deepEqual(failures(noPicker, E_WANTS), ["`>Which agent?<` 0 times, want 1"], "(e) CONTROL: the page without its picker heading must fail, and only that");
}

// ── (f) the Test AI page ─────────────────────────────────────────────────────────────────────
const F_WANTS = [
  [">Test AI<", 1],
  ["{CONNECT_SHARED.teachingHeading}", 1],
  ["{CONNECT_SHARED.teachingBody}", 1],
  ["{CONNECT_SHARED.comparisonHeading}", 1],
  ["CONNECT_SHARED.comparisonSteps.map", 1],
  ["CONNECT_TOOLS", 0],
  ['type="radio"', 0],
  ['<BenchNav current="Test AI"', 1],
  ['<BenchNavChips current="Test AI"', 1],
];

function armF() {
  assert.ok(exists(TEST_AI_REL), `(f) ${TEST_AI_REL} must exist -- /bench/test-ai renders nothing without it`);
  const code = stripComments(read(TEST_AI_REL));
  assert.deepEqual(failures(code, F_WANTS), [],
    `(f) ${TEST_AI_REL} must render the teaching and comparison sections from CONNECT_SHARED, with no per-tool steps and no picker`);
  const withTools = code + "\nconst t = CONNECT_TOOLS;";
  assert.deepEqual(failures(withTools, F_WANTS), ["`CONNECT_TOOLS` 1 times, want 0"], "(f) CONTROL: the page reading CONNECT_TOOLS must fail, and only that");
}

// ── (g) the Personnel file ───────────────────────────────────────────────────────────────────
const CONNECT_NAV = "onConnect={() => navigate(`/bench/connect?agent=${agent.id}`)}";
const G_WANTS = [
  ["/bench/connect?agent=${agent.id}", 2],
  [CONNECT_NAV, 2],
  ["<BadgeActions ", 2],
  ["ConnectAgentPopup", 0],
  ["/api/mcp/", 0],
  ["connectOpen", 0],
  ['if (searchParams.get("connect") === "1") return <Navigate to={`/bench/connect?agent=${agentId}`} replace />;', 1],
  ['navigate("/bench")} style={{fontFamily:body,fontSize:12,color:T.brassDeep,cursor:"pointer",textAlign:"left",marginBottom:12}}>← Agent Roster<', 1],
];

function armG() {
  const src = read(PERSONNEL_REL); // RAW
  assert.deepEqual(failures(src, G_WANTS), [],
    `(g) ${PERSONNEL_REL} must send both Connect buttons to /bench/connect?agent=<id>, redirect ?connect=1 there, and no longer import the popup or build an address`);
  const onePage = src.replace(CONNECT_NAV, "onConnect={() => {}}");
  assert.notEqual(onePage, src, "(g) CONTROL: a Connect handler must be found to be removed");
  assert.equal(failures(onePage, G_WANTS).length, 2, "(g) CONTROL: one Connect button not going to the page must fail both count needles");
}

// ── (h) the create screen ────────────────────────────────────────────────────────────────────
const LANDING = 'if (res.status === 201) { navigate("/bench/roster?filter=private"); return; }';
const H_WANTS = [
  ['navigate("/bench/roster?filter=private")', 1],
  [LANDING, 1],
  ['<BenchNav current="Add a player"', 1],
  ['<BenchNavChips current="Add a player"', 1],
  ['navigate("/bench")', 2],
];

function armH() {
  const src = read(NEW_REL); // RAW
  assert.deepEqual(failures(src, H_WANTS), [],
    `(h) ${NEW_REL} must land a created agent on the roster under Private Agents, show the nav, and keep Cancel and back on Bench home`);
  const oldLanding = src.replace(LANDING, 'if (res.status === 201) { navigate("/bench"); return; }');
  assert.notEqual(oldLanding, src, "(h) CONTROL: the landing line must be found to be reverted");
  assert.equal(failures(oldLanding, H_WANTS).length, 3, "(h) CONTROL: landing on Bench home must fail the landing needles and the /bench count");
}

// ── (i) the routes ───────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ["/bench",         /<Route\s+path="\/bench"\s+element=\{<RosterScreen home \/>\}\s*\/>/],
  ["/bench/roster",  /<Route\s+path="\/bench\/roster"\s+element=\{<RosterScreen \/>\}\s*\/>/],
  ["/bench/connect", /<Route\s+path="\/bench\/connect"\s+element=\{<ConnectAiScreen \/>\}\s*\/>/],
  ["/bench/test-ai", /<Route\s+path="\/bench\/test-ai"\s+element=\{<TestAiScreen \/>\}\s*\/>/],
  ["/bench/test",    /<Route\s+path="\/bench\/test"\s+element=\{<TestTeamScreen \/>\}\s*\/>/],
  ["/bench/new",     /<Route\s+path="\/bench\/new"\s+element=\{<BenchNewScreen \/>\}\s*\/>/],
  ["import ConnectAiScreen", /import\s+ConnectAiScreen\s+from\s+"\.\/screens\/ConnectAiScreen\.jsx";/],
  ["import TestAiScreen",    /import\s+TestAiScreen\s+from\s+"\.\/screens\/TestAiScreen\.jsx";/],
];
const routeFailures = text => ROUTES.filter(([, re]) => !re.test(text)).map(([name]) => name);

function armI() {
  const main = read(MAIN_REL);
  assert.deepEqual(routeFailures(main), [], `(i) ${MAIN_REL} must route /bench (home), /bench/roster, /bench/connect and /bench/test-ai, and leave /bench/test on TestTeamScreen`);
  // A static address must be declared above the :agentId route it would otherwise read as an id.
  const iParam = main.indexOf('path="/bench/:agentId"');
  for (const p of ["/bench/roster", "/bench/connect", "/bench/test-ai"]) {
    assert.ok(main.indexOf(`path="${p}"`) < iParam, `(i) ${p} must be declared above /bench/:agentId`);
  }
  const noHome = main.replace("<RosterScreen home />", "<RosterScreen />");
  assert.notEqual(noHome, main, "(i) CONTROL: the home route must be found to be reverted");
  assert.deepEqual(routeFailures(noHome), ["/bench"], "(i) CONTROL: /bench opening the roster must fail the home route, and only that");
}

// ── (j) Rule #1 and the no-secret gate on the three new files (agt-334's gates) ──────────────
const FORBIDDEN = [
  /x-deepbench-mcp-key/i,
  /MCP_API_KEY/,
  /x-db-gate-bypass/i,
  /x-vercel-protection-bypass/i,
  /vercel\.app/i,
  /#[0-9a-fA-F]{6}\b/,
];
const secretHits = text => FORBIDDEN.filter(re => re.test(text)).map(String);
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const agentIdHits = (text, ids) => ids.filter(id => new RegExp(`\\b${escapeRe(id)}\\b`, "i").test(text));

async function armJ() {
  const { AGENTS } = await import("../../src/data/agents.js");
  const ids = AGENTS.map(a => a.id);
  assert.ok(ids.length > 0 && ids.includes("brittany"), "(j) the roster must read back with ids, or this arm measures nothing");
  for (const rel of [NAV_REL, CONNECT_REL, TEST_AI_REL]) {
    const src = read(rel); // RAW: an id in a comment is still an id in the file
    assert.deepEqual(agentIdHits(src, ids), [], `(j) ${rel} must name no agent id (ARCHITECTURE §19e Rule #1)`);
    assert.deepEqual(secretHits(src), [], `(j) ${rel} must carry no key, bypass header, host string or literal hex`);
    assert.deepEqual(agentIdHits(src + "\n// brittany", ids), ["brittany"], `(j) CONTROL: an agent id spliced into ${rel} must be caught`);
    assert.ok(secretHits(src + "\n// x-deepbench-mcp-key: abc123").length > 0, `(j) CONTROL: a key header spliced into ${rel} must be caught`);
  }
}

async function run() {
  const arms = [["a", armA], ["b", armB], ["c", armC], ["d", armD], ["e", armE], ["f", armF], ["g", armG], ["h", armH], ["i", armI], ["j", armJ]];
  for (const [name, fn] of arms) {
    await fn();
    console.log(`  [AGT-384] (${name}) -- PASS`);
  }
  console.log("AGT-384 bench-home test: PASS");
}

selfRun(import.meta.url, run);
export default run;
