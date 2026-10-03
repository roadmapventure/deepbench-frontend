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
// AGT-133's RESIDUE, CLEARED BY SLICE 3 (v7.0.694) -- still asserted as a ratchet rather than hidden
// (pattern:75 -- a gate's false green must be structurally impossible). The kickoff inventoried the
// runbook's pushes with `grep -c "push notification"` and named five sites; that phrase went at
// v7.0.610, and ten further lines instructed a push under a different wording -- step 4a-bis's
// deploy-quota crossing, step 4a-quater's IP spend-gate block (built on John's verbatim `0f292cfa`
// design, which said the push channel IS the design) and the cadence alert. Slice 3 converted all
// three: every alarm now writes a `john_alerts` row, fingerprint-keyed and left unclaimed, per
// `JOHN-0925-NOTIFICATIONS-OFF` and the Designer's call recorded as decision c991f6b3-626c-4edc-9d81-48baf8fdbc21
// (audit_findings 639f07b6, escalated to John and unanswered, is resolved by it). The pin is now ZERO
// and still only shrinks: a NEW push added anywhere fails arm B, and arm F proves 4a-bis's own span
// instructs none, so nobody can raise the pin instead of removing the push.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseSteps, runbookSha, NOTES } from "../../scripts/render-cycle-card.js";
import { routeGroup } from "../../scripts/audit-review.js";
import { isoWeek } from "../../scripts/audit-ledger.js";
// The runbook's live size has ONE home (ses-413d's BYTES_AT_SHIP, checked against the file itself by
// ses-424f). Arm E reads it from there rather than carrying a second copy — see CYCLE_BYTES note below.
import { BYTES_AT_SHIP } from "./ses-413d-questions-scoreboard.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CYCLE_MD = path.join(ROOT, "docs", "runbooks", "runner-cycle.md");
const CARD_MD = path.join(ROOT, "docs", "runbooks", "cycle-card.md");
const REVIEW_JS = path.join(ROOT, "scripts", "audit-review.js");
const CYCLE_CEILING = 381000;
const STAMP_COUNT = 5;

// The residue AGT-133 reported at v7.0.610 and CLEARED at slice 3 (v7.0.694). Raise this only by
// putting a push back, which is John's word alone (`JOHN-0925-NOTIFICATIONS-OFF`).
const PUSH_RESIDUE = 0;
const RESIDUE_RE = /push John|push channel|Send the push|re-push|one push per block|into a push/g;

// AGT-133 slice 2 (v7.0.666). The card's ONE hand-written part -- NOTES in render-cycle-card.js --
// outlived the runbook it summarises: it still said `pushed to John` / `one push per cycle` at the
// v7.0.610 ship, which rendered verbatim into cycle-card.md and assembled the Development Manager
// from a procedure that instructs a push the runbook no longer instructs. Arm E pins the repair in
// the generator, which is why the runbook's bytes below must NOT have moved: this slice spends zero
// runbook bytes against the SES-336 ceiling, and PUSH_RESIDUE stays 10 because the ten lines it
// counts sit on audit_findings 639f07b6-1e06-4454-91e7-bc010d00d1d6 -- escalated to John, unanswered.
const CARD_PUSH_RE = /pushed to John|one push per cycle/g;
// AGT-166 s4 (v7.0.687): this WAS a literal 380862 — a second home for the runbook's live size, which
// went red the first time a later ticket legitimately spent a runbook byte (s4 adds 74 B to step 6's
// rule (1): a judged refusal writes `status = 'removal proposed'`). The CLAIM arm E makes is about
// AGT-133 slice 2 — that ITS repair was in the generator and cost the ceiling nothing — and the way to
// keep that claim true without re-pinning the file forever is to grade against the one declared home.
// A drift between the file and that pin still reddens; it just reddens in ses-424f, where it belongs.
const CYCLE_BYTES_AT_SLICE2 = BYTES_AT_SHIP;   // 380862 at AGT-133 slice 2, 380936 since AGT-166 s4
const NOTE_0B = "a silent predecessor is REPORTED IN A ROW John reads; never close a row that is not yours";
const NOTE_1 = "insert runner_cycles with the claimed id, outcome NULL; this step notifies nothing";
const NOTE_MAX = 90;

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
    // AGT-185 (v7.0.650) took line 1 and rotated v7.0.535 out; AGT-237 (v7.0.658) took it from v7.0.650
    // and rotated v7.0.555 out. The NEWEST ship leads and this
    // ship's own stamp only has to still be among the five -- ses-424c's LATER_STAMP/THIS_STAMP split.
    assert.ok(md.startsWith("<!-- DeepBench v7.0.658 |"),
      "the newest ship's stamp leads the header -- AGT-237 (v7.0.658) took line 1 from v7.0.650");
    assert.ok(md.includes("v7.0.610 | runbooks/runner-cycle.md"),
      "and THIS ship's stamp must still be among the five -- a rotation that drops it loses (7f)'s record");
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
      `slice 3 cleared every push-to-John line (4a-bis, 4a-quater, the cadence alert) to ${PUSH_RESIDUE}. ` +
      `Found ${residue}: a push was put BACK, which is John's word alone -- or a new one was added. The pin ` +
      `never goes up to fit the text; the text comes down to fit the pin.`);

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
      // AGT-116 (v7.0.657): exit 3 is audit-review's NOTHING_TO_REVIEW -- the live week simply has no
      // open findings right now. That is the live world, not the change, so it is a declared not-run
      // (pattern:162), never a FAIL. Any OTHER non-zero exit is still a real failure below.
      if (p.status === 3) {
        notRun(`AGT-133 arm D --prepare worklist (${week})`,
          `audit-review --prepare --week=${week} exited 3 (NOTHING_TO_REVIEW): no open findings this week, so the live worklist half is unverified here`);
        return;
      }
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

  // --- E. the card instructs no push ---------------------------------------------------------------
  await arm("E the card instructs no push", () => {
    const card = lf(fs.readFileSync(CARD_MD, "utf8"));
    const notesText = Object.entries(NOTES).map(([k, v]) => `${k}: ${v.outcome}`).join("\n");

    // The two surfaces that carried it: the generator's hand-written NOTES, and the card they render
    // into. Both must be clean -- a card cleaned by hand with the generator left dirty would come back
    // on the next --write.
    const inCard = card.match(CARD_PUSH_RE) ?? [];
    assert.equal(inCard.length, 0,
      `cycle-card.md still instructs a push (${JSON.stringify(inCard)}) -- the runbook stopped saying this at v7.0.610`);
    const inNotes = notesText.match(CARD_PUSH_RE) ?? [];
    assert.equal(inNotes.length, 0,
      `render-cycle-card.js NOTES still instructs a push (${JSON.stringify(inNotes)}) -- the card is generated, so the fix belongs here`);

    // CONTROL: the matcher finds a push that IS there, so the two zeroes above are the text being
    // clean and not the regex being broken.
    const injected = (`${NOTES["0b"].outcome} pushed to John`).match(CARD_PUSH_RE) ?? [];
    assert.equal(injected.length, 1,
      `control: the matcher detects an injected push; found ${injected.length}`);

    // The replacement text, in the generator and rendered through to the card, within the <= 90 char
    // budget the NOTES comment declares.
    assert.equal(NOTES["0b"].outcome, NOTE_0B, "0b's outcome reports the predecessor in a row John reads");
    assert.equal(NOTES["1"].outcome, NOTE_1, "step 1's outcome says it notifies nothing");
    assert.ok(NOTE_0B.length <= NOTE_MAX, `0b's outcome is ${NOTE_0B.length} chars against the ${NOTE_MAX} cap`);
    assert.ok(NOTE_1.length <= NOTE_MAX, `step 1's outcome is ${NOTE_1.length} chars against the ${NOTE_MAX} cap`);
    assert.ok(card.includes(NOTE_0B), "and 0b's new text rendered through into the card");
    assert.ok(card.includes(NOTE_1), "and step 1's did too -- the card was re-rendered, not hand-edited");

    // ZERO RUNBOOK BYTES OF ITS OWN. The repair was in the generator, so this slice spent nothing
    // against the SES-336 ceiling — and the file must still agree with the ONE pin that declares its
    // size, whatever a later ticket has legitimately spent since.
    assert.equal(Buffer.byteLength(md, "utf8"), CYCLE_BYTES_AT_SLICE2,
      `runner-cycle.md is ${Buffer.byteLength(md, "utf8")} B but the declared pin reads ${CYCLE_BYTES_AT_SLICE2} B`);
    // ...and the residue that was held here is gone. The ten lines arm B counted sat on audit_findings
    // 639f07b6, escalated to John and unanswered; the Designer answered it under JOHN-0925-DESIGNER-DECIDES.
    assert.equal(PUSH_RESIDUE, 0, "slice 3 (v7.0.694) cleared the ten lines — decision c991f6b3-626c-4edc-9d81-48baf8fdbc21");
  });

  // --- F. 4a-bis instructs no push ------------------------------------------------------------------
  await arm("F 4a-bis instructs no push", () => {
    const span = stepSpan(md, "4a-bis");
    const card = lf(fs.readFileSync(CARD_MD, "utf8"));

    // The three phrases that legitimately survive: 4a-ter's *yield* posture ("prefer a gated-before-build
    // item over a push this cycle"), and the two places the span QUOTES John's 2026-09-25 ruling to say
    // what it no longer does ("what would have been pushed is written as a row he reads", "turning pushes
    // back on is his word alone"). Scrub exactly those, and no instruction to push may remain anywhere in
    // the span -- not "push John once", not "Send the push", not a wording nobody has thought of yet.
    const scrub = s => s.replace(/over a push this cycle|would have been pushed|turning pushes back on/g, "");
    const left = scrub(span).match(/.{0,70}\bpush.{0,70}/i);
    assert.equal(left, null, `4a-bis still instructs a push: ${left && JSON.stringify(left[0])}`);

    // CONTROL: the same scrub over the same span with one push put back DOES match, so the null above is
    // the text being clean and not the scrub having eaten the evidence.
    assert.ok(/\bpush/i.test(scrub(span + " push John once")),
      "control: the matcher detects a push injected into this very span");

    // ...and what replaced it. One destination, one dedupe mechanism, three fingerprints -- reverting any
    // single site drops its own prefix and reds this arm by name.
    assert.ok(span.includes("on conflict (fingerprint) do nothing"),
      "4a-bis carries the john_alerts insert whose UNIQUE fingerprint IS the crossing rule");
    for (const fp of ["deploy-quota:<CST day>", "ip-block:<masked_ip>:<blocked_at>", "cadence:<suppressionKey>"]) {
      assert.ok(span.includes(fp), `4a-bis names the ${fp} fingerprint -- one per alarm site`);
    }
    // The card is generated from the runbook, so the destination must have rendered through -- a runbook
    // converted with a stale card would come back on the next --write. The card carries ONE LINE PER STEP
    // and renders a fenced block as an `L<line>(<kind> <bytes>)` summary, never its text, so the proof is
    // 4a-bis's line naming a `sql` block AT the runbook line where the insert actually opens. Derived, not
    // pinned: a byte shift moves the anchor, and a revert of this site removes the block entirely.
    const lines = lf(md).split("\n");
    const iInsert = lines.findIndex(l => l.includes("on conflict (fingerprint) do nothing"));
    assert.ok(iInsert > 0, "the runbook carries the john_alerts insert");
    let iFence = iInsert;
    while (iFence >= 0 && lines[iFence].trim() !== "\`\`\`sql") iFence--;
    assert.ok(iFence >= 0, "and it sits inside a fenced sql block");
    const cardLine = card.split("\n").find(l => l.startsWith("**4a-bis.**"));
    assert.ok(cardLine, "cycle-card.md carries a 4a-bis line");
    assert.ok(cardLine.includes(`L${iFence + 1}(sql `),
      `cycle-card.md's 4a-bis line must name the alert-row sql block at L${iFence + 1}; it reads: ${cardLine}`);
    // CONTROL: the anchor is the block's, not any sql block's -- 4a's block must NOT satisfy it.
    assert.ok(!(card.split("\n").find(l => l.startsWith("**4a.**")) ?? "").includes(`L${iFence + 1}(sql `),
      "control: the L-anchor asserted above belongs to 4a-bis's block, not a neighbouring step's");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
  console.log(`[AGT-133] run tail: (7f) rules (7e)'s findings between (7e) and (8) · runner-cycle.md ${Buffer.byteLength(md, "utf8")}B <= ${CYCLE_CEILING}, ${STAMP_COUNT} stamps, 0 push notifications (${PUSH_RESIDUE} reported residue) · runner routes at 30/null`);
}

export default run;
selfRun(import.meta.url, run);
