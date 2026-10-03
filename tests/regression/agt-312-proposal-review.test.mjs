// DeepBench v7.0.747 | tests/regression/agt-312-proposal-review.test.mjs | AGT-312
// FEATURE: AGT-312 -- A PROPOSAL REACHES JOHN ONLY WHEN BOTH THE MANAGER AND VICTORIA AGREE.
// Kickoff: docs/kickoffs/v7.0.747-AGT-312-proposal-review-gate.md §5 task 4 and §6.
//
// John, verbatim 2026-10-02 (runner_decisions 6668e1ac, kind john-ruling, open, not reversed):
// "add one extra item, before it get's proposed, victoria has to review it too, and both the dev
// mgr and victoria agree it needs to be brought to my attention."
//
// TWO ARMS; A runs offline, B needs credentials and is declared notRun without them:
//   A  PURE -- propose-project.js validateAgreement() in finish_project_batch()'s own three texts:
//      no review at all, a verdict that is neither word, a `disagree`, and an `agree` that is the
//      ONLY input returning no refusals. proposalBody() carries `review` when handed an agreement
//      and omits the key entirely when not -- the body --for-review writes for Victoria must not
//      hand her a verdict to read her own answer out of. CONTROL on the one that matters: the same
//      review refused for `disagree` is clean for `agree`, so the refusal is the VERDICT's and not
//      the shape's. origin/dev has no validateAgreement -- red.
//   B  LIVE, NO WRITES -- THE DISCRIMINATOR. The same non-due epic agt-240 arm D uses, called twice
//      over PostgREST: a review-less p_proposal answers the AGT-312 review sentence, and the SAME
//      call carrying an agreed review gets past the gate and answers `is not due a proposal`. That
//      PAIR is the whole proof: one call alone cannot tell a working gate from a call failing for
//      an unrelated reason (the LOO-013 lesson -- assert WHICH branch fired). A `disagree` and a
//      `maybe` take their own two branches. runner_decisions and projects counts are re-read equal,
//      because the gate is checked BEFORE project_batch_state() and so cannot write anything.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROPOSE = pathToFileURL(path.join(ROOT, "scripts", "propose-project.js")).href;

// The same epic agt-240 arm D calls: a `planned` project whose list is not even locked, so it is
// never due a proposal. Nothing here depends on that -- only that it is not due. AGT-291 moved it
// off Auditor Enhancements, which is now finished (paused, locked, no member open or partial) and
// therefore due.
const EPIC_NOT_DUE = "eeda31e6-7149-4afe-824a-ccf4fb1d571d";
const CYCLE = "fe346b72-3e94-41e6-999c-572150456327";

const M1 = "proposal needs a review with verdict, reason and account (John 2026-10-02, decision 6668e1ac)";
const M3 = "the review verdict is disagree -- a proposal reaches John only when both the manager and the review agree (John 2026-10-02, decision 6668e1ac)";
const PREFIX = "finish_project_batch: ";

async function req(url, key, q, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json, code: json && !Array.isArray(json) ? json.code : undefined };
}
const describe = r => `HTTP ${r.status} code=${r.code ?? "-"} ${r.text.slice(0, 240)}`;

async function count(url, key, q) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  const n = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  if (!res.ok || !Number.isFinite(n)) throw new Error(`count ${q} -> HTTP ${res.status}`);
  return n;
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  // --- A. validateAgreement + proposalBody, pure ---------------------------------------------------
  await arm("A validateAgreement", async () => {
    const { validateAgreement, proposalBody, NEEDS_REVIEW, REVIEW_DISAGREED, AGREEMENT_VERDICTS } = await import(PROPOSE);

    // The texts are the function's own, bare. If these drift, the dry-run stops predicting the apply.
    assert.equal(NEEDS_REVIEW, M1, "NEEDS_REVIEW is finish_project_batch()'s sentence without its prefix");
    assert.equal(REVIEW_DISAGREED, M3, "REVIEW_DISAGREED is finish_project_batch()'s sentence without its prefix");
    assert.deepEqual([...AGREEMENT_VERDICTS], ["agree", "disagree"], "two verdicts, and no third");

    // §6.2's four cases.
    assert.deepEqual(validateAgreement(undefined).refusals, [M1], "no review at all");
    assert.deepEqual(validateAgreement({ verdict: "maybe", reason: "r", account: "a" }).refusals,
      ["review verdict maybe is not agree or disagree"], "a verdict that is neither word names itself");
    assert.deepEqual(validateAgreement({ verdict: "disagree", reason: "r", account: "a" }).refusals, [M3]);
    assert.deepEqual(validateAgreement({ verdict: "agree", reason: "r", account: "a" }).refusals, [],
      "an agreed review is the only input that returns no refusals");
    assert.equal(validateAgreement({ verdict: "agree", reason: "r", account: "a" }).ok, true);
    assert.equal(validateAgreement({ verdict: "disagree", reason: "r", account: "a" }).ok, false);

    // Each of the three fields is required, and a blank one is as absent as a missing one.
    for (const bad of [{ reason: "r", account: "a" }, { verdict: "agree", account: "a" },
                       { verdict: "agree", reason: "r" }, { verdict: "agree", reason: " ", account: "a" },
                       { verdict: " ", reason: "r", account: "a" }, { verdict: "agree", reason: "r", account: "  " }]) {
      assert.deepEqual(validateAgreement(bad).refusals, [M1], `an incomplete review is refused: ${JSON.stringify(bad)}`);
    }
    assert.deepEqual(validateAgreement("agree").refusals, [M1], "a bare string is not a review");
    assert.deepEqual(validateAgreement([{ verdict: "agree", reason: "r", account: "a" }]).refusals, [M1],
      "an array is not a review object");

    // proposalBody: the key appears only when an agreement is handed in.
    const answer = { slug: "next-thing", name: "Next", charter: "c", reason: "why", patterns_applied: [2, 8],
      tickets: [{ title: "t", root_cause: "r", fix: "f", priority_class: "P10 - Tooling", predicted_cycles: 1, finding_ids: ["f1"] }] };
    const bare = proposalBody(answer);
    assert.equal("review" in bare, false, "the body --for-review hands Victoria carries NO review key");
    assert.deepEqual(Object.keys(bare), ["slug", "name", "charter", "reason", "tickets", "patterns_applied"]);
    const withReview = proposalBody(answer, { verdict: "agree", reason: "the ticket answers finding f1", account: "acct", extra: "dropped" });
    assert.deepEqual(withReview.review, { verdict: "agree", reason: "the ticket answers finding f1", account: "acct" },
      "exactly the three fields the function reads, and nothing else she returned");
    assert.deepEqual(Object.keys(withReview).slice(0, 6), Object.keys(bare), "the manager's half is untouched");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-312 arm B (the live gate)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the review-less refusal, the agreed control reaching the due check, and the zero-write re-read are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    // --- B. the gate refuses live, and writes nothing ----------------------------------------------
    await arm("B live gate, no writes", async () => {
      const before = {
        decisions: await count(url, key, "runner_decisions?select=id"),
        projects: await count(url, key, "projects?select=id"),
        images: await count(url, key, "runner_before_images?select=id"),
      };
      // agt-240's FUNCS[1] body, minus and plus the review -- the only difference between the two calls.
      const call = p_proposal => req(url, key, "rpc/finish_project_batch", { method: "POST",
        body: { p_cycle_id: CYCLE, p_session_name: null, p_epic: EPIC_NOT_DUE, p_proposal } });

      const none = await call({});
      assert.equal(none.status, 400, describe(none));
      assert.equal(String(none.json?.message), PREFIX + M1,
        "a review-less proposal is refused in the AGT-312 sentence, before the due read");

      // THE CONTROL, and the reason this arm proves anything: the SAME call with an agreed review
      // gets PAST the gate and is refused by the due check instead. A gate that was not there, or
      // one that refused everything, cannot produce this pair.
      const agreed = await call({ review: { verdict: "agree", reason: "x", account: "x" } });
      assert.equal(agreed.status, 400, describe(agreed));
      assert.match(String(agreed.json?.message),
        new RegExp(`^finish_project_batch: epic ${EPIC_NOT_DUE} is not due a proposal`),
        "an agreed review reaches the due check -- so the refusal above was the review's and nothing else's");

      const no = await call({ review: { verdict: "disagree", reason: "x", account: "x" } });
      assert.equal(no.status, 400, describe(no));
      assert.equal(String(no.json?.message), PREFIX + M3, "a disagree takes its own branch");

      const maybe = await call({ review: { verdict: "maybe", reason: "x", account: "x" } });
      assert.equal(maybe.status, 400, describe(maybe));
      assert.equal(String(maybe.json?.message), PREFIX + "review verdict maybe is not agree or disagree",
        "an unknown verdict takes its own branch and names itself");

      const after = {
        decisions: await count(url, key, "runner_decisions?select=id"),
        projects: await count(url, key, "projects?select=id"),
        images: await count(url, key, "runner_before_images?select=id"),
      };
      assert.deepEqual(after, before,
        "the gate is checked before project_batch_state(), so four refused calls wrote no decision, no project and no before-image");
    });
  }

  notRun("AGT-312 the probe's WRITE path (the three calls against a DUE batch, and pg_proc's overload count)",
    "finish_project_batch() is a WRITER of projects, epics, backlog_items, audit_findings and the decision ledger, no epic is due a proposal right now, and this suite reaches Supabase only over PostgREST -- which cannot read pg_proc and cannot open a transaction to roll a fixture back (the SES-196 / SES-310 refusal). MEASURED AT THIS SHIP (v7.0.747) instead, by migration agt312_proposal_review's own trailing DO block, inside a subtransaction ending in the sentinel P0312 so every fixture rolled back while the migration committed: a fixture due batch (a planned project + unlocked epic + one `done` member + one `listed` finding, then executing and locked -- proposal_due true) took all three calls. NO review -> raised 'finish_project_batch: proposal needs a review with verdict, reason and account (John 2026-10-02, decision 6668e1ac)' and the target slug zprobe-0312-target did not exist afterwards (it is what the SAME call wrote as `proposed` before this ship). `disagree` -> raised the disagree sentence, target still absent. `agree` -> the target was written `proposed` and the one `proposal` decision's reasoning matched '%Review: agree -- probe agrees%'. The block also asserted exactly 1 overload of public.finish_project_batch (identity (uuid, text, uuid, jsonb) UNCHANGED, so no DROP was owed -- .claude/rules/supabase-function-signature.md) and exactly one each of the four rows. Re-read independently after the migration: zprobe-0312 projects 0, backlog_items 0, probe findings 0, projects status='proposed' 0, runner_decisions kind='proposal' 0 -- zero residue.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
