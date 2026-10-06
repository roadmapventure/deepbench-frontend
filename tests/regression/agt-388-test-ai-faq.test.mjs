// DeepBench v7.0.791 | tests/regression/agt-388-test-ai-faq.test.mjs | AGT-388 -- the Test AI page gets an
// FAQ under "Comparison test": the Connect page's "Select your AI tool" tabs and, once a tool is picked, the
// Connect page's three question drawers (what to expect, how to disconnect, how to talk), all closed.
// The pieces are shared, not copied: ConnectAgentPopup.jsx exports ToolTabs and FaqDrawers and the Connect
// page's ConnectSteps mounts the same two. Spec: docs/kickoffs/v7.0.791-AGT-388-test-ai-faq.md.
//
// STATIC, read as text -- no DOM, no network, no live arm. Three arms, each with a CONTROL: the same
// check run on a mutated copy of the real source MUST fail, or the arm measures nothing.
//   a  src/screens/TestAiScreen.jsx         the second import line, the picked-tool state, the FAQ h2, the
//                                           tabs and the drawers once each, in order under the comparison
//                                           list; no per-tool data, no drawer, no team or test or link copy
//   b  src/components/ConnectAgentPopup.jsx the two exports and their two mounts in ConnectSteps, still five
//                                           drawer mounts, the team line still in the talk drawer (RAW)
//   c  src/components/ConnectAgentPopup.jsx the copy Test AI shows unfilled -- every step2 / step3 string and
//                                           expectBody -- carries no "<first name>" (RAW)
//
// BASELINE: red on the unchanged tree (kickoff commit 75f548e5) -- arm (a) finds no
// `<ToolTabs toolId={toolId} onPick={setToolId} />`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const TEST_AI_REL = "src/screens/TestAiScreen.jsx";
const STEPS_REL = "src/components/ConnectAgentPopup.jsx";

// Comments out, code left (agt-385's): a screen may DOCUMENT what it does not render.
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const count = (text, needle) => text.split(needle).length - 1;

// [needle, wanted count] pairs in, the failures out by name; [] is green.
function failures(text, wants) {
  const out = [];
  for (const [needle, want] of wants) {
    const n = count(text, needle);
    if (n !== want) out.push(`\`${needle}\` ${n} times, want ${want}`);
  }
  return out;
}

// Needles that must appear in this order; a missing one or an inversion is a failure by name.
function orderFailures(text, order) {
  const out = [];
  const at = order.map(s => text.indexOf(s));
  order.forEach((s, i) => { if (at[i] < 0) out.push(`missing ${s}`); });
  for (let i = 1; i < at.length; i++) {
    if (at[i - 1] >= 0 && at[i] >= 0 && !(at[i - 1] < at[i])) out.push(`${order[i - 1]} is not before ${order[i]}`);
  }
  return out;
}

// ── (a) the Test AI page ─────────────────────────────────────────────────────────────────────────
const FAQ_H2 = "<h2 style={h2Style}>{CONNECT_SHARED.faqHeading}</h2>";
const FAQ_MOUNT = "<FaqDrawers toolId={toolId} />";
const A_WANTS = [
  ['import { ToolTabs, FaqDrawers } from "../components/ConnectAgentPopup.jsx";', 1],
  ["useState(null)", 1],
  ["{CONNECT_SHARED.faqHeading}</h2>", 1],
  ["<ToolTabs toolId={toolId} onPick={setToolId} />", 1],
  [FAQ_MOUNT, 1],
  ["CONNECT_TOOLS", 0],
  ["<Drawer", 0],
  ["<details", 0],
  ["teamStep", 0],
  ["testTitle", 0],
  ["quickAdd", 0],
];
const A_ORDER = ["comparisonSteps.map", "faqHeading}", "<ToolTabs ", "<FaqDrawers "];
const aFailures = code => [...failures(code, A_WANTS), ...orderFailures(code, A_ORDER)];

function armA() {
  const code = stripComments(read(TEST_AI_REL));
  assert.deepEqual(aFailures(code), [],
    `(a) ${TEST_AI_REL} must import ToolTabs and FaqDrawers on their own line, hold the picked tool, and mount the FAQ h2, the tabs and the drawers once each under the comparison list -- with no per-tool data, drawer, team, test or link copy of its own`);
  const noDrawers = code.replace(FAQ_MOUNT, "");
  assert.notEqual(noDrawers, code, "(a) CONTROL: the drawers mount must be found to be removed");
  assert.deepEqual(aFailures(noDrawers), ["`<FaqDrawers toolId={toolId} />` 0 times, want 1", "missing <FaqDrawers "],
    "(a) CONTROL: a page without the drawers must fail on that mount, and only that");
  const comparisonH2 = "<h2 style={h2Style}>{CONNECT_SHARED.comparisonHeading}</h2>";
  const h2Up = code.replace(FAQ_H2, "").replace(comparisonH2, FAQ_H2 + comparisonH2);
  assert.ok(code.includes(comparisonH2) && code.includes(FAQ_H2), "(a) CONTROL: both h2 lines must be found to move one above the other");
  assert.deepEqual(aFailures(h2Up), ["comparisonSteps.map is not before faqHeading}"],
    "(a) CONTROL: the FAQ h2 above the comparison list must fail the order, and only that");
}

// ── (b) the shared pieces in ConnectAgentPopup.jsx ───────────────────────────────────────────────
const B_WANTS = [
  ["export function ToolTabs({ toolId, onPick })", 1],
  ["export function FaqDrawers({ toolId, fill = s => s, agent = {} })", 1],
  ["<ToolTabs toolId={toolId} onPick={setToolId} />", 1],
  ["<FaqDrawers toolId={toolId} fill={fill} agent={agent} />", 1],
  ["<Drawer title=", 5],
  ["{agent.team && <p style={pStyle}>{CONNECT_SHARED.teamStep}</p>}", 1],
];
const B_ORDER = ["step3Heading === null", "export function FaqDrawers", "export default function ConnectSteps"];
const bFailures = src => [...failures(src, B_WANTS), ...orderFailures(src, B_ORDER)];

function armB() {
  const src = read(STEPS_REL); // RAW
  assert.deepEqual(bFailures(src), [],
    `(b) ${STEPS_REL} must export ToolTabs and FaqDrawers after the drawer bodies, mount both in ConnectSteps, keep five drawer mounts and keep the team line in the talk drawer`);
  const sixth = src.replace("<Drawer title=", "<Drawer title={CONNECT_SHARED.faqHeading}></Drawer>\n<Drawer title=");
  assert.deepEqual(bFailures(sixth), ["`<Drawer title=` 6 times, want 5"], "(b) CONTROL: a sixth drawer mount must fail, and only that");
}

// ── (c) the copy Test AI shows with no first name to fill ────────────────────────────────────────
function cFailures(src) {
  const out = [];
  const step2 = [...src.matchAll(/step2: "([^"]*)"/g)].map(m => m[1]);
  if (step2.length !== 3) out.push(`step2 strings ${step2.length}, want 3`);
  const step3 = [...src.matchAll(/step3: \[([\s\S]*?)\],/g)].map(m => m[1]);
  if (step3.length !== 3) out.push(`step3 lists ${step3.length}, want 3`);
  const expect = [...src.matchAll(/expectBody: '([^']*)'/g)].map(m => m[1]);
  if (expect.length !== 1) out.push(`expectBody ${expect.length}, want 1`);
  step2.forEach((s, i) => { if (s.includes("<first name>")) out.push(`step2 #${i + 1} carries <first name>`); });
  step3.forEach((s, i) => { if (s.includes("<first name>")) out.push(`step3 #${i + 1} carries <first name>`); });
  expect.forEach(s => { if (s.includes("<first name>")) out.push("expectBody carries <first name>"); });
  return out;
}

function armC() {
  const src = read(STEPS_REL); // RAW
  assert.deepEqual(cFailures(src), [],
    `(c) ${STEPS_REL}: the three step2 strings, every step3 string and expectBody must carry no "<first name>" -- Test AI renders them unfilled`);
  const named = src.replace('step2: "In a Claude session, simply ask for your agent', 'step2: "In a Claude session, simply ask for <first name>');
  assert.notEqual(named, src, "(c) CONTROL: the Claude step2 must be found to splice a first name into");
  assert.deepEqual(cFailures(named), ["step2 #1 carries <first name>"], "(c) CONTROL: a first name in one step2 must fail, and only that");
}

async function run() {
  for (const [name, fn] of [["a", armA], ["b", armB], ["c", armC]]) {
    await fn();
    console.log(`  [AGT-388] (${name}) -- PASS`);
  }
  console.log("AGT-388 Test AI FAQ test: PASS");
}

selfRun(import.meta.url, run);
export default run;
