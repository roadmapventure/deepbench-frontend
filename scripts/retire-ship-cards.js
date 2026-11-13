#!/usr/bin/env node
// DeepBench v7.0.1022 | scripts/retire-ship-cards.js | AGT-459 -- stale ship cards close as receipts.
//
// WHAT THIS CLOSES, measured live 2026-11-13 rather than recalled. 373 `kind = 'ship'` cards on
// `runner_items` carry `decision IS NULL`, and 192 of them hang off a ticket that is ALREADY
// `done` (139) or `removed` (53). Nothing will ever decide those: the report asks John to accept,
// rework or reverse a build whose ticket the platform has already finished with. John ruled it on
// 2026-09-29 -- "its ticket is already done or removed -- retire the report as a receipt" -- and
// until this ship there was NO WRITER for that verdict: `runner_items_decision_check` already
// admits `retired` for every kind (so no DDL is needed here), and 0 ship cards read it.
//
// WHY A SCRIPT AND NOT A DATABASE FUNCTION (the redesign, attempt 1). v7.0.889 built
// `retire_stale_ship_cards()` as a migration and called it FATALLY from every settle: a sweep that
// threw took the close-out's exit code with it, and code on `dev` then depended on schema that had
// to exist. This writes rows through the record_decision door that already exists -- no new
// function, no new grant, smaller reach, and `git revert` is the whole undo (plus
// `reverse_decision()` for the rows, which `runner_items` supports).
//
// NON-FATAL BY CONSTRUCTION, AT THE CALL SITE. `scripts/settle-ship.js` step 6 wraps this in
// try/catch and prints `ship cards: sweep NOT RUN — <message>` on a throw. Settling the ticket is
// the close-out's job; a housekeeping sweep never takes it down. So every refusal in here is a
// plain throw -- the caller decides what a failure costs.
//
// ONLY `done` AND `removed`. `removal proposed` tickets (20 cards at design) stay undecided on
// purpose -- their removal has not been ruled, so the report may still be read -- and the 9 cards
// with no ticket row at all are filed as a finding, not swept: no rule names what they are.
//
// TWO COLUMNS, NEVER THREE. The PATCH writes `decision` and `decided_at` and nothing else.
// Writing `decision_reason` fires the trigger that appends to `plain_worth`, which would rewrite
// 192 rows of published copy as a side effect of a receipt.
//
// THE DECISION CARRIES NO TICKET ID. One decision covers ~192 cards across ~190 different tickets,
// so naming one of them would be a lie about what was decided; the summary carries COUNTS and
// John's own sentence, and `p_backlog_id` is NULL. Every card gets its own before-image under that
// one decision id, so `reverse_decision(<id>, …)` is the undo for the whole sweep.

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// The two ticket statuses that make a ship card a receipt. ORDER IS THE REPORTED ORDER.
export const STALE = ["done", "removed"];

// PostgREST `in.()` lists and the before-image POST are chunked at this width -- a 192-id `in.()`
// list is a URL long enough to be refused by proxies that never say so clearly.
export const CHUNK = 50;

// The unscoped read's ceiling. Hitting it exactly means the read was TRUNCATED, and a plan built
// over a truncated population would retire a silently arbitrary subset: refused, never trimmed.
export const READ_LIMIT = 1000;

// John, 2026-09-29 -- the ruling this script executes, quoted into the decision verbatim.
export const JOHNS_SENTENCE =
  "its ticket is already done or removed -- retire the report as a receipt";

class RetireError extends Error {}
const fail = message => { throw new RetireError(message); };

// Copied from scripts/settle-ship.js:537 (itself a copy of scripts/ticket-owner.js) rather than
// imported: `settle-ship.js` imports THIS module at step 6, and importing back would be a cycle.
// One fetch path for every read AND every write, so no caller gets its own chance to swallow a 403.
async function defaultRest(base, key, pathAndQuery, init = {}, label = null) {
  const at = label ? `${label}: ` : "";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };
  let res;
  try {
    res = await fetch(`${String(base).replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
  } catch (e) {
    fail(`${at}could not reach the Supabase REST endpoint: ${e.message}`);
  }
  const body = await res.text().catch(() => "");
  if (!res.ok) fail(`${at}Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}`);
  if (body.trim() === "") return null;
  try {
    return JSON.parse(body);
  } catch (e) {
    fail(`${at}Supabase REST returned a body that is not JSON: ${e.message}`);
  }
}

function chunk(list, size = CHUNK) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// THE PURE HALF. The whole staleness rule lives here and not only in the PostgREST query, so a
// caller that widens its read -- or a test that hands in a row by hand -- cannot retire a card the
// rule does not cover. `cards` is the card read; `tickets` is the ticket read (an array of
// `{ backlog_id, status }`, a Map, or a plain object), and a card whose ticket is MISSING from it
// is never stale: an absent ticket row is an unknown, not a `done` one.
export function planRetire({ cards = [], tickets = [] } = {}) {
  const status = new Map();
  if (tickets instanceof Map) {
    for (const [k, v] of tickets) status.set(String(k), v && typeof v === "object" ? v.status : v);
  } else if (Array.isArray(tickets)) {
    for (const t of tickets) {
      if (t && typeof t === "object" && typeof t.backlog_id === "string") status.set(t.backlog_id, t.status);
    }
  } else if (tickets && typeof tickets === "object") {
    for (const [k, v] of Object.entries(tickets)) status.set(String(k), v && typeof v === "object" ? v.status : v);
  }

  const ids = [];
  const by = {};
  for (const s of STALE) by[s] = 0;

  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c || typeof c !== "object") continue;
    if (c.kind !== "ship") continue;
    if (c.decision !== null && c.decision !== undefined) continue;
    if (typeof c.backlog_id !== "string" || c.backlog_id === "") continue;
    if (!status.has(c.backlog_id)) continue;
    const st = status.get(c.backlog_id);
    if (!STALE.includes(st)) continue;
    ids.push(c.id);
    by[st] += 1;
  }
  return { ids, by };
}

// The decision's own words: counts and John's sentence. NEVER a ticket id -- see the header.
export function decisionText(by) {
  const counts = STALE.map(s => `${by[s] ?? 0} on ${s}`).join(", ");
  const total = STALE.reduce((n, s) => n + (by[s] ?? 0), 0);
  return {
    summary: `Stale ship cards retired as receipts: ${total} card(s) -- ${counts}.`,
    reasoning:
      `The close-out sweep in scripts/retire-ship-cards.js read every \`kind = 'ship'\` card at ` +
      `\`decision IS NULL\`, resolved each card's ticket status, and retired the ${total} card(s) ` +
      `whose ticket already reads a finished status (${counts}). John ruled it on 2026-09-29: ` +
      `"${JOHNS_SENTENCE}". No ticket is named on purpose -- one decision covers card(s) across ` +
      `many tickets, so \`p_backlog_id\` is NULL and the undo is this decision's own handle over ` +
      `one before-image per card. \`decision\` and \`decided_at\` are the only columns written; ` +
      `\`decision_reason\` is deliberately left alone because its trigger appends to published ` +
      `copy. Cards on a ticket at \`removal proposed\`, and cards with no ticket row, are NOT ` +
      `swept -- no rule decides them. pattern:9 pattern:90`,
  };
}

// THE SEAM. `rest()` is injectable so the whole write path can be driven without a database.
export async function retireStaleShipCards({ base, key, cycleId, apply = false, rest = defaultRest } = {}) {
  // 1 -- no attribution, no read and no write. The before-images are written against the cycle, so
  // a missing cycle id is refused HERE rather than at the constraint, and it costs zero calls.
  if (typeof cycleId !== "string" || cycleId.trim() === "") {
    return { stale: 0, retired: 0, decision: null, skipped: "no cycle id" };
  }

  // 2 -- every undecided ship card. The filter is in the URL AND in planRetire().
  const read = await rest(
    base, key,
    `runner_items?select=id,backlog_id,kind,decision&kind=eq.ship&decision=is.null&limit=${READ_LIMIT}`,
    {}, "ship card read",
  );
  const cards = Array.isArray(read) ? read : [];
  if (cards.length >= READ_LIMIT) {
    fail(`ship card read: returned ${cards.length} rows at the ${READ_LIMIT} ceiling, so the population is truncated — refusing to plan over a partial read`);
  }

  // 3 -- the ticket status for every id the cards name, chunked.
  const ticketIds = [...new Set(cards.map(c => c && c.backlog_id).filter(b => typeof b === "string" && b !== ""))];
  const tickets = [];
  for (const part of chunk(ticketIds)) {
    const got = await rest(
      base, key,
      `backlog_items?select=backlog_id,status&backlog_id=in.(${part.map(id => `"${id}"`).join(",")})`,
      {}, "ticket status read",
    );
    if (Array.isArray(got)) tickets.push(...got);
  }

  // 4 -- the plan. Nothing to do, or a dry run: return before the first write.
  const { ids, by } = planRetire({ cards, tickets });
  if (ids.length === 0) return { stale: 0, retired: 0, decision: null, skipped: null };
  if (!apply) return { stale: ids.length, retired: 0, decision: null, skipped: "dry run (--apply absent)" };

  // 5 -- ONE decision for the whole sweep, before any row moves.
  const { summary, reasoning } = decisionText(by);
  const decision = await rest(base, key, "rpc/record_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: cycleId,
      p_session_name: null,
      p_kind: "card-retire",
      p_backlog_id: null,
      p_summary: summary,
      p_reasoning: reasoning,
      p_ladder_work_class: null,
    }),
  }, "record_decision (card-retire)");
  if (typeof decision !== "string" || decision.length !== 36) {
    fail(`record_decision (card-retire): returned ${JSON.stringify(decision)}, which is not a decision id`);
  }

  // 6 -- per chunk: read the full row, image it under the decision, then PATCH exactly the rows
  // imaged. The PATCH repeats `kind=eq.ship&decision=is.null` so a card decided between the image
  // and the write is left alone -- and a short read-back is a THROW, never a quiet partial sweep.
  const decidedAt = new Date().toISOString();
  let retired = 0;
  for (const part of chunk(ids)) {
    const list = part.map(id => encodeURIComponent(id)).join(",");
    const full = await rest(base, key,
      `runner_items?select=*&id=in.(${list})&kind=eq.ship&decision=is.null`, {}, "card image read");
    const rows = Array.isArray(full) ? full : [];
    if (rows.length === 0) continue;

    await rest(base, key, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows.map(r => ({
        cycle_id: cycleId,
        session_name: null,
        table_name: "runner_items",
        pk_value: r.id,
        row_data: r,
        decision_id: decision,
      }))),
    }, `card image (decision ${decision})`);

    const imaged = rows.map(r => r.id);
    const back = await rest(base, key,
      `runner_items?id=in.(${imaged.map(id => encodeURIComponent(id)).join(",")})&kind=eq.ship&decision=is.null`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ decision: "retired", decided_at: decidedAt }),
      }, `card patch (decision ${decision})`);
    const wrote = Array.isArray(back) ? back.length : 0;
    if (wrote !== imaged.length) {
      fail(`card patch (decision ${decision}): imaged ${imaged.length} card(s) and the PATCH returned ${wrote} — every imaged card must be the card written`);
    }
    retired += wrote;
  }

  return { stale: ids.length, retired, decision, skipped: null };
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (hit === undefined) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
}

async function main() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) fail("SUPABASE_URL and SUPABASE_SERVICE_KEY must both be set");
  const cycleId = arg(process.argv.slice(2), "cycle-id");
  if (typeof cycleId !== "string" || cycleId.trim() === "") fail("--cycle-id=<uuid> is required");
  const apply = arg(process.argv.slice(2), "apply") === true;

  const out = await retireStaleShipCards({ base, key, cycleId, apply });
  if (out.skipped) process.stdout.write(`ship cards: ${out.skipped}\n`);
  process.stdout.write(`ship cards: stale ${out.stale}, retired ${out.retired}, decision ${out.decision ?? "none"}\n`);
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(e => {
    process.stderr.write(`retire-ship-cards: ${e instanceof RetireError ? e.message : (e.stack || e.message)}\n`);
    process.exit(2);
  });
}
