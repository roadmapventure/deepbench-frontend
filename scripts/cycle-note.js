#!/usr/bin/env node
// DeepBench v7.0.929 | scripts/cycle-note.js | AGT-547 -- A CYCLE WRITES ITS OWN RECORD OVER
// PostgREST, because the connector write is the path that loses it silently.
//
// MEASURED, NOT ARGUED (`AGT-547`, cycle `68372c07`): two appends of roughly 1.5-2.5 KB to
// `public.runner_cycles.notes` through the Supabase MCP connector timed out at that connector's
// 60s ceiling and left `notes_len` unchanged at 303 -- the write reported failure and wrote
// nothing, so step 9's close-out record was lost and had to be chopped into short appends. The
// same column had already been taken to 39,043 characters over PostgREST through the same
// `trg_runner_cycles_notes_citations` trigger, which is what rules trigger cost out as the whole
// story (`AGT-425` holds that limb and is `removal proposed`, not a reusable row).
//
// THE TIMING DISCRIMINATOR THIS SCRIPT SHIPPED WITH, run before the path was repointed so the fix
// could not land on an unmeasured suspect (pattern:22). The same ~2 KB append over PostgREST on a
// live cycle row: 74 ms at `notes` 419 chars, 51 ms at 10,331, 58 ms at 40,331. FLAT -- the
// guard's cost does not grow with the column, so column length is not the differentiator either.
// The connector landed the same ~2 KB append in under 1 ms server-side at 750 chars, so the 60s
// loss did NOT reproduce on demand and the CAUSE REMAINS UNESTABLISHED. That is why this script is
// a path change and not a fix to the guard: nothing here touches `runner_record_citation_guard()`.
//
// WHAT THIS IS NOT: a bypass. The append goes through the same BEFORE UPDATE trigger, so a note
// the citation guard refuses is still refused -- it comes back HTTP 400 and this script exits 1
// with the guard's own message, never a silent success. Both directions are asserted in
// tests/regression/agt-547-cycle-note.test.mjs.
//
// EXIT CODES ARE `scripts/cycle-heartbeat.js`'s CONTRACT, EXACTLY -- one shape for every write a
// cycle makes to its own row, and 0 is the one that must never be cheap:
//   2 -- cannot run: `--cycle` missing/not a uuid, `--note` missing/blank. Nothing attempted.
//   1 -- ran and did not land: env unset, non-2xx (the guard's refusal arrives here), or 200 over
//        ZERO rows (a `--cycle` naming no row answers `[]` with HTTP 200 -- the silent no-op
//        `return=representation` exists to expose).
//   0 -- landed; prints the row the server echoed back, never the values we sent.

import path from "path";
import { fileURLToPath } from "url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pure -- the guard drives this directly, both directions, with no network.
export function parseArgs(argv) {
  const get = name => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit === undefined ? undefined : hit.slice(name.length + 3);
  };
  const cycle = get("cycle");
  const note = get("note");
  if (!cycle) return { error: "--cycle=<uuid> is required -- a note with no cycle names nothing" };
  if (!UUID.test(cycle)) return { error: `--cycle=${cycle} is not a uuid` };
  if (note === undefined || !note.trim()) {
    return { error: "--note=<text> is required and must not be blank -- an empty append would " +
      "rewrite the column for no reason and still pay the guard's whole-column grade" };
  }
  return { cycle, note: note.trim() };
}

// Pure -- `scripts/settle-ship.js`:533-535's never-twice shape (verified live this build: :535 is the expression), lifted to one home so the two
// callers cannot drift. A second identical run is a no-op, not a second clause: the close-out is
// re-runnable by construction (`AGT-243` is the defect that shape prevents).
export function appendNote(prior, note) {
  const before = typeof prior === "string" ? prior : "";
  if (before.includes(note)) return before;
  return before.trim() === "" ? note : `${before} | ${note}`;
}

// Pure -- 0 rows back is a FAILURE, not an empty success. Asserted on its own in the guard.
export function landed(rows) {
  return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
}

export async function cycleNote(argv, env = process.env, doFetch = fetch) {
  const args = parseArgs(argv);
  if (args.error) return { code: 2, message: `cycle-note: ${args.error}` };

  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  const missing = [!base && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
  if (missing) return { code: 1, message: `cycle-note: ${missing} unset -- the note did NOT land` };

  const root = base.replace(/\/+$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const url = `${root}/rest/v1/runner_cycles?id=eq.${args.cycle}`;

  // READ, then modify, then write -- the shape cycle-heartbeat.js uses for its own columns.
  let prior;
  try {
    const res = await doFetch(`${root}/rest/v1/runner_cycles?select=id,notes&id=eq.${args.cycle}`, { headers });
    const text = await res.text().catch(() => "");
    if (!res.ok) return { code: 1, message: `cycle-note: read HTTP ${res.status} ${res.statusText} -- ${text}` };
    let rows = null;
    try { rows = JSON.parse(text); } catch { /* landed() reports it */ }
    const row = landed(rows);
    if (!row) return { code: 1, message: `cycle-note: ${args.cycle} matched no row -- nothing was written` };
    prior = typeof row.notes === "string" ? row.notes : "";
  } catch (e) {
    return { code: 1, message: `cycle-note: could not reach Supabase -- ${e.message}` };
  }

  const next = appendNote(prior, args.note);
  if (next === prior) {
    return { code: 0, message: `cycle-note ${args.cycle} notes ${prior.length} chars -- the note is ` +
      `ALREADY present, nothing appended (never twice)` };
  }

  let res;
  try {
    res = await doFetch(url, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ notes: next }),
    });
  } catch (e) {
    return { code: 1, message: `cycle-note: could not reach Supabase -- ${e.message}` };
  }
  const text = await res.text().catch(() => "");
  // The citation guard's refusal arrives here as a 400 and is reported verbatim -- a note the
  // guard rejects must never read as a success.
  if (!res.ok) return { code: 1, message: `cycle-note: HTTP ${res.status} ${res.statusText} -- ${text}` };

  let rows = null;
  try { rows = JSON.parse(text); } catch { /* landed() reports it */ }
  const row = landed(rows);
  if (!row) return { code: 1, message: `cycle-note: PATCH matched no row for ${args.cycle} -- nothing was written` };
  const echoed = typeof row.notes === "string" ? row.notes : "";
  return { code: 0, message: `cycle-note ${row.id} notes ${echoed.length} chars (grew ${echoed.length - prior.length})` };
}

// SES-176: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const { code, message } = await cycleNote(process.argv.slice(2));
  (code === 0 ? process.stdout : process.stderr).write(`${message}\n`);
  process.exit(code);
}
