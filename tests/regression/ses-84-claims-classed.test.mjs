// DeepBench v7.0.409 | tests/regression/ses-84-claims-classed.test.mjs | SES-84 — EVERY LIVE VISION
// CLAIM CARRIES A JUDGMENT CLASS OR AN EXPLICIT NEUTRAL MARK, AND THE BRIEF RENDERS THE PER-CLASS
// CENSUS. The M7 design gate (decision 05cc2722, ruling ii) re-scoped SES-84 away from "John ratifies
// every claim" — a finish line that died with the card surface (SES-285) and that John ruled
// 2026-08-23 does not exist (no terminal "understood" state for a class). Done now means: (1) every
// live row is `classed` (P1–P4) or `neutral`, never `unclassed`; (2) the standing brief renders, per
// class, ratified / proposed / rejected and the newest proposed root claim, read from the ONE census
// view (`public.judgment_class_census`) that SES-159 also reads.
//
// THREE ARMS, and what each proves is stated rather than implied:
//
//   1. SOURCE (always runs): scripts/render-standing-brief.js exports a PURE renderJudgmentClasses()
//      and renderBlock() places its group after Open decisions and before the provenance line.
//      Asserted on FIXTURES, with the mutation control the kickoff names: a census with
//      `unclassed = 2` MUST emit the FLAG line and one with `0` MUST NOT — the pair proves the branch
//      is live rather than the string merely present. Also: the absent-census branch says so (never
//      zeros), a missing class row is an em-dash gap (never an invented 0), the claim text goes
//      through summarise() (a backtick in corpus text would break the bullet), and the census MOVES
//      THE SHA while a stamp refresh does not.
//   2. DOC (always runs): docs/runbooks/standing-brief.md on disk carries the `**Judgment classes**`
//      block with the four class rows — the re-render ran and was committed.
//   3. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; declared NOT RUN otherwise, never silently
//      skipped): judgment_class_census returns exactly six rows in P1→P4/neutral/unclassed order,
//      `unclassed.total = 0`, no live vision_claims row is `unclassed`, and the five bucket totals sum
//      to the live row count — the census is complete, not merely ordered.
//
// WHAT ARM 3 DOES NOT PROVE, and is not permitted to: nothing about the classification decision's
// reversibility (that is the design session's QA step 3, a rolled-back reverse_decision() fixture —
// a permanent test must never write or reverse the decision ledger), and nothing about WHICH class a
// claim got: the classes are judgment under the §19v delegation, governed after the fact through
// Accept / Reverse / Rework, and a test that pinned them would freeze John's future reversals.
//
// Invocation: node tests/regression/ses-84-claims-classed.test.mjs
// (Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  splitOnMarkers, renderBlock, renderJudgmentClasses, CLASS_ORDER, factsSha, shaFromBlock, asOf,
} from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RENDERER_REL = "scripts/render-standing-brief.js";
const BRIEF_REL = "docs/runbooks/standing-brief.md";

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// A FIXED clock. renderBlock() takes the timestamp as an argument precisely so this is possible.
const T1 = "2026-09-03T03:10:00.000Z";
const T2 = "2026-09-03T09:45:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures. The shape is exactly what fetchFacts() reads from the view: one row per bucket, in
// `ord` order. The counts are the live census measured over the MCP when this shipped
// (2026-09-03), so the fixture is a real shape rather than a convenient one.
// ---------------------------------------------------------------------------
const CENSUS = (unclassed = 0) => [
  { judgment_class: "P1 - Improves John's Skills", ord: 1, ratified: 2, proposed: 32, rejected: 6, total: 40,
    newest_root_claim_ref: "VC-ROOT-001", newest_root_claim: "Features that showcase and grow John's frontier AI / agentic-engineering skill and make him more hireable, especially for FAANG-level AI roles; the platform is his living portfolio." },
  { judgment_class: "P2 - Inventive", ord: 2, ratified: 0, proposed: 54, rejected: 6, total: 60,
    newest_root_claim_ref: "VC-ROOT-002", newest_root_claim: "New inventive features: white space and competitive differentiation." },
  { judgment_class: "P3 - Investor Value", ord: 3, ratified: 0, proposed: 45, rejected: 7, total: 52,
    newest_root_claim_ref: "VC-ROOT-003", newest_root_claim: "New features that add investor / buyout value." },
  // Deliberately hostile text: a backtick and a newline. Corpus claims are agent-drafted and some
  // quote file names in backticks; the bullet must not break on them.
  { judgment_class: "P4 - New Customers", ord: 4, ratified: 1, proposed: 37, rejected: 3, total: 41,
    newest_root_claim_ref: "VC-ROOT-004", newest_root_claim: "New features that win new customers.\nThe bar is `buy-pull`." },
  { judgment_class: "neutral", ord: 5, ratified: 0, proposed: 84, rejected: 29, total: 113,
    newest_root_claim_ref: null, newest_root_claim: null },
  { judgment_class: "unclassed", ord: 6, ratified: 0, proposed: 0, rejected: 0, total: unclassed,
    newest_root_claim_ref: null, newest_root_claim: null },
];

const ITEMS = [
  { id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 },
  { id: "i2", backlog_id: "SES-2", status: "done", design_status: "designed", queue: null },
];
const SETTINGS = {
  id: 1, scheduler_on: true, interval_hours: 1, cron_minute: 40,
  grid_tolerance_min: 10, daily_max_tokens_millions: 196, reversal_window_hours: 72,
};
const FACTS = (over = {}) => ({
  items: ITEMS, settings: SETTINGS, drain: null,
  decisions: { open: [], finalWeek: 0, reversedWeek: 0 },
  census: CENSUS(0),
  ...over,
});

const FLAG = /^- \*\*FLAG: \d+ live claims? still `unclassed`\*\*/m;
const tableRows = block => block.split("\n").filter(l => /^\| `[^`]+` \| /.test(l));

// ---------------------------------------------------------------------------
// Arm 1 — SOURCE, on fixtures.
// ---------------------------------------------------------------------------
function theGroupRendersFourClassRowsPlusNeutralInOrder() {
  const stamp = asOf(T1);
  const out = renderJudgmentClasses(CENSUS(0), stamp);
  assert.ok(out.startsWith("**Judgment classes** — *" + stamp + ".*"),
    "the group must open with its name and John's as-of stamp (gated card 8c0f2bf9: every generated line carries one)");
  assert.ok(/live from `public\.judgment_class_census`/.test(out),
    "the intro must name the view the numbers come from — the census has one home and this is not it");
  assert.ok(/standing metric/.test(out) && /never a finish line/.test(out),
    "the intro must say ratification is a standing metric, never a finish line (John, 2026-08-23)");

  const rows = tableRows(out);
  assert.deepStrictEqual(
    rows.map(l => /^\| `([^`]+)` \|/.exec(l)[1]),
    [...CLASS_ORDER, "neutral"],
    "the table must carry exactly the four classes in P1→P4 order and then neutral — no unclassed row at zero");
  assert.ok(rows[0].endsWith("| 2 | 32 | 6 | 40 |"), `P1's row must carry ratified/proposed/rejected/total in that order: ${rows[0]}`);
  assert.ok(rows[4].endsWith("| 0 | 84 | 29 | 113 |"), `neutral's row must carry its counts: ${rows[4]}`);
  assert.ok(/^\| class \| ratified \| proposed \| rejected \| total \|$/m.test(out), "the header row must be the kickoff's column order");

  // One bullet per class, in order, naming the ref.
  const bullets = out.split("\n").filter(l => l.startsWith("- Newest proposed root claim for "));
  assert.strictEqual(bullets.length, 4, "exactly one newest-root-claim bullet per class");
  for (const [i, k] of CLASS_ORDER.entries()) {
    const short = k.split(" - ")[0];
    assert.ok(bullets[i].startsWith(`- Newest proposed root claim for ${short}: \`VC-ROOT-00${i + 1}\` — `),
      `bullet ${i + 1} must name ${short} and its ref: ${bullets[i]}`);
  }
  // The hostile P4 text: one line, backtick neutralised, code span balanced.
  assert.ok(!/`buy-pull`/.test(bullets[3]), "a backtick inside claim text must not survive into the bullet");
  assert.strictEqual((bullets[3].match(/`/g) || []).length % 2, 0, `the bullet's backticks must balance: ${bullets[3]}`);
  assert.ok(!bullets[3].includes("\n") && /win new customers\. The bar is/.test(bullets[3]),
    "a newline inside claim text must collapse — one bullet is one line");
}

// THE MUTATION CONTROL THE KICKOFF NAMES: unclassed = 2 must FLAG; unclassed = 0 must not.
function theUnclassedFlagFiresOnlyWhenNonZero() {
  const stamp = asOf(T1);
  const clean = renderJudgmentClasses(CENSUS(0), stamp);
  const drifted = renderJudgmentClasses(CENSUS(2), stamp);
  assert.notStrictEqual(clean, drifted, "the control is vacuous unless the two renders really differ");
  assert.ok(!FLAG.test(clean), "unclassed = 0 must NOT emit the FLAG line — at zero the row is not printed at all");
  assert.ok(!/unclassed/.test(clean.split("\n").filter(l => l.startsWith("|")).join("\n")),
    "unclassed = 0 must not appear as a table row either");
  assert.ok(FLAG.test(drifted), "unclassed = 2 MUST emit the FLAG line — after SES-84 a non-zero is drift");
  assert.ok(/FLAG: 2 live claims still/.test(drifted), "the FLAG must carry the count");
  assert.ok(/FLAG: 1 live claim still/.test(renderJudgmentClasses(CENSUS(1), stamp)),
    "singular at 1 — a number John reads is a sentence, not a template");
  // Through renderBlock() too, not only the helper: the flag has to reach the page.
  assert.ok(FLAG.test(renderBlock(FACTS({ census: CENSUS(2) }), T1)), "renderBlock() must surface the FLAG line");
  assert.ok(!FLAG.test(renderBlock(FACTS(), T1)), "renderBlock() must not surface a FLAG at zero");
}

function anAbsentCensusIsSaidNeverRenderedAsZeros() {
  const out = renderJudgmentClasses(undefined, asOf(T1));
  assert.ok(/was not read for this render/.test(out), "a render with no census must SAY so");
  assert.strictEqual(tableRows(out).length, 0, "an unread census must render no table — zeros it never measured are the stale-number defect");
  // Through renderBlock(): the SES-177b / SES-286c fixtures build facts with no census key.
  const block = renderBlock(FACTS({ census: undefined }), T1);
  assert.ok(/\*\*Judgment classes\*\*/.test(block) && /was not read for this render/.test(block),
    "renderBlock() must still carry the group and say the census was not read");
  assert.strictEqual(shaFromBlock(block), factsSha(FACTS({ census: undefined })).slice(0, 16),
    "the sha must still be computable with no census — the group is additive");
}

function aMissingClassRowIsAnHonestGap() {
  const out = renderJudgmentClasses(CENSUS(0).filter(r => r.judgment_class !== "P3 - Investor Value"), asOf(T1));
  const p3 = tableRows(out).find(l => l.startsWith("| `P3 - Investor Value` |"));
  assert.ok(p3, "a class missing from the view must still have a row — its absence is the finding");
  assert.ok(p3.endsWith("| — | — | — | — |"), `a missing class row must render em dashes, never invented zeros: ${p3}`);
  assert.ok(/root claim for P3: \*no proposed root claim\*\./.test(out), "a missing class has no newest root claim, and says so");
}

function theGroupSitsBetweenOpenDecisionsAndProvenance() {
  const block = renderBlock(FACTS(), T1);
  const at = s => block.indexOf(s);
  assert.ok(at("**Open decisions**") > -1 && at("**Judgment classes**") > -1 && at("*Provenance:") > -1,
    "renderBlock() must carry all three anchors");
  assert.ok(at("**Open decisions**") < at("**Judgment classes**"),
    "the Judgment classes group must come AFTER Open decisions (kickoff Task 3.2)");
  assert.ok(at("**Judgment classes**") < at("*Provenance:"),
    "the Judgment classes group must come BEFORE the provenance line");
  const stamp = asOf(T1);
  const line = block.split("\n").find(l => l.includes("**Judgment classes**"));
  assert.ok(line.includes(stamp), "the group's heading line must carry the rendered as-of stamp");
}

function theCensusMovesTheShaButAStampRefreshDoesNot() {
  const b1 = renderBlock(FACTS(), T1);
  const b2 = renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "the control is vacuous unless the two renders really differ");
  assert.strictEqual(shaFromBlock(b1), shaFromBlock(b2),
    "identical facts under different clocks must carry the SAME sha — otherwise --check fires on every stamp refresh");

  const ratifiedOne = CENSUS(0).map(r => r.judgment_class.startsWith("P2") ? { ...r, ratified: 1, proposed: 53 } : r);
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ census: ratifiedOne }), T1)), shaFromBlock(b1),
    "a claim being ratified must move the sha — ratification is the standing metric this block reports");
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ census: CENSUS(1) }), T1)), shaFromBlock(b1),
    "an unclassed row appearing must move the sha — drift must be reportable by --check");
  const newRoot = CENSUS(0).map(r => r.judgment_class.startsWith("P1") ? { ...r, newest_root_claim_ref: "VC-ROOT-009" } : r);
  assert.notStrictEqual(shaFromBlock(renderBlock(FACTS({ census: newRoot }), T1)), shaFromBlock(b1),
    "a new newest root claim must move the sha");
  const textOnly = CENSUS(0).map(r => r.judgment_class.startsWith("P1") ? { ...r, newest_root_claim: "reworded" } : r);
  assert.strictEqual(shaFromBlock(renderBlock(FACTS({ census: textOnly }), T1)), shaFromBlock(b1),
    "a text edit that keeps the same ref is not a census change and must not move the sha");
}

function theRendererReadsTheViewNotTheTable() {
  const src = read(RENDERER_REL);
  const clause = s => /judgment_class_census\?select=judgment_class,ord,ratified,proposed,rejected,total,newest_root_claim_ref,newest_root_claim&order=ord/.test(s);
  assert.ok(clause(src), "fetchFacts() must read judgment_class_census with its columns NAMED and order=ord");
  const mutated = src.split("judgment_class_census").join("vision_claims");
  assert.notStrictEqual(mutated, src, "control: the mutation changed nothing");
  assert.ok(!clause(mutated), "control: the clause still passes after its own mutation — it cannot fail");
  // And no count is re-derived from vision_claims rows in the renderer: the view is the one home.
  assert.ok(!/vision_claims\?select=/.test(src),
    "the renderer must not read vision_claims rows itself — the census has exactly one home, the view");
}

// ---------------------------------------------------------------------------
// Arm 2 — DOC: the committed brief carries the block.
// ---------------------------------------------------------------------------
function theCommittedBriefCarriesTheBlock() {
  const brief = read(BRIEF_REL);
  const [, body] = splitOnMarkers(brief);
  assert.ok(/\*\*Judgment classes\*\* — \*as of /.test(body),
    `${BRIEF_REL}'s generated block has no Judgment classes group — the re-render did not run`);
  for (const k of CLASS_ORDER) {
    assert.ok(new RegExp(`^\\| \`${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\` \\| \\d+ \\| \\d+ \\| \\d+ \\| \\d+ \\|$`, "m").test(body),
      `${BRIEF_REL} must carry the census row for ${k}`);
  }
  assert.ok(/^\| `neutral` \| \d+ \| \d+ \| \d+ \| \d+ \|$/m.test(body), `${BRIEF_REL} must carry the neutral row`);
  assert.ok(!FLAG.test(body),
    `${BRIEF_REL} carries the unclassed FLAG — a live claim was inserted without a classing decision; record one`);
  assert.ok(!/was not read for this render/.test(body),
    `${BRIEF_REL} was rendered without the census — re-run the renderer with a service key`);
}

// ---------------------------------------------------------------------------
// Arm 3 — LIVE.
// ---------------------------------------------------------------------------
async function rest(url, key, q) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  // The body is read ONCE: the failure text only on the failure arm (a template literal evaluates
  // its `await` eagerly, and a body read for the message leaves nothing for .json()).
  if (!res.ok) throw new Error(`REST ${q} → HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function theLiveCensusIsCompleteAndNothingIsUnclassed(url, key) {
  const census = await rest(url, key,
    "judgment_class_census?select=judgment_class,ord,ratified,proposed,rejected,total,newest_root_claim_ref&order=ord");
  assert.strictEqual(census.length, 6, `judgment_class_census must return exactly six rows, got ${census.length}`);
  assert.deepStrictEqual(census.map(r => r.judgment_class), [...CLASS_ORDER, "neutral", "unclassed"],
    "the six rows must be P1→P4, neutral, unclassed in that order");
  const un = census.find(r => r.judgment_class === "unclassed");
  assert.strictEqual(Number(un.total), 0, `unclassed.total must be 0 after SES-84, got ${un.total}`);

  // Complete, not merely ordered: the buckets partition the live rows.
  const live = await rest(url, key, "vision_claims?select=id,class_scope,judgment_class&superseded_by=is.null&limit=5000");
  assert.ok(live.length > 0, "vision_claims returned no live rows — the corpus is gone, not classed");
  const sum = census.reduce((n, r) => n + Number(r.total), 0);
  assert.strictEqual(sum, live.length, `the census totals (${sum}) must sum to the live row count (${live.length})`);
  const unclassed = live.filter(r => r.class_scope === "unclassed");
  assert.strictEqual(unclassed.length, 0, `${unclassed.length} live rows are still unclassed`);
  // The CHECK is the guarantee, but assert the invariant from the data too: classed ⇒ class set, neutral ⇒ NULL.
  assert.ok(live.every(r => (r.class_scope === "classed") === (r.judgment_class != null)),
    "every classed row must carry a judgment_class and every neutral row must not");
  for (const r of census) {
    assert.strictEqual(Number(r.ratified) + Number(r.proposed) + Number(r.rejected), Number(r.total),
      `${r.judgment_class}: ratified + proposed + rejected must equal total`);
  }
}

async function run(ctx = {}) {
  const results = [];

  theGroupRendersFourClassRowsPlusNeutralInOrder();
  theUnclassedFlagFiresOnlyWhenNonZero();
  anAbsentCensusIsSaidNeverRenderedAsZeros();
  aMissingClassRowIsAnHonestGap();
  theGroupSitsBetweenOpenDecisionsAndProvenance();
  theCensusMovesTheShaButAStampRefreshDoesNot();
  theRendererReadsTheViewNotTheTable();
  results.push("source-fixture-render-flag-control-sha");

  theCommittedBriefCarriesTheBlock();
  results.push("doc-committed-brief-carries-the-block");

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (judgment_class_census returns six rows, unclassed.total = 0, no live vision_claims " +
      "row is unclassed, and the bucket totals sum to the live row count)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or export " +
      "the two names read from public.runner_secrets. Measured over the MCP when this shipped " +
      "(2026-09-03): 306 live rows — P1 40, P2 60, P3 52, P4 41, neutral 113, unclassed 0 — under " +
      "classification decision 50baaef2 with 306 before-images.",
    );
    return results;
  }
  await theLiveCensusIsCompleteAndNothingIsUnclassed(url, key);
  results.push("live-census-complete-and-nothing-unclassed");
  return results;
}

selfRun(import.meta.url, run);
export default run;
