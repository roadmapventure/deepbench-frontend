// DeepBench v7.0.634 | tests/regression/agt-198-staff-watch-detail-subject.test.mjs | AGT-198
//
// FEATURE: a staff finding reaches the manager NAMING ITS SUBJECT, and neither fingerprint moves.
//
// THE DEFECT, measured live on the unedited tree rather than recalled: `ledgerFindingFor()` set
// every `locations[].text` to `--detail` verbatim. `scripts/audit-review.js:407` selects
// `locations` and hands them to the manager at `:185`; `scripts/audit-ledger.js:249` renders each
// as `` - `<location>` -- "<text>" ``. So a check's own LABEL was the entire body a manager could
// rule on -- `audit_findings` `0cf1b9f3c57887e4` and `9e5ee69379e7e89e`, both `status=ticketed`
// onto AGT-198, each carrying two locations whose `text` is the bare label and nothing else.
//
// WHAT THIS FILE GUARDS, and where a lazier guard would pass vacuously.
//
// (a) THE SUBJECT GATE ITSELF -- refused with no subject, resolved from each of the four sources.
//     The flag case and the three prose cases are separate assertions, because a gate that only
//     ever sees `--backlog` would pass while every prose source was broken.
//
// (b) THE PROCEDURE'S OWN SIX CALLS STILL SUCCEED, AND THIS IS THE ARM THAT MATTERS MOST.
//     `docs/runbooks/runner-cycle.md` MANDATES six fixed `--detail` strings and every one of them
//     is label-only by design (`:2959`: "The detail names no ticket on purpose: `--backlog=`
//     carries that, or the finding fingerprints a new way every cycle and never reaches the
//     3-cycle promotion bar"). They are exactly the shape AGT-198 wants refused, so a reading of
//     this ticket that demanded the subject IN THE PROSE would make a runbook-required call
//     impossible. They are accepted because each passes `--backlog=`. The strings are read OUT OF
//     THE RUNBOOK (ses-378f's technique) rather than copied here, so this arm tests the shipped
//     bytes and cannot silently agree with a command nobody runs -- and the two strings a live
//     cycle has actually run are additionally pinned as literals, so a runbook edit that dropped
//     them makes this arm RED instead of quietly testing four commands.
//
// (c) THE DISCRIMINATOR. Every `locations[].text` names the agent, the kind, the subject and the
//     cycle, and is LONGER than the detail. On the unedited tree each `text` EQUALS the detail
//     exactly, so this arm is red before the change and green after -- which is what makes it a
//     test of this ticket rather than a description of it.
//
// (d) NEITHER FINGERPRINT MOVED, pinned to the live hex. `audit-ledger.js:184` is
//     `sha256(kind | sorted locationKeys | normalize(governing_fact))` and `locationKey()` reads
//     `loc.location` ONLY -- never `loc.text` -- so enriching the body cannot re-partition the
//     ledger. Pinned to `0cf1b9f3c57887e4` (the live row) and `4a759c9ad927b189` (the live
//     promotion key, and a live `runner_card_asks.target_id`) so a later re-partition goes red
//     HERE rather than as four re-filed asks.
//
// (e) THE SES-158 NEGATIVE CONTROL for (d). Enrich `governing_fact` instead of the text and the
//     ledger fingerprint MUST move. Without it, (d) would pass for a checker ignoring its input.
//
// (f) THE PROMOTION BAR IS STILL REACHABLE. The four details standing at or past the bar live,
//     x 3 cycles each, must still group to FOUR promotions. This is the arm that would have caught
//     the refused half of this ticket: keying the fingerprint on the subject takes it 4 -> 0.
//
// SOURCE-ONLY AND OFFLINE. Every arm drives the SHIPPED exported functions on in-memory fixtures;
// nothing here writes, and `audit_findings` / `runner_staff_findings` are append-only and off
// `public.reversible_tables()`, so a test that wrote would be a permanent probe row (pattern:76).

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  subjectFor,
  ledgerFindingFor,
  fingerprintFor,
  promotionsFrom,
  parseArgs,
  KINDS,
  PROMOTION_BAR,
} from "../../scripts/staff-watch.js";
import { fingerprint } from "../../scripts/audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const readLf = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const CYCLE = "1a8c8655-894d-433a-85fc-b56b7c0f64f7";

// The live row this ticket was filed FROM, and the fingerprints that must not move. Read from
// public.audit_findings / public.runner_staff_findings / public.runner_card_asks at this ship.
const LIVE_LEDGER_FP = "0cf1b9f3c57887e4";      // audit_findings, status=ticketed onto AGT-198
const LIVE_PROMOTION_FP = "4a759c9ad927b189";   // runner_staff_findings, 3 cycles, AND a live
                                                // runner_card_asks.target_id on an open skill-edit
const DEVMANAGER = {
  agent: "devmanager",
  kind: "assignment mismatch",
  detail: "assignment differs from the queue head",
  backlog: "AGT-178",
};

// ---- (a) the subject gate -----------------------------------------------------------------------

function theGateRefusesALabelWithNoSubject() {
  const bare = subjectFor({ detail: DEVMANAGER.detail });
  assert.ok(
    bare.error,
    `subjectFor refused nothing for a label-only detail with no --backlog: ${JSON.stringify(bare)}. `
    + "That label IS the live defect -- it reaches the manager as the whole body of the finding.",
  );
  assert.ok(!("subject" in bare), "a refusal must carry NO subject key -- a caller reading .subject would get undefined and compose it into the body");
  assert.match(bare.error, /--backlog/, "the refusal must name the way out (--backlog=), or the operator reading exit 2 has nowhere to go");

  // The flag is the source the runbook relies on, so it is asserted on its own.
  const flagged = subjectFor({ detail: DEVMANAGER.detail, backlog: DEVMANAGER.backlog });
  assert.deepStrictEqual(
    flagged, { subject: `backlog_items:${DEVMANAGER.backlog}`, source: "flag" },
    "the same label WITH --backlog must resolve from the flag: that is what keeps the runbook's six mandated calls legal",
  );

  // The three prose sources, each proven with a detail that names ONLY that source, so one working
  // regex cannot cover for three broken ones.
  const prose = [
    ["ticket", "the manager re-derived the pick on AGT-176 instead of executing it", "AGT-176"],
    ["path", "scripts/staff-watch.js recorded a finding with no subject", "scripts/staff-watch.js"],
    ["named", "the kickoff omitted the capture_migration_down( call before the apply", "capture_migration_down("],
  ];
  for (const [wantSource, detail, wantSubject] of prose) {
    const got = subjectFor({ detail });
    assert.strictEqual(got.error, undefined, `subjectFor refused a detail that names a ${wantSource}: ${JSON.stringify(detail)} -> ${JSON.stringify(got)}`);
    assert.strictEqual(got.subject, wantSubject, `${wantSource} source resolved the wrong subject from ${JSON.stringify(detail)}`);
    assert.strictEqual(got.source, wantSource, `${JSON.stringify(detail)} resolved via "${got.source}", expected "${wantSource}" -- the sources are ordered, and a detail matching a later one must not be claimed by an earlier`);
  }

  // The flag WINS over prose. Both present must report the flag, or the "source" field is noise.
  assert.strictEqual(
    subjectFor({ detail: "the manager re-derived the pick on AGT-176", backlog: "AGT-178" }).source,
    "flag",
    "with both a --backlog and a ticket in the prose, the DECLARED flag must win -- the prose id may be some other ticket the detail merely mentions",
  );
  return prose.length + 1;
}

// ---- (b) the runbook's own mandated calls -------------------------------------------------------

// The `--record` commands read out of the runbook itself, so this arm drives the SHIPPED bytes.
export function recordCommandsFrom(md) {
  const flat = md.replace(/\s+/g, " ");
  const cmds = flat.match(/node scripts\/staff-watch\.js --record[^`]*/g) || [];
  return cmds.map(cmd => {
    const one = (re, name) => {
      const hit = re.exec(cmd);
      assert.ok(hit, `a runbook --record command names no ${name}: ${cmd.slice(0, 160)}`);
      return hit[1];
    };
    return {
      agent: one(/--agent=([^\s'"]+)/, "--agent"),
      kind: one(/--kind='([^']+)'/, "--kind"),
      detail: one(/--detail='([^']+)'/, "--detail"),
      backlog: one(/--backlog=(\S+)/, "--backlog"),
    };
  });
}

// The two strings a live cycle has ACTUALLY run (this chain ran the second one twice, cycle
// ef3ef208 on AGT-172). Pinned as literals so a runbook edit that dropped them cannot leave this
// arm quietly testing whatever remains.
const RUNBOOK_MUST_ACCEPT = [
  "kickoff over KICKOFF_BYTE_CAP on first assembly",
  "kickoff carried no lane declaration on first assembly",
];

function theRunbooksMandatedCallsAreStillAccepted(md) {
  const calls = recordCommandsFrom(md);
  assert.ok(
    calls.length >= 6,
    `${RUNBOOK_REL} carried ${calls.length} staff-watch --record commands; it mandates 6 (:1981, :2806, :2808, :2957, :3058, :3060). `
    + "A parse that finds fewer is testing a subset and would pass while a mandated call was refused.",
  );

  const details = calls.map(c => c.detail);
  for (const must of RUNBOOK_MUST_ACCEPT) {
    assert.ok(
      details.includes(must),
      `${RUNBOOK_REL} no longer carries the mandated --detail ${JSON.stringify(must)}. This arm exists to prove that exact string is still ACCEPTED; if the runbook dropped it, re-pin this list deliberately rather than letting the arm go vacuous.`,
    );
  }

  for (const call of calls) {
    // THE FULL SHIPPED ACCEPTANCE PATH, in `record()`'s own order: parseArgs (which validates the
    // kind against the table's CHECK vocabulary) and THEN the subject gate. Asserting subjectFor
    // alone would miss a kind the script exits 2 on before the gate is ever reached.
    const parsed = parseArgs([
      "--record", `--cycle-id=${CYCLE}`, `--agent=${call.agent}`,
      `--kind=${call.kind}`, `--detail=${call.detail}`, `--backlog=${call.backlog}`,
    ]);
    assert.strictEqual(parsed.error, undefined, `parseArgs refused a runbook-mandated call (${JSON.stringify(call)}): ${parsed.error}`);
    assert.ok(KINDS.includes(call.kind), `${RUNBOOK_REL} records kind ${JSON.stringify(call.kind)}, which KINDS does not admit -- exit 2, nothing written`);

    const subject = subjectFor({ detail: parsed.detail, backlog: parsed.backlog });
    assert.strictEqual(
      subject.error, undefined,
      `AGT-198's subject gate REFUSES a call ${RUNBOOK_REL} mandates verbatim: ${JSON.stringify(call.detail)} with --backlog=${call.backlog}. `
      + "The gate reads the subject from the FLAG for exactly this reason; if this fires, the change has made a runbook-required call impossible and must not ship.",
    );
    assert.strictEqual(subject.source, "flag", `the runbook's ${JSON.stringify(call.detail)} must resolve from --backlog (source "flag"), got "${subject.source}"`);

    // And the body the manager receives is genuinely enriched for the mandated calls too -- not
    // merely "not refused".
    const f = ledgerFindingFor({ ...call, cycleId: CYCLE });
    for (const loc of f.locations) {
      assert.ok(loc.text.length > call.detail.length, `a mandated call's location text was not enriched: ${JSON.stringify(loc.text)}`);
      assert.ok(loc.text.includes(call.backlog), `a mandated call's body does not name its subject ${call.backlog}: ${JSON.stringify(loc.text)}`);
    }
  }

  // THE CONTROL FOR THIS ARM (SES-158). A detail-only call -- the runbook's own string with the
  // --backlog dropped -- MUST be refused. Without this, (b) would pass for a gate that accepted
  // everything, which is the same as no gate.
  for (const must of RUNBOOK_MUST_ACCEPT) {
    assert.ok(
      subjectFor({ detail: must }).error,
      `control: the mandated string ${JSON.stringify(must)} was accepted with NO --backlog. Then the gate refuses nothing and AGT-198 shipped a no-op.`,
    );
  }
  return calls.length;
}

// ---- (c) the discriminator ----------------------------------------------------------------------

function theBodyNamesItsSubject() {
  const f = ledgerFindingFor({ ...DEVMANAGER, cycleId: CYCLE });
  assert.ok(f.locations.length === 2, `expected 2 locations (the agent and the ticket), got ${f.locations.length}`);
  for (const loc of f.locations) {
    for (const needle of [DEVMANAGER.agent, DEVMANAGER.kind, DEVMANAGER.backlog, CYCLE, DEVMANAGER.detail]) {
      assert.ok(
        loc.text.includes(needle),
        `the body the manager rules on does not name ${JSON.stringify(needle)}: ${JSON.stringify(loc.text)} (at ${loc.location})`,
      );
    }
    assert.ok(
      loc.text.length > DEVMANAGER.detail.length,
      `${loc.location}'s text is not longer than the detail -- on the UNEDITED tree text === detail exactly, which is the defect. Got ${JSON.stringify(loc.text)}`,
    );
    assert.notStrictEqual(
      loc.text, DEVMANAGER.detail,
      "the location text still EQUALS the --detail verbatim: that is precisely the live defect (audit_findings 0cf1b9f3c57887e4), so this arm is the one that must go red on an unedited tree",
    );
  }
  // The locations themselves are untouched -- they are fingerprint material.
  assert.deepStrictEqual(
    f.locations.map(l => l.location), ["agents:devmanager", "backlog_items:AGT-178"],
    "the `location` keys must be byte-unchanged: audit-ledger.js:184 hashes them, so touching one re-partitions the ledger",
  );
  return f.locations[0].text;
}

// ---- (d) neither fingerprint moved --------------------------------------------------------------

function neitherFingerprintMoved() {
  const f = ledgerFindingFor({ ...DEVMANAGER, cycleId: CYCLE });
  assert.strictEqual(
    fingerprint(f), LIVE_LEDGER_FP,
    `the ledger fingerprint MOVED to ${fingerprint(f)}; the live audit_findings row is ${LIVE_LEDGER_FP}. `
    + "audit-ledger.js:184 hashes kind | sorted locationKeys | normalize(governing_fact) -- so something in THOSE changed. "
    + "A moved fingerprint re-files this finding as a new one and un-tickets the row already ticketed onto AGT-198.",
  );
  assert.strictEqual(
    fingerprintFor({ agentId: DEVMANAGER.agent, kind: DEVMANAGER.kind, detail: DEVMANAGER.detail }).fingerprint,
    LIVE_PROMOTION_FP,
    `the staff-watch promotion fingerprint MOVED; it must stay ${LIVE_PROMOTION_FP}. That value IS a live `
    + "runner_card_asks.target_id on an OPEN skill-edit ask, and AGT-172's dedupe keys on target_id -- "
    + "moving it orphans the standing ask and re-files it, the exact defect AGT-172 shipped to remove.",
  );

  // The same detail recorded from a DIFFERENT cycle must still carry the same promotion
  // fingerprint, even though the cycle now appears in the body. Otherwise the bar is unreachable.
  const other = "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
  const a = ledgerFindingFor({ ...DEVMANAGER, cycleId: CYCLE });
  const b = ledgerFindingFor({ ...DEVMANAGER, cycleId: other });
  assert.notStrictEqual(a.locations[0].text, b.locations[0].text, "the cycle must actually reach the body, or naming it was a no-op");
  assert.strictEqual(
    fingerprint(a), fingerprint(b),
    "two cycles reporting the SAME defect fingerprinted differently once the cycle id reached the body. "
    + "Then every cycle files its own finding and nothing ever groups -- the cycle belongs in the body ONLY because the body is not hashed.",
  );
  return fingerprint(f);
}

// ---- (e) the SES-158 control for (d) ------------------------------------------------------------

function theControlMovesTheFingerprint() {
  const f = ledgerFindingFor({ ...DEVMANAGER, cycleId: CYCLE });
  const enrichedFact = { ...f, governing_fact: `${DEVMANAGER.kind} on ${DEVMANAGER.backlog}: ${DEVMANAGER.detail}` };
  assert.notStrictEqual(
    fingerprint(enrichedFact), LIVE_LEDGER_FP,
    "control: enriching `governing_fact` did NOT move the ledger fingerprint. Then `fingerprint()` is not reading "
    + "governing_fact at all and (d) proves nothing -- it would pass for a checker that ignored its input.",
  );
  // And the same control on the promotion key: the detail IS hashed there, so a subject spliced
  // into the detail must split it. This is what the refused half of AGT-198 would have done.
  const split = ["AGT-176", "AGT-178"].map(t =>
    fingerprintFor({ agentId: DEVMANAGER.agent, kind: DEVMANAGER.kind, detail: `${DEVMANAGER.detail} on ${t}` }).fingerprint);
  assert.strictEqual(
    new Set(split).size, 2,
    `control: a detail naming the ticket must split per ticket, got ${JSON.stringify(split)}. This is exactly why AGT-198 `
    + "keys nothing on the subject: it would split every promotable finding across its tickets and take promotions 4 -> 0.",
  );
  return fingerprint(enrichedFact);
}

// ---- (f) the promotion bar is still reachable ---------------------------------------------------

// The four fingerprints standing at or past the bar in public.runner_staff_findings at this ship,
// by the (agent, kind, detail) that produces each. All four are LABEL-ONLY details, which is the
// measured fact behind AGT-198's refusal to key on the subject.
const PROMOTABLE = [
  ["designer", "verdict block attributable to the kickoff", "verifier blocked on the kickoff: no lane declaration", "2fb97122c84a986b"],
  ["designer", "kickoff lacked a fact", "build needed a fact the kickoff did not carry", "e7393ed419f16617"],
  ["designer", "kickoff lacked a fact", "kickoff carried no lane declaration on first assembly", "a05f97ba602f2e21"],
  ["devmanager", "assignment mismatch", "assignment differs from the queue head", LIVE_PROMOTION_FP],
];

function thePromotionBarIsStillReachable() {
  const cycles = [CYCLE, "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", "b2c3d4e5-6f70-4182-93a4-b5c6d7e8f901"];
  assert.strictEqual(cycles.length, PROMOTION_BAR, "the fixture must stand exactly at the bar, not over it -- an over-shot fixture hides an off-by-one");

  const rows = [];
  for (const [agent, kind, detail, wantFp] of PROMOTABLE) {
    const fp = fingerprintFor({ agentId: agent, kind, detail }).fingerprint;
    assert.strictEqual(
      fp, wantFp,
      `${JSON.stringify(detail)} now fingerprints ${fp}, but the live runner_staff_findings rows are keyed ${wantFp}. `
      + "Its accumulated cycles no longer count toward the bar, and any standing runner_card_asks row on it is orphaned.",
    );
    // Each of the four is recorded with a DIFFERENT ticket per cycle, which is the real pattern in
    // the runbook (`--backlog=<ID>` is substituted per cycle). The fingerprint must ignore it.
    rows.push(...cycles.map((cycle_id, i) => ({
      fingerprint: fp, agent_id: agent, kind, cycle_id, detail, backlog_id: `AGT-${170 + i}`,
    })));
  }

  const promotions = promotionsFrom(rows);
  assert.strictEqual(
    promotions.length, PROMOTABLE.length,
    `${PROMOTABLE.length} defects x ${PROMOTION_BAR} cycles produced ${promotions.length} promotions, expected ${PROMOTABLE.length}. `
    + "This is the arm that catches a subject-keyed fingerprint: it splits each defect across its tickets, "
    + "every group falls under the bar, and promotions go to 0.",
  );
  for (const p of promotions) {
    assert.strictEqual(p.cycles, PROMOTION_BAR, `${p.fingerprint} counted ${p.cycles} cycles, expected ${PROMOTION_BAR}`);
  }
  assert.deepStrictEqual(
    promotions.map(p => p.fingerprint).sort(),
    PROMOTABLE.map(p => p[3]).sort(),
    "the promotions must be the four live fingerprints themselves, not four groups of something else",
  );
  return promotions.length;
}

export default async function run() {
  const md = readLf(RUNBOOK_REL);

  const sources = theGateRefusesALabelWithNoSubject();       // (a)
  const mandated = theRunbooksMandatedCallsAreStillAccepted(md); // (b)
  const body = theBodyNamesItsSubject();                     // (c)
  const ledgerFp = neitherFingerprintMoved();                // (d)
  const movedFp = theControlMovesTheFingerprint();           // (e)
  const promotions = thePromotionBarIsStillReachable();      // (f)

  console.log(`  [AGT-198] (a) gate refuses a label-only detail, ${sources} subject sources resolve; `
    + `(b) all ${mandated} runbook-mandated --record calls ACCEPTED via --backlog; `
    + `(c) body now reads ${JSON.stringify(body)}; `
    + `(d) ledger fp ${ledgerFp} and promotion fp ${LIVE_PROMOTION_FP} both unmoved; `
    + `(e) control moves the ledger fp to ${movedFp}; (f) ${promotions} promotions still reach the bar`);
}

selfRun(import.meta.url, run);
