#!/usr/bin/env node
// DeepBench v7.0.662 | scripts/propose-project.js | AGT-240 -- PROJECTS GET A FINISH LINE.
//
// John, verbatim 2026-09-27 (Q2): "a project list is locked, anything found goes into a list. Once a
// project is finished, the auditor and dev manager review the current functionality, review the
// auditor list, and propose a new project with ticket counts and why to me. then i decide if the
// routine is going to pick a new project."
//
// This file is the driver of that finish, as a client of public.finish_project_batch(). It decides
// nothing itself (pattern:9): WHETHER a batch is finished is public.project_batch_state()'s
// `proposal_due` (an executing project, a locked list, every member done or removed, not yet
// finished); WHAT to propose is two model turns, run by the caller on the models agent-prompt.js
// prints; the WRITE, its before-images and its one `proposal` decision are the function's (§19b, §19v).
// Rule #1 (§19d/§19e): the Auditor's review reaches the manager only as a row of the task file,
// `functionality_review`, never agent to agent.
//
// Five doors, one validator:
//   --prepare --out=<path>
//       asks rpc/project_batch_state for the batches due a proposal and writes the FIRST (by slug) as
//       the task context: epic_id, project, epic, members, findings (the findings list: open, carried
//       and listed), projects. Exit 3 when none is due -- no Auditor turn, no manager turn, no cost.
//   --review=<auditor answer.json> --context=<prepare.json> --out=<path>
//       checks the Auditor's {areas, account} (audit-finish-review / au-finish-intent) and merges it
//       into the context as `functionality_review` -- the manager's task file. No network.
//   --dry-run=<answer.json> --context=<manager context.json>
//       runs validateProposal() over the manager's answer (propose-project / dm-propose-intent).
//   --apply=<answer.json> --context=<manager context.json> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateProposal() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/finish_project_batch. Prints the reverse line and John's start line.
//
// validateProposal() mirrors the function's validation texts (without its "finish_project_batch: "
// prefix) and collects every refusal rather than stopping at the first, so a dry-run shows the whole
// list. The one rule it cannot see offline -- the batch is still due -- stays the function's.
//
// Exit codes: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 nothing due.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// --- pure half (imported by tests/regression/agt-240-project-finish-line.test.mjs; no network) ------

export const NOTHING_DUE = "no project batch is due a proposal — no Auditor or manager turn, no cost (AGT-240)";
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

// The due batches, first by slug then epic name -- one proposal per run.
export function pickDue(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(r => r && r.proposal_due === true)
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

export function proposalBody(answer) {
  return {
    slug: answer.slug, name: answer.name, charter: answer.charter, reason: answer.reason,
    tickets: answer.tickets, patterns_applied: Array.isArray(answer.patterns_applied) ? answer.patterns_applied : [],
  };
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

async function rest(base, key, method, q, body) {
  fetched = true;
  const res = await fetch(`${base}/rest/v1/${q}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
  const d = due[0];
  const [project] = await call("GET", `projects?slug=eq.${encodeURIComponent(d.slug)}&select=slug,name,charter,status,perpetual`);
  const members = await call("GET", `backlog_items?epic_id=eq.${d.epic_id}&select=backlog_id,title,status,priority_class&order=backlog_id`);
  const findings = await call("GET", `audit_findings?status=in.(${WAITING_STATUSES.join(",")})&select=id,status,kind,check_slug,locations,governing_fact,proposed_resolution,found_by,finding_type,family&order=created_at,id`);
  const projects = await call("GET", "projects?select=slug,name,status,perpetual&order=slug");
  const ctx = buildContext({ due: d, project, members, findings, projects });
  writeJson(args.out, ctx);
  console.log(`propose-project --prepare: ${d.slug} batch ${d.epic_name} is due (${d.members} members, 0 left); `
    + `${ctx.findings.length} waiting finding(s), ${due.length - 1} other due batch(es) -> ${args.out}`);
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

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateProposal(answer, ctx.findings, ctx.projects, ctx.project);
  if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n"));
  die(0, "ok");
}

async function apply(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) die(2, "propose-project --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const v = validateProposal(answer, ctx.findings, ctx.projects, ctx.project);
  if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n")); // nothing is sent
  const { base, key } = creds();
  const r = await rest(base, key, "POST", "rpc/finish_project_batch", {
    p_cycle_id: hasCycle ? args["cycle-id"] : null,
    p_session_name: hasSession ? args["session-name"] : null,
    p_epic: ctx.epic_id,
    p_proposal: proposalBody(answer),
  });
  if (!r.ok) die(1, `propose-project --apply: HTTP ${r.status} ${r.text}`);
  const out = r.json ?? {};
  console.log(`Decision ${out.decision_id}: select public.reverse_decision('${out.decision_id}', 'John', '<why>');`);
  console.log(`Finished: ${out.finished?.slug} -> ${out.finished?.status}; proposed: ${out.proposed?.slug} (${Array.isArray(out.tickets) ? out.tickets.length : 0} ticket(s): ${(out.tickets ?? []).join(", ")})`);
  console.log(`John's yes, in a session only: select public.start_proposed_project('${out.proposed?.slug}', '<John's words, verbatim>', '<session name>');`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args.review) return review(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: propose-project.js --prepare --out=<path> | --review=<auditor.json> --context=<prepare.json> --out=<path> | --dry-run=<answer.json> --context=<ctx.json> | --apply=<answer.json> --context=<ctx.json> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`propose-project: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
