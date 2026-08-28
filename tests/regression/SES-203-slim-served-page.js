// DeepBench v7.0.290 | tests/regression/SES-203-slim-served-page.js | SES-203 -- the served briefing page
// drops the template's developer commentary, and this guards BOTH directions of that claim.
//
// THE TICKET. Since the Artifact publish gate began refusing a republish until the session had Read
// every line of the live page, a full-page read is a precondition to writing John's briefing. John
// decided it on 2026-08-25 (gated card e5be0e66, attended architect session), verbatim: "SHRINK the
// page so reading it is cheap, rather than paying the ~200K toll on a schedule" -- i.e. the ticket's
// candidate (c), with (b) one-republish-per-N-cycles explicitly rejected in the same sentence.
//
// WHY A SIZE ASSERTION ALONE WOULD BE WORTHLESS, and it is the test an editor writes instead: a
// strip that removed the wrong bytes also gets smaller. Every part below therefore pairs the
// shrink with a PRESERVATION assertion on the same artifact -- John's harvested state, the
// stylesheet, the HTML comments and every real string literal have to come through byte-for-byte.
// Part 3 is the negative control and it runs on the REAL template rather than a fixture, so a
// vacuous pass (a template that never had comments) is impossible. Part 5 is the hazard case the
// state machine exists for: a `//` inside a string or a template literal is CONTENT.
//
// WHAT IS DELIBERATELY NOT ASSERTED: that the template on disk shrinks. It must NOT -- the template
// is the source of truth and keeps every editor warning. This is a build-output transform.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM, VirtualConsole } from "jsdom";
import { selfRun } from "./_lib/self-run.js";
import { slimServedPage, __test } from "../../scripts/lib/slim-served-page.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TPL = path.join(ROOT, "docs", "runbooks", "briefing-template.html");

const onlyScript = (s) => {
  const m = s.match(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(m, "SES-203: no non-JSON <script> block found -- the template's shape changed");
  return m[1];
};
const grab = (s, re) => { const m = s.match(re); return m ? m[1] : null; };
const STATE_RE = /<script type="application\/json" id="briefing-state">([\s\S]*?)<\/script>/;

// Real string literals only. Comment prose containing apostrophes is not a literal, so the
// comparison is drawn from the SLIMMED side's own code region -- see Part 2.
const literals = (src, min = 25) => {
  const out = new Set();
  const re = /'((?:[^'\\\n]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) if (m[1].length >= min) out.add(m[1]);
  return out;
};

async function run() {
  const tpl = fs.readFileSync(TPL, "utf8");
  const slim = slimServedPage(tpl);

  // --- Part 1: the transform applies, and it applies to a real artifact -------------------------
  assert.ok(slim.applied,
    `SES-203 Part 1: slimServedPage declined to apply to the real template -- reason: ${slim.reason}`);
  assert.ok(slim.removed > 20000,
    `SES-203 Part 1: only ${slim.removed} bytes removed from the real template. The whole ticket is `
    + "that this saves a material fraction of a page a cycle must read in full; a strip this small "
    + "means the comments moved, and the shrink no longer pays for the machinery.");
  assert.ok(slim.html.length < tpl.length,
    "SES-203 Part 1: the slimmed page is not smaller than the template");

  // --- Part 2: nothing John reads changed ------------------------------------------------------
  assert.strictEqual(grab(tpl, STATE_RE), grab(slim.html, STATE_RE),
    "SES-203 Part 2: the briefing-state block changed. That block is John's harvested taps and the "
    + "thing every cycle parses; it is application/json and must never be touched by a JS transform.");
  assert.strictEqual(grab(tpl, /<style>([\s\S]*?)<\/style>/), grab(slim.html, /<style>([\s\S]*?)<\/style>/),
    "SES-203 Part 2: the stylesheet changed -- the transform is scoped to <script> and must not "
    + "reach CSS");
  assert.strictEqual((tpl.match(/<!--/g) || []).length, (slim.html.match(/<!--/g) || []).length,
    "SES-203 Part 2: an HTML comment was removed. Three of them are load-bearing rather than "
    + "provenance -- the TITLE GUARD (the publisher scans only the first 8192 bytes for <title>) and "
    + "the SEED SENTINEL above briefing-state, which is deliberately not a valid empty state.");
  assert.ok(slim.html.slice(0, 8192).includes("<title>"),
    "SES-203 Part 2: <title> left the first 8192 bytes -- SES-138's window");

  // Every string literal still present in the slimmed code must be byte-identical in the original.
  // Drawn from the slimmed side on purpose: the original's `'...'` matches also catch comment prose
  // between two apostrophes, which SHOULD disappear, and asserting on those would fail by design.
  const slimLits = literals(onlyScript(slim.html));
  const origScript = onlyScript(tpl);
  const lost = [...slimLits].filter((L) => !origScript.includes(L));
  assert.strictEqual(lost.length, 0,
    `SES-203 Part 2: ${lost.length} string literal(s) in the slimmed page do not appear verbatim in `
    + `the template -- the transform is rewriting content, not deleting comments. First: `
    + JSON.stringify(lost[0] || "").slice(0, 160));
  assert.ok(slimLits.size > 100,
    `SES-203 Part 2 is VACUOUS: only ${slimLits.size} literals survived to compare. The renderer `
    + "carries hundreds; a handful means the strip gutted the code and the check above proved nothing.");

  // --- Part 3: negative control, on the real file ----------------------------------------------
  const before = origScript.split("\n").filter((l) => l.trim().startsWith("//")).length;
  const after = onlyScript(slim.html).split("\n").filter((l) => l.trim().startsWith("//")).length;
  assert.ok(before > 100,
    `SES-203 Part 3 is VACUOUS: the template's renderer carries only ${before} whole-line comments, `
    + "so 'the comments are gone afterwards' would pass without the transform doing anything.");
  assert.strictEqual(after, 0,
    `SES-203 Part 3: ${after} whole-line // comments survive in the slimmed renderer (was ${before})`);

  // --- Part 4: fail-closed. A page that publishes broken is worse than one that publishes fat. ---
  const broken = '<script>\nvar a = "unterminated\nvar b = /* unclosed\n</script>';
  const r4 = slimServedPage(broken);
  assert.strictEqual(r4.applied, false,
    "SES-203 Part 4: slimServedPage claimed success on a script that cannot parse. Both gates (the "
    + "per-cut assertion and the vm.Script check) must refuse it.");
  assert.strictEqual(r4.html, broken,
    "SES-203 Part 4: on refusal the ORIGINAL html must come back unmodified -- a partially-stripped "
    + "page is the one outcome worse than not stripping at all");
  assert.ok(r4.reason, "SES-203 Part 4: a refusal must carry a reason the build can log");

  // --- Part 5: the hazard the state machine exists for ------------------------------------------
  // A `//` inside a string, a template literal, or a regex is CONTENT. A regex-based stripper eats
  // these, which is why this is a scanner. Each case is asserted separately so one passing case
  // cannot carry the others.
  const cases = [
    ["single-quoted string", `var u = 'https://example.com/x';`, "https://example.com/x"],
    ["double-quoted string", `var v = "see // not a comment";`, "see // not a comment"],
    ["template literal", "var w = `line1\n// still content\nline2`;", "// still content"],
    ["regex literal", `var re = /https?:\\/\\//g;`, "https?:\\/\\/"],
    ["block-comment text in a string", `var y = "a /* b */ c";`, "a /* b */ c"],
  ];
  for (const [label, code, must] of cases) {
    const { out, reason } = __test.stripJsComments(code);
    assert.ok(out !== null, `SES-203 Part 5 [${label}]: the scanner refused the input -- ${reason}`);
    assert.ok(out.includes(must),
      `SES-203 Part 5 [${label}]: the scanner removed content that is inside a literal. `
      + `Expected to keep ${JSON.stringify(must)}, got ${JSON.stringify(out)}`);
  }
  // ...and it must still remove a real comment, or Part 5 proves only that it does nothing.
  const { out: stripped } = __test.stripJsComments(`var a = 1; // gone\n// gone too\nvar b = 2;`);
  assert.ok(!stripped.includes("gone"),
    "SES-203 Part 5 control: the scanner kept a genuine comment, so the five cases above pass "
    + "vacuously -- a function that returns its input satisfies all of them");
  assert.ok(stripped.includes("var a = 1;") && stripped.includes("var b = 2;"),
    "SES-203 Part 5 control: real code was removed alongside the comment");

  // --- Part 6: the decisive one -- the SLIMMED page renders the SAME PAGE ----------------------
  // Parts 1-5 prove the transform deletes only comments. This proves the consequence: run both the
  // template and its slimmed form in a DOM and compare what the renderer actually produced. It is
  // credential-free ON PURPOSE -- SES-135 renders the real built page but is gated on
  // SUPABASE_URL/SUPABASE_SERVICE_KEY and skips wherever they are absent, which is every CI run and
  // every cloud cycle. A change that ships behind a permanently-skipped check is unguarded.
  //
  // Script SOURCES are removed before comparing: a <script> in the body contributes its own text to
  // innerHTML, and that text is exactly what this ticket changes. Comparing with them in reports a
  // difference on every run and proves nothing about the rendered page.
  const renderDom = (html, label) => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => errs.push(e.message));
    const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole: vc, url: "https://example.test/" });
    const doc = dom.window.document;
    assert.strictEqual(errs.length, 0,
      `SES-203 Part 6 [${label}]: the page raised ${errs.length} jsdom error(s) while rendering. `
      + `First: ${errs[0]}`);
    const sections = doc.querySelectorAll("h2,h3").length;
    [...doc.querySelectorAll("script")].forEach((s) => s.remove());
    return { dom: doc.body.innerHTML, sections };
  };
  const plain = renderDom(tpl, "unslimmed");
  const slimmed = renderDom(slim.html, "slimmed");

  assert.ok(plain.dom.length > 10000,
    `SES-203 Part 6 is VACUOUS: the unslimmed template rendered only ${plain.dom.length} chars, so `
    + "'both render the same' would be comparing two empty pages");
  assert.strictEqual(slimmed.sections, plain.sections,
    `SES-203 Part 6: the slimmed page rendered ${slimmed.sections} sections against the unslimmed `
    + `page's ${plain.sections} -- the strip changed what the renderer produces`);
  assert.strictEqual(slimmed.dom, plain.dom,
    "SES-203 Part 6: the slimmed page's rendered DOM differs from the unslimmed page's. The whole "
    + "premise of this ticket is that the comments are addressed to editors and invisible to the "
    + "render; a difference here means the transform is changing John's page, not just its source.");

  return true;
}

selfRun(import.meta.url, run);
export default run;
