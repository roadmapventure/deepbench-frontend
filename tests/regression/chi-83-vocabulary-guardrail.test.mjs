// DeepBench v7.0.714 | tests/regression/chi-83-vocabulary-guardrail.test.mjs | CHI-83 -- one noun
// per object in every word a CHI user reads.
//
// CHI-82 shipped the screen side. The words that were left -- "thesis", "candidate", "hypothesis"
// -- are the MODEL'S own text, so no screen edit can reach them (docs/ARCHITECTURE.md §19n). CHI-83
// is the vocabulary constraint in Supabase: one guardrails-type skill_profiles row,
// `chi-vocabulary-guardrail`, attached to channel-intelligence and hypothesis-evaluation and scoped
// by traits.intent_allowlist to the five intents that actually write user text.
//
// TWO HALVES, split by what each can prove without credentials:
//
//   A. STATIC -- always runs, no network. The mirror docs/design/chi-83-vocabulary-guardrail.sql
//      carries the five allowlist slugs and the four guardrail strings VERBATIM, and names
//      `ci-routing-intent` on exactly one line: the NOT assertion that keeps it OUT. And
//      docs/ARCHITECTURE.md records the row, so a cold session finds it from the architecture doc
//      rather than from this test.
//   B. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the row, the two attachments,
//      and the only thing that finally matters: that api/prompt/db-assembly.js RENDERS the rule
//      into the assembled prompt for the intents it is allowlisted to, and renders NOTHING for the
//      one it is not. CHI-83 ships zero lines of code, so half A alone cannot fail if the row were
//      deleted -- a green half A on reverted data is the vacuous pass half B exists to prevent.
//
// THE DISCRIMINATOR IS THE NEGATIVE CASE, and it is the whole reason the allowlist exists. AGT-54
// measured a guardrail reaching ci-routing-intent skewing Marcus's five-way classification 3/3
// (docs/harvests/AGT-44.md). So half B does not only assert that the rule arrives on the ack intent
// -- it asserts it does NOT arrive on the routing intent, from the same script, in the same run.
// A test that only checked the positive branch would pass just as happily on an unscoped row, which
// is exactly the regression CHI-83 must never ship.
//
// BASELINE, measured on the unchanged tree at d691fb55 before T1 was applied, rather than reasoned
// about: marcus/ci-submission-ack-intent rendered `=== CONSTRAINTS & GUARDRAILS ===` 0 times and
// `Never write hypothesis` 0 times; priya/hyp-generation-intent rendered the section once (AGT-44's
// platform-language-guardrail) and `Never write hypothesis` 0 times; marcus/ci-routing-intent
// rendered neither. Half B is RED on every one of those numbers with the row absent.
//
// NO FIXTURE, NO WRITE. Every live assertion is a read or an assembly of stored rows; this test
// creates nothing and deletes nothing (pattern:76).

import assert from "assert";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQL_REL = "docs/design/chi-83-vocabulary-guardrail.sql";
const ARCH_REL = "docs/ARCHITECTURE.md";
const SLUG = "chi-vocabulary-guardrail";
const SECTION_HEADER = "=== CONSTRAINTS & GUARDRAILS ===";
const PINNED = "Never write hypothesis";

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// The five intents that write text a user reads. ci-routing-intent and both *-display-intent rows
// are deliberately absent: routing is a five-way classification (AGT-54), and the display intents
// drive tool calls and write no user text.
const ALLOWLIST = [
  "hyp-generation-intent",
  "hyp-hypothesis-test-intent",
  "ci-answer-intent",
  "ci-submission-ack-intent",
  "ci-resolution-ack-intent",
];

const EXCLUDED_INTENT = "ci-routing-intent";

// The four strings, in order, exactly as the kickoff's §4 words them. Pinned here so an edit to the
// live row that softens the prohibition has to change this file too.
const CLAUSES = [
  "One noun per object in every word the user reads: Theory (the explanation the user picks and tests), Forecast (the committed record created from a validated Theory), Analysis (your read on a question or article), News (source articles).",
  "Never write hypothesis, hypotheses, thesis, theses or candidate in any field the user reads. The object is a Theory; several are Theories.",
  "Field names such as hypotheses and extracted_hypothesis are internal: keep them exactly as the schema requires and never let those words reach the text you write.",
  "Nothing is a Forecast until the user creates one; a Theory under test stays a Theory.",
];

// ---------------------------------------------------------------------------------------------
// Half A -- STATIC: the mirror and the architecture record
// ---------------------------------------------------------------------------------------------
function halfA() {
  const results = [];
  const sql = read(SQL_REL);

  for (const slug of ALLOWLIST) {
    assert.ok(sql.includes(slug),
      `${SQL_REL} does not name the allowlisted intent "${slug}" -- the mirror no longer describes the row that shipped`);
  }
  results.push("mirror-carries-the-five-allowlist-slugs");

  for (const clause of CLAUSES) {
    assert.ok(sql.includes(clause),
      `${SQL_REL} is missing a guardrail string verbatim: "${clause.slice(0, 60)}..." -- a mirror that paraphrases the rule is not a mirror`);
  }
  results.push("mirror-carries-the-four-guardrail-strings-verbatim");

  // The exclusion, and the reason this check is a line check and not a substring check: the slug
  // MUST appear once (the assertion that keeps it out is the only proof the exclusion is enforced
  // at apply time), and it must appear NOWHERE else -- least of all inside traits.intent_allowlist.
  const lines = sql.split("\n");
  const hits = lines
    .map((text, i) => ({ text, n: i + 1 }))
    .filter(l => l.text.includes(EXCLUDED_INTENT));
  assert.strictEqual(hits.length, 1,
    `${SQL_REL} names ${EXCLUDED_INTENT} on ${hits.length} line(s) (${hits.map(h => h.n).join(", ")}), expected exactly 1 -- the NOT assertion that keeps it out of the allowlist`);
  assert.ok(/\bNOT\b/.test(hits[0].text),
    `${SQL_REL} line ${hits[0].n} names ${EXCLUDED_INTENT} outside a NOT assertion: ${hits[0].text.trim()}`);
  results.push("mirror-names-the-routing-intent-only-in-its-not-assertion");

  // Control: the ban above is only meaningful if the file names intents at all on code lines. The
  // allowlisted five are there (asserted above) -- so a file that simply stopped naming intents
  // cannot pass both checks.
  const allowlistLine = lines.find(l => l.includes("intent_allowlist") && l.includes(ALLOWLIST[0]));
  assert.ok(allowlistLine,
    `${SQL_REL} has no line carrying traits.intent_allowlist with ${ALLOWLIST[0]} -- the exclusion check above would be vacuous`);
  assert.ok(!allowlistLine.includes(EXCLUDED_INTENT),
    `${SQL_REL}'s intent_allowlist literal itself names ${EXCLUDED_INTENT}`);
  results.push("control-allowlist-literal-exists-and-excludes-routing");

  assert.ok(read(ARCH_REL).includes(SLUG),
    `${ARCH_REL} does not name ${SLUG} -- a cold session reading the architecture doc would not find the row CHI-83 shipped (pattern:92)`);
  results.push("architecture-records-the-row");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Half B -- LIVE: the row, the attachments, and the render
// ---------------------------------------------------------------------------------------------
function render(agent, capability, intent, task, env) {
  const r = spawnSync(process.execPath,
    [path.join(ROOT, "scripts", "agent-prompt.js"),
      `--agent=${agent}`, `--capability=${capability}`, `--intent=${intent}`, `--task=${task}`],
    { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  assert.strictEqual(r.status, 0,
    `agent-prompt.js --agent=${agent} --intent=${intent} exited ${r.status}: ${(r.stderr || "").slice(0, 400)}`);
  return r.stdout || "";
}

const countOf = (text, token) => text.split(token).length - 1;

async function halfB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live half (the row, the two attachments, and the three renders)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`. CHI-83 ships no code, so " +
      "the static half above cannot fail if the row were deleted -- this half is the only thing that " +
      "reads it.");
    return [];
  }
  const results = [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const sRes = await fetch(`${url}/rest/v1/skill_profiles?slug=eq.${SLUG}&select=*`, { headers });
  assert.ok(sRes.ok, `skill_profiles read failed: HTTP ${sRes.status}`);
  const rows = await sRes.json();
  assert.strictEqual(rows.length, 1, `skill_profiles holds ${rows.length} rows for ${SLUG}, expected 1`);
  const row = rows[0];
  assert.strictEqual(row.skill_type_slug, "guardrails",
    `${SLUG}.skill_type_slug is '${row.skill_type_slug}' -- only a guardrails-type Skill renders as a ${SECTION_HEADER} section`);
  assert.ok(Array.isArray(row.guardrails),
    `${SLUG}.guardrails is ${JSON.stringify(row.guardrails)?.slice(0, 60)} -- it must be a jsonb ARRAY of strings; an object is JSON.stringify'd into the prompt as raw JSON the model reads as machinery`);
  assert.deepStrictEqual(row.guardrails, CLAUSES,
    `${SLUG}.guardrails is not the four strings CHI-83 shipped, in order: ${JSON.stringify(row.guardrails)}`);
  results.push("live-row-carries-the-four-strings-in-the-guardrails-column");

  assert.deepStrictEqual([...(row.traits?.intent_allowlist || [])].sort(), [...ALLOWLIST].sort(),
    `${SLUG}.traits.intent_allowlist is ${JSON.stringify(row.traits?.intent_allowlist)}, expected exactly the five intents that write user text`);
  results.push("live-allowlist-is-exactly-the-five");

  const aRes = await fetch(`${url}/rest/v1/capability_skill_profiles?skill_profile_slug=eq.${SLUG}&select=capability_slug,is_required`, { headers });
  assert.ok(aRes.ok, `capability_skill_profiles read failed: HTTP ${aRes.status}`);
  const links = await aRes.json();
  assert.deepStrictEqual(links.map(l => l.capability_slug).sort(), ["channel-intelligence", "hypothesis-evaluation"],
    `${SLUG} is attached to ${JSON.stringify(links.map(l => l.capability_slug))}, expected exactly channel-intelligence and hypothesis-evaluation`);
  for (const l of links) {
    assert.strictEqual(l.is_required, true, `${SLUG} on '${l.capability_slug}' is not is_required -- the vocabulary is not optional`);
  }
  results.push("live-attached-to-exactly-the-two-capabilities");

  // The render is the whole point: a row nothing assembles is a row nobody reads.
  const env = { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key };

  const ack = render("marcus", "channel-intelligence", "ci-submission-ack-intent", '{"theory_text":"x"}', env);
  assert.ok(countOf(ack, SECTION_HEADER) >= 1,
    `the marcus/ci-submission-ack-intent render carries no ${SECTION_HEADER} section (it was 0 before CHI-83 shipped)`);
  assert.ok(ack.includes(PINNED),
    `the marcus/ci-submission-ack-intent render does not carry "${PINNED}" -- the rule reaches the ack the user reads through nothing`);
  results.push("render-ack-intent-carries-the-rule");

  // THE DISCRIMINATOR. Same script, same agent, same capability -- only the intent moves.
  const routing = render("marcus", "channel-intelligence", EXCLUDED_INTENT, '{"message":"x"}', env);
  assert.strictEqual(countOf(routing, PINNED), 0,
    `the marcus/${EXCLUDED_INTENT} render carries "${PINNED}" -- the guardrail reached the five-way routing classification, which AGT-54 measured skewing it 3/3`);
  results.push("render-routing-intent-does-not");

  const priya = render("priya", "hypothesis-evaluation", "hyp-generation-intent",
    '{"flagged_question":"q","flagged_answer":"a","review_reason":"r"}', env);
  assert.ok(priya.includes(PINNED),
    `the priya/hyp-generation-intent render does not carry "${PINNED}" -- hypothesis-evaluation is attached but the rule did not arrive`);
  // AGT-44's own standard must still arrive on the same call: CHI-83 adds a guardrail, it never
  // displaces one (pattern:166).
  assert.ok(priya.includes("VP of Channel Sales"),
    `the priya/hyp-generation-intent render lost "VP of Channel Sales" -- CHI-83's row displaced AGT-44's platform-language-guardrail instead of joining it`);
  results.push("render-hypothesis-evaluation-carries-both-guardrails");

  console.log(`  [CHI-83] renders: ack section x${countOf(ack, SECTION_HEADER)} / "${PINNED}" x${countOf(ack, PINNED)}; ` +
    `${EXCLUDED_INTENT} "${PINNED}" x${countOf(routing, PINNED)}; priya "${PINNED}" x${countOf(priya, PINNED)}, ` +
    `VP of Channel Sales x${countOf(priya, "VP of Channel Sales")}`);
  return results;
}

async function run() {
  const results = [];
  results.push(...halfA());
  results.push(...(await halfB()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
