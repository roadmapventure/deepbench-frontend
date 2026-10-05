// DeepBench v7.0.786 | tests/regression/agt-348-add-to-claude-link.test.mjs | AGT-348 slice 4 -- the
// ChatGPT tab gets an "Open ChatGPT Plugins" button (openLink, https://chatgpt.com/plugins; John measured
// that ChatGPT has no link to the create form and no pre-fill, so it only opens Plugins), rendered above
// the step-1 heading. New arm d. Red on the slice-3 tree: no openLink. Approved by John 2026-10-05 ("ok").
// Spec: docs/kickoffs/v7.0.786-AGT-348-chatgpt-connect-steps.md.
// DeepBench v7.0.785 | tests/regression/agt-348-add-to-claude-link.test.mjs | AGT-348 slice 3 -- the
// link uses the shape John measured working 2026-10-05: claude.ai/customize/connectors with params
// modal, connectorName, connectorUrl in exactly that order and nothing else. /settings/connectors?...
// loads the "Connectors have moved to Customize" page. Red on the slice-2 tree: page is /settings/connectors.
// Spec: docs/kickoffs/v7.0.785-AGT-348-claude-link-customize.md.
// DeepBench v7.0.784 | tests/regression/agt-348-add-to-claude-link.test.mjs | AGT-348 slice 2 -- the
// link goes straight to claude.ai/settings/connectors with modal + connectorName + connectorUrl only
// (the shape John measured 2026-10-05; /customize/connectors drops modal on its redirect and lands on
// the "Connectors have moved" page). The note now says "click Continue". Red on the slice-1 tree:
// page is /customize/connectors, mcpName/mcpServerUrl ride along, note says "click Add".
// Spec: docs/kickoffs/v7.0.784-AGT-348-claude-link-direct.md.
// DeepBench v7.0.779 | tests/regression/agt-348-add-to-claude-link.test.mjs | AGT-348 -- the Connect
// popup's Claude pill gets a pre-filled "Add <first name> to Claude" link (claude.ai's Add custom
// connector dialog, name and URL carried as query params), above John's eight manual steps.
//
// Red on the unchanged tree: src/lib/connectLinks.js is absent (arm a cannot import claudeAddLink),
// and the popup carries no quickAdd entry, no QuickAddLink and no claudeAddLink import (arms b, c).
//
// ARMS (kickoff docs/kickoffs/v7.0.779-AGT-348-add-to-claude-link.md §5 task 1), no DOM, no live arm:
//   a  claudeAddLink(name, url) parsed with new URL: origin + path exactly claude.ai/customize/connectors
//      (v7.0.785, measured by John), modal=add-custom-connector, connectorName/connectorUrl carry the name
//      and the address, the keys appear in exactly the order modal, connectorName, connectorUrl, and
//      nothing else rides along (no mcpName/mcpServerUrl). A name with & = and spaces round-trips.
//      Controls: the same link with connectorUrl removed MUST fail the param check, the slice-2 path
//      /settings/connectors MUST fail the page check, and the link with mcpName appended MUST fail the
//      params check (slice 1's extra pair is what sent it to the moved page).
//   b  STATIC: the four quickAdd strings exactly once each; quickAdd: exactly once and on the Claude
//      tool (before id: "chatgpt"); the link opens in a new tab with noopener noreferrer; the agent's
//      own link renders above the step-1 heading; the team blocks build theirs from base + t.address;
//      no literal hex.
//   c  STATIC: the popup imports claudeAddLink from ../lib/connectLinks.js, and connectLinks.js names
//      no roster agent id (ARCHITECTURE §19e Rule #1).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POPUP = path.join(ROOT, "src", "components", "ConnectAgentPopup.jsx");
const LINKS = path.join(ROOT, "src", "lib", "connectLinks.js");

const CONNECTORS_PAGE = "https://claude.ai/customize/connectors";
const SLICE2_PAGE = "https://claude.ai/settings/connectors";
const PARAM_ORDER = ["modal", "connectorName", "connectorUrl"];
const QUICK_ADD_COPY = [
  // key-qualified: John's step-1 copy already quotes the bare "<first name> from DeepBench"
  'label: "Add <first name> to Claude"',
  'name: "<first name> from DeepBench"',
  "note: \"Opens Claude's Add connector window with the name and URL already filled in. Check them, then click Continue.\"",
  "fallback: \"If the fields come up empty, or you'd rather set it up by hand:\"",
];
const OLD_NOTE = "Check them, then click Add.";
const IMPORT_LINE = 'import { claudeAddLink } from "../lib/connectLinks.js";';
const AGENT_LINK = "claudeAddLink(fill(tool.quickAdd.name), address)";
const TEAM_LINK_RE = /claudeAddLink\([^)]*,\s*base \+ t\.address\)/;
const HEX_RE = /#[0-9a-fA-F]{6}\b/;
// v7.0.786 (slice 4): the ChatGPT tab's Open Plugins button.
const OPEN_LINK_COPY = [
  'href: "https://chatgpt.com/plugins"',
  'label: "Open ChatGPT Plugins"',
  "note: \"Opens ChatGPT's Plugins page in a new tab. Then follow the steps below.\"",
];
const OPEN_LINK_RENDER = "<QuickAddLink href={tool.openLink.href}";

const count = (text, needle) => text.split(needle).length - 1;
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const agentIdHits = (text, ids) => ids.filter(id => new RegExp(`\\b${escapeRe(id)}\\b`, "i").test(text));

// Every arm-a param failure for one link, by name; [] is green.
function paramFailures(href, name, url) {
  const u = new URL(href);
  const out = [];
  if (u.origin + u.pathname !== CONNECTORS_PAGE) out.push(`page ${u.origin + u.pathname}`);
  const want = { modal: "add-custom-connector", connectorName: name, connectorUrl: url };
  for (const [k, v] of Object.entries(want)) {
    if (u.searchParams.get(k) !== v) out.push(`${k}=${JSON.stringify(u.searchParams.get(k))}`);
  }
  const keys = [...u.searchParams.keys()];
  if (JSON.stringify(keys) !== JSON.stringify(PARAM_ORDER)) out.push(`params ${keys.join(",")}`);
  return out;
}

// Every arm-d failure, by name; [] is green.
function openLinkFailures(popup) {
  const out = [];
  if (count(popup, "openLink:") !== 1) out.push(`openLink: ${count(popup, "openLink:")} times, want 1`);
  else if (popup.indexOf("openLink:") < popup.indexOf('id: "chatgpt"')) out.push('openLink: before id: "chatgpt"');
  for (const s of OPEN_LINK_COPY) if (count(popup, s) !== 1) out.push(`${s} ${count(popup, s)} times, want 1`);
  const iRender = popup.indexOf(OPEN_LINK_RENDER);
  if (iRender < 0) out.push("no openLink render");
  else if (iRender > popup.indexOf("{tool.step1Heading}")) out.push("openLink renders after the step-1 heading");
  return out;
}

async function run() {
  // (a) the link, both directions
  assert.ok(fs.existsSync(LINKS), "src/lib/connectLinks.js must exist -- the popup has no link to offer without it");
  const { claudeAddLink } = await import(pathToFileURL(LINKS).href);
  assert.equal(typeof claudeAddLink, "function", "connectLinks.js must export claudeAddLink");
  const name = "Ann from DeepBench";
  const url = "https://x.test/api/mcp/abc";
  const href = claudeAddLink(name, url);
  assert.deepEqual(paramFailures(href, name, url), [], `the link must carry modal, connectorName, connectorUrl, in that order, and nothing else: ${href}`);
  const odd = "R&D = Ann & co";
  assert.deepEqual(paramFailures(claudeAddLink(odd, url), odd, url), [], "a name with & = and spaces must round-trip");
  const stripped = new URL(href);
  stripped.searchParams.delete("connectorUrl");
  assert.ok(paramFailures(stripped.href, name, url).length > 0,
    "CONTROL: a link without connectorUrl must fail the param check, or the check reads nothing");
  const slice2 = SLICE2_PAGE + new URL(href).search;
  assert.ok(paramFailures(slice2, name, url).some(f => f.startsWith("page ")),
    "CONTROL: a link on /settings/connectors must fail the page check (it loads the moved page)");
  const withMcp = new URL(href);
  withMcp.searchParams.append("mcpName", name);
  assert.ok(paramFailures(withMcp.href, name, url).some(f => f.startsWith("params ")),
    "CONTROL: the link with mcpName appended must fail the params check (slice 1's extra pair)");
  const reordered = new URL(CONNECTORS_PAGE);
  for (const k of ["connectorName", "modal", "connectorUrl"]) reordered.searchParams.set(k, new URL(href).searchParams.get(k));
  assert.ok(paramFailures(reordered.href, name, url).some(f => f.startsWith("params ")),
    "CONTROL: the right keys in the wrong order must fail the params check");

  // (b) the popup's quickAdd wiring
  const popup = fs.readFileSync(POPUP, "utf8");
  const wrongCount = QUICK_ADD_COPY.filter(s => count(popup, s) !== 1);
  assert.deepEqual(wrongCount, [], `each quickAdd string must appear exactly once; off: ${JSON.stringify(wrongCount)}`);
  assert.ok(!popup.includes(OLD_NOTE), `the slice-1 note "${OLD_NOTE}" must be gone -- claude.ai's button says Continue`);
  assert.equal(count(popup, "quickAdd:"), 1, "quickAdd: must be defined exactly once (Claude only -- ChatGPT has no such link)");
  assert.ok(popup.indexOf("quickAdd:") < popup.indexOf('id: "chatgpt"'), 'quickAdd: must sit on the Claude tool, before id: "chatgpt"');
  assert.ok(popup.includes('target="_blank"'), 'the link must open in a new tab (target="_blank")');
  assert.ok(popup.includes('rel="noopener noreferrer"'), 'the link must carry rel="noopener noreferrer"');
  const iAgent = popup.indexOf(AGENT_LINK);
  assert.ok(iAgent >= 0, `the agent's link must be built as ${AGENT_LINK}`);
  assert.ok(iAgent < popup.indexOf("{tool.step1Heading}"), "the agent's link must render above the step-1 heading");
  assert.ok(TEAM_LINK_RE.test(popup), "each team block must build its link from base + t.address");
  assert.ok(!HEX_RE.test(popup), "the popup must carry no literal hex colour -- tokens only");

  // (d) v7.0.786: the ChatGPT tab's Open Plugins button, both directions
  assert.deepEqual(openLinkFailures(popup), [], 'the ChatGPT tool must carry one openLink (chatgpt.com/plugins, label, note), rendered above the step-1 heading');
  const noOpenLink = popup.split("openLink:").join("");
  assert.notEqual(noOpenLink, popup, "CONTROL: an openLink: key must be found to be removed");
  assert.ok(openLinkFailures(noOpenLink).length > 0, "CONTROL: the popup with openLink: removed must fail arm d");

  // (c) the import, and Rule #1 on the new file
  assert.ok(popup.includes(IMPORT_LINE), `the popup must import claudeAddLink: ${IMPORT_LINE}`);
  const links = fs.readFileSync(LINKS, "utf8");
  const { AGENTS } = await import("../../src/data/agents.js");
  const ids = AGENTS.map(a => a.id);
  assert.ok(ids.length > 0 && ids.includes("brittany"), "the roster must read back with ids, or this arm measures nothing");
  assert.deepEqual(agentIdHits(links, ids), [], "connectLinks.js must name no agent id (ARCHITECTURE §19e Rule #1)");
  assert.deepEqual(agentIdHits(links + "\n// brittany", ids), ["brittany"], "CONTROL: a spliced agent id must be caught");
}

selfRun(import.meta.url, run);
export default run;
