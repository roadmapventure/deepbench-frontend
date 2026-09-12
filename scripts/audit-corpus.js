#!/usr/bin/env node
// DeepBench v7.0.465 | scripts/audit-corpus.js | AGT-70
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
//
//   --corpus=<dir>  Extract markdown from this directory's *.md INSTEAD of the real file list.
//                   Used by the regression test's fixture corpus.
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
export function detectDuplicates(statements, ruleTexts = []) {
  const ruleNorms = (ruleTexts ?? [])
    .map(t => normalize(typeof t === "string" ? t : t?.statement))
    .filter(t => t.length > 0);
  const ruleSet = new Set(ruleNorms);
  const isSanctionedRestatement = key => ruleSet.has(key) || ruleNorms.some(r => key.endsWith(r));

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
    if (isSanctionedRestatement(key)) continue; // a live rule quoted in its own home is not a defect
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
  return { statements: out, liveRuleTexts: rules.filter(r => r.status === "live").map(r => r.statement) };
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

  const statements = [];
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
    } catch (e) {
      console.error(`audit-corpus: ${e.message}`);
      process.exit(2);
    }
  }

  const findings = detectDuplicates(statements, liveRuleTexts);

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
    for (const f of findings) {
      console.log(`  duplicate · ${f.locations.map(l => l.location).join(" == ")}`);
    }
  }

  const gov = statements.filter(s => s.corpus === "governance").length;
  const agentData = statements.filter(s => s.corpus === "agent-data").length;
  const retired = statements.filter(s => s.retired).length;
  console.log(`statements ${statements.length} (governance ${gov}, agent-data ${agentData}, retired ${retired}) duplicates ${findings.length}`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
