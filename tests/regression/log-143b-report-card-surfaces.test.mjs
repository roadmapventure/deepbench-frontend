// DeepBench v7.0.417 | tests/regression/log-143b-report-card-surfaces.test.mjs | LOG-143 (b) --
// the two surfaces the Bench Report Card reaches the visitor through: the Channel Intelligence
// screen grades every finished run in the background, and the Personnel File's Profile tab shows
// the Agent's card with the Skill row to improve.
//
// WHY THE HELPERS ARE COMPILED AND CALLED, NOT GREPPED. Plain Node cannot import a .jsx file, and
// the tempting shortcut -- assert the source contains `shouldGradeTrace` and move on -- would pass
// against a helper whose body says `return true`. Both screens are therefore compiled with esbuild
// (already a dependency; the LAV-25/LAV-17 precedent) and their real exports are executed. Every
// behavioural clause below is a call, not a substring.
//
// THE TWO MUTATION CONTROLS THE KICKOFF NAMES, and why each one discriminates:
//   • "an empty row must not produce a /5 string" -- reportCardLines(null) and
//     reportCardLines({runs_judged: 0}) are serialised whole and scanned for `/5`. A guard that
//     only checked `result.empty === true` would pass against a return that also carried
//     `"0.0/5"` in its dimensions, which is exactly the fabricated zero C-rejected-17/18 forbids.
//   • "a row with unknowns must print the unknown count" -- the unknown counts are asserted per
//     dimension against a row where they DIFFER (3, 12 and 0), so a helper that hardcoded one
//     value, or dropped the count entirely, fails. The 0 case is included on purpose: a count of
//     zero must print nothing rather than "0 of 12 unknown".
//
// AND ONE MORE THE KICKOFF DID NOT ASK FOR, because it is the failure this whole feature exists to
// avoid: groundedness's average is null on every card until LOG-143 (d) ships the by-id Library
// content read (part (a) Blocker B). The row below therefore carries avg_groundedness: null next to
// two real averages, and the assertion is that the dimension reads the word `unknown` -- not
// "0.0/5", and not silently omitted. A test that only fed it real averages could not tell the
// difference.
//
// ONE CALL PER TRACE is asserted by DRIVING the guard twice with the same id, and additionally by
// counting the call sites in source: the module-scope Set only holds if there is exactly one place
// that fires. The unawaited-call clause is the other half of "never on the answer path" -- an
// `await` in front of that call would make a judge outage a user-visible stall.

import assert from "assert";
import fs from "fs";
import path from "path";
import esbuild from "esbuild";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CHI_REL = "src/screens/MarketIntelligenceScreen.jsx";
const PERSONNEL_REL = "src/screens/PersonnelScreen.jsx";

const CAPABILITY_SLUG = "bench-report-card";
const INTENT_SLUG = "report-card-intent";
const JUDGE_AGENT = "owen";
const VIEW = "bench_report_card_rollup";

// The columns the panel names. Listed rather than `select=*` because the base table's grant is a
// column list and select=* 403s under one; the view has no visitor column, but naming columns is
// the habit the grants rule asks for either way.
const VIEW_COLUMNS = [
  "agent_id", "runs_judged", "avg_delegation_fit", "avg_groundedness",
  "avg_skill_use", "unknown_rate", "last_judged_at", "lowest_skill",
];

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Comments out, code left. Needed because both screens DOCUMENT the three task_context fields they
// deliberately omit, and a raw substring scan would fail the build for explaining the rule it obeys
// -- the same trap part (a)'s test recorded for its Library scan.
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function fromEnvLocal(key) {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return null;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() === key) return line.slice(eq + 1).trim() || null;
  }
  return null;
}

// Same stub/define shape LAV-25 arrived at the hard way: a real supabase client throws
// "supabaseUrl is required" at module load, and a bare node compile has no import.meta.env, so
// without both the module fails to LOAD and every assertion below silently never runs.
const stubSupabase = {
  name: "log143b-stub-supabase",
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])supabase\.js$/ }, () => ({
      path: "log143b-stub-supabase", namespace: "log143b-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "log143b-stub" }, () => ({
      contents: "export const supabase = { from: () => { throw new Error('stub'); } };", loader: "js",
    }));
  },
};

// BOTH screens are compiled in ONE build call, deliberately. Two sequential esbuild.build() calls
// left the service's libuv handle mid-close when selfRun() reached process.exit(), aborting the
// process with `!(handle->flags & UV_HANDLE_CLOSING)` AFTER it had already printed [PASS] -- a green
// line with exit code 127, which is precisely the vacuous-pass shape this suite exists to prevent.
// Measured on this tree: two builds -> exit 127 (esbuild.stop() did not help), one build -> exit 0.
// So the single-build shape is load-bearing, not tidiness; do not split it back apart.
async function loadScreens(rels) {
  const dir = fs.mkdtempSync(path.join(ROOT, "node_modules", ".log143b-"));
  try {
    await esbuild.build({
      entryPoints: rels.map(rel => path.join(ROOT, rel)),
      bundle: true, format: "esm", platform: "node", outdir: dir, outbase: path.join(ROOT, "src/screens"),
      loader: { ".js": "jsx", ".jsx": "jsx" },
      // Same stub/define shape LAV-25 arrived at the hard way (see its own header): without both,
      // the module fails to LOAD and every assertion below silently never runs.
      define: { "import.meta.env": "{}" },
      plugins: [stubSupabase],
      logLevel: "silent",
    });
    const mods = [];
    for (const rel of rels) {
      const out = path.join(dir, path.basename(rel).replace(/\.jsx$/, ".js"));
      mods.push(await import(pathToFileURL(out).href));
    }
    return mods;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export default async function run() {
  // ── SOURCE ARM: no credentials needed ────────────────────────────────────────
  const chiSrc = read(CHI_REL);
  const chiCode = stripComments(chiSrc);
  const personnelSrc = read(PERSONNEL_REL);
  const personnelCode = stripComments(personnelSrc);

  // 1. THE TRIGGER EXISTS AND IS SINGULAR. The judge is invoked with the capability, intent and
  //    holder part (a) actually shipped, from exactly one place.
  assert.equal(
    countOccurrences(chiCode, `capability_slug: "${CAPABILITY_SLUG}"`), 1,
    `${CHI_REL} must call the judge capability from EXACTLY one place (found ` +
    `${countOccurrences(chiCode, `capability_slug: "${CAPABILITY_SLUG}"`)}). A second call site is a ` +
    "second judge run per answer, and the module-scope Set cannot save a screen that asks twice " +
    "with two different traces."
  );
  assert.ok(chiCode.includes(`intent_slug: "${INTENT_SLUG}"`),
    `${CHI_REL} must invoke '${INTENT_SLUG}' -- the intent whose traits carry the report-card-write handler`);
  assert.ok(chiCode.includes(`agent_id: "${JUDGE_AGENT}"`),
    `${CHI_REL} must invoke the judge as '${JUDGE_AGENT}' (Owen Marsh holds bench-report-card; ` +
    "part (a) added no new agent)");

  // 2. FIRE-AND-FORGET, NEVER ON THE ANSWER PATH. One definition, one call, and the call is not
  //    awaited. `await gradeFinishedRun(` anywhere would put a ~10-30s judge turn in front of the
  //    user's answer.
  assert.equal(countOccurrences(chiCode, "gradeFinishedRun("), 2,
    "expected exactly two mentions of gradeFinishedRun( in code: its definition and one call site");
  assert.ok(!/await\s+gradeFinishedRun\(/.test(chiCode),
    `${CHI_REL} awaits the judge. A judge failure must not delay or alter the answer -- the call is ` +
    "deliberately not awaited on the answer path (kickoff Design Rule 1).");
  assert.ok(/catch\s*\([\s\S]{0,40}console\.error\(/.test(chiCode) && chiCode.includes("LOG-143"),
    "the judge call must swallow its own errors to the console rather than throwing into the answer path");

  // 3. THE TASK_CONTEXT CARRIES WHAT THE CLIENT ACTUALLY HOLDS, AND NOTHING IT DOES NOT.
  //    assembled_skill_slugs / retrieved_chunk_ids / self_reported_claims are written server-side
  //    (LOG-49 / the librarian rows) and never reach the browser. Passing an empty array or a zero
  //    for any of them would assert a fact the client cannot know, so the code must not name them
  //    at all -- an absent key is "not given", which the judge's rubric turns into `unknown`.
  for (const absent of ["assembled_skill_slugs", "retrieved_chunk_ids", "self_reported_claims"]) {
    assert.ok(!chiCode.includes(absent),
      `${CHI_REL} names '${absent}' in CODE. No src/ file can know that value -- it exists only on ` +
      "the server-side ai_activity_log row -- so any value passed for it is synthesised. Omit the " +
      "key and let the judge report the dimension as unknown (C-rejected-17/18).");
  }
  assert.match(chiCode, /task_context:\s*\{\s*trace_id:\s*traceId,\s*question,\s*answer,\s*hops\s*\}/,
    "the judge's task_context must be exactly the four fields the client genuinely holds");

  // 4. THE AUDIT PIPELINE LOG GAINS ONE LINE, through the existing row mechanism (no new panel).
  assert.ok(chiCode.includes('case "report_card"'),
    `${CHI_REL}'s describePipelineEvent() must have a real 'report_card' case, or the appended row ` +
    "renders blank -- the exact gap LOO-009c recorded for delegation_complete");
  assert.ok(chiCode.includes('buildHopEvent("report_card"'),
    "the line must be logged as a normal hop event, the same row style the log already uses");

  // 5. THE PANEL READS THE ROLLUP VIEW, and carries this session's Feature ID badge.
  assert.ok(personnelCode.includes(VIEW),
    `${PERSONNEL_REL} must read ${VIEW} -- the per-agent aggregate part (a) shipped for this panel`);
  assert.ok(personnelCode.includes('.from("bench_report_cards")'),
    `${PERSONNEL_REL} must also read the graded rows: the view carries unknown_RATE but no ` +
    "per-dimension unknown COUNT, and an average that ignores NULLs cannot be inverted into one");
  assert.ok(!/bench_report_cards[^)]*select\(\s*["']\*/.test(personnelCode),
    "bench_report_cards holds a column-list grant for the public key; select=* 403s under one");
  assert.ok(personnelCode.includes('FeatureBadge id="LOG-143"'),
    "STANDARDS.md Section 5 (Feature ID Badge Audit): the new card needs this session's badge");

  // ── BEHAVIOUR ARM: the real compiled helpers, called ────────────────────────
  const [chi, personnel] = await loadScreens([CHI_REL, PERSONNEL_REL]);

  // 6. ONE JUDGE CALL PER TRACE, EVER -- driven, not read.
  const seen = new Set();
  assert.equal(chi.shouldGradeTrace("trace-a", seen), true, "the first sight of a trace must grade it");
  assert.equal(chi.shouldGradeTrace("trace-a", seen), false,
    "THE CENTRAL CLAUSE: a second call for the same trace_id must be refused. A guard that checked " +
    "the Set without claiming the id would return true here and every run would be judged twice.");
  assert.equal(chi.shouldGradeTrace("trace-b", seen), true, "a different trace is still graded");
  assert.equal(chi.shouldGradeTrace("trace-b", seen), false, "and is refused on its own second call");
  // A run whose trace_id never arrived must not be graded against `undefined` (which would collide
  // every unidentified run onto one row).
  for (const bad of [null, undefined, "", 0, {}, []]) {
    assert.equal(chi.shouldGradeTrace(bad, seen), false,
      `a missing/non-string trace_id (${JSON.stringify(bad)}) must never be graded`);
  }

  // 7. THE LOG LINE'S COPY: unknown is the word, never a zero, and there is no blended figure.
  const fullLine = chi.reportCardLogSummary({ agent_name: "Marcus Webb", delegation_fit: 4, groundedness: null, skill_use: 3 });
  assert.ok(fullLine.includes("Marcus Webb"), "the line names the graded agent");
  assert.ok(fullLine.includes("fit 4/5") && fullLine.includes("skills 3/5"), `scored dimensions print n/5: ${fullLine}`);
  assert.ok(fullLine.includes("grounded unknown"),
    `a NULL dimension must print the word unknown, not 0/5: ${fullLine}`);
  assert.ok(!fullLine.includes("0/5"), `no dimension may be rendered as 0/5 when it is unknown: ${fullLine}`);
  const allUnknown = chi.reportCardLogSummary({ agent_name: "Marcus Webb", delegation_fit: null, groundedness: null, skill_use: null });
  assert.ok(!allUnknown.includes("/5"),
    `an all-unknown card must produce no /5 string at all: ${allUnknown}`);

  // 8. THE PANEL'S LINES. Empty first, because that is the branch a fabricated zero hides in.
  for (const emptyish of [null, undefined, {}, { runs_judged: 0 }, { runs_judged: null }]) {
    const view = personnel.reportCardLines(emptyish, []);
    assert.equal(view.empty, true, `${JSON.stringify(emptyish)} must render the empty branch`);
    assert.equal(view.emptyText, "No runs judged yet",
      "zero judged runs is a SENTENCE, not a number (C-rejected-17/18)");
    assert.ok(!JSON.stringify(view).includes("/5"),
      `MUTATION CONTROL: an empty rollup produced a /5 string somewhere in ${JSON.stringify(view)}. ` +
      "A card with nothing behind it must never show a score, and asserting only `empty === true` " +
      "would not have caught this.");
  }

  const row = {
    agent_id: "marcus", runs_judged: 12,
    avg_delegation_fit: "3.5", avg_groundedness: null, avg_skill_use: 4,
    unknown_rate: "0.41", last_judged_at: "2026-09-03T12:00:00Z",
    lowest_skill: "ci-answer-intent",
    unknown_counts: { delegation_fit: 3, groundedness: 12, skill_use: 0 },
  };
  const view = personnel.reportCardLines(row, [{ slug: "ci-answer-intent", name: "Channel Answer" }]);
  assert.equal(view.empty, false, "a rollup with 12 judged runs is not the empty branch");
  assert.equal(view.runsJudged, 12, "Runs judged comes straight off the view");
  assert.equal(view.dimensions.length, 3, "three dimensions, shown separately -- no blended score (C-rejected-27)");
  const byKey = Object.fromEntries(view.dimensions.map(d => [d.key, d]));

  assert.equal(byKey.delegation_fit.scoreText, "3.5/5", "a numeric-string average still renders as n/5");
  assert.equal(byKey.delegation_fit.unknownText, "3 of 12 unknown",
    "MUTATION CONTROL: a row with unknowns must print the unknown count beside the score");
  assert.equal(byKey.groundedness.scoreText, "unknown",
    "groundedness has no average until LOG-143 (d) ships the by-id Library content read -- it must " +
    "read `unknown`, never 0.0/5");
  assert.equal(byKey.groundedness.unknownText, "12 of 12 unknown",
    "and every one of the 12 runs is unknown on that dimension, which the panel says out loud");
  assert.equal(byKey.skill_use.scoreText, "4.0/5", "an integer average renders on the same scale");
  assert.equal(byKey.skill_use.unknownText, null,
    "a count of zero prints nothing -- '0 of 12 unknown' is noise dressed as a measurement");
  assert.equal(view.skillToImproveText, "ci-answer-intent — Channel Answer",
    "the Skill row to improve is the slug plus the name resolved from the Skill Profiles the screen lists");
  assert.equal(
    personnel.reportCardLines({ ...row, lowest_skill: null }, []).skillToImproveText, "none named yet",
    "no modal skill_to_improve is a sentence too, never a blank cell that reads as a missing fact");
  assert.equal(
    personnel.reportCardLines(row, []).skillToImproveText, "ci-answer-intent",
    "an unresolved slug is still shown -- it is what the judge named and what a Skill row is edited " +
    "by, so dropping it would hide the finding");

  // ── LIVE ARM: the rollup answers with the key that ships in the browser ─────
  const url = process.env.VITE_SUPABASE_URL || fromEnvLocal("VITE_SUPABASE_URL") || fromEnvLocal("SUPABASE_URL");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fromEnvLocal("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    notRun(
      "LOG-143b live rollup read",
      "no VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY available, so the one thing only a live call " +
      "can prove -- that the Personnel File's own public read of " + VIEW + " is not a 403 -- was " +
      "not checked. Re-run with .env.local present (canonical invocation: STANDARDS.md Section 2 rule 5)."
    );
    return;
  }
  const r = await fetch(`${url}/rest/v1/${VIEW}?select=${VIEW_COLUMNS.join(",")}&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  assert.equal(r.status, 200,
    `${VIEW} must answer the anon key (got ${r.status}). This is the panel's own read: a 403 here ` +
    "means every visitor sees an empty Report Card while the rows exist.");
  const rows = await r.json();
  // One tick of settle before this function returns, and it is not superstition. Measured on this
  // tree (Node v24.16.0, Windows): reading a fetch body and then reaching selfRun()'s process.exit(0)
  // aborts the process with `!(handle->flags & UV_HANDLE_CLOSING)` -- undici's keep-alive socket is
  // still closing -- AFTER [PASS] has already been printed. Exit 127 behind a green line is the
  // vacuous-pass shape this suite exists to prevent, and it reproduces in a 6-line script with no
  // esbuild and no assertions, so it is the environment, not this test. Proven both directions:
  // without this line exit 127 on three consecutive runs, with it exit 0. (Part (a)'s live arm never
  // hit it because it reads only `r.status` and never drains a body.) Harmless under run-all.js,
  // which imports rather than exits.
  await new Promise(res => setTimeout(res, 50));
  assert.ok(Array.isArray(rows), `${VIEW} must return a row array, got ${typeof rows}`);
  // Shape, not content: an empty table is a legitimate state (nothing judged yet), but a row that
  // arrives must carry the columns reportCardLines() reads, or the panel silently renders `unknown`
  // for a dimension that really was measured.
  if (rows.length) {
    for (const col of VIEW_COLUMNS) {
      assert.ok(col in rows[0],
        `${VIEW} returned a row without '${col}'. reportCardLines() reads that column by name.`);
    }
  } else {
    notRun(
      "LOG-143b rollup row shape",
      `${VIEW} is empty (no run judged yet), so the per-column shape check had no row to run ` +
      "against. The read itself returned 200, which is the grant fact this arm exists to prove."
    );
  }
}

selfRun(import.meta.url, run);
