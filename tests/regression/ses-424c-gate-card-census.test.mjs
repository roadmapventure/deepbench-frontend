// DeepBench v7.0.535 | tests/regression/ses-424c-gate-card-census.test.mjs | SES-424 slice 3
//
// AN ALL-GATED DRAIN IS NOT A FINISHED ONE. Slice 1 (v7.0.529, ses-424a) took a member carrying an
// undecided `gated_before_build` card out of `drain_epic_next`'s pick predicate. That left a hole
// this slice closes: the `v_pick IS NULL` census -- the block SES-196 built so a blocked drain is
// NEVER a silent empty -- had no bucket for the new rejection, so a list whose every open member
// was gated fell through to "none of them is flagged, delivered, blocked, gated, deferred,
// awaiting a scope rationale, out of scope or claimed - read the scope by hand". That sentence
// sends an unattended cycle to read a scope by hand over a population the function could name.
//
// WHAT THIS FILE GUARDS, and why each clause is a rule rather than a phrase: every one of them is
// carried in PROSE or in a stamp that a later editor can delete with nothing going red.
//
//  (A) the runbook states the rule in both of its homes -- step 5's buildable-CTE exclusion list
//      (E1) and the `blocked` outcome's "never a silent empty" paragraph (E2, which names the
//      census phrase verbatim), and the v7.0.517 rotation moved that stamp rather than dropping
//      it (SES-164 step 2: its four ZERO-hit facts were RELOCATED into step 7a's body, so the
//      body -- lines 6+, past the five stamps -- must still carry them).
//  (B) FILE-LEVEL NEGATIVE CONTROL, run rather than claimed: each (A) clause is re-tested against
//      its own one-edit breaks() mutation and must be RED there. A clause that still passes with
//      its own rule removed proves nothing (the SES-158 failure).
//  (C) is DECLARED NOT RUN, never quietly skipped -- see the notRun() call at the bottom.
//
// The PHRASE is deliberately looked for in the BODY, not in the whole file: this ship's own header
// stamp also contains it, so a whole-file match would go green on a runbook whose census rule had
// been deleted and whose stamp merely still described it.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_REL = "docs/runbooks/runner-cycle.md";
const SESSIONS_REL = "docs/SESSIONS.md";
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// Reflow-proof matching: the runbook is hard-wrapped, so a load-bearing phrase straddles a line
// break and a literal match fails for a reason that has nothing to do with the rule (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

// `tail -n +6`: the five header stamps are lines 1-5, and a fact that survives only in a stamp has
// not survived -- the next rotation deletes it.
export const body = s => s.split("\n").slice(5).join("\n");

// The census bucket's own words. ONE literal, read by the runbook clause and by the shipped
// function's assertion in migration ses424_gate_card_census -- two hand-copied literals drift.
export const PHRASE = "carrying an undecided gate card";

// The stamp this ship rotated out, and the slice that wrote it.
export const ROTATED = "<!-- DeepBench v7.0.517 | runbooks/runner-cycle.md";
export const ROTATED_FULL = "<!-- DeepBench v7.0.517 | runbooks/runner-cycle.md | SES-378 slice 7";
export const THIS_STAMP = "<!-- DeepBench v7.0.535 | runbooks/runner-cycle.md | SES-424 slice 3";
// LATER_STAMP is whichever ship stamped the runbook LAST, so it is line 1; this slice's own
// stamp only has to still be among the five. v7.0.602 (AGT-137, step 9's (7e)) rotated
// v7.0.520 out and took line 1 from v7.0.555 (AGT-86 slice 8b); v7.0.610 (AGT-133, step 9's (7f))
// rotated v7.0.531 out and took line 1 from v7.0.602.
export const LATER_STAMP = "<!-- DeepBench v7.0.610 | runbooks/runner-cycle.md | AGT-133";

// Each clause: {id, detail, test, breaks}. `test` reads the runbook; `breaks` is that clause's OWN
// smallest mutation of the runbook text. Green-after-mutation is a failure of THIS file.
export const CLAUSES = [
  {
    id: "step-5-excludes-a-gate-carded-member-from-the-buildable-list",
    detail:
      "step 5's buildable-CTE summary must name the gate card beside the other exclusions -- it is " +
      "the one place a cycle reads what the pick predicate already refuses, and an exclusion " +
      "missing from that list is one a cycle re-derives by hand (the SES-45 defect)",
    test: s => norm(body(s)).includes("and (`SES-424`) an undecided gate card"),
    breaks: s => s.replace("and (`SES-424`) an\nundecided gate card.", "and nothing else."),
  },
  {
    id: "the-blocked-outcome-names-the-census-phrase",
    detail:
      "the `blocked` outcome's paragraph must say that a gate-carded member is not work and that " +
      "`blocked_detail` COUNTS it, quoting the census phrase -- without the phrase the prose and " +
      "the function can drift apart and nobody finds out",
    test: s => {
      const n = norm(body(s));
      return n.includes(PHRASE)
        && n.includes("an all-gated list is not a finished drain");
    },
    breaks: s => s.replace(
      '`blocked_detail` counts it (*"carrying an undecided gate card"*): an all-gated list is not a\n  finished drain.',
      "it is skipped."),
  },
  {
    id: "the-v7-0-517-facts-were-relocated-not-dropped",
    detail:
      "SES-164 step 2: a rotated stamp's ZERO-hit facts must survive somewhere in the BODY. " +
      "v7.0.517's four had no other home (grep over lines 6+ read 0 for each), so step 7a now " +
      "carries the f3688e3e verdict, verifier.js:2115/:2131 and the four staff-watch KINDS",
    test: s => {
      const b = body(s);
      return ["f3688e3e", "verifier.js:2115", "KINDS"].every(f => b.includes(f));
    },
    breaks: s => s.replace("Verdict `f3688e3e`\n  (`v7.0.517`) opened with the lane phrase", "Verdict unrecorded"),
  },
  {
    id: "five-stamps-and-this-ship-is-the-first",
    detail:
      "session-hygiene check 7 caps the runbook at 5 header stamps, and this ship's own stamp must " +
      "be the first line -- a rotation that adds a sixth, or that files this slice below an older " +
      "ship, is the unbounded growth the check exists to stop; since v7.0.555 (AGT-86 slice 8b moved " +
      "step 4d to a pointer) a later ship's stamp is line 1 and this ship's stamp must still be " +
      "among the five",
    test: s => {
      const stamps = s.split("\n").filter(l => l.startsWith("<!-- DeepBench v"));
      return stamps.length === 5 && stamps[0].startsWith(LATER_STAMP) && stamps.some(l => l.startsWith(THIS_STAMP));
    },
    breaks: s => s.replace(THIS_STAMP, "<!-- DeepBench v7.0.535 | runbooks/runner-cycle.md | SES-999 slice 0"),
  },
  {
    id: "the-v7-0-517-stamp-left-the-runbook",
    detail:
      "the rotation is only real if the stamp is GONE from the runbook -- a fifth stamp still " +
      "present means the count above was met by dropping somebody else's",
    test: s => !s.includes(ROTATED),
    breaks: s => s.replace(THIS_STAMP, ROTATED + " | SES-378 slice 7 — re-added\n" + THIS_STAMP),
  },
];

function everyClauseHoldsOnTheShippedRunbook(md) {
  for (const c of CLAUSES) {
    assert.ok(c.test(md), `SES-424c clause "${c.id}" is not satisfied by the shipped runbook: ${c.detail}`);
  }
  return CLAUSES.length;
}

function everyClauseHasTeeth(md) {
  for (const c of CLAUSES) {
    const broken = c.breaks(md);
    assert.notStrictEqual(broken, md,
      `SES-424c clause "${c.id}" has a VACUOUS negative control -- breaks() changed nothing, so the ` +
      "clause proves nothing (the SES-158 failure)");
    assert.ok(!c.test(broken),
      `SES-424c clause "${c.id}" still passes with its own rule removed -- it is not discriminating`);
  }
}

// The rotation's other half, and it is a SEPARATE file: a stamp deleted instead of moved loses the
// only written record of that ship, and the runbook alone cannot tell the two apart.
function theStampLandedInSessionsVerbatim() {
  const sessions = read(SESSIONS_REL);
  assert.ok(sessions.includes(ROTATED_FULL),
    "the rotated v7.0.517 stamp must be in docs/SESSIONS.md VERBATIM, opening with its own ship's " +
    "slice line -- a stamp dropped instead of moved loses the only written record of that ship");
  assert.strictEqual(
    sessions.split(ROTATED).length - 1, 1,
    "exactly ONE copy of the v7.0.517 stamp belongs in docs/SESSIONS.md; a second is a re-run of " +
    "the rotation, not a record of it");
}

async function run() {
  const md = read(CYCLE_REL);
  const n = everyClauseHoldsOnTheShippedRunbook(md);
  everyClauseHasTeeth(md);
  theStampLandedInSessionsVerbatim();

  // (C) -- DECLARED, never inferred. SES-310's refusal, unchanged: pg_proc and pg_get_functiondef
  // are not reachable over PostgREST, so a Node test cannot read the shipped function body or call
  // drain_epic_next against a fixture without a service key and a write it would have to clean up.
  notRun(
    "SES-424c (C): the shipped public.drain_epic_next(uuid) body -- that exactly ONE overload " +
    "exists, that it contains the census phrase, and that a one-member drain whose only open " +
    "member carries an undecided gated_before_build card returns `blocked` naming that member " +
    "while the same list returns `pick` once the card is decided",
    "pg_proc, pg_get_functiondef and a fixture round-trip are not reachable over PostgREST " +
    "(SES-310's refusal, unchanged). Migration ses424_gate_card_census asserts all three in a " +
    "trailing DO block in the SAME transaction that wrote the function, and they were re-read " +
    "independently after it. Measured at this ship (2026-09-20, v7.0.535): pg_proc holds 1 " +
    "overload of public.drain_epic_next, identity (p_cycle_id uuid) -- UNCHANGED, no parameter " +
    "added or retyped (.claude/rules/supabase-function-signature.md); the phrase is present in " +
    `pg_get_functiondef; and the fixture replayed as one BEGIN/ROLLBACK read "1 named member(s) ` +
    `still open and none is claimable now; 1 ${PHRASE} (ZFIX-42499001)" with the card undecided ` +
    "and outcome `pick` on ZFIX-42499001 with it decided, leaving 0 fixture rows behind."
  );

  console.log(`[SES-424c] ${n} runbook clauses hold, each red under its own breaks(); the body ` +
    `(tail -n +6) carries the PHRASE "${PHRASE}", E1's gate-card exclusion and all three relocated ` +
    `v7.0.517 facts; 5 header stamps with v7.0.602 first and v7.0.535 present, v7.0.517 out of the runbook and present ` +
    `exactly once in ${SESSIONS_REL}`);
}

selfRun(import.meta.url, run);
export default run;
