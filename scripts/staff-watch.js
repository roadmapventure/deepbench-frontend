#!/usr/bin/env node
// DeepBench v7.0.634 | scripts/staff-watch.js | AGT-198 -- A STAFF FINDING REACHES THE MANAGER
// NAMING ITS SUBJECT, AND NEITHER FINGERPRINT MOVES. `ledgerFindingFor()` set every
// `locations[].text` to `--detail` verbatim, so a check's own LABEL was the whole body the manager
// could rule on. Each text now reads `<agent>, "<kind>", on <subject>, cycle <id>: <detail>`, with
// the subject taken from `--backlog=` first (see `subjectFor()` below), and `record()` refuses
// exit 2, writing nothing, when neither the flag nor the prose names one.
//
// TWO OF THIS TICKET'S OWN ASKS ARE REFUSED HERE, both reversible, both recorded rather than
// quietly dropped (kickoff §7):
//
//   (i) "KEY THE FINGERPRINT ON THAT SUBJECT" -- REFUSED. Measured at this ship, not recalled: all
//   four `runner_staff_findings` fingerprints at or past the 3-cycle promotion bar are label-only
//   details (`2fb97122c84a986b` 8 cycles, `e7393ed419f16617` 7, `a05f97ba602f2e21` 6,
//   `4a759c9ad927b189` 3), and every evidence-rich detail among the 30 rows is a one-cycle
//   singleton. Keying on the subject splits each of those across its tickets and takes promotions
//   4 -> 0, and it orphans the FOUR open `skill-edit` rows in `runner_card_asks` whose `target_id`
//   IS one of those fingerprints -- re-filing all four, the exact defect AGT-172 shipped to remove.
//   The subject reaches the manager in the BODY instead, which carries no fingerprint material.
//
//   (ii) "RE-ASK THE TWO LIVE FINDINGS WITH THEIR FACTS" -- OUT OF SCOPE. `audit_findings` is
//   append-only (AGT-70) and off `public.reversible_tables()`; `0cf1b9f3c57887e4` and
//   `9e5ee69379e7e89e` are both already `status=ticketed` onto AGT-198, and their real facts are
//   not in the record to re-state. Inventing them would be worse than the label they carry.
//
// DeepBench v7.0.620 | scripts/staff-watch.js | AGT-172 -- `--record` CAN RECORD, AND `--promote`
// STOPS RE-ASKING. Two defects in one file, both measured live this cycle rather than recalled.
//
// (a) THE RAISE AGT-131 SHIPPED HAD NEVER ONCE LANDED, AND THE ERROR IT PRINTED NAMED THE WRONG
// CAUSE. `rest().get()` and `.post()` both ended in a bare `.json()` on the response after only
// checking `r.ok`, and `record()` hands ingestFindings() a poster pinned to
// `Prefer: return=minimal`. PostgREST
// answers that header `201` WITH A ZERO-BYTE BODY -- probed at this ship against
// `runner_before_images` with a `[]` body, which writes nothing: `return=minimal` -> 201, 0 bytes;
// `return=representation` -> 201, `[]`. So `JSON.parse("")` threw `Unexpected end of JSON input`
// inside the before-image write, and audit-ledger.js:454 rethrew it as `-- no before-image, so the
// append does not happen (§19v)`. THAT POST HAD SUCCEEDED; the message accused the one thing that
// was working. The cost, live: **0** `audit_findings` rows `found_by like 'staff-watch:%'` since
// `v7.0.596`, against six orphan `runner_before_images` rows -- one per attempted raise.
//
// `restBody()` IS THE FIX, AND IT IS ONE FUNCTION BECAUSE A SUCCESS WITH NO BODY IS A PROTOCOL
// FACT RATHER THAN A CALL-SITE QUIRK. An empty body is a SUCCESS where the caller never asked for
// a representation and a FAILURE where it did, so `required` is the single bit that decides it --
// and it is DERIVED FROM THE `Prefer` HEADER THE CALLER ACTUALLY SENT, never remembered per site,
// because a per-site memory is what drifts the day a fifth caller is added. It returns `{value}`
// or `{error}` and NEVER THROWS: a throw here rebuilds the exact confusion above, where a
// transport-shaped exception surfaced from the middle of somebody else's guard. No
// bare `.json()` on a response survives in this file, and the regression file greps for that exact
// call rather than trusting the claim (arm 3).
//
// (b) `--promote --apply` ASKED JOHN THE SAME THING EVERY CYCLE. The INSERT named
// `?on_conflict=target_id,asked_at,question` while setting `asked_at: new Date().toISOString()`,
// so the conflict target could never match an earlier row -- `asked_at` is part of the key and is
// fresh on every run, which makes the resolution unreachable by construction. Live at this ship:
// **39** `runner_card_asks` rows with `target_kind='skill-edit'`, ALL `answer IS NULL` and
// `status='open'`, over **THREE** fingerprints -- 13 each, +3 per cycle since `2026-09-25T19:21Z`.
//
// THE GUARD KEYS ON THE FINGERPRINT AND THE ANSWER, NEVER ON THE QUESTION TEXT, and that is
// measured too. The distinct-cycle count sits INSIDE the sentence `skillEditTextFor()` builds, so
// the same defect writes a DIFFERENT question every time the count ticks over -- two of the three
// fingerprints above already carry 3 distinct texts across their 13 rows. A dedupe keyed on
// `question` would therefore file a fresh ask on exactly the cycle the count moved: the same bug
// wearing a uniqueness constraint. ONE read before the loop fetches every UNANSWERED skill-edit
// ask; a fingerprint already holding one is `standing` and is not re-filed. ONLY AN UNANSWERED ASK
// SUPPRESSES -- once John answers, the next sighting is a genuinely new question and gets its own
// ask, which is the difference between a dedupe and a mute.
//
// THE 36 DUPLICATES ARE GONE, imaged and deleted by migration `agt172_dedupe_skill_edit_asks`
// (DATA ONLY: one DELETE keeping each target's EARLIEST ask, one `runner_before_images` row per
// deleted ask, no `status` invented -- the CHECK admits `open|answered` only -- and no `answer`
// written, because writing one would forge John's). No published page had ever rendered them (live
// page `2026-08-31T22:56Z`, before the first ask), so the cleanup removes nothing he has seen.
//
// DeepBench v7.0.596 | scripts/staff-watch.js | AGT-131 -- A STAFF FINDING NOW REACHES THE ONE
// FINDINGS LIST. `runner_staff_findings` was written by this script and read by nobody: 20 rows
// over 9 fingerprints sat in a table with no reviewer while the Development Manager reviewed
// `audit_findings` alone. `--record` still writes that row -- and it must, because the promotion
// bar counts PER-CYCLE rows and `audit_findings`' `UNIQUE (fingerprint, iso_week)` physically
// cannot hold three of them in one week -- but it now also RAISES the finding into
// `audit_findings` through scripts/audit-ledger.js's ingestFindings(), `finding_type: 'defect'`,
// `found_by: staff-watch:<agent>`, one source and no join.
//
// THE TWO TABLES ANSWER DIFFERENT QUESTIONS, which is why this is a raise and not a move. The raw
// table answers "how many distinct cycles have seen this?" -- the arithmetic the 3-cycle bar runs
// on. The ledger answers "what is open right now, and who is going to decide it?" The ledger's own
// week-unique key folds the second, third and fourth sighting into one row, which is correct for a
// review queue and fatal for a counter (pattern:17: extend the structure that fits, per question).
//
// THE GOVERNING FACT IS THE NORMALISED DETAIL, not the raw one, and that is deliberate: the ledger
// fingerprints on `normalize(governing_fact)`, and a cycle uuid inside the prose would mint a fresh
// finding every cycle -- the exact failure `fingerprintFor()` was written to prevent here.
// `normalizeDetail()` is now the one spelling of that masking, shared by both.
//
// DeepBench v7.0.511 | scripts/staff-watch.js | SES-378 slice 5 -- DEVIATION D1 IS RETIRED, and the
// only thing that changed is the database. `runner_card_asks_target_kind_check` now admits
// `'skill-edit'` (migration `ses378e_card_ask_skill_edit`), so `--promote --apply` files the ask it
// has been writing all along instead of being refused 23514. NOT ONE LINE OF BEHAVIOUR MOVED here;
// the comment at the INSERT records the widening and cites the ticket. Guarded both directions by
// `tests/regression/ses-378e-staff-watch-brief.test.mjs` (1): `'skill-edit'` inserts, `'item'` still
// inserts, and `'not-a-kind'` is still refused 23514 -- a constraint that was DROPPED rather than
// widened would pass the first two and fail the third.
//
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
import { ingestFindings, isoWeek } from "./audit-ledger.js";

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
// AGT-131 -- the masking, as its own export, because TWO things now depend on it agreeing with
// itself: this file's fingerprint and the `governing_fact` the raised `audit_findings` row carries.
// A second copy written inline at the raise would drift on the first day someone widened UUID_RE.
export function normalizeDetail(detail) {
  return String(detail ?? "").toLowerCase()
    .replace(UUID_RE, "<uuid>")
    .replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

export function fingerprintFor({ agentId, kind, detail } = {}) {
  const norm = normalizeDetail(detail);
  if (!agentId || !kind || !norm) return { error: "agent, kind and detail are all required" };
  return { fingerprint: sha256(`${agentId}|${kind}|${norm}`).slice(0, 16) };
}

// --- AGT-198: the subject ------------------------------------------------------------------------
//
// WHAT DID THE CHECK SEE IT IN? A `--detail` like `assignment differs from the queue head` is the
// check's own LABEL, and `ledgerFindingFor()` below used to set it as the whole of every
// `locations[].text`. `audit-review.js:407` selects `locations` and hands them to the manager at
// `:185`; `audit-ledger.js:249` renders each as `` - `<location>` -- "<text>" ``. So the label WAS
// the entire body the manager could rule on -- live at this ship: `audit_findings`
// `0cf1b9f3c57887e4` and `9e5ee69379e7e89e`, both `status=ticketed` onto AGT-198, each with two
// locations whose `text` is the bare label and nothing else.
//
// THE SUBJECT IS READ FROM THE FLAGS, NEVER DEMANDED OF THE PROSE, and that is the one design
// choice this function exists to make. The ticket asks to refuse a finding with "no named subject
// AND no evidence" -- a CONJUNCTION -- and `--backlog=<ID>` is a named subject. Demanding the
// subject inside `--detail` instead would refuse the procedure's own calls: all SIX
// `--detail='...'` commands in `docs/runbooks/runner-cycle.md` (`:1981`, `:2806`, `:2808`, `:2957`,
// `:3058`, `:3060`) are deliberately label-only and every one of them passes `--backlog=`.
// `:2959` states the reason: "The detail names no ticket on purpose: `--backlog=` carries that, or
// the finding fingerprints a new way every cycle and never reaches the 3-cycle promotion bar."
// Measured at this ship, that is not a worry but the record: of `runner_staff_findings`' 30 rows,
// ALL FOUR fingerprints at or past the bar are label-only (`2fb97122c84a986b` 8 cycles,
// `e7393ed419f16617` 7, `a05f97ba602f2e21` 6, `4a759c9ad927b189` 3) and every evidence-rich detail
// is a one-cycle singleton. So a subject demanded of the prose would take promotions 4 -> 0.
//
// SOURCES IN ORDER, most authoritative first. The flag is first because it is the only one that is
// DECLARED rather than guessed out of prose; the three prose sources exist so a caller who names a
// real subject and passes no flag is not refused for a missing flag.
export function subjectFor({ detail, backlog } = {}) {
  if (backlog) return { subject: `backlog_items:${backlog}`, source: "flag" };
  const d = String(detail ?? "");
  for (const [source, re] of [
    ["ticket", /\b(?:SES|AGT|LOG|DAT)-\d+[a-z]?\b/],
    ["path", /\b[\w./-]+\.(?:js|mjs|md|sql|json)\b/],
    ["named", /\b(?:public\.[a-z_]+|[a-z_]{4,}\()/],
  ]) {
    const m = re.exec(d);
    if (m) return { subject: m[0], source };
  }
  // NAMES THE FIX, NOT JUST THE REFUSAL. This exits a cycle's `--record` with 2 and writes nothing,
  // so the operator reading it needs to know which of the two ways out to take.
  return {
    error: "detail names no subject and no --backlog was given: a check that cannot say WHAT it saw "
      + "has recorded nothing. Pass --backlog=<ID>, or name the ticket, file, table or function in --detail.",
  };
}

// AGT-131 -- the finding this script raises into the one findings list, as a pure function so the
// regression file can read its exact shape without a network. `kind:'other'` and a
// `<source>:<slug>` check_slug are the non-Auditor form the ticket settled; the locations are the
// agent, and the ticket too when the observation named one.
//
// AGT-198 -- EACH `locations[].text` NOW CARRIES THE WHOLE OBSERVATION: who saw it, what check, on
// what subject, in which cycle, then the detail. That is the body the manager rules on, and it is
// enriched HERE because this is the one place in the finding that carries NO fingerprint material.
//
// `governing_fact` AND `fingerprintFor` ARE DELIBERATELY UNTOUCHED, and this is measured, not
// reasoned about. `audit-ledger.js:184` is
// `fingerprint(f) = sha256(kind | sorted locationKeys | normalize(governing_fact))`, and
// `locationKey()` (`audit-ledger.js:179`) reads `loc.location` ONLY -- never `loc.text`. Proven by
// running those shipped functions at this ship: enriching the texts below leaves this finding's
// ledger fingerprint at `0cf1b9f3c57887e4`, byte-identical to the live row, while the control that
// enriches `governing_fact` instead moves it to `bc45c53ef2773472`. And `fingerprintFor()` above is
// not called from here at all, so the promotion key `4a759c9ad927b189` still matches: at this ship
// `runner_card_asks` holds FOUR open `skill-edit` rows whose `target_id` is one of the four
// promotable fingerprints, all with `answer IS NULL`, and AGT-172's dedupe keys on `target_id`.
// Moving either fingerprint re-files all four -- the exact defect AGT-172 shipped to remove. So:
// enrich the text, never the fact. (`docs/kickoffs/v7.0.634-AGT-198-...md` §7 records the refusal
// of the ticket's own "key the fingerprint on that subject" for this reason.)
export function ledgerFindingFor({ agent, kind, detail, backlog, cycleId } = {}) {
  // `record()` runs `subjectFor()` as an exit-2 gate BEFORE it ever reaches here, so the error
  // branch is unreachable from the shipped path. If some future caller skips that gate, the clause
  // is OMITTED rather than filled with a guess -- a body that names a subject it did not have is
  // worse than one that names none.
  const s = subjectFor({ detail, backlog });
  const on = s.subject ? `, on ${s.subject}` : "";
  const inCycle = cycleId ? `, cycle ${cycleId}` : "";
  const text = `${agent}, "${kind}"${on}${inCycle}: ${detail}`;
  const locations = [{ location: `agents:${agent}`, text }];
  if (backlog) locations.push({ location: `backlog_items:${backlog}`, text });
  return {
    kind: "other",
    check_slug: `staff:${String(kind).replace(/\s+/g, "-")}`,
    locations,
    // FINGERPRINT MATERIAL -- see the block above. `audit-ledger.js:184` hashes
    // `normalize(governing_fact)`, so any enrichment here re-partitions the ledger and orphans the
    // four open `runner_card_asks` rows. The enrichment goes in `locations[].text`, which the
    // fingerprint does not read.
    governing_fact: normalizeDetail(detail),
    confidence: "high",
    proposed_resolution: "Skill edit via --promote at the bar",
  };
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

// AGT-172 -- WHICH PROMOTIONS GET A FRESH ASK AND WHICH ARE ALREADY STANDING, as a pure function
// so the regression file drives the SHIPPED rule on fixtures instead of a second copy of it.
//
// THE KEY IS THE FINGERPRINT, and `standingTargetIds` is deliberately a set of fingerprints rather
// than of question texts. `skillEditTextFor()` interpolates the distinct-cycle count INTO the
// sentence, so one defect seen a fourth time produces a question that is byte-different from its
// own third asking -- which is precisely how `uniq_card_ask (target_id, asked_at, question)` came to
// hold 13 rows for one fingerprint. Keying on the text would re-file on the cycle the count moved.
//
// ORDER IS KEPT, one entry per promotion, so the printed lines read against `promotions`
// top-to-bottom and a caller can zip the two without a lookup.
export function asksToFile(promotions, standingTargetIds) {
  const standing = standingTargetIds instanceof Set
    ? standingTargetIds
    : new Set(standingTargetIds ?? []);
  return (promotions ?? []).map(p => ({
    fingerprint: p.fingerprint,
    action: standing.has(p.fingerprint) ? "standing" : "new",
  }));
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
      const text = await r.text().catch(() => "");
      if (!r.ok) fail(`GET ${q} -> HTTP ${r.status} ${text}`);
      // A READ ALWAYS WANTS A BODY: `required: true`. An empty 200 from a read is not a quiet
      // success, it is a read that returned nothing to classify, and `rows.length` on `null` is a
      // TypeError several frames away from the request that caused it.
      const b = restBody(text, { status: r.status, what: `GET ${q}`, required: true });
      if (b.error) fail(b.error);
      return b.value;
    },
    // `path` carries its own `?on_conflict=` where one is needed -- see the note at each call site.
    async post(table, body, prefer) {
      const r = await fetch(`${base}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...headers, Prefer: prefer },
        body: JSON.stringify(body),
      });
      const text = await r.text().catch(() => "");
      if (!r.ok) fail(`POST ${table} -> HTTP ${r.status} ${text}`);
      // AGT-172 -- THE CALLER'S OWN `Prefer` DECIDES WHETHER AN EMPTY BODY IS A FAILURE. This is
      // read off the header that was actually sent, not off a list of which call sites happen to
      // ask for a representation today: `return=minimal` legitimately answers 201 with 0 bytes
      // (ingestFindings()'s poster below is pinned to it), and that is the success this file spent
      // 24 cycles reporting as "no before-image, so the append does not happen".
      const b = restBody(text, {
        status: r.status,
        what: `POST ${table}`,
        required: /return=representation/.test(prefer ?? ""),
      });
      if (b.error) fail(b.error);
      return b.value;
    },
  };
}

// AGT-172 -- ONE BODY READER FOR EVERY PostgREST ANSWER, `{value}` or `{error}`, NEVER A THROW.
//
// RETURNS `{ value: null }` FOR AN EMPTY BODY THE CALLER DID NOT NEED, which is the whole defect
// this function exists to remove: `Prefer: return=minimal` is answered 201 with zero bytes, and
// `JSON.parse("")` on that is an `Unexpected end of JSON input` that reaches the operator wearing
// the label of whatever guard was on the stack. Where the caller DID ask for a representation, the
// same empty body is a real failure and says so, naming the query -- an empty read silently
// treated as `null` would classify a full ledger as empty work.
//
// NEVER THROWS, AND THAT IS THE POINT rather than a style choice. The error is a VALUE the caller
// hands to `fail()` at the call site that knows what it was doing; an exception thrown from here
// is indistinguishable from the transport exception that started all this.
//
// AN UNPARSEABLE BODY REPORTS ITS BYTE COUNT AND ITS FIRST 120 CHARACTERS. "Not JSON" with nothing
// attached is the same dead end as before: a PostgREST HTML error page, a proxy notice and a
// truncated array all say `Unexpected token` and need completely different fixes, so the answer
// carries enough of itself to tell them apart -- and is truncated so a megabyte of HTML cannot
// become the log.
export function restBody(text, { status, what, required } = {}) {
  const raw = String(text ?? "");
  if (!raw.trim()) {
    if (!required) return { value: null };
    return { error: `${what} -> HTTP ${status} answered an EMPTY body where one was required` };
  }
  try {
    return { value: JSON.parse(raw) };
  } catch (e) {
    return {
      error: `${what} -> HTTP ${status} answered a body that is not JSON (${e.message}); `
        + `${Buffer.byteLength(raw, "utf8")} byte(s), first 120 chars: ${raw.slice(0, 120)}`,
    };
  }
}

// --- the three modes ------------------------------------------------------------------------------

async function record(args) {
  // AGT-198 -- THE SUBJECT GATE, AND IT RUNS BEFORE THE FINGERPRINT AND BEFORE ANY WRITE. A finding
  // whose body cannot say what it saw reaches the manager as a bare check label and is unrulable;
  // refusing it here costs the cycle nothing, because `runner_staff_findings` and `audit_findings`
  // are both append-only and off `reversible_tables()` -- a row written without a subject cannot be
  // taken back. Exit 2 with nothing written is the only safe direction.
  const subject = subjectFor({ detail: args.detail, backlog: args.backlog });
  if (subject.error) fail(subject.error);

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

  // AGT-131 -- AND THE SAME OBSERVATION IS RAISED INTO THE ONE FINDINGS LIST. The raw row above is
  // the counter's evidence; this is the review queue's. It runs AFTER the raw write, so a ledger
  // that refused the append never costs the cycle its count. ingestFindings() writes the §19v
  // before-image itself, folds the second sighting of a week to `seen`, and never re-files a
  // finding the manager has already ruled not-a-defect.
  const finding = ledgerFindingFor({
    agent: args.agent, kind: args.kind, detail: args.detail, backlog: args.backlog,
    // AGT-198 -- the cycle rides into the BODY the manager reads. It is not fingerprint material
    // (`audit-ledger.js:184` hashes kind, locationKeys and governing_fact only), so naming it here
    // cannot split one defect into one finding per cycle.
    cycleId: args.cycleId,
  });
  const ingest = await ingestFindings({
    findings: [finding],
    week: isoWeek(new Date()),
    foundBy: `staff-watch:${args.agent}`,
    findingType: "defect",
    cycleId: args.cycleId,
    apply: true,
    get: q => db.get(q),
    post: (table, body) => db.post(table, body, "return=minimal"),
  });
  const raised = ingest.verdicts[0] ?? null;
  const audit_finding = raised ? { verdict: raised.verdict, fingerprint: raised.fingerprint } : null;

  if (args.json) {
    process.stdout.write(JSON.stringify({ recorded: isNew, rows_for_fingerprint_in_cycle: rows.length, row, audit_finding }) + "\n");
  } else {
    process.stdout.write(
      `${isNew ? "recorded" : "no-op (already recorded in this cycle)"} `
      + `fingerprint=${row.fingerprint} agent=${row.agent_id} kind="${row.kind}" `
      + `backlog=${row.backlog_id ?? "-"} cycle=${row.cycle_id} id=${row.id}\n`
      + `rows for this (cycle, fingerprint): ${rows.length}\n`
      // A permanent, un-deletable ledger row was just appended (or deliberately not): the default
      // mode says so rather than leaving it to whoever remembers to pass --json.
      + `audit_findings: ${audit_finding ? `${audit_finding.verdict} (${audit_finding.fingerprint})` : "nothing raised"}\n`);
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
  // AGT-172 -- the standing ask per fingerprint, kept out here because the print below needs the
  // ask's id and `asked_at` after the loop has finished.
  const standingAsks = new Map();
  if (args.apply) {
    // ONE READ BEFORE THE LOOP, and it is the whole dedupe. Measured, not reasoned about: before
    // this guard, `runner_card_asks` held 39 `skill-edit` rows over THREE fingerprints -- 13 each,
    // +3 every cycle -- because the INSERT's `?on_conflict=target_id,asked_at,question` named
    // `asked_at`, which is minted fresh on the line below it and can therefore never match an
    // earlier row. The conflict resolution was unreachable by construction.
    //
    // `answer=is.null` IS PART OF THE KEY, AND THE DISTINCTION IS A DEDUPE VERSUS A MUTE. An ask
    // John has ANSWERED does not suppress the next sighting: the defect recurring after he has
    // ruled on it is new information and gets its own thread. Only an ask still waiting on him does.
    //
    // `question` IS NOT PART OF THE KEY, deliberately -- see asksToFile()'s note: the cycle count
    // lives inside the sentence, so one defect's asks are not byte-identical to each other and a
    // text key re-files the moment the count ticks over.
    const open = await db.get(
      "runner_card_asks?target_kind=eq.skill-edit&answer=is.null&select=id,target_id,asked_at");
    for (const a of open ?? []) {
      // The EARLIEST unanswered ask is the standing one -- the thread John is looking at, and the
      // row the dedupe migration kept. Reporting a later duplicate would point him at the copy.
      const prev = standingAsks.get(a.target_id);
      if (!prev || String(a.asked_at) < String(prev.asked_at)) standingAsks.set(a.target_id, a);
    }

    for (const { fingerprint, action } of asksToFile(promotions, new Set(standingAsks.keys()))) {
      if (action === "standing") {
        filed.push({ fingerprint, action, standing_ask_id: standingAsks.get(fingerprint).id });
        continue;
      }
      const p = promotions.find(x => x.fingerprint === fingerprint);
      // ONE ROW EACH, never one per finding: the ask is about the fingerprint, and since AGT-172
      // the thing between a re-run and a duplicated thread is the standing-ask read above -- NOT
      // `uniq_card_ask (target_id, asked_at, question)`, which this INSERT names as its conflict
      // target and which cannot fire while `asked_at` is fresh per run. The constraint is left in
      // place as the backstop it can actually be (an identical ask inside one run); the guard is
      // what makes a second cycle a no-op.
      //
      // DEVIATION D1 IS RETIRED as of `SES-378` slice 5 (`v7.0.511`, migration
      // `ses378e_card_ask_skill_edit`): `runner_card_asks_target_kind_check` now reads
      // `CHECK ((target_kind = ANY (ARRAY['item'::text, 'question'::text, 'skill-edit'::text])))`,
      // so this INSERT is accepted rather than refused 23514. NOTHING HERE CHANGED to make that
      // true, and that is the point D1 was making: the value was written as the kickoff specified
      // and the database's own refusal was surfaced at exit 2, so the constraint could be widened
      // deliberately. A silently substituted `'item'` would have filed every ask under the wrong
      // vocabulary and nobody would ever have learned the constraint was in the way.
      await db.post("runner_card_asks?on_conflict=target_id,asked_at,question", [{
        target_kind: "skill-edit",
        target_id: p.fingerprint,
        question: skillEditTextFor(p),
        asked_at: new Date().toISOString(),
        harvested_cycle: args.cycleId,
        status: "open",
      }], "return=representation,resolution=ignore-duplicates");
      filed.push({ fingerprint, action, standing_ask_id: null });
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
      // AGT-172 -- a standing ask names the row John is already looking at and WHEN it was asked, so
      // the operator can read "this was not re-filed" and go find the one that was.
      const standing = standingAsks.get(f.fingerprint);
      process.stdout.write(`  filed runner_card_asks for ${f.fingerprint}: ${
        f.action === "new"
          ? "new"
          : `standing (ask ${f.standing_ask_id}, asked ${standing ? standing.asked_at : "?"})`}\n`);
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
