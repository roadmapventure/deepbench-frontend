// DeepBench v7.0.985 | tests/regression/agt-628-settle-converges.test.mjs | AGT-628
//
// THE CLOSE-OUT'S COST PATCH VERIFIES THE CLAUSE IT PROMISED, AND ONE SETTLE MINTS ONE DECISION.
//
// WHAT THIS GUARDS, measured live on cycle `828a6ded-40ef-4a1a-8b2f-c8ff726d7c96` (`item_id`
// AGT-521) before the change rather than recalled. `writeCost()` composed the `notes` it was about
// to write (`prior | cost_basis: <basis>`), PATCHed `runner_cycles`, then graded the WHOLE string
// back by `String(got ?? null) === String(want ?? null)`. It could never match, and the reason is in
// the database, not the script: `trg_runner_cycles_notes_citations` is BEFORE UPDATE OF `notes` and
// block 3 of `runner_record_citation_guard()` (AGT-173, `v7.0.652`) APPENDS a `Reversible through
// decision handle ...` sentence per unnamed handle of `cycle_reversal_handles(NEW.id, NEW.item_id)`,
// with no exception path. The live row read 11,754 bytes of `notes` with 3 handle sentences and
// `cost_basis: subscription-lane` PRESENT -- so THE WRITE LANDED and `fail()` still took exit 2 over
// it. And the retry could not converge either: each re-run minted another `ticket-status` decision
// (`aeb2829b`, `ccd28863` -- two rows under ONE identical summary), each new decision minted another
// handle, and the trigger appended it. Unconvergeable by construction.
//
// WHY THE ASSERTIONS ARE SHAPED THIS WAY. A containment check that only proved the happy arm would
// pass against a build that deleted the read-back altogether, so arm B asserts the two REJECTIONS
// that have to survive the loosening: the clause genuinely absent, and the OTHER key wrong while the
// clause is present (`api_cost_dev_usd` keeps its strict compare -- nothing appends to a numeric
// column). And a census keyed on the TICKET would make `--resettle` silently reuse a decision for a
// status nobody recorded, so arm E asserts the key is the SETTLE: the same ticket under a `partial`
// summary still mints for `delivered`. That is the LOO-013 lesson applied -- assert WHICH branch
// fired, not merely that something did.
//
// THIS IS A SEAM PROOF, LABELLED AS ONE (STANDARDS.md Section 4): it imports the shipped
// `writeCost()` and `applySettle()` and drives them for real, intercepting their one transport edge
// -- `rest()`'s global `fetch` -- with a route-counting stub. Nothing here recreates the subject:
// every branch under test is the shipped function's own.
//
// OFFLINE AND WRITES NOTHING. No credentials, no Supabase, no board; `base` is `http://x` and every
// route is stubbed, so there is nothing to clean up (pattern:76) and no live value is graded
// (pattern:162).

import assert from "assert";
import { selfRun, notRun } from "./_lib/self-run.js";
import { writeCost, applySettle, SettleShipError } from "../../scripts/settle-ship.js";

const CY = "22222222-2222-4222-8222-222222222222";
const D1 = "11111111-1111-4111-8111-111111111111";
const ROWID = "99999999-9999-4999-8999-999999999999";
const COST = { usd: 0, basis: "subscription-lane", billable: 0, priced: 0 };
const CLAUSE = `cost_basis: ${COST.basis}`;
const ROW = { id: ROWID, backlog_id: "ZAGT628", status: "open" };
const W = { base: "http://x", key: "k", cycleId: CY };
// A4's own output for this ticket at this status. Composed the way the script composes it, because
// the whole point of arms D and E is that THIS string is the idempotence key.
const SUM = "Close-out: ZAGT628 settles `delivered`";
const OTHER_SUM = "Close-out: ZAGT628 settles `partial`";

// THE TRIGGER IS IMITATED HERE, DELIBERATELY AND VISIBLY: the PATCH on `runner_cycles` answers with
// the body's own `notes` PLUS one `Reversible through decision handle ...` sentence, which is what
// the live BEFORE UPDATE trigger does to every such write. `dropClause` is the counter-fixture --
// an echo that genuinely lost the clause -- and `echoCost` lets arm B move the one key that is still
// graded strictly.
function server({ census = [], dropClause = false, echoCost = undefined } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const path = String(url).split("/rest/v1/")[1] ?? String(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method, path, body });
    const ok = (status, text) => ({ ok: true, status, statusText: "OK", text: async () => text });

    if (method === "GET" && path.startsWith("runner_cycles?select=*")) {
      return ok(200, JSON.stringify([{ id: CY, item_id: "ZAGT628", notes: "prior note", api_cost_dev_usd: 0 }]));
    }
    if (method === "GET" && path.startsWith("runner_items")) return ok(200, JSON.stringify([]));
    if (method === "GET" && path.startsWith("runner_decisions")) return ok(200, JSON.stringify(census));
    if (method === "POST" && path === "rpc/record_decision") return ok(200, JSON.stringify(D1));
    if (method === "POST" && path === "runner_before_images") return ok(201, "");
    if (method === "PATCH" && path.startsWith("backlog_items")) {
      return ok(200, JSON.stringify([{ ...ROW, ...body }]));
    }
    if (method === "PATCH" && path.startsWith("runner_cycles")) {
      const kept = dropClause ? "prior note" : String(body.notes);
      return ok(200, JSON.stringify([{
        id: CY, item_id: "ZAGT628",
        notes: `${kept}\n\nReversible through decision handle ${D1} (resolve): x.`,
        api_cost_dev_usd: echoCost === undefined ? body.api_cost_dev_usd : echoCost,
      }]));
    }
    throw new Error(`the stub was asked for an unstubbed route: ${method} ${path}`);
  };
  const posts = to => calls.filter(c => c.method === "POST" && c.path === to).length;
  return { calls, fetch, posts };
}

async function withServer(opts, fn) {
  const real = globalThis.fetch;
  const s = server(opts);
  globalThis.fetch = s.fetch;
  try {
    return await fn(s);
  } finally {
    globalThis.fetch = real;
  }
}

// ---- (A) the clause the patch promised is IN the cell, trigger sentence and all ---------------
async function armA() {
  await withServer({}, async s => {
    await writeCost({ ...W, cost: COST });
    const patch = s.calls.find(c => c.method === "PATCH" && c.path.startsWith("runner_cycles"));
    assert.ok(patch, "writeCost must still PATCH runner_cycles — a read-back that never wrote is a vacuous green");
    assert.ok(String(patch.body.notes).includes(CLAUSE),
      `the composed notes must carry \`${CLAUSE}\`: the cell says THAT the cost is unknown, the basis says WHICH branch decided it; got ${JSON.stringify(patch.body.notes)}`);
    assert.strictEqual(patch.body.api_cost_dev_usd, COST.usd,
      "`api_cost_dev_usd` is still written UNCONDITIONALLY (AGT-204) — this arm must not pass by the cost write having gone away");
  });
}

// ---- (B) containment is no blanket pass, and the strict compare on the other key survives -----
async function armB() {
  // B1 -- the clause genuinely absent. If this RESOLVES, the read-back has been deleted rather than
  // loosened, and the next silently-dropped cost write is invisible.
  await withServer({ dropClause: true }, async () => {
    await assert.rejects(
      () => writeCost({ ...W, cost: COST }),
      e => {
        assert.ok(e instanceof SettleShipError, `the refusal must be a SettleShipError so main() exits 2 on it; got ${e && e.constructor && e.constructor.name}`);
        assert.ok(e.message.includes(CLAUSE),
          `the message must NAME the clause the cell is missing, or the operator cannot tell this from any other patch failure; got ${e.message}`);
        return true;
      },
      "an echo that lost the clause must REJECT: containment grades the trigger's appending out, never the write itself");
    });

  // B2 -- the clause present and `api_cost_dev_usd` wrong. Nothing appends to a numeric column, so a
  // wrong figure there is a wrong MEASUREMENT and the strict compare in the loop must still catch it.
  await withServer({ echoCost: 1.23 }, async () => {
    await assert.rejects(
      () => writeCost({ ...W, cost: COST }),
      e => {
        assert.ok(e instanceof SettleShipError, "the strict-compare refusal is a SettleShipError too");
        assert.ok(/api_cost_dev_usd/.test(e.message),
          `the surviving strict compare must name \`api_cost_dev_usd\`; got ${e.message}`);
        assert.ok(!e.message.includes("chars without"),
          `this must fail on the NUMBER, not on containment — the clause is present in this arm, so a containment message means the fixture is not testing what it claims; got ${e.message}`);
        return true;
      },
      "AGT-628 loosened `notes` ONLY. A `notes`-shaped exemption that also swallowed the cost column would trade the measurement away");
  });
}

// ---- (D) one settle mints one decision, however often it runs --------------------------------
async function armD() {
  const first = await withServer({ census: [] }, async s => {
    const out = await applySettle({
      ...W, ticket: "ZAGT628", row: ROW, kickoffPath: "docs/kickoffs/x.md",
      status: "delivered", reasons: ["r"], log: () => {},
    });
    assert.strictEqual(s.posts("rpc/record_decision"), 1,
      `an unrecorded settle mints EXACTLY ONE decision; got ${s.posts("rpc/record_decision")}`);
    assert.strictEqual(s.posts("runner_before_images"), 1,
      `and images the row exactly once, before the cell moves; got ${s.posts("runner_before_images")}`);
    assert.strictEqual(out.decision, D1, "the decision returned is the id the RPC answered with");
    const census = s.calls.find(c => c.method === "GET" && c.path.startsWith("runner_decisions"));
    assert.ok(census, "the census READ must happen — a mint with no census is the unconvergeable retry again");
    assert.ok(census.path.includes(`cycle_id=eq.${CY}`),
      `the census is scoped to THIS attribution, never the whole ticket's history; got ${census.path}`);
    assert.ok(census.path.includes("kind=eq.ticket-status"),
      `and to the `+"`ticket-status`"+` kind, or a `+"`resolve`"+` row would be reused as a status decision; got ${census.path}`);
    return out;
  });

  await withServer({ census: [{ id: D1, summary: SUM, decided_at: "2026-11-09T00:00:00Z" }] }, async s => {
    const out = await applySettle({
      ...W, ticket: "ZAGT628", row: ROW, kickoffPath: "docs/kickoffs/x.md",
      status: "delivered", reasons: ["r"], log: () => {},
    });
    assert.strictEqual(s.posts("rpc/record_decision"), 0,
      `a re-run of the SAME settle mints ZERO further decisions — this read 1 on the unchanged tree, and each extra row minted another reversal handle for the trigger to append; got ${s.posts("rpc/record_decision")}`);
    assert.strictEqual(s.posts("runner_before_images"), 0,
      `and images NOTHING: on a re-run \`row\` is the already-settled row, so a second image would record \`delivered\` as the prior value and hand reverse_decision() a restore to the state it undoes. Got ${s.posts("runner_before_images")}`);
    assert.strictEqual(out.decision, D1,
      "and it still RETURNS the decision id — a reuse that returned null would leave the caller with no handle to report");
    assert.strictEqual(out.after.status, "delivered",
      "the PATCH still runs and is still read back: the status write is idempotent, and skipping it would leave a half-settled row un-converged");
  });

  assert.strictEqual(first.decision, D1, "both calls answer with the one decision id");
}

// ---- (E) the key is the SETTLE, not the ticket ------------------------------------------------
async function armE() {
  await withServer({ census: [{ id: D1, summary: OTHER_SUM, decided_at: "2026-11-09T00:00:00Z" }] }, async s => {
    const out = await applySettle({
      ...W, ticket: "ZAGT628", row: ROW, kickoffPath: "docs/kickoffs/x.md",
      status: "delivered", reasons: ["r"], log: () => {},
    });
    assert.strictEqual(s.posts("rpc/record_decision"), 1,
      `a \`partial\` decision on this ticket is a DIFFERENT settle: the \`delivered\` one is a decision nobody has recorded, so it must still mint. Got ${s.posts("rpc/record_decision")} — zero here would make every --resettle report a handle for a status it never decided`);
    assert.strictEqual(s.posts("runner_before_images"), 1,
      "and it images the row, because this write really is moving a cell for the first time");
    assert.strictEqual(out.decision, D1, "the minted id is returned");
  });
}

export default async function run() {
  await armA();
  await armB();
  await armD();
  await armE();
  // Clause 3 of SES-135: the one part this file does not run, declared loudly rather than implied.
  notRun(
    "AGT-628 — the LIVE `trg_runner_cycles_notes_citations` appending text",
    "the stub IMITATES the trigger's `Reversible through decision handle ...` sentence; the live " +
    "trigger and the live `runner_cycles.notes` are not read here, because a check grades the change " +
    "and never the live world (pattern:162). The appending was measured credentialed in AGT-628's own " +
    "reproduction on cycle 828a6ded-40ef-4a1a-8b2f-c8ff726d7c96 (11,754 B of notes, 3 handle " +
    "sentences, the clause PRESENT) and in `pg_get_triggerdef` / `pg_proc.prosrc` for " +
    "`runner_record_citation_guard`."
  );
  console.log("[AGT-628] notes graded by CONTAINMENT (2 rejections held) · api_cost_dev_usd still STRICT · one settle = 1 decision + 1 image, a re-run = 0 + 0, a different status = 1 + 1 · seam proof over scripts/settle-ship.js, offline, writes nothing");
}

selfRun(import.meta.url, run);
