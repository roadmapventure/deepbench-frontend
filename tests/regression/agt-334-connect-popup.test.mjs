// DeepBench v7.0.789 | tests/regression/agt-334-connect-popup.test.mjs | AGT-385 -- EXPECTED_COPY's
// title is now "Select your AI tool" and the Claude / ChatGPT step-2 sentences drop 'Your first time,
// click "Always Allow".' (drawer 1 says it now); the one mechanic is useState(null) -- no tab pre-picked.
// Round 2: the three step-2 sentences say "ask for your agent by name" (John, 2026-10-05).
// Spec: docs/kickoffs/v7.0.789-AGT-385-connect-cards-faq.md.
// DeepBench v7.0.788 | tests/regression/agt-334-connect-popup.test.mjs | AGT-384 -- the popup is
// retired: its steps are the ConnectSteps component (same file, same copy) on the Connect to AI page,
// /bench/connect. Arm (a) keeps every EXPECTED_COPY string and the pill order but its one mechanic
// is now the first-pill default (CONNECT_TOOLS[0].id) -- the modal animation, the close label and
// the Escape key are gone (pinned absent by agt-384 arm d). Arm (d): PersonnelScreen no longer
// imports the popup or builds an address; it carries the ?connect=1 redirect line to the page once,
// each button label once and <BadgeActions twice. Arms (b), (c), (e) are unchanged. Red on the
// pre-v7.0.788 tree: arm (d) finds the popup import and no redirect line.
// DeepBench v7.0.787 | tests/regression/agt-334-connect-popup.test.mjs | AGT-348 slice 5 -- the
// Connect popup gets a third pill, Grok (John measured grok.com 2026-10-05). EXPECTED_COPY carries the
// Grok tool's id, label, step-1 heading, five steps, step 2 and step 3 verbatim; id: "chatgpt" must
// precede id: "grok". Red on the slice-4 tree: no Grok tool. Spec:
// docs/kickoffs/v7.0.787-AGT-348-grok-connect-tab.md.
// DeepBench v7.0.786 | tests/regression/agt-334-connect-popup.test.mjs | AGT-348 slice 4 -- John
// approved (2026-10-05, "ok") the ChatGPT tab's new step 1: heading "On chatgpt.com, on a computer ..."
// and seven steps matching today's Plugins screen (Add ▾ → Create custom MCP server). EXPECTED_COPY
// carries the eight new strings in place of the old heading and seven old steps; three old steps are
// asserted absent. Red on the slice-3 tree. Spec: docs/kickoffs/v7.0.786-AGT-348-chatgpt-connect-steps.md.
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
//   e  (slice 2, kickoff docs/kickoffs/v7.0.760-AGT-334-connect-redirect.md §5 task 3) /connect is
//      the redirect: src/screens/ConnectScreen.jsx carries the <Navigate ... replace /> element and
//      no CopyBlock, and the popup holds the tree's one CopyBlock. Control: the screen text with a
//      CopyBlock function appended MUST fail the no-CopyBlock check.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POPUP = path.join(ROOT, "src", "components", "ConnectAgentPopup.jsx");
const PERSONNEL = path.join(ROOT, "src", "screens", "PersonnelScreen.jsx");
const CONNECT_SCREEN = path.join(ROOT, "src", "screens", "ConnectScreen.jsx");

const EXPECTED_COPY = [
  "Select your AI tool",
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
  "In a Claude session, simply ask for your agent by name to answer a question.",
  "You can turn off your agent by the same path: + → Connectors → switch off.",
  'id: "chatgpt"', 'label: "ChatGPT"',
  "On chatgpt.com, on a computer (the ChatGPT phone app can't add these):",
  'Open Plugins: the button above, or "Plugins" in the left sidebar',
  'Top right: "Add" ▾ → "Create custom MCP server"',
  'Name: one you will recognize, i.e. "<first name> from DeepBench"',
  'Connection → "Server URL": paste this URL',
  'Authentication: change "OAuth" to "No Authentication"',
  'Tick "I understand and want to continue"',
  'Click "Create as a plugin"',
  "In a ChatGPT session, simply ask for your agent by name to answer a question.",
  "You can turn your agent off by:",
  "Clicking on plugins on the left hand nav",
  'Under "Installed", click the Agent name you created',
  'Change "Connected" to "Disconnect"',
  'id: "grok"', 'label: "Grok"',
  "On grok.com:",
  'Open Connectors: the button above, or in a Grok chat click "+" → "Connectors" → "Add connector"',
  'Top right: "New Connector", then click "Custom"',
  "Server URL: paste this URL",
  'Click "Add Connector"',
  "In a Grok chat, simply ask for your agent by name to answer a question.",
  'You can turn your agent off from a Grok chat: "+" → "Connectors" → switch it off.',
  "Teaching your agent",
  "Your agent starts blank: no role prompt, no guardrails, no library access. They know only what you give them. Go back to their personnel page to update their skillsets.",
  "Comparison test",
  "Ask a question that only your agent knows. Your agent answers from what you taught them.",
  "Then turn off your agent's connector, start a new session and ask the session (the AI tool's generic model) the same question. The answer is the model's own general knowledge.",
  "The difference is what your training brought.",
];

// v7.0.786 (AGT-348 slice 4): the slice-1 ChatGPT steps John's new copy replaced must be gone.
const RETIRED_CHATGPT_COPY = [
  'Click "Create MCP app"',
  "Paste URL as Connection",
  "On the very left hand nav of the app, click the plugins icon.",
];

// AGT-384: the modal shell is gone. AGT-385: no tab is pre-picked -- the one mechanic is the empty start.
const POPUP_MECHANICS = ["useState(null)"];

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
// AGT-384: ?connect=1 is honoured as a redirect to the Connect to AI page, keyed on the ROUTE's id.
const CONNECT_REDIRECT = 'if (searchParams.get("connect") === "1") return <Navigate to={`/bench/connect?agent=${agentId}`} replace />;';
const ADDRESS = "/api/mcp/";
const ADD_TRAINING = ">+ Add Training<";
const CONNECT_LABEL = "Connect ${firstName} to AI";
const MOUNT = "<BadgeActions ";

// Every arm-d failure, by name; [] is green.
function personnelFailures(text) {
  const out = [];
  if (text.includes(POPUP_IMPORT)) out.push("ConnectAgentPopup import line still present");
  if (!AGENTS_IMPORT_RE.test(text)) out.push("isPrivateAgent in the ../data/agents.js import");
  if (count(text, CONNECT_REDIRECT) !== 1) out.push(`the ?connect=1 redirect line ${count(text, CONNECT_REDIRECT)} times, want 1`);
  if (count(text, ADDRESS) !== 0) out.push(`address built ${count(text, ADDRESS)} times, want 0`);
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
  const retired = RETIRED_CHATGPT_COPY.filter(s => popup.includes(s));
  assert.deepEqual(retired, [], `the retired ChatGPT step-1 copy must be gone; still present: ${JSON.stringify(retired)}`);
  const missingMech = POPUP_MECHANICS.filter(s => !popup.includes(s));
  assert.deepEqual(missingMech, [], `the popup must carry its shell mechanics; missing: ${JSON.stringify(missingMech)}`);
  const iClaude = popup.indexOf('id: "claude"');
  const iChatgpt = popup.indexOf('id: "chatgpt"');
  assert.ok(iClaude >= 0 && iChatgpt > iClaude, 'id: "claude" must precede id: "chatgpt" -- the popup opens on the first tool');
  const iGrok = popup.indexOf('id: "grok"');
  assert.ok(iGrok > iChatgpt, 'id: "chatgpt" must precede id: "grok" -- pill order is Claude, ChatGPT, Grok');
  // Grok's Name step is ChatGPT's string verbatim, so it must appear once per tool -- twice.
  assert.equal(count(popup, 'Name: one you will recognize, i.e. "<first name> from DeepBench"'), 2,
    "the Name step must appear on both the ChatGPT and the Grok tool");

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
  assert.deepEqual(personnelFailures(personnel), [], "PersonnelScreen must not import the popup or build an address, must redirect ?connect=1 to the Connect to AI page and mount BadgeActions twice");
  assert.deepEqual(personnelFailures(personnel.replace(CONNECT_REDIRECT, "")), ["the ?connect=1 redirect line 0 times, want 1"],
    "CONTROL: PersonnelScreen without the redirect line must fail the redirect check, and only that");
  const lines = personnel.split("\n");
  const firstMount = lines.findIndex(l => l.includes(MOUNT));
  assert.ok(firstMount >= 0, "CONTROL: a <BadgeActions line must be found to be removed");
  const oneMount = lines.filter((_, i) => i !== firstMount).join("\n");
  assert.deepEqual(personnelFailures(oneMount), ["<BadgeActions mounted 1 times, want 2"],
    "CONTROL: PersonnelScreen with one <BadgeActions line removed must fail the mount count, and only that");

  // (e) /connect redirects into the popup, and the popup owns the one CopyBlock -- both directions
  const connect = fs.readFileSync(CONNECT_SCREEN, "utf8");
  const noCopyBlock = text => !text.includes("function CopyBlock");
  assert.ok(connect.includes('<Navigate to="/bench/brittany?connect=1" replace />'),
    "src/screens/ConnectScreen.jsx must redirect /connect to /bench/brittany?connect=1 with replace");
  assert.ok(noCopyBlock(connect), "src/screens/ConnectScreen.jsx must not carry a CopyBlock -- the popup's is the only one");
  assert.equal(count(popup, "function CopyBlock({ text }) {"), 1, "the popup must define CopyBlock exactly once");
  assert.equal(noCopyBlock(connect + "\nfunction CopyBlock() {}"), false,
    "CONTROL: the screen text with a CopyBlock appended must fail the no-CopyBlock check");
}

selfRun(import.meta.url, run);
export default run;
