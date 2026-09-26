// DeepBench v7.0.610 | tests/regression/agt-133-run-tail-review.test.mjs | AGT-133 -- THE RUN TAIL
// REVIEWS ITSELF, AND THE RUNNER STOPS FILING WHAT IT JUDGED. (7e) (AGT-137) wrote findings that
// nothing read: 28 rows sat `open` with `ruling` NULL across 5 cycles on the day this shipped, and
// step 9's span held no audit-review.js line at all. This adds (7f) -- The Development Manager rules
// (7e)'s findings in the same tail, between (7d)/(7e) and (8)'s drain_chain_gate() -- plus step 7's
// mid-build fix-now-or-capture rule, the four surviving filing sites, and the deletion of every
// `push notification` the runbook instructed (JOHN-0925-NOTIFICATIONS-OFF).
//
// ARMS, each discriminating -- every one FAILS on origin/dev:
//   A  PURE (docs) -- step 9's span carries (7f) with `audit-review.js --prepare` and `--cycle-id`,
//      positioned AFTER (7e) and BEFORE (8). Pre-change: the span held no audit-review.js line, so
//      every clause fails. Each clause carries a mutation control, so a needle found anywhere else
//      in the file cannot satisfy it.
//   B  PURE (docs) -- runner-cycle.md <= 381,000 B (SES-336), exactly 5 stamps (check 7's cap),
//      ZERO `push notification` hits (5 on origin/dev), and cycle-card.md's generated sha256 header
//      matching the runbook it was rendered from. Plus the RESIDUE RATCHET below.
//   C  PURE (no network) -- routeGroup() on a `runner:cycle:*` finding returns precedence 30 with a
//      null project_slug instead of THROWING `unmapped source runner`. Pre-change the live table had
//      no `runner` row and the call threw, which stopped the whole review.
//   D  LIVE, READ-ONLY (service key) -- finding_routes carries the `runner` route, carries NO
//      catch-all, and `audit-review.js --prepare` for this ISO week exits 0 with a worklist whose
//      rows each name a source and a type. Nothing here writes.
//
// AGT-133's REPORTED RESIDUE, asserted as a ratchet rather than hidden (pattern:75 -- a gate's false
// green must be structurally impossible). The kickoff inventoried the runbook's pushes with
// `grep -c "push notification"` and named five sites. That phrase is now gone, but three further
// mechanisms still instruct a push to John under a different wording -- step 4a-bis's deploy-quota
// crossing, step 4a-quater's IP spend-gate block (built on John's verbatim `0f292cfa` design, which
// says the push channel IS the design) and the cadence alert. Converting those needs a per-site
// destination call and an amendment to a section quoting John verbatim, so AGT-133 REPORTED them
// instead of fixing them -- they are outside the kickoff's named sites. Arm B pins the count so the
// residue can only shrink: a NEW push added anywhere fails this test, and clearing the residue fails
// it too, in the direction that makes someone lower the pin on purpose.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSteps, runbookSha } from "../../scripts/render-cycle-card.js";
import { routeGroup } from "../../scripts/audit-review.js";
import { isoWeek } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const CARD_MD = path.join(ROOT, "docs", "runbooks", "cycle-card.md");
const REVIEW_JS = path.join(ROOT, "scripts", "audit-review.js");
const CYCLE_CEILING = 381000;
const STAMP_COUNT = 5;

// The residue AGT-133 reported rather than fixed. Lower this only by actually removing a push.
const PUSH_RESIDUE = 10;
const RESIDUE_RE = /push John|push channel|Send the push|re-push|one push per block|into a push/g;

const lf = t => String(t).replace(/\r\n/g, "\n");

// The text of one step from its own marker to the next step's, so a needle in step 4 cannot pass for
// one in step 9 (the ses-378h / agt-137 convention, same helper shape).
function stepSpan(md, label) {
  const lines = lf(md).split("\n");
  const steps = parseSteps(md);
  const i = steps.findIndex(s => s.label === label);
  assert.ok(i >= 0, `runner-cycle.md has no step **${label}.** marker`);
  const from = steps[i].line - 1;
  const to = i + 1 < steps.length ? steps[i + 1].line - 1 : lines.length;
  return lines.slice(from, to).join("\n");
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const md = lf(fs.readFileSync(CYCLE_MD, "utf8"));

  // --- A. (7f) is in step 9's span, between (7e) and (8) --------------------------------------------
  await arm("A (7f) in step 9 after (7e) before (8)", () => {
    const span9 = stepSpan(md, "9");
    assert.ok(span9.includes("**(7f)"), "step 9's span must carry the (7f) marker");
    assert.ok(span9.includes("audit-review.js --prepare"),
      "(7f) asks the manager through audit-review.js --prepare");
    assert.ok(/--apply=\S*answer\.json[^\n]*--cycle-id=/.test(span9),
      "(7f)'s --apply names --cycle-id, so the filing is attributed to THIS cycle");
    assert.ok(span9.includes("--week=$W"), "and the week it is reviewing");

    // ORDER, by index inside the span: (7e) then (7f) then (8)'s gate. The (8) anchor is the SECTION
    // HEADING, not a bare `**(8)` -- step 9's own overview paragraph cross-references `**(8)**` well
    // above the tail, and anchoring on that would compare (7f) against the wrong boundary.
    const i7e = span9.indexOf("**(7e)");
    const i7f = span9.indexOf("**(7f)");
    const i8 = span9.indexOf("**(8) A DRAINING CYCLE");
    assert.ok(i7e >= 0 && i7f >= 0 && i8 >= 0, `all three markers present in step 9 (${i7e}/${i7f}/${i8})`);
    assert.ok(i7e < i7f, "(7f) comes AFTER (7e) -- it rules what (7e) wrote");
    assert.ok(i7f < i8, "and BEFORE (8)'s drain_chain_gate(), so the review runs before the chain continues");
    assert.ok(span9.slice(i8).includes("drain_chain_gate"),
      "control: (8) really is the drain gate, so the ordering claim is about the right boundary");

    // It gates nothing.
    const block7f = span9.slice(i7f, i8);
    assert.ok(/never \*\*`gate_failed`\*\*|never `gate_failed`/.test(block7f),
      "(7f) never writes gate_failed -- a refusal is a notes line");
    assert.ok(/exit 3/.test(block7f), "and exit 3 (no findings) costs nothing");
    assert.ok(/review-audit-worklist:dm-audit-review-intent:depth1/.test(block7f),
      "the manager call is logged with its §19k feature string");
    assert.ok(!/claude-opus-5|claude-fable|claude-sonnet/.test(block7f),
      "and names NO hardcoded model id -- the model is what agent-prompt.js prints (AGT-147)");

    // CONTROL: the span, not the file. (7f) must not be satisfiable from another step's text.
    assert.ok(!stepSpan(md, "8").includes("**(7f)"),
      "control: step 8's span does not carry (7f), so the span reader is reading step 9");
    // CONTROL: a mutation that deletes (7e) breaks the ordering claim rather than passing it.
    const without7e = span9.replace("**(7e)", "**(xx)");
    assert.ok(without7e.indexOf("**(7e)") === -1 && without7e.indexOf("**(7f)") >= 0,
      "control: the ordering assertions read distinct markers, so deleting (7e) fails arm A");
  });

  // --- B. the size, the stamps, the pushes, the card's pin, the residue ratchet ---------------------
  await arm("B bytes, stamps, zero pushes, card pin", () => {
    const bytes = Buffer.byteLength(md, "utf8");
    assert.ok(bytes <= CYCLE_CEILING,
      `runner-cycle.md is ${bytes} B against SES-336's ${CYCLE_CEILING} B ceiling -- this edit had to free bytes before adding any`);

    const stamps = md.split("\n").filter(l => l.startsWith("<!-- DeepBench v")).length;
    assert.equal(stamps, STAMP_COUNT,
      `check 7 caps the header at ${STAMP_COUNT} stamps; got ${stamps} -- a rotation drops one as it adds one`);
    assert.ok(md.startsWith("<!-- DeepBench v7.0.610 |"), "this version's stamp leads the header");
    assert.ok(!md.includes("v7.0.531 | runbooks/runner-cycle.md"),
      "v7.0.531's stamp was the one DROPPED by this rotation");
    // SES-164 step 2: its zero-hit facts were RELOCATED into the body, not lost with the stamp.
    assert.ok(md.includes("ses-423b-stall-signal"), "v7.0.531's guard-test fact relocated into the body");
    assert.ok(/13 `stall_notified_at` rows/.test(md) && /9 ended `shipped`/.test(md),
      "and its stall measurement, which was the evidence for probe (d)'s heartbeat reading");
    assert.ok(md.includes("15.27M"), "and SES-409's measurement behind est_tokens_* being measured, not estimated");

    const pushes = (md.match(/push notification/g) ?? []).length;
    assert.equal(pushes, 0,
      `the runbook instructs NO push notification (JOHN-0925-NOTIFICATIONS-OFF); found ${pushes}`);
    // CONTROL: the counter detects a push that is there.
    assert.equal(((md + "\nsend one push notification").match(/push notification/g) ?? []).length, 1,
      "control: the zero-push assertion detects a push notification that is present");
    // Step 1 notifies nothing; 0b reports in its row.
    assert.ok(!/tell John's phone/.test(stepSpan(md, "1")), "step 1 no longer tells John's phone anything");
    assert.ok(/runner_decisions/.test(stepSpan(md, "0b")), "0b reports a silent predecessor in a row");

    // THE RESIDUE RATCHET -- see the header. Reported, not fixed; it may only shrink. Counted over the
    // BODY only: the version stamps legitimately DESCRIBE the residue ("4a-quater still says push John
    // once"), and counting that description as an instruction would make documenting the gap fail the
    // gate that exists to keep the gap visible.
    const body = md.split("\n").filter(l => !l.startsWith("<!-- DeepBench v")).join("\n");
    const residue = (body.match(RESIDUE_RE) ?? []).length;
    assert.equal(residue, PUSH_RESIDUE,
      `AGT-133 reported ${PUSH_RESIDUE} remaining push-to-John lines (4a-bis, 4a-quater, the cadence alert) rather than ` +
      `fixing them -- they sit outside the kickoff's named sites. Found ${residue}: a NEW push was added, or the ` +
      `residue was cleared and this pin must come DOWN in the same change.`);

    // THE FILING SITES. The runner's judgment filing stopped; four deterministic sites remain, and the
    // rule-body sentence names them. m7-ledger-and-card-idiom no longer asserts this sentence exists
    // (its needle was the retired step-4b idiom AGT-133 deleted), so it is asserted here instead.
    // The sentence WRAPS across source lines, so read a window from its opening rather than one line.
    const fi = md.indexOf("to every filing site");
    assert.ok(fi >= 0, "the filing-site rule-body sentence is still present");
    const filing = md.slice(fi, fi + 420);
    assert.ok(/exactly four/.test(filing), "and says how many sites remain, so a fifth cannot be added silently");
    for (const site of ["2b", "6", "8b", "8b-bis"]) {
      assert.ok(filing.includes(site), `the surviving site ${site} is named in the filing-site sentence`);
    }
    assert.ok(!filing.includes("step 4b's invention card"),
      "and step 4b is no longer named a filing site -- the Researcher left the cycle at AGT-138");
    assert.ok(/only The Development Manager files tickets|only \*\*The Development Manager files tickets\*\*/.test(md),
      "the runbook states the boundary: anyone reports, only the manager files");
    assert.ok(/ingestFindings/.test(md), "and names the finding path that replaced the cycle's own filing");

    // The card is a VIEW: its generated header pins the runbook it was rendered from.
    const card = lf(fs.readFileSync(CARD_MD, "utf8"));
    const m = card.match(/sha256 ([0-9a-f]+)/);
    assert.ok(m, "the card's generated header carries the runbook sha256 it was rendered from");
    assert.equal(m[1], runbookSha(md),
      `the card was re-rendered from THIS runbook (header ${m?.[1]} vs runbook ${runbookSha(md)}) -- ` +
      `a stale card means the Development Manager is assembled from a procedure that is not the committed one`);
  });

  // --- C. routeGroup() routes a runner finding instead of throwing ----------------------------------
  await arm("C routeGroup routes runner:cycle", () => {
    // The live table's shape, as --prepare reads it: the runner row is what AGT-133 needs present.
    const routes = [
      { precedence: 10, source: "*", finding_type: "security", project_slug: "security" },
      { precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
      { precedence: 30, source: "runner", finding_type: "*", project_slug: null },
    ];
    const wl = [{ id: "r1", found_by: "runner:cycle:809afd1d-0042-49ac-a79f-d807876e96d6", finding_type: "defect" }];

    const r = routeGroup({ kind: "root-cause", finding_ids: ["r1"] }, wl, routes);
    assert.equal(r.precedence, 30, "a runner finding routes at precedence 30");
    assert.equal(r.project_slug, null, "with a null project_slug -- The Development Manager picks the project");
    assert.equal(r.source, "runner", "on the runner row, not a catch-all");

    // PRE-CHANGE CONTROL: without the runner row this THREW, which stopped the whole review.
    assert.throws(() => routeGroup({ kind: "root-cause", finding_ids: ["r1"] }, wl, routes.slice(0, 2)),
      /unmapped source runner/,
      "control: with no runner row the call throws `unmapped source runner` -- that was the pre-change behaviour");
    // And a security finding from the runner still outranks the runner row.
    const sec = [...wl, { id: "s1", found_by: "runner:cycle:x", finding_type: "security" }];
    assert.equal(routeGroup({ kind: "root-cause", finding_ids: ["r1", "s1"] }, sec, routes).project_slug, "security",
      "a group holding one security finding is a Security ticket however it was grouped");
  });

  // --- D. live, read-only: the route row and a working --prepare ------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-133 arm D (live half) -- SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the runner route row and --prepare's exit 0 are unverified here");
  } else {
    await arm("D live route row and --prepare", async () => {
      const res = await fetch(`${url}/rest/v1/finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      assert.equal(res.status, 200, `finding_routes read -> HTTP ${res.status}`);
      const rows = await res.json();

      const runner = rows.filter(r => r.source === "runner");
      assert.equal(runner.length, 1, `exactly one runner route; got ${JSON.stringify(runner)}`);
      assert.equal(runner[0].precedence, 30, "the runner routes at precedence 30");
      assert.equal(runner[0].finding_type, "*", "for every finding type");
      assert.equal(runner[0].project_slug, null, "with the project left to The Development Manager");

      assert.ok(!rows.some(r => r.source === "*" && r.finding_type === "*"),
        "there is deliberately NO catch-all row: an unmapped source must still stop a review");
      // The security row must still outrank everything, or the precedence claim is vacuous.
      const sec = rows.find(r => r.source === "*" && r.finding_type === "security");
      assert.ok(sec && sec.precedence < 30, "a security finding still outranks the runner row");

      // --prepare for THIS week exits 0 and carries a real worklist. Read-only: it writes one file.
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt133-"));
      const ctxPath = path.join(tmp, "ctx.json");
      const week = isoWeek(new Date());
      const p = spawnSync(process.execPath, [REVIEW_JS, "--prepare", `--week=${week}`, `--out=${ctxPath}`], { encoding: "utf8" });
      assert.equal(p.status, 0,
        `audit-review --prepare --week=${week} must exit 0 with findings open; got ${p.status} ${p.stderr}`);
      const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
      assert.ok(ctx.worklist.length > 0, "there is a live worklist for (7f) to rule");
      assert.ok(ctx.worklist.every(w => typeof w.source === "string" && w.source.length > 0),
        "every worklist row names its source");
      assert.ok(ctx.worklist.every(w => ["defect", "gap", "proposal", "security"].includes(w.finding_type)),
        "and its finding_type");
      assert.ok(Array.isArray(ctx.routes) && ctx.routes.some(r => r.source === "runner"),
        "and the routing table travelling to the manager carries the runner route");

      // EVERY runner-sourced finding in the live worklist routes, none throws.
      const runnerRows = ctx.worklist.filter(w => String(w.source) === "runner");
      for (const w of runnerRows) {
        const g = routeGroup({ kind: "root-cause", finding_ids: [String(w.id)] }, ctx.worklist, ctx.routes);
        assert.equal(g.precedence, 30, `live runner finding ${w.id} routes at 30`);
      }
      console.log(`      [AGT-133 arm D] ${rows.length} routes, ${ctx.worklist.length} findings in ${week}, ${runnerRows.length} runner-sourced, all routed`);
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`[AGT-133] run tail: (7f) rules (7e)'s findings between (7e) and (8) · runner-cycle.md ${Buffer.byteLength(md, "utf8")}B <= ${CYCLE_CEILING}, ${STAMP_COUNT} stamps, 0 push notifications (${PUSH_RESIDUE} reported residue) · runner routes at 30/null`);
}

export default run;
selfRun(import.meta.url, run);
