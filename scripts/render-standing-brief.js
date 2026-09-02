#!/usr/bin/env node
// DeepBench v7.0.393 | scripts/render-standing-brief.js | SES-310 — the drain census says which
// members are the FINISH LINE (milestone_required), not just how many are named; SES-177 (b) — the
// standing brief's DERIVABLE facts become a generated block; its judgment prose is never touched.
//
// SES-310 (v7.0.393). The drain bullet used to report "N of M named members still open", which is the
// number drain_epic_next() stopped retiring on: since this ship the finish line is the members the
// GATE ruled required (backlog_items.milestone_required, SES-304 / M5-04) whenever the list carries
// such a ruling. Measured live 2026-09-02: the M5 drain 238aa9ca had 9 required members, 0 of them
// open, and 3 open non-required ones — so "3 of 18 named still open" read as unfinished work when the
// milestone was in fact complete. The bullet now leads with requiredOpen-of-required and reports the
// rest as explicitly NOT the finish line; with no gate ruling (required === 0) the old wording is
// unchanged, the same fail-closed direction the function takes.
//
// WHY THIS IS ADDITIVE AND NOT AN EXTRACTION, which is the whole design and the thing an editor will
// undo by habit. SES-177 part (a) (v7.0.228) split CLAUDE-STATE.md and moved the standing judgment
// paragraph VERBATIM into docs/runbooks/standing-brief.md. It then named its own remainder and
// REFUSED it, correctly: "splitting the board census / drain state / scheduler settings back OUT of
// that prose ... is deliberately not attempted here — the paragraph interleaves those facts with
// judgment, and a surgical extraction is the same destroy-what-you-cannot-see risk this script exists
// to refuse." That refusal stands. This script does not extract anything. It renders the live facts
// into a marked block ABOVE the paragraph and is structurally incapable of writing outside it.
//
// MEASURED BEFORE A LINE CHANGED, because "the numbers drift" is a claim and not evidence. Live at
// 2026-08-24T23:2xZ, every derivable number in that hand-maintained paragraph was wrong: open tickets
// 561 -> 581, numbered 561 -> 591, rows 611 -> 670, designed 16 -> 15, needs-desktop 0 -> 2,
// needs-john 1 -> 9, NULL 546 -> 549, drain 11-of-18 open -> 3-of-10. One of them is not merely stale
// but operationally wrong: the paragraph says the scheduler runs every 3 hours (12/3/6/9 on John's
// clock) and runner_settings.interval_hours has been 1 since 22:03Z that day. Every session reads
// that sentence at start.
//
// THE GUARANTEE, and it is asserted rather than intended: only the region between the two markers may
// change. The script splices, then compares the head (before BEGIN) and the tail (after END)
// byte-for-byte with what it read; one byte of difference outside the markers and it exits 2 having
// written nothing. The v7.0.197 briefing wipe — a rebuild from a source that did not cover the whole
// file, publishing a tidy skeleton over real content — is not mitigated here by care. It is
// unreachable.
//
// THE "AS OF" STAMP IS JOHN'S, AND IT OVERRODE THIS SCRIPT'S FIRST DESIGN. His Accept on gated card
// 8c0f2bf9 (attended architect session, 2026-08-24T23:08:29Z) is the operative build spec, verbatim:
// "option RENDER-FROM-TABLES — board census from backlog_items, drain state from
// runner_directives/runner_drain_scope, scheduler line from runner_settings, all generated at build
// time; judgment prose in docs/runbooks/standing-brief.md stays byte-for-byte untouched; EVERY
// GENERATED LINE CARRIES AN 'as of <timestamp>'."
//
// The first build of this script omitted the stamp deliberately, borrowing
// export-backlog-snapshot.js's determinism convention (no clock in the body, provenance is a payload
// sha256) so that --check stayed meaningful. That reasoning is sound and it is NOT the decision: John
// asked for the stamp, and a cycle's own preference does not outrank his word. So the stamp ships.
//
// WHAT KEEPS --check MEANINGFUL ANYWAY, since the obvious consequence of a clock in the body is a
// check that fires on every run and is therefore ignored within a day: --check compares the FACTS,
// never the stamp. The payload sha256 is embedded in the block, and drift is `the sha moved`. A
// refreshed stamp over identical facts is reported as exactly that and is not drift. Two questions,
// two answers: the stamp says WHEN this was last read, the sha says WHETHER it still matches the
// tables. Do not collapse them by making --check diff the whole block.
//
// renderBlock() takes the timestamp as an ARGUMENT rather than reading the clock itself, so it stays
// deterministic under test — a function that reads `new Date()` internally cannot be asserted.
//
// Exit 0 = rendered, or --check found no drift. Exit 1 = --check found drift. Exit 2 = COULD NOT RUN
// (missing env, REST failure, missing/!unique markers, missing judgment sentinel, or a head/tail that
// moved). Exit 2 is never a pass — the export-backlog-snapshot.js / heal-engine.js convention.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIEF_REL = "docs/runbooks/standing-brief.md";
const BRIEF_ABS = path.join(ROOT, BRIEF_REL);

export const BEGIN = "<!-- BEGIN GENERATED — scripts/render-standing-brief.js — do not hand-edit inside this block -->";
export const END = "<!-- END GENERATED — scripts/render-standing-brief.js -->";

// The judgment prose part (a) moved here verbatim. Its opening is the sentinel: if it is gone, the
// file is not the standing brief any more and this script must not write a block into whatever it is.
export const JUDGMENT_SENTINEL = "**Next session:**";

function die(msg, code = 2) {
  console.error(`render-standing-brief: ${msg}`);
  process.exit(code);
}

// --- pure helpers (imported directly by tests/regression/SES-177b-standing-brief-block.js, per
//     John's "never throw away tests" rule and the DIR-603f44ea / SES-176 precedent: the guard must
//     assert the REAL predicate, never a copy that passes forever while the shipped file rots) ------

/** Split a file into [head, body, tail] around the markers. Throws with a precise reason otherwise. */
export function splitOnMarkers(text) {
  const b = text.indexOf(BEGIN);
  const e = text.indexOf(END);
  if (b === -1) throw new Error(`the BEGIN marker is missing from ${BRIEF_REL}`);
  if (e === -1) throw new Error(`the END marker is missing from ${BRIEF_REL}`);
  if (e < b) throw new Error("the END marker precedes the BEGIN marker");
  if (text.indexOf(BEGIN, b + 1) !== -1) throw new Error("the BEGIN marker appears more than once");
  if (text.indexOf(END, e + 1) !== -1) throw new Error("the END marker appears more than once");
  return [text.slice(0, b), text.slice(b + BEGIN.length, e), text.slice(e + END.length)];
}

/**
 * The fail-closed predicate: the hand-maintained judgment prose must still be in the file.
 *
 * IT IS LINE-ANCHORED, AND THAT IS NOT TIDINESS. Found while building this: the first form was
 * `text.includes(JUDGMENT_SENTINEL)`, and this file's own header comment QUOTES the sentinel while
 * explaining the rule -- so the predicate was satisfied by the explanation of itself, and would have
 * returned true for a brief whose judgment paragraph had been deleted entirely. That is the SES-180
 * self-flagging failure in a second costume: a checker that matches its own documentation. Only a
 * line that STARTS with the sentinel is the paragraph.
 */
export function keepsJudgmentProse(text) {
  return typeof text === "string" && text.split("\n").some(l => l.startsWith(JUDGMENT_SENTINEL));
}

export function pct(n, total) {
  return total > 0 ? `${Math.round((n / total) * 1000) / 10}%` : "—";
}

/** Census of one column over rows, rendered as a stable `key n` list ordered by count then key. */
export function census(rows, key, nullLabel = "NULL") {
  const m = new Map();
  for (const r of rows) {
    const k = r[key] == null ? nullLabel : String(r[key]);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const CLOSED = new Set(["done", "removed"]);

/** The payload sha over the FACTS only — never the stamp. This is what --check compares. */
export function factsSha(facts) {
  const payload = JSON.stringify({
    items: facts.items.map(r => [r.id, r.status, r.design_status, r.queue]).sort(),
    settings: facts.settings || null,
    drain: facts.drain || null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** The sha embedded in an already-rendered block, or null. Lets --check compare facts, not bytes. */
export function shaFromBlock(block) {
  const m = /sha256:([0-9a-f]{16})/.exec(String(block || ""));
  return m ? m[1] : null;
}

/** John's stamp: UTC for the ledger, CST labelled for him (times he reads are CST — 2026-08-20). */
export function asOf(nowIso) {
  const d = new Date(nowIso);
  if (Number.isNaN(d.getTime())) throw new Error(`asOf: not a date: ${nowIso}`);
  const utc = d.toISOString().slice(0, 16).replace("T", " ") + "Z";
  const cst = d.toLocaleString("en-US", {
    timeZone: "America/Chicago", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  return `as of ${utc} (${cst} CST)`;
}

/**
 * The block body. Deterministic for a given (facts, nowIso) — the clock is an ARGUMENT, never read
 * in here, so the guard can assert this function directly. `facts` is exactly what fetchFacts()
 * returns, so the test can drive it from a fixture.
 */
export function renderBlock(facts, nowIso) {
  const { items, settings, drain } = facts;
  const stamp = asOf(nowIso);
  const open = items.filter(r => !CLOSED.has(r.status));
  const numbered = items.filter(r => r.queue != null);
  const openUnnumbered = open.filter(r => r.queue == null);

  const L = [];
  L.push("");
  L.push(`## Live board state — generated, do not hand-edit — *${stamp}*`);
  L.push("");
  L.push(
    "> Rendered from the tables by `scripts/render-standing-brief.js` at every ship. **Every number " +
    "below is derived; nothing here is maintained by hand.** The judgment prose beneath this block " +
    "is the opposite — hand-maintained, deliberately, and this script never writes outside these " +
    "markers. Where the two disagree about a number, this block is right and the sentence below is " +
    "stale: say so rather than reconciling them by hand."
  );
  L.push("");

  L.push(`**Board census** — *${stamp}.* ` +
    `**${open.length} open tickets**, ${numbered.length} numbered, ` +
    `**${openUnnumbered.length} open-but-unnumbered**, ${items.length} rows total.`);
  L.push("");

  L.push("| `status` | rows | share of board |");
  L.push("|---|---:|---:|");
  for (const [k, n] of census(items, "status")) L.push(`| \`${k}\` | ${n} | ${pct(n, items.length)} |`);
  L.push("");

  L.push("**`design_status` among OPEN tickets** — *" + stamp + ".* Reads for selection (`SES-114`);" +
    " `NULL` is *not* `auto`, it is not-yet-triaged and no cycle may backfill it.");
  L.push("");
  L.push("| `design_status` | open rows | selection effect |");
  L.push("|---|---:|---|");
  const EFFECT = {
    "needs-john": "skipped, `record_skip()` — John decides on a card",
    "needs-desktop": "skipped, `record_skip()` — needs a session John attends (B39)",
    "john-paced": "skipped **silently** — his ratification, already on a card (`SES-166`)",
    designed: "**not a skip** — build from `kickoff_link` (step 6 fast path)",
    auto: "full ceremony",
    NULL: "full ceremony — not yet triaged",
  };
  for (const [k, n] of census(open, "design_status")) L.push(`| \`${k}\` | ${n} | ${EFFECT[k] || "—"} |`);
  L.push("");

  L.push("**Scheduler and automation settings** — *" + stamp + ".* §2b of the briefing, John's own" +
    " switches, binding via `scheduler_gate()` at step 1b:");
  L.push("");
  if (!settings) {
    L.push("- *No `runner_settings` row.* `scheduler_gate()` fails **open** on every unknown, so the " +
      "runner runs — that is by design, not a fault to repair here.");
  } else {
    L.push(`- Scheduler: **${settings.scheduler_on ? "on" : "OFF"}**, every ` +
      `**${settings.interval_hours} hour${settings.interval_hours === 1 ? "" : "s"}** on John's ` +
      "clock grid (America/Chicago hours divisible by the interval — `SES-151`, DST-proof).");
    L.push(`- Cron minute **${settings.cron_minute}**, manual-fire tolerance ` +
      `**±${settings.grid_tolerance_min} min** (a start outside it is treated as a manual fire and is ` +
      "never paced).");
    L.push("- Standing daily max: " + (settings.daily_max_tokens_millions == null
      ? "**not set** — a blank box means *no standing cap*, budget as before `SES-147`; it is never `0`."
      : `**${settings.daily_max_tokens_millions}M tokens**. This is rung 3 of five, **below** the 48h ` +
        "stale floor: a standing number must not defeat the staleness brake."));
  }
  L.push("");

  L.push("**Standing epic drain** — *" + stamp + ".* Created only by John; the runner may read one," +
    " never write one (`drain_epic_next()` property 5). The finish line is drawn from the members he" +
    " **named** (`runner_drain_scope`), never the live `now` tier (`SES-142`) — and within that list" +
    " it is the members a milestone **gate ruled required** (`milestone_required`, `SES-310`)" +
    " whenever the list carries such a ruling, every named member otherwise.");
  L.push("");
  if (!drain || !drain.directive_id) {
    L.push("- **No drain standing.** Selection is the class-sorted board exactly as it is with no " +
      "drain declared.");
  } else if (drain.required > 0) {
    // SES-310: this list HAS a gate ruling, so the finish line is the required set and the bullet
    // says so. The non-required and deferred members are named too, and named as NOT the finish
    // line — they stay on the board and stay pickable under Prime Directive §2(c) once the drain
    // retires; omitting them would read as if they had disappeared.
    const fmt = t => `\`${t}\``;
    L.push(`- **${drain.epic_name || "(unnamed epic)"}** — **${drain.requiredOpen} of ` +
      `${drain.required} required members still open** (${drain.named} named). It retires when every ` +
      "required member is `done`/`removed` (`SES-310`); `delivered` is deliberately absent from that " +
      "side, because a drain retires on the gate's ruling and never on the runner's own say-so.");
    if (drain.requiredOpenIds.length) {
      L.push(`- Still open (required): ${drain.requiredOpenIds.map(fmt).join(", ")}.`);
    }
    if (drain.nonRequiredOpenIds.length) {
      L.push(`- Open but not on the finish line: ${drain.nonRequiredOpenIds.map(fmt).join(", ")}.`);
    }
    if (drain.deferredIds.length) {
      L.push(`- Deferred: ${drain.deferredIds.map(fmt).join(", ")}.`);
    }
  } else {
    // SES-310 fail-closed branch: no member of this list carries a gate ruling, so every named
    // member IS the finish line and the wording is unchanged from before this ship.
    L.push(`- **${drain.epic_name || "(unnamed epic)"}** — **${drain.open} of ${drain.named} named ` +
      "members still open**. It retires when every named member is `done`/`removed`; `delivered` is " +
      "deliberately absent from that side, because a drain retires on John's acceptance and never on " +
      "the runner's own say-so.");
    if (drain.openIds.length) {
      L.push(`- Still open: ${drain.openIds.map(t => `\`${t}\``).join(", ")}.`);
    }
  }
  L.push("");

  const sha = factsSha(facts);
  L.push(`*Provenance: ${items.length} board rows, payload \`sha256:${sha.slice(0, 16)}\`, ${stamp}. ` +
    "The stamp says when this was last read; the sha says whether it still matches the tables. " +
    "`--check` compares the sha, never the stamp — a refreshed stamp over identical facts is not drift.*");
  L.push("");
  return L.join("\n");
}

/** Splice a rendered block in, refusing if anything outside the markers would move. */
export function spliceBlock(original, block) {
  const [head, , tail] = splitOnMarkers(original);
  const next = head + BEGIN + block + END + tail;
  const [head2, body2, tail2] = splitOnMarkers(next);
  if (head2 !== head || tail2 !== tail) {
    throw new Error("the splice would change bytes OUTSIDE the markers — refusing to write");
  }
  if (body2 !== block) throw new Error("the spliced block did not round-trip — refusing to write");
  if (!keepsJudgmentProse(next)) {
    throw new Error("the result does not carry the hand-maintained judgment prose — refusing to write");
  }
  return next;
}

// --- data ------------------------------------------------------------------------------------------

async function rest(base, key, pathAndQuery) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { headers });
  } catch (e) {
    die(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  if (!res.ok) die(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

export async function fetchFacts(url, key) {
  // SES-310: milestone_required and defer_status join the projection — the drain census below needs
  // the gate's finish-line ruling and the SES-305 deferral state. `select=*` is deliberately still
  // not used: the anon key's column-list grants make a star select a 403 waiting to happen
  // (.claude/rules/supabase-column-grants.md), and naming columns keeps this readable under a
  // service key too.
  const items = await rest(url, key,
    "backlog_items?select=id,backlog_id,status,design_status,queue,milestone_required,defer_status&limit=5000");
  if (!Array.isArray(items) || items.length === 0) die("backlog_items came back empty — refusing to render a board census from nothing");

  const settingsRows = await rest(url, key, "runner_settings?select=*&id=eq.1");
  const settings = Array.isArray(settingsRows) && settingsRows[0] ? settingsRows[0] : null;

  // The standing drain: the single oldest QUEUED drain-epic directive, the same row drain_epic_next()
  // reads. `cancelled` and `done` are excluded — a withdrawn or finished order is not standing.
  const dirs = await rest(url, key,
    "runner_directives?select=id,epic_id,created_at&type=eq.drain-epic&status=eq.queued&order=created_at&limit=1");
  let drain = null;
  if (Array.isArray(dirs) && dirs[0]) {
    const d = dirs[0];
    const scope = await rest(url, key, `runner_drain_scope?select=item_id,backlog_id&directive_id=eq.${d.id}&limit=1000`);
    const byId = new Map(items.map(r => [r.id, r]));
    // item_id is the FK and the ONLY thing joined on: backlog_id carries no unique constraint
    // (CHI-48 occupies two rows, SES-97), so joining on it silently pulls in both.
    const openRows = scope.filter(s => { const r = byId.get(s.item_id); return r && !CLOSED.has(r.status); });
    const epics = await rest(url, key, `epics?select=id,name&id=eq.${d.epic_id}`);
    // SES-310: the finish line. `required` counts the named members the GATE ruled required, over the
    // whole named list (not just the open ones) — it is what decides whether this drain HAS a ruled
    // finish line at all, which is the same test drain_epic_next()'s v_req_n makes. `=== true` and not
    // a truthiness check: NULL and false both mean "not ruled required", and the fail-closed branch
    // below depends on telling those apart from true.
    const reqRows = scope.filter(s => { const r = byId.get(s.item_id); return r && r.milestone_required === true; });
    const requiredOpenRows = reqRows.filter(s => !CLOSED.has(byId.get(s.item_id).status));
    // Open but NOT on the finish line, and open-and-deferred. These are two INDEPENDENT censuses, not
    // a partition: a non-required deferred member is reported in both, exactly as the function's
    // blocked_detail buckets do it.
    const nonReqOpenRows = openRows.filter(s => byId.get(s.item_id).milestone_required !== true);
    const deferredRows = openRows.filter(s => ["yes", "stuck"].includes(byId.get(s.item_id).defer_status));
    const ids = rows => rows.map(s => byId.get(s.item_id).backlog_id).filter(Boolean).sort();
    drain = {
      directive_id: d.id,
      epic_name: Array.isArray(epics) && epics[0] ? epics[0].name : null,
      named: scope.length,
      open: openRows.length,
      openIds: ids(openRows),
      required: reqRows.length,
      requiredOpen: requiredOpenRows.length,
      requiredOpenIds: ids(requiredOpenRows),
      nonRequiredOpenIds: ids(nonReqOpenRows),
      deferredIds: ids(deferredRows),
    };
  }
  return { items, settings, drain };
}

async function main() {
  const check = process.argv.includes("--check");

  // FAIL CLOSED, first thing and before any network call, exactly as render-claude-state.js refuses
  // without the standing brief. A machine with no credentials still exercises this branch.
  if (!fs.existsSync(BRIEF_ABS)) die(`${BRIEF_REL} is missing — refusing to render.`);
  const original = fs.readFileSync(BRIEF_ABS, "utf8");
  if (!keepsJudgmentProse(original)) {
    die(`${BRIEF_REL} no longer carries its hand-maintained judgment prose (the "${JUDGMENT_SENTINEL}" `
      + "sentinel). Refusing to write a generated block into a file whose reason for existing is that prose.");
  }
  try { splitOnMarkers(original); } catch (e) { die(e.message); }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) die(`missing ${[!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ")}`);

  const facts = await fetchFacts(url, key);

  // DRIFT IS A FACTS QUESTION, NOT A BYTE QUESTION. John's spec puts an "as of" stamp in the body,
  // so a whole-block diff would report drift on every single run and the check would be worthless
  // within a day. Compare the payload sha instead: the stamp says when this was last read, the sha
  // says whether it still matches the tables.
  const [, currentBlock] = splitOnMarkers(original);
  const factsMoved = shaFromBlock(currentBlock) !== factsSha(facts).slice(0, 16);

  if (check) {
    if (factsMoved) {
      console.log(`render-standing-brief --check: DRIFT — ${BRIEF_REL}'s generated block no longer matches the tables.`);
      process.exit(1);
    }
    console.log("render-standing-brief --check: no drift — the block's facts match the tables (stamp age is not drift).");
    process.exit(0);
  }

  let next;
  try { next = spliceBlock(original, renderBlock(facts, new Date().toISOString())); } catch (e) { die(e.message); }

  fs.writeFileSync(BRIEF_ABS, next);
  console.log(`render-standing-brief: wrote ${BRIEF_REL} (${Buffer.byteLength(next)} bytes; `
    + `${facts.items.length} board rows; facts ${factsMoved ? "MOVED" : "unchanged"}, stamp refreshed; `
    + "judgment prose untouched).");
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "")) {
  main();
}
