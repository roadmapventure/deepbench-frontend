#!/usr/bin/env node
// DeepBench v7.0.519 | scripts/settle-ship.js | SES-385 slice 2 -- THE CLOSE-OUT SETTLES ITSELF.
//
// THE DEFECT, measured on the live board rather than argued. `SES-385` slice 1 (`v7.0.506`) put the
// rule in prose: when the cycle's own record names unbuilt work the status is `partial`, the
// `design_status` flag is cleared, and the `kickoff_link` is kept. The runbook has carried that
// clause at L3272-3278 since, and check 12 (`remainder-stranded`) has been live to find the rows
// where it was not followed. IT FAILED TWICE ON THE SAME DAY ANYWAY: `SES-413`, whose kickoff says
// "slice 1 of 4" in its own first section, and `SES-415`, whose STOP LINE says to close `partial`
// in so many words, both read `status = 'delivered'` with `kickoff_link` NULL -- so
// `ship_handoff_census.missing_kickoff` read 4. A prose rule a human has to remember at the end of
// a long cycle is a rule that gets forgotten at the end of a long cycle. Slice 1 wrote the rule
// down; this slice makes it a command, so the close-out settles itself.
//
// WHY THE VERDICT IS NOT AN INPUT, AND THAT IS THE LOAD-BEARING PART. The obvious shape for this
// script is "approve -> delivered, block -> partial", and it is wrong in the exact direction the
// two live failures went. `SES-413` and `SES-415` both had sound work behind them; what made them
// `partial` was their OWN RECORD naming work that was not built -- a slice count, a STOP LINE, an
// undecided card, a declared remainder. A `delivered` on a kickoff that names a remainder is a BUG,
// never an override, so `decideStatus()` does not take a verdict at all and there is no argument
// that can be passed to make it ignore one of its four triggers. The verdict decides whether the
// ship is accepted; this decides whether the ship is FINISHED. They are different questions.
//
// FOUR TRIGGERS, ANY ONE OF WHICH IS ENOUGH (`partial` iff any):
//   1. the kickoff says `slice N of M` with N < M      -- the document admits its own remainder
//   2. its STOP LINE section closes THIS ticket `partial` -- own id, no id, or `Close as: partial`
//   3. an undecided `gated_before_build` card is open  -- something was gated and never answered
//   4. `--remainder=` is non-empty                     -- the operator names work left behind
//
// THE WRITE PATH IS COPIED, NOT REINVENTED: `rest()` (scripts/ticket-owner.js:653) and the
// decision -> full-row image -> read-back-PATCH order of `applyPlan()` (:729). The ORDER is the
// safety property -- the decision row exists before the image, the image exists before the cell it
// images moves, so one `reverse_decision()` puts the row back whatever failed halfway. The PATCH is
// read back key by key because PostgREST answers 200 with the OLD value when the role cannot write
// a column, and a write that silently did not land would otherwise report success.
//
// `select=*` on the row read is deliberate and is not a `select` to tighten: `reverse_decision()`
// restores every column from `row_data`, so an image built from a column list would restore a
// partial row. Same reasoning as `applyPlan()` step 2.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------------------------
// The pure half. Nothing below this block reads the network, the disk, or process.env, so
// tests/regression/ses-385b-settle-ship.test.mjs asserts every branch by value.
// ---------------------------------------------------------------------------------------------

const SLICE_RE = /\bslice\s+(\d+)\s+of\s+(\d+)\b/i;
const STOP_LINE_RE = /^##\s*7\.?\s*STOP LINE/im;

// `AGT-128`. The STOP LINE section is where a design says the ship is not finished -- but it is
// also where a close-out says what to do with OTHER tickets, and those two sentences sit side by
// side. Measured 2026-09-25: `AGT-109`'s own kickoff closes "Mark `AGT-88` done -- slice 1 was left
// `partial` pending this", and a section-wide `/partial/` settled `AGT-109` itself `partial`. A
// wrongly-`partial` row stays in the pick path (`ARCHITECTURE.md` §19v) and can be re-picked and
// rebuilt, so the cost of reading another ticket's word is a rebuild of work already shipped.
//
// The section is therefore read SENTENCE BY SENTENCE, and the sweep of all 890 kickoffs on disk is
// what sets the rule: 36 of them say `partial` in their STOP LINE, and 35 of those name their own
// id or no id at all. A no-id sentence ("the ticket stays `partial`") is this ship speaking about
// itself and MUST still fire -- requiring an id would silently stop settling 35 real kickoffs to
// fix one. So: a sentence that names ids counts only for the ids it names; a sentence that names
// none counts for whoever is asking. `Close as: partial` is the explicit form no kickoff uses yet,
// and it fires on the section whatever ids the rest of it names.
const NEXT_HEADING_RE = /^##\s/m;
const TICKET_ID_RE = /\b[A-Z]{2,6}-\d{1,4}[a-z]?\b/g;
const CLOSE_AS_RE = /\bclose\s+as\s*:\s*[`*_]*partial\b/i;
const SENTENCE_SPLIT_RE = /(?<=[.;!?])\s+|\n+/;

// stopLineClosesPartial(text, ticketId) -> boolean. `ticketId` null means "no id to match", which
// keeps the no-id sentences firing and leaves another ticket's named `partial` alone.
export function stopLineClosesPartial(text, ticketId = null) {
  const s = typeof text === "string" ? text : "";
  const stop = s.match(STOP_LINE_RE);
  if (!stop) return false;
  const after = s.slice(stop.index + stop[0].length);
  const next = after.match(NEXT_HEADING_RE);
  const section = next ? after.slice(0, next.index) : after;
  if (CLOSE_AS_RE.test(section)) return true;
  for (const sentence of section.split(SENTENCE_SPLIT_RE)) {
    if (!/\bpartial\b/i.test(sentence)) continue;
    const ids = sentence.match(TICKET_ID_RE) ?? [];
    if (ids.length === 0) return true;
    if (ticketId && ids.includes(ticketId)) return true;
  }
  return false;
}

// A status this script must never touch. `done` is John's word (`SES-154`) and `removed` /
// `removal proposed` are a different lifecycle entirely; settling one of those from a close-out
// would overwrite a human decision with a mechanical one.
export const UNSETTLEABLE = new Set(["done", "removed", "removal proposed"]);

// readRemainder(text, ticketId) -> { slice: {n, m} | null, stopPartial: boolean }
//
// Both halves read the kickoff's OWN words. `slice` is the FIRST match in the whole document,
// because the declaration lives in section 1 and later sections quote it; taking the last would
// pick up the "REMAINING, slice 3" line that describes what is NOT being built.
//
// `stopPartial` is scoped to the STOP LINE section and not the whole file, and that scope is the
// discriminator rather than tidiness: the word `partial` appears in ordinary kickoff prose about
// OTHER tickets' statuses all over sections 2 and 5. A kickoff with no STOP LINE heading reads
// false -- there is no section to have said it. Inside the section the sentence must be about THIS
// ticket: see `stopLineClosesPartial` above for why, and for the no-id case that still fires.
export function readRemainder(text, ticketId = null) {
  const s = typeof text === "string" ? text : "";
  const m = s.match(SLICE_RE);
  const slice = m ? { n: Number(m[1]), m: Number(m[2]) } : null;
  return { slice, stopPartial: stopLineClosesPartial(s, ticketId) };
}

// decideStatus({ kickoffText, ticketId, gatedOpen, remainder }) -> { status, reasons[] }
//
// `reasons` is every trigger that fired, not the first: an operator reading the plan needs to know
// the ticket is partial for three reasons, because clearing one of them does not settle it.
// THERE IS NO VERDICT PARAMETER. See the header.
export function decideStatus({ kickoffText = "", ticketId = null, gatedOpen = false, remainder = null } = {}) {
  const { slice, stopPartial } = readRemainder(kickoffText, ticketId);
  const reasons = [];
  if (slice && slice.n < slice.m) reasons.push(`the kickoff declares slice ${slice.n} of ${slice.m}`);
  if (stopPartial) reasons.push("STOP LINE closes this ticket `partial`");
  if (gatedOpen) reasons.push("an undecided `gated_before_build` card is open on this ticket");
  if (typeof remainder === "string" && remainder.trim() !== "") reasons.push(`a remainder was declared: ${remainder.trim()}`);
  if (reasons.length > 0) return { status: "partial", reasons };
  return { status: "delivered", reasons: ["the record names no unbuilt work: no slice remainder, no STOP LINE `partial` for this ticket, no open card, no declared remainder"] };
}

// planSettle(row, kickoffPath, status) -> { id, patch: { status, design_status, kickoff_link } }
//
// THREE CELLS, ALWAYS THE SAME THREE, whichever status was decided -- that is slice 1's rule in
// full and the reason the flag and the link are not conditional. `design_status` is cleared so a
// spent kickoff stops advertising a design that is already built (this is check 12's whole
// subject); `kickoff_link` is SET rather than cleared because `ship_handoff_census` reads it and
// `ck_design_status_kickoff` allows the cleared flag beside a live link, never the reverse.
export function planSettle(row, kickoffPath, status) {
  if (!row || typeof row !== "object" || row.id == null) {
    throw new Error("planSettle: no row to settle — the ticket was not found on the board");
  }
  if (UNSETTLEABLE.has(row.status)) {
    throw new Error(`planSettle: ${row.backlog_id ?? row.id} reads \`${row.status}\` — settling it would overwrite a decision this script does not get to make`);
  }
  if (status !== "partial" && status !== "delivered") {
    throw new Error(`planSettle: ${JSON.stringify(status)} is not a status a close-out writes — expected \`partial\` or \`delivered\``);
  }
  if (typeof kickoffPath !== "string" || kickoffPath.trim() === "") {
    throw new Error("planSettle: the kickoff path is the link this write sets — it cannot be empty");
  }
  return { id: row.id, patch: { status, design_status: null, kickoff_link: kickoffPath } };
}

// ---------------------------------------------------------------------------------------------
// The CLI half (credentials, disk, exit codes).
// ---------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_FLAGS = new Set(["ticket", "kickoff", "cycle-id", "remainder", "apply"]);

function fail(message) {
  process.stderr.write(`settle-ship: ${message}\n`);
  process.exit(2);
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (hit === undefined) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
}

// Copied from scripts/ticket-owner.js:653 -- one fetch path every read AND every write goes
// through, so no caller gets its own error handling and its own chance to swallow a 403.
async function rest(base, key, pathAndQuery, init = {}, label = null) {
  const at = label ? `${label}: ` : "";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { ...init, headers });
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

function renderPlan({ ticket, kickoffRel, row, decided, plan, gatedOpen }) {
  let out = `settle-ship: ${ticket} — ${row.status} → ${plan.patch.status}\n`;
  out += `  kickoff      ${kickoffRel}\n`;
  out += `  design_status ${JSON.stringify(row.design_status)} → null\n`;
  out += `  kickoff_link  ${JSON.stringify(row.kickoff_link)} → ${JSON.stringify(plan.patch.kickoff_link)}\n`;
  out += `  open gated_before_build card: ${gatedOpen ? "yes" : "no"}\n`;
  for (const r of decided.reasons) out += `  · ${r}\n`;
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  for (const a of argv) {
    const name = a.startsWith("--") ? a.slice(2).split("=")[0] : a;
    if (!a.startsWith("--") || !ALLOWED_FLAGS.has(name)) {
      fail(`unknown flag ${a} — this script takes --ticket=<ID>, --kickoff=<path>, --cycle-id=<uuid>, --remainder=<text> and --apply.`);
    }
  }

  const ticket = arg(argv, "ticket");
  const kickoffArg = arg(argv, "kickoff");
  const cycleId = arg(argv, "cycle-id");
  const remainderArg = arg(argv, "remainder");
  const applyArg = arg(argv, "apply");

  if (typeof ticket !== "string" || ticket === "") fail("--ticket=<ID> is required — this script settles exactly one ticket.");
  if (typeof kickoffArg !== "string" || kickoffArg === "") fail("--kickoff=<path> is required — the kickoff's own words decide the status, and its path is the link this write sets.");
  // The attribution constraint (`ck_decision_attribution`) takes exactly one of cycle_id /
  // session_name and this script is always a cycle. Refusing here beats a 400 after the read.
  if (applyArg !== undefined && (typeof cycleId !== "string" || cycleId === "")) {
    fail("--apply needs --cycle-id=<uuid> — every write is attributed to the cycle that made it.");
  }
  const remainder = typeof remainderArg === "string" ? remainderArg : null;

  const kickoffAbs = path.isAbsolute(kickoffArg) ? kickoffArg : path.join(ROOT, kickoffArg);
  let kickoffText;
  try {
    kickoffText = fs.readFileSync(kickoffAbs, "utf8");
  } catch (e) {
    fail(`could not read the kickoff at ${kickoffArg}: ${e.message} — the status is read from the document, so a missing one is never settled as \`delivered\`.`);
  }

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base) fail("SUPABASE_URL is not set — the ticket row is read over REST.");
  if (!key) fail("SUPABASE_SERVICE_KEY is not set — the ticket row is read over REST.");

  const rows = await rest(base, key, `backlog_items?backlog_id=eq.${encodeURIComponent(ticket)}&select=*`, {}, "read row");
  if (!Array.isArray(rows) || rows.length !== 1) {
    fail(`read row: ${ticket} matched ${Array.isArray(rows) ? rows.length : 0} rows — one is the only number that can be settled.`);
  }
  const row = rows[0];

  const cards = await rest(base, key,
    "runner_items?select=backlog_id,kind,decided_at&kind=eq.gated_before_build&decided_at=is.null&limit=10000", {}, "read cards");
  if (!Array.isArray(cards)) fail("read cards: the undecided-card read came back non-array — refusing to decide a status on a board that was not read.");
  const gatedOpen = cards.some(c => c.backlog_id === ticket);

  const decided = decideStatus({ kickoffText, ticketId: ticket, gatedOpen, remainder });
  let plan;
  try {
    plan = planSettle(row, kickoffArg, decided.status);
  } catch (e) {
    fail(e.message);
  }

  process.stdout.write(renderPlan({ ticket, kickoffRel: kickoffArg, row, decided, plan, gatedOpen }));

  if (applyArg === undefined) {
    process.stdout.write("  (no --apply; nothing was written)\n");
    process.exit(0);
  }

  // 1 -- the decision. It exists before the image, and the image before the cell.
  const summary = `Close-out: ${ticket} settles \`${plan.patch.status}\``;
  const reasoning =
    `settle-ship.js read ${kickoffArg} and the undecided \`gated_before_build\` cards, and decided \`${plan.patch.status}\`: ` +
    `${decided.reasons.join("; ")}. The verdict is not an input — a \`delivered\` on a record naming unbuilt work is a bug, never an override. ` +
    `Writing status, \`design_status\` NULL (a spent kickoff stops advertising a built design) and \`kickoff_link\` = this kickoff (\`ship_handoff_census\` reads it). SES-385 slice 2. pattern:0`;

  const decision = await rest(base, key, "rpc/record_decision", {
    method: "POST",
    body: JSON.stringify({
      p_cycle_id: cycleId,
      p_session_name: null,
      p_kind: "ticket-status",
      p_backlog_id: ticket,
      p_summary: summary,
      p_reasoning: reasoning,
      p_ladder_work_class: null,
    }),
  }, "record_decision");
  if (typeof decision !== "string" || decision.length !== 36) {
    fail(`record_decision: returned ${JSON.stringify(decision)}, which is not a decision id`);
  }
  const where = step => `${step} (decision ${decision})`;

  // 2 -- the FULL row imaged, before a single cell moves. `row` is already a select=* read.
  await rest(base, key, "runner_before_images", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      cycle_id: cycleId,
      session_name: null,
      table_name: "backlog_items",
      pk_value: row.id,
      row_data: row,
      decision_id: decision,
    }]),
  }, where("image row"));

  // 3 -- the PATCH, READ BACK key by key. A PATCH PostgREST accepted and silently did not apply
  // answers 200 with the old value, so the representation is compared rather than trusted.
  const back = await rest(base, key, `backlog_items?id=eq.${row.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(plan.patch),
  }, where("patch"));
  const after = Array.isArray(back) ? back[0] : null;
  if (!after) fail(`${where("patch")}: the PATCH returned no row`);
  for (const k of Object.keys(plan.patch)) {
    const got = after[k];
    const want = plan.patch[k];
    if (String(got ?? null) !== String(want ?? null)) {
      fail(`${where("patch")}: ${k} read ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }

  process.stdout.write(`  applied: decision ${decision}, 1 before-image, ${ticket} now \`${after.status}\` · design_status ${JSON.stringify(after.design_status)} · kickoff_link ${JSON.stringify(after.kickoff_link)}\n`);
  process.exit(0);
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
