// DeepBench v7.0.314 | tests/regression/SES-236-prime-directive-briefing.js | SES-236 -- the
// briefing renders the Prime Directive verbatim (§17) and orders §8 by the Prime Directive's own
// pick order, and it does BOTH by reading one SQL home rather than re-deriving the predicate.
//
// WHAT IS BEING PINNED, and why the obvious guard would be the wrong one. It is easy to write a
// test that asserts "§8 shows Selfbuild tickets" -- and that test passes just as well against the
// build this ticket forbids, where the §2(a)-(c) selection is reproduced in JavaScript inside
// build-briefing.mjs. That build satisfies §7b ON THE DAY and breaks it later, because it becomes a
// THIRD expression of a predicate that already lives in drain_chain_gate's §2e branch (ses238,
// attended) -- SES-45's "a second implementation agreeing with itself", and the staleness class
// §7b names. So the load-bearing clauses here are about WHERE the predicate lives, not about what
// the page happens to show today.
//
// THE SIZE CLAUSE IS THE TICKET'S OWN DESIGN QUESTION, TURNED INTO AN ASSERTION. §7 demands the
// ~7.6 KB directive body VERBATIM on every rebuild while the page is under the SES-188 read budget.
// The answer was a measurement: `briefing-state` sits at byte 2,624 of the template and doc() emits
// it FIRST in the body, while sections render into #page -- after it on both paths. Clause
// `section-17-renders-below-the-state-block` asserts that ORDERING structurally, with no
// credentials and no network, so a future edit that moves §17 above the block fails here rather
// than by truncating a cycle's harvest in production. Verified numerically at the ship as well:
// briefing-state's offset in the BUILT page was 2,624 before this change and 2,624 after, with the
// page 9,549 bytes larger.
//
// EVERY CLAUSE CARRIES ITS OWN NEGATIVE CONTROL (`breaks`), driven by the SES-158 vacuity
// meta-check: a clause that still passes after its own mutation is asserting nothing and fails the
// suite. On top of that there is a FILE-LEVEL negative control -- every clause is run against
// origin/dev's own pre-change builder and template, where they must FAIL. A clause that passes on
// both trees is not pinning this ship.
//
// Credential-free and network-free by construction: every clause reads source text. The file-level
// control needs git only, and declares itself not-run rather than failing if the ref is absent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUILDER = path.join(ROOT, "scripts/build-briefing.mjs");
const TEMPLATE = path.join(ROOT, "docs/runbooks/briefing-template.html");

// The three design_status flags. Their presence in the BUILDER is the fingerprint of the rejected
// build -- the predicate re-spelled in JavaScript. They belong in SQL and nowhere else.
const FLAG_TRIPLE = ["needs-john", "needs-desktop", "john-paced"];

// ---- pure helpers (exported so they are testable, and sliced from nothing) ----------------------

// Class names the stylesheet actually defines. Parsed from the template's own <style id="s">, never
// hand-listed -- a hand-listed set goes stale the first time the stylesheet changes.
export function definedClasses(templateSrc) {
  const style = templateSrc.slice(
    templateSrc.indexOf('<style id="s">'),
    templateSrc.indexOf("</style>", templateSrc.indexOf('<style id="s">'))
  );
  const out = new Set();
  for (const m of style.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) out.add(m[1]);
  return out;
}

// Every class token appearing in `class="..."` inside a source region.
export function classesUsed(src) {
  const out = new Set();
  for (const m of src.matchAll(/class=\\?"([^"\\]+)\\?"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  }
  return out;
}

// ---- clauses ------------------------------------------------------------------------------------
// `src` is { builder, template }. `breaks` must flip its own clause to false.
export const CLAUSES = [
  {
    id: "pick-order-comes-from-one-sql-home",
    detail:
      "build-briefing.mjs must obtain the pick order by CALLING public.prime_directive_queue(), " +
      "never by composing the lanes itself -- that function is also what drain_chain_gate's §2e " +
      "branch reads, which is what stops the page and the live picker drifting",
    test: s => /await rpc\('prime_directive_queue'\)/.test(s.builder),
    breaks: s => ({ ...s, builder: s.builder.replace("await rpc('prime_directive_queue')", "[]") }),
  },
  {
    id: "the-predicate-is-not-re-spelled-in-javascript",
    detail:
      "the builder must render the pick order AND not contain the design_status flag triple -- " +
      "their presence is the fingerprint of the rejected build in which the §2(a)-(c) selection is " +
      "reproduced in JS, making a third expression of a predicate that already exists in SQL " +
      "(SES-45). THE CLAUSE IS CONJUNCTIVE ON PURPOSE, and the file-level control below is what " +
      "forced it: written as absence alone it passed against origin/dev too, where the builder had " +
      "no pick order at all -- describing the repo in general rather than pinning this ship.",
    test: s => /const pdPicks = pdq/.test(s.builder) && !FLAG_TRIPLE.some(f => s.builder.includes(f)),
    breaks: s => ({
      ...s,
      builder: s.builder + `\nconst REJECTED = ['needs-john','needs-desktop','john-paced'];\n`,
    }),
  },
  {
    id: "both-sections-are-conditional-on-the-directive-standing",
    detail:
      "prime_standing must be READ from prime_directive_queue()'s always-present board row, so §8 " +
      "reverts to the P1-P10 board byte-for-byte when John revokes the directive. Hard-coding it " +
      "makes the change a permanent rewrite of §8 rather than an additive lane",
    test: s => /const pdStanding = pdBoard\.prime_standing === true;/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace(
        "const pdStanding = pdBoard.prime_standing === true;", "const pdStanding = true;"),
    }),
  },
  {
    id: "de-duplication-is-at-render-time-never-in-the-sql",
    detail:
      "a ticket in both the drain and selfbuild lanes is de-duplicated HERE. Doing it in the SQL " +
      "would change what drain_chain_gate's §2e branch selects and silently break the extraction's " +
      "equivalence -- this is the edit the ship forbids",
    test: s => /pdSeen\.has\(r\.ref\)/.test(s.builder) && /pdSeen\.add\(r\.ref\)/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace("if (pdSeen.has(r.ref)) return false; pdSeen.add(r.ref); return true;",
        "return true;"),
    }),
  },
  {
    id: "the-directive-body-is-verbatim-never-summarised",
    detail:
      "§7 says VERBATIM and makes the runner_directives row the truth. Each paragraph must reach " +
      "the page whole -- a truncation here makes the page a second source that can disagree with " +
      "the row, which is the exact failure §7 names",
    test: s => /pdParas\.map\(p => `\+\$\{J\('<p>' \+ H\(p\) \+ '<\/p>'\)\}/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace("J('<p>' + H(p) + '</p>')", "J('<p>' + H(p.slice(0, 200)) + '</p>')"),
    }),
  },
  {
    id: "amendment-history-is-derived-from-the-body",
    detail:
      "§7 requires amendment history (date + John's word). It must be parsed out of the body, not " +
      "maintained beside it -- a hand-kept list goes stale the first time John amends the row",
    test: s => /matchAll\(\/\\\[\(§\[\^\\s\\\]\]\+\)\\s\+AMENDMENT/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace(/\[\.\.\.pdText\.matchAll\([^\n]*\)\]/, "[]"),
    }),
  },
  {
    id: "section-17-is-appended-never-renumbered",
    detail:
      "John's standing instruction on gated card a8eaee1d -- extend the locked section list, never " +
      "renumber it. §16 must still be the Reviewer lane and §17 must be the new section",
    test: s => /secnum">16<\/span>Reviewer lane/.test(s.template)
            && /secnum">17<\/span>The Prime Directive/.test(s.template),
    breaks: s => ({
      ...s,
      template: s.template.replace('secnum">16</span>Reviewer lane', 'secnum">17</span>Reviewer lane'),
    }),
  },
  {
    id: "section-17-renders-below-the-state-block",
    detail:
      "THE SIZE CLAUSE. briefing-state must appear BEFORE §17 in the template, which is what makes " +
      "the verbatim body free for a harvesting cycle (SES-188). An edit that moves the section " +
      "above the block must fail here, not by truncating a harvest in production",
    test: s => {
      const state = s.template.indexOf('id="briefing-state"');
      const sec17 = s.template.indexOf('secnum">17</span>The Prime Directive');
      return state >= 0 && sec17 > state;
    },
    breaks: s => ({
      ...s,
      template: s.template.replace('<script type="application/json" id="briefing-state">',
        "<!-- moved --><script type=\"application/json\" id=\"briefing-STATE\">"),
    }),
  },
  {
    id: "template-carries-every-anchor-the-builder-needs",
    detail:
      "all four §8/§17 substitutions are anchored, so a template edited under the builder is exit 2 " +
      "rather than a page published with sample text (the SES-178 rule)",
    test: s => s.template.includes("// §17-BODY-START")
            && s.template.includes("// §17-BODY-END")
            && s.template.includes("<th>Design status</th><th>Title</th></tr>'")
            && s.template.includes("P1-P10 board: sample line"),
    breaks: s => ({ ...s, template: s.template.replace("// §17-BODY-START", "// removed") }),
  },
  {
    id: "the-board-line-names-the-suspension-and-its-count",
    detail:
      "§7b, verbatim: 'below them a single line \"P1-P10 board: suspended by the Prime Directive " +
      "until Selfbuild completes (N tickets waiting)\"'. The count must be the derived one, never a " +
      "literal",
    test: s => /suspended by the Prime Directive until Selfbuild/.test(s.builder)
            && /\$\{pdBoard\.board_waiting\} tickets waiting/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace("${pdBoard.board_waiting} tickets waiting", "551 tickets waiting"),
    }),
  },
  {
    id: "an-empty-pick-list-refuses-to-publish",
    detail:
      "if the directive stands but the pick list is empty, that is the PARKED state (§2(d)), not a " +
      "page. The builder must die rather than publish the P1-P10 board under a Prime-Directive " +
      "heading or fall back to the template's sample rows",
    test: s => /if \(pdStanding && !pdShown\.length\) \{\s*\n\s*die\(/.test(s.builder),
    breaks: s => ({
      ...s,
      builder: s.builder.replace("if (pdStanding && !pdShown.length) {", "if (false) {"),
    }),
  },
];

// ---- the structural no-new-CSS arm --------------------------------------------------------------
// SES-178's rule for SES-188's reason: every rule added to #s sits ABOVE the state block, so a new
// section must reuse classes the stylesheet already defines. Asserted structurally rather than by
// eye, over BOTH the template's §17 skeleton and the builder's composed §17/§8 markup.
export function undefinedClassesInNewMarkup(builderSrc, templateSrc) {
  const defined = definedClasses(templateSrc);
  const sec17 = templateSrc.slice(
    templateSrc.indexOf('secnum">17</span>'),
    templateSrc.indexOf("// §17-BODY-END") + 20
  );
  const pdBlock = builderSrc.slice(
    builderSrc.indexOf("let pdBlock;"),
    builderSrc.indexOf("splice('// §17-BODY-START'")
  );
  const used = new Set([...classesUsed(sec17), ...classesUsed(pdBlock)]);
  return [...used].filter(c => !defined.has(c));
}

// ---- runner --------------------------------------------------------------------------------------
export default async function run() {
  const src = {
    builder: fs.readFileSync(BUILDER, "utf8"),
    template: fs.readFileSync(TEMPLATE, "utf8"),
  };

  // 1..N: the shipped tree satisfies every clause.
  for (const c of CLAUSES) {
    assert.ok(c.test(src), `${c.id} -- ${c.detail}`);
  }

  // SES-158's vacuity meta-check: every clause must FAIL against its own broken source.
  for (const c of CLAUSES) {
    assert.ok(
      !c.test(c.breaks(src)),
      `${c.id} is VACUOUS -- it still passes after its own breaks() mutation, so it pins nothing`
    );
  }

  // The no-new-CSS arm, and its own control: a class the stylesheet does not define must be caught.
  const undef = undefinedClassesInNewMarkup(src.builder, src.template);
  assert.deepStrictEqual(
    undef, [],
    `§17 uses class(es) the stylesheet does not define: ${undef.join(", ")}. Every rule added to ` +
    `#s sits ABOVE the briefing-state block (SES-178/SES-188), so a new section reuses existing ` +
    `classes or it costs every future harvest.`
  );
  const seeded = src.builder.replace('<p class="tnote">Standing since', '<p class="pd-fancy">Standing since');
  assert.ok(
    undefinedClassesInNewMarkup(seeded, src.template).includes("pd-fancy"),
    "the no-new-CSS arm did not catch an injected undefined class -- it is not discriminating"
  );

  // ---- FILE-LEVEL NEGATIVE CONTROL -------------------------------------------------------------
  // Every clause above must FAIL against origin/dev's own pre-change files. A clause that passes on
  // both trees is describing the repo in general, not pinning this ship.
  let before;
  try {
    const show = f => execFileSync("git", ["show", `origin/dev:${f}`], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"],
    });
    before = {
      builder: show("scripts/build-briefing.mjs"),
      template: show("docs/runbooks/briefing-template.html"),
    };
  } catch {
    notRun(
      "file-level negative control",
      "origin/dev is not fetched in this checkout, so the pre-change tree could not be read. " +
      "Run `git fetch origin dev` and re-run to exercise it."
    );
  }

  if (before) {
    const passedOnOldTree = CLAUSES.filter(c => c.test(before)).map(c => c.id);
    assert.deepStrictEqual(
      passedOnOldTree, [],
      `these clauses ALSO pass against origin/dev's pre-change tree, so they do not pin this ` +
      `ship: ${passedOnOldTree.join(", ")}`
    );
  }
}

selfRun(import.meta.url, run);
