// DeepBench v7.0.757 | tests/regression/agt-334-connect-popup.test.mjs | AGT-334 slice 1 -- the
// Personnel file's badge buttons ("+ Add Training", "Connect <first name> to AI") and the Connect popup.
//
// Red on the unchanged tree: src/components/ConnectAgentPopup.jsx is absent (arm a cannot read it),
// and src/screens/PersonnelScreen.jsx carries no <BadgeActions mount, no ConnectAgentPopup import and
// no `connect` search param (arm d).
//
// ARMS (kickoff docs/kickoffs/v7.0.757-AGT-334-connect-popup.md §5 task 3), read as text -- no DOM,
// no git history, no live arm:
//   a  the popup carries every EXPECTED_COPY string verbatim (John's copy, 2026-10-03 -- the test
//      holds its own copy on purpose: reading the strings back out of the component would pass on any
//      text), plus the modal animation, the ✕ label, the Escape key and the first-pill default; the
//      Claude tool precedes the ChatGPT tool.
//   b  RULE #1: the popup source names no agent id from the roster, word-bounded, case-insensitive.
//      Control: the same text with one roster id spliced in MUST be caught.
//   c  THE NO-SECRET GATE (agt-165's): no key header, key name, bypass header, vercel.app host or
//      literal hex colour in the popup source. Control: a spliced key header MUST be caught.
//   d  PersonnelScreen imports the popup and isPrivateAgent, reads ?connect=1, builds the address
//      exactly once, carries each button label exactly once and mounts BadgeActions exactly twice
//      (desktop card, mobile persona block). Control: one mount line removed MUST fail.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POPUP = path.join(ROOT, "src", "components", "ConnectAgentPopup.jsx");
const PERSONNEL = path.join(ROOT, "src", "screens", "PersonnelScreen.jsx");

const EXPECTED_COPY = [
  "Connect <first name> to your favorite AI tool",
  'id: "claude"', 'label: "Claude"',
  "Once in a Claude session:",
  'Click the plus "+"',
  "Connectors",
  "Add Connector",
  'Choose a name you will recognize to activate your agent, i.e. "<first name> from DeepBench"',
  "Paste this URL",
  "No sign-in",
  "Keep other defaults",
  "Save",
  'In a Claude session, simply ask for your agent to answer a question. Your first time, click "Always Allow".',
  "You can turn off your agent by the same path: + → Connectors → switch off.",
  'id: "chatgpt"', 'label: "ChatGPT"',
  "Once in a ChatGPT session:",
  "On the very left hand nav of the app, click the plugins icon.",
  'On the top right "Add" button, click the drop down arrow.',
  'Click "Create MCP app"',
  "Paste URL as Connection",
  'Change Authentication to "No Authentication"',
  'Click "Create"',
  'In a ChatGPT session, simply ask for your agent to answer a question. Your first time, click "Always Allow".',
  "You can turn your agent off by:",
  "Clicking on plugins on the left hand nav",
  'Under "Installed", click the Agent name you created',
  'Change "Connected" to "Disconnect"',
  "Teaching your agent",
  "Your agent starts blank: no role prompt, no guardrails, no library access. They know only what you give them. Go back to their personnel page to update their skillsets.",
  "Comparison test",
  "Ask a question that only your agent knows. Your agent answers from what you taught them.",
  "Then turn off your agent's connector, start a new session and ask the session (the AI tool's generic model) the same question. The answer is the model's own general knowledge.",
  "The difference is what your training brought.",
];

const POPUP_MECHANICS = ["hModalPopIn", 'aria-label="Close"', '"Escape"', "CONNECT_TOOLS[0].id"];

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

const count = (text, needle) => text.split(needle).length - 1;

const POPUP_IMPORT = 'import ConnectAgentPopup from "../components/ConnectAgentPopup.jsx";';
const AGENTS_IMPORT_RE = /import\s*\{[^}]*\bisPrivateAgent\b[^}]*\}\s*from\s*"\.\.\/data\/agents\.js";/;
const CONNECT_PARAM = 'searchParams.get("connect") === "1"';
const ADDRESS = "/api/mcp/${agent.id}";
const ADD_TRAINING = ">+ Add Training<";
const CONNECT_LABEL = "Connect ${firstName} to AI";
const MOUNT = "<BadgeActions ";

// Every arm-d failure, by name; [] is green.
function personnelFailures(text) {
  const out = [];
  if (!text.includes(POPUP_IMPORT)) out.push("ConnectAgentPopup import line");
  if (!AGENTS_IMPORT_RE.test(text)) out.push("isPrivateAgent in the ../data/agents.js import");
  if (!text.includes(CONNECT_PARAM)) out.push("the connect search param");
  if (count(text, ADDRESS) !== 1) out.push(`address built ${count(text, ADDRESS)} times, want 1`);
  if (count(text, ADD_TRAINING) !== 1) out.push(`"+ Add Training" label ${count(text, ADD_TRAINING)} times, want 1`);
  if (count(text, CONNECT_LABEL) !== 1) out.push(`Connect label ${count(text, CONNECT_LABEL)} times, want 1`);
  if (count(text, MOUNT) !== 2) out.push(`<BadgeActions mounted ${count(text, MOUNT)} times, want 2`);
  return out;
}

async function run() {
  // (a) the popup exists and carries John's copy verbatim
  assert.ok(fs.existsSync(POPUP), "src/components/ConnectAgentPopup.jsx must exist -- the Connect button opens nothing without it");
  const popup = fs.readFileSync(POPUP, "utf8");
  const missing = EXPECTED_COPY.filter(s => !popup.includes(s));
  assert.deepEqual(missing, [], `the popup must carry every copy string verbatim; missing: ${JSON.stringify(missing)}`);
  const missingMech = POPUP_MECHANICS.filter(s => !popup.includes(s));
  assert.deepEqual(missingMech, [], `the popup must carry its shell mechanics; missing: ${JSON.stringify(missingMech)}`);
  const iClaude = popup.indexOf('id: "claude"');
  const iChatgpt = popup.indexOf('id: "chatgpt"');
  assert.ok(iClaude >= 0 && iChatgpt > iClaude, 'id: "claude" must precede id: "chatgpt" -- the popup opens on the first tool');

  // (b) Rule #1, both directions
  const { AGENTS } = await import("../../src/data/agents.js");
  const ids = AGENTS.map(a => a.id);
  assert.ok(ids.length > 0 && ids.includes("brittany"), "the roster must read back with ids, or this arm measures nothing");
  assert.deepEqual(agentIdHits(popup, ids), [], "the popup source must name no agent id (ARCHITECTURE §19e Rule #1)");
  const named = popup.replace("export default", "// brittany\nexport default");
  assert.notEqual(named, popup, "CONTROL: the splice point must be found");
  assert.deepEqual(agentIdHits(named, ids), ["brittany"], "CONTROL: a spliced agent id must be caught, or the gate reads nothing");

  // (c) the no-secret gate, both directions
  assert.deepEqual(secretHits(popup), [], "the popup must carry no key, bypass header, host string or literal hex");
  const spliced = popup.replace("export default", "// x-deepbench-mcp-key: abc123\nexport default");
  assert.ok(secretHits(spliced).length > 0, "CONTROL: a spliced key header must be caught, or the gate reads nothing");

  // (d) PersonnelScreen, both directions
  const personnel = fs.readFileSync(PERSONNEL, "utf8");
  assert.deepEqual(personnelFailures(personnel), [], "PersonnelScreen must import the popup, read ?connect=1, build the address once and mount BadgeActions twice");
  const lines = personnel.split("\n");
  const firstMount = lines.findIndex(l => l.includes(MOUNT));
  assert.ok(firstMount >= 0, "CONTROL: a <BadgeActions line must be found to be removed");
  const oneMount = lines.filter((_, i) => i !== firstMount).join("\n");
  assert.deepEqual(personnelFailures(oneMount), ["<BadgeActions mounted 1 times, want 2"],
    "CONTROL: PersonnelScreen with one <BadgeActions line removed must fail the mount count, and only that");
}

selfRun(import.meta.url, run);
export default run;
