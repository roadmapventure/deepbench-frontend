#!/usr/bin/env node
// DeepBench v7.0.561 | scripts/personal-agent.js | AGT-84 -- the call path for a personal-lane agent
// run inside a Claude session: read its records, assemble its prompt, write its answer back, and
// fetch public job postings. First caller: jerry (Jerry Maguire, the career agent, lane personal).
//
// WHY A SCRIPT OF ITS OWN AND NOT FLAGS ON agent-prompt.js. agent-prompt.js takes the task_context
// on the command line (--task=<json>) and Windows caps argv (the AGT-86 gotcha); a render carries 30+
// records, which will not fit. So the records are read and handed to the assembly IN-PROCESS here.
// agent-prompt.js is the shared governance surface and stays untouched; this file imports its two
// exports and adds only the read map, the write and the postings fetch (pattern:8, pattern:17).
//
// ONE ASSEMBLY PATH (§19b). This script builds NO prompt text. It calls assemblePrompt() -- the same
// function api/capabilities/execute.js calls -- then resolveJudgmentModel() and renderAssembly()
// from agent-prompt.js. The task_context carries no `goal`, so db-assembly.js renders it as the
// TASK DETAILS section (AI-44), one `key: JSON` line per field, exactly as the executor would.
//
// AGENT-AGNOSTIC (§19d/§19e Rule #1, pattern:13). The agent id is a flag; the read map is keyed by
// capability slug, never by agent. The name jerry appears only in these comments -- the regression
// guard (tests/regression/agt-84-personal-agent.test.mjs) greps for it outside `//` lines.
//
// PRIVATE DATA. career_records is service-key only (AGT-82). This script prints counts, ids and the
// assembled prompt to the file or stream the caller names; it never writes a record to the repo.
//
// USAGE (credentials by NAME from public.runner_secrets, exported inline, never printed)
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/personal-agent.js \
//     --render --agent=jerry --capability=career-resume-review [--target=pe-saas] [--ask=<text>]
//     [--input-file=<path>] [--out=<path>] [--json]
//   ... --write --agent=jerry --capability=career-resume-review --answer=<json | path to .json>
//     [--session-name=<n>]
//   ... --fetch-postings --agent=jerry
//
// --render   reads the capability's kinds (READ_MAP) plus its `correction` records, assembles, and
//            prints the header + prompt (to --out when given); stderr `# model: <id>`; --json prints
//            {model, records_loaded, prompt_bytes} on stdout.
// --write    validates the answer (validateAnswer), then inserts records_to_write with
//            source '<slug> <ISO date>' and one `log` row '<slug> ran' whose data is the answer's
//            non-array top-level fields -- ONE insert statement, so nothing half-writes. Prints
//            {inserted, ids}. --answer takes inline JSON or a path to a JSON file (the runbook's
//            <scratch>.json), because an answer, like the records, can outgrow Windows argv.
// --fetch-postings  per watch_company record with data.board in greenhouse|lever|ashby and a
//            data.board_token, fetch the public board, keep product titles or a target's
//            data.titles entry, drop urls already stored, insert `posting` rows (status new).
//            A failed board is printed and skipped, never fabricated.
//
// EXIT CODES: 0 ok; 2 missing/invalid input or credential, a refused answer, or a failed read/write.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js';

// Same tenant agent-prompt.js measured: every agent_configs / assignment row carries 'global'.
const TENANT = 'global';

// The eleven kinds career_records_kind_check allows (measured 2026-09-23 from pg_constraint).
export const KINDS = [
  'resume_fact', 'target', 'ladder_rung', 'network_contact', 'log', 'market_requirement',
  'evidence', 'posting', 'watch_company', 'correction', 'review',
];

// What each capability reads. Keyed by capability slug, never by agent (kickoff §4).
const PROFILE = ['resume_fact', 'target', 'ladder_rung', 'evidence'];
export const READ_MAP = {
  'career-resume-review': PROFILE,
  'career-intro-pitch': PROFILE,
  'career-cover-letter': PROFILE,
  'career-strengths-gaps': PROFILE,
  'career-posting-review': PROFILE,
  'career-match-finder': [...PROFILE, 'posting'],
  'career-interview-prep': ['resume_fact', 'target', 'network_contact', 'log'],
  'career-outreach-plan': ['network_contact', 'target'],
  'career-market-watch': ['target', 'market_requirement', 'watch_company'],
  'career-evidence-mining': ['evidence', 'resume_fact', 'target'],
  'career-growth-review': ['ladder_rung', 'target', 'log', 'review'],
};

// A kind-level read filter: match-finder reads only postings not yet reviewed (data.status = new).
const KIND_FILTERS = { posting: rec => rec?.data?.status === 'new' };

// The evidence sources the design named, read-only (git log, files). Paths only -- no remote, no
// credential. deepbench-personal is the personal-lane clone of dev -- never the shared checkout
// C:/Projects/deepbench-frontend, which is deliberately stale. The last entry is a single file.
export const REPOS = [
  'C:/Projects/deepbench-personal',
  'C:/Projects/deepbench-backend',
  'C:/Projects/nigp-analyzer',
  'C:/Projects/interviewquestions',
  'C:/Projects/interviewquestions-evidence',
  'C:/Projects/john-leonard-profile.md',
];

const BOARDS = ['greenhouse', 'lever', 'ashby'];
const RECORD_FIELDS = 'id,kind,title,body,data,target_row';

function fail(message) {
  console.error(`personal-agent: ${message}`);
  process.exit(2);
}

// The answer's records_to_write, checked before anything is written: every item needs a kind the
// table allows and a non-empty title. Returns {ok} or {error}; nothing is written on an error.
export function validateAnswer(answer) {
  if (answer === null || typeof answer !== 'object' || Array.isArray(answer)) {
    return { error: 'the answer must be a JSON object' };
  }
  const items = answer.records_to_write;
  if (!Array.isArray(items)) return { error: 'the answer carries no records_to_write array' };
  for (const [i, item] of items.entries()) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { error: `records_to_write[${i}] is not an object` };
    }
    if (!KINDS.includes(item.kind)) return { error: `records_to_write[${i}] has unknown kind "${item.kind}"` };
    if (typeof item.title !== 'string' || !item.title.trim()) {
      return { error: `records_to_write[${i}] (${item.kind}) has no title` };
    }
    if (item.data !== undefined && (item.data === null || typeof item.data !== 'object' || Array.isArray(item.data))) {
      return { error: `records_to_write[${i}].data must be an object` };
    }
  }
  return { ok: true };
}

// Keep postings whose title word-matches "product" (case-insensitive) or contains one of the
// targets' data.titles entries; drop any url already stored and any url repeated in the batch.
export function pickPostings(postings, titles = [], existingUrls = []) {
  const seen = new Set(existingUrls);
  const wanted = (titles || []).filter(t => typeof t === 'string' && t.trim()).map(t => t.trim().toLowerCase());
  const kept = [];
  for (const p of postings || []) {
    if (!p?.url || !p?.title) continue;
    const title = String(p.title);
    const lower = title.toLowerCase();
    const match = /\bproduct\b/i.test(title) || wanted.some(t => lower.includes(t));
    if (!match || seen.has(p.url)) continue;
    seen.add(p.url);
    kept.push(p);
  }
  return kept;
}

// One board's public JSON -> [{title, url, text}]. Shapes are the boards' documented public APIs.
const stripHtml = html => String(html || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function normalizeBoard(board, json) {
  if (board === 'greenhouse') {
    return (json?.jobs || []).map(j => ({ title: j.title, url: j.absolute_url, text: stripHtml(j.content) }));
  }
  if (board === 'lever') {
    return (Array.isArray(json) ? json : []).map(j => ({ title: j.text, url: j.hostedUrl, text: j.descriptionPlain || stripHtml(j.description) }));
  }
  if (board === 'ashby') {
    return (json?.jobs || []).map(j => ({ title: j.title, url: j.jobUrl, text: j.descriptionPlain || stripHtml(j.descriptionHtml) }));
  }
  return [];
}

function boardUrl(board, token) {
  const t = encodeURIComponent(token);
  if (board === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`;
  if (board === 'lever') return `https://api.lever.co/v0/postings/${t}?mode=json`;
  return `https://api.ashbyhq.com/posting-api/job-board/${t}`;
}

export function parseArgs(argv) {
  const out = { json: false };
  const modes = [];
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case 'render': case 'write': case 'fetch-postings': modes.push(key); break;
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'target': out.target = value; break;
      case 'ask': out.ask = value; break;
      case 'input-file': out.inputFile = value; break;
      case 'out': out.out = value; break;
      case 'answer': out.answer = value; break;
      case 'session-name': out.sessionName = value; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (modes.length !== 1) return { error: 'exactly one of --render, --write, --fetch-postings is required' };
  out.mode = modes[0];
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (out.mode !== 'fetch-postings') {
    if (!out.capability) return { error: '--capability=<slug> is required' };
    if (!READ_MAP[out.capability]) return { error: `--capability "${out.capability}" is not in the read map` };
  }
  if (out.mode === 'write' && !out.answer) return { error: '--answer=<json | path> is required with --write' };
  return out;
}

function rest() {
  const root = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function get(pathAndQuery) {
    const r = await fetch(`${root}/rest/v1/${pathAndQuery}`, { headers });
    if (!r.ok) throw new Error(`GET ${pathAndQuery.split('?')[0]} returned HTTP ${r.status} ${await r.text()}`);
    return r.json();
  }
  async function insert(table, rows) {
    const r = await fetch(`${root}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(rows),
    });
    if (!r.ok) throw new Error(`insert into ${table} returned HTTP ${r.status} ${await r.text()}`);
    return r.json();
  }
  return { root, headers, get, insert };
}

async function readRecords(db, capability, target) {
  const kinds = READ_MAP[capability];
  let q = `career_records?kind=in.(${kinds.join(',')})&select=${RECORD_FIELDS}&order=created_at.asc`;
  // A record with no target_row applies to every target; --target narrows the targeted ones.
  if (target) q += `&or=(target_row.is.null,target_row.eq.${encodeURIComponent(target)})`;
  const rows = await db.get(q);
  const records = Object.fromEntries(kinds.map(k => [k, []]));
  for (const r of rows) {
    if (KIND_FILTERS[r.kind] && !KIND_FILTERS[r.kind](r)) continue;
    records[r.kind].push({ id: r.id, title: r.title, body: r.body, data: r.data, target_row: r.target_row });
  }
  const corrections = (await db.get(
    `career_records?kind=eq.correction&data->>capability=eq.${encodeURIComponent(capability)}&select=${RECORD_FIELDS}&order=created_at.asc`,
  )).map(r => ({ id: r.id, title: r.title, body: r.body, data: r.data, target_row: r.target_row }));
  return { records, corrections };
}

// The platform's own week, for the growth review. runner_cycles.stamp is a TEXT label
// ('DEEPBENCH-RUNNER-AUTOMATED-...'), not a time -- a gte on it compares lexically and returned all
// 342 pushed cycles (measured 2026-09-23); started_at is the cycle's timestamptz and returned 29.
async function readWeek(db) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const cycles = await db.get(`runner_cycles?select=item_id,stamp,push_sha&push_sha=not.is.null&started_at=gte.${since}&order=started_at.asc`);
  const decisions = await db.get(`runner_decisions?select=id,kind,backlog_id,summary&decided_at=gte.${since}&order=decided_at.asc`);
  return { since, cycles, decisions };
}

async function render(args) {
  const db = rest();
  const caps = await db.get(`capabilities?slug=eq.${encodeURIComponent(args.capability)}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) fail(`capability "${args.capability}" has no capabilities row or no default_intent_slug`);

  const { records, corrections } = await readRecords(db, args.capability, args.target);
  const week = args.capability === 'career-growth-review' ? await readWeek(db) : null;
  let input = null;
  if (args.inputFile) {
    try { input = fs.readFileSync(args.inputFile, 'utf8'); } catch (e) { fail(`--input-file: ${e.message}`); }
  }
  const task_context = {
    ask: args.ask || null,
    target: args.target || null,
    records,
    corrections,
    repos: REPOS,
    week,
    input,
  };

  let assembly;
  try {
    assembly = await assemblePrompt({
      capability_slug: args.capability,
      agent_id: args.agent,
      tenant_id: TENANT,
      task_context,
      intent_slug: intentSlug,
    });
  } catch (e) {
    fail(e.message);
  }
  if (!assembly.agent_card) fail(`no agents row for --agent=${args.agent}`);

  const lane = await resolveJudgmentModel(assembly, { supabaseUrl: db.root, headers: db.headers });
  if (lane.warning) console.error(`personal-agent: ${lane.warning}`);
  if (assembly.llm) {
    assembly.llm.model = lane.model;
    assembly.llm.lane_note = lane.reason;
  }

  const { system_prompt, omitted } = renderAssembly(assembly);
  if (!system_prompt) fail(`capability "${args.capability}" assembled zero renderable sections for agent "${args.agent}"`);
  const header = `# ${assembly.agent_card.name} — ${assembly.agent_card.role} · capability ${assembly.capability_slug} · model ${assembly.llm?.model}`;
  const laneLine = lane.from ? `\n# lane: judgment degraded to ${lane.model} (${lane.reason})` : '';
  const text = header + laneLine + '\n' + system_prompt + '\n';

  const recordsLoaded = Object.values(records).reduce((n, list) => n + list.length, 0) + corrections.length;
  console.error(`# model: ${assembly.llm?.model}`);
  if (omitted.length) console.error(`personal-agent: sections omitted (no stored content): ${omitted.join(', ')}`);

  if (args.out) fs.writeFileSync(args.out, text, 'utf8');
  if (args.json) {
    process.stdout.write(JSON.stringify({ model: assembly.llm?.model, records_loaded: recordsLoaded, prompt_bytes: Buffer.byteLength(text, 'utf8') }) + '\n');
  } else if (!args.out) {
    process.stdout.write(text);
  }
}

function loadAnswer(raw) {
  const trimmed = String(raw).trim();
  const source = trimmed.startsWith('{') ? trimmed : fs.readFileSync(trimmed, 'utf8');
  return JSON.parse(source);
}

async function write(args) {
  let answer;
  try { answer = loadAnswer(args.answer); } catch (e) { fail(`--answer is not readable JSON: ${e.message}`); }
  const check = validateAnswer(answer);
  if (check.error) fail(`answer refused, nothing written: ${check.error}`);

  const source = `${args.capability} ${new Date().toISOString().slice(0, 10)}`;
  const session_name = args.sessionName || null;
  const rows = answer.records_to_write.map(item => ({
    kind: item.kind,
    title: item.title,
    body: item.body ?? null,
    data: item.data ?? {},
    target_row: item.target_row ?? null,
    source,
    session_name,
  }));
  const runData = Object.fromEntries(Object.entries(answer).filter(([, v]) => !Array.isArray(v)));
  rows.push({ kind: 'log', title: `${args.capability} ran`, body: null, data: runData, target_row: null, source, session_name });

  let inserted;
  try { inserted = await rest().insert('career_records', rows); } catch (e) { fail(e.message); }
  process.stdout.write(JSON.stringify({ inserted: inserted.length, ids: inserted.map(r => r.id) }) + '\n');
}

async function fetchPostings() {
  const db = rest();
  const companies = await db.get('career_records?kind=eq.watch_company&select=id,title,data');
  const targets = await db.get('career_records?kind=eq.target&select=data');
  const stored = await db.get('career_records?kind=eq.posting&select=data');
  const titles = targets.flatMap(t => (Array.isArray(t.data?.titles) ? t.data.titles : []));
  const existing = stored.map(p => p.data?.url).filter(Boolean);

  const summary = { boards: 0, fetched: 0, inserted: 0, failed: [] };
  const fetchedAt = new Date().toISOString();
  const source = `fetch-postings ${fetchedAt.slice(0, 10)}`;
  for (const c of companies) {
    const board = c.data?.board;
    const token = c.data?.board_token;
    if (!BOARDS.includes(board) || !token) continue;
    summary.boards += 1;
    const company = c.data?.company || c.title;
    let postings;
    try {
      const r = await fetch(boardUrl(board, token));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      postings = normalizeBoard(board, await r.json());
    } catch (e) {
      console.error(`personal-agent: ${board} board "${token}" failed (${e.message}) -- skipped`);
      summary.failed.push(`${board}:${token}`);
      continue;
    }
    summary.fetched += postings.length;
    const kept = pickPostings(postings, titles, existing);
    if (!kept.length) continue;
    const rows = kept.map(p => ({
      kind: 'posting',
      title: p.title,
      source,
      data: { status: 'new', board, url: p.url, title: p.title, company, fetched_at: fetchedAt, text: p.text || '' },
    }));
    try {
      const ins = await db.insert('career_records', rows);
      summary.inserted += ins.length;
      existing.push(...kept.map(p => p.url));
    } catch (e) {
      console.error(`personal-agent: storing ${board} "${token}" postings failed (${e.message}) -- skipped`);
      summary.failed.push(`${board}:${token}`);
    }
  }
  process.stdout.write(JSON.stringify(summary) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  if (args.mode === 'render') return render(args);
  if (args.mode === 'write') return write(args);
  return fetchPostings();
}

// Entry guard, same shape as agent-prompt.js: importing this module (the regression guard does)
// must not run it. Windows argv[1] and import.meta.url can disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
