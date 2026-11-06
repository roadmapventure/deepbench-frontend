#!/usr/bin/env node
// DeepBench v7.0.969 | scripts/audit-run-review.js | AGT-593 -- the week's unreviewed cycles; the stamp
// FEATURE: AGT-593 -- (7e) REVIEWS THE ONE CYCLE IT IS HANDED, SO THE OTHERS WERE NEVER PICKED UP.
// Measured live 2026-11-06 (tree 005ad22): of 51 closed reviewable cycles this ISO week, 41 carried
// no `auditor:run-review:<id>` row at all -- a chained continuation's closed cycle is never the
// `--cycle-id` any (7e) is given, so its record was never read. Two things change here, both
// deterministic and neither a judgment (pattern:9):
//   1. EVERY --prepare, exit 0 AND exit 3, ends with `unreviewedLine()` -- this week's closed
//      reviewable cycles that are not this one and carry neither the stamp nor a run-review row,
//      newest first, at most BACKLOG_LIMIT listed. Exit 3 is where it matters most: the cycle in
//      hand had nothing to review and the routine used to simply stop.
//   2. A reviewed row SAYS SO. `--ingest --apply --cycle-id` appends a `RUN-REVIEW STAMP:` note
//      through scripts/cycle-note.js (the same PostgREST append and the same citation guard, never
//      a second writer), findings or none. "No run-review row" is NOT the mark -- a clean review
//      files nothing, so the absence of rows would re-offer a cycle forever (§19j). The stamp is
//      the mark; a stamp that did not land is exit 2 with the rows already filed, and a re-run
//      reads them `seen` and stamps.
//
// DeepBench v7.0.661 | scripts/audit-run-review.js | AGT-239
// FEATURE: AGT-239 -- OUTCOMES FIRST. After the gate passes, --prepare asks public.audit_flow_checks()
// for the four flow checks (ships not closed, a verdict gate red for days, wasted cycles, filing
// outpacing closing), FILES what it returns through audit-ledger.js's one intake under found_by
// `auditor:flow:<cycle id>` (the SQL's fixed governing_fact makes a second run the same week `seen`),
// and reads the open `service` findings (db_health_tick()'s). The doc now leads with both, so the
// reviewer reads the service and the flow before the record: keys service, flow, cycle, items,
// verdicts, ci, filings, prior. --ingest keeps a finding's `family` only when it is `outcome`;
// anything else goes in null and the ledger's trigger files it by found_by (`paperwork`).
//
// DeepBench v7.0.602 | scripts/audit-run-review.js | AGT-137
// FEATURE: AGT-137 -- THE AUDITOR REVIEWS ONE RUN, THE WEEK IT HAPPENS. Measured live 2026-09-25:
// there was no `audit-run-review` among the seven `audit-*` capabilities and no `run-review` string
// anywhere in `scripts`, `docs/runbooks` or `api`, and the weekly advisor's `limits_hit` counts only
// `outcome in ('did_not_run','failed')` -- so of 139 cycles since 2026-09-18 (67 shipped, 53
// did_not_run, 8 gated_before_build, 3 failed, 8 open) NO ship's and NO gate's per-run facts ever
// reached a reviewer. A weekly audit reads the board; nothing read the run.
//
// WHAT IS REVIEWABLE IS A FIXED SET, NOT A JUDGMENT: REVIEWABLE below is `drain_chain_gate()`'s
// gate-A set plus `failed` -- a run that produced a ship, a gate, a revert or a failure left a
// record worth reading. `did_not_run` left nothing but its reason (the advisor already counts
// those), and an OPEN row (`outcome` NULL) is a cycle still running, whose record is not final.
// Both are exit 3: nothing to review, no model call, no cost. That gate is the whole spend control
// on this capability -- the tail asks before it pays, rather than paying to be told there was
// nothing there.
//
// THE PREPARE IS SIX READS AND NO JUDGMENT (pattern:9). Everything a reviewer needs about one
// cycle is assembled here, deterministically, and handed to `scripts/agent-prompt.js --task-file=`;
// nothing in this file decides anything. The six, in the order they are written:
//   cycle     runner_cycles for this id -- outcome, last_step, started_at, notes
//   items     runner_items for this cycle
//   verdicts  runner_verdicts for this cycle -- verdict, its three gates, reasoning
//   ci        the five newest ci_run_conclusions on ref `dev`
//   filings   backlog_items filed at or after the cycle started
//   prior     the fingerprints already in this ISO week's audit_findings (never re-filed)
//
// THE INGEST IS audit-ledger.js's, NOT A SECOND COPY OF IT (pattern:14, pattern:15). `ingestFindings()`
// is AGT-131's one intake: the four-way classification, the `finding_type` refusal, the before-image
// that authorises each append (§19v). This file supplies the transports, the week, one attribution
// and a `found_by` of `auditor:run-review:<cycle id>`, and nothing else.
//
// Usage:
//   node scripts/audit-run-review.js --prepare --cycle-id=<uuid> --out=<path>
//   node scripts/audit-run-review.js --ingest=<answer.json> --cycle-id=<uuid> --apply
//   node scripts/audit-run-review.js --ingest=<answer.json> --session-name=<name> --apply
//
// Flags:
//   --prepare             Assemble the six reads for one cycle and write them to --out.
//   --cycle-id=<uuid>     The runner cycle under review. Required by --prepare.
//   --out=<path>          Where --prepare writes its JSON. Required by --prepare.
//   --ingest=<path>       The reviewer's answer ({cluster, findings, account}) to file.
//   --apply               Actually append. Without it the ingest is a dry run that writes nothing,
//                         and stamps nothing -- `run-review stamp: skipped`.
//   --session-name=<name> An attended run's attribution, INSTEAD of --cycle-id. Never both:
//                         runner_before_images.ck_before_image_attribution refuses both, so both
//                         is refused here, before any read (audit-ledger.js attribution()).
//                         A --session-name ingest stamps NO row: the stamp marks a runner_cycles
//                         row, and an attended run has none (AGT-593).
//
// Exit codes:
//   0  --prepare wrote the file; --ingest ran cleanly (and, with --apply --cycle-id, stamped).
//   2  could not run: a missing or non-uuid --cycle-id, --cycle-id together with --session-name,
//      no credentials, an unreadable answer file, a non-2xx from PostgREST. NEVER a pass. ALSO:
//      the findings were filed but the `RUN-REVIEW STAMP` note did NOT land (AGT-593) -- the rows
//      are already there, so the re-run reads them `seen` and only the stamp is retried.
//   3  nothing to review: the cycle's outcome is `did_not_run`, or the row is still open
//      (`outcome` NULL). Nothing is written and no model is called -- but the week's unreviewed
//      cycles are still listed on the last line (AGT-593), because exit 3 is exactly when the
//      routine used to stop with the other 40 unread.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ingestFindings, isoWeek, isoWeekStart } from "./audit-ledger.js";
import { cycleNote } from "./cycle-note.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `drain_chain_gate()`'s gate-A set plus `failed`. Exported because the runbook's (7e) states it in
// prose and tests/regression/agt-137-run-review.test.mjs pins the prose against THIS array.
export const REVIEWABLE = ["shipped", "gated_before_build", "reverted", "failed"];

// AGT-593. At most three ids are listed per prepare -- the Finish line's "<= 3 passes" ceiling, so
// one tail cannot turn into an unbounded queue of sub-agent reviews. n > k drains over later cycles.
export const BACKLOG_LIMIT = 3;
// The mark a reviewed row carries. NOT "has a run-review row": a clean review files nothing, so
// absence of rows is not evidence of absence of review (§19j).
export const STAMP = "RUN-REVIEW STAMP";

// This ISO week's closed reviewable cycles that are NOT this one and have not been reviewed --
// newest first, at most BACKLOG_LIMIT listed. Two reads and no judgment:
//   1. runner_cycles, filtered server-side on the REVIEWABLE set, `ended_at` inside this ISO week,
//      `id` not this cycle, and `notes` carrying no STAMP (a NULL notes column is unstamped too,
//      which is why the `or=` names both limbs -- `notes.not.like` alone drops every NULL row).
//   2. audit_findings, once, for the `auditor:run-review:<id>` found_by of exactly those ids. A
//      cycle somebody reviewed before the stamp existed is named here and dropped, so the backlog
//      does not re-offer the runs that WERE read.
// The second read is skipped entirely when the first returns nothing usable -- an id-less row
// cannot be reviewed and must never reach a `found_by=in.()` filter with an empty list.
export async function unreviewedPredecessors(cycleId, get, now = new Date()) {
  const q = encodeURIComponent;
  const weekStart = isoWeekStart(now);
  const rows = await get(`runner_cycles?select=id,outcome,ended_at`
    + `&outcome=in.(${REVIEWABLE.join(",")})`
    + `&id=neq.${cycleId}`
    + `&ended_at=gte.${q(weekStart)}`
    + `&or=(notes.is.null,notes.not.like.${q(`*${STAMP}*`)})`
    + `&order=ended_at.desc`);
  let open = (Array.isArray(rows) ? rows : [])
    .map(r => String(r?.id ?? ""))
    .filter(id => UUID.test(id));
  if (open.length) {
    const reviewed = await get(`audit_findings?select=found_by&found_by=in.`
      + `(${q(open.map(i => `"auditor:run-review:${i}"`).join(","))})`);
    const named = new Set((Array.isArray(reviewed) ? reviewed : []).map(r => String(r?.found_by ?? "")));
    open = open.filter(id => !named.has(`auditor:run-review:${id}`));
  }
  return { weekStart, total: open.length, listed: open.slice(0, BACKLOG_LIMIT) };
}

// The last line of EVERY prepare. `total` is the whole week's open set; `listed` is what this
// prepare hands the routine. Zero says so in words, so a silent line is never read as "none".
export function unreviewedLine(u) {
  const total = u?.total ?? 0;
  const listed = u?.listed ?? [];
  return `audit-run-review: unreviewed this week: `
    + (total === 0
      ? `0 -- nothing to pick up`
      : `${total} (${listed.length} listed, cap ${BACKLOG_LIMIT}) -- ${listed.join(", ")}`);
}

// The note appended to the reviewed row. `0 findings, 0 written` is a real review and must read as
// one -- that is the whole reason the stamp exists rather than a row count.
export function stampNote(week, count, written) {
  return `${STAMP}: ${count} findings, ${written} written, ${week}`;
}

export function arg(argv, name) {
  const hit = (argv ?? []).find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

// Pure. Every refusal that can be decided from the command line alone is decided HERE, before
// credentials are read and before anything is fetched -- a run attributed to both a cycle and a
// session must never get as far as asking Supabase for anything.
export function parseArgs(argv) {
  const prepare = arg(argv, "prepare") === true;
  const ingest = arg(argv, "ingest");
  const cycleId = arg(argv, "cycle-id");
  const sessionName = arg(argv, "session-name");
  const out = arg(argv, "out");
  const apply = arg(argv, "apply") === true;

  if (cycleId && sessionName) return { error: "exactly one of --cycle-id / --session-name" };
  if (cycleId === true || cycleId === "") return { error: "--cycle-id=<uuid> needs a value" };
  if (cycleId && !UUID.test(String(cycleId))) return { error: `--cycle-id=${cycleId} is not a uuid` };

  if (prepare) {
    if (!cycleId) return { error: "--prepare needs --cycle-id=<uuid>" };
    if (!out || out === true) return { error: "--prepare needs --out=<path>" };
    return { mode: "prepare", cycleId: String(cycleId), out: String(out) };
  }
  if (ingest !== undefined) {
    if (ingest === true || ingest === "") return { error: "--ingest=<path> needs a value" };
    if (apply && !cycleId && !sessionName) {
      return { error: "--apply needs exactly one of --cycle-id / --session-name" };
    }
    return {
      mode: "ingest",
      ingest: String(ingest),
      apply,
      cycleId: cycleId ? String(cycleId) : null,
      sessionName: sessionName ? String(sessionName) : null,
    };
  }
  return { error: "nothing to do: pass --prepare --cycle-id=<uuid> --out=<path>, or --ingest=<path>" };
}

// Pure, and the only place the REVIEWABLE rule is applied. A row that is not there is exit 2 (the
// id names nothing -- that is a caller error, not an empty review); `did_not_run` and an open row
// are exit 3.
export function reviewGate(row) {
  if (!row) return { code: 2, reason: "no runner_cycles row for that id" };
  const outcome = row.outcome ?? null;
  if (outcome === null) return { code: 3, reason: "the cycle is still open (outcome NULL) -- its record is not final" };
  if (!REVIEWABLE.includes(outcome)) return { code: 3, reason: `outcome ${outcome} is not reviewable (${REVIEWABLE.join(", ")})` };
  return { code: 0, reason: `outcome ${outcome}` };
}

export function creds(env = process.env) {
  const base = String(env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_KEY ?? "");
  if (!base || !key) return { error: "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass)." };
  return { base, key };
}

// `fetch` is read off the global at CALL time, so a test can stub globalThis.fetch and drive the
// same transports the CLI uses rather than a second implementation of them.
export function restTransports(base, key) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async q => {
    const res = await fetch(`${base}/rest/v1/${q}`, { headers });
    if (!res.ok) throw new Error(`read ${String(q).split("?")[0]} returned HTTP ${res.status}`);
    return res.json();
  };
  const rpc = async (fn, body) => {
    const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error(`rpc ${fn} returned HTTP ${res.status}`);
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
  return { get, post, rpc };
}

// The six reads. `runner_cycles` carries no `gate_failed` column (measured 2026-09-26 against
// information_schema) -- the gates live on `runner_verdicts` as gate_build / gate_regression /
// gate_hygiene, which the third read carries, so nothing about the gates is lost.
// AGT-239 -- the flow checks, filed, and the open service findings. `post` here is the same
// transport the ingest uses; the rpc call is a POST because PostgREST exposes functions that way,
// but audit_flow_checks() is STABLE and writes nothing -- the only writes are ingestFindings()'s,
// each behind its before-image. An empty flow list files nothing and makes no ledger read.
export async function readOutcomes(cycleId, get, rpc, post) {
  const flow = await rpc("audit_flow_checks", {});
  const list = Array.isArray(flow) ? flow : [];
  let filed = { written: 0, summary: { new: 0, seen: 0, recurring: 0, ruledOut: 0 } };
  if (list.length) {
    filed = await ingestFindings({
      findings: list, foundBy: `auditor:flow:${cycleId}`, findingType: "defect",
      cycleId, apply: true, get, post,
    });
  }
  const service = await get("audit_findings?family=eq.service&status=in.(open,carried)"
    + "&select=id,check_slug,locations,governing_fact,proposed_resolution,created_at&order=created_at.desc");
  return { service, flow: list, filed };
}

export async function readSix(cycleId, cycle, get) {
  const q = encodeURIComponent;
  const week = isoWeek(new Date());
  const since = cycle.started_at ? `&filed_at=gte.${q(cycle.started_at)}` : "";
  const [items, verdicts, ci, filings, prior] = await Promise.all([
    get(`runner_items?cycle_id=eq.${cycleId}`),
    get(`runner_verdicts?cycle_id=eq.${cycleId}&select=verdict,gate_build,gate_regression,gate_hygiene,reasoning`),
    get(`ci_run_conclusions?ref=eq.dev&order=concluded_at.desc&limit=5`),
    since ? get(`backlog_items?select=backlog_id,title,status,priority_class,filed_at${since}`) : Promise.resolve([]),
    get(`audit_findings?select=fingerprint&iso_week=eq.${week}`),
  ]);
  return { cycle, items, verdicts, ci, filings, prior };
}

async function doPrepare({ cycleId, out }, get, rpc, post) {
  const rows = await get(`runner_cycles?id=eq.${cycleId}&select=outcome,last_step,started_at,notes`);
  const gate = reviewGate(Array.isArray(rows) ? rows[0] : null);
  // Exit 2 is a caller error -- the id names nothing, so there is no week's-worth of context to
  // offer and nothing is read beyond the gate.
  if (gate.code === 2) {
    console.error(`audit-run-review: ${gate.reason}`);
    return 2;
  }
  // AGT-593 -- read BEFORE the exit-3 return, because exit 3 is the path that used to stop silently.
  const unreviewed = await unreviewedPredecessors(cycleId, get);
  if (gate.code === 3) {
    console.log(`audit-run-review: nothing to review -- ${gate.reason}. No file written, no cost.`);
    console.log(unreviewedLine(unreviewed));
    return 3;
  }
  const outcomes = await readOutcomes(cycleId, get, rpc, post);
  const six = await readSix(cycleId, rows[0], get);
  const doc = { service: outcomes.service, flow: outcomes.flow, ...six };
  const dest = path.resolve(ROOT, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(doc, null, 2), "utf8");
  console.log(`audit-run-review: prepared ${cycleId} (${gate.reason}) -> ${out}: `
    + `${doc.service.length} open service, ${doc.flow.length} flow (${outcomes.filed.written} filed, `
    + `${outcomes.filed.summary.seen} seen), ${doc.items.length} items, ${doc.verdicts.length} verdicts, ${doc.ci.length} ci, `
    + `${doc.filings.length} filings, ${doc.prior.length} prior fingerprints`);
  console.log(unreviewedLine(unreviewed));
  return 0;
}

async function doIngest({ ingest, apply, cycleId, sessionName }, get, post, env = process.env) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(path.resolve(ROOT, ingest), "utf8"));
  } catch (e) {
    throw new Error(`could not read --ingest=${ingest}: ${e.message}`);
  }
  const raw = Array.isArray(doc.findings) ? doc.findings : null;
  if (!raw) throw new Error(`the --ingest file has no top-level \`findings\` array.`);
  // AGT-239 -- only `outcome` is the reviewer's to set; anything else is filed by found_by.
  const findings = raw.map(f => ({ ...f, family: f && f.family === "outcome" ? "outcome" : null }));
  const week = isoWeek(new Date());
  // One attribution, and a `found_by` that says which run was reviewed -- trigger `audit_findings_guard()`
  // (migration `20260926114350` dropped the CHECK `audit_findings_found_by_single`) refuses a joined value, so this is one string, never a list.
  const foundBy = `auditor:run-review:${cycleId ?? sessionName}`;
  const { summary, written } = await ingestFindings({
    findings, week, foundBy,
    findingType: "defect",   // the run's default; a finding's own finding_type wins (AGT-131)
    cycleId, sessionName, apply, get, post,
  });
  console.log(`run-review ingest ${week}: ${findings.length} findings, ${summary.new} new, `
    + `${summary.seen} seen, ${summary.recurring} recurring, ${summary.ruledOut} ruled-out, ${written} written`);
  // AGT-593 -- THE ROW SAYS IT WAS REVIEWED. After the rows are filed, never before: a stamp on a
  // row whose findings did not land would hide the cycle from the next prepare with nothing read.
  // The append is cycle-note.js's, so the citation guard still grades it and a refusal is a
  // non-zero code here, never a silent success. A dry run and a --session-name run stamp nothing.
  if (apply && cycleId) {
    const s = await cycleNote([`--cycle=${cycleId}`, `--note=${stampNote(week, findings.length, written)}`], env);
    console.log(`run-review stamp: ${s.message}`);
    if (s.code !== 0) {
      console.error(`audit-run-review: the row was NOT stamped -- re-run this --ingest (rows re-read as seen)`);
      return 2;
    }
  } else {
    console.log(`run-review stamp: skipped`);
  }
  return 0;
}

export async function run(argv, env = process.env) {
  const args = parseArgs(argv);
  if (args.error) {
    console.error(`audit-run-review: ${args.error}`);
    return 2;
  }
  const c = creds(env);
  if (c.error) {
    console.error(`audit-run-review: ${c.error}`);
    return 2;
  }
  const { get, post, rpc } = restTransports(c.base, c.key);
  try {
    return args.mode === "prepare" ? await doPrepare(args, get, rpc, post) : await doIngest(args, get, post, env);
  } catch (e) {
    console.error(`audit-run-review: ${e.message}`);
    return 2;
  }
}

// SES-176's contract: importing this module for its exports must never run the CLI. exitCode rather
// than process.exit(): on Node 24 a process.exit() right after a fetch can abort with the libuv
// UV_HANDLE_CLOSING assertion (audit-ledger.js's AGT-86 slice 3 note).
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  run(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
