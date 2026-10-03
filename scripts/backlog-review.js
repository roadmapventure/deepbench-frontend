#!/usr/bin/env node
// DeepBench v7.0.699 | scripts/backlog-review.js | AGT-159
// FEATURE: AGT-159 -- THE BOARD IS REVIEWED BY THE PROCESS THAT ALREADY REVIEWS EVERYTHING ELSE.
// Measured 2026-09-28: 599 tickets `open`, 578 of them no finding's `filed_backlog_id`, and exactly
// ONE of those (`AGT-158`) sat in the shape the ticket-step-1 census looks at. Nothing read the
// other 577. Meanwhile the platform already owns a review path that homes, supersedes, closes, parks
// and escalates -- `audit_findings` -> the Development Manager's `review-audit-worklist` turn ->
// `apply_audit_review()`. This script is the only new part: it RAISES AN OPEN TICKET AS A FINDING so
// that path can reach it. No second reviewer, no second ruling vocabulary, no second table
// (pattern:17, pattern:8).
//
// THE FINDING *IS* THE TICKET, and that is the whole design. `locations[0].location` reads
// `backlog_items:<ID>`, so `apply_audit_review()`'s AGT-159 limb can read the ticket straight off the
// finding and write the manager's ruling onto THAT row -- never onto a new one. The limb refuses
// `root-cause` without `reuse_backlog_id` and refuses `cleanup` for exactly that reason: a ticket
// that already exists must not acquire a second id (pattern:95).
//
// THE INGEST IS audit-ledger.js's, NOT A SECOND COPY OF IT (pattern:14, pattern:15). One
// `ingestFindings()` call per run does the read, the four-way classification, the before-image and
// the append, with this script's transports injected -- the same function scripts/audit-run-review.js,
// scripts/staff-watch.js, scripts/ticket-owner.js and api/_lib/handlers/auditor-write.js reach the
// ledger through. Nothing about fingerprints, weeks or `not-a-defect` re-filing is re-decided here.
//
// FIFTEEN PER RUN, AND THE RUN IS SELF-MAINTAINING (pattern:16). A ticket is skipped once it already
// carries a `backlog-review` finding, or once it is any finding's `filed_backlog_id` -- so a second
// run never re-raises what the manager has already ruled, the batch walks the board down, and the
// progress line says how far it has left to go. `--limit` is the batch; exit 3 means the board is
// reviewed and `(7f)` has nothing to do.
//
// TYPE IS A STRUCTURAL RULE OVER PROVABLE FACTS, NEVER A MODEL'S OPINION (pattern:99, pattern:9). A
// ticket homed under the Security project is `security`; a `P9 - Bug Fixes` ticket, a Bug/Defect
// type or a `discovered` scope_origin is `defect`; everything else is a `proposal`. `gap` is NEVER
// raised here: a gap is something the platform is missing, and a ticket on the board is the opposite
// of missing -- it is a thing already written down and waiting to be ruled.
//
// Usage:
//   node scripts/backlog-review.js --raise --limit=<n> --cycle-id=<uuid> [--dry-run]
//
//   --raise           The only mode. Reads the board, selects the batch, files it as findings.
//   --limit=<n>       How many tickets this run raises. `(7f)` passes 15.
//   --cycle-id=<uuid> The open runner_cycles row every before-image binds to (§19v). Required.
//   --dry-run         Select and classify, write NOTHING. The progress line still prints, and
//                     `raised` reads 0 because nothing was raised.
//
// Exit codes:
//   0  ran -- the batch was filed (or, under --dry-run, selected)
//   2  could not run -- missing credentials, bad arguments, or a REST failure. NEVER a pass.
//   3  nothing left to raise: every open ticket already carries a backlog-review finding or is some
//      finding's filed_backlog_id. `(7f)` writes the line and goes on; this never gates the chain.

import path from "path";
import { fileURLToPath } from "url";
import { ingestFindings, isoWeek } from "./audit-ledger.js";

// --- pure half (imported by tests/regression/agt-159-backlog-review.test.mjs; no network, no disk) --

// What the manager may do with a ticket, in the vocabulary apply_audit_review() already enforces.
// It travels on the finding itself (`proposed_resolution`) rather than only in the Skill row, because
// audit_findings.proposed_resolution is NOT NULL and because the worklist is what he actually reads.
export const RULING_MENU =
  "Rule this ticket, and the ruling lands on the ticket: root-cause with reuse_backlog_id = this " +
  "ticket's own id plus a project HOMES it (general leaves it where it is and is itself the ruling); " +
  "root-cause with reuse_backlog_id naming another open ticket SUPERSEDES it; not-a-defect CLOSES it " +
  "with your reason; list parks it when the fitting project's list is locked; escalate with " +
  "john_call rules when only John can decide. Never root-cause without reuse_backlog_id and never " +
  "cleanup -- the ticket exists, so a second one is refused.";

export const CHECK_SLUG = "backlog-review";
// AGT-159: the two ticket facts that make a defect on their own, kept as data rather than inline
// literals so the rule reads as the rule.
export const DEFECT_PRIORITY_CLASS = "P9 - Bug Fixes";
export const DEFECT_TYPES = Object.freeze(["Bug", "Defect"]);
export const SECURITY_PROJECT_SLUG = "security";

// pattern:99 -- a structural rule over provable facts. `gap` is deliberately unreachable: see the
// header. The order matters and is the kickoff's: Security wins over everything, then the three
// defect facts, then proposal.
export function findingTypeFor(item) {
  if (String(item?.project_slug ?? "") === SECURITY_PROJECT_SLUG) return "security";
  if (String(item?.priority_class ?? "") === DEFECT_PRIORITY_CLASS) return "defect";
  if (DEFECT_TYPES.includes(String(item?.type ?? ""))) return "defect";
  if (String(item?.scope_origin ?? "") === "discovered") return "defect";
  return "proposal";
}

// The finding a ticket becomes. `governing_fact` is the ticket's own description, cut to 400 chars:
// the manager rules from the ticket's text, not from a summary this script wrote about it
// (pattern:11 -- no content judgment is hardcoded here). The location TEXT carries the two facts he
// needs before ruling and cannot read off the ticket id alone -- its scope_origin (john-named is
// John's, never the manager's to close) and the epic it sits in today.
export function toFinding(item) {
  const id = String(item?.backlog_id ?? "");
  return {
    kind: "other",
    check_slug: CHECK_SLUG,
    locations: [{
      location: `backlog_items:${id}`,
      text: `${String(item?.title ?? "")} [${item?.scope_origin ?? "none"}; epic ${item?.epic_name ?? "none"}]`,
    }],
    governing_fact: String(item?.description ?? "").slice(0, 400),
    confidence: "medium",
    proposed_resolution: RULING_MENU,
    finding_type: findingTypeFor(item),
  };
}

// The ticket ids a run must NOT raise again: one already carrying a backlog-review finding (its
// ruling is the manager's business, not this script's, however he ruled it) and one that is any
// finding's filed_backlog_id (some finding already put it on the board). Both are read off
// audit_findings, so the skip list is derived, never stored -- nothing to keep in sync.
export function excludedTickets(findingRows) {
  const out = new Set();
  for (const r of Array.isArray(findingRows) ? findingRows : []) {
    const filed = r?.filed_backlog_id ?? null;
    if (filed) out.add(String(filed));
    if (String(r?.check_slug ?? "") === CHECK_SLUG) {
      const loc = String(r?.locations?.[0]?.location ?? "");
      const id = loc.split(":")[1] ?? "";
      if (id) out.add(id);
    }
  }
  return out;
}

// STEP 1 FIRST, then the board's own order. `open` + `discovered` + no epic is the ticket-step-1
// census shape -- a ticket nothing has homed and nobody named, which is the most likely to be stale
// and the cheapest to rule -- so those go at the head of the queue. Everything else follows in
// (row_ordinal, backlog_id), which is the board's order and is total, so two runs over an unchanged
// board select the same batch (pattern:3, pattern:127).
export function selectBatch(items, excluded, limit) {
  const skip = excluded instanceof Set
    ? excluded
    : new Set((Array.isArray(excluded) ? excluded : []).map(String));
  const pool = (Array.isArray(items) ? items : []).filter(i => !skip.has(String(i?.backlog_id ?? "")));
  const tier = i => (String(i?.scope_origin ?? "") === "discovered" &&
                     (i?.epic_id === null || i?.epic_id === undefined)) ? 0 : 1;
  const ordered = [...pool].sort((a, b) =>
    (tier(a) - tier(b)) ||
    ((Number(a?.row_ordinal) || 0) - (Number(b?.row_ordinal) || 0)) ||
    String(a?.backlog_id ?? "").localeCompare(String(b?.backlog_id ?? "")));
  const n = Number(limit);
  const take = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return { batch: ordered.slice(0, take), eligible: pool.length };
}

// The one line `(7f)` copies into the cycle `notes`. It is the whole report: how many this run put in
// front of the manager, and how many tickets the board still has waiting.
export function progressLine(raised, remaining) {
  return `BACKLOG REVIEW: raised ${raised}, remaining ${remaining}`;
}

// Join the three board reads into the flat item selectBatch()/toFinding() reason over. Pure so a
// test drives it with rows rather than a database.
export function joinBoard(tickets, epics, projects) {
  const epicById = new Map((Array.isArray(epics) ? epics : []).map(e => [String(e.id), e]));
  const projById = new Map((Array.isArray(projects) ? projects : []).map(p => [String(p.id), p]));
  return (Array.isArray(tickets) ? tickets : []).map(t => {
    const epic = t.epic_id ? epicById.get(String(t.epic_id)) : undefined;
    const proj = epic && epic.project_id ? projById.get(String(epic.project_id)) : undefined;
    return {
      backlog_id: t.backlog_id,
      title: t.title,
      description: t.description,
      type: t.type ?? null,
      priority_class: t.priority_class ?? null,
      scope_origin: t.scope_origin ?? null,
      row_ordinal: t.row_ordinal,
      epic_id: t.epic_id ?? null,
      epic_name: epic ? epic.name : null,
      project_slug: proj ? proj.slug : null,
    };
  });
}

// --- CLI ------------------------------------------------------------------------------------------

export function parseArgs(argv) {
  const a = {};
  for (const s of Array.isArray(argv) ? argv : []) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(s);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  if (a.raise !== true) return { error: "the only mode is --raise" };
  const cycleId = typeof a["cycle-id"] === "string" ? a["cycle-id"] : "";
  if (!cycleId) return { error: "--cycle-id=<uuid> is required: every before-image binds to one open cycle (§19v)" };
  const limit = a.limit === undefined ? 15 : Number(a.limit);
  if (!Number.isFinite(limit) || limit <= 0) return { error: `--limit must be a positive number (got ${a.limit})` };
  return { cycleId, limit: Math.floor(limit), apply: a["dry-run"] !== true };
}

export function creds(env = process.env) {
  const base = String(env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_KEY ?? "");
  if (!base || !key) return { error: "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass)." };
  return { base, key };
}

// `fetch` is read off the global at CALL time, so a test can stub globalThis.fetch and drive the same
// transports the CLI uses (audit-run-review.js's shape, deliberately identical).
export function restTransports(base, key) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers });
    if (!res.ok) throw new Error(`read ${String(q).split("?")[0]} returned HTTP ${res.status}`);
    return res.json();
  };
  const post = async (table, body) => {
    const res = await fetch(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${table} insert returned HTTP ${res.status}`);
  };
  return { get, post };
}

// The four reads. `limit=5000` is above the board's size by an order of magnitude and is stated
// rather than left to PostgREST's default 1000, which 599 open rows are already two thirds of.
export async function readBoard(get) {
  const tickets = await get("backlog_items?select=backlog_id,title,description,type,priority_class," +
    "scope_origin,row_ordinal,epic_id&status=eq.open&order=row_ordinal,backlog_id&limit=5000");
  const epics = await get("epics?select=id,name,project_id&limit=5000");
  const projects = await get("projects?select=id,slug&limit=5000");
  const ruled = await get("audit_findings?select=filed_backlog_id,check_slug,locations" +
    `&or=(filed_backlog_id.not.is.null,check_slug.eq.${CHECK_SLUG})&limit=5000`);
  return { tickets, epics, projects, ruled };
}

export async function doRaise(args, get, post) {
  const { tickets, epics, projects, ruled } = await readBoard(get);
  const items = joinBoard(tickets, epics, projects);
  const { batch, eligible } = selectBatch(items, excludedTickets(ruled), args.limit);

  if (batch.length === 0) {
    console.log(progressLine(0, eligible));
    console.log("backlog-review: nothing left to raise — every open ticket is already a finding or a filing.");
    return 3;
  }

  const findings = batch.map(toFinding);
  const week = isoWeek(new Date());
  // ONE ingest for the batch: audit-ledger.js does the read, the four-way verdict, the before-image
  // and the append. `finding_type` rides on each finding (pattern:99's rule per ticket), so no run
  // default is passed and none could overwrite it.
  const { summary, written } = await ingestFindings({
    findings,
    foundBy: `${CHECK_SLUG}:${args.cycleId}`,
    cycleId: args.cycleId,
    week,
    apply: args.apply,
    get,
    post,
  });

  console.log(progressLine(written, eligible - written));
  console.log(`backlog-review ${week}: ${batch.length} selected, ${summary.new} new, ${summary.seen} seen, `
    + `${summary.recurring} recurring, ${summary.ruledOut} ruled-out, ${written} written`
    + (args.apply ? "" : ` (dry run: ${batch.length} would be raised)`));
  console.log(`backlog-review first: ${batch[0].backlog_id}`);
  return 0;
}

export async function run(argv, env = process.env) {
  const args = parseArgs(argv);
  if (args.error) {
    console.error(`backlog-review: ${args.error}`);
    return 2;
  }
  const c = creds(env);
  if (c.error) {
    console.error(`backlog-review: ${c.error}`);
    return 2;
  }
  const { get, post } = restTransports(c.base, c.key);
  try {
    return await doRaise(args, get, post);
  } catch (e) {
    console.error(`backlog-review: ${e.message}`);
    return 2;
  }
}

// SES-176's contract: importing this module for its exports must never run the CLI. exitCode rather
// than process.exit(): on Node 24 a process.exit() right after a fetch can abort with the libuv
// UV_HANDLE_CLOSING assertion (audit-ledger.js's AGT-86 slice 3 note).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  run(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
