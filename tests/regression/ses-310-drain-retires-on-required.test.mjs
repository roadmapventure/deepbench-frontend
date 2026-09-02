// DeepBench v7.0.393 | tests/regression/ses-310-drain-retires-on-required.test.mjs | SES-310 (M6)
//
// A drain retires on the members the GATE ruled required, and the census says which. Before this
// shipped, drain_epic_next()'s RETIREMENT predicate counted every named member, so the M5 drain
// (238aa9ca, 18 named) returned `blocked` with all 9 of its milestone_required members done — three
// non-required, deferred members (DAT-25, SES-123, SES-82) held it open forever. A drain that cannot
// retire never fires step 8d's gate-review sweep, so directive 0970abad's succession never declares
// M6: the next milestone could not start on its own. Arms:
//
//   * DOC/SOURCE arm (always runs): the runbook's `retired` bullet must name the flag and this
//     ticket; the boundary paragraph at the SES-218 "THE EDIT THIS FORBIDS" passage must say WHY
//     reading milestone_required on the retirement side is not that forbidden edit (the flag is set
//     at a gate decision, never by a cycle's pick-time judgment); and the renderer must report a
//     REQUIRED finish line. Each assertion carries a negative control -- it is proven capable of
//     failing by mutating the text it reads (SES-158: a check that cannot fail is not a check).
//     Every control mutates GLOBALLY, never the first occurrence only: a first-occurrence control on
//     a phrase that appears twice still passes after its own mutation, which is the exact vacuity
//     SES-158 caught in this repo once already.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise -- never silently
//     skipped): recompute the finish line straight off the board over PostgREST and assert the
//     GENERATED block in docs/runbooks/standing-brief.md reports exactly that. This grades the
//     renderer against the live board.
//
// DELIBERATELY NOT RUN, and declared rather than omitted: the Postgres function body itself.
// PostgREST cannot read pg_get_functiondef, and INVOKING drain_epic_next() would retire a live drain
// and write a runner_before_images row -- the SES-196 / SES-218 / SES-275 refusal this repo has
// recorded three times. Behavioural evidence for the function is the design session's rolled-back
// fixture on the ship card, plus the post-migration assertions run over the MCP at ship time:
// exactly 1 overload, provolatile='v', EXECUTE to postgres + service_role only, and the retirement
// block with its comment lines stripped containing nothing but milestone_required and c_finished.
//
// Invocation: node tests/regression/ses-310-drain-retires-on-required.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const RENDERER_REL = "scripts/render-standing-brief.js";
const BRIEF_REL = "docs/runbooks/standing-brief.md";

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

async function pg(url, key, pathAndQuery) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${await res.text()}`);
  return res.json();
}

/**
 * The `retired` bullet ONLY. Scoping matters: `milestone_required` now appears in several places in
 * this runbook, so a whole-file grep would pass even if the bullet itself never mentioned it -- the
 * bullet is the thing a cycle reads to decide what retirement means.
 */
function retiredBullet(s) {
  const from = s.indexOf("- **`retired`** —");
  const to = s.indexOf("Five properties that are load-bearing");
  assert.ok(from !== -1, `${RUNBOOK_REL}: could not find the \`retired\` bullet in the Five-outcomes list`);
  assert.ok(to > from, `${RUNBOOK_REL}: could not find the end of the Five-outcomes list`);
  return s.slice(from, to);
}

/** The SES-218 "THE EDIT THIS FORBIDS: adding this clause to the RETIREMENT predicate" passage. */
function boundaryPassage(s) {
  const from = s.indexOf("**THE EDIT THIS FORBIDS: adding this clause to the RETIREMENT predicate.**");
  assert.ok(from !== -1, `${RUNBOOK_REL}: the SES-218 retirement-predicate FORBIDS passage is gone`);
  return s.slice(from, from + 4000);
}

const CLAUSES = [
  {
    id: "runbook-retired-bullet-names-the-required-set",
    rel: RUNBOOK_REL,
    scope: retiredBullet,
    test: s => /milestone_required/.test(s) && /SES-310/.test(s)
      && /every named member the gate ruled required/i.test(s),
    breaks: s => s.split("milestone_required").join("some_other_column"),
    detail: "the `retired` outcome bullet must say the finish line is the members the GATE ruled " +
      "required (`milestone_required`, SES-304) -- a cycle reading the old 'every named member' " +
      "wording would treat a complete milestone as unfinished work, which is the bug SES-310 fixed",
  },
  {
    id: "runbook-retired-bullet-keeps-the-fail-closed-half",
    rel: RUNBOOK_REL,
    scope: retiredBullet,
    test: s => /no such ruling, every named member/.test(s),
    breaks: s => s.split("no such ruling, every named member").join("no such ruling, nothing"),
    detail: "the bullet must ALSO state the fail-closed branch: a drain whose list carries no gate " +
      "ruling keeps the all-members rule. Without it a reader concludes an M0-M4-shaped drain can " +
      "retire on an empty required set, which would retire it instantly",
  },
  {
    id: "runbook-retired-bullet-says-non-required-members-stay-pickable",
    rel: RUNBOOK_REL,
    scope: retiredBullet,
    test: s => /not the finish line/.test(s) && /pickable/.test(s),
    breaks: s => s.split("not the finish line").join("not real work"),
    detail: "non-required and deferred members are NOT 'not work' -- they stay on the board and stay " +
      "pickable under Prime Directive 2(c) after the drain retires. A bullet that omits this reads " +
      "as if retirement deleted them",
  },
  {
    id: "boundary-paragraph-says-the-flag-is-set-at-a-gate-decision",
    rel: RUNBOOK_REL,
    scope: boundaryPassage,
    test: s => /SES-310/.test(s) && /gate decision/.test(s),
    breaks: s => s.split("gate decision").join("cycle's own pick-time judgment"),
    detail: "the passage that forbids moving a pick-side clause to the retirement side must record " +
      "why SES-310 is NOT that edit: milestone_required is set at a milestone's GATE DECISION, " +
      "never by a cycle's pick-time judgment, so retiring on it retires on the gate's word",
  },
  {
    id: "boundary-paragraph-keeps-pick-side-clauses-forbidden",
    rel: RUNBOOK_REL,
    scope: boundaryPassage,
    test: s => /[Pp]ick-side clauses still never move/.test(s),
    breaks: s => s.split("still never move").join("may now move"),
    detail: "the new paragraph must not be readable as a general licence. The four prior warnings " +
      "(SES-154, SES-196, SES-218, SES-305) still bind and the paragraph has to say so, or the next " +
      "cycle cites SES-310 as permission to move `delivered` across",
  },
  {
    id: "renderer-reports-a-required-finish-line",
    rel: RENDERER_REL,
    scope: s => s,
    test: s => /required members still open/.test(s) && /milestone_required/.test(s),
    breaks: s => s.split("required members still open").join("named members still open"),
    detail: "the standing brief's drain bullet must lead with requiredOpen-of-required and must read " +
      "milestone_required off the board row; reporting 'N of M named' is what made a complete M5 " +
      "look like 3 open members",
  },
  {
    id: "renderer-keeps-the-no-ruling-branch",
    rel: RENDERER_REL,
    scope: s => s,
    test: s => /drain\.required > 0/.test(s) && /milestone_required === true/.test(s),
    breaks: s => s.split("milestone_required === true").join("milestone_required"),
    detail: "the branch must key on `required > 0` and test the flag with === true. A truthiness " +
      "check cannot tell NULL from false, and the fail-closed branch depends on telling both from " +
      "true -- mirroring the function's own `IS TRUE` / `IS NOT TRUE` pair",
  },
];

async function run(ctx = {}) {
  const results = [];

  // ------------------------------------------------------- doc + source arm (always runs)
  const sources = new Map();
  for (const rel of [RUNBOOK_REL, RENDERER_REL]) sources.set(rel, read(rel));

  for (const c of CLAUSES) {
    const full = sources.get(c.rel);
    assert.ok(c.test(c.scope(full)), `${c.rel} lost clause "${c.id}": ${c.detail}`);
    // The control mutates the WHOLE file, then re-scopes -- so a mutation that only happens to miss
    // the scoped window is reported as a broken anchor rather than passing quietly.
    const mutated = c.breaks(full);
    assert.notStrictEqual(mutated, full,
      `control: mutation for "${c.id}" changed nothing -- the anchor text is not what this test believes`);
    assert.ok(!c.test(c.scope(mutated)),
      `control: clause "${c.id}" still passes after its own mutation -- the assertion cannot fail`);
    results.push(c.id);
  }

  // ------------------------------------------------------- live arm
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (recompute the drain's finish line off the board and grade the generated " +
      "standing-brief block against it)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over the MCP when this shipped " +
      "(2026-09-02): drain 238aa9ca carried 18 named members, 9 milestone_required, 0 required open " +
      "and 3 open non-required (DAT-25, SES-123, SES-82, all defer_status='yes'), so the generated " +
      "block reads '0 of 9 required members still open (18 named)'. Post-migration assertions: " +
      "exactly 1 drain_epic_next overload, provolatile='v', EXECUTE to postgres + service_role only, " +
      "and the comment-stripped retirement block naming nothing but milestone_required and " +
      "c_finished. The function was deliberately NOT invoked -- that would retire the live drain.",
    );
    return results;
  }

  const dirs = await pg(url, key,
    "runner_directives?select=id,epic_id,created_at&type=eq.drain-epic&status=eq.queued&order=created_at&limit=1");
  const brief = read(BRIEF_REL);

  // Design-session follow-up (2026-09-02, design-m6-build-0902): the block is re-rendered at every
  // SHIP, while a drain can be declared or retired between two ships -- the M7 drain 34600430 was
  // declared by the M6 gate review minutes after SES-313's push, and the verifier's snapshot read a
  // brief that still said "No drain standing". A brief that predates the live drain state proves
  // nothing about SES-310's wording either way, so that case is DECLARED not-run rather than failed;
  // the arm grades only a brief that describes the drain state the tables hold right now.
  const stale = reason => {
    notRun("the live generated-block arm",
      `docs/runbooks/standing-brief.md predates the live drain state (${reason}): the block is ` +
      "refreshed at the next ship (runner-cycle.md step 7 / session-setup.md step 4)");
    return results;
  };

  if (!Array.isArray(dirs) || !dirs[0]) {
    // No standing drain is a legitimate board state -- and then the block must SAY so rather than
    // carry a stale census. A brief still carrying a census here is stale, not wrong.
    if (!/No drain standing/.test(brief)) return stale("a drain retired since the last render");
    assert.ok(/No drain standing/.test(brief),
      "no queued drain-epic directive exists, but the generated block still reports a drain census " +
      "-- docs/runbooks/standing-brief.md is stale; re-run scripts/render-standing-brief.js");
    results.push("no-standing-drain-and-the-block-says-so");
    return results;
  }

  const d = dirs[0];
  const epicRows = await pg(url, key, `epics?select=name&id=eq.${d.epic_id}`);
  const epicName = Array.isArray(epicRows) && epicRows[0] ? epicRows[0].name : null;
  if (epicName && !brief.includes(`**${epicName}**`)) {
    return stale(`drain ${d.id.slice(0, 8)} on ${epicName} was declared since the last render`);
  }
  const scope = await pg(url, key, `runner_drain_scope?select=item_id&directive_id=eq.${d.id}&limit=1000`);
  const items = await pg(url, key,
    "backlog_items?select=id,backlog_id,status,milestone_required&limit=5000");
  const byId = new Map(items.map(r => [r.id, r]));
  const CLOSED = new Set(["done", "removed"]);
  // item_id is the FK and the ONLY thing joined on: backlog_id carries no unique constraint
  // (CHI-48 occupies two rows, SES-97), so joining on it silently pulls in both.
  const rows = scope.map(s => byId.get(s.item_id)).filter(Boolean);
  assert.strictEqual(rows.length, scope.length,
    `${scope.length - rows.length} runner_drain_scope row(s) name an item_id absent from the board ` +
    "projection -- the join base is wrong and every count below would be understated");

  const req = rows.filter(r => r.milestone_required === true);
  const reqOpen = req.filter(r => !CLOSED.has(r.status));
  const allOpen = rows.filter(r => !CLOSED.has(r.status));

  if (req.length > 0) {
    const m = /\*\*(\d+) of (\d+) required members still open\*\*/.exec(brief);
    assert.ok(m,
      `drain ${d.id.slice(0, 8)} carries ${req.length} milestone_required member(s), so the generated ` +
      "block must report a REQUIRED finish line -- it does not. Either the renderer was not re-run " +
      "or it fell into the no-ruling branch");
    assert.deepStrictEqual([Number(m[1]), Number(m[2])], [reqOpen.length, req.length],
      `the generated block reports ${m[1]} of ${m[2]} required members open; the live board says ` +
      `${reqOpen.length} of ${req.length} (${allOpen.length} of ${rows.length} named are open). ` +
      "Re-run scripts/render-standing-brief.js");
    results.push("generated-block-reports-the-live-required-finish-line");

    // And it must NOT be reporting the old all-members number under the new label -- the assertion
    // above would pass vacuously if reqOpen happened to equal allOpen, so this one only fires when
    // the two genuinely differ, which is the case the ticket exists for.
    if (allOpen.length !== reqOpen.length) {
      assert.ok(!new RegExp(`\\*\\*${allOpen.length} of ${rows.length} named members still open\\*\\*`).test(brief),
        "the generated block still carries the pre-SES-310 'N of M named members still open' bullet " +
        "alongside a ruled finish line -- the required branch did not take");
      results.push("generated-block-is-not-the-old-all-members-census");
    }
  } else {
    assert.ok(/named members still open/.test(brief),
      `drain ${d.id.slice(0, 8)} carries NO milestone_required member, so the generated block must ` +
      "keep the fail-closed 'named members still open' wording");
    results.push("no-gate-ruling-so-the-block-keeps-the-all-members-wording");
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
