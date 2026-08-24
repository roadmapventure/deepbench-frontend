#!/usr/bin/env node
// DeepBench v7.0.214 | scripts/apply-title-regeneration.js | SES-187
// FEATURE: SES-187 -- writes real one-line titles into public.backlog_items.title for the rows
// whose stored title is a retired declaration marker (`Post-beta`, `Beta-gate (bucket N)`) or a
// provenance sentence ("New, found 2026-07-27 (`process-0727`...)"), both of which the
// markdown->DB import wrote into `title` in place of the ticket's actual subject.
//
// WHY THIS IS A SCRIPT AND NOT A ONE-OFF UPDATE. The candidate titles themselves are derived by
// judgment (a subagent reading each row's own description) -- there is no regex that produces
// them, and SES-187's own "one mechanical pass" framing was measured false before this shipped:
// a purely mechanical extract (strip the leading bold marker, take the first sentence) was run
// against all 155 affected rows and produced a caveat as the title on DAT-15 ("latent, not live:
// nothing reads the_reasoning..."), the literal marker again on LOG-126 ("Post-beta"), a
// provenance clause on LAV-17 ("Shrunk 2026-08-07 (S-LAV-28, v7.0.61)..."), and mid-clause cuts
// on CHI-70 and CHI-47. Roughly half the board would have gained a plausible-but-wrong name --
// strictly worse than the visibly-broken state, because a wrong title hides the defect that
// runner-cycle.md's `backlog_display_title()` rule exists to keep visible.
//
// So the judgment stays judgment, and this file is the part that must NOT be judgment: a
// deterministic gate that every proposed title has to pass before it can reach the board, plus
// the §19v before-image discipline on the write. The gate is what makes an LLM-derived bulk
// content write reviewable -- it is re-runnable, it prints exactly what it rejected and why, and
// `--check` answers "what would this do" without touching anything.
//
// Usage:
//   node scripts/apply-title-regeneration.js --titles=<path.json> [--check]
//   node scripts/apply-title-regeneration.js --titles=<path.json> --apply --cycle-id=<uuid>
//
//   --titles=<path>   JSON array of {id, backlog_id, queue, new_title}. `id` is the row's uuid
//                     primary key and is the write key: backlog_id carries NO unique constraint
//                     on this board (CHI-48 occupies two rows, SES-97), so writing by backlog_id
//                     would silently update both.
//   --check           Default. Validate and report; write nothing.
//   --apply           Perform the writes. Requires --cycle-id.
//   --cycle-id=<uuid> The runner cycle to attribute every runner_before_images row to.
//   --json            Single-line machine-readable summary instead of prose.
//
// Exit codes:
//   0  --check passed with at least one accepted title, or --apply wrote every accepted row
//   1  every proposed title was rejected, or --apply failed on at least one row
//   2  cannot run -- missing env, missing/unparseable --titles file, or a Supabase REST failure.
//      Deliberately distinct from 1, same convention as export-backlog-snapshot.js: an
//      unrunnable pass must never read as a clean one.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required: backlog_items holds no public write grant
//                          (DAT-18), so the anon key cannot perform this update at all.

import fs from "fs";
import { pathToFileURL } from "url";

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const TITLES = arg("titles", null);
const CYCLE_ID = arg("cycle-id", null);
const APPLY = process.argv.includes("--apply");
const JSON_OUT = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// The gate. Every rule here corresponds to a failure actually observed on this
// board -- none is hypothetical, and none may be softened to raise the accept
// rate. A rejected row keeps its broken title, which is the safe direction: the
// read-time fallback in backlog_display_title() still renders it, and SES-117's
// TITLE CHECK still counts it as outstanding.
// ---------------------------------------------------------------------------

const MIN_LEN = 30;
const MAX_LEN = 110;

// Openers that ARE the defect. A title starting with any of these is the import
// bug reproduced rather than fixed.
const BANNED_OPENERS =
  /^\s*[`"']?\s*(new\b|found\b|filed\b|post-?beta\b|beta-?gate\b|shrunk\b|latent\b|original claim\b|p\d+\s*-\s)/i;

// A title must not end mid-clause. There is no parser for "is this a sentence",
// but a trailing comma or dangling function word is a reliable, cheap tell --
// it is exactly how the mechanical extract failed on CHI-47 ("...overwritten on
// every new") and LOO-21 ("...the same material twice,").
const DANGLING_TAIL =
  /(,|\b(and|or|but|the|a|an|of|in|on|to|for|with|that|which|is|are|was|were|its|it|at|by|from|as|into|per|via|when|while|so|not|no|new|same|every|each)\s*)$/i;

export function validate(row, oldTitle) {
  const t = row.new_title;
  if (t === null || t === undefined) return { ok: false, why: "no title proposed (honest null)" };
  if (typeof t !== "string") return { ok: false, why: "not a string" };
  const s = t.trim();
  if (s !== t) return { ok: false, why: "leading/trailing whitespace" };
  if (s.length < MIN_LEN) return { ok: false, why: `too short (${s.length} < ${MIN_LEN})` };
  if (s.length > MAX_LEN) return { ok: false, why: `too long (${s.length} > ${MAX_LEN})` };
  if (/\n/.test(s)) return { ok: false, why: "not one line" };
  if (/\*\*|`/.test(s)) return { ok: false, why: "carries markdown (** or backtick)" };
  if (/\.$/.test(s)) return { ok: false, why: "trailing period" };
  if (BANNED_OPENERS.test(s)) return { ok: false, why: "opens with a marker/provenance word" };
  if (/\b20\d\d-\d\d-\d\d\b/.test(s)) return { ok: false, why: "carries a date" };
  if (/\bv\d+\.\d+\.\d+\b/.test(s)) return { ok: false, why: "carries a version number" };
  if (/\b(design|process|beta|reexamine|triage)-[a-z0-9-]*\d{4}[a-z]?\b/i.test(s))
    return { ok: false, why: "carries a session slug" };
  if (DANGLING_TAIL.test(s)) return { ok: false, why: "ends mid-clause" };
  if (oldTitle && s.toLowerCase() === oldTitle.trim().toLowerCase())
    return { ok: false, why: "identical to the broken title" };
  return { ok: true, title: s };
}

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

function fail(msg) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: false, exit: 2, error: msg }));
  else console.error(`cannot run: ${msg}`);
  process.exit(2);
}

const URL_BASE = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_KEY || "";

async function rest(pathAndQuery, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathAndQuery} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!TITLES) fail("--titles=<path.json> is required");
  if (!URL_BASE || !KEY) fail("SUPABASE_URL and SUPABASE_SERVICE_KEY must both be set");
  if (APPLY && !CYCLE_ID) fail("--apply requires --cycle-id=<uuid> (every write needs a before-image owner)");

  let proposed;
  try {
    proposed = JSON.parse(fs.readFileSync(TITLES, "utf8"));
  } catch (e) {
    fail(`could not read/parse ${TITLES}: ${e.message}`);
  }
  if (!Array.isArray(proposed)) fail("--titles file must contain a JSON array");

  // Fetch the live rows by id, so the before-image is the ACTUAL current row and
  // never the subagent's copy of it.
  const ids = [...new Set(proposed.map(r => r.id).filter(Boolean))];
  if (ids.length === 0) fail("no row ids in the titles file");
  const live = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const rows = await rest(`backlog_items?select=*&id=in.(${chunk.join(",")})`);
    for (const r of rows) live.set(r.id, r);
  }

  const accepted = [];
  const rejected = [];
  for (const p of proposed) {
    const row = live.get(p.id);
    if (!row) {
      rejected.push({ backlog_id: p.backlog_id, why: "row id not on the live board" });
      continue;
    }
    const v = validate(p, row.title);
    if (v.ok) accepted.push({ id: row.id, backlog_id: row.backlog_id, old: row.title, title: v.title, row });
    else rejected.push({ backlog_id: p.backlog_id, why: v.why });
  }

  if (!APPLY) {
    if (JSON_OUT) {
      console.log(JSON.stringify({ ok: accepted.length > 0, mode: "check", proposed: proposed.length, accepted: accepted.length, rejected: rejected.length }));
    } else {
      console.log(`check: ${proposed.length} proposed, ${accepted.length} accepted, ${rejected.length} rejected`);
      for (const a of accepted.slice(0, 10)) console.log(`  + ${a.backlog_id}: ${a.title}`);
      for (const r of rejected) console.log(`  - ${r.backlog_id}: ${r.why}`);
    }
    process.exit(accepted.length > 0 ? 0 : 1);
  }

  let wrote = 0;
  const failures = [];
  for (const a of accepted) {
    try {
      // §19v: before-image FIRST, and its success is what authorises the write.
      await rest("runner_before_images", {
        method: "POST",
        body: JSON.stringify({ cycle_id: CYCLE_ID, table_name: "backlog_items", pk_value: a.id, row_data: a.row }),
      });
      await rest(`backlog_items?id=eq.${a.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ title: a.title, updated_at: new Date().toISOString() }),
      });
      wrote++;
    } catch (e) {
      failures.push({ backlog_id: a.backlog_id, error: e.message });
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: failures.length === 0, mode: "apply", accepted: accepted.length, wrote, rejected: rejected.length, failures: failures.length }));
  } else {
    console.log(`apply: ${wrote}/${accepted.length} written, ${rejected.length} rejected, ${failures.length} failed`);
    for (const f of failures) console.log(`  ! ${f.backlog_id}: ${f.error}`);
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

// Only the CLI path runs the network/write side. Importing this module for
// validate() must never hit Supabase or exit the process -- same pathToFileURL
// guard as scripts/export-backlog-snapshot.js, and it is what lets
// tests/regression/SES-187-title-gate.js assert the gate with no credentials.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch(e => fail(e.message));
}
