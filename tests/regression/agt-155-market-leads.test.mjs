// DeepBench v7.0.691 | tests/regression/agt-155-market-leads.test.mjs | AGT-155 remainder -- the
// leads instruction REACHES THE RENDER. v7.0.683 shipped the inbox, the render that carries the
// leads and the validator that grades a review; the only place that ASKED for a review was the
// Wednesday routine prompt, which update_trigger refuses an agent on this account -- so the live
// render reached a sub-agent with leads and no instruction (0 lead_reviews live). Parts (e)-(g)
// below are that gap closed: the Skill-row mirror, the drift check's fifth routine, and the live
// proof that the render now carries the instruction.
// DeepBench v7.0.683 | tests/regression/agt-155-market-leads.test.mjs | AGT-155
//
// FEATURE: AGT-155 -- the competitor leads inbox. public.market_leads is the one table both agent
// lanes touch, and each touches it in one direction: the personal lane FILES a lead built by code
// from a job its answer marked `competitor: true` (scripts/personal-agent.js), and the product lane
// REVIEWS it through lead_reviews[] (scripts/market-agent.js), which PATCHes three columns.
//
// PARTS, matching the kickoff's Task 5:
//   (a) STATIC -- leadsFromAnswer() derives exactly one row from a two-job fixture, its key set IS
//       LEAD_COLUMNS, and the fit, the legit verdict and the act call have no route into it;
//       validateLeads() refuses a tracking URL and a job with no competitor_why.
//   (b) STATIC -- validateMarketAnswer() refuses a lead review with status `maybe`, a 401-character
//       note, and a `confirmed` verdict that writes no competitor record; `rejected` is accepted,
//       and an answer with no lead_reviews at all stays valid (the field is optional).
//   (c) STATIC -- docs/design/agt-155-market-leads.sql carries the status check constraint and the
//       `revoke all` line, and never names an agents.id outside a `--` comment line.
//   (e) STATIC -- docs/design/agt-155-competitors-intent-leads.sql (the mirror of migration
//       `agt155_competitors_intent_leads`) carries the schema patch, the one-row WHERE and the
//       before-image insert, and names no agent and no other agent's private store on a code line.
//   (f) CHECK -- scripts/check-routine-prompt.js knows `market`, carrying the routine's real trigger
//       id; the runbook block compares equal to itself (exit-0 path), and a copy with the COMPETITOR
//       LEADS paragraph removed produces exactly ONE finding that names it.
//   (g) LIVE, inside (d) -- the pmm-competitors render carries `lead_reviews` at least twice and the
//       `COMPETITOR LEADS:` instruction; the live nl-competitors-intent row carries the instruction
//       and the OPTIONAL lead_reviews output property (in schema.properties, not schema.required).
//
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- the anon key cannot read the
//       table while the service key can; a jerry --write files exactly 1 lead (12 columns, status
//       new); a nathan --render for pmm-competitors carries it; a nathan --write rejects it with a
//       note and a reviewed_at; a `confirmed` answer with no competitor record exits 2 and leaves
//       the row untouched. Every fixture row is tagged with this run's session_name and deleted in
//       a finally.
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-155-market-leads.test.mjs`,
// unchanged tree `966b4c3a`):
//   baseline-red-set: these paths do not exist, so no baseline was measured:
//       tests/regression/agt-155-market-leads.test.mjs
// New file: the whole file is the red set. On `966b4c3a` leadsFromAnswer is undefined, the SQL seed
// is absent, lead_reviews is ignored by the validator, and the anon read 404s with PGRST205 because
// the table itself does not exist -- so every part below fails if nothing changed.
//
// A SECOND DELIBERATE DEPARTURE, v7.0.691, stated rather than quietly dropped. Task 4(e) asks that
// the mirror carry no `career_records` outside a `--` line. The mirror's DO block is required by the
// kickoff's own §4 to assert `method NOT ILIKE '%career_records%'` -- a PROHIBITION, on a code line,
// spelling the very token. Both cannot hold literally. The check below keeps the intent exactly and
// closes no hole: the single line carrying `method NOT ILIKE '%career_records%'` is excluded, and
// EXACTLY ONE such line must exist, so the exception cannot be widened to smuggle anything; every
// other code line is held to the full ban, and a control proves the ban still has teeth.
//
// ONE DELIBERATE DEPARTURE FROM THE KICKOFF'S WORDING, stated rather than quietly dropped. Task 5(a)
// asks that the derived row's JSON hold none of `4000000009`, `3/4`, `watch`, `legit`. The first of
// those is the job id, and the fixture's own canonical posting URL IS
// `https://www.linkedin.com/jobs/view/4000000009/` -- the id is the public URL. Asserting its total
// absence is only satisfiable by dropping the URL the table requires NOT NULL. So the assertion is
// split, which keeps the intent exactly: the job id may appear in `public_url` AND NOWHERE ELSE
// (asserted over the row with public_url removed), and the fit, the verdict and the act call appear
// nowhere at all (asserted over the whole row).
//
// FIXTURES ARE SYNTHETIC: no real company, no real posting, no personal fact. "ZZ Fixture Vendor"
// and job id 4000000009 are invented for this test.

import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ROUTINES, extractBlock, comparePrompt } from "../../scripts/check-routine-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PERSONAL_REL = "scripts/personal-agent.js";
const MARKET_REL = "scripts/market-agent.js";
const SQL_REL = "docs/design/agt-155-market-leads.sql";
const MIRROR_REL = "docs/design/agt-155-competitors-intent-leads.sql";
const RUNBOOK_REL = "docs/runbooks/market-agent.md";
const SKILL_SLUG = "nl-competitors-intent";
const PERSONAL = path.join(ROOT, PERSONAL_REL);
const MARKET = path.join(ROOT, MARKET_REL);
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const RUN = randomUUID().slice(0, 8);

const loadPersonal = () => import(pathToFileURL(PERSONAL).href);
const loadMarket = () => import(pathToFileURL(MARKET).href);

// The two-job fixture the kickoff names. Job one is a competitor; job two is not.
const JOB_ID = "4000000009";
const COMPANY = "ZZ Fixture Vendor";
const JOBS = () => [
  {
    job_id: JOB_ID, company: COMPANY, title: "x",
    url: `https://www.linkedin.com/jobs/view/${JOB_ID}/`,
    fit: "3/4", legit: "legit", act: "watch",
    competitor: true, competitor_why: "synthetic overlap",
  },
  { company: "B", url: "https://example.com/", competitor: false },
];

// ---------------------------------------------------------------------------------------------
// Part (a) -- STATIC: the row is built by code, from four named fields, and nothing else rides along
// ---------------------------------------------------------------------------------------------
async function partA() {
  const { leadsFromAnswer, validateLeads, LEAD_COLUMNS, validateAnswer } = await loadPersonal();
  const results = [];

  const answer = { records_to_write: [], jobs: JOBS() };
  const leads = leadsFromAnswer(answer, "career-posting-review", "2026-09-28", `agt-155-${RUN}`);
  assert.strictEqual(leads.length, 1, `leadsFromAnswer derived ${leads.length} leads from 2 jobs, expected 1 (only the competitor)`);
  results.push("one-lead-per-competitor-job");

  assert.deepStrictEqual(Object.keys(leads[0]), LEAD_COLUMNS,
    `the lead's keys are not LEAD_COLUMNS in order: ${JSON.stringify(Object.keys(leads[0]))}`);
  assert.strictEqual(LEAD_COLUMNS.length, 8, `LEAD_COLUMNS has ${LEAD_COLUMNS.length} keys, expected 8`);
  results.push("row-keys-are-lead-columns");

  assert.strictEqual(leads[0].company, COMPANY, "the lead did not take the job's company");
  assert.strictEqual(leads[0].overlap_with_deepbench, "synthetic overlap", "the lead did not take competitor_why as the overlap");
  assert.strictEqual(leads[0].what_they_sell, null, "what_they_sell is not null when the job carries none");
  assert.strictEqual(leads[0].status, "new", "a filed lead does not start at status new");
  results.push("four-named-fields-copied");

  // The carry-along check, split for the reason the header states.
  const { public_url, ...withoutUrl } = leads[0];
  const sansUrl = JSON.stringify(withoutUrl);
  for (const leaked of [JOB_ID, "3/4", "watch", "legit", '"title"']) {
    assert.ok(!sansUrl.includes(leaked),
      `the lead carries "${leaked}" outside public_url -- only four named job fields may reach the row: ${sansUrl}`);
  }
  const whole = JSON.stringify(leads[0]);
  for (const leaked of ["3/4", "watch", "legit"]) {
    assert.ok(!whole.includes(leaked), `the lead's JSON carries "${leaked}": ${whole}`);
  }
  assert.ok(public_url.includes(JOB_ID), "control premise: the fixture's public url does not carry the job id, so the split assertion proves nothing");
  results.push("no-fit-verdict-or-act-reaches-the-row");

  // validateLeads refuses a tracking URL and a job with no competitor_why.
  const tracking = validateLeads([{
    company: COMPANY, overlap_with_deepbench: "synthetic overlap",
    public_url: "https://www.linkedin.com/comm/jobs/view/1/?trackingId=abc",
  }]);
  assert.ok(tracking.error && !tracking.ok, `validateLeads accepted a tracking url: ${JSON.stringify(tracking)}`);
  results.push("validate-leads-refuses-tracking-url");

  const noWhy = validateLeads(leadsFromAnswer({
    jobs: [{ company: COMPANY, url: "https://example.com/jobs/1", competitor: true }],
  }, "career-posting-review", "2026-09-28", null));
  assert.ok(noWhy.error && !noWhy.ok, `validateLeads accepted a lead with no competitor_why: ${JSON.stringify(noWhy)}`);
  results.push("validate-leads-refuses-missing-competitor-why");

  // Discrimination: a canonical url with none of the three tracking forms must still be accepted,
  // so the refusals above are about the tracking form and not about urls in general.
  const clean = validateLeads(leads);
  assert.ok(clean.ok && !clean.error, `validateLeads refused the canonical fixture lead: ${JSON.stringify(clean)}`);
  results.push("control-canonical-url-accepted");

  // validateAnswer is the gate --write actually calls, so the leads check has to be wired into it.
  const wired = validateAnswer({
    records_to_write: [],
    jobs: [{ company: COMPANY, url: "https://www.linkedin.com/comm/jobs/view/1/?trackingId=abc", competitor: true, competitor_why: "w" }],
  });
  assert.ok(wired.error && !wired.ok, `validateAnswer accepted an answer whose lead carries a tracking url: ${JSON.stringify(wired)}`);
  const stillValid = validateAnswer({ records_to_write: [{ kind: "log", title: "t" }] });
  assert.ok(stillValid.ok && !stillValid.error, `validateAnswer refused a leadless answer: ${JSON.stringify(stillValid)}`);
  results.push("validate-answer-calls-validate-leads");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (b) -- STATIC: the review side of the validator
// ---------------------------------------------------------------------------------------------
const CAP = "pmm-competitors";
const reviewAnswer = (over = {}) => ({ records_to_write: [], napkin_notes: [], napkin_left: [], ...over });
const COMPETITOR_RECORD = {
  kind: "competitor", title: "ZZ Fixture Vendor", status: "draft",
  data: { copy_tests: [{
    competitor: "ZZ Fixture Vendor", why_not: "Synthetic reason.", evidence: ["synthetic-source-1"],
    moat_type: "data", time_to_copy_months: 18, verdict: "durable",
  }] },
};

async function partB() {
  const { validateMarketAnswer, LEAD_READERS } = await loadMarket();
  const results = [];

  assert.deepStrictEqual(LEAD_READERS, ["pmm-competitors"], `LEAD_READERS is ${JSON.stringify(LEAD_READERS)}, expected exactly the competitors capability`);
  results.push("lead-readers-is-pmm-competitors");

  const refusals = [
    ["status-maybe", reviewAnswer({ lead_reviews: [{ id: "syn-1", status: "maybe", note: "n" }] })],
    ["note-401-chars", reviewAnswer({ lead_reviews: [{ id: "syn-1", status: "rejected", note: "x".repeat(401) }] })],
    ["note-missing", reviewAnswer({ lead_reviews: [{ id: "syn-1", status: "rejected" }] })],
    ["no-lead-id", reviewAnswer({ lead_reviews: [{ status: "rejected", note: "n" }] })],
    ["confirmed-writes-nothing", reviewAnswer({ lead_reviews: [{ id: "syn-1", status: "confirmed", note: "n" }] })],
  ];
  for (const [name, answer] of refusals) {
    const r = validateMarketAnswer(answer, CAP);
    assert.ok(r.error && !r.ok, `validateMarketAnswer accepted ${name}: ${JSON.stringify(r)}`);
    results.push(`validate-refuses-${name}`);
  }

  const rejected = validateMarketAnswer(reviewAnswer({ lead_reviews: [{ id: "syn-1", status: "rejected", note: "synthetic: not a competitor" }] }), CAP);
  assert.ok(rejected.ok && !rejected.error, `validateMarketAnswer refused a plain rejection: ${JSON.stringify(rejected)}`);
  results.push("validate-accepts-rejected-review");

  // The pair that makes the `confirmed` rule discriminating rather than a blanket refusal of
  // `confirmed`: the same review is accepted the moment the answer writes the competitor record.
  const confirmedBacked = validateMarketAnswer(reviewAnswer({
    records_to_write: [COMPETITOR_RECORD],
    lead_reviews: [{ id: "syn-1", status: "confirmed", note: "synthetic: verified at its public url" }],
  }), CAP);
  assert.ok(confirmedBacked.ok && !confirmedBacked.error,
    `validateMarketAnswer refused a confirmed review backed by a competitor record: ${JSON.stringify(confirmedBacked)}`);
  results.push("validate-accepts-confirmed-with-competitor-record");

  // Optional by construction: an answer with no lead_reviews key at all -- every answer written
  // before AGT-155, and every capability that reads no leads -- is still valid.
  const none = validateMarketAnswer(reviewAnswer(), CAP);
  assert.ok(none.ok && !none.error, `validateMarketAnswer refused an answer with no lead_reviews: ${JSON.stringify(none)}`);
  results.push("lead-reviews-is-optional");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (c) -- STATIC: the migration seed
// ---------------------------------------------------------------------------------------------
function partC() {
  const results = [];
  assert.ok(fs.existsSync(path.join(ROOT, SQL_REL)), `${SQL_REL} does not exist`);
  const sql = read(SQL_REL);

  assert.ok(/check \(status in \('new','confirmed','rejected'\)\)/.test(sql),
    `${SQL_REL} carries no status check constraint over new/confirmed/rejected`);
  results.push("sql-has-status-check");

  assert.ok(/^\s*revoke all on public\.market_leads from public, anon, authenticated;/m.test(sql),
    `${SQL_REL} does not revoke all from the public roles`);
  assert.ok(/grant select, insert, update, delete on public\.market_leads to service_role;/.test(sql),
    `${SQL_REL} does not grant the service role its writes`);
  results.push("sql-revokes-public-and-grants-service-role");

  // The gate asserts BOTH directions -- a denial and a still-working read -- because a migration's
  // success flag is not evidence (.claude/rules/supabase-column-grants.md).
  assert.ok(/has_table_privilege\('anon', 'public\.market_leads', 'SELECT'\)/.test(sql),
    `${SQL_REL}'s DO block never asserts the anon denial`);
  assert.ok(/has_table_privilege\('service_role', 'public\.market_leads', 'INSERT'\)/.test(sql),
    `${SQL_REL}'s DO block never asserts the service role still writes`);
  results.push("sql-do-block-asserts-both-directions");

  // Rule #1: a column may hold a capability slug (data), never an agent identifier.
  const codeLines = sql.split("\n").filter(l => !l.trim().startsWith("--"));
  const named = codeLines.filter(l => /agents\.id/.test(l));
  assert.strictEqual(named.length, 0, `${SQL_REL} names agents.id outside a -- comment line: ${JSON.stringify(named)}`);
  const control = sql.replace("  company text not null,", "  company text not null,\n  filed_by text not null, -- agents.id\n");
  assert.notStrictEqual(control, sql, "control setup failed: the company column line was not found verbatim");
  assert.ok(control.split("\n").filter(l => !l.trim().startsWith("--")).some(l => /agents\.id/.test(l)),
    "control: a copy with agents.id spliced onto a code line still passes -- the check does not discriminate");
  results.push("sql-names-no-agent-id");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (d) -- LIVE: the grant, the file, the render, the review, the refusal
// ---------------------------------------------------------------------------------------------
function runScript(script, args, env) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

async function partD() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live arm (anon denial, the jerry file, the nathan render, the nathan review, the refused confirm)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Run with " +
      "`node --env-file-if-exists=.env.local tests/regression/run-all.js`. Measured with the MCP when " +
      "this shipped (2026-09-28): public.market_leads came up relacl {postgres, service_role}, RLS off, " +
      "0 role_table_grants rows for anon/authenticated, 12 columns, and the migration's own DO block " +
      "asserted the anon denial and the service-role INSERT before it committed.");
    return [];
  }
  const results = [];
  const base = url.replace(/\/+$/, "");
  const hdr = { apikey: key, Authorization: `Bearer ${key}` };
  const env = { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key };
  const session = `agt-155-regression-${RUN}`;
  const leadsTagged = async () => {
    const r = await fetch(`${base}/rest/v1/market_leads?session_name=eq.${session}&select=*`, { headers: hdr });
    if (!r.ok) assert.fail(`GET market_leads -> HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  // --- the grant pair: the anon key is denied, the service key is not.
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    notRun("the anon-denial half of the grant pair",
      "no SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY in env. The service-key read below still runs, and " +
      "the migration's DO block asserted has_table_privilege('anon', 'public.market_leads', 'SELECT') " +
      "false before it committed.");
  } else {
    const denied = await fetch(`${base}/rest/v1/market_leads?select=id&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    const body = await denied.text();
    assert.ok(denied.status >= 400, `the anon key read market_leads (HTTP ${denied.status}) -- the table is publicly readable`);
    assert.ok(!body.includes("PGRST205"),
      `the anon read failed with PGRST205 (table not in the schema cache), which is an absent table, not a denied one: ${body}`);
    results.push("anon-key-denied-not-merely-absent");
  }
  const served = await fetch(`${base}/rest/v1/market_leads?select=id&limit=1`, { headers: hdr });
  assert.strictEqual(served.status, 200, `the service key could not read market_leads: HTTP ${served.status} ${await served.text()}`);
  results.push("service-key-still-reads");

  // --- before-image: this run's tag holds nothing in either table.
  const before = await leadsTagged();
  console.log(`  [AGT-155] before-image for session_name=${session}: ${JSON.stringify(before)}`);
  assert.strictEqual(before.length, 0, `control premise: rows already tagged ${session}`);

  const outFile = path.join(os.tmpdir(), `agt-155-render-${RUN}.md`);
  let leadId = null;
  try {
    // --- the personal lane files the lead.
    const fileAnswer = { summary: "agt-155 synthetic fixture run", records_to_write: [], jobs: JOBS() };
    const filed = runScript(PERSONAL, ["--write", "--agent=jerry", "--capability=career-posting-review",
      `--answer=${JSON.stringify(fileAnswer)}`, `--session-name=${session}`], env);
    assert.strictEqual(filed.status, 0, `--write (file) exited ${filed.status}: ${filed.stderr.trim()}`);
    const fout = JSON.parse(filed.stdout.trim());
    assert.strictEqual(fout.leads, 1, `--write reported ${fout.leads} leads, expected exactly 1`);
    results.push("personal-write-files-one-lead");

    const rows = await leadsTagged();
    assert.strictEqual(rows.length, 1, `read back ${rows.length} leads by session_name, expected 1`);
    const row = rows[0];
    leadId = row.id;
    assert.strictEqual(Object.keys(row).length, 12, `the stored lead has ${Object.keys(row).length} columns, expected 12`);
    assert.strictEqual(row.status, "new", `the filed lead landed at status ${row.status}, expected new`);
    assert.strictEqual(row.company, COMPANY, "the stored lead is not the fixture's company");
    assert.strictEqual(row.source_capability, "career-posting-review", "the stored lead does not name the capability that filed it");
    assert.strictEqual(row.reviewed_at, null, "a freshly filed lead already carries a reviewed_at");
    results.push("stored-lead-has-twelve-columns-status-new");

    // --- the product lane is handed it.
    const rendered = runScript(MARKET, ["--render", "--agent=nathan", `--capability=${CAP}`, `--out=${outFile}`, "--json"], env);
    assert.strictEqual(rendered.status, 0, `--render exited ${rendered.status}: ${rendered.stderr.trim()}`);
    const renderText = fs.readFileSync(outFile, "utf8");

    // --- (g) the instruction the lead needs, in the same render that carries the lead. Before
    // v7.0.691 this render carried the lead and NOTHING that asked for a review: the only such text
    // lived in a routine prompt update_trigger refuses an agent, so every scheduled run handed a
    // sub-agent leads it had no contract to answer. `>= 2` is the discriminator -- the instruction
    // names lead_reviews as the field AND as the empty answer, so a single stray mention (a column
    // list, a leftover heading) does not pass for the instruction.
    const lrInRender = (renderText.match(/lead_reviews/g) ?? []).length;
    assert.ok(lrInRender >= 2,
      `the ${CAP} render names lead_reviews ${lrInRender} time(s), expected >= 2 -- the review instruction did not reach the render`);
    assert.ok(renderText.includes("COMPETITOR LEADS:"),
      `the ${CAP} render carries no "COMPETITOR LEADS:" instruction, so the leads below it are unasked-for`);
    results.push("render-carries-the-leads-review-instruction");

    const skillRes = await fetch(
      `${base}/rest/v1/skill_profiles?slug=eq.${SKILL_SLUG}&select=method,traits`, { headers: hdr });
    // The body is read ONCE and then asserted on: a `await res.text()` inside an assert message is
    // evaluated eagerly, consumes the stream, and makes the following .json() throw on the green path.
    const skillBody = await skillRes.text();
    assert.strictEqual(skillRes.status, 200,
      `GET skill_profiles ${SKILL_SLUG} -> HTTP ${skillRes.status} ${skillBody}`);
    const [skill] = JSON.parse(skillBody);
    assert.ok(skill, `${SKILL_SLUG} is not a live skill_profiles row, so the render's instruction has no home`);
    assert.ok(String(skill.method).includes("lead_reviews"),
      `the live ${SKILL_SLUG} method carries no lead_reviews instruction`);
    assert.deepStrictEqual(skill.traits?.schema?.properties?.lead_reviews?.items?.required,
      ["id", "status", "note"],
      `the live lead_reviews item contract is ${JSON.stringify(skill.traits?.schema?.properties?.lead_reviews?.items?.required)}`);
    // OPTIONAL by design (designer's call iii): every capability that reads no leads, and every
    // answer written before AGT-155, stays valid. In schema.properties, never in schema.required.
    assert.ok(!(skill.traits?.schema?.required ?? []).includes("lead_reviews"),
      `lead_reviews is listed in schema.required: ${JSON.stringify(skill.traits?.schema?.required)} -- it must stay optional`);
    results.push("live-skill-row-carries-the-optional-lead-reviews-contract");

    assert.ok(renderText.includes(COMPANY), `the ${CAP} render does not carry the open lead's company`);
    assert.ok(renderText.includes(leadId), `the ${CAP} render does not carry the lead's id, so no review can name it`);
    results.push("lead-reader-render-carries-the-open-lead");

    // --- the refused confirm runs BEFORE the accepted rejection, so "the row is unchanged" is
    // measured against status new rather than against a row this test already reviewed.
    const confirming = { records_to_write: [], napkin_notes: [], napkin_left: [],
      lead_reviews: [{ id: leadId, status: "confirmed", note: "synthetic: confirmed with nothing behind it" }] };
    const refused = runScript(MARKET, ["--write", "--agent=nathan", `--capability=${CAP}`,
      `--answer=${JSON.stringify(confirming)}`, `--session-name=${session}`], env);
    assert.strictEqual(refused.status, 2, `--write confirming with no competitor record exited ${refused.status}, expected 2`);
    const untouched = (await leadsTagged())[0];
    assert.strictEqual(untouched.status, "new", `a refused --write still moved the lead to ${untouched.status}`);
    assert.strictEqual(untouched.reviewed_at, null, "a refused --write still stamped reviewed_at");
    results.push("confirm-without-competitor-record-exits-2-changes-nothing");

    // --- the accepted rejection.
    const note = "synthetic: not a competitor";
    const reviewing = { records_to_write: [], napkin_notes: [], napkin_left: [],
      lead_reviews: [{ id: leadId, status: "rejected", note }] };
    const reviewed = runScript(MARKET, ["--write", "--agent=nathan", `--capability=${CAP}`,
      `--answer=${JSON.stringify(reviewing)}`, `--session-name=${session}`], env);
    assert.strictEqual(reviewed.status, 0, `--write (review) exited ${reviewed.status}: ${reviewed.stderr.trim()}`);
    const rout = JSON.parse(reviewed.stdout.trim());
    assert.strictEqual(rout.leads_reviewed, 1, `--write reported ${rout.leads_reviewed} leads reviewed, expected 1`);
    assert.strictEqual(rout.inserted, 0, `--write inserted ${rout.inserted} market records, expected 0 for a pure rejection`);
    results.push("market-write-reviews-one-lead");

    const after = (await leadsTagged())[0];
    assert.strictEqual(after.status, "rejected", `the reviewed lead is at status ${after.status}, expected rejected`);
    assert.strictEqual(after.reviewer_note, note, `the reviewer note is ${JSON.stringify(after.reviewer_note)}`);
    assert.ok(after.reviewed_at, "the reviewed lead carries no reviewed_at");
    assert.strictEqual(after.company, COMPANY, "the review changed a column it must not touch");
    assert.strictEqual(after.public_url, row.public_url, "the review changed the lead's public url");
    results.push("review-writes-exactly-the-three-columns");
  } finally {
    fs.rmSync(outFile, { force: true });
    for (const table of ["market_leads", "career_records"]) {
      const gone = await fetch(`${base}/rest/v1/${table}?session_name=eq.${session}`, { method: "DELETE", headers: hdr });
      if (!gone.ok) console.log(`  [AGT-155] WARNING: ${table} cleanup failed (HTTP ${gone.status}) -- delete session_name=${session} by hand`);
    }
    console.log(`  [AGT-155] after-image for session_name=${session}: ${JSON.stringify(await leadsTagged())} (lead ${leadId})`);
  }
  assert.strictEqual((await leadsTagged()).length, 0, "fixture leads survived the cleanup");
  results.push("fixture-rows-deleted");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (e) -- STATIC: the Skill-row mirror
// ---------------------------------------------------------------------------------------------
// The load-bearing spans of docs/design/agt-155-competitors-intent-leads.sql. Each one is the
// difference between the migration doing its job and doing damage: the jsonb_set PATH touches
// properties only (a path ending `{schema,required}` would make lead_reviews mandatory for every
// answer ever written); the WHERE pins the single row (an unpinned UPDATE rewrites every Skill on
// the platform); the before-image span is `to_jsonb(s.*)` of the row, which is the only thing that
// makes the change reversible.
const MIRROR_SPANS = [
  "jsonb_set(traits, '{schema,properties,lead_reviews}'",
  "WHERE slug = 'nl-competitors-intent'",
  "'skill_profiles', s.id::text, to_jsonb(s.*)",
];
// The one prohibition line the ban below excludes, for the reason the header states.
const GUARD_LINE = "method NOT ILIKE '%career_records%'";
const BANNED = [["agents.id", /agents\.id/], ["career_records", /career_records/], ["jerry", /\bjerry\b/i]];
const bannedOn = sql => {
  const code = sql.split("\n").filter(l => !l.trim().startsWith("--") && !l.includes(GUARD_LINE));
  return BANNED.flatMap(([name, re]) => code.filter(l => re.test(l)).map(l => `${name}: ${l.trim()}`));
};

function partE() {
  const results = [];
  assert.ok(fs.existsSync(path.join(ROOT, MIRROR_REL)), `${MIRROR_REL} does not exist`);
  const sql = read(MIRROR_REL);

  for (const span of MIRROR_SPANS) {
    assert.ok(sql.includes(span), `${MIRROR_REL} does not carry ${JSON.stringify(span)}`);
  }
  results.push("mirror-carries-the-three-load-bearing-spans");

  // Rule #1 (§19d/§19e): a Skill row may name a table (data), never another agent or that agent's
  // private store. The mirror is what a reviewer reads instead of the database, so the ban is on it.
  const guards = sql.split("\n").filter(l => !l.trim().startsWith("--") && l.includes(GUARD_LINE));
  assert.strictEqual(guards.length, 1,
    `${MIRROR_REL} has ${guards.length} code lines carrying the ${JSON.stringify(GUARD_LINE)} guard, expected exactly 1 -- the ban's one exception may not be widened`);
  assert.deepStrictEqual(bannedOn(sql), [],
    `${MIRROR_REL} names an agent or another agent's private store on a code line`);

  // Control: the same filter over a copy with all three tokens spliced onto one real code line must
  // catch all three, so the empty result above is a measurement and not a check that cannot fire.
  const control = sql.replace("COMMIT;", "select 'agents.id', 'career_records', 'jerry';\nCOMMIT;");
  assert.notStrictEqual(control, sql, "control setup failed: the COMMIT; line was not found verbatim");
  assert.strictEqual(bannedOn(control).length, 3,
    `control: a copy naming all three tokens on a code line is caught ${bannedOn(control).length} time(s), expected 3 -- the ban does not discriminate`);
  results.push("mirror-names-no-agent-or-private-store");
  return results;
}

// ---------------------------------------------------------------------------------------------
// Part (f) -- CHECK: the drift check's fifth routine
// ---------------------------------------------------------------------------------------------
function partF() {
  const results = [];
  assert.strictEqual(ROUTINES.market?.id, "trig_015K3zgtnMztuNritHxC6uSW",
    `ROUTINES.market.id is ${JSON.stringify(ROUTINES.market?.id)} -- the check must know the routine by its own trigger id`);
  assert.strictEqual(ROUTINES.market.file, "market-agent.md", "ROUTINES.market points at the wrong runbook");
  results.push("check-knows-market-by-its-trigger-id");

  const block = extractBlock(read(RUNBOOK_REL), ROUTINES.market);
  assert.deepStrictEqual(comparePrompt(block.text, block, ROUTINES.market, "market"), [],
    "the market block does not compare equal to itself -- --routine=market cannot reach exit 0");
  results.push("market-block-compares-equal-to-itself");

  // The control that makes the exit-0 above mean something: drop the paragraph this ticket is
  // about, and the check must produce exactly ONE finding that names it on the repo side.
  const lines = block.text.split("\n");
  const at = lines.findIndex(l => l.startsWith("COMPETITOR LEADS (AGT-155):"));
  assert.ok(at >= 0, "control premise: the block carries no COMPETITOR LEADS (AGT-155): line");
  assert.strictEqual(lines[at + 1], "",
    "control premise: the COMPETITOR LEADS line is not followed by a blank line, so removing two lines removes the wrong thing");
  const without = [...lines.slice(0, at), ...lines.slice(at + 2)].join("\n");
  const found = comparePrompt(without, block, ROUTINES.market, "market");
  assert.strictEqual(found.length, 1, `dropping the leads paragraph produced ${found.length} findings, expected 1`);
  assert.ok(found[0].locations[1].text.startsWith("COMPETITOR LEADS (AGT-155):"),
    `the repo side of the finding is ${JSON.stringify(found[0].locations[1].text.slice(0, 60))}, expected the COMPETITOR LEADS line`);
  assert.ok(found[0].locations[0].text.startsWith("NAPKIN (moved"),
    `the live side of the finding is ${JSON.stringify(found[0].locations[0].text.slice(0, 60))}, expected the NAPKIN line that slid up into its place`);
  results.push("dropping-the-leads-paragraph-is-one-finding-naming-it");
  return results;
}

async function run() {
  const results = [];
  results.push(...(await partA()));
  results.push(...(await partB()));
  results.push(...partC());
  results.push(...(await partD()));
  results.push(...partE());
  results.push(...partF());
  return results;
}

selfRun(import.meta.url, run);
export default run;
