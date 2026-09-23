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

const blank = v => String(v ?? "").trim() === "";

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

export function buildTaskContext({ week, findings, allRows, tickets, scorecardRows }) {
  if (!Array.isArray(findings) || findings.length === 0) return null;
  const rows = Array.isArray(allRows) ? allRows : [];
  const worklist = findings.map(f => {
    const same = rows.filter(r => r.fingerprint === f.fingerprint);
    return {
      id: f.id,
      fingerprint: f.fingerprint,
      iso_week: f.iso_week,
      kind: f.kind,
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
    open_audit_tickets: (Array.isArray(tickets) ? tickets : []).map(t => ({
      backlog_id: t.backlog_id, title: t.title, status: t.status, description: t.description,
    })),
    john_calls: { ...JOHN_CALLS },
    scorecard: (() => {
      const checks = flagChecks(scorecardRows ?? []);
      return { checks, tighten: checks.filter(c => c.flag === "tighten").map(c => c.check_slug) };
    })(),
    promotions: promotableOthers(rows),
  };
}

// review = the manager's { groups, summary_for_john, patterns_applied }; worklist = the context's worklist.
// week is optional: when given it is checked first, as the function checks p_week first.
export function validateReview(review, worklist, week) {
  const refusals = [];
  if (week !== undefined && (week === null || !WEEK_RE.test(String(week)))) {
    refusals.push(`p_week ${week} is not an ISO week (YYYY-Www)`);
  }
  const groups = review && review.groups;
  if (!Array.isArray(groups) || groups.length === 0) {
    refusals.push("p_review.groups must be a non-empty array");
    return { ok: false, refusals };
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

function die(code, msg) {
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : msg + "\n");
  process.exit(code);
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
  const findings = await get("audit_findings?status=in.(open,carried)&select=id,fingerprint,iso_week,kind,check_slug,locations,governing_fact,confidence,proposed_resolution&order=created_at,id");
  const allRows = await get("audit_findings?select=id,fingerprint,iso_week,status,ruling,ruled_by,check_slug");
  const tickets = await get("backlog_items?source_file=eq.audit-review&status=not.in.(done,removed)&select=backlog_id,title,status,description&order=backlog_id");
  const scorecardRows = await get("audit_check_scorecard?select=*&order=check_slug,iso_week");
  const ctx = buildTaskContext({ week, findings, allRows, tickets, scorecardRows });
  if (ctx === null) die(3, NOTHING_TO_REVIEW);
  const out = JSON.stringify(ctx, null, 2) + "\n";
  if (typeof args.out === "string" && args.out) {
    fs.writeFileSync(path.resolve(args.out), out, "utf8");
    console.log(`audit-review --prepare: ${ctx.worklist.length} finding(s), ${ctx.open_audit_tickets.length} open audit ticket(s) -> ${args.out}`);
  } else {
    process.stdout.write(out);
  }
  process.exit(0);
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateReview(answer, ctx.worklist, ctx.week);
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
  const v = validateReview(answer, ctx.worklist, week);
  if (!v.ok) refuse(v.refusals); // nothing is sent

  const { base, key } = creds();
  const review = { groups: answer.groups, summary_for_john: answer.summary_for_john, patterns_applied: answer.patterns_applied };
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
  process.exit(0);
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
  main().catch(e => die(1, `audit-review: ${e.stack || e.message}`));
}
