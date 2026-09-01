// DeepBench v7.0.359 | tests/regression/ses-285-m6-autonomy.test.mjs | SES-285
//
// FEATURE: SES-285 -- guards the retirement of the card/tap judgment surface: the eight M6 rules
// (M6-01..M6-08) in public.governance_rules, the five rules retired outright (B13, B16, B23, B28,
// B29), the eight superseded (B7, B12, B14, B17, B24, B27, B34, B35), the three M5 statements
// amended in place (M5-09, M5-10, M5-14), and the migrated board state -- 33 needs-john tickets and
// 44 undecided cards.
//
// THE ASSERTION THAT MATTERS MOST IS THE ONE ABOUT WHAT DID **NOT** CHANGE. Assertion 4 pins B20
// and HR-MERGE (plus B5 and B39) as still `live`. A sweep that retires thirteen human gates is
// exactly the change most likely to over-reach into the fourteenth, and dev->main promotion is the
// one gate John's instruction did not touch. That assertion was ALREADY GREEN before this ticket
// existed, and that is the point: it is a guard, not a goal.
//
// TWO ARMS, AND THE SPLIT IS THE POINT -- the same shape SES-280 established for the M5 register.
//   * The SNAPSHOT arm always runs, reading docs/governance/RULES-SNAPSHOT.md, so the suite has
//     real coverage in an unattended cloud cycle with no credentials. It also proves the re-export
//     actually ran: an editor who writes the rows and forgets
//     `node scripts/export-governance-snapshot.js` fails here.
//   * The LIVE arm needs SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run otherwise
//     (SES-180 notRun()), never silently skipped. governance_rules is service_role-only (SES-174
//     locked anon/authenticated to ZERO privileges), so the anon key cannot substitute.
// Assertions 1-5 are graded by BOTH arms against the same code -- a disagreement between them IS
// the finding (a hand-edited snapshot, or a write that never got exported).
//
// ASSERTIONS 6 AND 7 ARE LIVE-ONLY, DECLARED RATHER THAN IMPLIED. They grade board and card state
// (public.backlog_items, public.runner_items), which has no committed repo-side render this test
// could read: docs/backlog/BACKLOG-SNAPSHOT.md carries neither `design_status` nor any runner_items
// row. Asserting them offline would mean asserting nothing, which is worse than saying so.
//
// THE READER FUNCTIONS ARE IMPORTED FROM THE SES-280 TEST, NOT RE-IMPLEMENTED. The snapshot's
// escaping contract has exactly one decoder in tests/ and one in scripts/check-session-docs.js; a
// third copy here would be SES-45's "a second implementation agreeing with itself", and a decoder
// that drifts grades the wrong strings and passes.
//
// DRY-RUN RESULT (STANDARDS.md Section 4). The kickoff measured, against unchanged
// origin/dev@8b402318 before it was committed: m6_rows=0, to_retire_still_live=5,
// to_supersede_still_live=8, boundary_live=2, m5_tap_strings=3, needs_john_open=33,
// undecided_cards=44. This session RE-MEASURED the same eight figures against live Supabase before
// writing a single row and got identical values. So assertions 1, 2, 3, 5, 6 and 7 FAILED and
// assertion 4 PASSED before the work existed -- the test discriminated, and the one green
// assertion was green precisely because it guards something that must not move.
//
// EVERY ASSERTION IS PAIRED WITH A NEGATIVE CONTROL -- the same data with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for each.
// There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), the SES-158 lesson: a
// control that changes nothing proves nothing, and only checking the control itself catches it.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied:
//   * The 72-hour reversal window is a RULE here, not a mechanism. No timer, expiry sweep or
//     reversal handle exists yet -- that is SES-286. Nothing below asserts a window elapsing.
//   * The `script` rules are RECORDED, not EXECUTABLE. This file guards that the rules are stored,
//     homed and consistent, never that any pick path or cycle obeys them.
//   * Twelve check-9 mentions of withdrawn rules survive in live voice in docs/runbooks/
//     (runner-cycle.md, briefing-page.md, gate-review.md). Those are card PROCEDURES, not
//     citations, and rewriting them needs SES-286's mechanism first; tracked as SES-289.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSnapshot } from "./ses-280-m5-governance-rules.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = path.join(ROOT, "docs/governance/RULES-SNAPSHOT.md");
const CANONICAL_REL = "docs/RUNNER-GOV-M6-REQUIREMENTS.md";
const CANONICAL = path.join(ROOT, CANONICAL_REL);

// SES-296 (v7.0.362) added M6-09..M6-13 — the execution-economics rules. Two-digit safe.
export const M6_IDS = Array.from({ length: 13 }, (_, i) => `M6-${String(i + 1).padStart(2, '0')}`);
export const RETIRED_IDS = ["B13", "B16", "B23", "B28", "B29"];
export const SUPERSEDED_BY = {
  B7: "M6-03", B12: "M6-04", B14: "M6-02", B17: "M6-05",
  B24: "M6-06", B27: "M6-06", B34: "M6-07", B35: "M6-07",
};
// B20/HR-MERGE are the kickoff's assertion 4. B5 (pin directives) and B39 (the .claude/ write
// gate) are retained for different reasons -- a pin is John giving direction, not John being a
// gate; B39 is a platform constraint, not a policy choice -- and the kickoff's section 6 forbids
// touching either, so they are pinned here too rather than left to a reader's memory.
export const RETAINED_LIVE = ["B20", "HR-MERGE", "B5", "B39"];
export const M5_AMENDED = ["M5-09", "M5-10", "M5-14"];
// The three strings the amendment existed to remove. Matched case-sensitively and verbatim,
// because that is how they appeared in the rows this ticket rewrote.
export const TAP_STRINGS = ["needs-john", "carded for John", "John's Accept"];
export const ENFORCEMENT_VALUES = new Set(["hook", "script", "prose", "reviewer"]);

// The exact prefix SES-285's migration wrote into every card it closed. Assertion 7 is scoped to
// THIS string and not to "cards decided today", and the difference is a real one measured live:
// two other gated cards (7d3b1fb3, the M4 gate review; 04d34757, the September budget outage) were
// decided by John and by the attended session on the same date, carry NO backlog_id by design, and
// would make a date-scoped assertion fail for something this migration never touched.
export const CLOSE_MARKER = "Closed by SES-285 (v7.0.359)";

// ---------------------------------------------------------------------------
// Pure reader for the M6 canonical doc.
//
// LINE ENDINGS ARE NORMALISED FIRST, and that is not tidying -- it is SES-280's measured lesson,
// repeated here because the same trap is one commit away: this repo's working tree is CRLF while a
// freshly authored file is LF on disk, so a pattern written as `\n+` matches during authoring and
// matches NOTHING once the file has been committed and checked back out (`\n\r\n>` is not `\n\n>`).
// SES-280 measured 15 sections before its commit and 0 after it, on byte-identical content.
// ---------------------------------------------------------------------------

export function parseCanonicalDoc(text) {
  const out = new Map();
  const lf = String(text).replace(/\r\n/g, "\n");
  const re = /^###\s+<a id="(M6-\d\d)"><\/a>[^\n]*\n+>\s(.+)$/gm;
  for (const m of lf.matchAll(re)) out.set(m[1], m[2].trim());
  return out;
}

// ---------------------------------------------------------------------------
// Assertions 1-5: graded over a plain array of rule rows, so the snapshot arm and the live arm run
// the SAME code.
// ---------------------------------------------------------------------------

export const RULE_ASSERTIONS = [
  {
    id: "1-eight-m6-rows-live-homed-and-byte-identical",
    detail:
      `all eight ids M6-01..M6-08 exist with status='live', enforcement in (hook, script, prose, ` +
      `reviewer), canonical_doc exactly ${CANONICAL_REL}#<its own id>, and a statement byte-for-byte ` +
      `equal to the blockquote under that anchor`,
    // Quantified over the EIGHT EXPECTED IDS, never over "whatever M6 rows happen to be here".
    // every() on a filtered set is vacuously true when the set is empty, so a pre-change snapshot
    // carrying no M6 rows at all would PASS the filtered form. SES-280 measured exactly that.
    test: (rules, doc) => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return M6_IDS.every(id => {
        const r = byId.get(id);
        return !!r
          && r.status === "live"
          && ENFORCEMENT_VALUES.has(r.enforcement)
          && r.canonical_doc === `${CANONICAL_REL}#${id}`
          && typeof r.statement === "string"
          && doc.get(id) === r.statement;
      });
    },
    breaks: rules =>
      rules.map(r => (r.id === "M6-05" ? { ...r, canonical_doc: `${CANONICAL_REL}#M6-04` } : r)),
  },
  {
    id: "2-five-rules-retired-and-not-quietly-superseded",
    detail:
      `${RETIRED_IDS.join(", ")} carry status='retired' with a NULL superseded_by. The null half is ` +
      `load-bearing: ck_governance_superseded ties superseded_by to status='superseded', and a ` +
      `retired rule that names a successor is claiming a replacement that was deliberately not written`,
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return RETIRED_IDS.every(id => {
        const r = byId.get(id);
        return !!r && r.status === "retired" && (r.superseded_by === null || r.superseded_by === undefined);
      });
    },
    breaks: rules => rules.map(r => (r.id === "B23" ? { ...r, status: "live" } : r)),
  },
  {
    id: "3-eight-rules-superseded-by-a-live-m6-rule",
    detail:
      "B7->M6-03, B12->M6-04, B14->M6-02, B17->M6-05, B24->M6-06, B27->M6-06, B34->M6-07, " +
      "B35->M6-07, each status='superseded' with superseded_by naming that rule AND that rule being " +
      "live in this same set. Naming a successor that does not exist is the failure a bare " +
      "not-null check would pass",
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return Object.entries(SUPERSEDED_BY).every(([id, succ]) => {
        const r = byId.get(id);
        const s = byId.get(succ);
        return !!r && r.status === "superseded" && r.superseded_by === succ && !!s && s.status === "live";
      });
    },
    breaks: rules =>
      rules.map(r => (r.id === "B34" ? { ...r, status: "live", superseded_by: null } : r)),
  },
  {
    id: "4-the-production-boundary-did-not-move",
    detail:
      `${RETAINED_LIVE.join(", ")} are all still status='live'. THIS IS THE ASSERTION THAT FAILS ` +
      "LOUDEST IF THE SWEEP OVER-REACHES: B20 and HR-MERGE keep dev->main under John's sign-off, " +
      "which is the one gate his instruction did not reach, and M6-08 restates it inside the M6 " +
      "register so it cannot be lost to an absence",
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return RETAINED_LIVE.every(id => byId.get(id)?.status === "live");
    },
    breaks: rules => rules.map(r => (r.id === "B20" ? { ...r, status: "retired" } : r)),
  },
  {
    id: "5-the-amended-m5-rules-carry-no-tap-strings",
    detail:
      `${M5_AMENDED.join(", ")} are still live and none of their statements contains ` +
      `${TAP_STRINGS.map(s => JSON.stringify(s)).join(", ")}. These three were written hours before ` +
      "SES-285 and encoded the very dependency it removed; they are AMENDED, never retired, so " +
      "'still live' is asserted alongside 'no longer names the withdrawn surface'",
    test: rules => {
      const byId = new Map(rules.map(r => [r.id, r]));
      return M5_AMENDED.every(id => {
        const r = byId.get(id);
        return !!r && r.status === "live" && typeof r.statement === "string"
          && !TAP_STRINGS.some(s => r.statement.includes(s));
      });
    },
    breaks: rules =>
      rules.map(r => (r.id === "M5-14" ? { ...r, statement: `${r.statement} Closes on John's Accept.` } : r)),
  },
];

// ---------------------------------------------------------------------------
// Assertions 6-7: live board and card state. Graded over a plain shape so they carry the same
// negative controls the rule assertions do.
//   state = { needsJohnOpen: [...ids], undecidedCards: [...ids], closedByMigration: [{id, backlog_id, resolves}] }
// ---------------------------------------------------------------------------

export const STATE_ASSERTIONS = [
  {
    id: "6-nothing-blocks-on-a-human",
    detail:
      "ZERO open backlog_items rows carry design_status='needs-john', and ZERO gated_before_build " +
      "runner_items rows are left with decision IS NULL. This is the discrimination assertion: it " +
      "grades the migration's OUTCOME on live rows, not the rule text that mandated it. Measured " +
      "before the work: 33 and 44",
    test: s => s.needsJohnOpen.length === 0 && s.undecidedCards.length === 0,
    breaks: s => ({ ...s, undecidedCards: [...s.undecidedCards, "a-card-nobody-decided"] }),
  },
  {
    id: "7-nothing-evaporated",
    detail:
      `every runner_items row whose decision_reason begins "${CLOSE_MARKER}" carries a backlog_id ` +
      "that RESOLVES to a real backlog_items row -- the proposal survives on a ticket rather than " +
      "dying with the card. Asserted on resolution, never on non-null: a backlog_id pointing at no " +
      "ticket is exactly the evaporation this guards against, and it satisfies a not-null check",
    test: s => s.closedByMigration.length > 0 && s.closedByMigration.every(r => r.resolves === true),
    breaks: s => ({
      ...s,
      closedByMigration: s.closedByMigration.map((r, i) => (i === 0 ? { ...r, resolves: false } : r)),
    }),
  },
];

function grade(assertions, data, extra, where) {
  for (const a of assertions) {
    assert.ok(a.test(data, extra), `[${where}] assertion "${a.id}" failed: ${a.detail}`);
  }
}

function everyAssertionHasTeeth(assertions, data, extra, where) {
  for (const a of assertions) {
    const mutated = a.breaks(data);
    assert.notStrictEqual(
      JSON.stringify(mutated),
      JSON.stringify(data),
      `[${where}] control for "${a.id}" changed NOTHING -- it cannot prove the assertion has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !a.test(mutated, extra),
      `[${where}] assertion "${a.id}" still passes after its own control broke the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyAssertionHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl(data) {
  assert.throws(
    () => {
      const mutated = data;
      assert.notStrictEqual(JSON.stringify(mutated), JSON.stringify(data), "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// ---------------------------------------------------------------------------
// Arm 1 -- the snapshot (always runs)
// ---------------------------------------------------------------------------

function theSnapshotCarriesTheRegistry(doc) {
  const text = fs.readFileSync(SNAPSHOT, "utf8");
  const rules = parseSnapshot(text);
  assert.ok(
    rules.length > 50,
    `docs/governance/RULES-SNAPSHOT.md parsed to ${rules.length} rows -- the reader is broken or the ` +
      "snapshot is truncated; regenerate with node scripts/export-governance-snapshot.js",
  );
  // Graded as its own arm because it checks the EXPORT rather than the registry: eight ids present
  // in the generated file is what proves the re-export actually ran.
  for (const id of M6_IDS) {
    assert.ok(
      rules.some(r => r.id === id),
      `${id} is missing from docs/governance/RULES-SNAPSHOT.md -- the rows were written but the ` +
        "snapshot was never re-exported (node scripts/export-governance-snapshot.js)",
    );
  }
  grade(RULE_ASSERTIONS, rules, doc, "snapshot");
  everyAssertionHasTeeth(RULE_ASSERTIONS, rules, doc, "snapshot");
  aVacuousMutationFailsItsOwnControl(rules);
  return rules;
}

// A missing or garbled input must be a loud finding, not a crash with an unhelpful message.
function aMissingInputIsReportedNotCrashed() {
  assert.deepStrictEqual(
    parseSnapshot("# a snapshot with no table at all"),
    [],
    "a snapshot with no table must parse to zero rows so the caller can report it",
  );
  assert.strictEqual(
    parseCanonicalDoc("# a doc with no anchored rules").size,
    0,
    "a canonical doc with no anchored rule sections must parse to an empty map",
  );
  // The CRLF trap, asserted rather than trusted -- see parseCanonicalDoc's header.
  assert.strictEqual(
    parseCanonicalDoc('### <a id="M6-01"></a>x\r\n\r\n> hello\r\n').get("M6-01"),
    "hello",
    "the canonical-doc reader must survive a CRLF checkout, which is what this repo checks out",
  );
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase (credential-gated, DECLARED when it cannot run)
// ---------------------------------------------------------------------------

const REST_COLUMNS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

async function rest(url, key, pathAndQuery) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

async function fetchLiveState(url, key) {
  const needsJohnOpen = await rest(
    url, key,
    "backlog_items?select=backlog_id&design_status=eq.needs-john&status=not.in.(done,delivered,removed)&limit=1000",
  );
  const undecidedCards = await rest(
    url, key,
    "runner_items?select=id&kind=eq.gated_before_build&decision=is.null&limit=1000",
  );
  const closed = await rest(
    url, key,
    `runner_items?select=id,backlog_id&decision_reason=like.${encodeURIComponent(CLOSE_MARKER)}*&limit=1000`,
  );
  // Resolution is checked by asking the board, one query for the whole set -- never by trusting
  // that a non-null backlog_id names something.
  const ids = [...new Set(closed.map(r => r.backlog_id).filter(Boolean))];
  const found = ids.length
    ? await rest(url, key, `backlog_items?select=backlog_id&backlog_id=in.(${ids.map(encodeURIComponent).join(",")})&limit=1000`)
    : [];
  const known = new Set(found.map(r => r.backlog_id));
  return {
    needsJohnOpen: needsJohnOpen.map(r => r.backlog_id),
    undecidedCards: undecidedCards.map(r => r.id),
    closedByMigration: closed.map(r => ({ id: r.id, backlog_id: r.backlog_id, resolves: known.has(r.backlog_id) })),
  };
}

async function theLiveRegistryAndBoardAgree(doc, snapshotRules) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: all five rule assertions against public.governance_rules, the " +
        "snapshot-vs-registry equality, and assertions 6 and 7 (the migrated backlog_items and " +
        "runner_items state), which have NO repo-side render and cannot be graded offline at all",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. governance_rules is service_role-only " +
        "(SES-174 locked anon/authenticated to ZERO privileges), so the anon key cannot substitute. " +
        "The snapshot arm above still ran and graded all five rule assertions against the committed " +
        "render. Canonical invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const live = await rest(url, key, `governance_rules?select=${REST_COLUMNS.join(",")}&limit=1000`);
  assert.ok(live.length > 50, `governance_rules returned ${live.length} rows -- refusing to grade a truncated read`);
  grade(RULE_ASSERTIONS, live, doc, "live registry");
  everyAssertionHasTeeth(RULE_ASSERTIONS, live, doc, "live registry");

  // THE ARM THAT ONLY EXISTS WITH BOTH SOURCES IN HAND: the snapshot is a pure render of the
  // registry, so any divergence means the file was hand-edited or a write never got exported.
  const norm = rs => JSON.stringify(
    [...rs].sort((a, b) => String(a.id).localeCompare(String(b.id)))
           .map(r => REST_COLUMNS.map(c => (r[c] === null || r[c] === undefined ? "" : String(r[c])))),
  );
  assert.strictEqual(
    norm(snapshotRules),
    norm(live),
    "docs/governance/RULES-SNAPSHOT.md does not match public.governance_rules -- the snapshot is " +
      "stale or was hand-edited. Regenerate: node scripts/export-governance-snapshot.js",
  );

  const state = await fetchLiveState(url, key);
  grade(STATE_ASSERTIONS, state, null, "live board");
  everyAssertionHasTeeth(STATE_ASSERTIONS, state, null, "live board");
}

async function run() {
  const doc = parseCanonicalDoc(fs.readFileSync(CANONICAL, "utf8"));
  assert.strictEqual(
    doc.size,
    M6_IDS.length,
    `${CANONICAL_REL} carries ${doc.size} anchored rule sections, expected ${M6_IDS.length} -- every ` +
      "rule must have exactly one anchored home, because that is what its canonical_doc points at",
  );

  aMissingInputIsReportedNotCrashed();
  const snapshotRules = theSnapshotCarriesTheRegistry(doc);
  await theLiveRegistryAndBoardAgree(doc, snapshotRules);
}

selfRun(import.meta.url, run);
export default run;
