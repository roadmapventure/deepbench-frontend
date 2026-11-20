// DeepBench v7.0.1069 | tests/regression/agt-571-scoped-count.test.mjs | AGT-571 -- the scoped-count
// helper's own guard: an unfiltered count is refused BEFORE the network, and a probe is graded on
// the rows its own key holds, never on a whole table.
//
// WHY. 16 regression files (104 sites) count a WHOLE table around their probe --
// `count(url, key, "<table>?select=id")` -- so a peer cycle's write landing between the two reads
// decides the arm. This ticket ships the helper those sites will move to; no suite is edited here
// (the Development Manager's ruling: helper first). The two properties that make that move safe
// are the two this file pins: (1) an unfiltered query never reaches the network at all, and (2) the
// zero-before precondition proves the key being counted is the probe's own, so a peer's rows can
// never be read as the probe's.
//
// ARMS. P -- scopeOf / assertScoped, pure. F -- countScoped over a ledger fetch (the request it
// builds, and both rejection shapes). G -- gradeOwnWrites, four cases. L -- one live credentialed
// read, which DECLARES not-run without credentials rather than passing vacuously.
//
// Every assertion message names its arm, so a red says which branch fired (STANDARDS.md Section 4,
// the LOO-013 lesson) rather than only that something was unequal.

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { scopeOf, assertScoped, countScoped, gradeOwnWrites } from "./_lib/scoped-count.js";

const NIL = "00000000-0000-0000-0000-000000000000";
const OWN = "runner_before_images?select=id&decision_id=eq." + NIL;
const SCOPES = { images: OWN, decisions: "runner_decisions?select=id&id=eq." + NIL };
const Z = { images: 0, decisions: 0 };

const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

// A fetch ledger, which is the whole point of the arm: `peers` are rows a CONCURRENT cycle owns,
// `own` are the probe's. A SCOPED query sees `own` only; an unscoped one sees peers + own -- the
// exact contamination AGT-571 exists to remove. Every call is recorded, so "refused before the
// network" is assertable as calls.length === 0 rather than inferred from the message.
function ledger(own = 0) {
  const l = {
    peers: 100,
    own,
    calls: [],
    fetchImpl: async (u, init) => {
      l.calls.push({ u, init });
      const scoped = scopeOf(String(u).split("/rest/v1/")[1]).length > 0;
      const n = scoped ? l.own : l.peers + l.own;
      return { ok: true, status: 200, headers: { get: () => "*/" + n } };
    },
  };
  return l;
}

async function run() {
  // ---- arm P: what counts as a scope --------------------------------------------------------
  assert.deepStrictEqual(
    scopeOf("runner_decisions?select=id&order=id&limit=1"), [],
    "arm P: select/order/limit only SHAPE a read -- none of them narrows it, so the scope is empty");
  assert.deepStrictEqual(
    scopeOf(OWN), ["decision_id"],
    "arm P: decision_id= is the filter that makes the count the probe's own");

  assert.throws(() => assertScoped("backlog_items?select=id"), /counts the whole of backlog_items/,
    "arm P: an unfiltered table read is the AGT-571 defect and must be refused by name");
  assert.throws(() => assertScoped(""), /names no table/,
    "arm P: an empty query names no table and must be refused before anything else");

  // ---- arm F: the request countScoped builds, and both rejection shapes -----------------------
  const lF = ledger(7);
  assert.strictEqual(
    await countScoped("https://db.invalid/", "k", OWN, lF), 7,
    "arm F: a scoped count returns the owner's 7 rows, not the ledger's 107");
  assert.strictEqual(lF.calls.length, 1, "arm F: exactly one request per count");
  assert.strictEqual(lF.calls[0].u, "https://db.invalid/rest/v1/" + OWN,
    "arm F: the trailing slash on the base URL is collapsed, not doubled, before /rest/v1/");
  assert.strictEqual(lF.calls[0].init.method, "HEAD",
    "arm F: a count never fetches bodies -- HEAD, so a big table costs one header");
  assert.strictEqual(lF.calls[0].init.headers.Prefer, "count=exact",
    "arm F: count=exact, because a planned estimate would make the before/after arithmetic a guess");

  await assert.rejects(
    () => countScoped("https://db.invalid", "k", OWN,
      { fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => "" } }) }),
    /content-range ''/,
    "arm F: a missing content-range is a failed count, never a silent zero");
  await assert.rejects(
    () => countScoped("https://db.invalid", "k", OWN,
      { fetchImpl: async () => ({ ok: false, status: 500, headers: { get: () => "*/3" } }) }),
    /HTTP 500/,
    "arm F: a 500 with a parseable range is still a failed count");

  // F8 -- the refusal happens BEFORE the network, which is what makes it a guard and not a report.
  const lF8 = ledger(0);
  await assert.rejects(
    () => countScoped("https://db.invalid", "k", "runner_decisions?select=id", lF8),
    /counts the whole/,
    "arm F8: an unscoped count is refused");
  assert.strictEqual(lF8.calls.length, 0,
    "arm F8: refused BEFORE the network -- an unscoped count must cost zero requests");

  // ---- arm G: a probe graded on its own rows --------------------------------------------------
  // G1: a peer writes 3 rows DURING the probe. The old whole-table form would have seen 100 -> 103
  // and failed the probe for someone else's writes; the scoped form sees 0 -> 0 and passes.
  const lG1 = ledger();
  const g1 = await gradeOwnWrites("u", "k", SCOPES, async () => { lG1.peers += 3; return "ran"; }, lG1);
  assert.deepStrictEqual(g1, { before: Z, after: Z, result: "ran" },
    "arm G1: a peer's 3 rows must not move the probe's own counts, and the probe's value is returned");
  assert.strictEqual(lG1.peers + lG1.own, 103,
    "arm G1: the peer writes really did land -- the arm would be vacuous if the table had not moved");

  // G3: the probe moves its OWN rows while declaring no delta. That is a real failure and is named.
  const lG3 = ledger();
  await assert.rejects(
    () => gradeOwnWrites("u", "k", SCOPES, async () => { lG3.own += 1; }, { ...lG3, label: "refusal" }),
    /refusal: its own rows moved/,
    "arm G3: an undeclared own-row write fails under the caller's own label");

  // G4: the key already holds rows before the probe, so it is NOT provably the probe's own key.
  // The precondition must fire first -- before the probe can write anything.
  let g4ProbeRan = false;
  await assert.rejects(
    () => gradeOwnWrites("u", "k", SCOPES, async () => { g4ProbeRan = true; }, ledger(2)),
    /BEFORE the probe/,
    "arm G4: a non-zero before-count means the scope is not provably the probe's own");
  assert.strictEqual(g4ProbeRan, false,
    "arm G4: the precondition gates the probe -- it must not have run");

  // G6: a declared delta is the normal success path for a probe that does write.
  const lG6 = ledger();
  const g6 = await gradeOwnWrites("u", "k", { images: OWN }, async () => { lG6.own += 1; },
    { ...lG6, delta: { images: 1 } });
  assert.deepStrictEqual(g6.before, { images: 0 }, "arm G6: zero before");
  assert.deepStrictEqual(g6.after, { images: 1 },
    "arm G6: one declared own write, and the declared delta is what makes it a pass");

  // ---- arm L: one live credentialed read ------------------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("arm L (live read)",
      `no Supabase credentials, so the helper's HEAD/count=exact request was never sent to a real ` +
      `PostgREST -- ${CRED_HINT}`);
    return;
  }

  const live = await gradeOwnWrites(url, key, SCOPES, async () => {}, { label: "L" });
  assert.deepStrictEqual(live.after, Z,
    `arm L: the NIL-scoped reads must hold zero live rows after a no-op probe, got ${JSON.stringify(live.after)}`);

  const ships = await countScoped(url, key, "runner_decisions?select=id&kind=eq.ship");
  assert.ok(ships > 0,
    `arm L: a scoped live count must return real rows, not zero -- kind=eq.ship returned ${ships}`);
}

export default run;
selfRun(import.meta.url, run);
