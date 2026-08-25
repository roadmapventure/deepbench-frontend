// DeepBench v7.0.256 | tests/regression/SES-135-briefing-render.js | SES-135 (part 1 of 2)
//
// THE PERMANENT BRIEFING RENDER TEST. John answered YES to q-briefing-dom-fixture on 2026-08-23 and
// typed on the thread: "yes - you should never be throwing away tests." Every render harness before
// this one was written to a scratchpad and discarded, noted in six ships as "harness scratchpad
// only". This is the kept one.
//
// IT BUILDS THE REAL PAGE AND RENDERS IT. Not a fixture, not a saved copy: it runs the shipped
// scripts/build-briefing.mjs against the shipped docs/runbooks/briefing-template.html and live
// Supabase, then executes the result in jsdom exactly as a browser would. A render test that reads
// a checked-in snapshot passes forever while the builder rots.
//
// WHY THIS EXISTS, in one measurement (SES-208, v7.0.255, found by an early draft of this very
// file): the published page had been rendering NINE sections where the source carries SIXTEEN.
// Sections 9.1, 10, 11, 12, 13, 14 and 15 -- waiting on your input, the vision claims, the ladder,
// the queue census and the Selfbuild milestones -- were absent, held inside a 51,860-character
// script element as inert text, because one question's `context` quoted a literal script tag and
// question() interpolated it unescaped. There was NO console error and the page ended on a section
// boundary, so it looked finished. Eight ships walked past it. `no-swallowed-markup` below is the
// cheapest possible catch for that entire class, and it is deliberately structural rather than
// specific to escaping: any future defect that opens an element mid-page trips it.
//
// THE SECTION-ORDER CHECK READS ITS EXPECTATION OUT OF THE TEMPLATE, never a hand-maintained list.
// SES-178's rule is "extend the locked order, never renumber it", so a list written here would go
// stale the next time a section is appended -- and a stale list is how a guard starts failing for
// reasons that have nothing to do with the page. The rendered order must be a SUBSEQUENCE of the
// source order (nothing reordered, nothing invented) AND every unconditionally-rendered section
// must be present. §9.1 is excluded from the must-be-present set because it renders only when
// orphan ask threads exist -- a conditional section, not a missing one.
//
// CREDENTIALED: building the page needs SUPABASE_URL / SUPABASE_SERVICE_KEY. Without them the whole
// test declares itself not-run rather than passing vacuously -- run it per STANDARDS.md Section 2
// rule 5 (SES-61, v7.0.253), which is the invocation that supplies them.
//
// WHAT THIS FILE IS NOT: part 2 of SES-135 -- John's written rule for which tests earn a permanent
// home and which run every cycle versus on demand -- is NOT here. It is his call, carded for him,
// and the ticket stays open until he rules. Closing SES-135 on this file alone is the thing its own
// description forbids.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { JSDOM, VirtualConsole } from "jsdom";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE = path.join(ROOT, "docs/runbooks/briefing-template.html");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");

// The five prose fields the builder requires. Their content is irrelevant here -- this test asserts
// STRUCTURE -- so they are named as fixture text rather than pretending to be a cycle's findings.
const FIXTURE_DATA = {
  finding_text: "Fixture text from tests/regression/SES-135-briefing-render.js. Not a real finding.",
  finding_time: "12:00 AM CST",
  earlier_title: "Fixture fold",
  earlier_html: "'<p>Fixture body.</p>'",
  calib_line: "Fixture calibration line.",
};

// Pure: the section numbers the TEMPLATE declares, in source order, first occurrence wins.
export function sourceSectionOrder(html) {
  const out = [];
  const re = /secnum">([^<]+)</g;
  let m;
  while ((m = re.exec(html))) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// Pure: a sortable key for a section label, so "2" < "2b" < "3" and "9" < "9.1" < "10".
// The locked order mixes two sub-section styles (a letter suffix for §2b, a decimal for §9.1), and
// both must rank between their parent and the next integer.
export function sectionKey(s) {
  const m = /^(\d+)(?:\.(\d+))?([a-z])?$/.exec(String(s).trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2] || 0), m[3] ? m[3].charCodeAt(0) - 96 : 0];
}

// Pure: strictly ascending under sectionKey(). THIS, not source position, is the locked-order
// property. Read out of the FILE it would be wrong: orphanThreads() defines §9.1's marker near the
// top of the script while render() emits it after §9, so raw source order reads 9.1 first. Measured
// -- an earlier draft of this file asserted source order and failed on a page that was correct.
export function isAscending(labels) {
  const keys = labels.map(sectionKey);
  if (keys.some(k => k === null)) return false;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (cmp >= 0) return false;
  }
  return true;
}

// §9.1 renders only when orphan ask threads exist. Everything else in the locked order is
// unconditional, so its absence is a defect rather than a state.
export const CONDITIONAL_SECTIONS = ["9.1"];

export default async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun(
      "the whole briefing render check (section order, no-swallowed-markup, the masthead counter, " +
      "the plain-language contract and §4's reading slots)",
      "SUPABASE_URL/SUPABASE_SERVICE_KEY are absent, and this test BUILDS the real page rather " +
      "than reading a snapshot -- a snapshot would pass forever while the builder rots. Run the " +
      "suite per STANDARDS.md Section 2 rule 5 (node --env-file-if-exists=.env.local " +
      "tests/regression/run-all.js), which is the invocation that supplies them."
    );
    return true;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses135-"));
  const dataPath = path.join(dir, "data.json");
  const outPath = path.join(dir, "page.html");
  fs.writeFileSync(dataPath, JSON.stringify(FIXTURE_DATA));

  const built = spawnSync(process.execPath,
    [BUILDER, "--template", TEMPLATE, "--data", dataPath, "--version", "v0.0.0-test", "--out", outPath],
    { cwd: ROOT, encoding: "utf8", env: process.env });

  assert.strictEqual(built.status, 0,
    `SES-135: the builder could not produce a page (exit ${built.status}). ` +
    `A builder that cannot run is a finding, not a skip. stderr: ${(built.stderr || "").slice(-400)}`);

  const html = fs.readFileSync(outPath, "utf8");

  const vc = new VirtualConsole();
  const pageErrors = [];
  vc.on("jsdomError", e => pageErrors.push(e.message));
  const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/" });
  await new Promise(r => setTimeout(r, 1500));
  const doc = dom.window.document;
  const page = doc.getElementById("page");

  try {
    assert.strictEqual(pageErrors.length, 0,
      `SES-135: the page threw while rendering: ${pageErrors.slice(0, 2).join(" | ")}`);

    assert.ok(page, "SES-135: #page is missing entirely -- the page did not render");

    // ---- no-swallowed-markup (the SES-208 class) -------------------------------------------
    const swallowed = [...page.querySelectorAll("script")];
    const swallowedChars = swallowed.reduce((a, s) => a + s.textContent.length, 0);
    assert.strictEqual(swallowed.length, 0,
      `SES-135/no-swallowed-markup: ${swallowed.length} script element(s) inside #page holding ` +
      `${swallowedChars} characters. Something in the rendered HTML opened an element that should ` +
      `not exist -- that is where the missing sections went (SES-208).`);

    // ---- section order, read out of the template --------------------------------------------
    const expected = sourceSectionOrder(html);
    const rendered = [...doc.querySelectorAll("h2 .secnum")].map(e => e.textContent.trim());

    assert.ok(expected.length > 0, "SES-135: the template declares no section markers at all");
    assert.ok(isAscending(rendered),
      `SES-135/section-order: rendered order [${rendered.join(",")}] is not strictly ascending. ` +
      `The locked order is extended, never renumbered or reordered (SES-178).`);
    const unknown = rendered.filter(s => !expected.includes(s));
    assert.strictEqual(unknown.length, 0,
      `SES-135/section-order: rendered section(s) the template does not declare: ${unknown.join(", ")}`);

    const mustHave = expected.filter(s => !CONDITIONAL_SECTIONS.includes(s));
    const missing = mustHave.filter(s => !rendered.includes(s));
    assert.strictEqual(missing.length, 0,
      `SES-135/section-order: ${missing.length} unconditional section(s) did not render: ` +
      `${missing.join(", ")}. Rendered ${rendered.length} of ${expected.length}.`);

    // ---- the masthead counter may not disagree with the cards -------------------------------
    const waiting = doc.getElementById("waiting");
    assert.ok(waiting, "SES-135: the masthead decisions counter (#waiting) is missing");
    const stated = parseInt((waiting.textContent.match(/\d+/) || ["-1"])[0], 10);
    const awaits = doc.querySelectorAll("[data-awaits]").length;
    assert.strictEqual(stated, awaits,
      `SES-135/counter-agrees: the masthead says ${stated} decisions waiting but ${awaits} ` +
      `elements carry data-awaits. The masthead is the half John reads first.`);

    // ---- the plain-language contract (v7.0.145 / v7.0.146) ----------------------------------
    const cards = [...doc.querySelectorAll('[id^="item-"]')];
    assert.ok(cards.length > 0, "SES-135: no decision cards rendered at all");
    for (const c of cards) {
      const plain = c.querySelector(".plain");
      assert.ok(plain,
        `SES-135/plain-contract: card ${c.id} rendered with no plain-language block at all. ` +
        `A card missing its summary must show the red defect line, never nothing.`);
      assert.ok(plain.querySelector(".lbl") || plain.querySelector(".missing"),
        `SES-135/plain-contract: card ${c.id} has an EMPTY plain block -- neither the three ` +
        `labelled fields nor the red defect notice. That is the one rendering NULL must never get.`);
    }

    // ---- §4 renders John's actual meter reading, not a placeholder --------------------------
    const stateEl = doc.getElementById("briefing-state");
    assert.ok(stateEl, "SES-135: the briefing-state block is missing from the rendered document");
    const state = JSON.parse(stateEl.textContent);
    const slots = Object.keys(state.reading || {});
    assert.ok(slots.length > 0,
      "SES-135: briefing-state carries no meter readings -- the seed did not run (v7.0.197)");
    const body = doc.body.textContent;
    for (const slot of slots) {
      const pct = String(state.reading[slot].all);
      assert.ok(body.includes(pct),
        `SES-135/reading-slots: the '${slot}' reading (${pct}%) is in briefing-state but does not ` +
        `appear anywhere in the rendered page -- §4 is showing something other than his numbers.`);
    }
  } finally {
    dom.window.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return true;
}

selfRun(import.meta.url, run);
