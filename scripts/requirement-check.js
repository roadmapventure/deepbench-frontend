#!/usr/bin/env node
// DeepBench v7.0.736 | scripts/requirement-check.js | AGT-280 slice 2 -- Victoria screens whether a
// proposed ticket's cited need source actually SUPPORTS it, as a client of
// public.apply_requirement_verdict().
//
// WHY THIS EXISTS. Slice 1 (`v7.0.729`) shipped the gate: `backlog_items.need_source`,
// `backlog_items.need_score`, `runner_settings.need_source_kinds`, `need_source_is_traceable()`,
// the `requirement_gate` trigger and the one writer, `apply_requirement_verdict()`. Measured live
// 2026-09-29 on the unchanged tree, what it owed was absent: `capabilities` held ZERO
// `requirement-check` rows, `victoria` held ONE assignment (`solution-catalog`), and nothing under
// `scripts/ api/ lib/ src/` called the writer. A writer with no caller is a capability that cannot
// be exercised -- `need_score` was set on 0 of 1165 tickets. This file is the caller.
//
// THE DIVISION OF LABOUR, and it is the whole architecture of AGT-280:
//   * WHETHER THE CITED ROW EXISTS is a LOOKUP. `need_source_is_traceable()` decides it in SQL, the
//     trigger enforces it, and no model is ever asked (pattern:10). This file never re-decides it.
//   * WHETHER THE ROW SUPPORTS THE PROPOSAL is a JUDGMENT, and it is hers -- ONE model call,
//     assembled by `assemblePrompt()` and logged on the executor's path (§19b/§19k).
//   * THE REORDER of the Development Manager's list by the score she writes is DETERMINISTIC -- it
//     is an ORDER BY key inside `prime_directive_queue()` and `drain_epic_next()`, not a capability
//     (pattern:9). Nothing here sorts anything.
//   * THE WRITE is `apply_requirement_verdict()`'s. It records the decision, images the ticket
//     BEFORE the UPDATE and refuses an untraceable source itself. THIS FILE WRITES NO TABLE.
//
// TWO DOORS, ONE VALIDATOR:
//   --backlog=<ID> --cycle=<uuid>
//       reads the ticket, `runner_settings.need_source_kinds`, and the candidate rows of every
//       table that allowlist names, assembles her prompt through the SAME assemblePrompt() the
//       executor calls, and renders it with agent-prompt.js's renderAssembly(). THIS FILE BUILDS NO
//       PROMPT TEXT (§19b, one assembly path). `--intent` is never a flag here: the intent comes off
//       `capabilities.default_intent_slug`, which is the row's own answer. WRITES NOTHING. Exit 3 --
//       awaiting her answer.
//   --backlog=<ID> --cycle=<uuid> --answer=<path>
//       validates her answer against the intent's OWN stored `traits.schema` -- read live from
//       `skill_profiles`, never a copy of it kept here, because a copy drifts from the contract the
//       model was actually handed (pattern:93) -- then POSTs `rpc/apply_requirement_verdict` with
//       `p_cycle` set and `p_session` null. Exit 0.
//
// THE BACKLOG-ID REFUSAL IS NOT A FORMALITY. `apply_requirement_verdict()` takes the ticket id out
// of the ANSWER, not out of the call, so a model that named a different ticket than the one it was
// shown would write a score onto a ticket nobody screened -- and the write is a real ticket UPDATE
// under a reversible decision. The answer's `backlog_id` is therefore compared to the `--backlog`
// this run was given, and a mismatch exits 1 with NOTHING sent.
//
// EXIT CODES: 0 ok; 1 refused / request failed; 2 could not run (missing credentials or arguments --
// never a pass); 3 the prompt is printed and the answer is awaited.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";

// --- pure half (imported by tests/regression/agt-280-requirement-check.test.mjs; no network) -----

export const AGENT = "victoria";
export const CAPABILITY = "requirement-check";
export const TENANT = "global";

// The two words `apply_requirement_verdict()` accepts, in its own order. A third word is refused by
// the function; refusing it here too means the refusal costs no round trip.
export const VERDICTS = Object.freeze(["pass", "not-needed"]);

export const AWAITING_ANSWER =
  "prompt assembled and printed; exit 3 = awaiting her answer, then re-run with --answer=<path>";

// How many candidate rows are read from each allowlisted table. Bounded on purpose: five tables
// unbounded is the whole board in one prompt, and the screening question is about the cited row and
// its near neighbours, not about a census.
export const CANDIDATE_LIMIT = 12;
// Every value in a candidate row is clipped to this, so one long body cannot crowd out four tables.
export const CANDIDATE_FIELD_CHARS = 300;

const blank = v => String(v ?? "").trim() === "";

// `who:table:id`, exactly three non-blank parts -- the same shape need_source_is_traceable() parses.
// Returned as parts so the caller can name the table; null when the shape is wrong.
export function parseNeedSource(src) {
  const parts = String(src ?? "").trim().split(":");
  if (parts.length !== 3) return null;
  const [who, table, id] = parts.map(p => p.trim());
  if (!who || !table || !id) return null;
  return { who, table, id };
}

// The distinct tables the allowlist names, in the allowlist's own order, de-duplicated. DATA, NEVER
// A CONSTANT HERE (pattern:2): `runner_settings.need_source_kinds` is John's to change with an
// UPDATE, so this file must read whatever is in it and must hold no list of its own.
export function tablesFromKinds(kinds) {
  const out = [];
  for (const k of Array.isArray(kinds) ? kinds : []) {
    const parts = String(k ?? "").trim().split(":");
    if (parts.length !== 2) continue;
    const table = parts[1].trim();
    if (table && !out.includes(table)) out.push(table);
  }
  return out;
}

// Clip every scalar in a candidate row. Pure; the row is copied, never written to.
export function clipRow(row, limit = CANDIDATE_FIELD_CHARS) {
  if (Object(row) !== row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string" && v.length > limit) out[k] = `${v.slice(0, limit)}…`;
    else if (v !== null && typeof v === "object") {
      const s = JSON.stringify(v);
      out[k] = s.length > limit ? `${s.slice(0, limit)}…` : v;
    } else out[k] = v;
  }
  return out;
}

// Her task_context. The ticket, the allowlist verbatim, and the candidate rows keyed by table.
export function buildTaskContext({ ticket, kinds, candidates }) {
  if (!ticket || blank(ticket.backlog_id)) return null;
  return {
    ticket: {
      backlog_id: ticket.backlog_id,
      title: ticket.title ?? null,
      description: ticket.description ?? null,
      status: ticket.status ?? null,
      tier: ticket.tier ?? null,
      priority_class: ticket.priority_class ?? null,
      scope_origin: ticket.scope_origin ?? null,
      scope_rationale: ticket.scope_rationale ?? null,
      epic_id: ticket.epic_id ?? null,
      need_source: ticket.need_source ?? null,
      need_score: ticket.need_score ?? null,
    },
    // Verbatim, so she cites a pair that exists rather than one she invents.
    need_source_kinds: Array.isArray(kinds) ? [...kinds] : [],
    candidates: Object(candidates) === candidates ? candidates : {},
  };
}

// --- the validator ------------------------------------------------------------------------------
//
// Driven by the intent's OWN stored `traits.schema`, handed in by the caller after reading
// `skill_profiles` -- there is no second copy of the contract in this file. It covers exactly the
// JSON-schema vocabulary that schema uses (required / type / enum / minimum / maximum / maxLength),
// and a key the schema does not describe is simply not graded here: the function is the last word
// on every rule it owns, and re-implementing its rules would be the two-homes drift this whole
// ticket is about. EVERY refusal is collected rather than stopping at the first.
export function validateAnswer(answer, schema, expectedBacklogId) {
  const refusals = [];
  if (Object(answer) !== answer || Array.isArray(answer)) {
    return { ok: false, refusals: ["the answer must be one JSON object"] };
  }
  if (Object(schema) !== schema) {
    return { ok: false, refusals: ["the intent carries no traits.schema to validate against -- refusing rather than passing an ungraded answer"] };
  }

  const props = Object(schema.properties) === schema.properties ? schema.properties : {};
  for (const key of Array.isArray(schema.required) ? schema.required : []) {
    if (answer[key] === undefined || answer[key] === null || blank(answer[key])) {
      refusals.push(`the answer is missing required key \`${key}\``);
    }
  }

  for (const [key, spec] of Object.entries(props)) {
    const v = answer[key];
    if (v === undefined) continue;
    const types = Array.isArray(spec.type) ? spec.type : spec.type ? [spec.type] : [];
    if (types.length) {
      const actual = v === null ? "null" : Array.isArray(v) ? "array"
        : Number.isInteger(v) ? "integer" : typeof v === "number" ? "number" : typeof v;
      const ok = types.includes(actual) || (actual === "integer" && types.includes("number"));
      if (!ok) refusals.push(`\`${key}\` must be ${types.join(" or ")}; got ${actual}`);
    }
    if (Array.isArray(spec.enum) && !spec.enum.includes(v)) {
      refusals.push(`\`${key}\` must be one of ${spec.enum.join(", ")}; got ${v === null ? "<NULL>" : String(v)}`);
    }
    if (typeof spec.minimum === "number" && typeof v === "number" && v < spec.minimum) {
      refusals.push(`\`${key}\` must be >= ${spec.minimum}; got ${v}`);
    }
    if (typeof spec.maximum === "number" && typeof v === "number" && v > spec.maximum) {
      refusals.push(`\`${key}\` must be <= ${spec.maximum}; got ${v}`);
    }
    if (typeof spec.maxLength === "number" && typeof v === "string" && v.length > spec.maxLength) {
      refusals.push(`\`${key}\` must be at most ${spec.maxLength} characters; got ${v.length}`);
    }
  }

  // THE TICKET SHE WAS SHOWN IS THE ONLY TICKET SHE MAY NAME. See the header: the function takes
  // the id out of the answer, so this is the only place the two can be compared.
  if (!blank(expectedBacklogId) && !blank(answer.backlog_id)
      && String(answer.backlog_id).trim() !== String(expectedBacklogId).trim()) {
    refusals.push(
      `the answer names ${answer.backlog_id} but this run screened ${expectedBacklogId} -- ` +
      "a verdict may only be written onto the ticket it was assembled for");
  }

  return { ok: refusals.length === 0, refusals };
}

// --- CLI -----------------------------------------------------------------------------------------

function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(s);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

class Exit extends Error {}
let fetched = false;
function die(code, msg) {
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : `${msg}\n`);
  if (!fetched) process.exit(code);
  process.exitCode = code;
  throw new Exit(String(code));
}

function readJson(p, what) {
  if (typeof p !== "string" || !p) die(2, `requirement-check: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `requirement-check: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "requirement-check: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  }
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const backlog = typeof args.backlog === "string" ? args.backlog.trim() : "";
  const cycle = typeof args.cycle === "string" ? args.cycle.trim() : "";
  if (!backlog || !cycle) {
    die(2, "usage: requirement-check.js --backlog=<ID> --cycle=<uuid> [--answer=<path>] [--out=<path>] [--json]");
  }

  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `requirement-check: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };

  // The capability's own answer about which intent fires, and the intent row the answer must be
  // graded against. Read on BOTH passes -- pass two grades against the live contract, not a
  // contract remembered from pass one.
  const caps = await get(`capabilities?slug=eq.${CAPABILITY}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) die(1, `requirement-check: capability "${CAPABILITY}" has no capabilities row or no default_intent_slug`);

  // ---- PASS TWO: her answer is in hand. Validate, then hand the write to the function. ----------
  if (typeof args.answer === "string" && args.answer) {
    const answer = readJson(args.answer, "answer");
    const rows = await get(`skill_profiles?slug=eq.${intentSlug}&select=traits&limit=1`);
    const schema = rows[0]?.traits?.schema ?? null;
    const v = validateAnswer(answer, schema, backlog);
    if (!v.ok) die(1, v.refusals.map(r => `refused: ${r}`).join("\n")); // nothing is sent

    const r = await rest(base, key, "POST", "rpc/apply_requirement_verdict", {
      p_cycle: cycle,
      p_session: null,
      p: answer,
    });
    if (!r.ok) die(1, `requirement-check --answer: HTTP ${r.status} ${r.text}`);

    const handle = typeof r.json === "string" ? r.json : JSON.stringify(r.json);
    if (answer.verdict === "pass") {
      console.log(`${backlog}: pass, need_score ${answer.need_score}, source ${answer.need_source}`);
      console.log(`Decision ${handle} — the ticket was imaged BEFORE the update, so this is reversible:`);
      console.log(`  select * from public.reverse_decision('${handle}', 'John', '<why>');`);
    } else {
      console.log(`${backlog}: not-needed — NO ticket row was written. Her ruling is listed on the findings board.`);
      console.log(`  audit_findings id ${handle}`);
    }
    process.exitCode = 0;
    return;
  }

  // ---- PASS ONE: assemble and print. WRITES NOTHING. --------------------------------------------
  const tickets = await get(
    `backlog_items?backlog_id=eq.${encodeURIComponent(backlog)}` +
    "&select=backlog_id,title,description,status,tier,priority_class,scope_origin,scope_rationale,epic_id,need_source,need_score&limit=1");
  if (!Array.isArray(tickets) || tickets.length === 0) {
    die(1, `requirement-check: no backlog_items row reads backlog_id ${backlog}`);
  }

  const settings = await get("runner_settings?id=eq.1&select=need_source_kinds&limit=1");
  const kinds = settings[0]?.need_source_kinds ?? null;
  if (!Array.isArray(kinds) || kinds.length === 0) {
    // need_source_is_traceable() fails CLOSED on a NULL or empty allowlist, so every verdict she
    // could reach would be refused by the writer anyway. Say so instead of paying for the call.
    die(1, "requirement-check: runner_settings.need_source_kinds is empty -- every need source would " +
           "be untraceable and every pass verdict refused. Nothing to screen against (exit 1, no model call).");
  }

  const candidates = {};
  for (const table of tablesFromKinds(kinds)) {
    const r = await rest(base, key, "GET", `${encodeURIComponent(table)}?select=*&limit=${CANDIDATE_LIMIT}`);
    // A table the allowlist names but PostgREST cannot serve is reported in the prompt rather than
    // killing the run: the allowlist is John's data and may name a table before it exists, which is
    // exactly the fail-closed direction need_source_is_traceable() already takes.
    candidates[table] = r.ok && Array.isArray(r.json)
      ? r.json.map(row => clipRow(row))
      : { unreadable: `HTTP ${r.status}` };
  }

  const task_context = buildTaskContext({ ticket: tickets[0], kinds, candidates });
  if (task_context === null) die(1, `requirement-check: ${backlog} has no usable ticket row`);

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
      intent_slug: intentSlug,
    });
  } catch (e) { die(1, `requirement-check: ${e.message}`); }
  if (!assembly.agent_card) die(1, `requirement-check: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`requirement-check: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `requirement-check: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      backlog_id: backlog, model: assembly.llm?.model,
      prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context,
    }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`requirement-check: sections omitted (no stored content): ${omitted.join(", ")}`);
  die(3, `requirement-check --backlog=${backlog}: ${AWAITING_ANSWER}`);
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`requirement-check: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
