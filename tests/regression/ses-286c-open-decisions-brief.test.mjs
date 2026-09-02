// DeepBench v7.0.396 | tests/regression/ses-286c-open-decisions-brief.test.mjs | SES-286 (c)
//
// OPEN DECISIONS ARE ON THE PAGE JOHN READS, WITH THE LINE THAT UNDOES EACH. Parts (a) (v7.0.394)
// and (b) (v7.0.395) gave a decision a row, an expiry and a handle and told the cycle where to
// record it; the handle then lived in a cycle's notes and a ticket description, neither of which
// John reads. Part (c) renders it into the standing brief's generated block — the one surface every
// attended session and John both read, regenerated at every ship (SES-265).
//
// FOUR ARMS, and what each does and does not prove is stated rather than implied:
//
//   1. SOURCE (always runs): scripts/render-standing-brief.js carries the `Open decisions` group,
//      READS runner_decisions, and puts reverse_decision( in the bullet. Three clauses, each with a
//      negative control that mutates the WHOLE file and re-scopes (SES-158: a check that cannot
//      fail is not a check; a first-occurrence control on a string that appears twice still passes
//      after its own mutation).
//   2. BEHAVIOUR on stubbed rows (always runs): renderBlock() is a pure function of (facts, nowIso),
//      so the empty branch, the non-empty branch, the absent-ledger branch, the FULL-uuid handle,
//      the CST expiry and the untrusted-summary escaping are all asserted here WITHOUT writing a
//      decision row. That refusal is deliberate and is the kickoff's own instruction: a permanent
//      test must never write the decision ledger, because a row written here would finalise on its
//      own 72 hours later and move the trust ladder.
//   3. REGRESSION ANCHOR (always runs): SES-177b's guarantee — only bytes BETWEEN the markers may
//      move — still holds with the new group in the block. Asserted the second way the kickoff
//      allows: splice a real render into the COMMITTED brief and compare head and tail
//      byte-for-byte, rather than re-running SES-177b's module (which mutates the file on disk and
//      would double every one of its own end-to-end refusals).
//   4. LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY; declared NOT RUN otherwise, never silently
//      skipped): spawn the real script with --check and require exit 0 — the block on disk matches
//      the tables at test time.
//
// WHAT ARM 4 PROVES: docs/runbooks/standing-brief.md's generated block is not stale against
// runner_decisions / runner_settings / backlog_items right now, because --check recomputes the
// facts sha from the live tables and compares it with the sha embedded in the file.
// WHAT ARM 4 DOES NOT PROVE, and is not permitted to: nothing about record_decision(),
// sweep_decision_windows() or reverse_decision() behaviour (part (a)'s rolled-back fixtures are that
// evidence), and nothing about the NON-EMPTY bullet against live rows — runner_decisions held 0 rows
// when this shipped (measured over the MCP 2026-09-02), so live coverage of the populated branch is
// structurally unavailable and arm 2's stubs are what cover it.
//
// Invocation: node tests/regression/ses-286c-open-decisions-brief.test.mjs
// (Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  BEGIN, END, JUDGMENT_SENTINEL,
  splitOnMarkers, spliceBlock, renderBlock, factsSha, shaFromBlock, summarise, cst,
} from "../../scripts/render-standing-brief.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RENDERER_REL = "scripts/render-standing-brief.js";
const M6_REL = "docs/RUNNER-GOV-M6-REQUIREMENTS.md";
const BRIEF_REL = "docs/runbooks/standing-brief.md";
const SCRIPT = path.join(REPO, RENDERER_REL);

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// A FIXED clock. renderBlock() takes the timestamp as an argument precisely so this is possible.
const T1 = "2026-09-02T19:39:00.000Z";
const T2 = "2026-09-03T04:05:00.000Z";

/**
 * The § Phase split section ONLY, sliced by its own headings. Scoping matters: `SES-286` and
 * `sweep_decision_windows` both appear elsewhere in a full-file grep of this register once the
 * amendment lands, so a whole-file test would pass even if the amendment were moved out of the
 * section whose claim it corrects.
 */
function phaseSplit(s) {
  const from = s.indexOf("## Phase split — what is and is not executable today");
  const to = s.indexOf("## Deliberately retained");
  assert.ok(from !== -1, `${M6_REL}: the "Phase split" heading is gone`);
  assert.ok(to > from, `${M6_REL}: could not find the end of the Phase split section`);
  return s.slice(from, to);
}

const CLAUSES = [
  {
    id: "renderer-carries-the-open-decisions-group",
    rel: RENDERER_REL,
    scope: s => s,
    test: s => /\*\*Open decisions\*\* — /.test(s) && /None open/.test(s),
    breaks: s => s.split("Open decisions").join("Some other heading"),
    detail: "the generated block must carry an `Open decisions` fact group with a stated empty " +
      "branch. Without it the reversal handle exists only in a cycle's notes and a ticket " +
      "description, which is where SES-286 (a)/(b) left it and is the gap (c) closes",
  },
  {
    id: "renderer-reads-the-decision-ledger",
    rel: RENDERER_REL,
    scope: s => s,
    test: s => /runner_decisions\?select=/.test(s) && /status=eq\.open/.test(s)
      && /reversal_window_hours/.test(s),
    breaks: s => s.split("runner_decisions").join("some_other_table"),
    detail: "fetchFacts() must READ runner_decisions for the open rows and take the window from " +
      "runner_settings.reversal_window_hours. A hardcoded 72 is the stale-number defect this whole " +
      "script exists against (SES-146: every cadence number is a column)",
  },
  {
    id: "renderer-puts-the-reversal-line-in-the-bullet",
    rel: RENDERER_REL,
    scope: s => s,
    test: s => /reverse_decision\('/.test(s),
    breaks: s => s.split("reverse_decision").join("some_other_function"),
    detail: "each bullet must carry the copyable `select public.reverse_decision(...)` line — the " +
      "block's entire purpose is that reverse is one line away on the page he already reads " +
      "(charter goal 5), not a query he has to compose",
  },
  {
    id: "m6-register-amendment-ends-the-phase-split",
    rel: M6_REL,
    scope: phaseSplit,
    test: s => /\*\*Amendment/.test(s) && /SES-286/.test(s) && /sweep_decision_windows/.test(s)
      && /superseded by this note|this note supersedes/.test(s),
    breaks: s => s.split("sweep_decision_windows").join("some_other_function"),
    detail: "the § Phase split section must carry the dated amendment naming SES-286 and the " +
      "functions that now execute those rules, and must say that the " +
      '"not yet enforced by any script" sentence is superseded. Left unamended, the register is ' +
      "the truth-drift the tripwire exists to catch, one layer up",
  },
];

// ---------------------------------------------------------------------------
// Arm 2 fixtures. Deliberately NOT a live read: writing a decision row from a permanent test would
// finalise on its own window and move the trust ladder.
// ---------------------------------------------------------------------------
const ITEMS = [
  { id: "i1", backlog_id: "SES-1", status: "open", design_status: null, queue: 1 },
  { id: "i2", backlog_id: "SES-2", status: "done", design_status: "designed", queue: null },
];
const SETTINGS = {
  id: 1, scheduler_on: true, interval_hours: 1, cron_minute: 40,
  grid_tolerance_min: 10, daily_max_tokens_millions: 196, reversal_window_hours: 72,
};
const OPEN = [
  {
    id: "3f2b9c11-aaaa-4bbb-8ccc-ddddeeeeffff",
    kind: "ticket-status",
    backlog_id: "SES-999",
    // Deliberately hostile: a backtick, a newline and more than 120 chars. runner_decisions.summary
    // carries no format constraint beyond NOT NULL and non-blank (SES-286a), so this is untrusted
    // text arriving on John's page, and a single stray backtick would open a code span early and
    // swallow the handle he came to copy.
    summary: "Re-tiered to `later`\nbecause the premise now depends on a post-Selfbuild cutover and "
      + "cannot gate this milestone at all, so the ticket waits",
    expires_at: "2026-09-05T19:39:00.000Z",
  },
  {
    id: "7a1d0000-1111-4222-8333-444455556666",
    kind: "removal",
    backlog_id: null,
    summary: "Premise failed revalidation twice consecutively",
    expires_at: "2026-09-06T02:05:00.000Z",
  },
];
const FACTS = (over = {}) => ({
  items: ITEMS,
  settings: SETTINGS,
  drain: null,
  decisions: { open: OPEN, finalWeek: 3, reversedWeek: 1 },
  ...over,
});

const bullets = block => block.split("\n").filter(l => /^- `[0-9a-f]{8}` · /.test(l));

function theEmptyBranchSaysNoneOpenAndTheCountsStillShow() {
  const block = renderBlock(FACTS({ decisions: { open: [], finalWeek: 3, reversedWeek: 1 } }), T1);
  assert.ok(/^- \*\*None open\.\*\*$/m.test(block),
    "an empty ledger must render '- **None open.**' — an omitted group reads as a missing feature");
  assert.strictEqual(bullets(block).length, 0, "an empty ledger must render no decision bullets");
  assert.ok(block.includes("3 final this week, 1 reversed this week"),
    "the counts line must render both numbers even with nothing open — the week's dispositions are " +
    "the whole record of what the mechanism did");
  assert.ok(/rolling 7 days/.test(block),
    "the counts line must LABEL its window. No Friday-07:00Z weekly-reset helper exists in this " +
    "file or anywhere in scripts/ (measured this session), so the window used is a rolling 7 days " +
    "and the block has to say which it used rather than letting 'this week' be read as a calendar week");
}

function eachBulletCarriesTheFullUuidAndACstExpiry() {
  const block = renderBlock(FACTS(), T1);
  const rows = bullets(block);
  assert.strictEqual(rows.length, OPEN.length,
    `expected one bullet per open decision (${OPEN.length}), got ${rows.length}`);

  for (const [i, d] of OPEN.entries()) {
    const line = rows[i];
    // THE HANDLE IS THE FULL UUID. A bullet that pasted the 8-char prefix into the call would hand
    // John a line that cannot run, which is worse than no line — it looks like one.
    assert.ok(line.includes(`select public.reverse_decision('${d.id}','John','<why>');`),
      `bullet ${i + 1} must carry the reversal line with the FULL uuid ${d.id}: ${line}`);
    assert.ok(line.startsWith(`- \`${d.id.slice(0, 8)}\` · ${d.kind} · `),
      `bullet ${i + 1} must lead with the 8-char prefix, the kind, then the ticket: ${line}`);
    assert.ok(line.includes(` · finalises ${cst(d.expires_at)} · `),
      `bullet ${i + 1} must state when it finalises, in labelled CST (John, 2026-08-20): ${line}`);
    assert.ok(/ CST · /.test(line), `bullet ${i + 1} must LABEL the timezone: ${line}`);
  }

  // Ordering is the table's (order=expires_at) and the block must not resort it.
  assert.ok(rows[0].startsWith("- `3f2b9c11`") && rows[1].startsWith("- `7a1d0000`"),
    "the bullets must keep the expires_at order the query asked for — soonest to finalise first");

  // A NULL backlog_id is an em dash, not the string "null" and not a blank column.
  assert.ok(rows[1].includes(" · — · "), `a decision with no ticket must render an em dash: ${rows[1]}`);

  // The hostile summary: collapsed to one line, truncated, and the code span still intact.
  assert.ok(!rows[0].includes("\n"), "a multi-line summary must collapse — one bullet is one line");
  assert.ok(!/`later`/.test(rows[0]),
    "a backtick inside an untrusted summary must not survive into the bullet — it would open a code " +
    "span early and swallow the reverse_decision handle");
  assert.strictEqual((rows[0].match(/`/g) || []).length % 2, 0,
    `the bullet's backticks must balance, or the trailing code span is broken: ${rows[0]}`);
  assert.ok(rows[0].includes("…"), "a summary over 120 chars must be visibly truncated");

  // summarise() itself, both directions, so the truncation rule is not only asserted through a render.
  assert.strictEqual(summarise("a b", 120), "a b");
  assert.strictEqual(summarise(""), "—", "a blank summary must render an em dash, never an empty cell");
  assert.strictEqual(summarise(null), "—", "a null summary must not throw");
  assert.ok(summarise("x".repeat(200)).length <= 120, "summarise must respect its cap");
  assert.strictEqual(summarise("a`b"), "a'b", "a backtick must be neutralised, not dropped silently");
}

function anAbsentLedgerIsNotNoneOpen() {
  // The SES-177b fixtures predate this ship and build facts with no `decisions` key at all, so this
  // branch is reachable. It must NOT report a zero it never measured — that is the stale-number
  // defect this script exists against, in the one place John would most trust it.
  const block = renderBlock(FACTS({ decisions: undefined }), T1);
  assert.ok(/was not read for this render/.test(block),
    "a render whose facts carry no decision ledger must SAY so");
  assert.ok(!/None open/.test(block),
    "an unread ledger must never be reported as 'None open' — those are different claims");
  assert.ok(!/final this week/.test(block),
    "an unread ledger must not render counts it never measured");
  assert.strictEqual(shaFromBlock(block), factsSha(FACTS({ decisions: undefined })).slice(0, 16),
    "the sha must still be computable with no decision ledger — the group is additive");
}

function aDecisionMovingChangesTheShaButAStampRefreshDoesNot() {
  const b1 = renderBlock(FACTS(), T1);
  const b2 = renderBlock(FACTS(), T2);
  assert.notStrictEqual(b1, b2, "the control is vacuous unless the two renders really differ");
  assert.strictEqual(shaFromBlock(b1), shaFromBlock(b2),
    "identical facts under different clocks must carry the SAME sha — otherwise --check reports " +
    "drift on every stamp refresh and is ignored within a day");

  // Each of the three things the kickoff requires in the payload, one variable at a time.
  const oneFewer = renderBlock(FACTS({ decisions: { open: [OPEN[0]], finalWeek: 3, reversedWeek: 1 } }), T1);
  assert.notStrictEqual(shaFromBlock(oneFewer), shaFromBlock(b1),
    "an open decision appearing or disappearing must move the sha");

  const movedExpiry = renderBlock(FACTS({
    decisions: {
      open: [{ ...OPEN[0], expires_at: "2026-09-07T19:39:00.000Z" }, OPEN[1]],
      finalWeek: 3, reversedWeek: 1,
    },
  }), T1);
  assert.notStrictEqual(shaFromBlock(movedExpiry), shaFromBlock(b1),
    "a changed expires_at must move the sha — the window is a fact John reads off this block");

  for (const over of [{ finalWeek: 4 }, { reversedWeek: 2 }]) {
    const moved = renderBlock(FACTS({ decisions: { open: OPEN, finalWeek: 3, reversedWeek: 1, ...over } }), T1);
    assert.notStrictEqual(shaFromBlock(moved), shaFromBlock(b1),
      `a changed ${Object.keys(over)[0]} count must move the sha`);
  }
}

// ---------------------------------------------------------------------------
// Arm 3 — SES-177b's guarantee, re-asserted with the new group in the block.
// ---------------------------------------------------------------------------
function onlyBytesBetweenTheMarkersMove() {
  const brief = fs.readFileSync(path.join(REPO, BRIEF_REL), "utf8");
  const [head0, , tail0] = splitOnMarkers(brief);

  const spliced = spliceBlock(brief, renderBlock(FACTS(), T1));
  const [head1, body1, tail1] = splitOnMarkers(spliced);
  assert.strictEqual(head1, head0,
    "the head must be byte-identical after splicing a block that carries the new Open decisions group");
  assert.strictEqual(tail1, tail0, "the tail must be byte-identical — the judgment paragraph lives there");
  assert.ok(tail1.includes(JUDGMENT_SENTINEL),
    "the hand-maintained judgment paragraph must survive the splice");
  assert.ok(/\*\*Open decisions\*\*/.test(body1), "the spliced block must actually contain the new group");

  // The control that gives the assertion teeth: a block smuggling a marker is refused, not written.
  // A decision summary is untrusted text, so this is not a hypothetical route into the block.
  assert.throws(() => spliceBlock(brief, `\n${END} smuggled\n`),
    /more than once|OUTSIDE the markers|round-trip/,
    "a block containing the END marker must be refused");
  assert.throws(() => spliceBlock(brief, `\n${BEGIN} smuggled\n`),
    /more than once|OUTSIDE the markers|round-trip/,
    "a block containing the BEGIN marker must be refused");

  // ...and the shipped brief must carry the group, not merely be capable of carrying it: the block
  // is regenerated at every ship, so a committed brief without it means the re-render never ran.
  const [, shipped] = splitOnMarkers(brief);
  assert.ok(/\*\*Open decisions\*\*/.test(shipped),
    `${BRIEF_REL}'s committed block has no Open decisions group — the re-render did not run`);
  assert.ok(/reversal_window_hours/.test(shipped),
    `${BRIEF_REL}'s committed block must name the window column it read`);
}

async function run(ctx = {}) {
  const results = [];

  // ------------------------------------------------------- arm 1: source + doc (always runs)
  const sources = new Map([[RENDERER_REL, read(RENDERER_REL)], [M6_REL, read(M6_REL)]]);
  for (const c of CLAUSES) {
    const full = sources.get(c.rel);
    assert.ok(c.test(c.scope(full)), `${c.rel} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(full);
    assert.notStrictEqual(mutated, full,
      `control: mutation for "${c.id}" changed nothing — the anchor text is not what this test believes`);
    assert.ok(!c.test(c.scope(mutated)),
      `control: clause "${c.id}" still passes after its own mutation — the assertion cannot fail`);
    results.push(c.id);
  }

  // ------------------------------------------------------- arm 2: behaviour on stubbed rows
  theEmptyBranchSaysNoneOpenAndTheCountsStillShow();
  eachBulletCarriesTheFullUuidAndACstExpiry();
  anAbsentLedgerIsNotNoneOpen();
  aDecisionMovingChangesTheShaButAStampRefreshDoesNot();
  results.push("stubbed-rows-empty-nonempty-absent-and-sha");

  // ------------------------------------------------------- arm 3: the SES-177b anchor
  onlyBytesBetweenTheMarkersMove();
  results.push("ses-177b-head-tail-guarantee-holds-with-the-new-group");

  // ------------------------------------------------------- arm 4: live --check
  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live arm (spawn `node scripts/render-standing-brief.js --check` and require exit 0 — the " +
      "generated block's facts still match runner_decisions / runner_settings / backlog_items)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent; run with --env-file-if-exists=.env.local or " +
      "export the two names read from public.runner_secrets. Measured over the MCP when this " +
      "shipped (2026-09-02): runner_settings.reversal_window_hours = 72 and runner_decisions held " +
      "0 rows, so the live block reads '- **None open.**' with '0 final this week, 0 reversed this " +
      "week', and --check returned exit 0 after the re-render. The POPULATED branch has no live " +
      "coverage at all and cannot have any from a permanent test — writing a decision row here " +
      "would finalise on its own window and move the trust ladder — so arm 2's stubs are its only " +
      "evidence, together with part (a)'s rolled-back fixtures for the functions themselves.",
    );
    return results;
  }

  // --worktree= is passed because the checklist names it and it is harmless; the script derives its
  // ROOT from its OWN path, so what actually makes this meaningful is that SCRIPT lives in the same
  // checkout this test read the brief from.
  let status = 0;
  let out = "";
  try {
    out = execFileSync(process.execPath, [SCRIPT, "--check", `--worktree=${REPO}`],
      { cwd: REPO, stdio: "pipe", env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key } })
      .toString();
  } catch (e) {
    status = e.status;
    out = `${e.stdout || ""}${e.stderr || ""}`;
  }
  assert.strictEqual(status, 0,
    `--check exited ${status} (1 = the block's facts no longer match the tables, so re-run the ` +
    `renderer; 2 = it COULD NOT RUN and is never a pass): ${out.trim()}`);
  assert.ok(/no drift/.test(out),
    `--check exited 0 but did not report 'no drift' — read its output rather than its status: ${out.trim()}`);
  results.push("live-check-clean-against-the-tables");

  return results;
}

selfRun(import.meta.url, run);
export default run;
