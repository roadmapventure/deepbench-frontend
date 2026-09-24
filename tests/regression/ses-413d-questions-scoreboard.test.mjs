// DeepBench v7.0.523 | tests/regression/ses-413d-questions-scoreboard.test.mjs | SES-413 slice 4 --
// the weekly question count is a GRADED column on the platform scoreboard, not just a printed line.
//
// FEATURE. `governance_rules.MANAGER-DECIDES-BY-DEFAULT` sentence 3 promises John that "a question
// that still reaches him is counted weekly, target zero". Slice 3 (`v7.0.521`) RENDERS that count on
// the standing brief. Nothing GRADED it: measured live on the unchanged tree 2026-09-18,
// `platform_scoreboard` carried 14 columns and 7 metrics with no `questions_to_john_week`, and
// `outcome_claim_is_valid()` hard-coded those same 7 names under CHECK `ck_backlog_outcome_claim` --
// so `enhancement_claim = 'questions_to_john_week: down'` was REJECTED AT FILING. A promise a ticket
// cannot claim against is a sentence, not a target. Slice 4 adds the column, computes it inside
// `snapshot_platform_scoreboard()` (no new parameter -- see (3) below), and teaches the validator
// and `ticket_outcome` the name.
//
// WHAT THIS FILE GUARDS, and where the lazy version of each guard passes vacuously.
//
// (1) THE THREE DOCS SAY EIGHT, AND THE SUPERSEDED SENTENCE IS GONE. Asserting only that
//     `questions_to_john_week` appears somewhere would pass against a doc that added the name and
//     left "the seven metric names are exactly" standing one line above it -- which is the drift
//     that makes a runbook worse than no runbook, because both readings are quotable. Every clause
//     below therefore carries a MUTATION CONTROL (`breaks`): the clause is re-run against text with
//     its own subject removed and must go red. A clause that survives its own mutation is asserting
//     nothing, and this file fails on that rather than reporting green.
//
// (2) THE RUNBOOK CEILING IS A CEILING. `docs/runbooks/runner-cycle.md` sits at 380,976 B against
//     `SES-336`'s 381,000 B cap -- 24 B of headroom -- and `agt-70-auditor.test.mjs:1015` pins the
//     header-stamp count at exactly 5. Slice 4's edit is a five-letter word swapped for a
//     five-letter word: byte-neutral by construction, no stamp added, no stamp dropped. Both facts
//     are asserted here as well as there, because a later session editing this paragraph will read
//     THIS file to learn what it may spend, and "it was fine when I ran it" is not a budget.
//
// (3) THE MEASURE IS COMPUTED INSIDE THE FUNCTION, WITH NO NEW PARAMETER. Adding
//     `p_questions` would have created a SECOND overload of `snapshot_platform_scoreboard` --
//     `CREATE OR REPLACE` only replaces the exact identity argument list it already matches -- and
//     PostgREST then cannot resolve the 4-argument call the runbook's close-out makes, which
//     surfaces as an EMPTY RESULT rather than a crash (`.claude/rules/supabase-function-signature.md`,
//     found live at `DAT-12`). The identity args are unchanged and exactly one overload of each
//     function remains; those are pg_proc facts, declared not-run below with the numbers measured at
//     this ship rather than asserted from a file this test can read.
//
// (4) `0` IS NOT `NULL`, WHICH IS THE WHOLE DISCRIMINATOR WHILE THE COUNT IS ZERO. Live at this
//     ship `runner_questions` holds 40 rows, 17 open, and ZERO asked in the trailing 7 days -- so
//     the honest value of the new column is 0. A column that was added but never computed reads
//     NULL, and NULL grades as `unmeasurable` forever on `ticket_outcome` rather than as a met
//     target. The live arm below therefore refuses a NULL on any row taken AFTER the migration
//     landed, and reconciles a non-NULL against the count read separately from `runner_questions`.
//     Rows taken BEFORE it read NULL by design: they never measured it, and a backfilled zero would
//     be a measurement nobody took.
//
// (5) THE WINDOW IS TRAILING 7 DAYS, NOT THE SCOREBOARD WEEK. `week_start` rolls over on a fixed
//     boundary; a claim graded 72 h after a ship that straddles it would be handed a `held` by the
//     calendar rather than by anything the ticket did. `cron_silence_hours` already uses the
//     trailing window for that reason, and this column matches it.
//
// NO WRITES ANYWHERE IN THIS FILE, so no before-images are owed. Every live arm is a GET or a
// read-only RPC; nothing stamps the board, and nothing inserts a question.

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SETUP = "docs/runbooks/session-setup.md";
const CYCLE = "docs/runbooks/runner-cycle.md";
const JOHN = "docs/WORKING-WITH-JOHN.md";

// SES-336's ceiling and the LAST MEASURED size of the runbook, re-measured by every ship that
// edits it. v7.0.538 (SES-424 slice 6) appended ` --patterns-applied=<answer.patterns_applied>` to
// the three `scripts/agent-log.js` blocks (+135 B, 45 each) -- which did not fit under the ceiling,
// so 296 B came OUT first, in the same commit and before the additions: two dated measurements the
// cycle's own §2 counts had superseded (step 6's "Measured 2026-09-12 -- 2 Designer and 1 Builder
// rows" sentence, 196 B, and step 6b's "the Builder's half is the thinner of the two: 1 row" clause,
// 100 B), both kept verbatim in docs/harvests/SES-424-slice6.md. 380879 - 296 + 135 = 380718 B, 282 B
// under the ceiling. The ceiling itself is NEVER raised to make an edit fit.
//
// v7.0.555 (AGT-86 slice 8b) moved step 4d to a pointer at docs/runbooks/auditor-routine.md (-2,701 B
// for the step, +~250 B for the pointer, +~70 B at :4720 for the fifteenth restorable table, the
// v7.0.519 stamp dropped and a v7.0.555 stamp added): 380718 -> 378273 B, 2,727 B under the ceiling.
// Re-pinned by v7.0.557 in the same push.
//
// v7.0.565 (AGT-87) replaced the stale cadence literals in step 1b and two outliers with the rule
// that points at `runner_settings.interval_hours` and the routine (prose only, no value changed):
// 379678 -> 380144 B, 856 B under the ceiling. Re-pinned in the same commit that edits the runbook.
export const RUNBOOK_CEILING = 381000;
//
// v7.0.567 (AGT-89) corrected two sentences about the automation lane at the M5-02 block:
// "SITS ABOVE ALL SIX ORDER CLAUSES" -> "IS THE LEADING OF OD-01'S SIX ORDER CLAUSES", and the
// rank domain "(1-6; NULL = not in the lane)" -> the open-ended integer it actually is (measured
// live this ship: min -45, max 23 over 177 ranked rows). The edit adds +109 B. It landed on top of
// v7.0.565's 380144 rather than the 379678 it was written against, so the pin is the RE-MEASURED
// post-rebase byte count, never either side of the conflict: 380144 -> 380253 B, 747 B under the
// ceiling. Re-measured with wc -c after the rebase and re-pinned in the same commit.
// v7.0.585 (AGT-127) adds the `gate_cards_to_rule` boot branch to refusal 6 and the gate-card
// ruling call to 7b, and REMOVES bytes first, as the pin requires: the archived-pointer
// paragraph, refusal 2's restated staleness rationale and its restated one-home sentence, the
// self-read tail, and 7b's verbatim quotation of the sentence SES-315 retired. Net 380667 ->
// 380976 B, 24 B under the ceiling. Re-measured with wc -c and re-pinned in the same commit.
export const BYTES_AT_SHIP = 380976;
export const HEADER_STAMPS = 5;

// The column, and the eight names the validator now accepts.
export const COLUMN = "questions_to_john_week";
export const METRICS = [
  "noship_cycles_week", "noship_tokens_week", "shipped_cycles_week", "tokens_per_shipped_cycle",
  "cycles_per_shipped_ticket", "cron_silence_hours", "hygiene_flags", COLUMN,
];

// The instant this slice's migration landed. A scoreboard row taken at or after it MUST carry a
// number; one taken before it carries NULL, because the column did not exist to be measured.
export const SHIP_FLOOR = "2026-09-18T13:10:00.000Z";

// Every doc clause as {id, file, test, breaks, detail}. `breaks` is the clause's OWN mutation: the
// smallest edit that should make it red. Green-after-mutation is a failure of this file, not a pass.
export const CLAUSES = [
  {
    id: "setup-says-eight",
    file: SETUP,
    detail: "the claimable metric names are now EIGHT, and the sentence that said seven is gone",
    test: s => s.includes("and the eight metric names are exactly") && !s.includes("the seven metric names"),
    breaks: s => s.replace("and the eight metric names are exactly", "and the seven metric names are exactly"),
  },
  {
    id: "setup-lists-the-column",
    file: SETUP,
    detail: `\`${COLUMN}\` is listed after \`hygiene_flags\`, so the list and the count agree`,
    test: s => /`hygiene_flags`,\s*\n?\s*`questions_to_john_week`/.test(s),
    breaks: s => s.replace("`hygiene_flags`, `questions_to_john_week`", "`hygiene_flags`"),
  },
  {
    id: "setup-six-standing-numbers",
    file: SETUP,
    detail: "the stamp records SIX standing numbers now, not five",
    test: s => s.includes("records the platform's six standing numbers at that moment")
      && !s.includes("five standing numbers"),
    breaks: s => s.replace("six standing numbers", "five standing numbers"),
  },
  {
    id: "setup-other-five-computed",
    file: SETUP,
    detail: "the hand-supplied flag count aside, FIVE numbers are computed by the function itself",
    test: s => s.includes("the other five numbers are computed from") && !s.includes("the other four numbers"),
    breaks: s => s.replace("the other five numbers", "the other four numbers"),
  },
  {
    id: "cycle-says-eight",
    file: CYCLE,
    detail: "step 7b's validator warning names EIGHT metric names, the validator's sole home",
    test: s => /`public\.outcome_claim_is_valid\(text\)`, whose eight\n\s*metric names are that function's sole home/.test(s),
    breaks: s => s.replace("whose eight\n  metric names", "whose seven\n  metric names"),
  },
  {
    id: "john-carries-the-shipped-fact",
    file: JOHN,
    detail: "WORKING-WITH-JOHN.md states the SHIPPED column, not a promise about a future slice",
    test: s => s.includes(`platform_scoreboard.${COLUMN}`)
      && s.includes("trailing 7 days")
      && s.includes("public.ticket_outcome")
      && !s.includes("becomes a scoreboard column in slice 4"),
    breaks: s => s.replace(`platform_scoreboard.${COLUMN}`, "becomes a scoreboard column in slice 4"),
  },
];

// == (1) the docs, each clause with its own mutation control =====================================
function theDocsCarryTheEighthMetric() {
  const done = [];
  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s,
      `control: the mutation for "${c.id}" changed nothing -- the clause is asserting against text `
      + "that is not there, so its green says nothing (the SES-158 failure)");
    assert.ok(!c.test(mutated),
      `control: clause "${c.id}" still passes after its own subject was mutated away -- the arm is vacuous`);
    done.push(c.id);
  }
  assert.strictEqual(done.length, CLAUSES.length);
  return done;
}

// == (2) the ceiling, and the stamp count that shares it =========================================
function theRunbookCeilingHeld() {
  const bytes = Buffer.byteLength(fs.readFileSync(path.join(ROOT, CYCLE)), "utf8");
  assert.ok(bytes <= RUNBOOK_CEILING,
    `${CYCLE} is ${bytes} B against SES-336's ${RUNBOOK_CEILING} B ceiling. The ceiling is never `
    + "raised to fit an edit: drop an old header stamp (SES-164 grep FIRST, zero-hit facts RELOCATED, "
    + "not lost) or say it in fewer bytes.");
  assert.strictEqual(bytes, BYTES_AT_SHIP,
    `${CYCLE} must read exactly the ${BYTES_AT_SHIP} B its last editing ship measured. It reads `
    + `${bytes} B, which means something landed in the file without re-measuring the pin, with `
    + `${RUNBOOK_CEILING - bytes} B of headroom left to account for. Re-measure with wc -c and move `
    + "the constant in the same commit -- never raise the CEILING to fit an edit.");

  const stamps = read(CYCLE).split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
  assert.strictEqual(stamps.length, HEADER_STAMPS,
    `agt-70-auditor.test.mjs pins ${CYCLE} at exactly ${HEADER_STAMPS} header stamps; got `
    + `${stamps.length}. A ship that adds one rotates one out (SES-164 step 2 by grep FIRST).`);
  return { bytes, stamps: stamps.length };
}

export default async function run() {
  const clauses = theDocsCarryTheEighthMetric();   // (1)
  const ceiling = theRunbookCeilingHeld();         // (2)

  const pure = `${clauses.length} doc clauses hold, each red under its own mutation `
    + `(${clauses.join(", ")}); ${CYCLE} is ${ceiling.bytes} B of ${RUNBOOK_CEILING} with `
    + `${ceiling.stamps} header stamps`;

  // The two facts this file cannot read from disk. Declared, with the numbers measured at this ship
  // over MCP, rather than asserted from something weaker that would look like a check.
  notRun(
    "SES-413d: exactly ONE overload each of public.snapshot_platform_scoreboard and "
    + "public.outcome_claim_is_valid, and public.ticket_outcome's `ship` CTE naming every metric column",
    "pg_proc and pg_get_viewdef are not reachable over PostgREST; the migration asserts both in a "
    + "trailing DO block in the SAME transaction that wrote them, and they were re-read after it. "
    + "Measured at this ship (2026-09-18, v7.0.523): snapshot_platform_scoreboard overloads = 1, "
    + "identity (p_trigger text, p_backlog_id text, p_push_sha text, p_hygiene_flags integer, "
    + "p_notes text) -- UNCHANGED, no parameter added; outcome_claim_is_valid overloads = 1, "
    + "identity (claim text); platform_scoreboard = 15 columns / 8 metrics; ticket_outcome's ship "
    + "CTE names all 8 and its 15 output columns kept their names and positions.",
  );

  // == LIVE ======================================================================================
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    notRun(
      `SES-413d live: outcome_claim_is_valid accepts '${COLUMN}: down' and rejects both `
      + `'${COLUMN}: sideways' and the near-miss 'questions_to_john: down'; the newest `
      + "platform_scoreboard row projects the new column over the service key",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name "
      + "(docs/runbooks/session-setup.md step 1b) and re-run: "
      + "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js. "
      + "Measured at this ship instead: the validator returned true / false / false in that order "
      + "(and true for the control 'hygiene_flags: down'); runner_questions held 40 rows, 17 open "
      + "and 0 asked in the trailing 7 days, so the honest value of the column is 0; the rolled-back "
      + "probe printed `PROBE before=0 after=1` with zero residue (40 / 52 re-read after), which is "
      + "what proves 0 is a measurement and not a NULL.",
    );
    console.log(`  [SES-413d] ${pure}; live declared NOT RUN`);
    return;
  }

  const base = url.replace(/\/+$/, "");
  const hdr = k => ({ apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" });
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: hdr(key) });
    if (!r.ok) assert.fail(`PostgREST ${r.status} on GET ${q}: ${await r.text()}`);
    return r.json();
  };
  const valid = async claim => {
    const r = await fetch(`${base}/rest/v1/rpc/outcome_claim_is_valid`,
      { method: "POST", headers: hdr(key), body: JSON.stringify({ claim }) });
    if (!r.ok) assert.fail(`rpc/outcome_claim_is_valid returned HTTP ${r.status} for ${JSON.stringify(claim)}: ${await r.text()}`);
    return r.json();
  };

  // -- the validator, both directions, plus the near-miss ----------------------------------------
  assert.strictEqual(await valid(`${COLUMN}: down`), true,
    `outcome_claim_is_valid must ACCEPT '${COLUMN}: down' -- CHECK ck_backlog_outcome_claim calls it, `
    + "so a rejection here means the metric cannot be claimed at filing and the promise stays ungraded");
  assert.strictEqual(await valid(`${COLUMN}: sideways`), false,
    `'${COLUMN}: sideways' must be REJECTED: the direction half is 'up' or 'down', and a validator `
    + "that waved the name through whatever followed it would accept a claim ticket_outcome cannot grade");
  assert.strictEqual(await valid("questions_to_john: down"), false,
    "the NEAR MISS 'questions_to_john: down' must be rejected -- it is the mistake a reader of the "
    + "brief actually makes, and a prefix or fuzzy match would file a claim against a column that "
    + "does not exist, which grades `unmeasurable` three days later instead of failing at filing");
  assert.strictEqual(await valid("hygiene_flags: down"), true,
    "control: an ORIGINAL metric name must still be accepted -- if this went false the validator was "
    + "replaced rather than extended, and every ticket already claiming one of the seven is now unfileable");

  // -- the column reads, and 0 is not NULL -------------------------------------------------------
  // Naming the column explicitly is itself the check: a projection of a column PostgREST does not
  // know is a 400, so this GET cannot pass against a board that never got the column.
  const newest = await get(`platform_scoreboard?select=id,taken_at,trigger,${COLUMN}&order=taken_at.desc&limit=1`);
  assert.strictEqual(newest.length, 1, "platform_scoreboard has no rows -- the series never started");
  const row = newest[0];
  assert.ok(Object.prototype.hasOwnProperty.call(row, COLUMN),
    `the newest scoreboard row must PROJECT \`${COLUMN}\`; got keys ${Object.keys(row).join(", ")}`);

  const asked = await get(
    `runner_questions?select=qid&asked_at=gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}&limit=1000`);
  const expected = asked.length;

  if (row[COLUMN] === null) {
    assert.ok(Date.parse(row.taken_at) < Date.parse(SHIP_FLOOR),
      `the newest scoreboard row (${row.taken_at}) was taken AFTER this slice landed (${SHIP_FLOOR}) `
      + `and still reads NULL for \`${COLUMN}\`. A column added but never computed grades `
      + "`unmeasurable` FOREVER on ticket_outcome -- which is the exact failure this slice exists to "
      + `prevent, and it is invisible while the honest count is 0. Expected ${expected}.`);
    console.log(`  [SES-413d] ${pure}; live: validator true/false/false (+ control true); newest row `
      + `${row.taken_at} predates the ship floor and reads NULL by design (never measured, not zero); `
      + `${expected} question(s) asked in the trailing 7 days`);
  } else {
    assert.ok(Number.isInteger(row[COLUMN]) && row[COLUMN] >= 0,
      `\`${COLUMN}\` must be a non-negative integer; got ${JSON.stringify(row[COLUMN])}`);
    assert.strictEqual(row[COLUMN], expected,
      `\`${COLUMN}\` on the newest row reads ${row[COLUMN]} but runner_questions holds ${expected} row(s) `
      + "asked in the trailing 7 days. The two are the same measurement taken twice; a disagreement "
      + "means the function counted the wrong table, the wrong window, or a filtered subset of statuses "
      + "(every row asked counts, whatever its status).");
    console.log(`  [SES-413d] ${pure}; live: validator true/false/false (+ control true); newest row `
      + `${row.taken_at} (${row.trigger}) reads ${row[COLUMN]}, reconciled against ${expected} `
      + "question(s) asked in the trailing 7 days -- a measured value, not a NULL");
  }

  // -- the anon key cannot read the board at all -------------------------------------------------
  if (anon) {
    const denied = await fetch(`${base}/rest/v1/platform_scoreboard?select=${COLUMN}&limit=1`, { headers: hdr(anon) });
    assert.ok(!denied.ok && denied.status >= 400 && denied.status < 500,
      `the anon key read \`${COLUMN}\` off platform_scoreboard (HTTP ${denied.status}) -- the board `
      + "holds postgres and service_role grants ONLY, and a public read of it is a leak, not a feature");
  } else {
    notRun(
      `SES-413d: the anon key gets a 4xx projecting \`${COLUMN}\` off platform_scoreboard`,
      "VITE_SUPABASE_ANON_KEY absent; the service-role arms above still ran. Measured over MCP at "
      + "this ship instead: information_schema.role_table_grants shows platform_scoreboard granted to "
      + "postgres and service_role ONLY -- anon and authenticated hold NO privilege of any type on the "
      + "table, so the new column is unreachable with the browser key by construction and needed no "
      + "column-grant work (.claude/rules/supabase-column-grants.md). That also means it fails CLOSED: "
      + "a future public reader of this table must be granted the column explicitly.",
    );
  }
}

selfRun(import.meta.url, run);
