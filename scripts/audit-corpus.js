#!/usr/bin/env node
// DeepBench v7.0.528 | scripts/audit-corpus.js | AGT-70 / SES-411
// FEATURE: SES-422 slice 3 (SES-411) -- the THIRD deterministic detector: a rule read against the
// function that actually enforces it.
//
// detectRuleFunctionDrift() is the first detector whose corpus is a FUNCTION BODY. The platform
// keeps one fact -- "which refusals does the pre-boot gate apply" -- in four homes: the body's
// `THEN '<reason>'` literals, the function's own COMMENT enumeration, the `governance_rules` rows
// that name the function, and the closed REASONS set tests/regression/ses-297-pre-boot-pickability
// .test.mjs ranges over. Nothing compared them until now, and SES-410 is the proof it matters: a
// live edit on 2026-09-15 removed `weekly_pace` from the body while M5-16 went on saying the gate
// applies it. The captured pre-SES-410 body is still in runner_migration_downs, so the detector has
// a real drifted control to be tested against rather than a synthetic one.
//
// THE CLOSED SET IS IMPORTED, NEVER RESTATED -- same rule as NO_TEMPERATURE_PREFIXES above. REASONS
// is the ses-297 test's own list of the seven refusals; a copy of it here would be a second home
// for exactly the kind of claim this tool exists to find. The import is inert: that module's work
// is behind selfRun(), so importing it runs nothing.
//
// BODY-SUBSET IS NEVER ASSERTED, and that asymmetry is deliberate. A `THEN` literal with no rule
// and no comment entry may be a column pick rather than a refusal -- `final_day_rest_pct` is one
// live today -- and a detector that filed it would file a false contradiction into an append-only
// ledger. Every line runs the other way: something a rule, the comment or REASONS NAMES that the
// body does not do.
//
// ONE FINDING PER FUNCTION, never one per mismatched token -- the AGT-70 rule, for the AGT-70
// reason: the ledger is append-only and N rows to rule individually is board flooding. The
// mismatch lines are joined into the pg_proc location's text, so nothing is lost.
//
// pg_proc IS NOT REACHABLE FROM PostgREST, so the rows come from public.rule_enforcing_functions()
// (migration ses411_rule_enforcing_functions, service_role only -- anon and authenticated hold no
// EXECUTE). `drift not-run` is printed, never `drift 0`, on every path that did not read it.
// FEATURE: AGT-70 slice 4 -- the SECOND deterministic detector, and the Auditor auditing itself.
//
// detectStaleParameters() finds a stored parameter the model's own API rejects: a `temperature` on
// a Skill row whose `llm_model` is a family listed in shared/models.js's NO_TEMPERATURE_PREFIXES.
// That is one of the five kinds (`stale-or-irrelevant`) and it needs no model to see -- the fact is
// two columns of one row read against one exported list.
//
// THE LIST IS IMPORTED, NEVER RESTATED, and the finding's own last location names the file it came
// from. shared/models.js:70 is the ONE code home for which models reject the parameter (SES-334
// wrote it there after a live 400), and a copy of `["claude-fable-"]` in this file would be a
// second home for exactly the kind of claim this tool exists to find -- the detector would be a
// defect of the class it detects. Citing the list as a LOCATION is the other half: a reader of the
// finding is sent to the authority, not to the detector.
//
// ONE FINDING, NOT ONE PER ROW. Twenty-two Skill rows carrying a stale temperature are twenty-two
// symptoms of one fact, and the ledger is append-only: twenty-two rows to rule individually is the
// board flooding the whole ticket is written to prevent. The locations list carries every offender,
// so nothing is lost -- the finding is navigable to all of them.
//
// --agent=<id> RE-AIMS THE SAME CORPUS AT ONE AGENT, through the link tables rather than a name
// match: agent_capability_assignments -> capabilities -> capability_skill_profiles -> skill_profiles.
// It is the self-audit the Auditor's own seed has to pass before John applies it, and it is a
// generic table read with a filter -- never a route, never a write, never a model call.
//
// FEATURE: AGT-70 slice 2 -- two measured exemptions (generated docs out of the file list, fenced
// procedures and prefixed rule renders out of the detector); see corpusFiles/detectDuplicates below.
// FEATURE: AGT-70 slice 1 -- the statement extractor. Turns the five homes the platform's rules
// actually live in into one flat statement table, and runs the ONE deterministic detector that
// needs no model at all: byte-equal text in two homes.
//
// A STATEMENT IS {id, corpus, source, location, text, retired}. `location` is the real identifier
// of the thing -- `docs/runbooks/runner-cycle.md:626`, `skill_profiles/pz-identity/temperature`,
// `governance_rules/OD-01` -- never a summary, because a finding that cannot be navigated to is
// not evidence. `id` is sha256(location|text) cut to 12 hex so the same statement carries the same
// id across runs (a later slice compares this week's statements to last week's).
//
// RETIRED IS THE WHOLE DIFFICULTY, and it is why this extractor exists rather than a grep. This
// repo deliberately keeps superseded wording in place under a `RETIRED IN PLACE` marker, so the
// record of what changed survives. Those passages are byte-identical to their live twins by
// design. A duplicate detector that cannot see the marker reports every one of them, and the first
// weekly report is then a list of the platform's own good habits. So a statement is `retired` when
//   (a) `RETIRED IN PLACE` is in its paragraph, or
//   (b) `RETIRED IN PLACE` is in the paragraph DIRECTLY ABOVE it -- the marker-then-passage shape
//       the docs actually use, which (a) alone misses entirely, or
//   (c) the paragraph's FIRST 160 CHARS carry a RETIREMENT_VOCAB term.
// The 160-char cap in (c) is load-bearing and measured, not a round number: the fixture's own P2
// ends "...citing the retirement ledger or the decision that made one side true", so an uncapped
// vocabulary scan marks a live paragraph retired for MENTIONING retirement near its end. The cap
// keeps (c) to paragraphs that OPEN by announcing they are history.
//
// RETIREMENT_VOCAB and enclosingParagraph are IMPORTED from check-session-docs.js, never copied.
// That file's own check 9 decides what counts as retirement-aware prose for the whole repo; two
// copies of that vocabulary would drift, and the passage this one missed would be the finding.
//
// THE DETECTOR IS DELIBERATELY NARROW. detectDuplicates only groups statements whose NORMALIZED
// text is 120+ chars and byte-equal after normalization. Near-duplicates, contradictions and
// competing purposes are judgment and belong to the model lane (slice 2); a fuzzy threshold here
// would file its own false positives into an append-only ledger, where they are permanent. A group
// is a finding only when it spans 2+ distinct locationKeys -- the same text twice in one file is
// one home repeating itself, not two homes disagreeing -- and a group equal to a live
// governance_rules statement is skipped, because a rule quoted in its own canonical doc is the
// sanctioned restatement, not a defect (the same exemption check-session-docs.js check 12 makes).
//
// Usage:
//   node scripts/audit-corpus.js [--corpus=<dir>] [--no-db] [--out=<json>] [--detect[=<json>]]
//   node scripts/audit-corpus.js --agent=<id> [--out=<json>] [--detect[=<json>]]
//
//   --corpus=<dir>  Extract markdown from this directory's *.md INSTEAD of the real file list.
//                   Used by the regression test's fixture corpus.
//   --agent=<id>    Audit ONE agent's own rows, reached through the capability link tables. DB
//                   only: refuses --no-db and --corpus, and exits 2 when the agent has no Skill
//                   rows (exit 2 is "could not run", never "clean").
//   --no-db         Skip every database source. Without it, credentials are required.
//   --out=<json>    Write the statement table to that path.
//   --detect[=json] Write the findings to that path (bare --detect prints them instead).
//
// DETECTION ALWAYS RUNS and the printed `duplicates d` is always the real count -- the flag decides
// where the findings GO, not whether they are computed. That is a deliberate reading: the detector
// is pure and in-memory, and a summary line that prints `duplicates 0` because nobody passed a flag
// is exactly the false all-clear check-session-docs.js's own header refuses.
//
// THIS SCRIPT NEVER WRITES TO THE DATABASE and never writes under .claude/ (those rule files are a
// READ source here). Appending findings is scripts/audit-ledger.js --ingest --apply, separately.
//
// Exit codes: 0 ran; 2 could not run (missing credentials without --no-db, unreadable corpus).

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { RETIREMENT_VOCAB, enclosingParagraph, PROCEDURE_GENERATED_DOCS } from "./check-session-docs.js";
import { normalize, locationKey } from "./audit-ledger.js";
import { supportsTemperature, NO_TEMPERATURE_PREFIXES } from "../shared/models.js";
import { REASONS } from "../tests/regression/ses-297-pre-boot-pickability.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const MIN_STATEMENT_CHARS = 40;   // a markdown unit shorter than this is a label, not a claim
export const MIN_DUPLICATE_CHARS = 120;  // below this, byte-equality is coincidence (headings, stock phrases)
export const RETIREMENT_HEAD_CHARS = 160;
export const RETIRED_MARKER = "RETIRED IN PLACE";

// --- pure half (no network, no disk, no process.exit) -----------------------------------------

function statementId(location, text) {
  return createHash("sha256").update(`${location}|${text}`, "utf8").digest("hex").slice(0, 12);
}

function mkStatement(corpus, source, location, text, retired = false) {
  return { id: statementId(location, text), corpus, source, location, text, retired };
}

// HTML comments are blanked rather than removed so every index and line number after the first
// comment still points at the real line (check-session-docs.js's check 12 records the bug the
// other way round: reading one string and slicing another windows the wrong passage).
export function blankHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, " "));
}

function paragraphAbove(text, index) {
  const a = text.lastIndexOf("\n\n", index);
  if (a < 0) return "";
  return enclosingParagraph(text, Math.max(0, a - 1));
}

function isRetiredAt(text, index) {
  const para = enclosingParagraph(text, index);
  if (para.includes(RETIRED_MARKER)) return true;
  if (paragraphAbove(text, index).includes(RETIRED_MARKER)) return true;
  const head = para.slice(0, RETIREMENT_HEAD_CHARS).toLowerCase();
  return RETIREMENT_VOCAB.some(term => head.includes(term));
}

// Units are blank-line paragraphs, list items and fenced blocks -- the three things a markdown file
// says one claim in. Returns statements at `<rel>:<line>`.
export function extractMarkdown(rel, raw) {
  const text = blankHtmlComments(String(raw).replace(/\r\n/g, "\n"));
  const lines = text.split("\n");
  // Character offset of the start of each line, so a unit can be located in `text` for the
  // retirement test without re-searching for its content (which would find the wrong copy when a
  // paragraph is duplicated in the same file -- exactly the case this tool exists to find).
  const offsets = [];
  let acc = 0;
  for (const line of lines) { offsets.push(acc); acc += line.length + 1; }

  const units = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      const start = i;
      const marker = fence[1];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(marker)) i++;
      if (i < lines.length) i++; // the closing fence
      units.push({ start, body: lines.slice(start, i).join("\n") });
      continue;
    }

    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const start = i;
      i++;
      // A list item runs until a blank line, a new item, or a fence.
      while (i < lines.length && !/^\s*$/.test(lines[i])
             && !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])
             && !/^\s*(?:```|~~~)/.test(lines[i])) i++;
      units.push({ start, body: lines.slice(start, i).join("\n") });
      continue;
    }

    const start = i;
    while (i < lines.length && !/^\s*$/.test(lines[i])
           && !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])
           && !/^\s*(?:```|~~~)/.test(lines[i])) i++;
    units.push({ start, body: lines.slice(start, i).join("\n") });
  }

  const out = [];
  for (const u of units) {
    const body = u.body.trim();
    if (body.length < MIN_STATEMENT_CHARS) continue;
    out.push(mkStatement("governance", "file", `${rel}:${u.start + 1}`, body, isRetiredAt(text, offsets[u.start])));
  }
  return out;
}

// The pure half of the skill_profiles source, so the test can feed it fixture rows.
export function extractSkillRows(rows) {
  const out = [];
  const textFields = ["objective", "method", "output_desc", "description", "notes"];
  for (const r of rows ?? []) {
    const at = field => `skill_profiles/${r.slug}/${field}`;
    for (const f of textFields) {
      if (r[f] != null && String(r[f]).trim() !== "") out.push(mkStatement("agent-data", "skill_profiles", at(f), String(r[f])));
    }
    const traits = r.traits ?? {};
    for (const f of ["reasoning_style", "writing_style"]) {
      if (traits[f] != null && String(traits[f]).trim() !== "") {
        out.push(mkStatement("agent-data", "skill_profiles", at(`traits.${f}`), String(traits[f])));
      }
    }
    const guardrails = r.guardrails ?? {};
    for (const band of ["must", "must_not"]) {
      const list = Array.isArray(guardrails[band]) ? guardrails[band] : [];
      list.forEach((v, idx) => {
        if (v != null && String(v).trim() !== "") {
          out.push(mkStatement("agent-data", "skill_profiles", at(`guardrails.${band}[${idx}]`), String(v)));
        }
      });
    }
    // The three scalars are statements in their own right: a stored parameter the lane rejects is a
    // claim that is false in live voice, which is one of the five kinds.
    for (const f of ["llm_model", "temperature", "max_tokens"]) {
      out.push(mkStatement("agent-data", "skill_profiles", at(f), `${f}=${r[f] ?? "null"}`));
    }
  }
  return out;
}

// AGT-70 slice 2. Two exemptions the first live run measured, both narrowing the detector rather
// than loosening it -- 9 duplicates on this tree, 9 of them already somebody else's finding.
//
// (1) A FENCED BLOCK IS CHECK 13'S, NOT THIS ONE'S. check-session-docs.js check 13 reads a wider
// document set than this detector does and already flags identical fenced procedures as "one
// procedure, two live homes" -- with its own comment-stripping normalizer and its own generated-doc
// exemption. Two tools filing the same defect into an APPEND-ONLY ledger is not redundancy, it is a
// permanent double row; and the weaker of the two reads would be this one. So a statement whose
// text opens a fence is skipped here entirely and the procedure question stays in one place.
// MEASURED on this tree: the `UPDATE public.backlog_items ... claimed_by` claim SQL, live in
// docs/GOVERNANCE-MODES.md:48 and docs/runbooks/runner-cycle.md:2585, which check 13 names today.
//
// (2) A RULE RENDERED WITH ITS OWN PREFIX IS STILL THE SANCTIONED RESTATEMENT. The exact-equality
// test slice 1 shipped misses the shape the repo actually uses: scripts/render-rule-blocks.js emits
// `> **Rule B40** — <statement>`, so the normalized statement is a SUFFIX of the rendered key, never
// equal to it. That rendered block appears in every doc the rule governs by design. `endsWith` is
// the right relation and not a fuzzy one: the rule's own text must still be present byte-for-byte
// after normalization, only the render's lead-in may differ. Empty rule texts are dropped first --
// `"".endsWith` is true of everything and would exempt the whole corpus.
//
// (2b) A MULTI-LINE RULE RENDERS AS A MULTI-LINE BLOCKQUOTE, AND THE SUFFIX TEST COULD NOT SEE ONE
// (SES-404's live red, measured 2026-09-16). The exemption above was written against a one-line
// render, where `> **Rule X** — ` is a pure lead-in. `governance_rules.statement` may hold several
// lines -- AGENT-ROW-AGREED-TICKET holds four -- and render-rule-blocks.js quotes EVERY line, so the
// rendered text carries a `> ` the registry's own statement does not, in the MIDDLE of the string
// where no `endsWith` can reach it. The result was a false duplicate for every multi-line rule
// rendered into the two or more docs it governs by design: AGENT-ROW-AGREED-TICKET, live in
// docs/ARCHITECTURE.md and .claude/rules/agent-roster-inert.md, reddened the whole suite from
// v7.0.497 and gated four consecutive runner cycles. So the comparison strips the blockquote marks
// from BOTH sides first, and that is the only thing it relaxes: `> ` at a line start is render
// syntax, never a statement's own content, and every other byte must still match as before. The
// grouping key is untouched -- two hand-written copies of the same paragraph are still one finding.
export function detectDuplicates(statements, ruleTexts = []) {
  const unquote = t => String(t ?? "").replace(/^[ \t]*>[ \t]?/gm, "");
  const ruleNorms = (ruleTexts ?? [])
    .map(t => normalize(unquote(typeof t === "string" ? t : t?.statement)))
    .filter(t => t.length > 0);
  const ruleSet = new Set(ruleNorms);
  const isSanctionedRestatement = raw => {
    const key = normalize(unquote(raw));
    return ruleSet.has(key) || ruleNorms.some(r => key.endsWith(r));
  };

  const groups = new Map();
  for (const s of statements) {
    if (s.retired) continue;
    if (/^\s*(```|~~~)/.test(String(s.text))) continue; // a fenced procedure is check 13's finding
    const key = normalize(s.text);
    if (key.length < MIN_DUPLICATE_CHARS) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const findings = [];
  for (const [key, members] of groups) {
    // A live rule quoted in its own home is not a defect. The RAW text is what is tested, never the
    // grouping key: `normalize()` has already collapsed the render's newlines, and a `> ` that has
    // become ` > ` mid-string is no longer at a line start for `unquote()` to strip.
    if (isSanctionedRestatement(members[0].text)) continue;
    const homes = new Set(members.map(m => locationKey(m.location)));
    if (homes.size < 2) continue;
    findings.push({
      kind: "duplicate",
      confidence: "high",
      governing_fact: members[0].text.slice(0, 200),
      locations: members.map(m => ({ location: m.location, text: m.text })),
      proposed_resolution: "keep one home; render or link from the others",
    });
  }
  // Stable order so --detect output and any later fingerprinting are reproducible run to run.
  findings.sort((a, b) => a.locations[0].location.localeCompare(b.locations[0].location));
  return findings;
}

// AGT-70 slice 4. The second deterministic detector -- see this file's header for why the list is
// imported and cited rather than restated, and why twenty-two offending rows are ONE finding.
//
// THE MODEL COMES FROM THE SIBLING STATEMENT, not from the row object, because this function's
// input is the statement TABLE -- the same flat shape the file corpus and the database corpus both
// reduce to, which is what lets the test feed it fixture rows and the CLI feed it live ones.
// `skill_profiles/<slug>/temperature` and `skill_profiles/<slug>/llm_model` are emitted as a pair
// by extractSkillRows(), so the slug is the join key.
//
// A TEMPERATURE STATEMENT WITH NO SIBLING MODEL STATEMENT IS SKIPPED, never assumed. Unknown model
// means unknown capability, and supportsTemperature()'s own contract for an unknown id is "keep
// today's behaviour" -- filing a finding on a row whose lane nobody could read would be the
// detector inventing the fact it is supposed to measure.
//
// `temperature=null` is the CORRECT state and is skipped by text rather than by parsing: that is
// exactly the string extractSkillRows() writes for a null column, so the check reads the statement
// as it will appear in the ledger. Any other value -- 0 included, and 0 is the live case -- stands.
export function detectStaleParameters(statements) {
  const modelBySlug = new Map();
  for (const s of statements ?? []) {
    const m = /^skill_profiles\/(.+)\/llm_model$/.exec(String(s?.location ?? ""));
    if (m) modelBySlug.set(m[1], String(s.text ?? "").replace(/^llm_model=/, ""));
  }

  const offenders = [];
  for (const s of statements ?? []) {
    const m = /^skill_profiles\/(.+)\/temperature$/.exec(String(s?.location ?? ""));
    if (!m) continue;
    const text = String(s.text ?? "");
    if (text === "temperature=null") continue;
    if (!modelBySlug.has(m[1])) continue;
    if (supportsTemperature(modelBySlug.get(m[1]))) continue;
    offenders.push({ location: s.location, text });
  }
  if (!offenders.length) return [];

  offenders.sort((a, b) => String(a.location).localeCompare(String(b.location)));
  return [{
    kind: "stale-or-irrelevant",
    confidence: "high",
    governing_fact: "temperature stored for a model whose API rejects temperature",
    locations: [
      ...offenders,
      {
        location: "shared/models.js:NO_TEMPERATURE_PREFIXES",
        text: `NO_TEMPERATURE_PREFIXES=${JSON.stringify(NO_TEMPERATURE_PREFIXES)}`,
      },
    ],
    proposed_resolution: "Set temperature NULL on every row whose llm_model starts with a NO_TEMPERATURE_PREFIXES prefix (shared/models.js): the executor drops the field for that family, so the stored value is a statement that is false in live voice. Skill-row edits are gated — one directive, one edit.",
  }];
}

// SES-411. The closed sets, keyed by proname. IMPORTED, never restated -- see the header.
export const CLOSED_SETS = { runner_should_boot: REASONS };

export const RULE_ID = /\bM\d-\d\d\b/g;
const SNAKE = /^[a-z]+(?:_[a-z]+)+$/;
const THEN = /THEN\s+'([a-z_-]+)'/g;

// SES-411 -- the third deterministic detector. Pure: `rules` are governance_rules rows
// ({id, statement, status}), `fns` are public.rule_enforcing_functions() rows, `closedSets` maps a
// proname to its closed reason list.
//
// THREE READERS, ONE BODY.
//   (A) A LIVE RULE THAT NAMES THE FUNCTION AND A REFUSAL. The statement is split into clauses on
//       `. ` / `; ` -- and the trailing space is load-bearing, because `runner_settings.meter_stale_hours`
//       and `detail.judgment_model` would otherwise each split a clause in half and the function
//       name would land in a different piece from the refusal it governs. A clause binds only if it
//       carries the function by its backticked name; M5-16's other two clauses mention
//       `public.judgment_model()` and a refusal that is explicitly NOT this gate's, and binding
//       them would file `judgment_model` as a missing branch of runner_should_boot.
//   (B) THE COMMENT'S OWN ENUMERATION. Items split on a comma that is not inside parentheses --
//       `meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours)` is ONE item live today,
//       and a plain `,` split makes it two, one of which parses as nothing.
//   (C) EVERY RULE ID THE COMMENT CITES, which is the anchor for a rule that governs the gate
//       without naming a refusal -- M5-06 and M6-09 both do exactly that, so (A) alone would never
//       notice either of them going retired.
//
// A CITED RULE THAT IS NOT LIVE IS A MISMATCH LINE, and a cited id with no row at all reads
// `missing` rather than being skipped: a comment pointing at a rule the register does not have is
// the same defect as one pointing at a retired rule, and silently dropping it is the vacuous green.
export function detectRuleFunctionDrift(rules, fns, closedSets = {}) {
  const ruleRows = (rules ?? []).filter(r => r && r.id != null);
  const byId = new Map(ruleRows.map(r => [String(r.id), r]));
  const findings = [];

  for (const fn of fns ?? []) {
    const proname = String(fn?.proname ?? "");
    const identity = String(fn?.identity ?? proname);
    const definition = String(fn?.definition ?? "");
    const comment = String(fn?.comment ?? "");
    const overloads = Number(fn?.overloads);

    const thenLiterals = new Set([...definition.matchAll(THEN)].map(m => m[1]));
    const closedRaw = closedSets?.[proname];
    const closedSet = Array.isArray(closedRaw) ? closedRaw.map(String) : null;

    // (A)
    const bound = new Set();
    const involved = new Set();
    for (const r of ruleRows) {
      if (String(r.status) !== "live") continue;
      for (const clause of String(r.statement ?? "").split(/[.;]\s+/)) {
        if (!clause.includes("`public." + proname + "()`")) continue;
        for (const m of clause.matchAll(/refus[a-z]*[^`]*?`([^`]+)`/gi)) {
          if (!SNAKE.test(m[1])) continue;
          bound.add(m[1]);
          involved.add(String(r.id));
        }
      }
    }

    // (B)
    const enumerated = [];
    const block = /refusals[^:]*:\s*([^;]*);/i.exec(comment);
    if (block) {
      for (const raw of block[1].split(/,(?![^()]*\))/)) {
        const m = /^([a-z_]+)(?:\s*\(([^)]*)\))?$/.exec(raw.trim());
        if (!m) continue;
        enumerated.push({ token: m[1], rules: (m[2] ?? "").match(RULE_ID) ?? [] });
      }
    }

    // (C)
    for (const id of comment.match(RULE_ID) ?? []) involved.add(id);
    for (const e of enumerated) for (const id of e.rules) involved.add(id);

    const lines = [];
    const add = line => { if (!lines.includes(line)) lines.push(line); };

    for (const id of [...involved].sort()) {
      const row = byId.get(id);
      const status = row ? String(row.status) : "missing";
      if (status !== "live") add(`${id} is ${status}, not live`);
    }

    // The overload check is .claude/rules/supabase-function-signature.md as a detector: two
    // signatures live at once is an ambiguity PostgREST reports to its caller as an empty result.
    if (!Number.isFinite(overloads) || overloads !== 1) add(`overloads ${fn?.overloads}`);

    for (const token of new Set([...bound, ...enumerated.map(e => e.token)])) {
      if (!thenLiterals.has(token)) add(`body lacks ${token}`);
      if (closedSet && !closedSet.includes(token)) add(`REASONS lacks ${token}`);
    }
    if (closedSet) {
      for (const reason of closedSet) if (!thenLiterals.has(reason)) add(`body lacks ${reason}`);
    }

    if (!lines.length) continue;

    const ruleIds = [...involved].sort();
    findings.push({
      kind: "contradiction",
      confidence: "high",
      governing_fact: `the refusals ${identity} enforces vs the rules, comment and REASONS that name them`,
      locations: [
        { location: `pg_proc/${identity}`, text: lines.join("; ") },
        ...ruleIds.map(id => ({
          location: `governance_rules/${id}`,
          text: byId.has(id) ? String(byId.get(id).statement ?? "") : "(no such governance_rules row)",
        })),
        {
          location: "tests/regression/ses-297-pre-boot-pickability.test.mjs:REASONS",
          text: closedSet ? `REASONS=${JSON.stringify(closedSet)}` : "no closed set is declared for this function",
        },
      ],
      proposed_resolution: "restore the refusal or amend the register row — the rule is John's (SES-410)",
    });
  }

  findings.sort((a, b) => a.locations[0].location.localeCompare(b.locations[0].location));
  return findings;
}

// --- sources -----------------------------------------------------------------------------------

function readIfPresent(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return null;
  }
}

function globMd(dirRel) {
  try {
    return fs.readdirSync(path.join(ROOT, dirRel))
      .filter(f => f.endsWith(".md"))
      .sort()
      .map(f => `${dirRel}/${f}`);
  } catch {
    return [];
  }
}

// The five homes' file half. `.claude/` is a READ source here and is never written.
//
// AGT-70 slice 2 -- PROCEDURE_GENERATED_DOCS is subtracted, and it is IMPORTED from
// check-session-docs.js rather than restated. A doc in that Set is rendered from another doc by a
// script and held byte-identical to it by a regression test (SES-377: docs/runbooks/cycle-card.md is
// rendered from docs/runbooks/runner-cycle.md). Extracting both sides puts every rendered passage in
// the corpus twice, so the detector reports the render as a second home -- 7 of the 9 duplicates
// this tree carried. A GENERATED view cannot drift from its source, which is the only thing a
// duplicate finding is protecting against. Importing the Set is the load-bearing half: the day a
// second generated doc is added there, this list follows it without an edit here, and the
// regression test asserts exactly that (part E+) rather than asserting a literal filename.
export function corpusFiles() {
  const rels = [
    "CLAUDE.md", "CLAUDE-DESIGN.md", "CLAUDE-RULES.md", "CLAUDE-STATE.md",
    "docs/SELFBUILD-CHARTER.md", "docs/GOVERNANCE-MODES.md", "docs/ARCHITECTURE.md",
    ...globMd("docs").filter(r => /\/RUNNER-GOV-[^/]*\.md$/.test(r)),
    ...globMd("docs/runbooks"),
    ...globMd(".claude/rules"),
  ];
  return [...new Set(rels)]
    .filter(rel => !PROCEDURE_GENERATED_DOCS.has(rel))
    .filter(rel => fs.existsSync(path.join(ROOT, rel)));
}

function flattenJson(rel, value, prefix, depth, out) {
  if (depth >= 3 || value === null || typeof value !== "object") {
    out.push(mkStatement("governance", "config", `${rel}:${prefix}`, `${prefix}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => flattenJson(rel, v, `${prefix}[${i}]`, depth + 1, out));
    return;
  }
  for (const [k, v] of Object.entries(value)) {
    flattenJson(rel, v, prefix ? `${prefix}.${k}` : k, depth + 1, out);
  }
}

// A minimal indentation walker -- no new dependency, and the corpus only needs `key.path=value`
// statements, never a faithful YAML object graph.
export function extractYaml(rel, raw) {
  const out = [];
  const stack = [];
  for (const line of String(raw).replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = line.match(/^(\s*)-?\s*([A-Za-z0-9_.\-"']+):\s*(.*)$/);
    if (!m) continue;
    const [, indent, key, value] = m;
    while (stack.length && stack[stack.length - 1].indent >= indent.length) stack.pop();
    const keyPath = [...stack.map(s => s.key), key.replace(/["']/g, "")].slice(0, 3).join(".");
    stack.push({ indent: indent.length, key: key.replace(/["']/g, "") });
    if (value.trim() === "") continue;
    out.push(mkStatement("governance", "config", `${rel}:${keyPath}`, `${keyPath}=${value.trim()}`));
  }
  return out;
}

export function extractScriptHeader(rel, raw) {
  const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
  const header = [];
  for (const line of lines) {
    if (line.startsWith("#!")) continue;
    if (line.startsWith("//")) { header.push(line); continue; }
    if (/^\s*$/.test(line) && header.length === 0) continue;
    break;
  }
  const body = header.join("\n").trim();
  if (body.length < MIN_STATEMENT_CHARS) return [];
  return [mkStatement("governance", "script-header", `${rel}:1`, body)];
}

async function restGet(base, key, q) {
  const res = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`GET ${q} -> HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function databaseStatements(base, key) {
  const out = [];
  // SES-411: the same whole-table read serves the corpus AND the drift gate -- id/statement/status
  // is already everything detectRuleFunctionDrift() needs, so the gate costs no extra request.
  const rules = await restGet(base, key, "governance_rules?select=id,statement,status");
  for (const r of rules) {
    if (r.statement == null || String(r.statement).trim() === "") continue;
    out.push(mkStatement("governance", "governance_rules", `governance_rules/${r.id}`, String(r.statement), r.status !== "live"));
  }
  const directives = await restGet(base, key, "runner_directives?select=id,body,status&status=eq.open");
  for (const d of directives) {
    if (d.body == null || String(d.body).trim() === "") continue;
    out.push(mkStatement("governance", "runner_directives", `runner_directives/${d.id}`, String(d.body)));
  }
  const settings = await restGet(base, key, "runner_settings?select=*&id=eq.1");
  for (const [k, v] of Object.entries(settings[0] ?? {})) {
    out.push(mkStatement("governance", "runner_settings", `runner_settings/1/${k}`, `${k}=${v}`));
  }
  const lanes = await restGet(base, key, "runner_model_lanes?select=lane,model_id");
  for (const l of lanes) {
    out.push(mkStatement("governance", "runner_model_lanes", `runner_model_lanes/${l.lane}`, `${l.lane}=${l.model_id}`));
  }

  const skills = await restGet(base, key, "skill_profiles?select=slug,objective,method,output_desc,description,notes,traits,guardrails,llm_model,temperature,max_tokens");
  out.push(...extractSkillRows(skills));
  const caps = await restGet(base, key, "capabilities?select=slug,description");
  for (const c of caps) {
    if (c.description == null || String(c.description).trim() === "") continue;
    out.push(mkStatement("agent-data", "capabilities", `capabilities/${c.slug}/description`, String(c.description)));
  }
  const agents = await restGet(base, key, "agents?select=id,bio");
  for (const a of agents) {
    if (a.bio == null || String(a.bio).trim() === "") continue;
    out.push(mkStatement("agent-data", "agents", `agents/${a.id}/bio`, String(a.bio)));
  }
  // pg_proc is not reachable through PostgREST; ses411_rule_enforcing_functions is the read, and it
  // is service_role-only. GET works because the function is STABLE.
  const fns = await restGet(base, key, "rpc/rule_enforcing_functions");
  return {
    statements: out,
    liveRuleTexts: rules.filter(r => r.status === "live").map(r => r.statement),
    rules,
    fns,
  };
}

// AGT-70 slice 4 -- ONE agent's own material, reached through the link tables. §19b/Rule #1: these
// are generic table reads with an id filter, never a route and never a per-agent code path; the
// same five reads serve any agent id, and the Auditor is simply the first caller.
//
// THE WALK IS agent -> agent_capability_assignments -> capabilities -> capability_skill_profiles
// -> skill_profiles, and it has to be, because a Skill row's slug prefix is a naming convention and
// not a link. Matching `au-*` by name would audit whatever happened to be called that, would miss a
// row the agent really holds under another prefix, and would report a clean result for an agent
// whose capability links were never made -- which is the exact failure this returns exit 2 for.
async function agentStatements(base, key, agentId) {
  const out = [];
  const agents = await restGet(base, key, `agents?select=id,bio&id=eq.${encodeURIComponent(agentId)}`);

  const assignments = await restGet(base, key, `agent_capability_assignments?select=capability_slug&agent_id=eq.${encodeURIComponent(agentId)}`);
  const caps = [...new Set(assignments.map(a => a.capability_slug).filter(Boolean))];

  let capRows = [];
  let slugs = [];
  if (caps.length) {
    capRows = await restGet(base, key, `capabilities?select=slug,description&slug=in.(${caps.join(",")})`);
    const links = await restGet(base, key, `capability_skill_profiles?select=skill_profile_slug&capability_slug=in.(${caps.join(",")})`);
    slugs = [...new Set(links.map(l => l.skill_profile_slug).filter(Boolean))];
  }

  let skills = [];
  if (slugs.length) {
    skills = await restGet(base, key, `skill_profiles?select=slug,objective,method,output_desc,description,notes,traits,guardrails,llm_model,temperature,max_tokens&slug=in.(${slugs.join(",")})`);
  }
  // ZERO SKILL ROWS IS EXIT 2, NOT A CLEAN PASS. An agent with no rows has nothing to be stale, so
  // every detector returns [] and the summary line would read `duplicates 0 stale 0` -- a green
  // that means "could not run" is the one outcome the whole exit-code contract exists to refuse.
  if (!skills.length) return { statements: null, skillCount: 0 };

  out.push(...extractSkillRows(skills));
  for (const c of capRows) {
    if (c.description == null || String(c.description).trim() === "") continue;
    out.push(mkStatement("agent-data", "capabilities", `capabilities/${c.slug}/description`, String(c.description)));
  }
  for (const a of agents) {
    if (a.bio == null || String(a.bio).trim() === "") continue;
    out.push(mkStatement("agent-data", "agents", `agents/${a.id}/bio`, String(a.bio)));
  }
  return { statements: out, skillCount: skills.length };
}

// --- CLI ---------------------------------------------------------------------------------------

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

async function main() {
  const argv = process.argv.slice(2);
  const corpusDir = arg(argv, "corpus");
  const noDb = arg(argv, "no-db") === true;
  const agentId = arg(argv, "agent");

  const statements = [];

  // --agent is a DIFFERENT corpus, not a filter over the normal one: no files, no config, no
  // script headers, and no live rule texts (a rule is not an agent's own statement, and passing
  // them here would exempt a Skill row for quoting one). Combining it with --no-db or --corpus is
  // refused rather than silently narrowed -- both would leave it reading nothing it was asked for.
  if (typeof agentId === "string") {
    if (noDb || typeof corpusDir === "string") {
      console.error("audit-corpus: --agent=<id> reads the database and only the database; it cannot be combined with --no-db or --corpus (exit 2 = could not run, never a pass).");
      process.exit(2);
    }
    const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!base || !key) {
      console.error("audit-corpus: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set for --agent=<id> (exit 2 = could not run, never a pass).");
      process.exit(2);
    }
    let walked;
    try {
      walked = await agentStatements(base, key, agentId);
    } catch (e) {
      console.error(`audit-corpus: ${e.message}`);
      process.exit(2);
    }
    if (!walked.statements) {
      console.error(`audit-corpus: --agent=${agentId} has no Skill rows (no such agent, or no capability links) -- not run (exit 2 = could not run, never a pass).`);
      process.exit(2);
    }
    statements.push(...walked.statements);
    // --agent reads one agent's own rows; it never reads the rule register or pg_proc, so the drift
    // gate is NOT RUN here and must say so rather than print a 0 it did not measure.
    report(argv, statements, [], null);
    return;
  }

  if (typeof corpusDir === "string") {
    const rels = globMd(corpusDir.replace(/\\/g, "/").replace(/\/+$/, ""));
    if (!rels.length) {
      console.error(`audit-corpus: --corpus=${corpusDir} has no .md files (exit 2 = could not run, never a pass).`);
      process.exit(2);
    }
    for (const rel of rels) statements.push(...extractMarkdown(rel, readIfPresent(rel) ?? ""));
  } else {
    for (const rel of corpusFiles()) statements.push(...extractMarkdown(rel, readIfPresent(rel) ?? ""));
    for (const rel of [".claude/settings.json", "vercel.json"]) {
      const raw = readIfPresent(rel);
      if (raw == null) continue;
      try { flattenJson(rel, JSON.parse(raw), "", 0, statements); } catch { /* a malformed config is check-session-docs's business, not a corpus hole */ }
    }
    const ci = readIfPresent(".github/workflows/ci.yml");
    if (ci != null) statements.push(...extractYaml(".github/workflows/ci.yml", ci));
    for (const f of fs.readdirSync(path.join(ROOT, "scripts")).filter(f => f.endsWith(".js")).sort()) {
      statements.push(...extractScriptHeader(`scripts/${f}`, readIfPresent(`scripts/${f}`) ?? ""));
    }
  }

  let liveRuleTexts = [];
  let gate = null;
  if (!noDb) {
    const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_KEY ?? "";
    if (!base || !key) {
      console.error("audit-corpus: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set, or pass --no-db (exit 2 = could not run, never a pass).");
      process.exit(2);
    }
    try {
      const db = await databaseStatements(base, key);
      statements.push(...db.statements);
      liveRuleTexts = db.liveRuleTexts;
      // --corpus replaces the file half with a FIXTURE, so the live rules and the live function
      // bodies are not that run's corpus. Reporting drift there would attribute a live platform
      // fact to a fixture run; `not-run` is the honest answer.
      if (typeof corpusDir !== "string") gate = { rules: db.rules, fns: db.fns };
    } catch (e) {
      console.error(`audit-corpus: ${e.message}`);
      process.exit(2);
    }
  }

  report(argv, statements, liveRuleTexts, gate);
}

// Both detectors run on every path -- the bare `--detect` and the `--detect=<json>` file and the
// summary line all read the SAME two arrays, so the printed `duplicates d stale s` is always the
// real pair. The stale finding prints as a count rather than as its locations because it carries
// twenty-three of them live and a summary that scrolls is not a summary.
function report(argv, statements, liveRuleTexts, gate = null) {
  const duplicates = detectDuplicates(statements, liveRuleTexts);
  const stale = detectStaleParameters(statements);
  // SES-411: `gate` is null on every path that did not read the rule register AND pg_proc
  // (--no-db, --corpus, --agent). `drift not-run` then prints instead of `drift 0` -- a 0 that
  // nobody measured is the false all-clear this file's header refuses.
  const drift = gate ? detectRuleFunctionDrift(gate.rules, gate.fns, CLOSED_SETS) : null;
  const findings = [...duplicates, ...stale, ...(drift ?? [])];

  const outPath = arg(argv, "out");
  if (typeof outPath === "string") {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(path.resolve(outPath), JSON.stringify(statements, null, 2), "utf8");
  }
  const detect = arg(argv, "detect");
  if (typeof detect === "string") {
    fs.mkdirSync(path.dirname(path.resolve(detect)), { recursive: true });
    fs.writeFileSync(path.resolve(detect), JSON.stringify({ findings }, null, 2), "utf8");
  } else if (detect === true) {
    for (const f of duplicates) {
      console.log(`  duplicate · ${f.locations.map(l => l.location).join(" == ")}`);
    }
    for (const f of stale) {
      console.log(`  stale-or-irrelevant · ${f.locations.length} locations`);
    }
    for (const f of drift ?? []) {
      console.log(`  contradiction · ${f.locations[0].location} · ${f.locations[0].text}`);
    }
  }

  const gov = statements.filter(s => s.corpus === "governance").length;
  const agentData = statements.filter(s => s.corpus === "agent-data").length;
  const retired = statements.filter(s => s.retired).length;
  console.log(`statements ${statements.length} (governance ${gov}, agent-data ${agentData}, retired ${retired}) duplicates ${duplicates.length} stale ${stale.length} drift ${drift ? drift.length : "not-run"}`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
