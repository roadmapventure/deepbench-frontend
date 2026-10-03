// DeepBench v7.0.308 | tests/regression/SES-222-double-escape.js | SES-222 -- database text is
// escaped ONCE, by whichever side of the builder/template seam actually renders it.
//
// WHAT IS BEING PINNED. scripts/build-briefing.mjs composes JavaScript that the briefing template
// evaluates; some template row helpers esc() their arguments and some splice them raw. esc() is not
// idempotent, so a splice that pre-escapes an argument the helper will escape again renders the
// escape sequence to John. Two sites did:
//   (1) SS15 msRow -- J(H(r.name)). public.epics holds exactly one name with an ampersand,
//       "Selfbuild M0 - Backup & Rollback", so M0's row read a literal "&amp;" every morning.
//   (2) SS8 queueRow's priority_class -- J(H(cls).replace(/'/g,'&rsquo;')). H() never touches an
//       apostrophe; the substitution after it did, and esc(cls) then made it "&amp;rsquo;", so
//       "P1 - Improves John's Skills" reads as "P1 - Improves John&rsquo;s Skills". Latent while no
//       P1 ticket is in the top 12; live the moment one is.
//
// THE OTHER HALF IS THE POINT, and it is what stops this guard licensing a "consistency" sweep:
// classRow (SS11) and queueRow's title argument are the MIRROR IMAGE -- their template sides splice
// RAW, so the builder's H() is the only escaper and removing it would render class names and ticket
// prose as live markup. Two clauses below assert those two KEEP their H(). A patch that drops every
// H() in the file passes clauses 1-2 and fails 3-4.
//
// THE NEGATIVE CONTROL IS THE RETIRED FORM, applied to the SAME fixture and asserted to LOSE
// (the SES-213 lesson: assert a DIFFERENCE from the retired behaviour, never a property both
// implementations share). The behavioural half slices the SHIPPED esc() out of the template and the
// SHIPPED H()/J() out of the builder -- never a copy, SES-45 -- and renders the two real strings
// through the real round trip, asserting the rendered TEXT is the plain string. A fix that stripped
// the character instead of escaping it once would fail that too.
//
// Guards v7.0.308. Source-level clauses need no credentials and no network; the behavioural half
// needs only jsdom, which the suite already depends on.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");
const TEMPLATE = path.join(ROOT, "docs/runbooks/briefing-template.html");

// The two real strings, quoted from the live rows rather than invented: public.epics.name for M0,
// and the P1 legend string from FEATURES.md's Priority Class legend.
const M0 = "Selfbuild M0 - Backup & Rollback";
const P1 = "P1 - Improves John's Skills";

// ---- source-level clauses ----------------------------------------------------------------------
// Each clause reads the shipped builder source. `breaks` must flip its own clause to false, which is
// what stops a clause passing vacuously (the SES-158 meta-check below drives it).
export const CLAUSES = [
  {
    id: "ms-row-epic-name-is-raw",
    detail:
      "SS15's msRow splice must pass the epic name RAW -- briefing-template.html's msRow() calls " +
      "esc(name), so an H() here is the second escape and is the filed defect",
    test: s => /\+msRow\(\$\{J\(r\.name\)\}/.test(s),
    breaks: s => s.replace("${J(r.name)}", "${J(H(r.name))}"),
  },
  {
    id: "queue-row-priority-class-is-raw",
    detail:
      "SS8's queueRow splice must pass priority_class RAW -- queueRow() calls esc(cls), so both the " +
      "H() and the &rsquo; substitution are a second escape",
    test: s => /\+queueRow\(\$\{b\.queue\},\$\{J\(b\.backlog_id\)\},\$\{J\(epics\[b\.epic_id\] \|\| ''\)\},\$\{J\(b\.priority_class\)\}/.test(s),
    breaks: s => s.replace("${J(b.priority_class)}", "${J(H(b.priority_class).replace(/'/g, '&rsquo;'))}"),
  },
  {
    id: "sibling-classRow-still-escapes",
    detail:
      "SS11's classRow splice must KEEP its H() -- classRow() splices `name` raw, so the builder is " +
      "the only escaper. This is the edit the ship forbids, pinned so a sweeper cannot make it",
    test: s => /\+classRow\('P\$\{k\}',\$\{J\(H\(byClass\[k\]\.name\)/.test(s),
    breaks: s => s.replace("${J(H(byClass[k].name).replace(/'/g, '&rsquo;'))}", "${J(byClass[k].name)}"),
  },
  {
    id: "sibling-section8-title-still-escapes",
    detail:
      "SS8's title argument must KEEP cut()'s H() -- queueRow() splices `title` raw. The asymmetry " +
      "is deliberate and documented at displayTitleRaw()",
    test: s => /const cut = s => \{[^}]*H\(x\)/.test(s),
    breaks: s => s.replace("return x.length <= 70 ? H(x)", "return x.length <= 70 ? (x)"),
  },
  {
    id: "bd-row-note-still-raw",
    detail:
      "SS15's burn-down rows must keep passing the epic name raw -- bdRow() esc()s its note, and " +
      "v7.0.297 deliberately did not repeat the msRow mistake",
    test: s => /\+bdRow\('Drain members still open',\$\{bdOpen\},\$\{J\('of ' \+ bdNamed/.test(s),
    breaks: s => s.replace("${J('of ' + bdNamed + ' you named for ' + bdEpicName)}", "${J(H('of ' + bdNamed + ' you named for ' + bdEpicName))}"),
  },
  {
    id: "escape-rule-is-written-down",
    detail:
      "the file must carry SES-208's rule in its own header, so the next splice is decided by the " +
      "rule rather than by copying whichever neighbour was nearest",
    test: s => /ESCAPE WHAT CAME OUT OF THE DATABASE/.test(s) && /NEVER WHAT THE BUILDER COMPOSED/.test(s),
    breaks: s => s.replace("ESCAPE WHAT CAME OUT OF THE DATABASE", "escape things"),
  },
];

// ---- the behavioural half ----------------------------------------------------------------------
// Pure: slice `function <name>(...) { ... }` out of a source string by brace matching. Same helper
// shape SES-208 already uses. Returns "" when absent, which surfaces as a named failure, not a crash.
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

// Pure: lift a `const <name> = ...;` arrow out of the builder by taking the line it starts on.
// H and J are each one line by construction; a multi-line rewrite would fail to slice and be
// reported as a named failure rather than silently passing.
export function sliceConst(src, name) {
  const m = new RegExp(`^const ${name} = .*$`, "m").exec(src);
  return m ? m[0] : "";
}

// Renders one value through the REAL round trip: the builder's own transform, then the template's
// own row helper, then a DOM. Returns the rendered TEXT of the first cell.
export function roundTrip({ templateSrc, builderSrc, helper, builderExpr, value }) {
  const esc = sliceFunction(templateSrc, "esc");
  const row = sliceFunction(templateSrc, helper);
  const H = sliceConst(builderSrc, "H");
  const J = sliceConst(builderSrc, "J");
  if (!esc || !row || !H || !J) {
    throw new Error(`could not slice esc/${helper} out of the template, or H/J out of the builder`);
  }

  // The builder emits a JS single-quoted literal; the template evaluates it. Reproduce exactly that
  // seam rather than approximating it -- the bug lived in the seam, not in either side alone.
  const literal = new Function(H + "\n" + J + "\nreturn (v) => " + builderExpr + ";")()(value);
  const html = new Function(esc + "\n" + row + `\nreturn ${helper}(${literal}, 1, 2, '50.0');`)();

  const dom = new JSDOM("<!doctype html><table id=host></table>");
  dom.window.document.getElementById("host").innerHTML = "<tbody>" + html + "</tbody>";
  return dom.window.document.querySelector("td").textContent;
}

export default async function run() {
  const builderSrc = fs.readFileSync(BUILDER, "utf8");
  const templateSrc = fs.readFileSync(TEMPLATE, "utf8");

  // 1-6: the shipped source satisfies every clause.
  for (const c of CLAUSES) {
    assert.ok(c.test(builderSrc), `${c.id} -- ${c.detail}`);
  }

  // SES-158's vacuity meta-check: every clause must FAIL against its own broken source. A clause
  // whose `breaks` still passes is a clause asserting nothing.
  for (const c of CLAUSES) {
    assert.ok(
      !c.test(c.breaks(builderSrc)),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation, so it pins nothing`
    );
  }

  // 7: the shipped SS15 round trip renders the epic name with ONE ampersand.
  const shippedM0 = roundTrip({
    templateSrc, builderSrc, helper: "msRow", builderExpr: "J(v)", value: M0,
  });
  assert.strictEqual(
    shippedM0, M0,
    `SS15 msRow must render the epic name as plain text -- got ${JSON.stringify(shippedM0)}`
  );

  // 8: THE NEGATIVE CONTROL. The retired J(H(name)) form, same fixture, must LOSE -- it renders the
  // literal "&amp;". Without this the clause above would pass on both implementations.
  const retiredM0 = roundTrip({
    templateSrc, builderSrc, helper: "msRow", builderExpr: "J(H(v))", value: M0,
  });
  assert.notStrictEqual(
    retiredM0, M0,
    "the retired J(H(name)) form rendered correctly -- the control proves nothing, so this guard " +
    "is not discriminating"
  );
  assert.ok(
    retiredM0.includes("&amp;"),
    `the retired form should render the literal "&amp;" -- got ${JSON.stringify(retiredM0)}`
  );

  // 9: the SS8 defect, and its own control. queueRow's cls is its 4th argument, so it is exercised
  // through msRow's shape here only for the escape identity; the source clause above pins the site.
  const shippedP1 = roundTrip({
    templateSrc, builderSrc, helper: "msRow", builderExpr: "J(v)", value: P1,
  });
  assert.strictEqual(
    shippedP1, P1,
    `an apostrophe must survive the round trip as an apostrophe -- got ${JSON.stringify(shippedP1)}`
  );

  const retiredP1 = roundTrip({
    templateSrc, builderSrc, helper: "msRow", builderExpr: "J(H(v).replace(/'/g, '&rsquo;'))", value: P1,
  });
  assert.ok(
    retiredP1.includes("&rsquo;"),
    "the retired priority_class form should render the literal \"&rsquo;\" -- got " +
    JSON.stringify(retiredP1)
  );
}

selfRun(import.meta.url, run);
