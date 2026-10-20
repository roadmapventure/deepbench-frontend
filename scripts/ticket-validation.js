#!/usr/bin/env node
// DeepBench v7.0.870 | scripts/ticket-validation.js | AGT-493 -- THE VALIDATION DOOR. A ticket filed
// more than 14 days ago is handed to the Governance Architect's `validate-ticket` capability before
// Victoria's list door is allowed to offer it, and this file is the only way that turn is prepared,
// checked and written. `--prepare --list=<slug>` reads the list, keeps ONLY what
// `public.needs_validation()` names (the sensor owns the rule -- this file holds no age of its own
// beyond echoing `standing_days` into the context), marks what `public.grade_standing()` already
// grades, takes the ten highest-scoring of the oldest, and assembles the capability's own prompt --
// no `intent_slug`, because `capabilities.default_intent_slug` answers that (section 19b).
// `--dry-run` holds X1-X6 offline, where a refusal costs no write and names its ticket (pattern:10).
// `--apply` sends one `rpc/apply_ticket_validation` per row: `confirmed` stamps `revalidated_at` and
// leaves the grade standing, `revised` rewrites the description (which is what reopens the grade,
// through `grade_standing()`'s own d.13 test -- nothing here writes a grade), `not-real` sends the
// ticket to `removal proposed`. Each row is its own reversible decision and the reverse line is
// printed with it; NO `runner_cycles` row is written -- the `ticket-validation` decisions ARE the
// record of the turn (pattern:93).
//
// Live before this: 500 open/partial non-john-named tickets filed more than 14 days ago, 94 of them
// holding `need_score >= 3`, every one placeable by a `move` because `placement_target()` had no age
// test (measured 2026-10-20). Requirements d.8, d.30; rule JOHN-1013-STALE-VALIDATION.
//
// EXIT CODES, the same four `scripts/requirement-check.js` uses: 0 ok (and 0 when the list has
// nothing to validate -- that is a clean answer, not a failure); 1 refused / request failed; 2 could
// not run (missing credentials or arguments -- never a pass); 3 the prompt is printed and the
// architect's answer is awaited.
//
// USAGE (credentials by NAME from public.runner_secrets, exported inline, never printed):
//   node scripts/ticket-validation.js --prepare --list=<slug> [--limit=N] [--out=<path>] [--json]
//   node scripts/ticket-validation.js --dry-run=<answer.json> --context=<prepare.json>
//   node scripts/ticket-validation.js --apply=<answer.json> --context=<prepare.json> \
//        (--cycle-id=<uuid> | --session-name=<name>)

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { assemblePrompt } from "../api/prompt/db-assembly.js";
import { renderAssembly, resolveJudgmentModel } from "./agent-prompt.js";

// --- pure half (imported by tests/regression/agt-493-ticket-validation.test.mjs; no network) ------

export const AGENT = "architect";
export const CAPABILITY = "validate-ticket";
export const TENANT = "global";

// The verdict vocabulary public.apply_ticket_validation() enforces, in the function's own order.
export const VERDICTS = Object.freeze(["confirmed", "revised", "not-real"]);

// Ten per turn: requirements d.1's floor is the one bound on how many a list needs tonight, and 90
// graded old tickets in one prompt would be one unreadable turn. The daily check re-runs this door
// every day, so the tail drains instead of being read all at once.
export const DEFAULT_LIMIT = 10;

// `ga-validate-intent`'s own schema bound on a reason, held here so a dry-run refuses a too-long
// reason before the model's answer is sent anywhere.
export const REASON_CHARS = 400;

// Echoed into the context as `standing_days` so the turn knows why it was handed these tickets. The
// RULE lives in `validation_standing()` / `needs_validation()`, never here: this is a label on a
// window the database owns (pattern:93).
export const STANDING_DAYS = 14;

const blank = v => String(v ?? "").trim() === "";

// The prepare context, whether it came from `--json` (wrapped) or from a hand-written task_context.
export function contextBody(ctx) {
  if (Object(ctx) !== ctx) return {};
  if (Object(ctx.context) === ctx.context && ctx.context !== null) return ctx.context;
  return ctx;
}

// THE WHOLE DESCRIPTION TRAVELS, uncut. A `revised` answer rewrites it, and a rewrite composed from
// a 1500-character head would silently drop John's own sentences off the end of the ticket
// (pattern:90) -- which is the one thing d.30's `revised` branch may not do.
export function buildValidationContext({ list, tickets }) {
  return {
    list: blank(list) ? null : String(list),
    standing_days: STANDING_DAYS,
    tickets: (Array.isArray(tickets) ? tickets : []).map(t => ({
      backlog_id: t?.backlog_id ?? null,
      title: t?.title ?? null,
      description: t?.description ?? null,
      filed_at: t?.filed_at ?? null,
      status: t?.status ?? null,
      type: t?.type ?? null,
      priority_class: t?.priority_class ?? null,
      need_source: t?.need_source ?? null,
      need_score: t?.need_score ?? null,
      // Whether a grade already stands on it (`grade_standing()`), read once per list. It is the
      // fact that tells the turn what a `revised` answer costs: a changed text reopens that grade.
      graded: t?.graded === true,
    })),
  };
}

// X1-X6, the rules neither the function nor the model can see from one row alone: the whole list
// ruled exactly once, no row ruling a ticket it was not handed, and a `description` carried by the
// one verdict that may carry it. Every refusal NAMES ITS TICKET where there is one to name, and the
// list otherwise. Collected whole rather than stopped at the first -- a dry-run exists to show the
// architect every refusal in one pass, not to make it guess the next one.
export function validateValidation(answer, ctx) {
  const refusals = [];
  const body = contextBody(ctx);
  const list = blank(body.list) ? null : String(body.list);
  const label = list ?? "<the list>";
  const a = Object(answer) === answer && answer !== null ? answer : {};
  const rows = Array.isArray(a.rows) ? a.rows : [];
  const handed = new Map((Array.isArray(body.tickets) ? body.tickets : [])
    .filter(t => !blank(t?.backlog_id))
    .map(t => [String(t.backlog_id), t]));
  const no = (id, msg) => refusals.push(`${id}: ${msg}`);

  // X6. The answer is about the list it was handed, and it says what it did.
  if (!blank(a.list) && list !== null && String(a.list) !== list) {
    no(String(a.list), `the answer names list ${String(a.list)}, which is not the one it was ` +
      `handed (${list})`);
  }
  if (blank(a.account)) no(label, "the answer needs an account");

  // X1. EXACTLY ONCE EACH. A list half-answered is a list re-answered next run, and a row naming a
  //     ticket that was never handed over is a ruling on something nobody put to it.
  const seen = new Map();
  for (const row of rows) {
    const id = blank(row?.backlog_id) ? "<NULL>" : String(row.backlog_id);
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const [id, n] of seen) {
    if (!handed.has(id)) {
      no(id, "is not a ticket of this validation — a row may only rule the tickets it was handed");
    } else if (n > 1) {
      no(id, "is ruled twice");
    }
  }
  for (const id of handed.keys()) {
    if (!seen.has(id)) no(id, "was handed and not ruled");
  }

  for (const row of rows) {
    const id = blank(row?.backlog_id) ? "<NULL>" : String(row.backlog_id);
    const verdict = row?.verdict;
    const ticket = handed.get(id);

    // X2.
    if (!VERDICTS.includes(verdict)) {
      no(id, `verdict ${blank(verdict) ? "<NULL>" : String(verdict)} is not one of ${VERDICTS.join(", ")}`);
    }
    // X3. A validation without its reason is a stamp — the thing this door exists to replace.
    if (blank(row?.reason)) no(id, "the verdict needs a reason");
    else if (String(row.reason).length > REASON_CHARS) {
      no(id, `the reason is ${String(row.reason).length} characters; the schema allows ${REASON_CHARS}`);
    }
    // X4 / X5. THE DESCRIPTION IS THE RE-GRADE TRIGGER. Only a `revised` answer carries one, and it
    //     must actually differ from the ticket's: a same-text "revision" reopens no grade (the
    //     comparison `grade_standing()` makes is byte-equality against the grade's own
    //     before-image) while reading to every later session as a rewrite that happened.
    const desc = row?.description;
    if (verdict === "revised") {
      if (blank(desc) || (ticket !== undefined && String(desc) === String(ticket.description ?? ""))) {
        no(id, "a revised validation carries a description that differs from the ticket's");
      }
    } else if (VERDICTS.includes(verdict) && desc !== null && desc !== undefined) {
      no(id, "only a revised validation carries a description");
    }
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
  (code === 0 ? process.stdout : process.stderr).write(msg.endsWith("\n") ? msg : msg + "\n");
  if (!fetched) process.exit(code);
  process.exitCode = code;
  throw new Exit(String(code));
}

function readJson(p, what) {
  if (typeof p !== "string" || !p) die(2, `ticket-validation: ${what} path missing`);
  try { return JSON.parse(fs.readFileSync(path.resolve(p), "utf8")); }
  catch (e) { die(2, `ticket-validation: cannot read ${what} ${p}: ${e.message}`); }
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    die(2, "ticket-validation: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could " +
      "not run, never a pass).");
  }
  return { base, key };
}

async function rest(base, key, method, q, body) {
  fetched = true;
  const res = await fetch(`${base}/rest/v1/${q}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, text, json };
}

const enc = encodeURIComponent;

function chicago(ts) {
  if (!ts) return "(no expiry recorded)";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(ts));
}

// D1. The prompt. The SENSOR decides which tickets this is, never this file: `needs_validation()` is
// read once for the whole board and the list is intersected with it, so the age rule has exactly one
// home (pattern:163) and a change to it needs no change here.
async function prepare(args) {
  const list = typeof args.list === "string" ? args.list : "";
  if (!list) die(2, "ticket-validation --prepare: --list=<slug> is required");
  let limit = DEFAULT_LIMIT;
  if (args.limit !== undefined && args.limit !== true) {
    limit = Number(args.limit);
    if (!Number.isInteger(limit) || limit < 1) {
      die(2, `ticket-validation --prepare: --limit must be a whole number 1 or more; got ${args.limit}`);
    }
  }

  const { base, key } = creds();
  const get = async q => {
    const r = await rest(base, key, "GET", q);
    if (!r.ok) die(1, `ticket-validation: GET ${q} -> HTTP ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  };

  // 1. The list itself. A slug that names no project is a refusal, never an empty run.
  const projects = await get(`projects?slug=eq.${enc(list)}&select=id,slug,name,status&limit=1`);
  const proj = Array.isArray(projects) ? projects[0] : null;
  if (!proj) die(1, `ticket-validation: no projects row reads slug ${list}`);

  const eps = await get(`epics?project_id=eq.${enc(proj.id)}&select=id&order=id.asc`);
  const epicIds = (Array.isArray(eps) ? eps : []).map(r => r.id);
  if (epicIds.length === 0) die(1, `ticket-validation: ${list} has no epics — there is no list to read`);

  const listed = await get(
    `backlog_items?epic_id=in.(${epicIds.map(enc).join(",")})&status=in.(open,partial)` +
    "&select=backlog_id,title,description,status,type,priority_class,scope_origin,epic_id," +
    "need_source,need_score,filed_at&order=backlog_id.asc&limit=1000");
  if (!Array.isArray(listed)) die(1, `ticket-validation: ${list} returned no readable ticket rows`);

  // 2. THE SENSOR, once. Everything it does not name is a ticket no validation is owed on -- too
  //    young, already validated inside the standing window, or john-named (which the move door
  //    refuses whatever a validation says, so a turn on one buys nothing).
  const needsRpc = await rest(base, key, "POST", "rpc/needs_validation", {});
  if (!needsRpc.ok) {
    die(1, `ticket-validation: POST rpc/needs_validation -> HTTP ${needsRpc.status} ${needsRpc.text.slice(0, 400)}`);
  }
  const needs = new Set((Array.isArray(needsRpc.json) ? needsRpc.json : []).map(r => String(r?.backlog_id)));
  let tickets = listed.filter(t => needs.has(String(t.backlog_id)));

  // 3. And which of them already hold a grade -- the fact that tells the turn what a `revised`
  //    answer costs. One read for the whole board, as the list door makes it.
  const gradedRpc = await rest(base, key, "POST", "rpc/grade_standing", {});
  if (!gradedRpc.ok) {
    die(1, `ticket-validation: POST rpc/grade_standing -> HTTP ${gradedRpc.status} ${gradedRpc.text.slice(0, 400)}`);
  }
  const graded = new Set((Array.isArray(gradedRpc.json) ? gradedRpc.json : []).map(r => String(r?.backlog_id)));
  for (const t of tickets) t.graded = graded.has(String(t.backlog_id));

  // NOTHING TO VALIDATE IS AN ANSWER, NOT A FAILURE: exit 0 and no prompt, so the routine goes
  // straight to the list door instead of spending a turn or reading a refusal.
  if (tickets.length === 0) {
    die(0, `ticket-validation: ${list} -- nothing to validate`);
  }

  // d.7: among the old, the ones the board already says matter most, newest first.
  tickets.sort((x, y) => {
    const sx = Number.isFinite(Number(x.need_score)) ? Number(x.need_score) : -1;
    const sy = Number.isFinite(Number(y.need_score)) ? Number(y.need_score) : -1;
    if (sy !== sx) return sy - sx;
    return String(y.filed_at ?? "").localeCompare(String(x.filed_at ?? ""));
  });
  const total = tickets.length;
  tickets = tickets.slice(0, limit);

  const task_context = buildValidationContext({ list, tickets });

  let assembly;
  try {
    // NO `intent_slug`: `capabilities.default_intent_slug` is `ga-validate-intent` and that column
    // is the one home of which intent this capability fires (section 19b, pattern:2).
    assembly = await assemblePrompt({
      capability_slug: CAPABILITY, agent_id: AGENT, tenant_id: TENANT, task_context,
    });
  } catch (e) { die(1, `ticket-validation: ${e.message}`); }
  if (!assembly.agent_card) die(1, `ticket-validation: no agents row for ${AGENT}`);

  const lane = await resolveJudgmentModel(assembly, {
    supabaseUrl: base, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (lane.warning) console.error(`ticket-validation: ${lane.warning}`);
  if (assembly.llm) { assembly.llm.model = lane.model; assembly.llm.lane_note = lane.reason; }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) die(1, `ticket-validation: capability "${CAPABILITY}" assembled zero renderable sections`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : "";
  const text = `${header}${laneLine}\n${system_prompt}\n`;

  if (typeof args.out === "string" && args.out) fs.writeFileSync(path.resolve(args.out), text, "utf8");
  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      list, tickets: tickets.length, limit,
      model: assembly.llm?.model, prompt_bytes: Buffer.byteLength(text, "utf8"), context: task_context,
    }, null, 2)}\n`);
  } else if (!args.out) {
    process.stdout.write(text);
  }
  if (omitted.length) console.error(`ticket-validation: sections omitted (no stored content): ${omitted.join(", ")}`);
  die(3, `ticket-validation --prepare: ${list} — ${tickets.length} of ${total} ticket(s) awaiting ` +
    "validation in this turn; exit 3 = awaiting the Governance Architect's answer, then --dry-run " +
    "and --apply");
}

function refuse(refusals) {
  die(1, refusals.map(r => `refused: ${r}`).join("\n"));
}

// D2. Offline, no network: the answer against the context it was handed.
function dryRun(args) {
  const answer = readJson(args["dry-run"], "answer");
  const ctx = readJson(args.context, "context");
  const v = validateValidation(answer, ctx);
  if (!v.ok) refuse(v.refusals);
  die(0, "ok");
}

// D3. The writer. Validated FIRST and whole -- a refusal sends nothing at all, not one row.
async function apply(args) {
  const hasCycle = typeof args["cycle-id"] === "string" && args["cycle-id"] !== "";
  const hasSession = typeof args["session-name"] === "string" && args["session-name"] !== "";
  if (hasCycle === hasSession) {
    die(2, "ticket-validation --apply: exactly one of --cycle-id=<uuid> / --session-name=<name>");
  }
  const answer = readJson(args.apply, "answer");
  const ctx = readJson(args.context, "context");
  const v = validateValidation(answer, ctx);
  if (!v.ok) refuse(v.refusals);

  const { base, key } = creds();
  const rows = Array.isArray(answer.rows) ? answer.rows : [];
  for (const row of rows) {
    const p = {
      backlog_id: String(row.backlog_id),
      verdict: String(row.verdict),
      reason: String(row.reason),
      account: blank(answer.account) ? undefined : String(answer.account),
    };
    if (!blank(row.prior_art)) p.prior_art = String(row.prior_art);
    if (row.verdict === "revised") p.description = String(row.description);

    const r = await rest(base, key, "POST", "rpc/apply_ticket_validation", {
      p_cycle: hasCycle ? args["cycle-id"] : null,
      p_session: hasSession ? args["session-name"] : null,
      p,
    });
    if (!r.ok) die(1, `ticket-validation --apply: ${p.backlog_id} -> HTTP ${r.status} ${r.text}`);
    const handle = typeof r.json === "string" ? r.json : r.json?.id ?? null;
    if (!handle) {
      die(1, `ticket-validation --apply: ${p.backlog_id} -> the writer returned no handle; got ` +
        `${r.text.slice(0, 300)}`);
    }
    const d = await rest(base, key, "GET", `runner_decisions?id=eq.${enc(handle)}&select=expires_at`);
    const expires = d.ok && Array.isArray(d.json) && d.json[0] ? d.json[0].expires_at : null;
    console.log(`Validated: ${p.backlog_id} ${p.verdict} — ${p.reason}`);
    console.log(`Decision ${handle} — reversible until ${chicago(expires)}: select * from public.reverse_decision('${handle}', 'John', '<why>');`);
  }
  // NO `runner_cycles` row: each `ticket-validation` decision above IS the record of this turn
  // (pattern:93), and the list turn that follows already records the night.
  process.exitCode = 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.prepare) return prepare(args);
  if (typeof args["dry-run"] === "string") return dryRun(args);
  if (typeof args.apply === "string") return apply(args);
  die(2, "ticket-validation: one of --prepare --list=<slug> / --dry-run=<answer.json> / " +
    "--apply=<answer.json> (both with --context=<prepare.json>)");
}

// Importing this module for its exports must never run the CLI (SES-45).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(e => {
    if (e instanceof Exit) return;
    process.stderr.write(`ticket-validation: ${e.stack || e.message}\n`);
    process.exitCode = 1;
  });
}
