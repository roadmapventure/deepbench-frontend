#!/usr/bin/env node
// DeepBench v7.0.222 | scripts/render-rule-blocks.js | SES-175 — rendered rule blocks, EXPAND-IN-PLACE
//
// John's decision, typed on gated card a4e0254a in the attended decision-drain session
// 2026-08-24T14:31:41Z: "Accept with C" — expand-in-place. Of the three options carded, (C) is the
// one that changes nothing about what a cycle READS: the marker is a checked comment sitting
// directly above the committed expanded text, so docs/runbooks/runner-cycle.md still contains the
// real rule text a cycle needs mid-run, and this script is what stops that committed copy drifting
// from public.governance_rules. Option (A) — a build step generating rendered runbooks — would have
// split every runbook into source+rendered and changed which file a cycle opens; option (B) would
// have left the runbooks, the files that most need this, hand-typed.
//
// WHAT THIS IS AND IS NOT, because SES-176 shipped a neighbouring check five hours earlier and the
// two are easy to conflate:
//   * check 11 (scripts/check-session-docs.js) asserts a marker's ID RESOLVES to a registry row.
//   * THIS script asserts the committed TEXT under the marker still EQUALS that row's statement.
// A doc can pass check 11 with a rule statement that is a month out of date. That gap is SES-175.
//
// WHY THE SNAPSHOT AND NOT SUPABASE — the same reason check-session-docs.js reads it, restated
// because a later editor will reach for a live query: a network round trip does not belong in a
// pre-commit tripwire, a checker that silently no-ops without credentials is a FALSE ALL-CLEAR, and
// governance_rules is service_role-only since SES-174, so a live read could not work here even in
// principle. A missing snapshot is a loud failure naming the regeneration command, never a skip.
//
// DeepBench v7.0.402 | scripts/render-rule-blocks.js | SES-313 -- three changes:
//
// (1) A CRLF byte reaching the compare, found live rather than guessed at: this repo's runbooks are
// CRLF on disk (git stores LF; checkout re-introduces \r) and the block-extraction loop below used
// to split on a bare "\n", leaving each `found` line carrying a trailing "\r" that the LF-only
// `expected` lines never have. `found.join(" / ")` in the finding's own detail then printed the two
// as if identical, because a bare \r moves a terminal's cursor to column 0 and the rest of that same
// console.error call overwrites what it had already printed -- a false DRIFTED report on text that
// had not moved, on B40 and B18's rendered blocks (measured on origin/dev: 2 markers, both CRLF).
// Fixed by comparing (and reporting) the trailing-\r-stripped form while still consuming the ORIGINAL
// (possibly \r-terminated) line lengths when repairing, so --write's byte offsets stay correct on a
// CRLF file. A checker that cries wolf on unmoved text is a checker nobody runs.
//
// (2) A second marker kind, {{lanes}}, rendered from docs/governance/MODEL-LANES-SNAPSHOT.md
// (public.runner_model_lanes' offline copy, same contract as RULES-SNAPSHOT.md) rather than
// governance_rules -- B21's model-per-lane routing table, ported to data at M6. Same fenced-block
// exclusion, same "marker is the first token inside the comment" guard, same expand-in-place shape;
// {{rule:ID}} and {{lanes}} are collected in one pass so --write's back-to-front offset walk stays
// correct across both kinds in the same file.
//
// (3) docs/kickoffs/ is now excluded from the scan (EXCLUDE_PREFIXES), for the SES-180 self-flagging
// trap in a new costume: this very ticket's own kickoff (docs/kickoffs/v7.0.402-SES-313-model-lanes.md)
// illustrates the {{lanes}} block format as an inline, UNFENCED backtick span -- unlike SES-175's
// kickoff, which fenced its {{rule:ID}} illustration and so was already inert here. Once {{lanes}}
// exists, that unfenced example is a real match with no rendered block after it: a marker this
// script would legitimately have to report as `missing-block`, on a file no runner cycle ever reads
// mid-run. A kickoff is a point-in-time instruction set, not a live runbook, and its ten prior
// members already quote marker syntax as prose/illustration data with zero live markers among
// them (measured: 0 of 10 kickoff files under docs/kickoffs/ currently match {{rule:...}} outside a
// fence) -- so the exclusion changes nothing about today's coverage and forecloses the whole class.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES_SNAPSHOT_REL = "docs/governance/RULES-SNAPSHOT.md";
const LANES_SNAPSHOT_REL = "docs/governance/MODEL-LANES-SNAPSHOT.md"; // SES-313

// Generated files are excluded from the scan for the reason check-session-docs.js states: they carry
// ticket PROSE that quotes rule ids and marker syntax as DATA, and RULES-SNAPSHOT.md is the input
// itself. SESSIONS-ARCHIVE-* is history — a retired stamp must never be rewritten to today's text.
// docs/kickoffs/ joined SES-313 -- see the v7.0.402 header note above for why a kickoff's own
// unfenced illustration of a marker is exactly this same class of false positive, one file later.
const EXCLUDE_RELS = new Set([
  RULES_SNAPSHOT_REL,
  LANES_SNAPSHOT_REL,
  "docs/backlog/BACKLOG-SNAPSHOT.md",
]);
const EXCLUDE_PREFIXES = ["docs/SESSIONS-ARCHIVE-", "docs/kickoffs/"];

// Carried from check 11 rather than re-invented: `{{rule:ID}}` is how this family of docs WRITES
// ABOUT the syntax, and `ID` is not a name any rule may have.
const MARKER_PLACEHOLDERS = new Set(["ID", "<ID>", "RULE-ID", "<RULE-ID>", "rule-id"]);

// A marker is recognised ONLY when {{rule:X}} is the FIRST token inside an HTML comment. This is
// the SES-180 self-flagging failure handled before it fires rather than after: on 2026-08-24 check
// 11's first run flagged its OWN documentation, because prose explaining the syntax looks exactly
// like a use of it. Prose never opens an HTML comment with the marker, so prose is inert here.
const MARKER_RE = /<!--\s*\{\{rule:([^}]*)\}\}([\s\S]*?)-->/g;

// SES-313 -- the second marker kind, same first-token-in-comment shape, no id capture (there is
// exactly one lanes table, never a family of them).
const LANES_MARKER_RE = /<!--\s*\{\{lanes\}\}([\s\S]*?)-->/g;
const LANE_ORDER = ["orchestrator", "judgment", "mechanical"];
const LANE_FIELDS = ["lane", "model_id", "purpose"];

// ---- snapshot reader -------------------------------------------------------------------------
// Deliberately a SECOND copy of check-session-docs.js's parseRulesSnapshot/decodeCell rather than a
// shared import, and that is a scope decision, not an oversight: extracting scripts/lib/ would make
// this a 4-file cycle against HR-SCOPE's 3. The duplication is ~20 lines of format decoding whose
// spec is written in the snapshot's own header; consolidating the two into one reader is filed
// rather than smuggled in here.
const RULE_FIELDS = ["id", "status", "enforcement", "source_group", "canonical_doc", "superseded_by", "statement"];

function decodeCell(cell) {
  // Every cell is padded with exactly one space per side (snapshot header), so remove one character
  // per side rather than trimming — a statement may legitimately end in a space-significant token.
  const body = cell.slice(1, -1);
  if (body === "\\e") return "";
  if (body === "") return null;
  let out = "";
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== "\\") { out += body[i]; continue; }
    const next = body[++i];
    if (next === "n") out += "\n";
    else if (next === "|") out += "|";
    else if (next === "\\") out += "\\";
    else out += "\\" + (next ?? "");
  }
  return out;
}

function parseRulesSnapshot(text) {
  const rules = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    // Split on UNESCAPED pipes only. A statement may contain `|` (stored `\|`); a plain split("|")
    // over-produces cells, fails the length guard, and drops the rule SILENTLY.
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== RULE_FIELDS.length) continue;
    const decoded = cells.map(decodeCell);
    if (decoded[0] === "Rule" || /^-+$/.test(decoded[0] ?? "")) continue;
    const row = {};
    RULE_FIELDS.forEach((f, i) => { row[f] = decoded[i]; });
    if (!row.id) continue;
    rules.set(row.id, row);
  }
  return rules;
}

// SES-313 -- second copy of the same decoder for MODEL-LANES-SNAPSHOT.md, same scope reasoning as
// the RULES-SNAPSHOT.md duplication comment above (a shared scripts/lib/ reader is a 4th file).
function parseLanesSnapshot(text) {
  const lanes = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (cells.length !== LANE_FIELDS.length) continue;
    const decoded = cells.map(decodeCell);
    if (decoded[0] === "Lane" || /^-+$/.test(decoded[0] ?? "")) continue;
    const row = {};
    LANE_FIELDS.forEach((f, i) => { row[f] = decoded[i]; });
    if (!row.lane) continue;
    lanes.set(row.lane, row);
  }
  return lanes;
}

// ---- the rendered form -----------------------------------------------------------------------
// One function, so the writer and the checker can never disagree about what "rendered" means. A
// stored newline becomes a further `> ` line, so a statement that later grows a second sentence
// renders whole instead of silently rendering half.
function renderBlock(id, statement) {
  const lines = String(statement ?? "").split("\n");
  return lines.map((l, i) => (i === 0 ? `> **Rule ${id}** — ${l}` : `> ${l}`));
}

// SES-313 -- one line per lane, fixed order (LANE_ORDER), never alphabetical: the order a cycle
// actually escalates through. `lanes` is the Map parseLanesSnapshot() returns; a lane the snapshot
// does not carry renders a line that says so rather than being silently skipped, so a truncated or
// stale MODEL-LANES-SNAPSHOT.md produces a visible three-line block instead of a shorter one nobody
// would notice was short.
function renderLanesBlock(lanes) {
  return LANE_ORDER.map(lane => {
    const row = lanes.get(lane);
    if (!row) return `> **${lane}** — MISSING from ${LANES_SNAPSHOT_REL} — re-export it`;
    return `> **${lane}** — \`${row.model_id}\` — ${row.purpose}`;
  });
}

function listMarkdown(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      listMarkdown(full, out);
    } else if (e.name.endsWith(".md")) {
      const rel = path.relative(WORKTREE, full).split(path.sep).join("/");
      if (EXCLUDE_RELS.has(rel)) continue;
      if (EXCLUDE_PREFIXES.some(p => rel.startsWith(p))) continue;
      out.push(rel);
    }
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Ranges covered by fenced code blocks. FOUND LIVE, on this ticket's own first run: the kickoff doc
// shows the block format inside a ```` fence to document it, and the scanner read that EXAMPLE as a
// live marker and flagged it as drifted — the SES-180 self-flagging failure arriving in a second
// costume, past the marker-at-head-of-comment guard that was written for the first one. A fence is
// DISPLAY, not a live block: a doc must be able to show the format without the checker trying to
// maintain the illustration. Closing fence must be at least as long as the opening one (CommonMark),
// which is what lets a ```` fence contain a ``` one — exactly how the kickoff doc shows this format.
function fencedRanges(text) {
  const ranges = [];
  let open = null;
  let offset = 0;
  for (const line of text.split("\n")) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (open === null) {
        open = { char: m[1][0], len: m[1].length, start: offset };
      } else if (m[1][0] === open.char && m[1].length >= open.len) {
        ranges.push([open.start, offset + line.length]);
        open = null;
      }
    }
    offset += line.length + 1;
  }
  if (open !== null) ranges.push([open.start, text.length]);   // unclosed fence runs to EOF
  return ranges;
}

function inRanges(ranges, index) {
  return ranges.some(([a, b]) => index >= a && index < b);
}

// SES-313 -- both marker kinds collected into ONE list, sorted by position, so a single
// back-to-front walk keeps every remaining match's offset valid regardless of which kind is being
// rewritten first (same reasoning as the original single-kind collection, extended to two regexes).
function collectMarkers(text) {
  const fences = fencedRanges(text);
  const out = [];
  MARKER_RE.lastIndex = 0;
  for (const m of text.matchAll(MARKER_RE)) {
    if (MARKER_PLACEHOLDERS.has(m[1].trim())) continue;
    if (inRanges(fences, m.index)) continue;
    out.push({ kind: "rule", id: m[1].trim(), index: m.index, length: m[0].length });
  }
  LANES_MARKER_RE.lastIndex = 0;
  for (const m of text.matchAll(LANES_MARKER_RE)) {
    if (inRanges(fences, m.index)) continue;
    out.push({ kind: "lanes", id: null, index: m.index, length: m[0].length });
  }
  out.sort((a, b) => a.index - b.index);
  return out;
}

// SES-313, root cause of the two-{{rule:B40}}-and-{{rule:B18}}-findings-that-print-identically
// defect: this repo's runbooks are CRLF on disk, so `result.slice(blockStart).split("\n")` used to
// leave a trailing "\r" on every `found` line that the LF-only `expected` line never carries. The
// strings then compared unequal while PRINTING identical, because a bare "\r" in a console.error
// argument rewinds the terminal's cursor to column 0 and the rest of that same call overwrites what
// it had already written -- the drift was real (as bytes) and invisible (as terminal output) at
// once. Fixed by stripping one trailing "\r" for BOTH the comparison and the reported text, while
// still measuring the ORIGINAL (possibly "\r"-terminated) line length when repairing -- `foundRaw`
// carries the real bytes consumed so --write's blockEnd offset stays correct on a CRLF file.
function stripCR(line) {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

// Process one file. Returns { findings, text } — `text` is the repaired document when repair is on.
//
// Markers are collected FIRST and then walked back-to-front. That ordering is the whole reason this
// needs no re-scanning: rewriting a block changes every offset after it and none before it, so a
// reverse walk keeps all remaining match positions valid against the string being edited.
function processFile(rel, text, rules, lanes, repair) {
  const findings = [];
  const markers = collectMarkers(text);
  let result = text;

  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i];
    const line = lineOf(text, m.index);
    const label = m.kind === "lanes" ? "{{lanes}}" : `{{rule:${m.id}}}`;

    let expected;
    if (m.kind === "rule") {
      const rule = rules.get(m.id);
      if (!rule) {
        findings.push({ rel, line, id: m.id, kind: "unknown-rule",
          detail: `marker ${label} is not a rule id in ${RULES_SNAPSHOT_REL}. Fix the id, or add the rule to public.governance_rules and re-export.` });
        continue;
      }
      expected = renderBlock(m.id, rule.statement);
    } else {
      expected = renderLanesBlock(lanes);
    }

    // The block is the maximal run of `>` lines starting on the line immediately after the comment
    // closes. No closing marker, so a later edit cannot leave one dangling.
    const after = m.index + m.length;
    const nl = result.indexOf("\n", after);
    if (nl === -1) {
      findings.push({ rel, line, id: m.id, kind: "missing-block",
        detail: `marker ${label} is the last thing in the file — the rendered ${m.kind === "lanes" ? "lanes" : "rule"} text is missing.` });
      continue;
    }
    const blockStart = nl + 1;
    const foundRaw = [];
    for (const l of result.slice(blockStart).split("\n")) {
      if (!stripCR(l).startsWith(">")) break;
      foundRaw.push(l);
    }
    const found = foundRaw.map(stripCR);

    if (found.length === expected.length && found.every((l, j) => l === expected[j])) continue;

    if (repair) {
      // +1 per line for the newline each `>` line consumed. foundRaw (not found) carries the real
      // on-disk byte length -- see the stripCR() note above for why this must not use the
      // CR-stripped copy on a CRLF file.
      const blockEnd = blockStart + foundRaw.reduce((n, l) => n + l.length + 1, 0);
      result = result.slice(0, blockStart) + expected.join("\n") + "\n" + result.slice(blockEnd);
      continue;
    }

    findings.push({ rel, line, id: m.id, kind: found.length === 0 ? "missing-block" : "drifted",
      detail: found.length === 0
        ? `marker ${label} is not followed by a rendered ${m.kind === "lanes" ? "lanes" : "rule"} block (expected a line starting "> **${m.kind === "lanes" ? LANE_ORDER[0] : `Rule ${m.id}`}** — ").`
        : `the text under ${label} has DRIFTED from the ${m.kind === "lanes" ? LANES_SNAPSHOT_REL : "registry"}.\n      committed: ${found.join(" / ")}\n      ${m.kind === "lanes" ? "snapshot:  " : "registry: "} ${expected.join(" / ")}`,
    });
  }
  // Findings were collected back-to-front; report them in reading order.
  findings.reverse();
  return { findings, text: result };
}

function main() {
  const args = process.argv.slice(2);
  const repair = args.includes("--write");
  const snapPath = path.join(WORKTREE, RULES_SNAPSHOT_REL);
  let snapText;
  try {
    snapText = fs.readFileSync(snapPath, "utf8");
  } catch {
    console.error(`render-rule-blocks: ${RULES_SNAPSHOT_REL} is missing. Regenerate it with:\n` +
      `  SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js`);
    process.exit(2);
  }
  const rules = parseRulesSnapshot(snapText);
  if (rules.size === 0) {
    console.error(`render-rule-blocks: parsed 0 rules from ${RULES_SNAPSHOT_REL} — refusing to run.`);
    process.exit(2);
  }

  // SES-313 -- same hard-fail-if-missing contract as RULES-SNAPSHOT.md above: "a missing snapshot
  // is a loud failure naming the regeneration command, never a skip," applied to the second table.
  const lanesSnapPath = path.join(WORKTREE, LANES_SNAPSHOT_REL);
  let lanesSnapText;
  try {
    lanesSnapText = fs.readFileSync(lanesSnapPath, "utf8");
  } catch {
    console.error(`render-rule-blocks: ${LANES_SNAPSHOT_REL} is missing. Regenerate it with:\n` +
      `  SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/export-governance-snapshot.js`);
    process.exit(2);
  }
  const lanes = parseLanesSnapshot(lanesSnapText);
  if (lanes.size === 0) {
    console.error(`render-rule-blocks: parsed 0 lanes from ${LANES_SNAPSHOT_REL} — refusing to run.`);
    process.exit(2);
  }

  const rels = args.filter(a => !a.startsWith("--"));
  const files = rels.length ? rels : listMarkdown(path.join(WORKTREE, "docs"));

  const allFindings = [];
  let blocks = 0;
  let rewritten = 0;
  for (const rel of files) {
    const full = path.isAbsolute(rel) ? rel : path.join(WORKTREE, rel);
    let text;
    try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
    const markers = collectMarkers(text);
    if (markers.length === 0) continue;
    blocks += markers.length;
    const { findings, text: out } = processFile(rel, text, rules, lanes, repair);
    allFindings.push(...findings);
    if (repair && out !== text) {
      fs.writeFileSync(full, out);
      rewritten++;
      console.log(`rewrote ${rel}`);
    }
  }

  console.log(`render-rule-blocks: ${rules.size} rules · ${lanes.size} lanes · ${blocks} marker${blocks === 1 ? "" : "s"} in ${files.length} scanned file${files.length === 1 ? "" : "s"}`);
  if (repair) {
    console.log(rewritten === 0 ? "unchanged — every rendered block already matches the registry and runner_model_lanes" : `${rewritten} file(s) rewritten`);
    process.exit(0);
  }
  if (allFindings.length === 0) {
    console.log("clean — every rendered rule block matches public.governance_rules and public.runner_model_lanes");
    process.exit(0);
  }
  for (const f of allFindings) {
    console.error(`FLAG  ${f.rel}:${f.line}  [${f.kind}] ${f.detail}`);
  }
  console.error(`\n${allFindings.length} finding(s). Fix the registry row and re-export, then run:  node scripts/render-rule-blocks.js --write`);
  process.exit(1);
}

main();
