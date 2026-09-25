#!/usr/bin/env node
// DeepBench v7.0.596 | scripts/audit-ledger.js | AGT-131
// FEATURE: AGT-131 -- ONE FINDINGS LIST, AND THIS FILE IS ITS ONE INTAKE. Four writers reach
// public.audit_findings: this CLI, api/_lib/handlers/auditor-write.js, scripts/staff-watch.js and
// scripts/ticket-owner.js. Until this ship the first two carried the SAME read/classify/append loop
// written twice -- and the copy had already started to drift -- while the last two wrote their
// findings to tables (`runner_staff_findings`, `ticket_owner_findings`) nobody reviews.
// ingestFindings() below is that loop, once, with its transports injected: `get`/`post` are the
// caller's, so a capability turn's supabaseUrl/supabaseHeaders and a script's process.env both
// drive the same code rather than two implementations that agree until the week they stop
// (pattern:14, pattern:15).
//
// EVERY ROW NOW SAYS WHAT IT IS AND WHO FOUND IT, SINGULAR. `finding_type` is NOT NULL over
// {defect, gap, proposal, security} with no default -- a writer that will not say what it found has
// not said enough, and a default would answer for it silently (pattern:10). toRow() takes the
// finding's own value first and the run's `--type` second, and THROWS when neither exists, so the
// refusal lands in this process with a legible message instead of as a 23502 from PostgREST.
// `audit_findings_found_by_single` (NOT VALID) refuses a joined `found_by` from here on; the 27
// rows that already carry one are history the append-only guard will not let anyone repair.
//
// DeepBench v7.0.549 | scripts/audit-ledger.js | AGT-86 slice 3
// FEATURE: AGT-86 slice 3 -- THE AUDITOR FILES ITS OWN FINDINGS, AND THE REPORT COUNTS WHAT IT FOUND.
// A filing is attributed to EXACTLY ONE of a runner cycle (--cycle-id) or a session
// (--session-name), which is the rule runner_before_images.ck_before_image_attribution enforces --
// attribution() refuses both and refuses --apply with neither, before the input file is read, so an
// attended session can file without inventing an open cycle. beforeImage() carries only that one
// attribution (a session ingest leaves cycle_id NULL on the image and on the row); toRow() passes a
// finding's check_slug through. The report used to render ledger rows only, so a week whose
// candidates were never ingested read `0 findings`; renderReport(week, rows, found) now reads
// `<F> found, <L> filed` from docs/audits/<week>-candidates.json and adds the six-status ledger line
// and the root-cause tickets line. The two-arg call over the three legacy statuses is byte-identical
// to AGT-70's format (agt-70 part D pins it). The two clean exits set process.exitCode rather than
// calling process.exit(): on Node 24/Windows, process.exit() right after a fetch aborts with the
// libuv `UV_HANDLE_CLOSING` assertion, so the dry run's exit 1 never reached its caller.
//
// DeepBench v7.0.469 | scripts/audit-ledger.js | AGT-70
// FEATURE: AGT-70 slice 4 -- WEEK TWO HAS FOUR ANSWERS, NOT TWO. Slices 1-3 knew `new` and `seen`,
// which is all a first week needs and is wrong from the second week on: a finding filed in W37 and
// re-found in W38 was `new` (its (fingerprint, W38) pair did not exist), so the ledger would have
// grown a fresh row every Monday for one unchanged dispute, and a finding John had already ruled
// `not-a-defect` would have come straight back as new work. classifyIngest() below is the four-way
// verdict, and the ORDER of its tests is the whole design:
//
//   seen        the (fingerprint, week) pair already exists, OR an earlier finding in THIS call
//               carried the same fingerprint. First, because it is the only verdict that makes the
//               row physically un-appendable -- UNIQUE (fingerprint, iso_week) refuses it anyway.
//   ruled-out   a `not-a-defect` row carries this fingerprint, or shares 2+ location HOMES with it.
//               Second, and deliberately ABOVE `recurring`: John's ruling is the ledger's answer,
//               and a ruled question that comes back re-worded (a different fingerprint over the
//               same two homes) is the same question. Two homes and not one, for reconcile()'s
//               measured reason: a single shared home would rule out almost anything.
//   recurring   the fingerprint exists in ANOTHER week. This is the carry landing: it appends a row
//               for the new week, which is what makes "still open in W38" a fact the report can
//               render, rather than a silence.
//   new         nothing above held.
//
// `recurring` APPENDS AND `seen` DOES NOT, and that asymmetry is the reason the dry run's exit code
// counts `new + recurring` rather than `new` alone -- both are work the ledger does not yet hold
// for this week. `ruled-out` never appends and never exits 1: re-filing a ruling is how an
// append-only ledger turns one closed question into a permanent weekly reminder.
//
// FEATURE: AGT-70 slice 1 -- the Auditor's findings ledger, its fingerprint, and the weekly report.
// This script is the ONLY writer of public.audit_findings: the table's trigger refuses every DELETE
// and every UPDATE outside {status, ruling, ruled_by, ruled_at}, so an append here is permanent.
//
// THE FINGERPRINT IS WHY THE LEDGER IS A LEDGER AND NOT A LOG. The same contradiction found again
// next week must be the SAME row, or a weekly audit files six copies of its own first week by
// December. So the identity is deliberately coarse:
//     kind | <locationKeys sorted, joined ","> | normalize(governing_fact)
// hashed sha256 and cut to 16 hex. locationKey() drops a trailing `:<line>` / `:<line>-<line>`,
// which is the load-bearing part: `docs/SELFBUILD-CHARTER.md:262-264` and the same passage at
// :271-273 after an edit above it are ONE finding, not two. A `table/pk/field` location has no
// line to drop and passes through unchanged. normalize() folds case, quoting (backtick, " and ')
// and whitespace runs, so re-wrapping a paragraph does not mint a new finding either.
//
// What the fingerprint is deliberately SENSITIVE to: `kind` (the same pair of passages read as a
// duplicate and read as a contradiction are different claims about them) and the location FILE
// (the same fact disputed in two different homes is a different dispute). tests/regression/
// agt-70-auditor.test.mjs pins both directions with controls, so neither drifts.
//
// The locationKeys are NOT de-duplicated before joining. That is the kickoff's formula verbatim
// (v7.0.464-AGT-70 section 4: "<sorted locationKeys joined ,>") and it is kept literal so the value
// is reproducible from the spec alone rather than from this file's reading of it. The consequence
// is real and stated rather than hidden: a finding citing two lines of ONE file carries that file
// twice, so adding a third citation in the same file changes the fingerprint. If a later slice
// wants set semantics ("the location homes", as the au-knowledge-homes Skill text words it), that
// is a decision with a migration for the rows already filed -- not a quiet edit here.
//
// FILING IS NOT RULING. Nothing in this script ever sets status to not-a-defect or writes a ruling
// of its own. `ruled_by`/`ruled_at` are stamped only for a row that ARRIVES already carrying a
// status other than open -- the fixture's two resolved findings, closed before filing -- and they
// record who filed that closure, never a judgment this script made.
//
// Usage:
//   node scripts/audit-ledger.js --ingest=<json> --week=<YYYY-Www> [--found-by=<s>] [--type=<t>]
//                                [--cycle-id=<uuid> | --session-name=<name>] --apply
//   node scripts/audit-ledger.js --report=<YYYY-Www> [--write]
//
//   --ingest=<json>   A file in the fixture's shape: {week, found_by, findings:[...], carried:[...]}.
//                     Its top-level `week` and `found_by` are DEFAULTS; the flags win when given.
//                     `carried` (audit-cluster.js --collect) is ingested with `findings`.
//   --type=<t>        The run's finding_type for every finding that does not carry its own: one of
//                     defect, gap, proposal, security (AGT-131). Defaults to the input file's
//                     top-level `finding_type`. A finding with neither is exit 2, not a guess.
//   --apply           Actually append. Default is a DRY RUN that writes nothing at all.
//   --cycle-id=<uuid>     With --apply, exactly one of these two: the open runner_cycles row every
//   --session-name=<name> before-image binds to, or the session that filed. Never both.
//   --report=<week>   Render that week's rows, with the found counts from docs/audits/<week>-candidates.json
//                     when that file exists. --write puts them in docs/audits/<week>.md.
//
// Exit codes (the same contract tripwire-to-backlog.js and heal-engine.js keep):
//   0  ran cleanly -- nothing new to file, or --apply appended everything it detected
//   1  a DRY RUN found new findings to file (not in the ledger yet) -- the runner's signal to re-run
//      with --apply. An --apply run that filed them all is a clean run, not a signal.
//   2  could not run -- missing credentials, unreadable/invalid input, REST failure, both of
//      --cycle-id / --session-name, or --apply with neither. NEVER a pass.
//
// §19v: every INSERT is preceded by its own runner_before_images row with row_data null, which
// encodes "this row did not exist before" -- so a Reverse of a filing is a DELETE of that pk. The
// before-image is written FIRST and only its success authorises the append (SES-89, step 8b).

import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// --- pure half (imported by the regression test; no network, no disk, no process.exit) ---------

export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[`"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// THE ISO WEEK IS THIS FILE'S JOB BECAUSE THE LEDGER'S `iso_week` COLUMN IS (AGT-70 slice 3).
// `--ingest`/`--report` already take a `YYYY-Www` on the command line, and step 4d's shell computes
// it with `date -u +%G-W%V`; these two exports are that same calendar in JS, so a caller that has a
// Date rather than a shell (tripwire-to-backlog.js's `--from-ledger` weekly cap) asks the ledger
// what week it is instead of carrying a second copy of the rule.
//
// ISO-8601 AND UTC, both load-bearing. The week a date belongs to is the week holding that date's
// THURSDAY -- which is why `2027-01-01` is `2026-W53` and not `2027-W01`, and the reason this is
// not `Math.floor(dayOfYear / 7)`. UTC and not local: `date -u +%G-W%V` is UTC, `ruled_at` is a
// timestamptz read back as UTC, and a local-time week boundary would put a Sunday-evening ruling in
// the wrong week on half the planet -- silently, and only for the rows nearest the cap.
export function isoWeek(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error(`isoWeek: not a date: ${d}`);
  // Midnight UTC of that calendar day, then walk to the week's Thursday.
  const t = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const day = t.getUTCDay() || 7; // Sunday is 7, not 0 -- the ISO week runs Monday..Sunday.
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((t - jan1) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// The Monday 00:00Z that opens the ISO week the given date falls in, as an ISO string. This is the
// `created_at >= …` floor `--from-ledger` counts its weekly filings from: a cap of 3 PER ISO WEEK
// needs a week boundary that moves only on Mondays, never a rolling 7-day window (which would let
// four rows file across any eight days and never once look over the cap).
export function isoWeekStart(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error(`isoWeekStart: not a date: ${d}`);
  const t = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - (day - 1));
  return t.toISOString();
}

// `docs/runbooks/runner-cycle.md:626` -> `docs/runbooks/runner-cycle.md`
// `api/prompt/request-receivable.js:274-279` -> `api/prompt/request-receivable.js`
// `skill_profiles/pz-identity/temperature` -> unchanged (no line to drop)
export function locationKey(loc) {
  const raw = typeof loc === "string" ? loc : String(loc?.location ?? "");
  return raw.replace(/:\d+(?:-\d+)?$/, "");
}

export function fingerprint(f) {
  const keys = (f?.locations ?? []).map(locationKey).sort();
  const material = `${f?.kind ?? ""}|${keys.join(",")}|${normalize(f?.governing_fact)}`;
  return createHash("sha256").update(material, "utf8").digest("hex").slice(0, 16);
}

const STATUS_ORDER = { open: 0, resolved: 1, "not-a-defect": 2, ticketed: 3, carried: 4, escalated: 5 };
// The six names public.audit_findings' `audit_findings_status_check` constraint allows, in the
// order the report sorts them; exported so a caller names the set once instead of restating it.
export const LEDGER_STATUSES = Object.freeze(Object.keys(STATUS_ORDER));
const LEGACY_STATUSES = new Set(["open", "resolved", "not-a-defect"]);
const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (s !== 0) return s;
    const c = (CONFIDENCE_ORDER[a.confidence] ?? 99) - (CONFIDENCE_ORDER[b.confidence] ?? 99);
    if (c !== 0) return c;
    return String(a.fingerprint).localeCompare(String(b.fingerprint));
  });
}

// Pure: rows in, string out, so the test can hold it byte-stable. `first_seen` is attached by the
// caller (min iso_week for that fingerprint across the whole ledger); a row without one reads as
// first seen in its own week, which is true for every row of a first-ever ingest.
//
// AGT-86 slice 3 -- `found` is {new, carried} from docs/audits/<week>-candidates.json (doReport reads
// it). LEGACY (found null AND every row in open/resolved/not-a-defect) keeps AGT-70's header byte for
// byte; anything else gets `<F> found, <L> filed`, the found line, the six-status ledger line and the
// root-cause tickets line -- so a week whose candidates were never ingested can no longer read
// `0 findings`.
export function renderReport(week, rows, found = null) {
  const ordered = sortRows(rows);
  const count = s => ordered.filter(r => r.status === s).length;
  const legacy = found == null && ordered.every(r => LEGACY_STATUSES.has(r.status));
  const out = [];
  out.push(`<!-- GENERATED by scripts/audit-ledger.js --report=${week} --write (AGT-70) from public.audit_findings — do not edit -->`);
  out.push("");
  if (legacy) {
    out.push(`# Audit ${week} — ${ordered.length} findings (${count("open")} open · ${count("resolved")} resolved · ${count("not-a-defect")} not a defect)`);
  } else {
    const filed = ordered.length;
    const foundN = found ? found.new + found.carried : filed;
    out.push(`# Audit ${week} — ${foundN} found, ${filed} filed${filed === 0 ? " yet" : ""}`);
    if (found) {
      out.push("");
      out.push(`Found this run: ${found.new} new + ${found.carried} carried (docs/audits/${week}-candidates.json)`);
    }
    out.push("");
    out.push(`Ledger: ${count("open")} open · ${count("ticketed")} ticketed · ${count("carried")} carried · ${count("escalated")} escalated · ${count("not-a-defect")} not-a-defect · ${count("resolved")} resolved`);
    if (count("ticketed") > 0) {
      const tickets = [...new Set(ordered.map(r => r.filed_backlog_id).filter(Boolean))].sort();
      out.push("");
      out.push(`Root-cause tickets: ${tickets.join(", ")}`);
    }
  }

  for (const r of ordered) {
    out.push("");
    out.push(`## ${r.fingerprint} · ${r.kind} · ${r.confidence} · ${r.status}`);
    out.push("");
    out.push(`**Fact:** ${r.governing_fact}`);
    out.push("");
    out.push("**Locations:**");
    for (const l of r.locations ?? []) {
      out.push(`- \`${l.location}\` — "${l.text}"`);
    }
    out.push("");
    out.push(`**Proposed resolution:** ${r.proposed_resolution}`);
    if (r.ruling) {
      out.push("");
      out.push(`**Ruling:** ${r.ruling} (${r.ruled_by ?? "unknown"}, ${String(r.ruled_at ?? "").slice(0, 10)})`);
    }
    if (r.filed_backlog_id) {
      out.push("");
      out.push(`**Ticket:** ${r.filed_backlog_id}`);
    }
    out.push("");
    out.push(`First seen: ${r.first_seen ?? r.iso_week} · found by ${r.found_by}`);
  }
  return out.join("\n") + "\n";
}

// Rows as they go to PostgREST. Pure so the test can read the shape without a network.
//
// AGT-70 slice 4 -- `found_by`, `ruled_by` and `ruled_at` now PASS THROUGH from the finding when it
// carries them, and fall back to the run's own values when it does not. The carry is why: a finding
// produced by carryForward() already knows it came from `carry:2026-W37`, and stamping this run's
// `--found-by` over it would erase the only fact the carry added. The fallback is unchanged for
// every hand-written or model-produced finding, which carries none of the three.
//
// AGT-86 slice 3 -- `check_slug` passes through (null when the finding names no check); a session
// ingest (sessionName, no cycleId) leaves `cycle_id` NULL.
// AGT-131 -- the four values public.audit_findings' `audit_findings_finding_type_check` allows.
// Exported so the CLI can refuse a bad --type with a message naming the set, rather than letting
// PostgREST answer 23514 for it (the same reasoning scripts/staff-watch.js applies to --kind).
export const FINDING_TYPES = Object.freeze(["defect", "gap", "proposal", "security"]);

// A finding's own `finding_type` wins over the run's, because a batch may legitimately mix them:
// the Ticket Owner's census raises `gap` while the Auditor's routine raises `defect`, and a caller
// that stamped one value over the whole batch would erase the distinction the column exists for.
// THROWS when neither exists -- see the header: a writer that will not say what it found has not
// said enough, and there is no default to fall back on.
export function findingTypeOf(finding, findingType) {
  const t = finding?.finding_type ?? findingType ?? null;
  if (!t) {
    throw new Error(
      `finding_type is required and has no default: neither the finding nor the run supplied one ` +
      `(one of ${FINDING_TYPES.join(", ")}) -- pass --type=<t>, or put finding_type on the finding.`);
  }
  return String(t);
}

export function toRow(finding, { week, foundBy, cycleId, sessionName, id, findingType }) {
  const status = finding.status ?? "open";
  const ruled = status !== "open";
  return {
    id,
    fingerprint: fingerprint(finding),
    iso_week: week,
    kind: finding.kind,
    locations: finding.locations,
    governing_fact: finding.governing_fact,
    confidence: finding.confidence,
    proposed_resolution: finding.proposed_resolution,
    status,
    ruling: finding.ruling ?? null,
    ruled_by: finding.ruled_by ?? (ruled ? foundBy : null),
    ruled_at: finding.ruled_at ?? (ruled ? new Date().toISOString() : null),
    found_by: finding.found_by ?? foundBy,
    check_slug: finding.check_slug ?? null,
    cycle_id: cycleId ?? null,
    finding_type: findingTypeOf(finding, findingType),
  };
}

// AGT-86 slice 3 -- who a filing is attributed to: EXACTLY ONE of a cycle or a session, the rule
// runner_before_images.ck_before_image_attribution enforces. Both is refused in any mode; --apply
// with neither is refused; a dry run with neither is fine (it writes nothing) and returns two nulls.
export function attribution({ cycleId, sessionName, apply } = {}) {
  const c = cycleId ? String(cycleId) : null;
  const s = sessionName ? String(sessionName) : null;
  if (c && s) throw new Error("exactly one of --cycle-id / --session-name");
  if (apply && !c && !s) throw new Error("--apply needs exactly one of --cycle-id / --session-name");
  return { cycle_id: c, session_name: s };
}

// AGT-86 slice 3 -- the before-image an INSERT is preceded by (§19v). row_data null = "this row did
// not exist before"; it carries only the one attribution the CHECK demands, no decision_id.
export function beforeImage({ cycleId, sessionName, id }) {
  return {
    cycle_id: cycleId ?? null,
    session_name: sessionName ?? null,
    table_name: "audit_findings",
    pk_value: id,
    row_data: null,
  };
}

// The four-way verdict (AGT-70 slice 4). Pure: findings + whatever ledger rows the caller read +
// the week being ingested. See this file's header for why the tests run in this order.
//
// `rows` is deliberately whatever the one REST read returned -- every row sharing a fingerprint
// with this batch, PLUS every `not-a-defect` row regardless of fingerprint (the ruled-out test
// matches on location homes, so it needs rows this batch's fingerprints would never fetch).
export function classifyIngest(findings, rows, week) {
  const ledger = rows ?? [];
  const notADefect = ledger.filter(r => r.status === "not-a-defect");
  const inWeek = new Set(ledger.filter(r => r.iso_week === week).map(r => r.fingerprint));
  const anyWeek = new Set(ledger.map(r => r.fingerprint));

  const verdicts = [];
  const summary = { new: 0, seen: 0, recurring: 0, ruledOut: 0 };
  const alreadyInThisCall = new Set();

  for (const finding of findings ?? []) {
    const fp = fingerprint(finding);
    const homes = new Set((finding?.locations ?? []).map(l => locationKey(l.location)));

    let verdict;
    let match = null;
    if (inWeek.has(fp) || alreadyInThisCall.has(fp)) {
      verdict = "seen";
      match = fp;
    } else {
      const ruled = notADefect.find(r => {
        if (r.fingerprint === fp) return true;
        const rowHomes = new Set((r.locations ?? []).map(l => locationKey(l.location)));
        let shared = 0;
        for (const h of homes) if (rowHomes.has(h)) shared++;
        return shared >= 2;
      });
      if (ruled) {
        verdict = "ruled-out";
        match = ruled.fingerprint;
      } else if (anyWeek.has(fp)) {
        verdict = "recurring";
        match = fp;
      } else {
        verdict = "new";
      }
    }

    alreadyInThisCall.add(fp);
    if (verdict === "new") summary.new++;
    else if (verdict === "seen") summary.seen++;
    else if (verdict === "recurring") summary.recurring++;
    else summary.ruledOut++;
    verdicts.push({ finding, fingerprint: fp, verdict, match });
  }
  return { verdicts, summary };
}

// --- the one intake (AGT-131) -------------------------------------------------------------------
//
// ingestFindings({findings, week, foundBy, findingType, cycleId, sessionName, get, post, apply})
//   -> {verdicts, summary, written, reseen, skipped}
//
// THE READ, THE CLASSIFICATION AND THE APPEND, ONCE, FOR ALL FOUR WRITERS. What used to live here
// as doIngest()'s middle and AGT-70's copy of it inside api/_lib/handlers/auditor-write.js is this
// function; both now call it, and scripts/staff-watch.js and scripts/ticket-owner.js reach the
// ledger through it rather than through a third and fourth spelling of the same loop.
//
// `get` AND `post` ARE THE CALLER'S, and that is the whole reason this can be shared. A capability
// turn holds the executor's supabaseUrl/supabaseHeaders; a script holds process.env credentials;
// a test holds neither and hands in two stubs. The contract is deliberately tiny:
//   get(pathAndQuery) -> the rows, as an array. Throws or fails the process on a transport error.
//   post(table, body) -> resolves on success. Throws on a transport error.
// Nothing here catches a transport failure and carries on: a read that did not happen would
// classify every carry as new work, and an append whose before-image did not land is a row §19v
// cannot reverse.
//
// THE TYPE OF EVERY FINDING IS RESOLVED BEFORE THE FIRST WRITE, not at each row's turn. A batch of
// ten whose seventh carries no type must file NONE of them: half a cluster in the ledger and an
// exit 2 is the worst of both answers, and the next run would read the filed half as `seen`.
//
// AND ONLY UNDER `apply`, which is not a loophole. A DRY RUN WRITES NOTHING, so it has no row to
// type; its whole product is the four-way verdict and the exit code that says how much of this
// batch the ledger does not hold yet. Refusing a dry run for a missing type would make the
// cheapest, safest form of this command the one that stops working first -- and the runbook's
// step 3 leans on exactly that signal to decide whether to re-run with --apply.
export async function ingestFindings({
  findings, week, foundBy, findingType, cycleId, sessionName, get, post, apply,
} = {}) {
  const all = Array.isArray(findings) ? findings : [];
  // Resolve-and-discard: this throws for the batch before anything is read or written.
  if (apply) for (const f of all) findingTypeOf(f, findingType);

  const fps = all.map(fingerprint);
  // ONE read, and it deliberately over-reads: every row sharing a fingerprint with this batch, in
  // ANY week (that is what tells `recurring` from `new`), plus every `not-a-defect` row whatever
  // its fingerprint (the ruled-out test matches on location homes, which no fingerprint filter
  // would fetch). A second round-trip per finding would be the same answer at N times the cost.
  const filter = fps.length
    ? `or=(fingerprint.in.(${fps.join(",")}),status.eq.not-a-defect)`
    : `status=eq.not-a-defect`;
  const rows = await get(`audit_findings?select=fingerprint,iso_week,status,locations&${filter}`);

  const { verdicts, summary } = classifyIngest(all, rows ?? [], week);

  let written = 0;
  // `new` and `recurring` append; `seen` cannot (UNIQUE (fingerprint, iso_week) refuses it) and
  // `ruled-out` must not (re-filing the manager's ruling turns one closed question into a weekly one).
  if (apply) {
    for (const v of verdicts) {
      if (v.verdict !== "new" && v.verdict !== "recurring") continue;
      const id = randomUUID();
      try {
        await post("runner_before_images", beforeImage({ cycleId, sessionName, id }));
      } catch (e) {
        throw new Error(`${e.message} -- no before-image, so the append does not happen (§19v).`);
      }
      await post("audit_findings", toRow(v.finding, { week, foundBy, cycleId, sessionName, id, findingType }));
      written++;
    }
  }

  return {
    verdicts,
    summary,
    written,
    reseen: summary.seen,
    skipped: summary.ruledOut,
  };
}

// --- CLI --------------------------------------------------------------------------------------

function fail(code, msg) {
  console.error(`audit-ledger: ${msg}`);
  process.exit(code);
}

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (exit 2 = could not run, never a pass).");
  return { base, key };
}

async function restGet(base, key, pathAndQuery) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${pathAndQuery}`, { headers: restHeaders(key) });
  } catch (e) {
    fail(2, `read failed: ${e.message}`);
  }
  if (!res.ok) fail(2, `read returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  try {
    return await res.json();
  } catch (e) {
    fail(2, `read returned unparseable JSON: ${e.message}`);
  }
}

async function restPost(base, key, table, body) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: restHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { error: `${table} insert failed: ${e.message}` };
  }
  if (!res.ok) return { error: `${table} insert returned HTTP ${res.status}: ${await res.text().catch(() => "")}` };
  return { ok: true };
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

async function firstSeenByFingerprint(base, key, fps) {
  if (!fps.length) return new Map();
  const rows = await restGet(base, key, `audit_findings?select=fingerprint,iso_week&fingerprint=in.(${fps.join(",")})`);
  const map = new Map();
  for (const r of rows) {
    const cur = map.get(r.fingerprint);
    if (!cur || r.iso_week < cur) map.set(r.fingerprint, r.iso_week);
  }
  return map;
}

async function doIngest(argv) {
  const file = arg(argv, "ingest");
  const apply = arg(argv, "apply") === true;
  // AGT-86 slice 3 -- attribution is settled BEFORE the file is read: a filing bound to both a
  // cycle and a session, or to neither, must never get as far as asking for credentials.
  let attr;
  try {
    attr = attribution({ cycleId: arg(argv, "cycle-id"), sessionName: arg(argv, "session-name"), apply });
  } catch (e) {
    fail(2, e.message);
  }
  const cycleId = attr.cycle_id;
  const sessionName = attr.session_name;

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(path.resolve(ROOT, String(file)), "utf8"));
  } catch (e) {
    fail(2, `could not read --ingest=${file}: ${e.message}`);
  }
  const week = arg(argv, "week") ?? doc.week;
  const foundBy = arg(argv, "found-by") ?? doc.found_by;
  if (!week || !/^\d{4}-W\d{2}$/.test(String(week))) fail(2, `--week must be YYYY-Www (got ${week ?? "nothing"}).`);
  if (!foundBy) fail(2, "--found-by=<s> is required when the input file carries no top-level found_by.");
  // AGT-131 -- the run's type, for every finding that does not carry its own. A bad value is
  // refused HERE, naming the four, rather than reaching PostgREST as a 23514 the caller decodes.
  // A finding with no type at all is refused by findingTypeOf() inside ingestFindings(), before
  // the batch's first write.
  const findingType = arg(argv, "type") ?? doc.finding_type ?? null;
  if (findingType === true) fail(2, `--type needs a value: one of ${FINDING_TYPES.join(", ")}.`);
  if (findingType !== null && !FINDING_TYPES.includes(String(findingType))) {
    fail(2, `--type "${findingType}" is not one of the four finding types: ${FINDING_TYPES.join(", ")}.`);
  }
  // AGT-70 slice 4 -- `carried` is ingested alongside `findings`, from the same file and in the
  // same pass. A separate --carry flag would let a cycle file this week's discoveries and silently
  // drop last week's still-open ones, which is the exact failure week two exists to prevent. A doc
  // without a `carried` key (every slice-1 fixture, and any hand-written file) reads as [].
  const own = Array.isArray(doc.findings) ? doc.findings : null;
  if (!own) fail(2, "the --ingest file has no top-level `findings` array.");
  const findings = [...own, ...(Array.isArray(doc.carried) ? doc.carried : [])];

  const { base, key } = creds();
  // AGT-131 -- the read, the classification and the append are ingestFindings()'s, not this
  // function's. What stays here is the CLI's: credentials from the environment, restGet/restPost
  // as the transports, and a thrown message turned into this script's exit 2.
  let result;
  try {
    result = await ingestFindings({
      findings, week, foundBy, findingType, cycleId, sessionName, apply,
      get: q => restGet(base, key, q),
      post: async (table, body) => {
        const r = await restPost(base, key, table, body);
        if (r.error) throw new Error(r.error);
      },
    });
  } catch (e) {
    fail(2, e.message);
  }
  const { summary } = result;

  console.log(`ingest ${week}: ${findings.length} findings, ${summary.new} new, ${summary.seen} seen, ${summary.recurring} recurring, ${summary.ruledOut} ruled-out`);
  // A dry run that found unfiled work is the signal to re-run with --apply; an --apply run that
  // filed that work is a clean run. `recurring` counts as unfiled work -- the row for THIS week
  // does not exist yet -- while `ruled-out` never does.
  const unfiled = summary.new + summary.recurring;
  if (!apply && unfiled > 0) {
    console.error(`audit-ledger: ${unfiled} new findings to file for ${week} -- re-run with --apply and exactly one of --cycle-id=<uuid> / --session-name=<name>`);
  }
  // exitCode, not process.exit(): see the AGT-86 slice 3 header note (libuv assertion after fetch).
  process.exitCode = !apply && unfiled > 0 ? 1 : 0;
}

async function doReport(argv) {
  const week = String(arg(argv, "report"));
  if (!/^\d{4}-W\d{2}$/.test(week)) fail(2, `--report must be YYYY-Www (got ${week}).`);
  const { base, key } = creds();
  const rows = await restGet(base, key, `audit_findings?select=*&iso_week=eq.${week}`);
  const firstSeen = await firstSeenByFingerprint(base, key, rows.map(r => r.fingerprint));
  for (const r of rows) r.first_seen = firstSeen.get(r.fingerprint) ?? r.iso_week;

  // AGT-86 slice 3 -- what the Auditor FOUND this week, from its candidates file, so a week whose
  // candidates are not yet filed reads `<F> found, 0 filed yet` rather than `0 findings`.
  let found = null;
  const candidatesPath = path.join(ROOT, "docs", "audits", `${week}-candidates.json`);
  if (fs.existsSync(candidatesPath)) {
    let cand;
    try {
      cand = JSON.parse(fs.readFileSync(candidatesPath, "utf8"));
    } catch (e) {
      fail(2, `could not read ${path.relative(ROOT, candidatesPath)}: ${e.message}`);
    }
    found = {
      new: Array.isArray(cand.findings) ? cand.findings.length : 0,
      carried: (Array.isArray(cand.carried) ? cand.carried : []).length,
    };
  }

  const text = renderReport(week, rows, found);
  if (arg(argv, "write") === true) {
    const rel = path.join("docs", "audits", `${week}.md`);
    fs.mkdirSync(path.join(ROOT, "docs", "audits"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, rel), text, "utf8");
    const foundN = found ? found.new + found.carried : rows.length;
    console.log(`report ${week}: ${foundN} found, ${rows.length} filed -> ${rel}`);
  } else {
    process.stdout.write(text);
  }
  process.exitCode = 0;
}

async function main() {
  const argv = process.argv.slice(2);
  if (arg(argv, "ingest") !== undefined) return doIngest(argv);
  if (arg(argv, "report") !== undefined) return doReport(argv);
  fail(2, "nothing to do: pass --ingest=<json> --week=<YYYY-Www> or --report=<YYYY-Www>.");
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
