// DeepBench v7.0.1100 | tests/regression/agt-596-premise-delivered.test.mjs | AGT-596 -- a premise the ticket's own ship closed is delivered, never a removal.
//
// WHAT THIS PINS. The premise answer gained a THIRD value, `delivered`, and the board gained a
// trigger that refuses `status = 'removal proposed'` on a ticket whose OWN `kickoff_link` shipped.
// Before this build the enum was exactly `alive|dead`, every `dead` went to `removal proposed`, and
// no trigger refused that write -- so AGT-460, SES-385 and AGT-155 were each proposed for removal
// because their own work had shipped.
//
// THE DISCRIMINATOR IS ARM g, and it is a pair with arm f rather than a single refusal. Arm g
// PATCHes a real `delivered` row whose own kickoff shipped and requires HTTP 400 naming `AGT-596`
// with the row unchanged; arm f requires `removal_refusal()` to answer NULL for an open ticket with
// no `kickoff_link`, so an intervening-ship death still proposes removal. One refusal alone cannot
// be told apart from a blanket refusal of the whole PATCH (a permission error, a bad column, a
// constraint on another field -- all of which also 4xx). Only the pair shows the OWN-ship is the
// operative difference. Arm e is the same shape at the function level: the defect's own sentence
// ("closed by v7.0.942") is NOT a basis, while a ruling, a superseding ticket and named evidence
// each are.
//
// THE FILE WRITES NOTHING WHEN GREEN. Arms a-c are offline text. Arms e-f are `stable` functions and
// read-only reads. Arm g's single write is REFUSED BY THE DATABASE; its only other write is the
// self-heal, which fires only when the guard did not hold and then fails the test by name.
//
// ARMS d-g ARE DECLARED notRun WITHOUT CREDENTIALS, the way agt-65-designer.test.mjs declares its
// live arm -- declared, never inferred (SES-180). Arms a-c still run.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { scoreAnswer } from "../../scripts/model-trial.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const CARD_REL = "docs/runbooks/cycle-card.md";
const REDESIGN_REL = "docs/runbooks/redesign-after-refusal.md";

const INTENT_SLUG = "ds-kickoff-intent";
const IDENTITY_SLUG = "ds-identity";

const BASIS_TICKET = "AGT-460";
const BASIS_VERSION = "v7.0.942";

const count = (haystack, needle) => haystack.split(needle).length - 1;

async function run() {
  // -- a (offline): scoreAnswer() grades a delivered premise -------------------------------------
  const env = o => ({ result: JSON.stringify(o) });
  const score = o => scoreAnswer({ envelope: env(o), required: ["premise"], checkKickoffExit: null });

  assert.deepEqual(
    score({ premise: "delivered", premise_evidence: "x", kickoff_markdown: null }),
    { passed: true, why: "premise-delivered" },
    "a delivered premise WITH evidence and no kickoff must pass as premise-delivered -- at e077519 " +
    "this read passed:false, so the trial scorer failed every correct delivered answer");
  assert.deepEqual(
    score({ premise: "delivered", kickoff_markdown: null }),
    { passed: false, why: "no-kickoff-exit-0" },
    "delivered WITHOUT evidence must not pass -- the evidence is the whole claim");
  assert.deepEqual(
    score({ premise: "dead", premise_evidence: "x", kickoff_markdown: null }),
    { passed: true, why: "premise-dead" },
    "the dead branch must be untouched by AGT-596");

  // -- b (offline): step 6 of the runbook names the delivered branch -----------------------------
  const runbook = read(RUNBOOK_REL);
  for (const needle of [
    "`premise = 'delivered'` (`AGT-596`: its OWN `kickoff_link` shipped the fix) is NEVER that write",
    "7a on that `kickoff_link` and its version, then the settle, `--builder=none`.",
  ]) {
    assert.equal(count(runbook, needle), 1,
      `${RUNBOOK_REL} must hold exactly once: ${JSON.stringify(needle)} (found ${count(runbook, needle)})`);
  }
  assert.ok(/`premise = 'dead'`[\s\S]{0,400}removal proposed/.test(runbook),
    `${RUNBOOK_REL} must still send a dead premise to removal proposed -- AGT-596 adds a branch, it ` +
    "does not remove the dead one");

  // -- c (offline): the card and the refusal runbook ---------------------------------------------
  const card = read(CARD_REL);
  assert.equal(count(card, "delivered → 7a"), 1,
    `${CARD_REL} must hold "delivered → 7a" exactly once, found ${count(card, "delivered → 7a")}`);
  const sixth = card.split("\n").filter(l => l.startsWith("**6.**"));
  assert.equal(sixth.length, 1, `${CARD_REL} must hold exactly one line starting **6.**, found ${sixth.length}`);
  assert.ok(sixth[0].includes("delivered → 7a"),
    `"delivered → 7a" must sit on the card's step-6 line, not elsewhere; got: ${sixth[0]}`);

  const redesign = read(REDESIGN_REL);
  const refusalLine = "**premise delivered** → 7a and the settle, as step 6.";
  assert.equal(count(redesign, refusalLine), 1,
    `${REDESIGN_REL} must hold ${JSON.stringify(refusalLine)} exactly once, found ${count(redesign, refusalLine)}`);

  // -- the live arms ----------------------------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("AGT-596 live arms d-g (the two Designer Skill rows, removal_basis()'s nine cases, " +
      "removal_refusal() both directions, and the refused removal-proposed PATCH)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY not set; export them from public.runner_secrets by name " +
      "(docs/runbooks/session-setup.md step 1b) and re-run: " +
      "SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node tests/regression/run-all.js");
    return;
  }

  const H = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  const rest = async (p, init = {}) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || "GET"} ${p} -> ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };

  // -- d (live): the Designer's own two rows carry the third answer ------------------------------
  const profiles = await rest(
    `skill_profiles?slug=in.(${INTENT_SLUG},${IDENTITY_SLUG})&select=slug,method,traits`);
  const intent = profiles.find(p => p.slug === INTENT_SLUG);
  const identity = profiles.find(p => p.slug === IDENTITY_SLUG);
  assert.ok(intent, `no ${INTENT_SLUG} skill_profiles row -- apply the AGT-596 migration agt596_premise_delivered`);
  assert.ok(identity, `no ${IDENTITY_SLUG} skill_profiles row -- apply the AGT-596 migration agt596_premise_delivered`);

  assert.deepEqual(intent.traits.schema.properties.premise.enum, ["alive", "dead", "delivered"],
    `${INTENT_SLUG}.traits.schema's premise must be the three-value enum -- the Designer cannot ` +
    "return an answer its own contract rejects");

  const deliveredClause =
    "return premise = delivered with that evidence and no kickoff: delivered work is never a removal (AGT-596);";
  assert.equal(count(intent.method, deliveredClause), 1,
    `${INTENT_SLUG}.method must hold the delivered clause exactly once, found ${count(intent.method, deliveredClause)}`);
  const twoAnswerStep = "(2) if dead, return premise = dead with the evidence and no kickoff;";
  assert.equal(count(intent.method, twoAnswerStep), 0,
    `${INTENT_SLUG}.method must NOT still hold the two-answer step (2) -- a method that offers only ` +
    "alive or dead sends delivered work to removal however wide the enum is");

  const identitySentence = " Premise closed by this ticket's own shipped kickoff → delivered, never a removal.";
  assert.equal(count(identity.method, identitySentence), 1,
    `${IDENTITY_SLUG}.method must hold the delivered sentence exactly once, found ${count(identity.method, identitySentence)}`);

  // -- e (live): removal_basis() classifies the nine cases ---------------------------------------
  const basis = (p_session_name, p_kind, p_reasoning) => rest("rpc/removal_basis", {
    method: "POST",
    body: JSON.stringify({
      p_backlog_id: BASIS_TICKET, p_version: BASIS_VERSION, p_session_name, p_kind, p_reasoning,
    }),
  });
  const CASES = [
    [null, "ticket-status", `premise dead: the gap is closed by ${BASIS_VERSION}`, null,
      "the defect's own sentence is no basis"],
    [null, "removal", `removal-basis: evidence -- beyond ${BASIS_VERSION} one step names a gap that is not there`,
      "evidence", "the words AND the ship it names"],
    [null, "removal", "removal-basis: evidence -- beyond v7.0.94 nothing", null,
      "a shorter version is not the version"],
    [null, "removal", "superseded-by AGT-595", "superseded", "a standing ticket supersedes it"],
    [null, "removal", `superseded-by ${BASIS_TICKET}`, null, "a ticket does not supersede itself"],
    [null, "removal", "superseded-by ZZZ-99999", null, "no such row"],
    ["team-ballot-poc-1104", "ticket-status", "ballot B1", "ruling", "a named session decided it"],
    [null, "ticket-validation", "not-real", "ruling", "a ruling by kind"],
    [null, "gate", "retired", "ruling", "a ruling by kind"],
  ];
  for (const [session, kind, reasoning, expected, why] of CASES) {
    const got = await basis(session, kind, reasoning);
    assert.strictEqual(got, expected,
      `removal_basis(${BASIS_TICKET}, ${BASIS_VERSION}, ${JSON.stringify(session)}, ${JSON.stringify(kind)}, ` +
      `${JSON.stringify(reasoning)}) must be ${JSON.stringify(expected)} (${why}), got ${JSON.stringify(got)}`);
  }

  // -- f (live, read-only): the refusal fires on an own-ship row and ONLY there -------------------
  const candidates = await rest(
    "backlog_items?status=eq.delivered&kickoff_link=not.is.null&order=backlog_id&limit=50" +
    "&select=backlog_id,kickoff_link,status");
  let subject = null;
  let refusal = null;
  for (const row of candidates) {
    const answer = await rest("rpc/removal_refusal", {
      method: "POST", body: JSON.stringify({ p_backlog_id: row.backlog_id }),
    });
    if (typeof answer === "string" && answer.length > 0) { subject = row; refusal = answer; break; }
  }
  assert.ok(subject,
    "no delivered ticket with a kickoff_link among the first 50 is refused by removal_refusal() -- " +
    "this arm never passes on an empty set: with nothing refused, the guard is unmeasured");
  assert.ok(refusal.includes(subject.backlog_id),
    `the refusal must name ${subject.backlog_id}; got: ${refusal}`);
  const subjectVersion = (subject.kickoff_link.match(/v[0-9]+\.[0-9]+\.[0-9]+/) || [null])[0];
  assert.ok(subjectVersion, `${subject.backlog_id}'s kickoff_link names no version: ${subject.kickoff_link}`);
  assert.ok(refusal.includes(subjectVersion),
    `the refusal must name the version its own kickoff shipped as (${subjectVersion}); got: ${refusal}`);

  const others = await rest(
    "backlog_items?status=eq.open&kickoff_link=is.null&order=backlog_id&limit=1&select=backlog_id");
  assert.equal(others.length, 1, "no open ticket without a kickoff_link to measure the other direction against");
  const otherAnswer = await rest("rpc/removal_refusal", {
    method: "POST", body: JSON.stringify({ p_backlog_id: others[0].backlog_id }),
  });
  assert.strictEqual(otherAnswer, null,
    `removal_refusal(${others[0].backlog_id}) must be null -- an open ticket with no kickoff of its own ` +
    `was never closed by its own ship, and an intervening-ship death still proposes removal; got ${JSON.stringify(otherAnswer)}`);

  console.log(`[AGT-596] subject ${subject.backlog_id} (${subject.kickoff_link}) before-image: status=${subject.status}`);
  console.log(`[AGT-596] removal_refusal(${subject.backlog_id}) = ${refusal}`);

  // -- g (live): THE DISCRIMINATOR -- the board refuses the write itself -------------------------
  const patch = await fetch(`${url}/rest/v1/backlog_items?backlog_id=eq.${subject.backlog_id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ status: "removal proposed" }),
  });
  const patchBody = await patch.text();
  if (patch.ok) {
    // SELF-HEAL: the guard did not hold, so this test just moved a real ticket. Put it back first,
    // then fail -- a test that leaves the board dirty is worse than the defect it found.
    await fetch(`${url}/rest/v1/backlog_items?backlog_id=eq.${subject.backlog_id}`, {
      method: "PATCH", headers: H, body: JSON.stringify({ status: "delivered" }),
    }).catch(() => {});
    assert.fail(
      `AGT-596 guard did not hold: PATCH status='removal proposed' on ${subject.backlog_id} answered ` +
      `${patch.status} and the row was moved. It has been PATCHed back to 'delivered'. Body: ${patchBody}`);
  }
  assert.equal(patch.status, 400,
    `the refused PATCH must answer HTTP 400 (the guard's own raise), got ${patch.status}: ${patchBody}`);
  assert.ok(patchBody.includes("AGT-596"),
    `the refusal must be AGT-596's own, not some other error that also 4xxs; got: ${patchBody}`);

  const after = (await rest(
    `backlog_items?backlog_id=eq.${subject.backlog_id}&select=backlog_id,status`))[0];
  assert.equal(after.status, "delivered",
    `${subject.backlog_id} must still read 'delivered' after the refused PATCH, reads '${after.status}' -- ` +
    "a guard that raised after having already written would pass the refusal assertion and fail this one");

  console.log(`[AGT-596] discriminator confirmed live: PATCH{status='removal proposed'} on ${subject.backlog_id} ` +
    `-> HTTP 400 naming AGT-596, row still 'delivered'`);
}

export default run;
selfRun(import.meta.url, run);
