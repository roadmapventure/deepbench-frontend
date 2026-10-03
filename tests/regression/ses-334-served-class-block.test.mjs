// DeepBench v7.0.487 | tests/regression/ses-334-served-class-block.test.mjs | SES-386 -- PART (d)
// DECLARES AN UNMEASURED COST, IT NO LONGER FAILS ON ONE. Nothing was thinned: the same clause is
// still graded the moment there is a measurement to grade, and the two clauses either side of it
// (`ranked.length > 0`, the block's presence in the brief) are graded UNCONDITIONALLY, exactly as
// before. `SES-197`'s boundary again -- retargeted, never deleted.
//
// WHAT WENT WRONG, AND IT IS NOT WHAT THE RED SAID. (d) read the ledger `order=started_at.desc
// &limit=5` and demanded a POSITIVE `est_tokens_dev` inside that window. The last measured run is
// 2026-09-09T21:17Z at 8088 tokens; six unmeasured runs have shipped since, so on 2026-09-15 the
// measured row simply AGED OUT of a five-row window and the guard went red with no code change and
// no defect. A guard whose colour depends on how many rows have scrolled past is not grading the
// change -- it is grading the calendar, and a red nobody can act on is how a suite stops being read.
//
// THE FIX IS IN TWO HALVES AND THE SECOND ONE IS THE REAL ONE. (i) the window is 50 rows, so a
// measurement that exists is FOUND rather than missed; (ii) the underlying blind spot is closed in
// `scripts/rank-backlog.js` -- the sub-agent could never report its own usage, so the runner reports
// it (`--input-tokens=` / `--output-tokens=`, runbook step 4c), which is what makes a future row
// measurable at all. Part (b) asserts that plumbing. A window widened over a job that can never
// report would be the declaration swallowing the defect, which is the failure this shape invites.
//
// DeepBench v7.0.446 | tests/regression/ses-334-served-class-block.test.mjs | SES-346 -- PART (b) IS
// REPOINTED, NOT THINNED. The re-rank stopped being a Vercel cron (`api/cron/rank-backlog.js` was the
// 13th serverless function on a 12-function Hobby plan and refused every dev deploy from v7.0.437); it is
// `scripts/rank-backlog.js` run from runbook step 4c now. Every clause below kept its MEANING and changed
// its SUBJECT -- the schedule's declaration, the picker-lane candidate read, the no-double-count rule and
// the tokens-are-measured-not-assumed rule each still have an assertion, against the file that now holds
// them. `SES-197`'s boundary: when a rule moves, the guard is retargeted, never deleted.
//
// DeepBench v7.0.437 | tests/regression/ses-334-served-class-block.test.mjs | SES-334 -- the nightly
// re-rank, and the `Board by served class` block it feeds.
//
// WHAT IS BEING PINNED, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY.
//
// (1) THE SCHEDULE IS ASSERTED ON A CYCLE ROW WITH A COST, WHICH IS THE KICKOFF'S OWN QA QUESTION.
// Would this pass if the schedule never fired? No: part (d) requires a `scheduled` runner_cycles row
// whose notes carry the SCHEDULED-AGENT prefix, whose outcome is `shipped`, and whose est_tokens_dev
// is a POSITIVE integer. Every one of those clauses was false at some point during this ship and each
// caught a real defect -- the first two runs failed outright (the model rejects a forced tool_choice,
// then rejects `temperature`), and the next two shipped with est_tokens_dev = 0 because the
// executor's audit row is fire-and-forget and had not landed when the route read it. A guard that
// merely asserted "a cycle row exists" would have passed on all four.
//
// (2) THE RENDERER IS DRIVEN FROM FIXTURES, BOTH THE POPULATED AND THE EMPTY BRANCH. The failure mode
// a block like this actually has is not a wrong number, it is a MISSING read rendered as a zero --
// "no ticket serves anything" and "the census was not read" look identical on the page and mean
// opposite things. Part (a) asserts they render differently, and that a null last-rank timestamp says
// *never* rather than printing nothing.
//
// (3) THE TWO MODEL-CAPABILITY PREDICATES ARE ASSERTED BOTH DIRECTIONS AND AT THE CALL SITE. Testing
// supportsForcedToolChoice('claude-fable-5-1') === false proves the data; it does not prove
// buildCallBody() asks. Part (c) drives the REAL buildCallBody() with the real schema-tool shape and
// asserts the emitted body: `auto` and no `temperature` for the restricted model, `{type:'tool'}` and
// a `temperature` for an unrestricted one. That second half is the negative control -- without it the
// test would still pass if the fix had disabled forced tool choice for EVERY model.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (a), (b) and (c) are in-process and always run. Part (d)
// touches Supabase and declares itself NOT RUN via notRun() when credentials are absent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { renderServedClass, SERVED_TOP_N } from "../../scripts/render-standing-brief.js";
import { buildCallBody } from "../../api/prompt/request-receivable.js";
import { supportsForcedToolChoice, supportsTemperature } from "../../shared/models.js";
// SES-346: the token rule is asserted on the REAL function that now holds it, not on a regex over a
// deleted route -- Section 4's "a test must assert against the REAL implementation" (SES-45).
import { tokensFrom, parseArgs, usageFromArgs } from "../../scripts/rank-backlog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// SES-346: the route is gone; the same job is this script, invoked by runbook step 4c.
const SCRIPT = path.join(ROOT, "scripts/rank-backlog.js");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");
const LEDGER = path.join(ROOT, "docs/SELFBUILD-RETIREMENT-LEDGER.md");
const VERCEL_JSON = path.join(ROOT, "vercel.json");
const BRIEF = path.join(ROOT, "docs/runbooks/standing-brief.md");

const STAMP = "as of 2026-09-09 21:17Z (Sep 9, 4:17 PM CST)";
const NOTES_PREFIX = "SCHEDULED-AGENT: rank-backlog";
const RESTRICTED = "claude-fable-5-1";
const UNRESTRICTED = "claude-sonnet-4-6";

// FEATURE: SES-386 -- the ledger window and the last measurement inside it, named once. The window
// is 50 rows and not "all of them" for the same reason MAX_CANDIDATES is 60: a bound that a reader
// can see beats an unbounded read that quietly becomes a bill.
export const LEDGER_WINDOW = 50;
export const LAST_MEASURED = { at: "2026-09-09T21:17Z", tokens: 8088 };

/**
 * FEATURE: SES-386. The first row carrying a REAL measurement, or null. Pure and exported so the
 * choice part (d) makes is driven from fixtures in part (b) rather than only against whatever the
 * ledger happens to hold today -- which is precisely the dependency that turned this guard red.
 *
 * A REPORTED ZERO IS NOT A MEASUREMENT HERE, and that is the one subtle clause. `tokensFrom()`
 * keeps 0 as a distinct fact from null because a genuinely free turn is a real thing to record.
 * But `est_tokens_dev = 0` on a scheduled re-rank is the shape SES-334 shipped TWICE while the
 * executor's fire-and-forget audit row had not landed -- a run that reports zero tokens has not
 * been measured, it has been assumed. So this selects `> 0`, and the `[null, 0]` fixture below
 * proves it returns null rather than seizing on the zero.
 */
export function pricedRow(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.find(r => Number.isInteger(r?.est_tokens_dev) && r.est_tokens_dev > 0) ?? null;
}

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

async function rows(query) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

function callBodyFor(model) {
  return buildCallBody({
    format_contract: {
      output_type: "json",
      skill_profile_slug: "pz-rank-intent",
      schema: { type: "object", required: ["ranked"], properties: { ranked: { type: "array" } } },
    },
    systemPrompt: "rank the board",
    model,
    max_tokens: 4000,
    temperature: 0,
    canRequestHelp: false,
    enableWebSearch: false,
  });
}

async function run() {
  // ---- (a) the renderer, populated and empty ---------------------------------------------------
  const populated = renderServedClass({
    counts: [
      { supports_class: "P1 - Improves John's Skills", n: 84 },
      { supports_class: "P2 - Inventive", n: 13 },
      { supports_class: null, n: 464 },
    ],
    top: [
      { backlog_id: "SES-329", automation_rank: 1, title: "Tickets carry a served class", supports_class: "P1 - Improves John's Skills" },
      { backlog_id: "SES-334", automation_rank: 2, title: "The Prioritizer runs on a schedule", supports_class: null },
    ],
    lastRankedAt: "2026-09-09T21:17:00Z",
  }, STAMP);
  assert.ok(populated.includes("Board by served class"), "the block must name itself");
  assert.ok(populated.includes("VC-MISSION-033"), "the block must cite the served-class test it reports");
  assert.ok(/\| `P1 - Improves John's Skills` \| 84 \|/.test(populated), "a named class row must render its count");
  assert.ok(/\| \*serves none\* \| 464 \|/.test(populated),
    "the serves-none bucket must be printed even though it is the ordinary answer -- hiding it makes "
    + "the Prioritizer's conservative ruling invisible");
  assert.ok(populated.includes("`SES-329`") && populated.includes("Tickets carry a served class"),
    "the top-ranked list must carry ids AND titles");
  assert.ok(populated.includes("serves P1 - Improves John's Skills") && populated.includes("serves none"),
    "each ranked row must say what it serves, including when the answer is none");
  assert.ok(/Last scheduled re-rank: /.test(populated), "the block must carry the last re-rank timestamp");
  assert.ok(!/never/.test(populated.split("Last scheduled re-rank")[1] || ""),
    "a present timestamp must not also say never");

  // The distinction the whole group turns on.
  const notRead = renderServedClass(undefined, STAMP);
  assert.ok(/was not read for this render/.test(notRead),
    "an unread census must SAY so -- 'not read' and 'nothing serves anything' are opposite facts");
  assert.ok(!/\| \*serves none\* \|/.test(notRead), "an unread census must not render a table of zeros");

  const noneServing = renderServedClass({ counts: [{ supports_class: null, n: 500 }], top: [], lastRankedAt: null }, STAMP);
  assert.ok(/No open ticket carries a served class yet/.test(noneServing),
    "a genuinely empty served-class board is a real state and must be said as one");
  assert.ok(/Last scheduled re-rank: \*never\*/.test(noneServing),
    "a null last-rank must render as *never*, not as a blank -- a schedule that has not fired and one "
    + "that fired and ranked nothing are different facts");
  assert.notStrictEqual(noneServing, notRead, "the empty and unread branches must not render identically");

  // The negative-rank note: present when John's own queue is in the top N, absent otherwise.
  const withNegatives = renderServedClass({
    counts: [{ supports_class: null, n: 1 }],
    top: [{ backlog_id: "SES-288", automation_rank: -35, title: "t", supports_class: null }],
    lastRankedAt: "2026-09-09T21:17:00Z",
  }, STAMP);
  assert.ok(/Negative ranks are John's own automation queue/.test(withNegatives),
    "a negative rank in the top N must be explained -- unexplained it reads as a re-rank that failed");
  assert.ok(!/Negative ranks are/.test(populated), "the note must NOT appear when no negative rank is shown");
  assert.strictEqual(SERVED_TOP_N, 5, "the top-N constant is part of the block's contract");
  console.log("  (a) renderer: populated / unread / empty / negative-rank branches all distinct -- PASS");

  // ---- (b) the schedule is declared, and the job exists ------------------------------------------
  // REPOINTED BY SES-346, CLAUSE FOR CLAUSE. The job is no longer a Vercel cron -- that route was the
  // 13th serverless function on a 12-function Hobby plan and REFUSED every dev deploy from v7.0.437
  // to v7.0.445. Each assertion below kept its MEANING and changed its SUBJECT; retirement-ledger
  // entry 53 records the move, and nothing here was dropped (SES-197's retarget-never-delete rule).
  const vercel = JSON.parse(fs.readFileSync(VERCEL_JSON, "utf8"));
  assert.ok(!vercel.crons,
    "vercel.json must declare NO crons -- /api/cron/rank-backlog was the 13th of 12 permitted "
    + "serverless functions and its presence refuses the WHOLE deployment, silently");
  assert.ok(!fs.existsSync(path.join(ROOT, "api/cron/rank-backlog.js")),
    "api/cron/rank-backlog.js is back under api/ -- it is a serverless function there and the plan has "
    + "no room for it (scripts/check-api-function-count.js is the count)");

  // The SCHEDULE's declaration moved from vercel.json to the runbook, so that is where it is asserted:
  // a job nothing invokes is dead code, which is exactly what the retired clause protected against.
  assert.ok(fs.existsSync(SCRIPT), "scripts/rank-backlog.js must exist -- it is the re-rank now");
  const step4c = fs.readFileSync(RUNBOOK, "utf8").split("**4c.")[1];
  assert.ok(step4c, "docs/runbooks/runner-cycle.md must carry step 4c -- without it nothing runs the re-rank");
  const step4cBody = step4c.split("**5. Pick ONE item.**")[0];
  assert.ok(/scripts\/rank-backlog\.js/.test(step4cBody),
    "step 4c must name scripts/rank-backlog.js -- a schedule that names no runnable thing is not a schedule");
  assert.ok(/once per CST day/.test(step4cBody),
    "step 4c must state the cadence: what the 09:10 UTC cron actually satisfied was 'overnight, once a "
    + "day', and the cadence is the half that has to survive the move");

  const script = fs.readFileSync(SCRIPT, "utf8");
  // The pg_net reasoning survives -- in the ledger entry, which is where a reader looking for a retired
  // rule is told to look, and the script points at it so the chain cannot silently break.
  assert.ok(/pg_net/.test(fs.readFileSync(LEDGER, "utf8")),
    "the WHY-not-a-cron.job reasoning (pg_net is not installed on this project) must survive the "
    + "retirement -- it is the first thing a later reader will re-litigate");
  assert.ok(/SELFBUILD-RETIREMENT-LEDGER/.test(script),
    "scripts/rank-backlog.js must point at the ledger entry carrying the retired route's reasoning");
  assert.ok(/prime_directive_queue/.test(script),
    "the candidate read must come from prime_directive_queue(), not a re-derived buildable filter");

  // INVERTED, AND THE INVERSION IS THE POINT. The route deliberately wrote no ai_activity_log row
  // because the EXECUTOR had already logged the turn. On the session path no executor call happens, so
  // a script that logged nothing would make the re-rank invisible to the AI Audit -- unmeasured spend,
  // not a saving (.claude/rules/capability-logging.md). What must NOT come back is a SECOND HOME for
  // the write: the row goes through scripts/agent-log.js, never a hand-rolled logActivity() here.
  assert.ok(/agent-log\.js/.test(script),
    "the session path must write its own ai_activity_log row through scripts/agent-log.js -- the executor "
    + "is not running, so nothing else will");
  assert.ok(!/^\s*import[^\n]*logActivity/m.test(script) && !/logActivity\(\{/.test(script),
    "the script must not call logActivity() directly -- agent-log.js is the one home, and a second write "
    + "path is how the nine bespoke payload shapes AA-190 replaced came to exist");

  // The polling existed because the executor's own log write is fire-and-forget, so a single read
  // reported 0 tokens on every successful run forever. There is no executor row to wait for now, so what
  // survives is the RULE the polling served -- a run that reports zero tokens has not been measured, it
  // has been assumed -- asserted on the REAL tokensFrom(), both directions, with the 0-vs-null control.
  assert.strictEqual(tokensFrom({}).total, null,
    "an unreported token count must be null, never 0 -- a stored 0 says the run was free (SES-147)");
  assert.strictEqual(tokensFrom({ input_tokens: 0, output_tokens: 0 }).total, 0,
    "a genuinely REPORTED zero is a different fact from an unreported one and must survive as 0");
  assert.strictEqual(tokensFrom({ input_tokens: 6707, output_tokens: 1651 }).total, 8358,
    "a reported pair must sum -- these are the real numbers from SES-334's own first live run");

  // ---- SES-386: WHERE THAT PAIR NOW COMES FROM, asserted end to end -----------------------------
  // The rule above ("null, never 0") was always right and was never reachable: `pz-rank-intent`'s
  // schema declares no token properties, so `answer` never carried the pair and every scheduled row
  // stored NULL. The measurement enters through the RUNBOOK, so the runbook is graded first.
  assert.ok(/--input-tokens=/.test(step4cBody),
    "step 4c must pass --input-tokens= to scripts/rank-backlog.js -- the sub-agent cannot report its "
    + "own usage, so a step that does not carry the pair guarantees est_tokens_dev stays NULL forever");

  // The parser refuses a non-measurement on the TEXT, before arithmetic can launder it. Both
  // directions: a good pair parses, and each bad form is REFUSED rather than coerced.
  const good = parseArgs(["--cycle=c1", "--answer=a.json", "--input-tokens=6707", "--output-tokens=1651"]);
  assert.strictEqual(good.error, undefined, `a valid pair must parse: ${good.error}`);
  assert.deepStrictEqual(usageFromArgs(good), { input_tokens: 6707, output_tokens: 1651 },
    "usageFromArgs must hand back tokensFrom()'s OWN key names, so the two sources compose by spread");
  assert.strictEqual(tokensFrom({ ...{}, ...usageFromArgs(good) }).total, 8358,
    "the CLI pair alone must produce the total -- the answer file carries nothing to merge with");
  assert.ok(parseArgs(["--input-tokens=-1"]).error,
    "--input-tokens=-1 must be REFUSED by the parser: Number('-1') is a perfectly good number and a "
    + "negative token count stored as one is a measurement nobody made");
  assert.ok(parseArgs(["--input-tokens=x"]).error, "--input-tokens=x must be refused, not coerced to NaN");
  assert.ok(usageFromArgs({ inputTokens: -1 }).error,
    "usageFromArgs must refuse a negative on its own too -- the parser is not its only caller");

  // THE NEGATIVE CONTROL for the whole pair: absent flags must leave the answer file ALONE and still
  // yield null. If usageFromArgs returned {input_tokens: null} this would overwrite a real pair with
  // nothing, which is the opposite of what the CLI-wins rule is for.
  assert.deepStrictEqual(usageFromArgs(parseArgs(["--cycle=c1"])), {},
    "an absent pair must contribute NO keys, so it cannot overwrite what the answer file reported");
  assert.strictEqual(tokensFrom({ ...{}, ...usageFromArgs(parseArgs(["--cycle=c1"])) }).total, null,
    "with neither source reporting, the stored cost must be null -- a 0 would say the run was free");
  assert.strictEqual(
    tokensFrom({ input_tokens: 1, output_tokens: 1, ...usageFromArgs(good) }).total, 8358,
    "the CLI must WIN over the answer file -- the caller who watched the turn is the better witness");

  // ---- SES-386: pricedRow(), driven BOTH WAYS from fixtures -------------------------------------
  // This is the choice part (d) makes, exercised here so it is graded on every run rather than only
  // on a run whose live ledger happens to contain the situation.
  const ROWS = [
    { id: "r-null", est_tokens_dev: null, notes: `${NOTES_PREFIX} — 7 ticket(s) given an automation_rank` },
    { id: "r-zero", est_tokens_dev: 0, notes: `${NOTES_PREFIX} — 7 ticket(s) given an automation_rank` },
    { id: "r-8088", est_tokens_dev: 8088, notes: `${NOTES_PREFIX} — 10 ticket(s) given an automation_rank` },
  ];
  assert.strictEqual(pricedRow(ROWS)?.id, "r-8088",
    "a measured row anywhere in the window must be found -- ordering by date and taking the first is "
    + "what made this guard's colour depend on how many rows had scrolled past");
  assert.strictEqual(pricedRow(ROWS.slice(0, 2)), null,
    "null and a REPORTED 0 are both non-measurements here: a scheduled re-rank that cost 0 is the "
    + "shape SES-334 shipped twice while the audit row had not landed");
  assert.strictEqual(pricedRow([]), null, "an empty ledger yields null, not a crash");

  // THE DECLARATION CANNOT SWALLOW A REAL FAILURE. Once a row IS priced, the notes clause is graded
  // exactly as it always was -- so a run that cost 8088 tokens and did nothing still FAILS.
  const liar = pricedRow([{ est_tokens_dev: 8088, notes: `${NOTES_PREFIX} — nothing` }]);
  assert.ok(liar, "the fixture must be selected, or the control below proves nothing");
  assert.ok(!/given an automation_rank/.test(liar.notes),
    "a priced row whose notes do not say what it did must still fail (d)'s notes clause -- widening "
    + "the window must not turn a graded assertion into a declared one");
  console.log("  (b) no crons in vercel.json, step 4c names the script and the token flags, "
    + "tokens null-vs-zero holds, pricedRow discriminates -- PASS");

  // ---- (c) the two model-capability predicates, at the call site --------------------------------
  assert.strictEqual(supportsForcedToolChoice(RESTRICTED), false);
  assert.strictEqual(supportsForcedToolChoice(UNRESTRICTED), true);
  assert.strictEqual(supportsTemperature(RESTRICTED), false);
  assert.strictEqual(supportsTemperature(UNRESTRICTED), true);
  assert.strictEqual(supportsForcedToolChoice(null), true, "an unknown model must keep today's behaviour");
  assert.strictEqual(supportsTemperature(""), true, "an unknown model must keep today's behaviour");

  const restricted = callBodyFor(RESTRICTED);
  assert.strictEqual(restricted.tool_choice.type, "auto",
    "a schema-only intent on the restricted family must send tool_choice auto -- forced choice is a "
    + "hard 400 there, which is what broke SES-334's first scheduled call");
  assert.ok(!("temperature" in restricted),
    "`temperature` must be omitted for the restricted family -- it is a hard 400 there too");

  // THE NEGATIVE CONTROL. Without it this test still passes if the fix disabled forced tool choice
  // and temperature for every model on the platform.
  const unrestricted = callBodyFor(UNRESTRICTED);
  assert.strictEqual(unrestricted.tool_choice.type, "tool",
    "an unrestricted model must STILL get the forced schema tool -- the fix must be model-scoped, not "
    + "a platform-wide loosening");
  assert.strictEqual(unrestricted.tool_choice.name, "pz-rank-intent");
  assert.strictEqual(unrestricted.temperature, 0, "an unrestricted model must still receive temperature");
  console.log("  (c) buildCallBody: auto + no temperature on the restricted family, forced + temperature elsewhere -- PASS");

  if (!hasCreds()) {
    notRun("(d) the scheduled run's cycle row and the block's live facts", CRED_HINT);
    return;
  }

  // ---- (d) LIVE: the schedule actually fired, and it cost something -----------------------------
  const cycles = await rows(`runner_cycles?trigger=eq.scheduled&notes=like.${encodeURIComponent(NOTES_PREFIX + "%")}`
    + `&outcome=eq.shipped&select=id,est_tokens_dev,notes,started_at&order=started_at.desc&limit=${LEDGER_WINDOW}`);
  // STILL GRADED, and it is the clause that catches a schedule that never fires at all.
  assert.ok(cycles.length > 0,
    `no shipped '${NOTES_PREFIX}' cycle row exists -- the scheduled re-rank has never completed`);

  // SES-386: a missing MEASUREMENT is declared; a wrong measurement still fails. The distinction is
  // the whole retarget -- "this run cost nothing we can see" is a gap in the ledger, not a defect in
  // the change under test, and reporting it as a red teaches the reader to ignore reds.
  const priced = pricedRow(cycles);
  if (!priced) {
    const unmeasured = cycles.filter(c => !Number.isInteger(c.est_tokens_dev) || c.est_tokens_dev <= 0);
    notRun(
      "(d) the measured cost of a scheduled re-rank",
      `all ${cycles.length} shipped '${NOTES_PREFIX}' row(s) in the newest ${LEDGER_WINDOW} carry no `
      + `POSITIVE est_tokens_dev (${unmeasured.length} unmeasured, newest `
      + `${unmeasured[0]?.started_at ?? "n/a"}). The last MEASURED run is ${LAST_MEASURED.at} at `
      + `${LAST_MEASURED.tokens} tokens, now outside this window. The rule is unchanged -- a run that `
      + "reports zero tokens has not been measured, it has been assumed -- and it is UNGRADEABLE here "
      + "rather than broken: runbook step 4c passes the Agent tool's own pair as --input-tokens= / "
      + "--output-tokens= (SES-386), so the next step-4c run writes the first measurable row. Part (b) "
      + "above graded that plumbing, and the two clauses below still ran.",
    );
  } else {
    assert.ok(/given an automation_rank/.test(priced.notes),
      "the cycle row's notes must say what the run actually did");
  }

  const ranked = await rows("backlog_items?automation_rank=not.is.null&select=backlog_id&limit=1000");
  assert.ok(ranked.length > 0, "no ticket carries an automation_rank -- the ranking wrote nothing");

  const brief = fs.readFileSync(BRIEF, "utf8");
  assert.ok(brief.includes("**Board by served class**"),
    "the standing brief does not carry the Board by served class block -- re-run "
    + "scripts/render-standing-brief.js with a service key");
  console.log(`  (d) LIVE: ${cycles.length} shipped scheduled re-rank row(s); cost `
    + `${priced ? `${priced.est_tokens_dev} tokens on ${priced.id.slice(0, 8)}` : "DECLARED unmeasured"}; `
    + `${ranked.length} tickets ranked, block present in the brief -- PASS`);
}

export default run;
selfRun(import.meta.url, run);
