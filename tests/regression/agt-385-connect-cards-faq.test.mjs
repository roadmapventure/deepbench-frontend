// DeepBench v7.0.789 | tests/regression/agt-385-connect-cards-faq.test.mjs | AGT-385 round 2 -- arm (b)
// also pins John's three changes (docs/harvests/AGT-385.md "Round 2"): the plain "For Claude, simply
// click: " lead-in before an "add <first name> to Claude" link, a fifth drawer "How to disconnect my
// agent" second in order, and "by name" in the three talk sentences. Red on the round-1 tree (d3edb27a).
// DeepBench v7.0.789 | tests/regression/agt-385-connect-cards-faq.test.mjs | AGT-385 -- the Connect to AI
// page: agent cards instead of radio rows, "Select your AI tool" with no tab pre-picked, the one-click /
// open link first, and the question drawers under one heading.
//
// Every string below is John's approved copy (docs/harvests/AGT-385.md, "Approved answers") -- this file
// holds its own copy on purpose: reading the strings back out of the source would pass on any text.
//
// STATIC, read as text -- no DOM, no network, no live arm. Three arms, each with a CONTROL: the same
// check run on a mutated copy of the real source MUST fail, or the arm measures nothing.
//   a  src/screens/ConnectAiScreen.jsx      the cards heading, two portraits (agent + team), the role
//                                           line, the word Team; no radio, no "(team)", no "Pick an agent"
//   b  src/components/ConnectAgentPopup.jsx the approved link / note / drawer copy once each (RAW), no tab
//                                           pre-picked, no tool-name heading, no Test AI line, one native
//                                           <details> never opened, four drawer mounts in John's order
//   c  src/screens/TestAiScreen.jsx         still imports the five shared names, still no per-tool steps
//
// BASELINE: red on the unchanged tree (kickoff commit 36ae9ca1) -- arm (a) finds "Which agent?" and two
// radio rows, and arm (b) finds no "FAQ" heading and the first tool pre-picked.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const CONNECT_REL = "src/screens/ConnectAiScreen.jsx";
const STEPS_REL = "src/components/ConnectAgentPopup.jsx";
const TEST_AI_REL = "src/screens/TestAiScreen.jsx";

// Comments out, code left (agt-384's): a screen may DOCUMENT what it no longer renders.
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

// ── (a) the cards ────────────────────────────────────────────────────────────────────────────
const A_WANTS = [
  [">Choose an agent<", 1],
  ["<AgentAvatar ", 2],
  ["{a.role}", 1],
  [">Team<", 1],
  ['type="radio"', 0],
  ["Pick an agent to see the steps.", 0],
  ["(team)", 0],
];

function armA() {
  const code = stripComments(read(CONNECT_REL));
  assert.deepEqual(failures(code, A_WANTS), [],
    `(a) ${CONNECT_REL} must head the picker "Choose an agent" and draw agent and team cards (portrait, name, role, Team), with no radio rows and no "Pick an agent" line`);
  const radio = code.replace("<AgentAvatar ", '<input type="radio" /><AgentAvatar ');
  assert.notEqual(radio, code, "(a) CONTROL: a portrait must be found to splice a radio beside");
  assert.deepEqual(failures(radio, A_WANTS), ['`type="radio"` 1 times, want 0'], "(a) CONTROL: a returned radio row must fail, and only that");
  const oldHeading = code.replace(">Choose an agent<", ">Which agent?<");
  assert.notEqual(oldHeading, code, "(a) CONTROL: the heading must be found to be reverted");
  assert.deepEqual(failures(oldHeading, A_WANTS), ["`>Choose an agent<` 0 times, want 1"], "(a) CONTROL: the old heading must fail, and only that");
}

// ── (b) the steps: link first, then the question drawers ───────────────────────────────────────
const APPROVED_COPY = [
  // Round 2 (John, 2026-10-05): plain lead-in text, then a link of only the words after the colon.
  "For Claude, simply click: ",
  "add <first name> to Claude",
  "2. Make sure the Connector window has the name and URL already filled in. Click Continue.",
  "How to disconnect my agent",
  "In a Claude session, simply ask for your agent by name to answer a question.",
  "In a ChatGPT session, simply ask for your agent by name to answer a question.",
  "In a Grok chat, simply ask for your agent by name to answer a question.",
  "1. Click to open: ",
  "ChatGPT Plugins",
  "Then follow the steps above.",
  "1. Click to open Grok Connectors",
  "2. Follow these steps:",
  "Select your AI tool",
  "FAQ",
  "What to expect after connection",
  "How do I talk to my agent?",
  "How do I test my agent?",
  "I can't get the connection link to work",
  'Once connected, your first <tool> session will ask your permission. Simply click "Always Allow".',
];
const DRAWER_ORDER = ["expectTitle}", "disconnectTitle}", "talkTitle}", "testTitle}", "quickAdd.fallback}"];
const B_WANTS = [
  ...APPROVED_COPY.map(s => [s, 1]),
  // Round 2: the old link wording is gone, and the lead-in sits outside the link, right before it.
  ["Click to add <first name> to Claude", 0],
  ["{tool.quickAdd.lead}<QuickAddLink ", 1],
  ["useState(null)", 1],
  ["useState(CONNECT_TOOLS[0].id)", 0],
  ["nextTest", 0],
  ["{tool.subtitle}", 0],
  ["<details", 1],
  ["<details open", 0],
  ["<Drawer title=", 5],
];

function bFailures(src) {
  const out = failures(src, B_WANTS);
  const at = DRAWER_ORDER.map(s => src.indexOf(s));
  DRAWER_ORDER.forEach((s, i) => { if (at[i] < 0) out.push(`missing ${s}`); });
  for (let i = 1; i < at.length; i++) {
    if (at[i - 1] >= 0 && at[i] >= 0 && !(at[i - 1] < at[i])) out.push(`${DRAWER_ORDER[i - 1]} is not before ${DRAWER_ORDER[i]}`);
  }
  return out;
}

function armB() {
  const src = read(STEPS_REL); // RAW: a retired mechanic named in a comment is still in the file
  assert.deepEqual(bFailures(src), [],
    `(b) ${STEPS_REL} must carry John's link, note and drawer copy once each, pre-pick no tab, drop the tool-name heading and the Test AI line, and mount five closed drawers in order`);
  const prePicked = src.replace("useState(null)", "useState(CONNECT_TOOLS[0].id)");
  assert.notEqual(prePicked, src, "(b) CONTROL: the no-tab state must be found to be reverted");
  assert.deepEqual(bFailures(prePicked), ["`useState(null)` 0 times, want 1", "`useState(CONNECT_TOOLS[0].id)` 1 times, want 0"],
    "(b) CONTROL: a pre-picked first tab must fail both state needles, and only those");
  const opened = src.replace("<details", "<details open");
  assert.deepEqual(bFailures(opened), ["`<details open` 1 times, want 0"], "(b) CONTROL: a drawer opened by default must fail, and only that");
  const swapped = src.replace("expectTitle}", "@@E@@").replace("disconnectTitle}", "expectTitle}").replace("@@E@@", "disconnectTitle}");
  assert.notEqual(swapped, src, "(b) CONTROL: the first two drawer mounts must be found to be swapped");
  assert.deepEqual(bFailures(swapped), ["expectTitle} is not before disconnectTitle}"], "(b) CONTROL: drawers out of John's order must fail, and only that");
  const oldTalk = src.replace("ask for your agent by name to answer", "ask for your agent to answer");
  assert.notEqual(oldTalk, src, "(b) CONTROL: a by-name sentence must be found to be reverted");
  assert.deepEqual(bFailures(oldTalk), ["`In a Claude session, simply ask for your agent by name to answer a question.` 0 times, want 1"],
    "(b) CONTROL: the Claude talk sentence without \"by name\" must fail, and only that");
}

// ── (c) the Test AI page is untouched ──────────────────────────────────────────────────────────
const C_WANTS = [
  ['import { CONNECT_SHARED, h2Style, pStyle, olStyle, liStyle } from "../components/ConnectAgentPopup.jsx";', 1],
  ["CONNECT_TOOLS", 0],
];

function armC() {
  const code = stripComments(read(TEST_AI_REL));
  assert.deepEqual(failures(code, C_WANTS), [], `(c) ${TEST_AI_REL} must import the five shared names and read no per-tool steps`);
  const withTools = code + "\nconst t = CONNECT_TOOLS;";
  assert.deepEqual(failures(withTools, C_WANTS), ["`CONNECT_TOOLS` 1 times, want 0"], "(c) CONTROL: the page reading CONNECT_TOOLS must fail, and only that");
}

async function run() {
  for (const [name, fn] of [["a", armA], ["b", armB], ["c", armC]]) {
    await fn();
    console.log(`  [AGT-385] (${name}) -- PASS`);
  }
  console.log("AGT-385 connect cards + drawers test: PASS");
}

selfRun(import.meta.url, run);
export default run;
