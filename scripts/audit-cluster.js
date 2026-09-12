#!/usr/bin/env node
// DeepBench v7.0.465 | scripts/audit-cluster.js | AGT-70
// FEATURE: AGT-70 slice 2 -- the judgment lane. Slice 1 turned the five homes into 4,054 statements
// and ran the one detector that needs no model (byte-equal text in two homes). Everything the
// Auditor actually exists for -- two live statements that disagree on one number, a parameter the
// lane rejects, a document whose purpose another now serves -- is judgment, and judgment is a model
// call. This script is the three steps around that call: BUILD the clusters, RUN one call each,
// COLLECT and reconcile what came back against the ledger.
//
// WHY CLUSTERS AT ALL, AND WHY A CAP. 4,054 statements is 8.2 million pairs; no budget reads that,
// and a model handed the whole corpus answers about the corpus rather than about two statements.
// Anchor clustering of this tree yields 1,170 candidate clusters (MEASURED 2026-09-12), which is
// still a week of calls. So --build takes the top `max-clusters` (default 12) after a deliberate
// ordering: SPREAD first (a cluster whose statements come from several different SOURCES -- a
// runner_settings row and a runbook paragraph -- is where a contradiction can live at all; five
// paragraphs of one doc agreeing with each other is not), then HOMES, then name for determinism.
//
// THE PRIOR CLUSTERS COME FIRST AND THEY ARE THE CONTROL. A run that only reads new anchors can
// never tell "the corpus is clean this week" from "the run found nothing because it looked
// somewhere else". So every OPEN ledger row is rebuilt into a cluster of the statements its own
// locations resolve to -- the model is handed that material BLIND (it is never told a finding was
// filed there) and --collect reports how many of them came back. A re-found fingerprint is the
// lane proving it can still see what a human saw. A prior row whose locations resolve to fewer than
// two statements is UNRUNNABLE and is printed as such rather than quietly skipped: it means the
// corpus does not hold both sides, which is a fact about the extractor, not about the finding.
//
// VERBATIM QUOTATION IS ENFORCED BY CODE AFTER THE TURN, NEVER TRUSTED. validateFindings() drops
// any finding citing a location no cluster statement has, or whose quoted `text` is not a substring
// of that statement's FULL text -- the untruncated one, read from the statement table by id, so a
// cluster's 1,200-char cut can never make a true quotation look invented. A finding that cannot be
// navigated to is not evidence, and a paraphrase in an append-only ledger is permanent.
//
// THIS SCRIPT NEVER WRITES TO audit_findings. --collect writes a candidates FILE; filing is
// scripts/audit-ledger.js --ingest --apply, run by John after he reads it. The two are deliberately
// not the same command: an unknown number of model-found rows appended to a ledger that renders on
// the standing brief is board flooding, and the ledger refuses every DELETE.
//
// Usage:
//   node scripts/audit-cluster.js --build --statements=<json> --week=<YYYY-Www> --out-dir=<dir>
//                                 [--max-clusters=12] [--no-db]
//   node scripts/audit-cluster.js --run --dir=<dir> --cycle-id=<uuid> [--limit=N] [--dry-run]
//   node scripts/audit-cluster.js --collect --dir=<dir> --statements=<json> --week=<YYYY-Www>
//                                 --out=<json> [--no-db]
//
// Exit codes (the contract slice 1's scripts keep): 0 ran; 2 could not run -- bad input, missing
// credentials, a REST failure, or a refused log row. NEVER a pass.
//
// §19k: every model call is followed by scripts/agent-log.js, and a non-zero exit from it STOPS the
// run. The log row is mandatory, not best-effort -- a judgment lane that answers without logging is
// exactly the unmeasured spend .claude/rules/capability-logging.md exists to prevent.

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { normalize, locationKey, fingerprint } from "./audit-ledger.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const MAX_STATEMENTS = 40;
export const TEXT_CAP = 1200;
export const JACCARD_MERGE = 0.6;
export const WINDOW_CHARS = 40;
export const WINDOW_STEP = 20;
export const DEFAULT_MAX_CLUSTERS = 12;

// The five kinds, as the au-*-intent rows' traits.schema states them. Restated here because this
// script is the code half of that schema -- a kind outside the enum is dropped, not corrected.
export const FINDING_KINDS = new Set([
  "duplicate", "contradiction", "redundant", "stale-or-irrelevant", "competing-purpose",
]);
export const CONFIDENCES = new Set(["high", "medium", "low"]);
export const MAX_GOVERNING_FACT = 300;
export const MAX_PROPOSED_RESOLUTION = 400;

// --- pure half (imported by the regression test; no network, no disk, no process.exit) ----------

const SNAKE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const TICKET = /\b[A-Z]{2,5}-\d{1,3}[a-z]?\b/g;
const BACKTICKED = /`([^`\n]{3,40})`/g;
const IDENTIFIER_SPAN = /^[A-Za-z0-9_.\-\/:]+$/;
const SLUG_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const FILE_LOCATION = /\.(md|js|json|yml)$/;

// An anchor is a token two statements can only share on purpose: a snake_case column or setting, a
// ticket id, a backticked identifier, or -- for a DATABASE location, never a file one -- the slug
// segment in the middle of the location itself (`skill_profiles/pz-rank-intent/method` anchors on
// `pz-rank-intent`, which is how seven Skill rows of one agent find each other). Bare numbers are
// dropped: `2026` in two unrelated paragraphs is not a shared subject.
export function anchorsOf(st) {
  const out = new Set();
  const text = String(st?.text ?? "");
  for (const m of text.matchAll(SNAKE)) out.add(m[0]);
  for (const m of text.matchAll(TICKET)) out.add(m[0]);
  for (const m of text.matchAll(BACKTICKED)) {
    const inner = m[1].replace(/\(\)$/, "");
    if (IDENTIFIER_SPAN.test(inner)) out.add(inner);
  }
  const key = locationKey(st?.location ?? "");
  if (!FILE_LOCATION.test(key)) {
    const first = key.indexOf("/");
    const last = key.lastIndexOf("/");
    if (first >= 0 && last > first) {
      for (const seg of key.slice(first + 1, last).split("/")) {
        if (SLUG_SEGMENT.test(seg)) out.add(seg);
      }
    }
  }
  for (const a of [...out]) if (/^\d+$/.test(a)) out.delete(a);
  return out;
}

// The task file's statement shape. `corpus` is carried on the in-memory cluster (capabilityFor
// reads it) and projected away by taskStatement() when the file is written, so the file matches the
// design's stated shape exactly and the routing decision still has the field it needs.
function emitStatement(st, textCap) {
  const full = String(st.text ?? "");
  return {
    id: st.id,
    corpus: st.corpus,
    source: st.source,
    location: st.location,
    text: full.slice(0, textCap),
    retired: !!st.retired,
    truncated: full.length > textCap,
  };
}

export function taskStatement(s) {
  const { id, source, location, text, retired, truncated } = s;
  return { id, source, location, text, retired, truncated };
}

function jaccard(a, b) {
  let shared = 0;
  for (const id of a) if (b.has(id)) shared++;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

export function buildClusters(statements, { maxStatements = MAX_STATEMENTS, textCap = TEXT_CAP } = {}) {
  const index = new Map();
  for (const st of statements ?? []) {
    for (const a of anchorsOf(st)) {
      if (!index.has(a)) index.set(a, []);
      index.get(a).push(st);
    }
  }

  const candidates = [];
  for (const [name, members] of index) {
    if (members.length < 2 || members.length > maxStatements) continue;
    const homes = new Set(members.map(m => locationKey(m.location)));
    if (homes.size < 2) continue;  // one home repeating itself is not two homes disagreeing
    candidates.push({
      name,
      kind: "anchor",
      spread: new Set(members.map(m => m.source)).size,
      homes: homes.size,
      members,
    });
  }

  candidates.sort((a, b) => (b.spread - a.spread) || (b.homes - a.homes) || a.name.localeCompare(b.name));

  // Anchors overlap heavily -- `interval_hours` and `runner_settings` often index the same four
  // statements, and paying for the same call twice is the cost that matters here. The FIRST in the
  // sort order wins, so the survivor is always the wider-spread one.
  const kept = [];
  const keptIds = [];
  for (const c of candidates) {
    const ids = new Set(c.members.map(m => m.id));
    if (keptIds.some(prev => jaccard(ids, prev) >= JACCARD_MERGE)) continue;
    keptIds.push(ids);
    kept.push({
      name: c.name,
      kind: "anchor",
      spread: c.spread,
      homes: c.homes,
      statements: c.members.map(m => emitStatement(m, textCap)),
    });
  }
  return kept;
}

// Windows of 40 chars at step 20 over the LEDGER's quoted text, matched against the statement's
// normalized text. A whole-string match would fail on any re-wrap or ellipsis; a single short
// window would match stock phrasing. 40/20 is the pair that survives an edit to one end of a quote.
function windowsOf(text) {
  const n = normalize(text);
  if (n.length <= WINDOW_CHARS) return n ? [n] : [];
  const out = [];
  for (let i = 0; i < n.length; i += WINDOW_STEP) {
    const w = n.slice(i, i + WINDOW_CHARS);
    if (w.length > 0) out.push(w);
    if (i + WINDOW_CHARS >= n.length) break;
  }
  return out;
}

export function locateStatements(statements, loc) {
  const key = locationKey(loc?.location ?? "");
  const windows = windowsOf(loc?.text ?? "");
  if (!windows.length) return [];
  return (statements ?? []).filter(s => {
    if (locationKey(s.location) !== key) return false;
    const hay = normalize(s.text);
    return windows.some(w => hay.includes(w));
  });
}

export function priorClusters(rows, statements, { textCap = TEXT_CAP } = {}) {
  const clusters = [];
  const unrunnable = [];
  for (const row of rows ?? []) {
    if (row.status !== "open") continue;
    const locations = Array.isArray(row.locations) ? row.locations : [];
    const byId = new Map();
    let located = 0;
    for (const loc of locations) {
      const hits = locateStatements(statements, loc);
      if (hits.length) located++;
      for (const h of hits) if (!byId.has(h.id)) byId.set(h.id, h);
    }
    if (located >= 2) {
      clusters.push({
        name: `prior-${row.fingerprint}`,
        kind: "prior",
        statements: [...byId.values()].map(s => emitStatement(s, textCap)),
      });
    } else {
      unrunnable.push({ fingerprint: row.fingerprint, located, total: locations.length });
    }
  }
  return { clusters, unrunnable };
}

// Routing, not judgment: a cluster made only of agent-data statements is the Auditor's
// `audit-agent-data` capability, anything else is `audit-governance-corpus`. A mixed cluster goes to
// the corpus capability on purpose -- its knowledge section covers both homes, the agent-data one
// does not, and the wrong Skill text is worse than the broader one.
export function capabilityFor(cluster) {
  const sts = cluster?.statements ?? [];
  const allAgentData = sts.length > 0 && sts.every(s => s.corpus === "agent-data");
  return allAgentData
    ? { capability: "audit-agent-data", intent: "au-agent-data-intent" }
    : { capability: "audit-governance-corpus", intent: "au-corpus-intent" };
}

export function validateFindings(result, cluster, byId) {
  const dropped = [];
  const kept = [];
  if (!Array.isArray(result?.findings)) {
    return { kept, dropped: [{ finding: null, reason: "result.findings is not an array" }] };
  }
  const clusterStatements = cluster?.statements ?? [];

  for (const f of result.findings) {
    const drop = reason => dropped.push({ finding: f, reason });
    if (!f || typeof f !== "object") { drop("finding is not an object"); continue; }
    if (!FINDING_KINDS.has(f.kind)) { drop(`kind "${f?.kind}" is not one of the five`); continue; }
    if (!CONFIDENCES.has(f.confidence)) { drop(`confidence "${f?.confidence}" is not high/medium/low`); continue; }
    if (typeof f.governing_fact !== "string" || f.governing_fact.length > MAX_GOVERNING_FACT) {
      drop(`governing_fact must be a string of at most ${MAX_GOVERNING_FACT} chars`); continue;
    }
    if (typeof f.proposed_resolution !== "string" || f.proposed_resolution.length > MAX_PROPOSED_RESOLUTION) {
      drop(`proposed_resolution must be a string of at most ${MAX_PROPOSED_RESOLUTION} chars`); continue;
    }
    if (!Array.isArray(f.locations) || f.locations.length < 1) { drop("locations must hold at least one entry"); continue; }

    let bad = null;
    for (const entry of f.locations) {
      if (!entry || typeof entry.location !== "string" || typeof entry.text !== "string" || entry.text.trim() === "") {
        bad = `a location entry is not {location, text}`; break;
      }
      const quoted = normalize(entry.text);
      const ok = clusterStatements.some(cs => {
        if (cs.location !== entry.location) return false;
        const full = normalize(byId?.get(cs.id)?.text ?? cs.text);
        return full.includes(quoted);
      });
      if (!ok) { bad = `"${entry.location}" is not a cluster statement whose full text carries that quotation`; break; }
    }
    if (bad) { drop(bad); continue; }
    kept.push(f);
  }
  return { kept, dropped };
}

// Two shared location HOMES, not one: a finding citing `docs/ARCHITECTURE.md` and one citing it plus
// a runner_settings row are about different disputes, and the ledger's own fingerprint is coarse
// enough that a one-home overlap would re-found almost anything. Exactness is reported separately
// rather than required -- a re-found finding worded differently is still the lane seeing the same
// thing, and only the byte-equal count says the fingerprint itself would collide.
export function reconcile(findings, rows) {
  const ledger = rows ?? [];
  const verdicts = [];
  const summary = { new: 0, reFound: 0, ruledOut: 0, exact: 0 };
  for (const f of findings ?? []) {
    const keys = (f?.locations ?? []).map(l => locationKey(l.location));
    const keySet = new Set(keys);
    let match = null;
    let row = null;
    for (const r of ledger) {
      const rowKeys = new Set((r.locations ?? []).map(l => locationKey(l.location)));
      let shared = 0;
      for (const k of keySet) if (rowKeys.has(k)) shared++;
      if (shared >= 2) { row = r; match = r.fingerprint; break; }
    }
    let verdict = "new";
    if (row) {
      verdict = row.status === "not-a-defect" ? "ruled-out" : "re-found";
      if (fingerprint(f) === row.fingerprint) summary.exact++;
    }
    if (verdict === "new") summary.new++;
    else if (verdict === "re-found") summary.reFound++;
    else summary.ruledOut++;
    verdicts.push({ finding: f, verdict, match });
  }
  return { verdicts, summary };
}

// The only hand-composed text in this slice, and it exists for one measured reason: the Auditor's
// agents/skill_profiles/capabilities rows do NOT exist yet (their seed is gated on John), so
// scripts/agent-prompt.js has nothing to assemble. This prompt is ORIENTATION ONLY -- it names the
// file the Skill text lives in and the rows to read, and states nothing about the audit itself. The
// moment an `agents` row `auditor` exists, --run takes the assembled path instead with no edit here.
export function EXCEPTION_PROMPT(cap, intent, seedAbs, taskAbs) {
  return `You are running the capability ${cap} for DeepBench. Your Skill text is the au-identity, au-knowledge-homes, au-behavior, ${intent} and au-guardrails rows in ${seedAbs} — Read that file and follow those five rows as your identity, knowledge, behavior, intent and guardrails; ignore its other rows and comments. Your task_context is the JSON object at ${taskAbs} — Read it; its task_context field carries cluster, statements and prior. Return ONE JSON object matching the ${intent} row's traits.schema and nothing else — no prose, no fences.`;
}

// A cluster name is an anchor and may carry `/`, `:` or `.` (`scripts/audit-ledger.js` is a real
// one). The file name is sanitized; the real name lives inside the file, and --collect reads it
// from there rather than parsing it back out of the path.
export function taskFileName(index, name) {
  const safe = String(name).replace(/[^A-Za-z0-9_.-]/g, "-");
  return `${String(index).padStart(2, "0")}-${safe}`;
}

// --- CLI -----------------------------------------------------------------------------------------

function fail(code, msg) {
  console.error(`audit-cluster: ${msg}`);
  process.exit(code);
}

function arg(argv, name) {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq < 0 ? true : hit.slice(eq + 1);
}

function creds() {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) fail(2, "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set, or pass --no-db (exit 2 = could not run, never a pass).");
  return { base, key };
}

async function restGet(base, key, q) {
  let res;
  try {
    res = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
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

function readStatements(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(String(file)), "utf8"));
    if (!Array.isArray(parsed)) throw new Error("the statement file is not an array");
    return parsed;
  } catch (e) {
    fail(2, `could not read --statements=${file}: ${e.message}`);
  }
}

function requireWeek(week) {
  if (!week || !/^\d{4}-W\d{2}$/.test(String(week))) fail(2, `--week must be YYYY-Www (got ${week ?? "nothing"}).`);
  return String(week);
}

async function doBuild(argv) {
  const statements = readStatements(arg(argv, "statements"));
  const week = requireWeek(arg(argv, "week"));
  const outDir = arg(argv, "out-dir");
  if (typeof outDir !== "string") fail(2, "--out-dir=<dir> is required.");
  const noDb = arg(argv, "no-db") === true;
  const maxClusters = Number(arg(argv, "max-clusters") ?? DEFAULT_MAX_CLUSTERS);
  if (!Number.isInteger(maxClusters) || maxClusters < 1) fail(2, `--max-clusters must be a positive integer (got ${arg(argv, "max-clusters")}).`);

  let rows = [];
  if (!noDb) {
    const { base, key } = creds();
    rows = await restGet(base, key, "audit_findings?select=*");
  }

  const prior = priorClusters(rows, statements);
  const anchors = buildClusters(statements);
  const clusters = [...prior.clusters, ...anchors].slice(0, maxClusters);
  const priorFingerprints = rows.filter(r => r.iso_week === week).map(r => r.fingerprint);

  fs.mkdirSync(path.resolve(outDir), { recursive: true });
  clusters.forEach((c, i) => {
    const { capability, intent } = capabilityFor(c);
    const doc = {
      capability,
      intent,
      cluster_kind: c.kind,
      task_context: {
        cluster: c.name,
        statements: c.statements.map(taskStatement),
        prior: priorFingerprints,
      },
    };
    const file = path.join(path.resolve(outDir), `${taskFileName(i + 1, c.name)}.task.json`);
    fs.writeFileSync(file, JSON.stringify(doc, null, 2), "utf8");
  });

  const p = clusters.filter(c => c.kind === "prior").length;
  console.log(`build ${week}: ${clusters.length} clusters (${p} prior, ${clusters.length - p} anchor), ${prior.unrunnable.length} prior unrunnable`);
  for (const u of prior.unrunnable) {
    console.log(`  unrunnable ${u.fingerprint}: ${u.located}/${u.total} located`);
  }
  process.exit(0);
}

function taskFiles(dir) {
  let names;
  try {
    names = fs.readdirSync(path.resolve(dir));
  } catch (e) {
    fail(2, `could not read --dir=${dir}: ${e.message}`);
  }
  return names.filter(n => n.endsWith(".task.json")).sort();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// The model's answer arrives as `result` inside the CLI's own JSON envelope. Cutting from the first
// `{` to the last `}` is how a model that prefaced its object with a sentence still gets read; a
// failure here is recorded as {error, raw} rather than thrown, so one unparseable cluster never
// costs the other eleven their calls.
function parseModelResult(stdout) {
  let envelope;
  try {
    envelope = JSON.parse(stdout);
  } catch (e) {
    return { error: `the CLI envelope is not JSON: ${e.message}`, raw: String(stdout).slice(0, 4000) };
  }
  const text = String(envelope?.result ?? "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) {
    return { error: "the answer carries no JSON object", raw: text.slice(0, 4000), envelope };
  }
  try {
    return { object: JSON.parse(text.slice(first, last + 1)), envelope };
  } catch (e) {
    return { error: `the answer's JSON object did not parse: ${e.message}`, raw: text.slice(0, 4000), envelope };
  }
}

async function doRun(argv) {
  const dir = arg(argv, "dir");
  if (typeof dir !== "string") fail(2, "--dir=<dir> is required.");
  const cycleId = arg(argv, "cycle-id");
  const dryRun = arg(argv, "dry-run") === true;
  const noDb = arg(argv, "no-db") === true;
  if (!dryRun && typeof cycleId !== "string") fail(2, "--cycle-id=<uuid> is required: every logged call names the cycle it ran in.");
  const limitRaw = arg(argv, "limit");
  const limit = limitRaw === undefined ? Infinity : Number(limitRaw);
  if (!(limit > 0)) fail(2, `--limit must be a positive integer (got ${limitRaw}).`);

  const absDir = path.resolve(dir);
  const seedAbs = path.join(ROOT, "docs", "design", "agt-70-auditor-seed.sql");

  let model = "";
  let assembled = false;
  if (noDb) {
    model = String(arg(argv, "model") ?? "");
    if (!model) fail(2, "--run --no-db needs --model=<id>: the lane model is read from runner_model_lanes otherwise.");
  } else {
    const { base, key } = creds();
    const lanes = await restGet(base, key, "runner_model_lanes?select=lane,model_id&lane=eq.judgment");
    model = String(lanes?.[0]?.model_id ?? "");
    if (!model) fail(2, "runner_model_lanes has no `judgment` row -- the lane model is read live, never a literal.");
    const agents = await restGet(base, key, "agents?id=eq.auditor&select=id");
    assembled = Array.isArray(agents) && agents.length > 0;
  }

  const pending = taskFiles(absDir).filter(n => !fs.existsSync(path.join(absDir, n.replace(/\.task\.json$/, ".result.json"))));
  let done = 0;
  for (const name of pending) {
    if (done >= limit) break;
    done++;
    const taskAbs = path.join(absDir, name);
    const stem = name.replace(/\.task\.json$/, "");
    const task = readJson(taskAbs);
    const cap = task.capability;
    const intent = task.intent;

    let prompt;
    let source;
    let callModel = model;
    if (assembled) {
      source = "assembled";
      const a = spawnSync(process.execPath, [
        path.join(ROOT, "scripts", "agent-prompt.js"), "--agent=auditor",
        `--capability=${cap}`, `--intent=${intent}`, `--task=${JSON.stringify(task.task_context)}`,
      ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      if (a.status !== 0) fail(2, `agent-prompt.js exited ${a.status} for ${stem}: ${(a.stderr ?? "").slice(0, 400)}`);
      prompt = a.stdout;
      const j = spawnSync(process.execPath, [
        path.join(ROOT, "scripts", "agent-prompt.js"), "--agent=auditor",
        `--capability=${cap}`, `--intent=${intent}`, `--task=${JSON.stringify(task.task_context)}`, "--json",
      ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      if (j.status === 0) {
        try {
          const stored = JSON.parse(j.stdout)?.llm?.model;
          if (stored) callModel = stored;
        } catch { /* the lane model stands */ }
      }
    } else {
      source = "exception:seed-file";
      prompt = EXCEPTION_PROMPT(cap, intent, seedAbs, taskAbs);
    }

    if (dryRun) {
      console.log(`run ${stem.slice(0, 2)} ${task.task_context.cluster}: dry · ${source} · ${callModel}`);
      continue;
    }

    const spawned = spawnSync("claude", [
      "-p", "--model", callModel, "--allowedTools", "Read", "--output-format", "json", "--max-turns", "6",
    ], { input: prompt, cwd: absDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

    const resultFile = path.join(absDir, `${stem}.result.json`);
    if (spawned.error || spawned.status !== 0) {
      fs.writeFileSync(resultFile, JSON.stringify({
        error: `claude -p exited ${spawned.status}: ${spawned.error?.message ?? (spawned.stderr ?? "").slice(0, 400)}`,
        raw: String(spawned.stdout ?? "").slice(0, 4000),
      }, null, 2), "utf8");
      console.log(`run ${stem.slice(0, 2)} ${task.task_context.cluster}: error · ${source} · ${callModel}`);
      continue;
    }

    const parsed = parseModelResult(spawned.stdout);
    const usage = parsed.envelope?.usage ?? {};
    const inTok = Number(usage.input_tokens ?? 0) + Number(usage.cache_creation_input_tokens ?? 0) + Number(usage.cache_read_input_tokens ?? 0);
    const outTok = Number(usage.output_tokens ?? 0);
    const latency = Number(parsed.envelope?.duration_api_ms ?? 0);

    // §19k. The log row is written for EVERY call that reached the model, including one whose answer
    // did not parse -- the tokens were spent either way, and an unlogged call is the hole this
    // whole path exists to close. A refused log stops the run.
    const log = spawnSync(process.execPath, [
      path.join(ROOT, "scripts", "agent-log.js"), "--agent=auditor",
      `--capability=${cap}`, `--model=${callModel}`, `--ai-type=${cap}`,
      `--feature=${cap}:${intent}:depth1`,
      `--input-tokens=${inTok}`, `--output-tokens=${outTok}`, `--latency-ms=${latency}`,
      `--cycle=${cycleId}`, "--json",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (log.status !== 0) {
      fail(2, `agent-log.js refused the row for ${stem} (exit ${log.status}): ${(log.stderr ?? "").trim().slice(0, 400)}`);
    }
    let loggedId = null;
    try { loggedId = JSON.parse(log.stdout).id; } catch { /* printed below as null */ }

    const runBlock = {
      model: callModel, prompt_source: source,
      input_tokens: inTok, output_tokens: outTok,
      duration_api_ms: latency, num_turns: parsed.envelope?.num_turns ?? null,
      logged_id: loggedId,
    };
    const body = parsed.error
      ? { error: parsed.error, raw: parsed.raw, run: runBlock }
      : { ...parsed.object, run: runBlock };
    fs.writeFileSync(resultFile, JSON.stringify(body, null, 2), "utf8");

    const k = Array.isArray(body.findings) ? body.findings.length : "error";
    console.log(`run ${stem.slice(0, 2)} ${task.task_context.cluster}: ${k} findings · ${source} · ${callModel} · in ${inTok} out ${outTok} · log ${loggedId}`);
  }
  process.exit(0);
}

async function doCollect(argv) {
  const dir = arg(argv, "dir");
  if (typeof dir !== "string") fail(2, "--dir=<dir> is required.");
  const statements = readStatements(arg(argv, "statements"));
  const week = requireWeek(arg(argv, "week"));
  const out = arg(argv, "out");
  if (typeof out !== "string") fail(2, "--out=<json> is required.");
  const noDb = arg(argv, "no-db") === true;

  let rows = [];
  if (!noDb) {
    const { base, key } = creds();
    rows = await restGet(base, key, "audit_findings?select=*");
  }

  const byId = new Map(statements.map(s => [s.id, s]));
  const absDir = path.resolve(dir);

  let clusters = 0, returned = 0, dropped = 0, reFound = 0, exact = 0, ruledOut = 0;
  const reFoundFps = [];
  const newFindings = [];
  let firstModel = "";

  for (const name of taskFiles(absDir)) {
    const resultFile = path.join(absDir, name.replace(/\.task\.json$/, ".result.json"));
    if (!fs.existsSync(resultFile)) continue;
    clusters++;
    const task = readJson(path.join(absDir, name));
    let result;
    try {
      result = readJson(resultFile);
    } catch (e) {
      dropped++;
      continue;
    }
    if (!firstModel && result?.run?.model) firstModel = String(result.run.model);
    if (result?.error) { dropped++; continue; }  // unparseable: the call ran, the answer did not

    const cluster = { name: task.task_context.cluster, statements: task.task_context.statements };
    const v = validateFindings(result, cluster, byId);
    returned += Array.isArray(result.findings) ? result.findings.length : 0;
    dropped += v.dropped.length;

    const { verdicts, summary } = reconcile(v.kept, rows);
    reFound += summary.reFound;
    ruledOut += summary.ruledOut;
    exact += summary.exact;
    for (const r of verdicts) {
      if (r.verdict === "re-found" && r.match && !reFoundFps.includes(r.match)) reFoundFps.push(r.match);
      if (r.verdict === "new") newFindings.push(r.finding);
    }
  }

  const outAbs = path.resolve(out);
  const doc = {
    week,
    found_by: `auditor:judgment:${firstModel}`,
    note: `candidates from the judgment run — NOT ingested; John reads, then node scripts/audit-ledger.js --ingest=${out} --week=${week} --cycle-id=<cycle> --apply`,
    findings: newFindings,
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(doc, null, 2), "utf8");

  console.log(`collect ${week}: ${clusters} clusters, ${returned} returned, ${dropped} dropped, ${reFound} re-found [${reFoundFps.join(",")}], ${exact} exact, ${ruledOut} ruled-out, ${newFindings.length} new -> ${out}`);
  process.exit(0);
}

async function main() {
  const argv = process.argv.slice(2);
  if (arg(argv, "build") !== undefined) return doBuild(argv);
  if (arg(argv, "run") !== undefined) return doRun(argv);
  if (arg(argv, "collect") !== undefined) return doCollect(argv);
  fail(2, "nothing to do: pass --build, --run or --collect (see this file's header).");
}

// SES-176's contract: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
