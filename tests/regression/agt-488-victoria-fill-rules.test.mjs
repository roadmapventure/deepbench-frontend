// DeepBench v7.0.863 | tests/regression/agt-488-victoria-fill-rules.test.mjs | AGT-488 -- THE FILL
// RULES ARE IN THE TWO ROWS SHE READS, AND JOHN'S OWN WORDING IS STILL THERE.
//
// WHAT IT GUARDS. `AGT-488`'s migration moved John's 2026-10-13 fill rules into the two
// `skill_profiles` rows the `requirement-check` capability assembles her duty from --
// `vc-prioritization-duty` (R1-R3) and `vc-john-severity-tree` (R4-R5) -- with five exact
// `replace()` substitutions and not one rewritten sentence. This test fails when a rule stops
// standing in the row that owns it, when a withdrawn instruction comes back, or when one of John's
// own sentences goes missing from the duty row.
//
// WHY TWO DIRECTIONS AND NOT ONE, which is the whole shape of the file. An "the new text is there"
// check passes on a wholesale rewrite that dropped half of John's 2026-10-09 wording, and a "his
// words are still there" check passes on a migration that did nothing. Arm A grades what ARRIVED,
// arm B grades what SURVIVED, and a change that fails either is red (pattern:166 -- a John rule is
// never removed or weakened without his words; pattern:162 -- grade the change, not the clock).
//
// MARKERS, NOT AN md5 OF THE METHOD (harvest §CALLS 4). The next ticket on this epic will
// legitimately add sentences to these rows, and an md5 pin would make every such ship red while
// saying nothing about whether the rules are present. Nine short literals say exactly that, and
// each is asserted EXACTLY ONCE in the row that owns it and ZERO times in the other -- "exactly
// once" because a `.includes()` check passes on a double-applied migration, and "zero in the other"
// because the duty row's rules must not leak into the tree's lanes or the reverse.
//
// ARMS.
//   A  LIVE. The nine markers, exactly once each in their own row and never in the other; and the
//      three withdrawn strings -- the "until the checker accepts 0" clause, the lane-A project name
//      and the duty row's "score the ticket 1" -- zero times in EITHER row.
//   B  LIVE, the other direction. Two of John's own sentences in the duty row, verbatim: his floor
//      ("always keep a top 10 tickets") and his bottom ("Never 1 or 2."). Rules were ADDED; no
//      wording of his was removed.
//   C  OFFLINE, zero network. `missingRules(method, markers)` -- the pure half -- names the absent
//      markers IN THE ORDER it was given them. Nine present gives `[]`; each of the nine held out in
//      turn is named alone, which is the control an "it returns an array" assertion would miss.
//   D  The checker takes 0, which is why R2 and R5 could withdraw "score it 1". The repo half runs
//      offline: both of `scripts/requirement-check.js`'s range tests admit 0. The LIVE half is
//      DECLARED NOT RUN with its evidence rather than skipped (pattern:77) -- see the note on it
//      below.
//
// ARM D'S LIVE HALF, named rather than silently passed. The kickoff asks this arm to read
// `pg_get_constraintdef` of `ck_backlog_need_score`. PostgREST exposes no reader for
// `pg_constraint` -- the only function in the schema that touches it is `capture_migration_down()`,
// a writer -- so from a test holding the service key the catalogue is unreachable. The two
// workarounds were both refused on purpose: adding an RPC is DDL this ticket does not carry
// (kickoff §3 -- no function, no code), and probing the CHECK with a real PATCH would mutate a live
// `backlog_items` row (pattern:76 -- a test run never mutates working data). So the arm declares
// the gap and carries the measurement taken over the MCP at this ship: `pg_get_constraintdef` read
// `CHECK (((need_score IS NULL) OR ((need_score >= 0) AND (need_score <= 5))))`, which admits 0.
//
// THE LIVE ROWS ARE READ THROUGH `scripts/victoria-rows-mirror.js`'s own `fetchRows()`, never a
// second hand-written PostgREST call: that script is where the four slugs and the recorded columns
// live (AGT-452), and a second copy of the read would rot away from it (pattern:93).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { fetchRows } from "../../scripts/victoria-rows-mirror.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

export const DUTY = "vc-prioritization-duty";
export const TREE = "vc-john-severity-tree";

// The nine markers of task 1, each against the row that owns it. R1-R3 put eight in the duty row;
// R4 puts the ninth in the tree row. R5 carries no marker of its own -- its proof is the absence of
// its own `<from>`, which is the second entry of WITHDRAWN below.
export const DUTY_MARKERS = [
  "TEN IS A FLOOR",
  "5s, then 4s, then 3s",
  "creation date is filed_at",
  "14 days or less: oldest first",
  "validated first (AGT-493)",
  "ONLY HER OWN GRADES",
  "score a parked ticket 0",
  "DUTY ROW WINS OVER THE RUNBOOK",
];
export const TREE_MARKERS = ["lane A names no project"];
export const ALL_MARKERS = [...DUTY_MARKERS, ...TREE_MARKERS];

// The three instructions this ticket WITHDREW, which must stand nowhere in either row.
//
// The second one is the LANE-A literal and not the bare `the mcp server`, deliberately and with its
// reason recorded here: the bare substring also stands inside John's own verbatim AGT-398 quotation
// in the tree row ("setting up the mcp server usage to scale correctly"), which AGT-488 must not
// touch (pattern:166). Asserting the bare form zero would demand the deletion of a quotation; this
// literal is the exact byte range R4 removes, so the tooth is the same and the quotation is safe.
export const WITHDRAWN = [
  "Until the checker accepts 0",
  '(today: "the mcp server")',
  "score the ticket 1",
];

// Two sentences of John's own, in the duty row, that AGT-488 must not have cost him.
export const JOHN_SENTENCES = ["always keep a top 10 tickets", "Never 1 or 2."];

export const CONSTRAINT_AT_SHIP =
  "CHECK (((need_score IS NULL) OR ((need_score >= 0) AND (need_score <= 5))))";

// Occurrences of `needle` in `haystack`. Exact substring, like Postgres `replace()`.
export function countOf(haystack, needle) {
  if (!needle) throw new Error("countOf(haystack, needle): `needle` must be a non-empty string");
  return String(haystack ?? "").split(needle).length - 1;
}

// The markers that are ABSENT from `method`, in the order they were given. Pure: no network, no fs,
// and it writes nothing. Returns `[]` when every marker stands at least once.
export function missingRules(method, markers = ALL_MARKERS) {
  const text = String(method ?? "");
  return (markers ?? []).filter(m => !text.includes(m));
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const credentialled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  const SKIP_HINT =
    "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, and the rules live in the DATABASE -- the repo " +
    "carries only a record of them, so no offline arm can stand in for this one. Run with " +
    "node --env-file-if-exists=.env.local tests/regression/run-all.js, or with the two secrets " +
    "exported inline by name from public.runner_secrets.";

  let methods = null;
  if (credentialled) {
    const { profiles } = await fetchRows();
    methods = new Map(profiles.map(p => [p.slug, p.method]));
    for (const slug of [DUTY, TREE]) {
      assert.ok(typeof methods.get(slug) === "string" && methods.get(slug).length > 0,
        `the live read returned a method for ${slug}`);
    }
  }

  // ---- A. LIVE: every rule arrived, in its own row, once ---------------------------------------
  if (!credentialled) {
    notRun("AGT-488 arm A — the nine fill-rule markers in the two live rows", SKIP_HINT);
  } else {
    await arm("A the nine markers, once each in the row that owns them", async () => {
      const duty = methods.get(DUTY), tree = methods.get(TREE);
      for (const m of DUTY_MARKERS) {
        assert.equal(countOf(duty, m), 1,
          `${DUTY} must carry ${JSON.stringify(m)} exactly once; it carries it ${countOf(duty, m)} time(s)`);
        assert.equal(countOf(tree, m), 0,
          `${JSON.stringify(m)} belongs to ${DUTY} and must not stand in ${TREE}`);
      }
      for (const m of TREE_MARKERS) {
        assert.equal(countOf(tree, m), 1,
          `${TREE} must carry ${JSON.stringify(m)} exactly once; it carries it ${countOf(tree, m)} time(s)`);
        assert.equal(countOf(duty, m), 0,
          `${JSON.stringify(m)} belongs to ${TREE} and must not stand in ${DUTY}`);
      }
      for (const w of WITHDRAWN) {
        assert.equal(countOf(duty, w), 0, `the withdrawn string ${JSON.stringify(w)} still stands in ${DUTY}`);
        assert.equal(countOf(tree, w), 0, `the withdrawn string ${JSON.stringify(w)} still stands in ${TREE}`);
      }
      assert.deepEqual(missingRules(duty, DUTY_MARKERS), [], "no duty-row rule is missing");
      assert.deepEqual(missingRules(tree, TREE_MARKERS), [], "no tree-row rule is missing");
      console.log(`    [AGT-488 arm A] ${DUTY} ${duty.length} chars, ${TREE} ${tree.length} chars, ` +
        `${ALL_MARKERS.length} markers once each, ${WITHDRAWN.length} withdrawn strings gone`);
    });
  }

  // ---- B. LIVE, the other direction: John's own sentences survived ------------------------------
  if (!credentialled) {
    notRun("AGT-488 arm B — John's own sentences still in the live duty row", SKIP_HINT);
  } else {
    await arm("B John's wording survived the five replacements", async () => {
      const duty = methods.get(DUTY);
      for (const s of JOHN_SENTENCES) {
        assert.ok(countOf(duty, s) >= 1,
          `${DUTY} must still carry John's own ${JSON.stringify(s)} -- AGT-488 ADDS rules and removes ` +
          "no wording of his (pattern:166)");
      }
      console.log(`    [AGT-488 arm B] ${JOHN_SENTENCES.length} of John's sentences still stand verbatim`);
    });
  }

  // ---- C. OFFLINE: missingRules() names what is absent, in order -------------------------------
  await arm("C missingRules names the absent markers in order, zero network", async () => {
    const synth = ms => ms.map(m => `prose before ${m} prose after.`).join("\n");

    assert.deepEqual(missingRules(synth(ALL_MARKERS), ALL_MARKERS), [],
      "nine markers present gives the empty list");

    // Each of the nine held out in turn is named ALONE. A function that returned every marker, or
    // the first one, or an empty list regardless, fails here -- which "it returns an array" cannot.
    ALL_MARKERS.forEach((held, i) => {
      const eight = ALL_MARKERS.filter((_, j) => j !== i);
      assert.equal(eight.length, 8, "eight of the nine");
      assert.deepEqual(missingRules(synth(eight), ALL_MARKERS), [held],
        `eight of nine names the ninth: ${JSON.stringify(held)}`);
    });

    // ORDER is the argument's order, not the text's: two held out come back in marker order.
    const [first, last] = [ALL_MARKERS[0], ALL_MARKERS[ALL_MARKERS.length - 1]];
    const middle = ALL_MARKERS.filter(m => m !== first && m !== last);
    assert.deepEqual(missingRules(synth([...middle].reverse()), ALL_MARKERS), [first, last],
      "the absent markers come back in the order they were given, whatever order the text is in");

    // An empty or absent method names every marker rather than throwing or passing vacuously.
    assert.deepEqual(missingRules("", ALL_MARKERS), ALL_MARKERS, "an empty method is missing all nine");
    assert.deepEqual(missingRules(null, ALL_MARKERS), ALL_MARKERS, "and so is no method at all");

    // The marker set itself: nine, distinct, and none a substring of another -- the property that
    // makes "exactly once in its own row" a meaningful count rather than an accident of overlap.
    assert.equal(ALL_MARKERS.length, 9, "nine markers in all");
    assert.equal(new Set(ALL_MARKERS).size, 9, "and all nine are distinct");
    for (const a of ALL_MARKERS) {
      for (const b of ALL_MARKERS) {
        if (a !== b) assert.ok(!a.includes(b), `${JSON.stringify(a)} must not contain ${JSON.stringify(b)}`);
      }
    }
  });

  // ---- D. The checker takes 0 -- the repo half offline, the catalogue half declared -------------
  await arm("D requirement-check.js admits need_score 0 at both of its range tests", async () => {
    const src = read("scripts/requirement-check.js");
    assert.equal(countOf(src, "score < 0 || score > 5"), 2,
      "both of requirement-check.js's range tests admit 0 (the writer's and the list's), so R2 and " +
      "R5 could withdraw the old score-it-1 instruction");
    assert.equal(countOf(src, "score < 1 || score > 5"), 0,
      "and neither still refuses 0");
    assert.ok(src.includes("need_score must be a whole number 0-5"),
      "the refusal message names the 0-5 range the rows now cite");
  });
  notRun("AGT-488 arm D (live half) — pg_get_constraintdef of ck_backlog_need_score",
    "PostgREST exposes no reader for pg_constraint (the only function in the schema that touches it " +
    "is capture_migration_down(), a writer), adding an RPC is DDL AGT-488 does not carry (kickoff " +
    "§3), and probing the CHECK with a real PATCH would mutate a live backlog_items row " +
    "(pattern:76). Measured over the MCP at this ship instead: pg_get_constraintdef read " +
    `${CONSTRAINT_AT_SHIP}, which admits 0, and 0 rows of backlog_items hold need_score 0 today. ` +
    "The repo half of this arm ran and passed above.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
