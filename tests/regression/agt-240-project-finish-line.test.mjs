// DeepBench v7.0.662 | tests/regression/agt-240-project-finish-line.test.mjs | AGT-240
// FEATURE: AGT-240 -- PROJECTS GET A FINISH LINE. Kickoff:
// docs/kickoffs/v7.0.662-AGT-240-project-finish-line.md §5 task 7 and §6.
//
// FIVE ARMS; A, B and E run offline, C and D need credentials and are declared notRun without them:
//   A  PURE -- propose-project.js validateProposal() refuses, in finish_project_batch()'s own texts:
//      a missing field, a bad slug, no tickets, a ticket missing a field, an unnamed class, a
//      fractional cycle count, a finding not on the list, a finding in two tickets, an executing
//      target; it accepts a clean proposal, a new slug, a planned target and the finishing perpetual
//      project's own slug. CONTROL: the executing target is refused only because of its status -- the
//      same proposal naming a planned project passes. origin/dev has no propose-project.js -- red.
//   B  PURE -- audit-review.js: KINDS carries `list`; a list group without a reason is refused and
//      with one is clean; a filing group routed (or picked) into an executing project is refused with
//      the lock sentence, while the same group into a planned project is clean. origin/dev has no
//      `list` kind and no lock refusal -- red.
//   C  LIVE, READ-ONLY -- (f) happened: Auditor Enhancements holds 0 open tickets filed on or after the
//      cut that are not john-named (40 before), and its epic is locked. origin/dev: 40, unlocked.
//   D  LIVE, NO WRITES -- a `discovered` POST into Auditor Enhancements is refused with the AGT-240
//      lock sentence (accepted -> DELETE and fail); finish_project_batch on its epic is refused (not
//      due); finding_group_epic refuses an Auditor finding into the executing project; the anon key is
//      denied on the four functions. Backlog, decision and finding counts are re-read equal.
//   E  PURE -- renderProposedProjects(): not read, a measured none, and a proposal with its ticket
//      count, classes, cycles and the start line.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROPOSE = pathToFileURL(path.join(ROOT, "scripts", "propose-project.js")).href;
const REVIEW = pathToFileURL(path.join(ROOT, "scripts", "audit-review.js")).href;
const BRIEF = pathToFileURL(path.join(ROOT, "scripts", "render-standing-brief.js")).href;

const EPIC_AE = "6c8a8325-205c-4e08-b0b2-64c939582cc6";
const CUT = "2026-09-24T05:00:00Z";
const CYCLE = "fe346b72-3e94-41e6-999c-572150456327";
const LOCK_SENTENCE = "AGT-240: epic Auditor Enhancements is locked; the finding waits on the findings list";
const FUNCS = [
  ["project_batch_state", {}],
  ["finish_project_batch", { p_cycle_id: CYCLE, p_session_name: null, p_epic: EPIC_AE, p_proposal: {} }],
  ["start_proposed_project", { p_slug: "nope", p_john_words: "x", p_session_name: "agt240-test" }],
  ["apply_finish_line_backfill", { p_cycle_id: CYCLE, p_session_name: null, p_cut: CUT }],
];

async function req(url, key, q, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${url}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
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

  // --- A. validateProposal, pure --------------------------------------------------------------------
  await arm("A validateProposal", async () => {
    const { validateProposal, validateReviewAnswer, pickDue } = await import(PROPOSE);
    const findings = [{ id: "f1" }, { id: "f2" }, { id: "f3" }];
    const projects = [
      { slug: "auditor-enhancements", status: "executing" },
      { slug: "dev-manager-capabilities", status: "executing" },
      { slug: "security", status: "planned" },
    ];
    const t = extra => ({ title: "t", root_cause: "r", fix: "f", priority_class: "P10 - Tooling", predicted_cycles: 1, finding_ids: ["f1"], ...extra });
    const P = extra => ({ slug: "next-thing", name: "Next", charter: "c", reason: "why", tickets: [t()], ...extra });
    const refusals = (p, fin) => validateProposal(p, findings, projects, fin).refusals;

    assert.deepEqual(refusals(P()), [], "a clean proposal with a new slug passes");
    assert.deepEqual(refusals(P({ slug: "security" })), [], "a planned project may be the target");
    assert.deepEqual(refusals(P({ reason: " " })), ["proposal needs slug, name, charter and reason"]);
    assert.deepEqual(refusals(P({ slug: "Bad_Slug" })), ["proposal slug Bad_Slug is not lowercase words joined by hyphens"]);
    assert.deepEqual(refusals(P({ tickets: [] })), ["proposal needs at least one ticket"]);
    assert.deepEqual(refusals(P({ tickets: [t({ fix: "" })] })),
      ["ticket 1 needs title, root_cause, fix, priority_class, predicted_cycles and finding_ids"]);
    assert.deepEqual(refusals(P({ tickets: [t({ priority_class: "Tooling" })] })),
      ["ticket 1 priority_class Tooling is not a named class (P1 - ... to P10 - ...)"]);
    assert.deepEqual(refusals(P({ tickets: [t({ predicted_cycles: 1.5 })] })),
      ["ticket 1 predicted_cycles must be a whole number of at least 1"]);
    assert.deepEqual(refusals(P({ tickets: [t({ finding_ids: ["nope"] })] })), ["finding nope is not open, carried or listed"]);
    assert.deepEqual(refusals(P({ tickets: [t(), t({ finding_ids: ["f2", "f1"] })] })), ["finding f1 in two tickets"]);
    // The discriminating pair: the same proposal is refused ONLY because its target executes.
    assert.deepEqual(refusals(P({ slug: "auditor-enhancements" })),
      ["project auditor-enhancements is executing; a proposal names a new slug or a planned, paused or done project"]);
    assert.deepEqual(refusals(P({ slug: "dev-manager-capabilities" }), { slug: "dev-manager-capabilities", perpetual: true }), [],
      "the finishing perpetual project leaves executing in the same call, so it may take its own slug (D6)");

    assert.equal(validateReviewAnswer({ areas: [{ area: "a", state: "working", evidence: "e" }] }).ok, true);
    assert.deepEqual(validateReviewAnswer({ areas: [{ area: "a", state: "fine", evidence: "e" }] }).refusals,
      ["area 1 needs area, evidence and a state of working, broken or missing"]);
    assert.deepEqual(pickDue([{ slug: "b", proposal_due: true }, { slug: "a", proposal_due: false }, { slug: "a2", proposal_due: true }]).map(r => r.slug),
      ["a2", "b"], "only due batches, first by slug");
  });

  // --- B. the audit-review.js mirror, pure -------------------------------------------------------------
  await arm("B list kind + lock mirror", async () => {
    const { KINDS, validateReview } = await import(REVIEW);
    assert.ok(KINDS.includes("list"), "KINDS carries list");
    const wl = [{ id: "au", source: "auditor", finding_type: "defect", weeks_seen: 1 },
                { id: "to", source: "ticket-owner", finding_type: "gap", weeks_seen: 1 }];
    const routes = [{ precedence: 20, source: "auditor", finding_type: "*", project_slug: "auditor-enhancements" },
                    { precedence: 30, source: "ticket-owner", finding_type: "*", project_slug: null }];
    const projects = [{ slug: "auditor-enhancements", status: "executing" }, { slug: "dev-manager-capabilities", status: "executing" },
                      { slug: "security", status: "planned" }];
    const rv = groups => validateReview({ groups, summary_for_john: "qa", patterns_applied: [] }, wl, "2026-W39", undefined, routes, projects).refusals;
    const list = (ids, reason) => ({ kind: "list", finding_ids: ids, ...(reason === undefined ? {} : { reason }) });

    assert.deepEqual(rv([list(["au", "to"])]), ["list needs a reason"]);
    assert.deepEqual(rv([list(["au", "to"], "waits for the next proposal")]), []);
    assert.deepEqual(rv([{ kind: "root-cause", title: "t", root_cause: "r", fix: "f", finding_ids: ["au"] }, list(["to"], "x")]),
      ["project auditor-enhancements is executing -- its list is locked; use kind list (AGT-240)"],
      "the Auditor route files into an executing project: refused with the function's sentence");
    assert.deepEqual(rv([{ kind: "root-cause", title: "t", root_cause: "r", fix: "f", project: "dev-manager-capabilities", finding_ids: ["to"] }, list(["au"], "x")]),
      ["project dev-manager-capabilities is executing -- its list is locked; use kind list (AGT-240)"],
      "the manager's pick of an executing project is refused the same way");
    assert.deepEqual(rv([{ kind: "root-cause", title: "t", root_cause: "r", fix: "f", project: "security", finding_ids: ["to"] }, list(["au"], "x")]), [],
      "CONTROL: the same pick into a planned project is clean");
  });

  // --- E. the brief's group, pure ----------------------------------------------------------------------
  await arm("E renderProposedProjects", async () => {
    const { renderProposedProjects } = await import(BRIEF);
    assert.match(renderProposedProjects(undefined, "as of X"), /were not read for this render/);
    assert.match(renderProposedProjects([], "as of X"), /\*\*0 proposed\.\*\*[\s\S]*\*\*None\*\* — a measured none/);
    const md = renderProposedProjects([{ slug: "next-thing", name: "Next", proposal_reason: "because", proposed_at: "2026-09-27T20:00:00Z",
      tickets: 3, by_class: { "P10 - Tooling": 2, "P2 - Moat": 1 }, cycles: 5 }], "as of X");
    assert.match(md, /\*\*`next-thing`\*\* — Next: \*\*3 ticket\(s\)\*\* \(2 P10 - Tooling, 1 P2 - Moat\), 5 predicted cycle\(s\)/);
    assert.match(md, /Why: because/);
    assert.match(md, /start_proposed_project\('<slug>', '<your words>', '<session name>'\)/, "the yes line names start_proposed_project");
  });

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const anon = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-240 live arms (C, D)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the backfill's effect on Auditor Enhancements, its locked epic, the lock refusal on a discovered insert, the finish refusal and the anon denials are unverified here. Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    // --- C. (f) happened ------------------------------------------------------------------------------
    await arm("C backfill applied", async () => {
      const open = await req(url, key, `backlog_items?epic_id=eq.${EPIC_AE}&status=eq.open&filed_at=gte.${encodeURIComponent(CUT)}` +
        "&or=(scope_origin.is.null,scope_origin.neq.john-named)&select=backlog_id");
      assert.equal(open.status, 200, describe(open));
      assert.deepEqual(open.json.map(r => r.backlog_id), [],
        "Auditor Enhancements holds no open, non-john-named ticket filed on or after the cut -- (f) returned them to the findings list");
      const ep = await req(url, key, `epics?id=eq.${EPIC_AE}&select=locked_at,finished_at`);
      assert.equal(ep.status, 200, describe(ep));
      assert.ok(ep.json[0] && ep.json[0].locked_at, "the Auditor Enhancements list is locked");
      const listed = await count(url, key, "audit_findings?status=eq.listed&ruling=like.AGT-240*&select=id");
      assert.ok(listed >= 65, `the returned findings wait as listed (62 carried + 3 minted); got ${listed}`);
    });

    // --- D. the lock and the finish refuse, nothing is written ------------------------------------------
    await arm("D refusals, no writes", async () => {
      const before = {
        backlog: await count(url, key, "backlog_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        findings: await count(url, key, "audit_findings?select=id"),
      };
      const ins = await req(url, key, "backlog_items", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: { backlog_id: "ZPROBE-2400", tier: "next", type: "Tooling", priority_class: "P10 - Tooling",
                title: "AGT-240 regression probe", status: "open", epic_id: EPIC_AE, source_file: "agt-240-test",
                scope_origin: "discovered", size_stamp: "S", defer_status: "no", scope_rationale: "probe",
                enhancement_claim: "none: probe", row_ordinal: 999999999 },
      });
      if (ins.ok) {
        await req(url, key, "backlog_items?backlog_id=eq.ZPROBE-2400", { method: "DELETE" });
        assert.fail(`a discovered insert into the locked Auditor Enhancements epic was ACCEPTED (deleted again): ${describe(ins)}`);
      }
      assert.ok(String(ins.json?.message ?? ins.text).includes(LOCK_SENTENCE),
        `the refusal must be the lock's own sentence (a later AGT-238 refusal would mean the lock is gone); got ${describe(ins)}`);

      const fin = await req(url, key, "rpc/finish_project_batch", { method: "POST", body: FUNCS[1][1] });
      assert.equal(fin.status, 400, describe(fin));
      assert.match(String(fin.json?.message), /^finish_project_batch: epic 6c8a8325-205c-4e08-b0b2-64c939582cc6 is not due a proposal/);

      const f = await req(url, key, "audit_findings?found_by=like.auditor*&select=id&limit=1");
      assert.equal(f.status, 200, describe(f));
      if (f.json.length) {
        const g = await req(url, key, "rpc/finding_group_epic", { method: "POST",
          body: { p_group: { kind: "root-cause", project: "general", finding_ids: [f.json[0].id] } } });
        assert.equal(g.status, 400, describe(g));
        assert.equal(g.json?.message, "apply_audit_review: project auditor-enhancements is executing -- its list is locked; use kind list (AGT-240)");
      }

      if (anon) {
        for (const [fn, body] of FUNCS) {
          const a = await req(url, anon, `rpc/${fn}`, { method: "POST", body });
          assert.notEqual(a.code, "PGRST202", `PGRST202 means ${fn} is missing, never a pass; got ${describe(a)}`);
          assert.ok(!a.ok && /42501|permission denied/.test(a.text), `the anon key must be denied ${fn}; got ${describe(a)}`);
        }
      } else {
        notRun("AGT-240 arm D (anon half)", "VITE_SUPABASE_ANON_KEY absent -- the anon denial on the four functions is unverified here");
      }

      const after = {
        backlog: await count(url, key, "backlog_items?select=id"),
        decisions: await count(url, key, "runner_decisions?select=id"),
        findings: await count(url, key, "audit_findings?select=id"),
      };
      assert.deepEqual(after, before, "no probe wrote anything");
    });
  }

  notRun("AGT-240 catalog facts (pg_proc overloads, grants, the rolled-back finish/start/reverse fixture)",
    "pg_proc and a rolled-back transaction are not reachable over PostgREST; the migration agt240_project_finish_line asserts them in its own trailing DO block, which aborts the whole migration on any mismatch.");

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
