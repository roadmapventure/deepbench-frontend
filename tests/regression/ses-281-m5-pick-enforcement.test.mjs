// DeepBench v7.0.363 | tests/regression/ses-281-m5-pick-enforcement.test.mjs | SES-281
//
// FEATURE: SES-281 -- Phase 2 of SES-280. Guards that M5-01 (structural epic fence), M5-02 (the
// filing lane, superseding B3), M5-07 (cheapest-first tiebreak) and M5-09 (a milestone's design
// gate blocks its own members) are EXECUTING in the pick path -- public.drain_epic_next(uuid) and
// public.prime_directive_queue() -- rather than merely recorded in the registry, which is all
// tests/regression/ses-280-m5-governance-rules.test.mjs can grade.
//
// TWO ARMS, AND THE SPLIT IS THE POINT.
//   * The DOC arm always runs. It reads the SES-281 amendment note in
//     docs/RUNNER-GOV-M5-REQUIREMENTS.md -- the canonical home for what the pick path now does and
//     what c_flagged now holds -- so the suite has real coverage in an unattended cloud cycle where
//     no credentials exist. The rule is READ OUT OF THE DOC, never restated here (John, 2026-08-23:
//     "you should never be throwing away tests"; the SES-275 / SES-218 / SES-196 precedent). A test
//     that copies the thing it guards passes forever while the shipped thing rots.
//   * The LIVE arm runs only with SUPABASE_URL + SUPABASE_SERVICE_KEY and is DECLARED not-run
//     otherwise (SES-180 notRun()), never silently skipped. It calls public.prime_directive_queue()
//     over PostgREST and grades the ORDER and MEMBERSHIP of what comes back.
//
// WHY prime_directive_queue AND NOT drain_epic_next. drain_epic_next has SIDE EFFECTS: it retires a
// fully-done drain directive and writes a runner_before_images row while doing it. A permanent
// regression test must never be able to close John's standing directive as a side effect of running
// (the same refusal SES-196 / SES-218 / SES-275 each recorded). prime_directive_queue is declared
// STABLE and writes nothing, and it is not a proxy: SES-281 gave both functions the SAME three
// ordering keys in the same precedence and the SAME M5-09 gate predicate, precisely so the page and
// the gate cannot disagree. The agreement itself is measured on the ship card, below.
//
// EVERY DOC CLAUSE IS PAIRED WITH A NEGATIVE CONTROL -- the same text with the one thing that should
// matter removed. "Would this still pass if the change did nothing?" must answer "no" for each.
// There is also a meta-assertion (aVacuousMutationFailsItsOwnControl), the SES-158 lesson: a control
// that changes nothing proves nothing, and only checking the control itself catches it.
//
// THE LIVE ARM REFUSES TO GRADE A BOARD THAT CANNOT SHOW THE RULE. Two of its checks are
// conditional on the board actually containing the situation the rule governs (both filing lanes
// populated; an epic with an unresolved gate and a non-gate member). Where the situation is absent
// the arm DECLARES that part not-run instead of passing vacuously -- an ordering assertion over rows
// that all sit in one lane is exactly the green-that-proves-nothing this suite keeps catching.
//
// DRY-RUN RESULT, measured against the UNCHANGED functions before migration
// ses281_m5_pick_enforcement was applied (STANDARDS.md Section 4): drain_epic_next's pick was
// `ORDER BY b.queue LIMIT 1` with c_flagged = ARRAY['needs-john','needs-desktop','john-paced'], and
// 7 open tickets carried 'john-paced'. So on unchanged state the live arm FAILS on lane order (the
// selfbuild lane came back in bare queue order, SES-288 at queue 4 first), FAILS the gate
// membership check (M5's members were served while SES-184 sat open), and FAILS the zero-john-paced
// and before-image counts; the doc arm fails outright because the amendment note did not exist.
//
// WHAT THIS FILE DOES NOT COVER, declared rather than implied -- see the notRun() at the foot: the
// function BODIES ship as a Supabase migration and live in the database, not this repo, and this
// suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CANONICAL_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";
const CANONICAL = path.join(ROOT, CANONICAL_REL);

const NOTE_START = "## Amendment note — `SES-281`";
const NOTE_END = "## Related registers and files";

// The filing-lane cut M5-02 selects on. Held here only so the live arm can BUCKET rows it read from
// the database; the ordering itself is never recomputed -- see monotonicity below.
export const LANE_CUT = Date.parse("2026-08-21T00:00:00Z");

// ---------------------------------------------------------------------------
// Pure readers
// ---------------------------------------------------------------------------

// Slice a bounded block out of a markdown file. Returns "" when absent -- itself a finding rather
// than a crash, since a checker that throws on a missing section reports nothing useful.
export function extractBlock(md, start, end) {
  const a = md.indexOf(start);
  if (a < 0) return "";
  const b = md.indexOf(end, a);
  return b < 0 ? md.slice(a) : md.slice(a, b);
}

// Markdown is hard-wrapped, so a load-bearing phrase can straddle a line break and a literal match
// fails for a reason that has nothing to do with the rule. Normalising runs of whitespace to one
// space makes every clause reflow-proof (the SES-194 lesson).
export const norm = s => s.replace(/\s+/g, " ");

export const amendmentNote = md => norm(extractBlock(md, NOTE_START, NOTE_END));

// ---------------------------------------------------------------------------
// The doc clauses. A clause earns its place only if REMOVING it would change what a cycle does.
// ---------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "four-script-rules-are-now-executing",
    detail:
      "the note must name all four rules that moved from recorded to executing, the migration that " +
      "moved them, and BOTH functions -- the Phase-split section above still says a `script` rule " +
      "is enforced by nothing, and a reader who stops there draws the wrong conclusion about the " +
      "live picker",
    test: s =>
      /M5-01/.test(s) && /M5-02/.test(s) && /M5-07/.test(s) && /M5-09/.test(s) &&
      /ses281_m5_pick_enforcement/.test(s) &&
      /drain_epic_next/.test(s) && /prime_directive_queue/.test(s),
    breaks: s => s.replace(/prime_directive_queue/g, "some other function"),
  },
  {
    id: "m5-06-and-m5-15-stay-recorded-only",
    detail:
      "the note must say M5-06 and M5-15 are NOT wired here and belong to SES-297 -- without it the " +
      "next reader takes 'the script rules now execute' as covering all of them and skips the " +
      "pre-boot check that actually answers 'should a session run at all'",
    test: s => /M5-06/.test(s) && /M5-15/.test(s) && /SES-297/.test(s) && /pre-boot/i.test(s),
    breaks: s => s.replace(/SES-297/g, "nobody in particular"),
  },
  {
    id: "filing-lane-selects-filed-at-never-created-at",
    detail:
      "the note must carry the lane cut date, the priority-lane/review-bucket split, `filed_at` " +
      "with an explicit NEVER `created_at`, the 68-day misdating that makes created_at wrong, and " +
      "B3's retirement -- an editor who reaches for created_at reintroduces the exact bug SES-295 " +
      "fixed, on the column the picker now decides with",
    test: s =>
      /2026-08-21/.test(s) &&
      /priority lane/i.test(s) &&
      /review bucket/i.test(s) &&
      /filed_at/.test(s) &&
      /never\W+`?created_at/i.test(s) &&
      /68[- ]day/.test(s) &&
      /\bB3\b/.test(s),
    breaks: s => s.replace(/never\W+`?created_at`?/i, "or created_at"),
  },
  {
    id: "tiebreak-is-nulls-last-and-only-breaks-ties",
    detail:
      "the note must state M5-07 as predicted_cycles ascending with NULLS LAST and say it changes " +
      "only ties -- nulls first would silently send every unestimated ticket to the front of its " +
      "lane, and a tiebreak believed to reorder classes is a licence to reorder classes",
    test: s =>
      /predicted_cycles/.test(s) && /nulls last/i.test(s) && /only ties/i.test(s),
    breaks: s => s.replace(/nulls last/i, "nulls first"),
  },
  {
    id: "a-gate-never-blocks-itself",
    detail:
      "the note must carry the self-exclusion (`g.id <> b.id`) AND the consequence of dropping it " +
      "-- a permanent deadlock in which the only ticket that could open the milestone sits behind " +
      "the gate it would open. This is the single edit that would brick M5, M6 and M7 at once",
    test: s =>
      /g\.id\s*<>\s*b\.id/.test(s) && /deadlock/i.test(s) && /never blocks itself/i.test(s),
    breaks: s => s.replace(/g\.id\s*<>\s*b\.id/, "g.id = b.id"),
  },
  {
    id: "gate-is-identified-by-title-not-scope-origin",
    detail:
      "the note must record the NAMED DEVIATION from the kickoff: scope_origin='original' was " +
      "measured and does NOT hold for SES-185 (M6) or SES-186 (M7), so requiring it would disable " +
      "M5-09 exactly where the rolling wave still has work. The shipped predicate is the title " +
      "pattern 'M_ design gate%' alone",
    test: s =>
      /scope_origin/.test(s) &&
      /pre-existing/.test(s) &&
      /SES-185/.test(s) && /SES-186/.test(s) &&
      /M_ design gate%/.test(s) &&
      /deviation/i.test(s),
    breaks: s => s.replace(/scope_origin/g, "some unrelated column"),
  },
  {
    id: "c-flagged-holds-needs-desktop-and-only-that",
    detail:
      "the note must state c_flagged's new contents, say WHY each of the two removals happened " +
      "(needs-john retired by M6-01; john-paced converted here, 7 rows, before-images under this " +
      "session name), and say needs-desktop STAYS because it is a physical constraint rather than " +
      "a judgment call -- an editor who reads the removals as 'flags are being dropped' drops that " +
      "one too and hands an unattended cycle work it cannot physically do",
    test: s =>
      /ARRAY\['needs-desktop'\]/.test(s) &&
      /needs-john/.test(s) && /M6-01/.test(s) &&
      /john-paced/.test(s) && /\bseven\b|\b7\b/i.test(s) &&
      /runner_before_images/.test(s) &&
      /design-drain-enforcement-0901/.test(s) &&
      /needs-decision/.test(s) &&
      /physical constraint/i.test(s),
    breaks: s => s.replace(/physical constraint/i, "another judgment call"),
  },
  {
    id: "measured-live-not-reasoned",
    detail:
      "the note must carry the live measurement rather than the intent: SES-184 returned as the " +
      "pick, the two functions AGREEING on it, and the SES-43-ahead-of-SES-288 lane inversion. " +
      "Without the evidence this is an opinion about a predicate instead of a result anyone can " +
      "re-verify -- and the inversion is the exact property the live arm below grades",
    test: s =>
      /SES-184/.test(s) &&
      /agree/i.test(s) &&
      /SES-43/.test(s) && /SES-288/.test(s) &&
      /inversion/i.test(s),
    breaks: s => s.replace(/SES-43/g, "some ticket"),
  },
];

function readDoc() {
  return fs.readFileSync(CANONICAL, "utf8");
}

function theShippedNoteIsClean() {
  const s = amendmentNote(readDoc());
  assert.ok(
    s.length > 0,
    `the SES-281 amendment note is missing from ${CANONICAL_REL} -- the four script rules are ` +
      "executing in the database with nothing in the repo saying so",
  );
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `${CANONICAL_REL} lost clause "${c.id}": ${c.detail}`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL: an absent note must be reported as a finding, not crash. This is the
// arm that fails on the pre-change doc, where the note does not exist at all.
function aMissingNoteIsFlagged() {
  assert.strictEqual(
    extractBlock("# a register with no amendment notes", NOTE_START, NOTE_END),
    "",
    "a missing SES-281 note must return '' so the caller reports it",
  );
}

function everyClauseHasTeeth() {
  const block = amendmentNote(readDoc());
  for (const c of CLAUSES) {
    const mutated = c.breaks(block);
    assert.notStrictEqual(
      mutated,
      block,
      `control for "${c.id}" changed NOTHING -- it cannot prove the clause has teeth (the SES-158 failure)`,
    );
    assert.ok(
      !c.test(mutated),
      `clause "${c.id}" still passes after its own control removed the thing it checks -- the check is vacuous`,
    );
  }
}

// META-ASSERTION: prove the control-checking above can itself fail, so a future no-op `breaks`
// cannot sail through everyClauseHasTeeth's first assert unexercised.
function aVacuousMutationFailsItsOwnControl() {
  const s = amendmentNote(readDoc());
  assert.throws(
    () => {
      const mutated = s;
      assert.notStrictEqual(mutated, s, "control changed NOTHING");
    },
    /control changed NOTHING/,
    "the vacuous-control detector must itself fail on a no-op mutation",
  );
}

// The SES-280 register test requires this file to carry exactly fifteen anchored rule sections and
// each rule's statement to match its registry row byte-for-byte. An amendment note that rewrote a
// statement, or introduced a sixteenth `### <a id="M5-nn">` heading, would break that test rather
// than this one -- which is the wrong place for the failure to surface. Assert it here too, where
// the edit was made.
function theAmendmentDidNotDisturbTheAnchoredRuleSections() {
  const lf = readDoc().replace(/\r\n/g, "\n");
  const anchors = [...lf.matchAll(/^###\s+<a id="(M5-\d\d)"><\/a>/gm)].map(m => m[1]);
  assert.strictEqual(
    anchors.length,
    15,
    `${CANONICAL_REL} carries ${anchors.length} anchored M5 rule sections, expected 15 -- the ` +
      "SES-281 amendment note must ADD prose, never a rule heading (ses-280 grades this too)",
  );
  assert.strictEqual(new Set(anchors).size, 15, "two M5 rule sections share an anchor id");
}

// ---------------------------------------------------------------------------
// Arm 2 -- live Supabase over PostgREST. Read-only and side-effect free.
// ---------------------------------------------------------------------------

const GATE_TITLE = /^M. design gate/i;   // the shipped predicate's `M_ design gate%`, as a regex
const FINISHED_GATE = "done";

async function pg(url, key, pathAndQuery, init) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} returned HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${pathAndQuery} returned a non-array payload`);
  return body;
}

const laneOf = filedAt => (filedAt && Date.parse(filedAt) < LANE_CUT ? 0 : 1);

async function theLivePickPathObeysTheFourRules() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm: prime_directive_queue()'s lane order, the M5-09 gate membership, the " +
        "zero-open-john-paced count and the seven conversion before-images",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "eight clauses of the SES-281 amendment note against the committed register. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
    return;
  }

  const items = await pg(
    url, key,
    "backlog_items?select=backlog_id,title,status,design_status,queue,filed_at,predicted_cycles,epic_id&limit=2000",
  );
  const epics = await pg(url, key, "epics?select=id,name&limit=500");
  const rows = await pg(url, key, "rpc/prime_directive_queue", { method: "POST", body: "{}" });

  assert.ok(items.length > 100, `backlog_items returned ${items.length} rows -- refusing to grade a truncated read`);
  assert.ok(rows.length > 0, "prime_directive_queue() returned nothing at all -- not even the board row");

  const epicName = new Map(epics.map(e => [e.id, e.name ?? ""]));
  const byRef = new Map(items.map(i => [i.backlog_id, i]));
  const lane = rows.filter(r => r.lane === "selfbuild");
  assert.ok(
    lane.length > 0,
    "the selfbuild lane came back empty -- either the Prime Directive is not standing or every " +
      "Selfbuild ticket is unbuildable; both are findings, not a pass",
  );

  // --- M5-02 + M5-07: the order the DATABASE returned is monotonic in (lane, queue, cycles).
  // Deliberately NOT a re-sort of the rows in JS: this asserts a property OF the returned order,
  // so a second implementation of the ordering cannot quietly agree with itself (SES-45).
  const key3 = ref => {
    const it = byRef.get(ref);
    assert.ok(it, `prime_directive_queue returned ${ref}, which is not in backlog_items`);
    return [laneOf(it.filed_at), it.queue, it.predicted_cycles ?? Number.MAX_SAFE_INTEGER];
  };
  let inversionsAgainstBareQueue = 0;
  for (let i = 1; i < lane.length; i++) {
    const a = key3(lane[i - 1].ref);
    const b = key3(lane[i].ref);
    const ordered = a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] <= b[2])));
    assert.ok(
      ordered,
      `the selfbuild lane is out of order at position ${i}: ${lane[i - 1].ref} ` +
        `[lane ${a[0]}, queue ${a[1]}, cycles ${a[2]}] precedes ${lane[i].ref} ` +
        `[lane ${b[0]}, queue ${b[1]}, cycles ${b[2]}]. M5-02 orders by filing lane FIRST, then ` +
        "queue, then M5-07's predicted_cycles nulls last",
    );
    if (a[1] > b[1]) inversionsAgainstBareQueue++;
  }

  // NON-VACUITY for the lane rule: monotonicity is satisfied trivially by bare queue order when
  // every pickable ticket sits in the same filing lane. Only claim the lane rule was OBSERVED when
  // the board could actually show it.
  const lanesPresent = new Set(lane.map(r => laneOf(byRef.get(r.ref).filed_at)));
  if (lanesPresent.size < 2) {
    notRun(
      "M5-02's lane precedence as an OBSERVED property",
      `every pickable Selfbuild ticket currently sits in filing lane ${[...lanesPresent][0]}, so a ` +
        "correctly-ordered result is indistinguishable from bare queue order. The monotonicity " +
        "check above still ran and still holds; it just cannot discriminate on today's board.",
    );
  } else {
    assert.ok(
      inversionsAgainstBareQueue > 0,
      "both filing lanes are populated, yet the returned order never puts a higher queue number " +
        "before a lower one -- that is bare queue order, which is what M5-02 replaced",
    );
  }

  // --- M5-09: a milestone's members are absent while its gate is unresolved; the gate itself is not.
  const gatesByEpic = new Map();
  for (const it of items) {
    if (it.epic_id && GATE_TITLE.test(it.title ?? "")) {
      const list = gatesByEpic.get(it.epic_id) ?? [];
      list.push(it);
      gatesByEpic.set(it.epic_id, list);
    }
  }
  const unresolvedGateEpics = new Set(
    [...gatesByEpic.entries()]
      .filter(([, gs]) => gs.some(g => g.status !== FINISHED_GATE))
      .map(([id]) => id),
  );

  for (const r of lane) {
    const it = byRef.get(r.ref);
    if (!unresolvedGateEpics.has(it.epic_id)) continue;
    assert.ok(
      GATE_TITLE.test(it.title ?? ""),
      `${r.ref} is served in the selfbuild lane while ${epicName.get(it.epic_id)}'s own design gate ` +
        "is unresolved, and it is not that gate -- M5-09 says a member is unpickable until the gate " +
        "is done",
    );
  }

  // ASSERT ON WHICH BRANCH FIRED, not merely that a set was empty (the LOO-013 lesson). A pass here
  // is only meaningful if some member was actually WITHHELD by the gate clause.
  const withheld = items.filter(
    it =>
      unresolvedGateEpics.has(it.epic_id) &&
      !GATE_TITLE.test(it.title ?? "") &&
      ["open", "partial"].includes(it.status) &&
      it.queue !== null &&
      !lane.some(r => r.ref === it.backlog_id),
  );
  const servedGates = lane.filter(r => GATE_TITLE.test(byRef.get(r.ref).title ?? ""));
  if (unresolvedGateEpics.size === 0) {
    notRun(
      "M5-09's gate block as an OBSERVED property",
      "no milestone currently has an unresolved design-gate ticket, so nothing can be withheld by " +
        "the gate clause and an empty withholding is not evidence of anything.",
    );
  } else {
    assert.ok(
      withheld.length > 0,
      `${unresolvedGateEpics.size} milestone(s) have an unresolved design gate, yet no queued ` +
        "member of any of them was withheld from the lane -- the M5-09 clause did not fire",
    );
    assert.ok(
      servedGates.length > 0,
      "every gate ticket was withheld along with its members -- the `g.id <> b.id` self-exclusion " +
        "is gone and the milestones that need a gate answered are now deadlocked behind it",
    );
  }

  // --- M6-01's missed human gate: nothing open still carries 'john-paced'.
  const openPaced = items.filter(
    it => it.design_status === "john-paced" && !["done", "delivered", "removed"].includes(it.status),
  );
  assert.strictEqual(
    openPaced.length,
    0,
    `${openPaced.length} open ticket(s) still carry design_status='john-paced' ` +
      `(${openPaced.map(i => i.backlog_id).join(", ")}). "Paced by John" is the ` +
      "blocking-on-a-human-decision M6-01 forbids; SES-281 converted them to 'needs-decision'",
  );

  // ...and 'needs-desktop' was NOT swept along with it. Without this the conversion above could be
  // satisfied by a blanket wipe of every design_status flag, which is the opposite of the rule.
  const openDesktop = items.filter(
    it => it.design_status === "needs-desktop" && !["done", "delivered", "removed"].includes(it.status),
  );
  assert.ok(
    openDesktop.length > 0,
    "no open ticket carries design_status='needs-desktop' any more -- SES-281 converts john-paced " +
      "ONLY; needs-desktop records a physical constraint and stays blocking",
  );

  // --- The conversion is reversible from the ledger, not from memory.
  // Filter on the CAPTURED design_status, not on the session name alone. The session that ran
  // this migration also writes before-images for its own ticket close-outs, so a bare session
  // count grades unrelated activity and goes red on a correct board -- found live 2026-09-01,
  // when SES-281's own close-out image made this a 8-vs-7 failure with nothing actually wrong.
  const allImages = await pg(
    url, key,
    "runner_before_images?select=pk_value,table_name,row_data&session_name=eq.design-drain-enforcement-0901&limit=100",
  );
  const images = allImages.filter(i => i?.row_data?.design_status === "john-paced");
  assert.strictEqual(
    images.length,
    7,
    `runner_before_images holds ${images.length} before-images capturing design_status='john-paced' ` +
      `for session design-drain-enforcement-0901 (out of ${allImages.length} total for that session), ` +
      "expected 7 -- one per converted ticket. Fewer means the conversion is not reversible for " +
      "every row it touched",
  );
  assert.ok(
    images.every(i => i.table_name === "backlog_items"),
    "a before-image for this conversion names a table other than backlog_items",
  );
}

async function run() {
  theShippedNoteIsClean();
  aMissingNoteIsFlagged();
  everyClauseHasTeeth();
  aVacuousMutationFailsItsOwnControl();
  theAmendmentDidNotDisturbTheAnchoredRuleSections();
  await theLivePickPathObeysTheFourRules();

  notRun(
    "the shipped bodies of drain_epic_next(uuid), prime_directive_queue() and drain_chain_gate(uuid), " +
      "and drain_epic_next's own return value",
    "the bodies ship as migration ses281_m5_pick_enforcement and live in the database, not this " +
      "repo; this suite reaches Supabase only over PostgREST, which cannot read pg_get_functiondef. " +
      "drain_epic_next is reachable only by INVOKING it, and invoking it can RETIRE a live drain " +
      "directive and write a runner_before_images row -- a permanent test must not be able to close " +
      "John's standing directive. Evidence recorded on the ship card, measured this session: with " +
      "comments stripped, none of the three bodies contains 'needs-john' or 'john-paced' and all " +
      "three contain 'needs-desktop'; exactly one overload of each of the three exists in pg_proc; " +
      "drain_epic_next returned pick=SES-184 while prime_directive_queue's drain lane returned " +
      "SES-184 too (the agreement property); and on a ROLLED-BACK fixture epic the lane, tiebreak " +
      "and gate arms each fired -- a pre-cut ticket at queue 900 was served ahead of a post-cut " +
      "ticket at queue 1, three same-queue tickets came back cheapest-first with the null-cycles " +
      "one last, an open gate withheld every member of its epic, and that gate itself stayed served.",
  );
}

selfRun(import.meta.url, run);
export default run;
