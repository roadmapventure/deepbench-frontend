// DeepBench v7.0.605 | scripts/audit-review.js | AGT-132 slice 1 -- the worklist gains a SOURCE and a
// TYPE, and the manager is told where each ticket goes: --prepare selects found_by and finding_type,
// every worklist row carries `source` (found_by's first segment) and `finding_type`, and the context
// carries `routes` (public.finding_routes, precedence order) and `projects` (the slugs he may pick
// from). routeGroup() mirrors public.finding_group_epic() exactly -- lowest precedence over the
// group's findings, security before auditor before "you pick" -- and validateReview() refuses the
// three routing refusals offline, in the function's words minus its "apply_audit_review: " prefix.
// The epic-count refusal stays the function's, like the reuse_backlog_id rule: it needs the epics
// table. Skipped entirely when a caller passes no routes, so a pre-AGT-132 context still validates.
// Spec: docs/kickoffs/v7.0.605-AGT-132-finding-routes.md sections 4 and 5 task 3.
//
// DeepBench v7.0.554 | scripts/audit-review.js | AGT-86 slice 9b -- the manager ACTS on 9a's flags:
// --prepare adds `checklist` (the au-* rows the manager may edit: EDITABLE_SLUG, each with objective and
// method as they read today); validateReview() gains the four checklist-edit refusals of
// apply_audit_review() in the function's place -- after the groups-non-empty check, before the per-group
// loop -- with the same texts; --apply sends checklist_edits in p_review. The function owns the edit's
// write and before-image under the review's one reversible decision; this file still writes no table.
// Spec: docs/harvests/AGT-86.md sections 16.5 and 16.10; kickoff docs/kickoffs/v7.0.554-AGT-86-s9b-checklist-edits.md.
//
// DeepBench v7.0.553 | scripts/audit-review.js | AGT-86 slice 9a -- --prepare adds the per-check scorecard
// (public.audit_check_scorecard) and two deterministic flags: flagChecks() marks a check 'tighten' when its
// last three weeks hold >= 3 rulings at a false-alarm rate >= 0.5; promotableOthers() names an `other`
// fingerprint ruled real (ticketed/escalated) in >= 3 distinct weeks. Flags only -- the manager acts in 9b.
// Spec: docs/harvests/AGT-86.md section 16; kickoff docs/kickoffs/v7.0.553-AGT-86-s9a-check-scorecard.md.
//
// DeepBench v7.0.548 | scripts/audit-review.js | AGT-86 slice 2 (2b) -- the Development Manager's weekly
// audit review, as a client of public.apply_audit_review(). Spec: docs/harvests/AGT-86.md section 9.4;
// kickoff docs/kickoffs/v7.0.548-AGT-86-s2b-audit-review-script.md.
//
// Three doors, one validator:
//   --prepare --week=<YYYY-Www> [--out=<path>]
//       reads the open/carried audit_findings, every row's fingerprint history and the open audit-review
//       tickets, and writes the manager's task context. Exit 3 when there is nothing to review (AGT-86 §6:
//       no findings, no Dev Manager run, no cost).
//   --dry-run=<answer.json> --context=<prepare.json>
//       runs validateReview() over the manager's answer; prints ok or each refusal. Exit 0 / 1. No network.
//   --apply=<answer.json> --context=<prepare.json> --week=<w> (--cycle-id=<uuid> | --session-name=<name>)
//       runs the SAME validateReview() first (a refusal exits 1 and sends nothing), then POSTs
//       rpc/apply_audit_review. The function owns the write, its before-images and its decision (§19b,
//       §19v); this file never writes a table. It prints the reverse_decision() line for John.
//
// validateReview() mirrors the function's validation: the per-group rules first, coverage LAST, and the
// same message texts (without the function's "apply_audit_review: " prefix). It collects every refusal
// rather than stopping at the first, so a dry-run shows the manager the whole list. The one rule it cannot
// see offline -- a reuse_backlog_id must be an open backlog row -- stays the function's.
//
// Exit codes: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments -- never a
// pass); 3 nothing to review.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// --- pure half (imported by tests/regression/agt-86b-audit-review.test.mjs; no network) --------------

// The five calls that come to John -- AGT-86 section 5, verbatim.
export const JOHN_CALLS = Object.freeze({
  rules: "his own rules or past decisions -- the Dev Manager works inside his rules and never overrules them (docs/governance/ASKS-TO-JOHN.md A-03, A-07)",
  money: "money -- nothing spends beyond what he approved, e.g. a paid plan upgrade or raising the daily token cap (A-25)",
  production: "production releases -- dev to main (A-11, HR-MERGE); pattern tickets build to dev and wait for his release",
  hiring: "hiring agents -- creating an agent or flipping agents.is_active on (A-09)",
  switch: "switching agents or routines on and off (A-21), including this routine's own switch",
});

export const KINDS = Object.freeze(["root-cause", "cleanup", "not-a-defect", "carry", "escalate"]);
export const WEEK_RE = /^\d{4}-W\d{2}$/;
export const NOTHING_TO_REVIEW = "no open or carried findings — no Dev Manager run, no cost (AGT-86 §6)";
// AGT-86 §11(5): the checklist rows the manager may edit. au-identity and au-guardrails are John's.
export const EDITABLE_SLUG = /^au-(behavior|knowledge-homes|[a-z-]+-intent)$/;

const blank = v => String(v ?? "").trim() === "";

// AGT-131 made found_by a single writer id; AGT-132 reads its first segment as the SOURCE, exactly as
// public.finding_group_epic() does with split_part(found_by, ':', 1).
export function sourceOf(foundBy) {
  const s = String(foundBy ?? "");
  return s === "" ? null : s.split(":")[0];
}

// AGT-132: the mirror of public.finding_group_epic()'s route pick, and nothing more -- it answers WHICH
// ROUTE a group takes, never which epic (that needs the epics table and stays the function's). The
// group's route is the LOWEST precedence over its findings, tie-broken by source, so a group holding
// one security finding is a Security ticket however it was grouped. A finding whose source no row maps
// THROWS in the function's words: an unmapped source stops the review instead of falling through.
// A finding the worklist does not carry is skipped here, as the SQL's join skips it -- the coverage
// rule below is what refuses an unknown id, in both places.
export function routeGroup(group, worklist, routes) {
  const list = Array.isArray(worklist) ? worklist : [];
  const rows = Array.isArray(routes) ? routes : [];
  const ids = Array.isArray(group && group.finding_ids) ? group.finding_ids.map(String) : [];
  const kind = (group && group.kind) ?? "(no kind)";
  const candidates = [];
  for (const id of ids) {
    const w = list.find(x => String(x.id) === id);
    if (w === undefined) continue;
    const src = w.source ?? sourceOf(w.found_by);
    const type = w.finding_type ?? null;
    const matches = rows.filter(r => (r.source === src || r.source === "*") &&
                                     (r.finding_type === type || r.finding_type === "*"));
    if (matches.length === 0) {
      throw new Error(`finding ${id} has unmapped source ${src} — add a finding_routes row; project creation is John's`);
    }
    candidates.push(...matches);
  }
  if (candidates.length === 0) throw new Error(`a ${kind} group has no known findings to route`);
  candidates.sort((a, b) => (Number(a.precedence) - Number(b.precedence)) ||
                            String(a.source).localeCompare(String(b.source)));
  return candidates[0];
}

// The distinct sources of a group's findings, in the order the function's string_agg reports them.
function sourcesOf(group, worklist) {
  const list = Array.isArray(worklist) ? worklist : [];
  const ids = Array.isArray(group && group.finding_ids) ? group.finding_ids.map(String) : [];
  const srcs = new Set();
  for (const id of ids) {
    const w = list.find(x => String(x.id) === id);
    if (w === undefined) continue;
    const src = w.source ?? sourceOf(w.found_by);
    if (src !== null && src !== undefined) srcs.add(String(src));
  }
  return [...srcs].sort();
}

// AGT-86 §11: view rows (one per check_slug and iso_week) -> one entry per check with >= 3 summed rulings.
export function flagChecks(viewRows) {
  const groups = new Map();
  for (const r of Array.isArray(viewRows) ? viewRows : []) {
    if (!groups.has(r.check_slug)) groups.set(r.check_slug, []);
    groups.get(r.check_slug).push(r);
  }
  const out = [];
  for (const [check_slug, rows] of groups) {
    const total = rows.reduce((n, r) => n + (Number(r.rulings) || 0), 0);
    if (total < 3) continue;
    const weeks = [...rows].sort((x, y) => String(x.iso_week).localeCompare(String(y.iso_week)));
    const latest = weeks[weeks.length - 1];
    const flag = Number(latest.rulings_3w) >= 3 && Number(latest.false_alarm_rate_3w) >= 0.5 ? "tighten" : null;
    out.push({ check_slug, weeks, flag });
  }
  return out.sort((x, y) => String(x.check_slug).localeCompare(String(y.check_slug)));
}

// AGT-86 §11: an `other` fingerprint ruled real in three distinct weeks is a candidate for a new check.
export function promotableOthers(allRows) {
  const byFp = new Map();
  for (const r of Array.isArray(allRows) ? allRows : []) {
    if (r.check_slug !== "other" || (r.status !== "ticketed" && r.status !== "escalated")) continue;
    if (!byFp.has(r.fingerprint)) byFp.set(r.fingerprint, { weeks: new Set(), finding_ids: [] });
    const e = byFp.get(r.fingerprint);
    e.weeks.add(r.iso_week);
    e.finding_ids.push(r.id);
  }
  const out = [];
  for (const [fingerprint, e] of byFp) {
    const weeks = [...e.weeks].sort();
    if (weeks.length >= 3) out.push({ fingerprint, weeks, finding_ids: e.finding_ids, note: "promote to a new check" });
  }
  return out.sort((x, y) => String(x.fingerprint).localeCompare(String(y.fingerprint)));
}

export function buildTaskContext({ week, findings, allRows, tickets, scorecardRows, profiles, routes, projects }) {
  if (!Array.isArray(findings) || findings.length === 0) return null;
  const rows = Array.isArray(allRows) ? allRows : [];
  const worklist = findings.map(f => {
    const same = rows.filter(r => r.fingerprint === f.fingerprint);
    return {
      id: f.id,
      fingerprint: f.fingerprint,
      iso_week: f.iso_week,
      kind: f.kind,
      // AGT-132: WHO reported it and WHAT it is -- the two facts the routing reads.
      source: sourceOf(f.found_by),
      finding_type: f.finding_type ?? null,
      check_slug: f.check_slug ?? null,
      locations: f.locations ?? null,
      governing_fact: f.governing_fact ?? null,
      confidence: f.confidence ?? null,
      proposed_resolution: f.proposed_resolution ?? null,
      weeks_seen: new Set(same.map(r => r.iso_week)).size,
      prior_rulings: same
        .filter(r => r.ruled_by !== null && r.ruled_by !== undefined)
        .map(r => ({ iso_week: r.iso_week, status: r.status, ruling: r.ruling, ruled_by: r.ruled_by })),
    };
  });
  return {
    week,
    worklist,
    // AGT-132: the routing table as data and the projects he may pick from -- the manager is never
    // asked to remember either, and never invents a project (creating one is John's).
    routes: Array.isArray(routes) ? routes : [],
    projects: Array.isArray(projects) ? projects : [],
    open_audit_tickets: (Array.isArray(tickets) ? tickets : []).map(t => ({
      backlog_id: t.backlog_id, title: t.title, status: t.status, description: t.description,
    })),
    john_calls: { ...JOHN_CALLS },
    scorecard: (() => {
      const checks = flagChecks(scorecardRows ?? []);
      return { checks, tighten: checks.filter(c => c.flag === "tighten").map(c => c.check_slug) };
    })(),
    promotions: promotableOthers(rows),
    checklist: (Array.isArray(profiles) ? profiles : [])
      .filter(p => EDITABLE_SLUG.test(String(p.slug ?? "")))
      .map(p => ({ skill_slug: p.slug, objective: p.objective, method: p.method })),
  };
}

// review = the manager's { groups, summary_for_john, patterns_applied, checklist_edits? }; worklist = the
// context's worklist. week is optional: when given it is checked first, as the function checks p_week first.
// checklist is optional (the context's checklist): when given, an edit naming no row in it is refused, as
// the function refuses an edit naming no skill_profiles row; offline without it that rule stays the function's.
// routes / projects are optional (the context's): with them, the three AGT-132 routing refusals a
// client CAN see offline are checked in the function's place -- inside the per-group loop, after that
// kind's field checks, for exactly the two kinds that file a ticket. Without routes the whole block is
// skipped, so a context written before AGT-132 validates as it always did.
export function validateReview(review, worklist, week, checklist, routes, projects) {
  const refusals = [];
  if (week !== undefined && (week === null || !WEEK_RE.test(String(week)))) {
    refusals.push(`p_week ${week} is not an ISO week (YYYY-Www)`);
  }
  const groups = review && review.groups;
  if (!Array.isArray(groups) || groups.length === 0) {
    refusals.push("p_review.groups must be a non-empty array");
    return { ok: false, refusals };
  }
  // 1e. checklist edits (slice 9b), in the function's place: after the groups check, before the group loop.
  const edits = review.checklist_edits;
  if (edits !== undefined && edits !== null) {
    if (!Array.isArray(edits)) {
      refusals.push("checklist_edits must be an array");
    } else {
      const known = Array.isArray(checklist) ? new Set(checklist.map(c => String(c.skill_slug))) : null;
      for (const e of edits) {
        const slug = e && typeof e === "object" ? e.skill_slug : undefined;
        const field = e && typeof e === "object" ? e.field : undefined;
        const shown = slug === undefined || slug === null ? "<NULL>" : String(slug);
        if (!EDITABLE_SLUG.test(String(slug ?? ""))) {
          refusals.push(`checklist edit to ${shown} refused: only au-behavior, au-knowledge-homes and au-*-intent rows are the manager's; au-identity and au-guardrails are John's (AGT-86 section 11(5))`);
        } else if (known && !known.has(String(slug))) {
          refusals.push(`checklist edit names no skill_profiles row ${shown}`);
        } else if (field !== "method" && field !== "objective") {
          refusals.push(`checklist edit field ${field === undefined || field === null ? "<NULL>" : field} must be method or objective`);
        } else if (blank(e.new_text) || blank(e.reason)) {
          refusals.push(`checklist edit to ${shown} needs new_text and reason`);
        }
      }
    }
  }

  const list = Array.isArray(worklist) ? worklist : [];
  const seenWeeks = new Map(list.map(w => [String(w.id), Number(w.weeks_seen) || 0]));
  const idsOf = g => (Array.isArray(g && g.finding_ids) ? g.finding_ids.map(String) : []);

  // 1a. per-group content rules, in the function's order.
  let cleanups = 0;
  for (const g of groups) {
    const kind = g && g.kind;
    if (!KINDS.includes(kind)) {
      refusals.push(`group kind ${kind ?? "<NULL>"} is not one of root-cause, cleanup, not-a-defect, carry, escalate`);
      continue;
    }
    if (idsOf(g).length === 0) refusals.push(`a ${kind} group has no finding_ids`);
    if (kind === "carry") {
      if (blank(g.reason)) refusals.push("carry needs a reason");
      for (const id of idsOf(g)) {
        const n = seenWeeks.get(id);
        if (n !== undefined && n >= 3) refusals.push(`finding ${id} has weeks_seen = ${n} and may not be carried again`);
      }
    } else if (kind === "not-a-defect") {
      if (blank(g.reason)) refusals.push("not-a-defect needs a reason");
    } else if (kind === "escalate") {
      if (!Object.keys(JOHN_CALLS).includes(g.john_call ?? "") || blank(g.summary)) {
        refusals.push("escalate needs john_call (rules, money, production, hiring, switch) and summary");
      }
    } else if (kind === "root-cause") {
      if ((g.reuse_backlog_id === undefined || g.reuse_backlog_id === null) &&
          (blank(g.title) || blank(g.root_cause) || blank(g.fix))) {
        refusals.push("root-cause needs title, root_cause and fix, or reuse_backlog_id");
      }
    } else if (kind === "cleanup") {
      cleanups += 1;
      if (cleanups > 1) refusals.push("at most one cleanup group");
      if (blank(g.fix)) refusals.push("cleanup needs fix (the bundled list)");
    }

    // 1a (AGT-132), the function's own condition: the two kinds that file a ticket need a route.
    const files = (kind === "root-cause" && (g.reuse_backlog_id === undefined || g.reuse_backlog_id === null)) ||
                  kind === "cleanup";
    if (Array.isArray(routes) && files) {
      let route = null;
      try {
        route = routeGroup(g, list, routes);
      } catch (e) {
        refusals.push(e.message);
      }
      if (route !== null && (route.project_slug === null || route.project_slug === undefined)) {
        // The route says the manager picks, so his pick must be explicit and must be a project that
        // exists. An omission is never read as "the general backlog".
        const pick = String(g.project ?? "").trim();
        if (pick === "") {
          const srcs = sourcesOf(g, list);
          refusals.push(`a ${kind} group from source(s) ${srcs.length ? srcs.join(", ") : "(none)"} needs project (a projects.slug or general)`);
        } else if (pick !== "general" && Array.isArray(projects) &&
                   !projects.some(p => String(p.slug) === pick)) {
          refusals.push(`project ${pick} is not a projects row; project creation is John's`);
        }
      }
    }
  }

  // 1b. coverage LAST: every worklist finding exactly once, no unknown or duplicate id.
  const open = list.map(w => String(w.id));
  const seen = [];
  for (const g of groups) {
    for (const id of idsOf(g)) {
      if (!open.includes(id)) { refusals.push(`unknown or not open/carried finding ${id}`); continue; }
      if (seen.includes(id)) { refusals.push(`finding ${id} in two groups`); continue; }
      seen.push(id);
    }
  }
  for (const id of open) if (!seen.includes(id)) refusals.push(`finding ${id} not covered`);

  return { ok: refusals.length === 0, refusals };
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

// Windows / Node 24: process.exit() right after a fetch can abort in libuv. Before any fetch die() exits
// at once; after one it sets process.exitCode and unwinds with a sentinel main()'s catch swallows, so the
// process ends on its own with the same code.
class Exit extends Error {}
let fetched = false;
function die(code, msg) {
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : msg + "\n");
  if (!fetched) process.exit(code);
  process.exitCode = code;
  throw new Exit(String(code));
}

function readJson(p, what) {
  if (typeof p !== "string" || !p) die(2, `audit-review: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `audit-review: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) die(2, "audit-review: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
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
  const week = args.week;
  if (typeof week !== "string" || !WEEK_RE.test(week)) die(2, "audit-review --prepare: --week=<YYYY-Www> required");
  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `audit-review: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };
  const findings = await get("audit_findings?status=in.(open,carried)&select=id,fingerprint,iso_week,kind,check_slug,locations,governing_fact,confidence,proposed_resolution,found_by,finding_type&order=created_at,id");
  const allRows = await get("audit_findings?select=id,fingerprint,iso_week,status,ruling,ruled_by,check_slug");
  const tickets = await get("backlog_items?source_file=eq.audit-review&status=not.in.(done,removed)&select=backlog_id,title,status,description&order=backlog_id");
  const scorecardRows = await get("audit_check_scorecard?select=*&order=check_slug,iso_week");
  const profiles = await get("skill_profiles?slug=like.au-*&select=slug,objective,method&order=slug");
  const routes = await get("finding_routes?select=precedence,source,finding_type,project_slug&order=precedence,source");
  const projects = await get("projects?select=slug,name,status&order=slug");
  const ctx = buildTaskContext({ week, findings, allRows, tickets, scorecardRows, profiles, routes, projects });
  if (ctx === null) die(3, NOTHING_TO_REVIEW);
  const out = JSON.stringify(ctx, null, 2) + "\n";
  if (typeof args.out === "string" && args.out) {
    fs.writeFileSync(path.resolve(args.out), out, "utf8");
    console.log(`audit-review --prepare: ${ctx.worklist.length} finding(s), ${ctx.open_audit_tickets.length} open audit ticket(s) -> ${args.out}`);
  } else {
    process.stdout.write(out);
  }
  process.exitCode = 0;
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateReview(answer, ctx.worklist, ctx.week, ctx.checklist, ctx.routes, ctx.projects);
  if (!v.ok) refuse(v.refusals);
  die(0, "ok");
}

function chicago(ts) {
  if (!ts) return "(no expiry recorded)";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(ts));
}

async function apply(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) die(2, "audit-review --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  const week = args.week;
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const v = validateReview(answer, ctx.worklist, week, ctx.checklist, ctx.routes, ctx.projects);
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const review = {
    groups: answer.groups, summary_for_john: answer.summary_for_john, patterns_applied: answer.patterns_applied,
    checklist_edits: answer.checklist_edits ?? [],
  };
  const r = await rest(base, key, "POST", "rpc/apply_audit_review", {
    p_cycle_id: hasCycle ? args["cycle-id"] : null,
    p_session_name: hasSession ? args["session-name"] : null,
    p_week: week,
    p_review: review,
  });
  if (!r.ok) die(1, `audit-review --apply: HTTP ${r.status} ${r.text}`);
  const { decision_id: id, tickets, counts } = r.json ?? {};
  const d = await rest(base, key, "GET", `runner_decisions?id=eq.${id}&select=expires_at`);
  const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;
  console.log(`Decision ${id} — reversible until ${chicago(expires)}: select public.reverse_decision('${id}', 'John', '<why>');`);
  console.log(`Tickets: ${Array.isArray(tickets) && tickets.length ? tickets.join(", ") : "(none)"}`);
  console.log(`Counts: ${JSON.stringify(counts ?? {})}`);
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (args["dry-run"]) return dryRun(args);
  if (args.apply) return apply(args);
  die(2, "usage: audit-review.js --prepare --week=<YYYY-Www> [--out=<path>] | --dry-run=<answer.json> --context=<prepare.json> | --apply=<answer.json> --context=<prepare.json> --week=<w> (--cycle-id=<uuid> | --session-name=<name>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`audit-review: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
