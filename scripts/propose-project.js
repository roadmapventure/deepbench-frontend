#!/usr/bin/env node
// DeepBench v7.0.749 | scripts/propose-project.js | AGT-291 -- THE FINISH LINE GETS ITS SENSOR.
// AGT-312 -- A PROPOSAL REACHES JOHN ONLY WHEN BOTH THE MANAGER AND VICTORIA AGREE. AGT-240 --
// PROJECTS GET A FINISH LINE.
//
// John, verbatim 2026-10-02 (decision 6668e1ac): "add one extra item, before it get's proposed,
// victoria has to review it too, and both the dev mgr and victoria agree it needs to be brought to
// my attention." The manager's proposal IS his agreement; hers is a `review-proposal` turn whose
// {verdict, reason, account} rides `p_proposal.review`. This file mirrors the function's three new
// refusal texts offline in validateAgreement(), opens the door that writes her task file
// (--for-review), and REQUIRES --agreement on --apply so no proposal can be sent on one agreement.
//
// John, verbatim 2026-09-27 (Q2): "a project list is locked, anything found goes into a list. Once a
// project is finished, the auditor and dev manager review the current functionality, review the
// auditor list, and propose a new project with ticket counts and why to me. then i decide if the
// routine is going to pick a new project."
//
// This file is the driver of that finish, as a client of public.finish_project_batch(). It decides
// nothing itself (pattern:9): WHETHER a batch is finished is public.project_batch_state()'s
// `proposal_due` (an executing or paused project, a locked list, no locked member open or partial
// (AGT-291), not yet finished) and whether it is still worth a turn is its `review_due` -- that
// same state AND no claim inside 24 hours (AGT-291 D3/D4);
// WHAT to propose is two model turns, run by the caller on the models agent-prompt.js
// prints; the WRITE, its before-images and its one `proposal` decision are the function's (§19b, §19v).
// Rule #1 (§19d/§19e): the Auditor's review reaches the manager only as a row of the task file,
// `functionality_review`, never agent to agent.
//
// Six doors, two validators:
//   --prepare --out=<path>
//       asks rpc/project_batch_state for the batches whose sensor is up (`review_due`), CLAIMS them in
//       order and writes the FIRST ONE IT CLAIMED (by slug) as the task context: epic_id, project,
//       epic, members, findings (the findings list: open, carried and listed), projects. The claim is
//       a conditional PATCH of epics.proposal_attempted_at (AGT-291 D4): a batch another pass took
//       inside 24 hours comes back `[]` and is skipped, so two concurrent fires -- and the <= 3
//       passes one cycle may run -- can never spend two turns on the same batch (pattern:138: races
//       are fixed with claims, not one-run locks). Exit 3 when nothing is `review_due` and when every
//       due batch is already held -- no Auditor turn, no manager turn, no cost.
//   --review=<auditor answer.json> --context=<prepare.json> --out=<path>
//       checks the Auditor's {areas, account} (audit-finish-review / au-finish-intent) and merges it
//       into the context as `functionality_review` -- the manager's task file. No network.
//   --for-review=<manager answer.json> --context=<manager context.json> --out=<path>
//       checks the manager's proposal, then writes Victoria's task file: the manager's context plus
//       `proposal`, the answer as the function will receive it. Rule #1 (§19d/§19e) -- the proposal
//       reaches her as a ROW OF HER TASK FILE, never agent to agent. No network, no model turn.
//   --dry-run=<answer.json> --context=<manager context.json> [--agreement=<review answer.json>]
//       runs validateProposal() over the manager's answer (propose-project / dm-propose-intent), and
//       validateAgreement() over hers when it is handed one -- so the manager's refusals can be seen
//       before her turn is spent, and both halves can be seen after it.
//   --apply=<answer.json> --context=<manager context.json> --agreement=<review answer.json>
//       (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateProposal() first, then validateAgreement() (a refusal of either exits 1
//       and sends nothing), then POSTs rpc/finish_project_batch. --agreement is REQUIRED here: the
//       function refuses a review-less proposal anyway, and exiting 2 says so without a request.
//       Prints her agreement, the reverse line and John's start line.
//
// validateProposal() and validateAgreement() mirror the function's validation texts (without its
// "finish_project_batch: " prefix) and collect every refusal rather than stopping at the first, so a
// dry-run shows the whole list. The one rule they cannot see offline -- the batch is still due --
// stays the function's.
//
// Exit codes: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 nothing due.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// --- pure half (imported by tests/regression/agt-240-project-finish-line.test.mjs; no network) ------

export const NOTHING_DUE = "no project batch is due a proposal — no Auditor or manager turn, no cost (AGT-240)";
// AGT-291 D4: the claim window. A batch attempted inside it is HELD and skipped; one older than it
// is claimable again, so a pass that died between the claim and the proposal cannot strand a batch.
export const CLAIM_HOURS = 24;
export const ALL_HELD = "every batch whose list is finished was claimed inside the last 24 hours — no Auditor or manager turn, no cost (AGT-291)";

// The claim, as a query rather than as prose: the PATCH only matches a row that is unclaimed or
// stale, so the DATABASE decides who got it and `[]` means another pass holds it.
export function claimQuery(epicId, nowMs = Date.now()) {
  const cut = new Date(nowMs - CLAIM_HOURS * 3600e3).toISOString();
  return `epics?id=eq.${encodeURIComponent(String(epicId))}` +
    `&or=(proposal_attempted_at.is.null,proposal_attempted_at.lt.${encodeURIComponent(cut)})`;
}
export const WAITING_STATUSES = Object.freeze(["open", "carried", "listed"]);
export const TARGET_STATUSES = Object.freeze(["planned", "paused", "done"]);
export const AREA_STATES = Object.freeze(["working", "broken", "missing"]);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CLASS_RE = /^P([1-9]|10) - \S/;
const blank = v => String(v ?? "").trim() === "";

// AGT-131: found_by's first segment is the source, as finding_group_epic() reads it.
function sourceOf(foundBy) {
  const s = String(foundBy ?? "");
  return s === "" ? null : s.split(":")[0];
}

// proposal = the manager's {slug, name, charter, reason, tickets, ...}. findings = the context's
// waiting findings (open/carried/listed); projects = every project with its status; finishing = the
// finished project ({slug, perpetual}), whose own slug is judged by the status the finish gives it
// (paused when perpetual, else done). Each of the three is optional: absent, that rule stays the
// function's.
export function validateProposal(proposal, findings, projects, finishing) {
  const refusals = [];
  const p = proposal && typeof proposal === "object" ? proposal : {};
  const slug = String(p.slug ?? "").trim();
  if (blank(p.slug) || blank(p.name) || blank(p.charter) || blank(p.reason)) {
    refusals.push("proposal needs slug, name, charter and reason");
  } else if (!SLUG_RE.test(slug)) {
    refusals.push(`proposal slug ${slug} is not lowercase words joined by hyphens`);
  }
  const tickets = p.tickets;
  if (!Array.isArray(tickets) || tickets.length === 0) {
    refusals.push("proposal needs at least one ticket");
  } else {
    const waiting = Array.isArray(findings) ? new Set(findings.map(f => String(f.id))) : null;
    const seen = new Set();
    tickets.forEach((t, k) => {
      const i = k + 1;
      const ids = t && Array.isArray(t.finding_ids) ? t.finding_ids.map(String) : null;
      if (!t || typeof t !== "object" || Array.isArray(t) || blank(t.title) || blank(t.root_cause) || blank(t.fix) ||
          blank(t.priority_class) || typeof t.predicted_cycles !== "number" || ids === null || ids.length === 0) {
        refusals.push(`ticket ${i} needs title, root_cause, fix, priority_class, predicted_cycles and finding_ids`);
        return;
      }
      if (!CLASS_RE.test(String(t.priority_class))) {
        refusals.push(`ticket ${i} priority_class ${t.priority_class} is not a named class (P1 - ... to P10 - ...)`);
      }
      if (!Number.isInteger(t.predicted_cycles) || t.predicted_cycles < 1) {
        refusals.push(`ticket ${i} predicted_cycles must be a whole number of at least 1`);
      }
      for (const id of ids) {
        if (waiting !== null && !waiting.has(id)) { refusals.push(`finding ${id} is not open, carried or listed`); continue; }
        if (seen.has(id)) { refusals.push(`finding ${id} in two tickets`); continue; }
        seen.add(id);
      }
    });
  }
  if (slug !== "" && Array.isArray(projects)) {
    const target = projects.find(x => String(x.slug) === slug);
    if (target) {
      const own = finishing && String(finishing.slug) === slug;
      const eff = own ? (finishing.perpetual ? "paused" : "done") : String(target.status);
      if (!TARGET_STATUSES.includes(eff)) {
        refusals.push(`project ${slug} is ${eff}; a proposal names a new slug or a planned, paused or done project`);
      }
    }
  }
  return { ok: refusals.length === 0, refusals };
}

// The Auditor's turn grades; it proposes nothing. Its answer is checked for shape before it reaches
// the manager, so a malformed review stops here rather than steering the proposal.
export function validateReviewAnswer(answer) {
  const refusals = [];
  const areas = answer && answer.areas;
  if (!Array.isArray(areas)) {
    refusals.push("the Auditor's answer needs an areas array");
    return { ok: false, refusals };
  }
  areas.forEach((a, k) => {
    if (!a || blank(a.area) || blank(a.evidence) || !AREA_STATES.includes(a.state)) {
      refusals.push(`area ${k + 1} needs area, evidence and a state of working, broken or missing`);
    }
  });
  return { ok: refusals.length === 0, refusals };
}

// AGT-312: Victoria's answer, in finish_project_batch()'s own three texts (bare, without its
// "finish_project_batch: " prefix). Her verdict is the SECOND agreement John asked for: the
// manager's proposal is the first. A `disagree` is a refusal, not a status -- nothing is sent, the
// batch stays due, and the manager re-proposes ONCE with her reason.
export const AGREEMENT_VERDICTS = Object.freeze(["agree", "disagree"]);
export const NEEDS_REVIEW =
  "proposal needs a review with verdict, reason and account (John 2026-10-02, decision 6668e1ac)";
export const REVIEW_DISAGREED =
  "the review verdict is disagree -- a proposal reaches John only when both the manager and the review agree (John 2026-10-02, decision 6668e1ac)";

export function validateAgreement(review) {
  const refusals = [];
  const r = review && typeof review === "object" && !Array.isArray(review) ? review : null;
  if (r === null || blank(r.verdict) || blank(r.reason) || blank(r.account)) {
    refusals.push(NEEDS_REVIEW);
    return { ok: false, refusals };
  }
  const verdict = String(r.verdict).trim();
  if (!AGREEMENT_VERDICTS.includes(verdict)) {
    refusals.push(`review verdict ${verdict} is not agree or disagree`);
    return { ok: false, refusals };
  }
  if (verdict === "disagree") refusals.push(REVIEW_DISAGREED);
  return { ok: refusals.length === 0, refusals };
}

// The batches whose SENSOR is up, first by slug then epic name -- one proposal per run. AGT-291 D3:
// `review_due`, never `proposal_due`. The two differ by the claim alone: a batch claimed inside 24
// hours stays `proposal_due` (it IS finished, and every reader still sees that) and drops out of
// `review_due`, so a second pass this cycle does not re-prepare the batch the first one took.
export function pickDue(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(r => r && r.review_due === true)
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)) || String(a.epic_name).localeCompare(String(b.epic_name)));
}

export function buildContext({ due, project, members, findings, projects }) {
  return {
    epic_id: due.epic_id,
    project: {
      slug: project.slug, name: project.name, charter: project.charter ?? null,
      status: project.status, perpetual: project.perpetual === true,
    },
    epic: { id: due.epic_id, name: due.epic_name, locked_at: due.locked_at, members: due.members },
    members: (Array.isArray(members) ? members : []).map(m => ({
      backlog_id: m.backlog_id, title: m.title, status: m.status, priority_class: m.priority_class ?? null,
    })),
    findings: (Array.isArray(findings) ? findings : []).map(f => ({
      id: f.id, status: f.status, source: sourceOf(f.found_by), finding_type: f.finding_type ?? null,
      family: f.family ?? null, kind: f.kind ?? null, check_slug: f.check_slug ?? null,
      locations: f.locations ?? null, governing_fact: f.governing_fact ?? null,
      proposed_resolution: f.proposed_resolution ?? null,
    })),
    projects: (Array.isArray(projects) ? projects : []).map(x => ({ slug: x.slug, name: x.name, status: x.status, perpetual: x.perpetual === true })),
  };
}

// AGT-312: `review` is added ONLY when an agreement is handed in, so the body --for-review writes
// for Victoria is the proposal as it stands before her turn, with no review key to read her own
// verdict out of.
export function proposalBody(answer, review) {
  const body = {
    slug: answer.slug, name: answer.name, charter: answer.charter, reason: answer.reason,
    tickets: answer.tickets, patterns_applied: Array.isArray(answer.patterns_applied) ? answer.patterns_applied : [],
  };
  if (review && typeof review === "object" && !Array.isArray(review)) {
    body.review = { verdict: review.verdict, reason: review.reason, account: review.account };
  }
  return body;
}

// --- CLI -------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(s);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

// Windows / Node 24: process.exit() right after a fetch can abort in libuv (audit-review.js's note).
class Exit extends Error {}
let fetched = false;
function die(code, msg) {
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : msg + "\n");
  if (!fetched) process.exit(code);
  process.exitCode = code;
  throw new Exit(String(code));
}

function readJson(p, what) {
  if (typeof p !== "string" || !p) die(2, `propose-project: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `propose-project: cannot read ${what} ${p}: ${e.message}`); }
}

function writeJson(p, obj) {
  if (typeof p !== "string" || !p) die(2, "propose-project: --out=<path> required");
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
  fs.writeFileSync(path.resolve(p), JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) die(2, "propose-project: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  return { base, key };
}

async function rest(base, key, method, q, body, headers = {}) {
  fetched = true;
  const res = await fetch(`${base}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}

async function prepare(args) {
  const { base, key } = creds();
  const call = async (method, q, body) => {
    const r = await rest(base, key, method, q, body);
    if (!r.ok) die(1, `propose-project: ${method} ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const due = pickDue(await call("POST", "rpc/project_batch_state", {}));
  if (due.length === 0) die(3, NOTHING_DUE);
  // AGT-291 D4: CLAIM, in order, and take the first batch this pass actually got. The guard is in
  // the query, so the claim is atomic -- never read-then-write (CLAUDE.md: atomic counters).
  const stamp = new Date().toISOString();
  const held = [];
  let d = null;
  for (const row of due) {
    const r = await rest(base, key, "PATCH", claimQuery(row.epic_id), { proposal_attempted_at: stamp },
      { Prefer: "return=representation" });
    if (!r.ok) die(1, `propose-project: PATCH ${claimQuery(row.epic_id)} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    if (Array.isArray(r.json) && r.json.length > 0) { d = row; break; }
    held.push(`${row.slug}/${row.epic_name}`);
  }
  if (d === null) die(3, `${ALL_HELD} Held: ${held.join(", ")}.`);
  const [project] = await call("GET", `projects?slug=eq.${encodeURIComponent(d.slug)}&select=slug,name,charter,status,perpetual`);
  const members = await call("GET", `backlog_items?epic_id=eq.${d.epic_id}&select=backlog_id,title,status,priority_class&order=backlog_id`);
  const findings = await call("GET", `audit_findings?status=in.(${WAITING_STATUSES.join(",")})&select=id,status,kind,check_slug,locations,governing_fact,proposed_resolution,found_by,finding_type,family&order=created_at,id`);
  const projects = await call("GET", "projects?select=slug,name,status,perpetual&order=slug");
  const ctx = buildContext({ due: d, project, members, findings, projects });
  writeJson(args.out, ctx);
  console.log(`propose-project --prepare: ${d.slug} batch ${d.epic_name} is due and CLAIMED until `
    + `${new Date(Date.parse(stamp) + CLAIM_HOURS * 3600e3).toISOString()} (${d.members} members, 0 left); `
    + `${ctx.findings.length} waiting finding(s), ${due.length - 1} other due batch(es), `
    + `${held.length} already held -> ${args.out}`);
  process.exitCode = 0;
}

function review(args) {
  const answer = readJson(args.review, "Auditor answer");
  const ctx = readJson(args.context, "context");
  const v = validateReviewAnswer(answer);
  if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n"));
  writeJson(args.out, { ...ctx, functionality_review: { areas: answer.areas, account: answer.account ?? null } });
  const n = s => answer.areas.filter(a => a.state === s).length;
  die(0, `propose-project --review: ${answer.areas.length} area(s) (${n("working")} working, ${n("broken")} broken, ${n("missing")} missing) merged as functionality_review -> ${args.out}`);
}

// AGT-312: the manager's proposal becomes a row of Victoria's task file. Checked FIRST, so a
// malformed proposal stops here rather than costing her turn.
function forReview(args) {
  const answer = readJson(args["for-review"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateProposal(answer, ctx.findings, ctx.projects, ctx.project);
  if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n"));
  writeJson(args.out, { ...ctx, proposal: proposalBody(answer) });
  die(0, `propose-project --for-review: ${answer.slug} (${Array.isArray(answer.tickets) ? answer.tickets.length : 0} ticket(s)) `
    + `written as Victoria's task file -> ${args.out}`);
}

// AGT-312: optional on a dry-run (so the manager's half can be seen before her turn is spent),
// REQUIRED on --apply.
function agreementOf(args, required) {
  const given = typeof args.agreement === "string" && args.agreement !== "";
  if (!given) {
    if (required) die(2, "--agreement=<review answer.json> required (AGT-312)");
    return undefined;
  }
  return readJson(args.agreement, "review answer");
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const review = agreementOf(args, false);
  const v = validateProposal(answer, ctx.findings, ctx.projects, ctx.project);
  const refusals = [...v.refusals];
  if (review !== undefined) refusals.push(...validateAgreement(review).refusals);
  if (refusals.length) die(1, refusals.map(r => `refused: ${r}`).join("\n"));
  die(0, review === undefined ? "ok (proposal only -- no review handed in yet)" : "ok");
}

async function apply(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) die(2, "propose-project --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const review = agreementOf(args, true); // AGT-312: exit 2 before anything is read or sent
  const v = validateProposal(answer, ctx.findings, ctx.projects, ctx.project);
  const a = validateAgreement(review);
  const refusals = [...v.refusals, ...a.refusals];
  if (refusals.length) die(1, refusals.map(r => `refused: ${r}`).join("\n")); // nothing is sent
  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/finish_project_batch", {
    p_cycle_id: hasCycle ? args["cycle-id"] : null,
    p_session_name: hasSession ? args["session-name"] : null,
    p_epic: ctx.epic_id,
    p_proposal: proposalBody(answer, review),
  });
  if (!r.ok) die(1, `propose-project --apply: HTTP ${r.status} ${r.text}`);
  const out = r.json ?? {};
  console.log(`Review: agree -- ${review.reason}`);
  console.log(`Decision ${out.decision_id}: select public.reverse_decision('${out.decision_id}', 'John', '<why>');`);
  console.log(`Finished: ${out.finished?.slug} -> ${out.finished?.status}; proposed: ${out.proposed?.slug} (${Array.isArray(out.tickets) ? out.tickets.length : 0} ticket(s): ${(out.tickets ?? []).join(", ")})`);
  console.log(`John's yes, in a session only: select public.start_proposed_project('${out.proposed?.slug}', '<John's words, verbatim>', '<session name>');`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args.review) return review(args);
  if (args["for-review"]) return forReview(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: propose-project.js --prepare --out=<path> | --review=<auditor.json> --context=<prepare.json> --out=<path> | --for-review=<answer.json> --context=<ctx.json> --out=<path> | --dry-run=<answer.json> --context=<ctx.json> [--agreement=<review.json>] | --apply=<answer.json> --context=<ctx.json> --agreement=<review.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`propose-project: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
