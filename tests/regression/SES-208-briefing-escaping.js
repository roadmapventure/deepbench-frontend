// DeepBench v7.0.255 | tests/regression/SES-208-briefing-escaping.js | SES-208
//
// Guards the render boundary in docs/runbooks/briefing-template.html.
//
// THE DEFECT, measured in headless Chromium and again in jsdom rather than inferred: the published
// briefing page rendered only sections 2 through 9. Open question q-artifact-read-path-unreachable
// has a `context` that quotes a literal script tag while explaining the SES-188 measurement;
// question() interpolated it RAW, so it opened a real script element mid-section-9 and swallowed
// 51,860 characters -- sections 9.1, 10, 11, 12, 13, 14 and 15 -- as inert text. 9 h2 elements
// rendered where the source carries 16 section markers, with ZERO console errors and no visible
// break, because the page still ends on a section boundary. After the fix: 16 sections, 0 swallowed
// characters, same build, same browser.
//
// build-briefing.mjs passes these values through J(), which is JSON-for-JavaScript and NOT HTML
// escaping, so the render boundary is the only place this can be fixed.
//
// THE RULE THIS FILE PINS, and it is the half a later editor gets wrong in BOTH directions:
// ESCAPE WHAT CAME OUT OF THE DATABASE; NEVER ESCAPE WHAT THE BUILDER COMPOSED. `techHtml` and
// `idLine` are markup the builder wrote -- tags, links, bold -- and escaping them renders the card
// bodies as visible source, which is the same defect facing the other way. So this file asserts
// BOTH halves: esc() present at every DB-prose site, and absent at the two builder-markup sites.
// An escape-everything sweep fails this test, exactly as the pre-fix file does.
//
// IT IMPORTS THE SHIPPED CODE, IT DOES NOT RECREATE IT (SES-45's rule -- a test that reimplements
// the logic under test passes against the bug it guards). The behavioural clause slices esc(),
// question() and plainBlock() out of the real template by brace-matching and runs those functions.
// `thread` and `askBox` are stubbed because they are not what is under test here; `state` is a
// minimal stub for the same reason.
//
// FILE-LEVEL NEGATIVE CONTROL, measured by the cycle that shipped it: run against origin/dev's
// pre-change briefing-template.html, the four DB-prose clauses and the behavioural clause all fail
// (5 of 7); the two builder-markup clauses pass on both files, and are kept anyway -- they are the
// boundary that stops the fix being "improved" into a blanket sweep, and a guard is allowed to
// protect a property it did not author.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE = path.join(ROOT, "docs/runbooks/briefing-template.html");

// Pure: slice `function <name>(...) { ... }` out of a source string by brace matching. Returns ""
// when absent, which surfaces as a named clause failure rather than a crash.
export function sliceFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) return "";
  let i = src.indexOf("{", start);
  if (i < 0) return "";
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return "";
}

// Each clause reads ONE function's shipped source. `breaks` must flip its own clause to false.
export const CLAUSES = [
  {
    id: "question-escapes-its-text",
    fn: "question",
    detail: "question() must esc() the question text -- it is a runner_questions column",
    test: s => /qtext">'\+esc\(text\)/.test(s),
    breaks: s => s.replace("esc(text)", "text"),
  },
  {
    id: "question-escapes-its-context",
    fn: "question",
    detail:
      "question() must esc() the context -- THIS is the exact site that deleted sections 9.1 " +
      "through 15 from the live page",
    test: s => /qctx">'\+esc\(ctx\)/.test(s),
    breaks: s => s.replace("esc(ctx)", "ctx"),
  },
  {
    id: "question-escapes-yes-no-meanings",
    fn: "question",
    detail:
      "question() must esc() yesMeans/noMeans -- they have no columns yet, so they arrive empty " +
      "today and would be raw DB prose the moment SES-135's family gives them one",
    test: s => /esc\(yesMeans\)/.test(s) && /esc\(noMeans\)/.test(s),
    breaks: s => s.replace("esc(yesMeans)", "yesMeans"),
  },
  {
    id: "plainblock-escapes-card-prose",
    fn: "plainBlock",
    detail:
      "plainBlock() must esc() all three plain_* values -- they are runner_items columns a cycle " +
      "writes every ship, so this is the site most likely to carry the next stray bracket",
    test: s => /esc\(more\.cant\)/.test(s) && /esc\(more\.after\)/.test(s) && /esc\(more\.worth\)/.test(s),
    breaks: s => s.replace("esc(more.worth)", "more.worth"),
  },
  {
    id: "card-escapes-title-and-id",
    fn: "card",
    detail:
      "card() must esc() title (from backlog_display_title()) and tid (backlog_id / display_ref) " +
      "-- both are database values",
    test: s => /ttl">'\+esc\(title\)/.test(s) && /idchip">'\+esc\(tid\)/.test(s),
    breaks: s => s.replace("esc(title)", "title"),
  },
  {
    id: "card-does-NOT-escape-builder-markup",
    fn: "card",
    detail:
      "card() must NOT esc() techHtml or idLine -- the builder composed those as markup, and " +
      "escaping them renders the card bodies as visible source. This is the boundary that stops " +
      "the fix being 'improved' into an escape-everything sweep",
    // card() hands techHtml to techPanel() rather than interpolating it directly, so the control
    // mutates the call site that actually exists -- a control written against a string the file
    // does not contain changes nothing and proves nothing (the SES-158 lesson, caught here by the
    // vacuous-control assertion below on this very clause's first draft).
    test: s => !/esc\(techHtml\)/.test(s) && !/esc\(idLine\)/.test(s),
    breaks: s => s.replace("techPanel(id, techHtml)", "techPanel(id, esc(techHtml))")
                  .replace("'<div class=\"idline\">'+idLine", "'<div class=\"idline\">'+esc(idLine)"),
  },
];

// The behavioural half. Runs the SHIPPED functions against hostile input and asserts the rendered
// DOM, not the source text.
export function renderHostile(src) {
  const parts = ["esc", "plainBlock", "question"].map(n => sliceFunction(src, n));
  if (parts.some(p => !p)) throw new Error("could not slice esc/plainBlock/question out of the template");

  const factory = new Function(
    "state", "thread", "askBox",
    parts.join("\n") + "\nreturn { esc: esc, plainBlock: plainBlock, question: question };"
  );
  const api = factory({ answers: {}, asks: {} }, () => "", () => "");

  // The real string from q-artifact-read-path-unreachable, shortened. A closing tag alone is not
  // enough -- innerHTML ignores an unmatched one -- so the payload is the OPENING tag, which is
  // what actually opened an element and swallowed the rest of the page.
  const HOSTILE = 'the platform-injected frame-runtime <script>, which sits ahead of <meta charset>';

  const html =
    api.question("9.1", "q-fixture", "A question " + HOSTILE, HOSTILE, "", "") +
    api.plainBlock({ cant: HOSTILE, after: HOSTILE, worth: HOSTILE }) +
    '<h2><span class="secnum">10</span>The section that must survive</h2>';

  const dom = new JSDOM("<!doctype html><div id=host></div>");
  const host = dom.window.document.getElementById("host");
  host.innerHTML = html;
  return {
    scripts: host.querySelectorAll("script").length,
    swallowed: [...host.querySelectorAll("script")].reduce((a, s) => a + s.textContent.length, 0),
    sectionSurvived: host.querySelectorAll("h2 .secnum").length === 1,
    textVisible: host.textContent.includes("frame-runtime <script>"),
  };
}

export default async function run() {
  const src = fs.readFileSync(TEMPLATE, "utf8");

  for (const c of CLAUSES) {
    const fnSrc = sliceFunction(src, c.fn);
    assert.ok(fnSrc, `SES-208: could not find function ${c.fn}() in briefing-template.html`);
    assert.ok(c.test(fnSrc), `SES-208 clause '${c.id}' FAILED: ${c.detail}`);

    const mutated = c.breaks(fnSrc);
    assert.notStrictEqual(mutated, fnSrc,
      `SES-208 control for '${c.id}' is VACUOUS -- it changed nothing, so it proves nothing`);
    assert.ok(!c.test(mutated),
      `SES-208 control for '${c.id}' has no teeth -- the clause still passes with its subject removed`);
  }

  // Behavioural: hostile DB prose must not open an element, and the section after it must survive.
  const r = renderHostile(src);
  assert.strictEqual(r.scripts, 0,
    `SES-208: hostile prose opened ${r.scripts} script element(s) and swallowed ${r.swallowed} ` +
    `characters -- this is the live defect, where sections 9.1 through 15 went`);
  assert.ok(r.sectionSurvived,
    "SES-208: the section following the hostile card did not survive the render");
  assert.ok(r.textVisible,
    "SES-208: the hostile text is not visible as text -- escaping must SHOW John the bracket he " +
    "wrote, not swallow it; a fix that strips the text instead of escaping it fails here");

  return true;
}

selfRun(import.meta.url, run);
