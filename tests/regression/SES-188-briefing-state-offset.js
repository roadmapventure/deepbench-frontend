// DeepBench v7.0.232 | tests/regression/SES-188-briefing-state-offset.js | SES-188 (option D)
// FEATURE: John's taps can be read back off the published briefing page.
//
// A cycle harvests his decisions by fetching the served artifact and parsing its `briefing-state`
// JSON block. That fetch is served HEAD-FIRST under a size budget nobody has documented, so the
// only thing that decides whether the harvest works is the block's BYTE OFFSET.
//
// WHY THIS IS A TEST AND NOT A RULE IN A DOC — the same argument SES-138 makes, with three
// measured data points instead of one. The offset is a RATCHET driven by the most routine edit
// anyone makes to briefing-template.html (adding a provenance comment) plus every CSS rule and
// every rendered section:
//
//     198.3 KB served (2026-08-24 03:2xZ)  -> block reached      (WebFetch arm only)
//     235.7 KB served (15:41 / 15:57Z)     -> block MISSED       (SES-178's own cycle declined
//                                                                 its republish as a result)
//     262.3 KB served (19:57Z, cycle 90b34320) -> MISSED ON BOTH documented read arms
//
// v7.0.223 responded by trimming 42,025 chars of provenance and stated on its own stamp that it
// "ONLY MOVES THE CEILING". Three ships later the ceiling was re-crossed, exactly as predicted.
// v7.0.232 is the structural answer John chose (directive ceb5cf0b, option D): pin the block
// ABOVE every growth surface we control, so its offset is a constant plus a fixed platform
// preamble rather than a number that climbs on every ship. This file is what keeps it there.
//
// TWO WRITERS, AND THE SECOND IS THE ONE THAT USUALLY SERVES THE HARVEST. Asserting only the
// template would look like a fix and not be one:
//   1. the template  -> scripts/build-briefing.mjs -> publish   (what a CYCLE republishes)
//   2. doc()         -> claude.use('artifact').publish(doc())   (what JOHN'S TAPS publish)
// Before this ship doc() put the block behind the whole stylesheet — ~49.6 K served, over the
// ceiling on its own, and the ~49 K SES-188 measured live. Assertions 3 and 4 cover that writer.
//
// No network, no credentials. It reads two repo files.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const TEMPLATE = path.join(ROOT, "docs", "runbooks", "briefing-template.html");
const CONTRACT = path.join(ROOT, "docs", "runbooks", "briefing-page.md");

// John's number, from directive ceb5cf0b: the block's offset in the SERVED page stays under
// ~40,000 bytes. The served page is our file plus the platform's injected frame-runtime preamble
// (fixed-size platform code, not ours — measured ~25 KB on 2026-08-24). We cannot see the
// injection from a repo test, so we hold back a deliberately generous allowance for it and assert
// the remainder against the file we CAN see. Failing early against 10,000 rather than late
// against 40,000 is the fail-closed direction: it leaves ~4x the current offset as head room and
// still fires long before a real harvest breaks.
export const SERVED_CEILING_BYTES = 40000;
export const INJECTED_PREAMBLE_ALLOWANCE_BYTES = 30000;
export const TEMPLATE_CEILING_BYTES = SERVED_CEILING_BYTES - INJECTED_PREAMBLE_ALLOWANCE_BYTES;

const STATE_TAG = '<script type="application/json" id="briefing-state">';
const SENTINEL = '<script type="application/json" id="briefing-state">{"__unseeded":true}</script>';

export function byteOffsetOf(text, needle) {
  const i = text.indexOf(needle);
  return i < 0 ? -1 : Buffer.byteLength(text.slice(0, i), "utf8");
}

function run() {
  const tpl = fs.readFileSync(TEMPLATE, "utf8");

  // ---- 1. The block is inside the ceiling ----------------------------------------------------
  const stateOffset = byteOffsetOf(tpl, SENTINEL);
  assert.ok(stateOffset >= 0,
    "briefing-template.html no longer carries the unseeded briefing-state sentinel verbatim — " +
    "scripts/build-briefing.mjs matches it as a literal string and will die at exit 2");
  assert.ok(stateOffset < TEMPLATE_CEILING_BYTES,
    `the briefing-state block is at byte ${stateOffset} of briefing-template.html, past the ` +
    `${TEMPLATE_CEILING_BYTES}-byte budget this file gets once the platform's ~` +
    `${INJECTED_PREAMBLE_ALLOWANCE_BYTES}-byte injected preamble is allowed for against John's ` +
    `${SERVED_CEILING_BYTES}-byte served ceiling (SES-188, directive ceb5cf0b). A cycle whose ` +
    "harvest read stops short of this block cannot read John's taps, and must decline to " +
    "republish — which leaves his decisions piling up behind a stale page. Provenance comments, " +
    "CSS and rendered sections all go BELOW the block, never above it.");

  // ---- 2. Everything that GROWS is below it --------------------------------------------------
  // The ceiling in assertion 1 is a snapshot; this is the invariant that keeps it true. Each of
  // these three grows on its own schedule and all three used to sit above the block.
  const order = [
    ["the title tag", byteOffsetOf(tpl, "<title>DeepBench")],
    ["the seed sentinel comment", byteOffsetOf(tpl, "<!-- THE SEED SENTINEL")],
    ["the briefing-state block", stateOffset],
    ["the newest provenance stamp", byteOffsetOf(tpl, "DeepBench v7.0.232 |")],
    ["the fonts link", byteOffsetOf(tpl, '<link id="f" rel')],
    ["the stylesheet", byteOffsetOf(tpl, '<style id="s">')],
    ["the page div", byteOffsetOf(tpl, '<div id="page"></div>')],
  ];
  for (const [name, off] of order) {
    assert.ok(off >= 0, `briefing-template.html no longer contains ${name}`);
  }
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i][1] > order[i - 1][1],
      `briefing-template.html's layout order broke: ${order[i][0]} (byte ${order[i][1]}) must ` +
      `come AFTER ${order[i - 1][0]} (byte ${order[i - 1][1]}). The required order is: title ` +
      "(SES-138's 8192-byte window), then the state block, then everything else. Anything placed " +
      "above the state block pushes it toward the read cutoff on every future ship.");
  }

  // ---- 3. doc() emits the block first, and still emits the title in its head ------------------
  // doc() is the writer John's own taps use, so this is the arm that matters most in practice.
  const docStart = tpl.indexOf("'<!doctype html>\\n<html><head>");
  assert.ok(docStart >= 0, "doc()'s self-publish head was removed or rewritten");
  const docSrc = tpl.slice(docStart, tpl.indexOf("</body></html>", docStart));
  assert.ok(docSrc.length > 0, "could not delimit doc()'s document builder");

  const dState = docSrc.indexOf(STATE_TAG);
  const dFonts = docSrc.indexOf("getElementById('f')");
  const dStyle = docSrc.indexOf("getElementById('s')");
  const dPage = docSrc.indexOf('<div id="page"></div>');
  const dBody = docSrc.indexOf("</head><body>");
  const dTitle = docSrc.indexOf("<title>DeepBench Morning Briefing</title>");

  for (const [name, i] of [["the state block", dState], ["the fonts link", dFonts],
    ["the stylesheet", dStyle], ["the page div", dPage], ["the body open", dBody],
    ["the title", dTitle]]) {
    assert.ok(i >= 0, `doc() no longer emits ${name}`);
  }
  assert.ok(dTitle < dBody,
    "doc() must keep the title inside its head — SES-138's scan window depends on it");
  assert.ok(dBody < dState,
    "doc() must emit the state block inside the body, after </head><body>");
  for (const [name, i] of [["the fonts link", dFonts], ["the stylesheet", dStyle],
    ["the page div", dPage]]) {
    assert.ok(dState < i,
      `doc() emits ${name} BEFORE the briefing-state block. That is the pre-v7.0.232 shape: it ` +
      "put the block behind the entire stylesheet, at roughly byte 49,600 of the served page — " +
      "over John's 40,000 ceiling on its own. Since doc() is what republishes on every one of " +
      "his taps, this is the document a harvest usually reads, and a template-only fix leaves " +
      "the defect fully intact on it (SES-188 option D).");
  }

  // ---- 4. NEGATIVE CONTROLS — both writers ---------------------------------------------------
  // Without these the assertions above would pass on a file that had never been fixed. Each
  // reconstructs the real pre-change shape and asserts the check FAILS on it.
  const withoutBlock = tpl.replace(SENTINEL, "");
  const brokenTpl = withoutBlock.replace('<div id="page"></div>',
    '<div id="page"></div>\n' + SENTINEL);
  const brokenOffset = byteOffsetOf(brokenTpl, SENTINEL);
  assert.ok(brokenOffset >= TEMPLATE_CEILING_BYTES,
    "negative control failed: with the state block put back where it sat before v7.0.232 (just " +
    `after the page div) its offset was ${brokenOffset}, still inside the ` +
    `${TEMPLATE_CEILING_BYTES}-byte budget. If this ever holds legitimately — the file shrank ` +
    "enough that the old position is safe too — this control has stopped discriminating and " +
    "assertion 1 is only accidentally passing.");

  // The doc() control: rebuild the pre-v7.0.232 emission order — fonts link and stylesheet in the
  // head, state block after the page div — and assert assertion 3's ordering rule rejects it.
  const preDoc =
    "'<!doctype html>\\n<html><head><meta charset=\"utf-8\">'\n" +
    "      +'<title>DeepBench Morning Briefing</title>'\n" +
    "      +document.getElementById('f').outerHTML\n" +
    "      +document.getElementById('s').outerHTML\n" +
    "      +'</head><body><div id=\"page\"></div>'\n" +
    "      +'" + STATE_TAG + "'\n";
  const pState = preDoc.indexOf(STATE_TAG);
  const pStyle = preDoc.indexOf("getElementById('s')");
  const pPage = preDoc.indexOf('<div id="page"></div>');
  assert.ok(pState > pStyle && pState > pPage,
    "negative control failed: the reconstructed pre-v7.0.232 doc() order should place the state " +
    "block AFTER the stylesheet and the page div. If it no longer does, this control has stopped " +
    "describing the shape assertion 3 exists to reject.");

  // ---- 5. The contract still states the invariant ---------------------------------------------
  // FAILS on the pre-change tree: briefing-page.md described the OLD position as the reason the
  // longer read cleared the block, which after this ship is both wrong and misleading.
  const contract = fs.readFileSync(CONTRACT, "utf8");
  for (const needle of ["40,000", "briefing-state", "SES-188-briefing-state-offset.js"]) {
    assert.ok(contract.includes(needle),
      `docs/runbooks/briefing-page.md no longer mentions ${JSON.stringify(needle)} — the ` +
      "read-back contract must carry the offset ceiling, the block it applies to, and the guard " +
      "that enforces it, or the next editor restores the old layout with nothing to warn them");
  }
}

export default run;
selfRun(import.meta.url, run);
