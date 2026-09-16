#!/usr/bin/env node
// DeepBench v7.0.508 | scripts/staff-watch.js | SES-378 slice 3 -- build item (6) THE STAFF WATCH.
//
// WHY THIS EXISTS, and it is a table's absence rather than a missing feature. All 70 `public` base
// tables were listed this cycle: `audit_findings` and `ticket_owner_findings` exist and NOTHING
// holds a per-agent finding. So a defect observed in one of the governance agents has had exactly
// one home -- prose. Slice 2's carried item is the live example: `CLAIM LABEL COLLISION:
// run-project:moat-support:1 on SES-378 + SES-399` sits at `docs/SESSIONS.md:28` as a sentence, and
// a sentence is ungroupable and uncountable, so it can never reach the ticket's own 3-cycle
// promotion bar no matter how many times the same defect recurs. `public.runner_staff_findings`
// (migration `ses378c_staff_findings`) is that home; this script is how a cycle reaches it.
//
// IT REPORTS, IT DOES NOT GATE. Exit 0 at ANY finding count -- zero findings, one finding, a
// fingerprint standing at the promotion bar, all exit 0. Exit 2 is reserved for "this script could
// not run at all": an unrecognised `--kind`, a missing `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, a
// write the database refused. That split is deliberate and load-bearing: the staff watch is
// evidence, and evidence that can fail a cycle's pipeline would be evidence nobody records.
//
// THE MANAGER NEVER EDITS A LIVE AGENT'S ROWS. `--promote --apply` writes ONE `runner_card_asks`
// row per fingerprint and nothing else -- it ASKS for a Skill edit, it does not perform one. The
// five tables `scripts/check-agent-names-in-data.js` sweeps under Rule #1 are untouched here, and
// `agent_id` on a finding carries the vocabulary of `ai_activity_log.agent_id` (`devmanager` on row
// 46453): evidence ABOUT a call, never an agent's own rows.
//
// AN EVIDENCE TABLE, DELIBERATELY NOT REVERSIBLE. `runner_staff_findings` is NOT on
// `public.reversible_tables()`'s allowlist, exactly like `audit_findings`, and this script must
// never be the reason someone widens `reverse_decision()`'s `k_allowed`. A finding is an
// observation that was true when it was made; reversing it would be editing the record rather than
// undoing a change.
//
// THE PROMOTION ARITHMETIC IS COMPUTED IN JS, NOT IN SQL, AND THAT IS FORCED. The semantics are the
// kickoff's query verbatim -- `group by fingerprint, agent_id, kind having count(distinct cycle_id)
// >= 3` -- but this platform reaches Supabase over PostgREST from a script, and PostgREST exposes no
// raw-SQL RPC on this project (probed at this ship: `public.exec_readonly_sql` does not exist, and
// `information_schema` is not an exposed schema). So `promotionsFrom()` below IS the shipped
// arithmetic, the rows are fetched and grouped here, and the regression file drives that same
// exported function on fixtures rather than a second copy of the rule.
//
// COUNT DISTINCT CYCLES, NEVER ROWS. Three rows written in ONE cycle is one cycle's observation
// recorded three times -- it is not a defect seen three times, and promoting on it would turn a
// chatty cycle into a Skill edit. `unique (cycle_id, fingerprint)` makes that hard to do by
// accident; `distinctCycles()` makes it impossible to do on purpose.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/staff-watch.js \
//     --record --cycle-id=<runner_cycles.id> --agent=devmanager \
//     --kind='assignment mismatch' --detail='...' [--backlog=SES-378] [--json]
//   node scripts/staff-watch.js --since-days=7 [--json]
//   node scripts/staff-watch.js --promote [--apply --cycle-id=<runner_cycles.id>] [--json]
//
// EXIT CODES: 0 it ran (any finding count); 2 it could not run.

import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

// The ticket's own four values, verbatim, and the same list the table's CHECK constraint carries.
// Kept here so a bad `--kind` is refused BEFORE a row is attempted rather than surfacing as a 23514
// the caller has to decode.
export const KINDS = [
  "over-cap refusal",
  "kickoff lacked a fact",
  "verdict block attributable to the kickoff",
  "assignment mismatch",
];

export const TABLE = "runner_staff_findings";
export const PROMOTION_BAR = 3;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

const sha256 = s => createHash("sha256").update(String(s), "utf8").digest("hex");

function fail(message) {
  console.error(`staff-watch: ${message}`);
  process.exit(2);
}

// --- the fingerprint ---------------------------------------------------------------------------
//
// ONE DEFECT SEEN IN THREE CYCLES MUST GROUP AS ONE, and the only thing standing between "grouped"
// and "three singletons that never promote" is this normalisation. Every cycle writes its own uuid
// into the prose it reports -- a cycle id, a row id, a decision handle -- so two reports of the SAME
// defect differ by a uuid and nothing else. Masking them to `<uuid>` is therefore not tidying; it is
// the difference between a promotion bar that can be reached and one that cannot.
//
// RETURNS `{ error }` WITH NO `fingerprint` KEY on a bad input, never a fingerprint of the empty
// string. sha256("agent|kind|") is a perfectly good-looking 16 hex characters that every empty
// detail would share, so a caller that only checks truthiness would silently group unrelated
// findings under one hash and promote them together.
export function fingerprintFor({ agentId, kind, detail } = {}) {
  const norm = String(detail ?? "").toLowerCase()
    .replace(UUID_RE, "<uuid>")
    .replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (!agentId || !kind || !norm) return { error: "agent, kind and detail are all required" };
  return { fingerprint: sha256(`${agentId}|${kind}|${norm}`).slice(0, 16) };
}

// --- the promotion arithmetic ------------------------------------------------------------------
//
// `count(distinct cycle_id)`, as a function, so the regression file can drive the SHIPPED rule on
// fixtures and its SES-158 control can replace this one counter with `count(*)` and watch a case
// that must stay empty fill up.
export const distinctCycles = rows => new Set(rows.map(r => r.cycle_id)).size;

// Groups by the kickoff's exact key -- fingerprint, agent_id, kind -- and keeps only groups standing
// at or past the bar. `counter` is injected so the control has something real to mutate; the default
// is the only one anything ships with.
export function promotionsFrom(rows, { counter = distinctCycles, bar = PROMOTION_BAR } = {}) {
  const groups = new Map();
  for (const r of rows ?? []) {
    const key = `${r.fingerprint}|${r.agent_id}|${r.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const [, members] of groups) {
    const cycles = counter(members);
    if (cycles < bar) continue;
    const first = members[0];
    out.push({
      fingerprint: first.fingerprint,
      agent_id: first.agent_id,
      kind: first.kind,
      cycles,
      detail: first.detail,
      backlog_id: first.backlog_id ?? null,
    });
  }
  return out.sort((a, b) => b.cycles - a.cycles || a.fingerprint.localeCompare(b.fingerprint));
}

// The text a `--promote` prints, and the text `--apply` files verbatim. Says what was seen, how
// often, and what it is asking for -- an ask never states a verdict.
export function skillEditTextFor(p) {
  return `Skill edit proposed for ${p.agent_id}: the same finding (${p.kind}) has now been recorded `
    + `by ${p.cycles} distinct cycles, fingerprint ${p.fingerprint}`
    + `${p.backlog_id ? ` (last seen on ${p.backlog_id})` : ""}. `
    + `Detail as recorded: ${p.detail} -- does this agent's Skill need a line that prevents it?`;
}

// --- arguments ----------------------------------------------------------------------------------

export function parseArgs(argv, kinds = KINDS) {
  const out = { json: false, apply: false, mode: null };
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case "record": out.mode = "record"; break;
      case "promote": out.mode = "promote"; break;
      case "since-days": out.mode = "since"; out.sinceDaysRaw = value; break;
      case "cycle-id": out.cycleId = value; break;
      case "agent": out.agent = value; break;
      case "kind": out.kind = value; break;
      case "detail": out.detail = value; break;
      case "backlog": out.backlog = value; break;
      case "apply": out.apply = true; break;
      case "json": out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (!out.mode) return { error: "one of --record, --since-days=<n> or --promote is required" };

  if (out.mode === "record") {
    for (const [field, flag] of [["cycleId", "cycle-id"], ["agent", "agent"], ["kind", "kind"], ["detail", "detail"]]) {
      if (!out[field]) return { error: `--${flag} is required with --record` };
    }
    // An unknown kind inserts NOTHING and exits 2. The table's own CHECK would refuse it anyway;
    // refusing here means the caller is told which four values exist instead of reading a 23514.
    if (!kinds.includes(out.kind)) {
      return { error: `--kind "${out.kind}" is not one of the four recorded kinds: ${kinds.map(k => `"${k}"`).join(", ")}` };
    }
  }
  if (out.mode === "since") {
    if (!/^\d+$/.test(String(out.sinceDaysRaw ?? ""))) return { error: "--since-days must be a non-negative integer" };
    out.sinceDays = Number(out.sinceDaysRaw);
  }
  if (out.mode === "promote" && out.apply && !out.cycleId) {
    return { error: "--apply needs --cycle-id=<runner_cycles.id> to stamp the asks it files" };
  }
  return out;
}

// --- PostgREST ----------------------------------------------------------------------------------

function rest() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url) fail("SUPABASE_URL not set");
  if (!key) fail("SUPABASE_SERVICE_KEY not set");
  const base = url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
  return {
    async get(q) {
      const r = await fetch(`${base}/rest/v1/${q}`, { headers });
      if (!r.ok) fail(`GET ${q} -> HTTP ${r.status} ${await r.text().catch(() => "")}`);
      return r.json();
    },
    // `path` carries its own `?on_conflict=` where one is needed -- see the note at each call site.
    async post(table, body, prefer) {
      const r = await fetch(`${base}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, Prefer: prefer },
        body: JSON.stringify(body),
      });
      if (!r.ok) fail(`POST ${table} -> HTTP ${r.status} ${await r.text().catch(() => "")}`);
      return r.json();
    },
  };
}

// --- the three modes ------------------------------------------------------------------------------

async function record(args) {
  const fp = fingerprintFor({ agentId: args.agent, kind: args.kind, detail: args.detail });
  if (fp.error) fail(fp.error);
  const db = rest();

  // THE SECOND IDENTICAL RECORD IS A NO-OP, NOT A SECOND ROW. `resolution=ignore-duplicates` lets
  // `unique (cycle_id, fingerprint)` absorb it server-side and returns an EMPTY array -- which is
  // why the row is read back below rather than taken from the insert's response. A script that
  // reported the empty array as a failure would make a re-run look broken; one that inserted on
  // conflict would inflate a cycle's own count and walk a one-cycle observation toward the bar.
  //
  // `?on_conflict=cycle_id,fingerprint` IS NOT OPTIONAL, and this is measured rather than reasoned
  // about: with the Prefer header ALONE, PostgREST aims the resolution at the PRIMARY KEY and a
  // second identical `--record` returned `409 23505 duplicate key value violates
  // "runner_staff_findings_cycle_id_fingerprint_key"` on this table's first live run. The header
  // says how to resolve a conflict; only the query parameter says WHICH conflict.
  const written = await db.post(`${TABLE}?on_conflict=cycle_id,fingerprint`, [{
    cycle_id: args.cycleId,
    agent_id: args.agent,
    kind: args.kind,
    backlog_id: args.backlog ?? null,
    detail: args.detail,
    fingerprint: fp.fingerprint,
  }], "return=representation,resolution=ignore-duplicates");

  const isNew = Array.isArray(written) && written.length === 1;
  const rows = await db.get(
    `${TABLE}?cycle_id=eq.${encodeURIComponent(args.cycleId)}`
    + `&fingerprint=eq.${encodeURIComponent(fp.fingerprint)}`
    + `&select=id,cycle_id,agent_id,kind,backlog_id,detail,fingerprint,created_at`);
  if (rows.length !== 1) fail(`expected exactly 1 row for (${args.cycleId}, ${fp.fingerprint}) after --record, found ${rows.length}`);
  const row = rows[0];

  if (args.json) {
    process.stdout.write(JSON.stringify({ recorded: isNew, rows_for_fingerprint_in_cycle: rows.length, row }) + "\n");
  } else {
    process.stdout.write(
      `${isNew ? "recorded" : "no-op (already recorded in this cycle)"} `
      + `fingerprint=${row.fingerprint} agent=${row.agent_id} kind="${row.kind}" `
      + `backlog=${row.backlog_id ?? "-"} cycle=${row.cycle_id} id=${row.id}\n`
      + `rows for this (cycle, fingerprint): ${rows.length}\n`);
  }
}

async function since(args) {
  const db = rest();
  const cutoff = new Date(Date.now() - args.sinceDays * 86400000).toISOString();
  const rows = await db.get(
    `${TABLE}?created_at=gte.${encodeURIComponent(cutoff)}&select=agent_id,kind,cycle_id,fingerprint&order=created_at.asc`);

  const byAgent = new Map();
  for (const r of rows) {
    if (!byAgent.has(r.agent_id)) byAgent.set(r.agent_id, []);
    byAgent.get(r.agent_id).push(r);
  }
  const counts = [...byAgent.entries()].map(([agent_id, rs]) => ({
    agent_id,
    findings: rs.length,
    distinct_fingerprints: new Set(rs.map(r => r.fingerprint)).size,
    distinct_cycles: new Set(rs.map(r => r.cycle_id)).size,
  })).sort((a, b) => b.findings - a.findings || a.agent_id.localeCompare(b.agent_id));

  if (args.json) {
    process.stdout.write(JSON.stringify({ since_days: args.sinceDays, since: cutoff, total: rows.length, agents: counts }) + "\n");
  } else {
    process.stdout.write(`staff watch, last ${args.sinceDays} day(s) (since ${cutoff}): ${rows.length} finding(s)\n`);
    for (const c of counts) {
      process.stdout.write(`  ${c.agent_id}: ${c.findings} finding(s), ${c.distinct_fingerprints} distinct, ${c.distinct_cycles} cycle(s)\n`);
    }
    if (!counts.length) process.stdout.write("  (none)\n");
  }
}

async function promote(args) {
  const db = rest();
  const rows = await db.get(`${TABLE}?select=fingerprint,agent_id,kind,cycle_id,detail,backlog_id&order=created_at.asc`);
  const promotions = promotionsFrom(rows);

  const filed = [];
  if (args.apply) {
    for (const p of promotions) {
      // ONE ROW EACH, never one per finding: the ask is about the fingerprint, and `uniq_card_ask
      // (target_id, asked_at, question)` is the only thing between a re-run and a duplicated thread.
      //
      // DEVIATION D1, REPORTED NOT ROUTED AROUND. The kickoff specifies `target_kind = 'skill-edit'`.
      // Read off the live database at this ship: `runner_card_asks_target_kind_check` admits only
      // `'item'` and `'question'`, so this INSERT is refused (23514) until a later slice widens that
      // constraint. The value is written as the kickoff specifies and the database's own refusal is
      // surfaced at exit 2 -- a silently substituted `'item'` would file the ask under the wrong
      // vocabulary and nobody would ever learn the constraint was in the way.
      const written = await db.post("runner_card_asks?on_conflict=target_id,asked_at,question", [{
        target_kind: "skill-edit",
        target_id: p.fingerprint,
        question: skillEditTextFor(p),
        asked_at: new Date().toISOString(),
        harvested_cycle: args.cycleId,
        status: "open",
      }], "return=representation,resolution=ignore-duplicates");
      filed.push({ fingerprint: p.fingerprint, filed: Array.isArray(written) && written.length === 1 });
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ bar: PROMOTION_BAR, promotions, applied: args.apply, filed }) + "\n");
  } else {
    process.stdout.write(`promotions at the ${PROMOTION_BAR}-distinct-cycle bar: ${promotions.length}\n`);
    for (const p of promotions) {
      process.stdout.write(`  ${p.fingerprint} ${p.agent_id} "${p.kind}" -- ${p.cycles} distinct cycle(s)\n`);
      process.stdout.write(`    ${skillEditTextFor(p)}\n`);
    }
    if (!promotions.length) process.stdout.write("  (none -- nothing has been seen by three distinct cycles yet)\n");
    for (const f of filed) {
      process.stdout.write(`  filed runner_card_asks for ${f.fingerprint}: ${f.filed ? "new" : "already open"}\n`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (args.mode === "record") return record(args);
  if (args.mode === "since") return since(args);
  return promote(args);
}

// Entry-point guard (scripts/agent-log.js's own note): the regression guard imports the pure
// helpers from here and must not run the script.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
