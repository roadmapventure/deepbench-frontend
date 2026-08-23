#!/usr/bin/env node
// DeepBench v7.0.173 | scripts/export-backlog-snapshot.js | SES-83c, SES-110, SES-112, SES-115
// FEATURE: SES-115 -- the snapshot carries a derived `History residue` column as its last one.
// Rows are never deleted (John's keep-and-filter design, register B1 as revised), so a
// done/removed row on the board is history rather than drift; this cell names the live-board
// state such a row should NOT still hold (queue number, claim, pin) and is empty otherwise.
// Derived rather than three raw columns on purpose -- `queue` and `claimed_at` are row churn
// and exporting them would break this file's byte-identical-across-unchanged-runs guarantee.
// FEATURE: SES-112 -- the snapshot carries `design_status` and `kickoff_link` as its last two
// columns, so WHY a ticket is not being built (and the kickoff doc proving it is designed)
// survives in the backup exactly like the ticket text does.
// FEATURE: SES-110 -- the snapshot carries each ticket's epic NAME as its last column,
// joined through backlog_items.epic_id, so the board's grouping survives in the backup.
// FEATURE: SES-83c -- exports public.backlog_items to a deterministic, git-committed markdown
// snapshot so the table has a point-in-time, offline-restorable backup independent of Supabase's
// own backups.
//
// SES-81 found the backup gap this closes: `public.backlog_items` mirrors the markdown backlog
// files (docs/FEATURES.md and friends -- 553 open tickets as of SES-83c), but the table itself
// had no history outside Supabase. If a bad migration or a bad UPDATE clobbered rows, the only
// recovery path was Supabase's own point-in-time restore, which nobody had verified worked and
// which is invisible to `git log`. This script writes the table's content to a markdown file
// under version control, so every runner ship point that changes the table leaves a diffable,
// restorable commit -- the same durability guarantee the markdown backlog files already had,
// applied to their database mirror.
//
// The markdown backlog files remain AUTHORITATIVE. This snapshot is generated FROM the table,
// not the other way around, and stays a read-only mirror-of-a-mirror until SES-83 phases (d) and
// (e) land and flip authority to the table itself. Until then: never hand-edit the generated
// file, never treat it as a second source of truth, and never let its content diverge from what
// `--check` would report.
//
// Losslessness is the actual point of this file existing: a snapshot that cannot be parsed back
// into exactly the table's contents is not a backup, it's a lossy summary. See the cell-escaping
// comment on esc()/unesc() below for the exact, documented, round-trippable encoding, and the
// header block this script writes into the generated file for the human-readable version of the
// same rules.
//
// Usage:
//   node scripts/export-backlog-snapshot.js [--worktree=<path>] [--out=<path>] [--check] [--json]
//
//   --worktree=<path>  Root to resolve --out against and to write into. Default process.cwd(),
//                       matching the other scripts/check-*.js tools in this repo.
//   --out=<path>        Output file. Default docs/backlog/BACKLOG-SNAPSHOT.md relative to
//                       --worktree (or used verbatim if absolute).
//   --check              Do not write. Fetch the table, build the document it would produce, and
//                       compare against what's already on disk. Reports drift; touches nothing.
//   --json                Print a single-line machine-readable JSON summary instead of prose.
//
// Exit codes:
//   0  wrote the snapshot, or its content was already unchanged, or --check found no drift
//   1  --check found drift -- the file on disk is stale or missing
//   2  cannot run -- a required env var is missing, the Supabase REST call failed, or its
//      response could not be parsed. Exit 2 is deliberately distinct from exit 1: an unrunnable
//      check must never be reported as a pass, and must not be confused with a real "the
//      snapshot is stale" failure either.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. Required because backlog_items' RLS/grants are not
//                          guaranteed to expose every tracked field to the anon key, and this
//                          script's whole purpose is a complete, lossless backup.
//
// Pure helpers (esc, unesc, buildDocument, canonicalPayload) are exported so a QA harness can
// import this module and round-trip a generated file WITHOUT network access. The network/CLI
// path only runs when this file is executed directly (see the pathToFileURL guard at the
// bottom) -- importing the module for its exports must never hit Supabase or touch disk.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pathToFileURL } from "url";

// ---------------------------------------------------------------------------
// CLI arg parsing -- same `arg(name, fallback)` shape as the repo's other
// scripts/check-*.js tools, for `--flag=value` style options.
// ---------------------------------------------------------------------------

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const WORKTREE = arg("worktree", process.cwd());
const JSON_OUT = process.argv.includes("--json");

// The 14 tracked fields, in the fixed order used both for the exported markdown
// table's columns and for canonicalPayload()'s hash input. `id`, `created_at`,
// and `updated_at` are deliberately excluded -- they are row churn (surrogate
// key, timestamps), not backlog content, and including them would make the
// snapshot change on every fetch even when nothing about the ticket itself
// changed, defeating the "byte-identical across unchanged-table runs" goal.
//
// `epic_name` (SES-110, v7.0.155) is the one entry here that is NOT a column on
// backlog_items: it is epics.name, reached through the epic_id FK. Two decisions
// about it are load-bearing:
//   - It is stored as the NAME, never the uuid. epics.name is UNIQUE and human
//     readable, so a restore can re-establish membership by name without needing
//     the surrogate key to have survived -- which is the whole point of a backup
//     that outlives the table.
//   - It is appended LAST, so every pre-existing cell index is unchanged. The
//     mirror reader in scripts/check-session-docs.js addresses cells by index
//     (cells[1], cells[2], cells[3], cells[5], cells[8]); appending anywhere but
//     the end would silently re-point every one of them at the wrong field.
const EPIC_FIELD = "epic_name";

// `design_status` / `kickoff_link` (SES-112, v7.0.157) are real backlog_items columns and are
// appended AFTER epic_name for the same index reason stated above -- the mirror reader keeps
// addressing cells by position, so new fields only ever go on the end. Two encoding facts
// travel with them, both already guaranteed by esc()/unesc() and worth stating because a
// reader that gets them wrong looks correct:
//   - An untriaged ticket stores SQL NULL, which writes as an EMPTY cell. That is NOT the same
//     as design_status = '' (which would write `\e`), and it must never be read back as 'auto':
//     "nobody has triaged this" is the honest value SES-112 deliberately keeps (John, 2026-08-22).
//   - `kickoff_link` is only ever non-NULL when design_status = 'designed' -- the table's
//     ck_design_status_kickoff CHECK enforces it, so a snapshot row carrying a link with any
//     other status means the constraint was dropped, not that the exporter drifted.
// `history_residue` (SES-115, v7.0.173) is the SECOND entry here that is not a
// backlog_items column -- it is DERIVED, in residueOf() below, and appended last
// for the same cell-index reason as every field before it.
//
// WHY A DERIVED CELL RATHER THAN THE THREE RAW COLUMNS. SES-115 needs
// check-session-docs.js's check 3 to answer "does this done/removed row still
// hold live-board state?", and that lint is deliberately credential-free and
// network-free -- so the answer has to be visible in this file. The obvious
// move is to export `queue`, `claimed_at` and `pinned_position` directly, and it
// would wreck the property stated 30 lines above: `claimed_at` is rewritten
// twice per cycle across 8 cycles a day, and `queue` churns all ~600 rows on
// every recompute. Both are exactly the "row churn, not backlog content" class
// that `id`/`created_at`/`updated_at` are excluded for. So this cell is computed
// ONLY for history rows (status done/removed) and is null for every active row
// and for a CLEAN history row -- which means it adds zero bytes today and
// produces a diff precisely when there is drift worth seeing.
const RESIDUE_FIELD = "history_residue";

const COLUMNS = [
  "backlog_id",
  "tier",
  "type",
  "priority_class",
  "title",
  "description",
  "status",
  "source_file",
  "session_ref",
  "harvest_link",
  "row_ordinal",
  EPIC_FIELD,
  "design_status",
  "kickoff_link",
  RESIDUE_FIELD,
];

// What the REST select actually asks for: the real columns, plus the embedded
// epic. PostgREST returns the embed as a nested object (`epics: {name} | null`),
// which fetchAllTickets() flattens to EPIC_FIELD before anything else sees it --
// so every pure helper below keeps working on flat ticket objects.
//
// RESIDUE_SOURCE_COLUMNS are fetched but never emitted or hashed on their own:
// they exist solely as residueOf()'s input and are dropped in the same flatten
// pass that resolves the epic. Keeping them out of COLUMNS is what stops their
// churn reaching the file.
const RESIDUE_SOURCE_COLUMNS = ["queue", "claimed_by", "claimed_at", "pinned_position"];
const TABLE_COLUMNS = COLUMNS.filter(c => c !== EPIC_FIELD && c !== RESIDUE_FIELD);
const EPIC_EMBED = "epics(name)";

// A history row (done/removed) has left the standings, so recompute_backlog_queue()
// should have cleared its queue number and pin. Anything still set is a MISSED
// RECOMPUTE -- the one thing about a history row that is genuinely drift rather
// than history. Returns null (an empty cell) for every active row and every clean
// history row.
//
// THE CLAIM IS THE SUBTLE ONE, and this cycle found it live rather than reasoning
// it out: a LIVE claim on a done row is NORMAL and transient, not drift. John
// settled the release order himself (q-claim-release-order, yes, 2026-08-21;
// SES-106, v7.0.150): a cycle writes the ticket's status, runs the recompute,
// pushes, and only THEN releases its claim -- because the claim is the token the
// push gate re-asserts. The step-7 snapshot export runs BEFORE that push, so it
// captures the shipping cycle's own claim on the ticket it just closed, EVERY
// SHIP. Counting that as residue would commit one guaranteed false flag into
// every ship's snapshot -- reintroducing the junk-flag class SES-115 exists to
// remove, in a smaller costume.
//
// So only an EXPIRED claim counts (the 24h boundary -- the same B37 evidence bar
// every other claim check in this platform uses, and the same one backlog_mode()
// applies). That is the case with a real problem behind it: a session that went
// silent mid-build and stranded the ticket. A live claim is somebody working.
const CLAIM_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function residueOf(t, now = Date.now()) {
  if (t.status !== "done" && t.status !== "removed") return null;
  const parts = [];
  if (t.queue !== null && t.queue !== undefined) parts.push(`queue=${t.queue}`);
  if (t.claimed_by !== null && t.claimed_by !== undefined && t.claimed_by !== "") {
    const at = t.claimed_at ? Date.parse(t.claimed_at) : NaN;
    // An unparseable/absent claimed_at beside a set claimed_by cannot be aged, and
    // guessing "live" would hide it forever -- report it and say which it is.
    if (Number.isNaN(at)) parts.push("claimed(no timestamp)");
    else if (now - at > CLAIM_EXPIRY_MS) parts.push("claim expired");
  }
  if (t.pinned_position !== null && t.pinned_position !== undefined) parts.push(`pin=${t.pinned_position}`);
  return parts.length ? parts.join(";") : null;
}

const TIER_ORDER = ["now", "next", "later"];
const PAGE_SIZE = 500;
const MAX_PAGES = 200; // hard ceiling -- see fetchAllTickets() below

// ---------------------------------------------------------------------------
// Cell escaping -- the load-bearing part of this file. esc()/unesc() together
// form a lossless, invertible encoding for pipe-table cells. Order matters:
// backslash is escaped FIRST, then pipe, then newline. Escaping backslash
// first guarantees that every backslash unesc() ever encounters is the FIRST
// character of exactly one of three two-character sequences -- \\, \|, \n --
// never a bare backslash and never the second character of some other
// sequence. That is what makes a single left-to-right regex pass sufficient
// to unescape correctly, with no lookahead and no ambiguity, regardless of
// what backslashes, pipes, or newlines were actually in the source text.
//
// NULL vs empty string: PostgREST returns SQL NULL as JS `null`, and this
// table can (and does) have both NULL and empty-string values in nullable
// text columns, so the encoding must distinguish them:
//   - An EMPTY cell (zero characters between the pipes) means the stored
//     value is SQL NULL.
//   - A stored value that is ITSELF the empty string is written as the
//     literal two-character marker `\e` (backslash, e).
// `\e` can never be produced by esc() for any other input: every backslash
// esc() emits is immediately followed by another `\`, a `|`, or an `n` --
// never a bare `e` -- so `\e` is unambiguous as the sole empty-string marker
// and unesc() can special-case it before running the general unescape pass.
//
// PADDING, and why it is a rule rather than cosmetics (found while reviewing
// this file against the live table): 4 of the 553 tickets store a value with
// its OWN leading or trailing whitespace. A reader that recovered cells with
// `.trim()` would silently eat exactly those 4 values' edges, so the snapshot
// would be lossy in precisely the cases nobody would notice. The rule is
// therefore exact: the writer adds EXACTLY ONE space of padding on each side
// of every escaped cell, and the reader removes EXACTLY ONE character from
// each side -- never a trim. A value that itself starts with a space is
// written with two leading spaces and comes back with one. Readability and
// losslessness both hold, and neither depends on the data being well-behaved.
// ---------------------------------------------------------------------------

export function esc(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "\\e";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "\\n");
}

export function unesc(cell) {
  if (cell === "") return null;
  if (cell === "\\e") return "";
  return cell.replace(/\\\\|\\\||\\n/g, m => {
    if (m === "\\\\") return "\\";
    if (m === "\\|") return "|";
    return "\n"; // m === "\\n"
  });
}

// ---------------------------------------------------------------------------
// parseDocument() -- the inverse of buildDocument(). A backup format nobody can
// read back is a summary, not a backup, so the restore path lives here in the
// same file as the writer and is exercised by QA: parse the generated file,
// compare every field against a fresh fetch, and any drift between writer and
// reader shows up immediately instead of on the day the table is gone.
//
// Section headings carry tier + source_file; the row itself carries the other
// nine fields. Cells are separated by UNESCAPED pipes -- an in-value pipe is
// always `\|` -- and every delimiter is surrounded by the one-space padding the
// writer adds, so a delimiter can never be confused with escaped content.
// Exactly one padding character is removed from each side (never a trim: see
// the padding note above -- 4 live tickets carry their own edge whitespace).
// ---------------------------------------------------------------------------

const HEADING_RE = /^## tier `([^`]*)` — `([^`]*)`/;
const ROW_FIELDS = [
  "row_ordinal",
  "backlog_id",
  "type",
  "priority_class",
  "title",
  "status",
  "session_ref",
  "harvest_link",
  "description",
  EPIC_FIELD,
  "design_status",
  "kickoff_link",
  RESIDUE_FIELD,
];

export function parseDocument(text) {
  const tickets = [];
  let tier = null;
  let source_file = null;

  for (const line of text.split("\n")) {
    const heading = HEADING_RE.exec(line);
    if (heading) {
      tier = heading[1];
      source_file = heading[2];
      continue;
    }
    if (tier === null) continue;                       // prose above the first section
    if (!line.startsWith("|")) continue;
    if (line.startsWith("|---")) continue;             // separator
    if (line.startsWith("| # | ID |")) continue;       // column header

    const inner = line.slice(1, -1);                   // drop the outer pipes
    const cells = inner.split(/(?<!\\)\|/).map(c => c.slice(1, -1));
    if (cells.length !== ROW_FIELDS.length) {
      throw new Error(
        `parseDocument: expected ${ROW_FIELDS.length} cells, got ${cells.length} in: ${line.slice(0, 120)}`
      );
    }

    const ticket = { tier, source_file };
    ROW_FIELDS.forEach((field, i) => { ticket[field] = unesc(cells[i]); });
    // row_ordinal is the join key and is numeric in the table; everything else
    // stays text exactly as stored.
    ticket.row_ordinal = ticket.row_ordinal === null ? null : Number(ticket.row_ordinal);
    tickets.push(ticket);
  }

  return tickets;
}

// ---------------------------------------------------------------------------
// Grouping/ordering -- one `##` section per (tier, source_file), tiers in the
// fixed order now/next/later (any unknown tier sorts last, alphabetically
// among unknown tiers), then by source_file, then rows within a group by
// row_ordinal ascending (numeric). This function is the single source of
// truth for "emit order" -- both buildDocument() and canonicalPayload() call
// it, so the markdown table order and the hashed payload order always agree.
// ---------------------------------------------------------------------------

function tierRank(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? TIER_ORDER.length : idx;
}

function groupTickets(tickets) {
  const groups = new Map(); // key: `${tier} ${source_file}` -> rows[]
  for (const t of tickets) {
    const key = `${t.tier} ${t.source_file}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const groupList = [...groups.entries()].map(([key, rows]) => {
    const [tier, source_file] = key.split(" ");
    const sorted = [...rows].sort((a, b) => Number(a.row_ordinal) - Number(b.row_ordinal));
    return { tier, source_file, rows: sorted };
  });

  groupList.sort((a, b) => {
    const ra = tierRank(a.tier);
    const rb = tierRank(b.tier);
    if (ra !== rb) return ra - rb;
    // Both known (same tier, ra===rb<TIER_ORDER.length) or both unknown.
    if (a.tier !== b.tier) return a.tier < b.tier ? -1 : 1; // unknown tiers: alphabetical
    return a.source_file < b.source_file ? -1 : a.source_file > b.source_file ? 1 : 0;
  });

  return groupList;
}

function flattenOrdered(tickets) {
  const groups = groupTickets(tickets);
  return groups.flatMap(g => g.rows);
}

// ---------------------------------------------------------------------------
// canonicalPayload() -- the hash input. A canonical JSON serialization of the
// exported tickets as an array of arrays in COLUMNS order, in emitted row
// order (grouped/sorted per groupTickets() above). Hashing this instead of
// the rendered markdown means the hash (and therefore whether the snapshot
// counts as "changed") survives purely cosmetic markdown formatting changes,
// and can be computed and compared directly against a fresh DB fetch without
// ever building the document.
// ---------------------------------------------------------------------------

export function canonicalPayload(tickets) {
  const ordered = flattenOrdered(tickets);
  const rows = ordered.map(t => COLUMNS.map(c => (t[c] === undefined ? null : t[c])));
  return JSON.stringify(rows);
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// buildDocument() -- the pure renderer. No network, no fs. Deterministic:
// given the same tickets array (in any fetch order), always produces the
// same bytes -- no wall-clock timestamp anywhere in the output. That
// determinism is the entire point: two runs against an unchanged table must
// be byte-identical, so the ship-point commits that touch this file actually
// carry meaning (a real content change), not fetch-order or timestamp noise.
// ---------------------------------------------------------------------------

export function buildDocument(tickets) {
  const groups = groupTickets(tickets);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const hash = sha256Hex(canonicalPayload(tickets));

  const lines = [];
  lines.push(
    "<!-- DeepBench | docs/backlog/BACKLOG-SNAPSHOT.md | GENERATED FILE -- do not edit by hand. Regenerate: node scripts/export-backlog-snapshot.js -->"
  );
  lines.push("");
  lines.push("# Backlog snapshot — `public.backlog_items`");
  lines.push("");
  lines.push(
    "This file is generated by `scripts/export-backlog-snapshot.js` from the Supabase table"
  );
  lines.push(
    "`public.backlog_items` -- it is NOT hand-maintained and must not be edited directly. The"
  );
  lines.push(
    "table IS the authoritative source of truth for backlog content as of SES-83 phase (d)"
  );
  lines.push(
    "(v7.0.112, 2026-08-21, John's call): runner work selection reads it via SQL and no longer"
  );
  lines.push(
    "parses the markdown backlog files under `docs/`, which are being trimmed to pointers over"
  );
  lines.push(
    "the remaining phases. This snapshot is therefore the table's authoritative offline and"
  );
  lines.push(
    "git-history copy, not a secondary mirror -- the backup gap SES-81"
  );
  lines.push(
    "identified, where the table had no point-in-time recovery path independent of Supabase's own"
  );
  lines.push(
    "backups. Every runner ship point regenerates this file and commits it if changed, so"
  );
  lines.push("`git log` on this path is a durable history of the table's state across sessions.");
  lines.push("");
  lines.push(`**Tickets:** ${total} · **Payload sha256:** \`${hash}\``);
  lines.push("");
  lines.push(
    "Cell escaping (applied in this order so it is mechanically invertible): a literal backslash"
  );
  lines.push(
    "`\\` becomes `\\\\`, a literal pipe `|` becomes `\\|`, and a literal newline becomes the"
  );
  lines.push(
    "two-character sequence `\\n`. Unescaping reverses this in a single left-to-right pass over"
  );
  lines.push(
    "those same three sequences -- escaping backslash first guarantees no bare `\\` can appear in"
  );
  lines.push(
    "an escaped cell except as the first character of `\\\\`, `\\|`, or `\\n`, so the pass is"
  );
  lines.push(
    "unambiguous. An EMPTY cell (zero characters) means the stored value is SQL `NULL`. A stored"
  );
  lines.push(
    "value that is itself the empty string is written as the literal two-character marker `\\e`"
  );
  lines.push(
    "-- escaping can never produce `\\e` on its own (every backslash it emits is followed only by"
  );
  lines.push("`\\`, `|`, or `n`), so `\\e` is unambiguous as the empty-string marker.");
  lines.push("");
  lines.push(
    "Every cell is padded with EXACTLY ONE space on each side, and a reader removes exactly one"
  );
  lines.push(
    "character from each side rather than trimming -- four tickets store values with their own"
  );
  lines.push(
    "leading or trailing whitespace, and a `.trim()` reader would silently eat precisely those."
  );
  lines.push(
    "`tier` and `source_file` come from each section heading; the other twelve fields come from the"
  );
  lines.push(
    "row. `parseDocument()` in the generating script is the reference reader and restores this"
  );
  lines.push("file to the exact table contents.");
  lines.push("");
  lines.push(
    "The final `Epic` column (SES-110) is `epics.name` joined through `backlog_items.epic_id` --"
  );
  lines.push(
    "the NAME, not the uuid, because `epics.name` is UNIQUE and a restore should not depend on a"
  );
  lines.push(
    "surrogate key surviving. An empty cell means the ticket belongs to no epic. The column is"
  );
  lines.push(
    "appended LAST on purpose: the mirror reader in `scripts/check-session-docs.js` addresses cells"
  );
  lines.push("by index, so any other position would silently re-point every one of them.");
  lines.push("");
  lines.push(
    "`Design status` and `Kickoff` (SES-112) are the last two columns, appended for that same"
  );
  lines.push(
    "index reason. `Design status` is why the ticket is not being built -- `auto` (Claude designs"
  );
  lines.push(
    "it solo), `needs-john` (a decision only John makes), `needs-desktop` (the build needs an"
  );
  lines.push(
    "attended session -- `.claude/` paths and other gated files), or `designed` (a kickoff doc"
  );
  lines.push(
    "exists and `Kickoff` names it). An EMPTY `Design status` cell means SQL NULL: not yet"
  );
  lines.push(
    "triaged. That is a real, deliberate value -- it is never to be read or restored as `auto`."
  );
  lines.push("");
  lines.push(
    "`History residue` (SES-115) is the last column and the only DERIVED one: rows are never"
  );
  lines.push(
    "deleted from `backlog_items`, so a `done`/`removed` row sitting on the board is HISTORY, not"
  );
  lines.push(
    "drift -- but such a row should have lost its queue number, its pin and its claim when it"
  );
  lines.push(
    "closed. This cell names whatever is still set (`queue=N`, `claimed`, `pin=N`), and is EMPTY"
  );
  lines.push(
    "for every active row and every clean history row. A LIVE claim is deliberately not residue --"
  );
  lines.push(
    "a cycle releases its claim only AFTER its push (John, `q-claim-release-order`), so this export"
  );
  lines.push(
    "always runs while the shipping cycle still holds one; only an EXPIRED claim (24h) counts, which"
  );
  lines.push(
    "is the case with a stranded ticket behind it. An empty column here is the healthy state;"
  );
  lines.push(
    "a non-empty cell means a recompute was missed. It is derived rather than three raw columns"
  );
  lines.push(
    "because `queue` and `claimed_at` are row churn -- exporting them would change this file on"
  );
  lines.push("nearly every run and destroy the byte-identical guarantee above.");
  lines.push("");

  for (const g of groups) {
    const count = g.rows.length;
    lines.push(`## tier \`${g.tier}\` — \`${g.source_file}\` (${count} ticket${count === 1 ? "" : "s"})`);
    lines.push("");
    lines.push("| # | ID | Type | Priority class | Title | Status | Session | Harvest | Description | Epic | Design status | Kickoff | History residue |");
    lines.push("|---|----|------|----------------|-------|--------|---------|---------|-------------|------|---------------|---------|-----------------|");
    for (const t of g.rows) {
      lines.push(
        `| ${esc(t.row_ordinal)} | ${esc(t.backlog_id)} | ${esc(t.type)} | ${esc(t.priority_class)} | ${esc(t.title)} | ${esc(t.status)} | ${esc(t.session_ref)} | ${esc(t.harvest_link)} | ${esc(t.description)} | ${esc(t[EPIC_FIELD])} | ${esc(t.design_status)} | ${esc(t.kickoff_link)} | ${esc(t[RESIDUE_FIELD])} |`
      );
    }
    lines.push("");
  }

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// I/O -- PostgREST fetch with pagination.
// ---------------------------------------------------------------------------

// PostgREST silently caps the rows a single request returns at its configured
// max-rows setting -- a table that grows past that cap does not error, it just
// truncates the response, which for a backup script means silently dropping
// tickets from the backup with no signal anything went wrong. So this always
// pages in blocks of PAGE_SIZE and only stops on a SHORT page (fewer rows
// returned than requested), never on a fixed row-count assumption. MAX_PAGES
// is a hard ceiling against an infinite loop (e.g. a broken `offset` that
// never converges) -- hitting it is treated as a failure, not a truncated
// success, because a backup script that can silently truncate is worse than
// one that refuses to run.
async function fetchAllTickets(supabaseUrl, supabaseKey) {
  const cols = `${TABLE_COLUMNS.join(",")},${RESIDUE_SOURCE_COLUMNS.join(",")},${EPIC_EMBED}`;
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const base = supabaseUrl.replace(/\/+$/, "");

  let all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${base}/rest/v1/backlog_items?select=${cols}&order=source_file.asc,row_ordinal.asc&limit=${PAGE_SIZE}&offset=${offset}`;

    let res;
    try {
      res = await fetch(url, { headers });
    } catch (e) {
      return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
    }

    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // best effort -- body may be unreadable, that's fine
      }
      return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
    }

    let body;
    try {
      body = await res.json();
    } catch (e) {
      return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
    }

    if (!Array.isArray(body)) {
      return { error: "Supabase REST returned a non-array response for a select query (unexpected shape)" };
    }

    // Flatten the embedded epic to EPIC_FIELD immediately, at the only place that
    // ever sees PostgREST's nested shape. `epics` is the object (or null) the
    // embed returns; a ticket with no epic must come out as null, NOT the empty
    // string -- esc() renders null as an empty cell and "" as the `\e` marker, so
    // conflating them would make "no epic" round-trip back as a stored empty
    // string and quietly corrupt the restore.
    for (const t of body) {
      t[EPIC_FIELD] = t.epics ? t.epics.name : null;
      delete t.epics;
      // SES-115: collapse the four volatile residue inputs into one derived cell
      // and DROP them here, at the same single place the epic is resolved. They
      // must not survive into the ticket objects that canonicalPayload() hashes
      // -- that is what keeps two runs against an unchanged table byte-identical.
      t[RESIDUE_FIELD] = residueOf(t);
      for (const c of RESIDUE_SOURCE_COLUMNS) delete t[c];
    }

    all = all.concat(body);
    if (body.length < PAGE_SIZE) {
      return { tickets: all };
    }
  }

  return {
    error: `hit the hard page ceiling (${MAX_PAGES} pages / ${MAX_PAGES * PAGE_SIZE} rows) without a short page -- refusing to assume the table is fully paginated, since that would silently truncate the backup`,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function fail(code, message) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: false, exitCode: code, error: message }));
  } else {
    console.error(message);
  }
  process.exit(code);
}

function done(code, summary, prose) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: true, exitCode: code, ...summary }));
  } else {
    console.log(prose);
  }
  process.exit(code);
}

async function main() {
  const outArg = arg("out", "docs/backlog/BACKLOG-SNAPSHOT.md");
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(WORKTREE, outArg);
  const CHECK = process.argv.includes("--check");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    return fail(
      2,
      `export-backlog-snapshot: missing required env var(s): ${missing}. Exiting 2 (cannot run) -- this is NOT a pass, the table was never fetched.`
    );
  }

  const { tickets, error } = await fetchAllTickets(supabaseUrl, supabaseKey);
  if (error) {
    return fail(2, `export-backlog-snapshot: ${error}\nExiting 2 (cannot run) -- this is NOT a pass, the table was never fully fetched.`);
  }

  const doc = buildDocument(tickets);
  const groups = groupTickets(tickets).length;
  const hash = sha256Hex(canonicalPayload(tickets));

  let existing = null;
  let existed = true;
  try {
    existing = fs.readFileSync(outPath, "utf8");
  } catch {
    existed = false;
  }

  const changed = existing !== doc;

  if (CHECK) {
    if (!changed) {
      return done(
        0,
        { mode: "check", tickets: tickets.length, groups, sha256: hash, changed: false, outPath },
        `export-backlog-snapshot --check: no drift -- ${outPath} matches the DB (${tickets.length} tickets, sha256 ${hash}).`
      );
    }
    return done(
      1,
      { mode: "check", tickets: tickets.length, groups, sha256: hash, changed: true, outPath },
      `export-backlog-snapshot --check: DRIFT -- ${outPath} ${existed ? "does not match" : "is missing; DB currently has"} ${tickets.length} tickets (sha256 ${hash}). Regenerate with: node scripts/export-backlog-snapshot.js`
    );
  }

  if (!changed) {
    return done(
      0,
      { mode: "write", tickets: tickets.length, groups, sha256: hash, changed: false, outPath },
      `export-backlog-snapshot: unchanged -- ${outPath} already matches the DB (${tickets.length} tickets, sha256 ${hash}). Not touching the file.`
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, doc);
  return done(
    0,
    { mode: "write", tickets: tickets.length, groups, sha256: hash, changed: true, created: !existed, outPath },
    `export-backlog-snapshot: ${existed ? "updated" : "created"} ${outPath} -- ${tickets.length} tickets across ${groups} group(s), sha256 ${hash}.`
  );
}

// Only run the network/CLI path when invoked directly -- a QA harness imports
// this module for esc/unesc/buildDocument/canonicalPayload and must be able
// to do so without triggering a Supabase fetch or a disk write. pathToFileURL,
// not a hand-built `file://${path}` string, for the same reason
// check-deploy-current.js uses it: a Windows path parses wrong as a bare
// `file://` string, which would silently break this guard on John's machine.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main();
}
