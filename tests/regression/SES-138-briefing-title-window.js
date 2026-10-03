// DeepBench v7.0.175 | tests/regression/SES-138-briefing-title-window.js | SES-138
// FEATURE: the briefing page keeps its name across a republish.
//
// Found live 2026-08-23 by cycle 702aa2db, on the served artifact rather than by reasoning:
// after the v7.0.173 rebuild the page came back named "briefing-out" — the build file's
// FILENAME — instead of "DeepBench Morning Briefing". John finds this page by its name in his
// gallery and by its browser tab, so a rebuild that silently renames it is a real defect.
//
// CAUSE: the Artifact tool scans only the FIRST 8192 BYTES of a published file for a <title>.
// briefing-template.html opens with its provenance comment block, which grows by one comment on
// every ship, so the tag was present, correct, and never seen — at byte 24,770.
//
// WHY THIS TEST EXISTS RATHER THAN A RULE IN A DOC. The defect is a RATCHET, and it was measured
// ratcheting: the offset was 24,537 when SES-138 was filed at 02:20Z and 24,770 when it was
// revalidated at 02:34Z — 233 bytes in fourteen minutes, from a single ship. The fix (the tag at
// byte 0) is undone by one cycle prepending its provenance comment out of habit, which is the
// single most routine edit anyone makes to that file. So the invariant is asserted here, where
// breaking it fails the suite, instead of being a sentence someone has to notice.
//
// Four assertions. Two of them FAIL on the pre-change tree, which is what makes this QA rather
// than a presence check — see the negative control in assertion 1.
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

// The Artifact tool's scan window, in BYTES. Not characters: the provenance comments carry
// em dashes and arrows, so a .length on a JS string under-counts the real offset and would
// report the file safe while the published artifact is not.
export const SCAN_WINDOW_BYTES = 8192;
export const PAGE_NAME = "DeepBench Morning Briefing";

export function titleOffsetBytes(buf) {
  return buf.indexOf(Buffer.from("<title>", "utf8"));
}

function run() {
  const buf = fs.readFileSync(TEMPLATE);

  // ---- 1. The tag is inside the window ------------------------------------------------------
  // THE NEGATIVE CONTROL, and the reason this assertion is not vacuous: reconstruct the
  // pre-SES-138 shape by deleting the leading title line, and assert it FAILS. If this test
  // could pass on the broken file it would be worthless, so it proves the gap it closes was real.
  const offset = titleOffsetBytes(buf);
  assert.ok(offset >= 0, "briefing-template.html has no <title> tag at all");
  assert.ok(offset < SCAN_WINDOW_BYTES,
    `briefing-template.html's first <title> is at byte ${offset}, past the Artifact tool's ` +
    `${SCAN_WINDOW_BYTES}-byte scan window — a cycle publishing this file will get an artifact ` +
    `named after the build file instead of "${PAGE_NAME}" (SES-138). Provenance comments go ` +
    "BELOW the guard block at the top of the file, never above the <title>.");

  const firstLineEnd = buf.indexOf(Buffer.from("\n", "utf8"));
  const withoutLeadingTitle = buf.slice(firstLineEnd + 1);
  const brokenOffset = titleOffsetBytes(withoutLeadingTitle);
  assert.ok(brokenOffset >= SCAN_WINDOW_BYTES,
    "negative control failed: with the leading <title> line removed the next <title> should be " +
    `outside the ${SCAN_WINDOW_BYTES}-byte window (it was at ${brokenOffset}). If this ever ` +
    "holds legitimately — the provenance block shrank below 8KB — this control has stopped " +
    "discriminating and the file is only accidentally correct.");

  // ---- 2. It is the right name --------------------------------------------------------------
  // The string was never wrong, so this passes on the pre-change tree too. It is here because the
  // whole defect is about the NAME: a future edit that moves the tag into the window but changes
  // the words renames the page just as surely.
  const head = buf.slice(0, SCAN_WINDOW_BYTES).toString("utf8");
  const m = head.match(/<title>([^<]*)<\/title>/);
  assert.ok(m, "no complete <title>…</title> inside the scan window");
  assert.strictEqual(m[1], PAGE_NAME,
    `the page's name inside the scan window is "${m[1]}" — John finds this page by its name, ` +
    `so it must read exactly "${PAGE_NAME}"`);

  // ---- 3. The self-publish path still carries its own title ---------------------------------
  // doc() rebuilds the page from scratch on every one of John's taps, and it was ALREADY correct
  // (its <title> lands ~150 bytes in), which is why SES-138 deliberately did not touch it. This
  // asserts it stayed correct — a regression guard on the path that works, not the proof of fix.
  const src = buf.toString("utf8");
  const docStart = src.indexOf("'<!doctype html>\\n<html><head>");
  assert.ok(docStart >= 0, "doc()'s self-publish head was removed or rewritten — the path that " +
    "republishes on every tap by John must still emit a full <head>");
  const docHead = src.slice(docStart, docStart + 400);
  assert.ok(docHead.includes(`<title>${PAGE_NAME}</title>`),
    "doc()'s self-publish head no longer emits the page title — John's own taps would rename " +
    "the page, which is the SES-138 defect arriving by the other route");

  // ---- 4. The contract still states the rule -------------------------------------------------
  // FAILS on the pre-change tree: briefing-page.md said nothing about the title at all.
  const contract = fs.readFileSync(CONTRACT, "utf8");
  for (const needle of ["8192", "title:", PAGE_NAME]) {
    assert.ok(contract.includes(needle),
      `docs/runbooks/briefing-page.md no longer mentions ${JSON.stringify(needle)} — the ` +
      "regeneration contract must keep carrying the publish-time title rule and the " +
      "assert-the-served-name step (SES-138)");
  }
}

export default run;
selfRun(import.meta.url, run);
