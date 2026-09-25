#!/usr/bin/env node
// DeepBench v7.0.598 | scripts/personal-agent.js | AGT-153 -- --fetch-linkedin-alerts: read the
// LinkedIn job-alert mail from the Yahoo inbox READ-ONLY (lib/imap-readonly.js: EXAMINE, BODY.PEEK,
// an allow-list of six verbs), parse each alert's job cards, drop the ones already stored or already
// read (a uid watermark kept in a `log` row), and write the new cards to --out as JSON for the
// caller to review. It stores no posting itself. Credentials are read by NAME from runner_secrets and
// passed straight to the reader -- never printed, never written. Kickoff:
// docs/kickoffs/v7.0.598-AGT-153-linkedin-alerts-intake.md.
//
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
//   ... --fetch-linkedin-alerts --agent=jerry --out=<path> [--from=<addr>] [--days=<n>] [--json]
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
// --fetch-linkedin-alerts  reads the last --days (never fewer than 7) of alert mail from the stored
//            sender (else --from, else LINKEDIN_ALERT_SENDER), skips uids at or below the watermark,
//            drops job ids already stored as postings, writes {fetched_at, since, sender,
//            uidvalidity, cards[]} to --out, THEN inserts one `log` row 'fetch-linkedin-alerts ran'
//            (the next run's watermark), and prints {messages, cards, new, skipped_uid, known, out}.
//            No alert mail at all: surveys every linkedin.com sender and names them (exit 4).
//
// EXIT CODES: 0 ok; 2 missing/invalid input or credential, a refused answer, or a failed read/write;
// 3 the Yahoo connection or login failed (YAHOO_FAIL); 4 no alert mail from the sender, but other
// linkedin.com senders were seen.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js';
import { readMail } from '../lib/imap-readonly.js';

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
      case 'render': case 'write': case 'fetch-postings': case 'fetch-linkedin-alerts': modes.push(key); break;
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'target': out.target = value; break;
      case 'ask': out.ask = value; break;
      case 'input-file': out.inputFile = value; break;
      case 'out': out.out = value; break;
      case 'answer': out.answer = value; break;
      case 'session-name': out.sessionName = value; break;
      case 'json': out.json = true; break;
      case 'from': out.from = value; break;
      case 'days': out.days = value; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (modes.length !== 1) return { error: 'exactly one of --render, --write, --fetch-postings, --fetch-linkedin-alerts is required' };
  out.mode = modes[0];
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (out.mode === 'fetch-linkedin-alerts') {
    if (!out.out) return { error: '--out=<path> is required with --fetch-linkedin-alerts' };
    if (out.days !== undefined && !/^\d+$/.test(out.days)) return { error: '--days must be a whole number' };
    // John's week-back rule: never read fewer than 7 days.
    out.days = Math.max(7, Number(out.days ?? 7));
    return out;
  }
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

// --- AGT-153: LinkedIn job-alert intake --------------------------------------------------------
export const LINKEDIN_ALERT_SENDER = 'jobalerts-noreply@linkedin.com';
export const JOB_VIEW = /linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/;
export const YAHOO_FAIL = 'Yahoo connection failed - recreate the app password';
const ACTIVELY = /actively (hiring|recruiting)/i;
const LOG_TITLE = 'fetch-linkedin-alerts ran';

// The canonical job url: the id only, never the alert's tracking parameters.
export const jobUrl = id => `https://www.linkedin.com/jobs/view/${id}/`;

// The HTML part as lines, read by the same rule as the text part. In the HTML a card's link wraps
// its TITLE, with company and location after it, so a job-view href is held back and emitted on its
// own line just before the next different link (or a table's end, or the end) -- after the card's
// last field, exactly where the text part puts its "View job" line.
function htmlLines(html) {
  let pending = null;
  const flush = () => {
    const p = pending;
    pending = null;
    return p ? `\n${p}\n` : '';
  };
  const linked = String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>|<\/table\s*>/gi, (all, href, inner) => {
      if (href === undefined) return `${flush()}\n`;
      const m = JOB_VIEW.exec(href);
      const held = pending && JOB_VIEW.exec(pending);
      const out = pending && !(m && held && m[1] === held[1]) ? flush() : '';
      if (m && !pending) pending = href;
      return `${out}\n${inner}\n`;
    });
  return (linked + flush())
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|td|th|li|ul|ol|table|tbody|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// One alert's cards. A line carrying a job-view url closes a block; the last three non-empty lines
// before it (an "actively hiring" badge dropped) are title, company, location. A missing field is
// null -- never invented. Text part first; no text part -> the same rule over the HTML.
export function parseAlertCards({ text, html } = {}) {
  const source = text ? String(text) : htmlLines(html);
  const cards = [];
  let block = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const m = JOB_VIEW.exec(line);
    if (!m) {
      if (!ACTIVELY.test(line)) block.push(line);
      continue;
    }
    const last = block.slice(-3);
    cards.push({ job_id: m[1], url: jobUrl(m[1]), title: last[0] ?? null, company: last[1] ?? null, location: last[2] ?? null });
    block = [];
  }
  return cards;
}

// Messages -> the new cards. A message at or below the watermark's uid (same uidvalidity) was read
// by an earlier run and is skipped; a job id already stored, or already taken this run, is dropped.
export function intakeFromMessages(messages, { knownJobIds = new Set(), watermark = null, uidvalidity = null } = {}) {
  const sameBox = watermark && watermark.uidvalidity != null && watermark.uidvalidity === uidvalidity;
  const floor = sameBox && watermark.last_uid != null && Number.isFinite(Number(watermark.last_uid)) ? Number(watermark.last_uid) : null;
  const seen = new Set();
  const cards = [];
  let skipped_uid = 0;
  let known = 0;
  let found = 0;
  let last_uid = floor;
  for (const msg of messages || []) {
    if (last_uid === null || msg.uid > last_uid) last_uid = msg.uid;
    if (floor !== null && msg.uid <= floor) { skipped_uid += 1; continue; }
    for (const card of parseAlertCards(msg)) {
      found += 1;
      if (knownJobIds.has(card.job_id)) { known += 1; continue; }
      if (seen.has(card.job_id)) continue;
      seen.add(card.job_id);
      cards.push({ ...card, message_uid: msg.uid, alert_date: msg.date ?? null });
    }
  }
  return { cards, messages: (messages || []).length, found, skipped_uid, known, last_uid };
}

// A reader error -> the exit code: the connection or login failed -> 3 (recreate the app password).
export function exitCodeFor(err) {
  return err && (err.code === 'IMAP_CONNECT_FAILED' || err.code === 'IMAP_AUTH_FAILED') ? 3 : 2;
}

function mailFail(err) {
  const code = exitCodeFor(err);
  console.error(`personal-agent: ${code === 3 ? YAHOO_FAIL : err.message}`);
  process.exit(code);
}

const senderAddress = from => {
  const m = /<([^>]+)>/.exec(String(from || ''));
  return (m ? m[1] : String(from || '')).trim().toLowerCase();
};

async function fetchLinkedinAlerts(args) {
  const db = rest();
  const secretRows = await db.get('runner_secrets?name=in.(YAHOO_IMAP_USER,YAHOO_IMAP_APP_PASSWORD)&select=name,value');
  const secret = Object.fromEntries(secretRows.map(r => [r.name, r.value]));
  if (!secret.YAHOO_IMAP_USER || !secret.YAHOO_IMAP_APP_PASSWORD) {
    fail('runner_secrets must hold both YAHOO_IMAP_USER and YAHOO_IMAP_APP_PASSWORD');
  }
  const [last] = await db.get(`career_records?kind=eq.log&title=eq.${encodeURIComponent(LOG_TITLE)}&select=data&order=created_at.desc&limit=1`);
  const watermark = last?.data || null;
  const sender = args.from || watermark?.sender || LINKEDIN_ALERT_SENDER;

  const knownJobIds = new Set();
  for (const p of await db.get('career_records?kind=eq.posting&select=data')) {
    if (p.data?.linkedin_job_id) knownJobIds.add(String(p.data.linkedin_job_id));
    const m = JOB_VIEW.exec(String(p.data?.url || ''));
    if (m) knownJobIds.add(m[1]);
  }

  const mail = { host: 'imap.mail.yahoo.com', user: secret.YAHOO_IMAP_USER, password: secret.YAHOO_IMAP_APP_PASSWORD };
  let box;
  try { box = await readMail({ ...mail, from: sender, sinceDays: args.days }); } catch (e) { mailFail(e); }

  const since = new Date(Date.now() - args.days * 24 * 3600 * 1000).toISOString();
  const intake = intakeFromMessages(box.messages, { knownJobIds, watermark, uidvalidity: box.uidvalidity });

  let sendersSeen = null;
  if (!box.messages.length) {
    let survey;
    try { survey = await readMail({ ...mail, from: 'linkedin.com', sinceDays: args.days, headersOnly: true }); } catch (e) { mailFail(e); }
    const counts = new Map();
    for (const m of survey.messages) {
      const addr = senderAddress(m.from);
      if (addr) counts.set(addr, (counts.get(addr) || 0) + 1);
    }
    if (counts.size) sendersSeen = [...counts].map(([address, count]) => ({ address, count }));
  }

  const fetchedAt = new Date().toISOString();
  fs.writeFileSync(args.out, JSON.stringify({
    fetched_at: fetchedAt, since, sender, uidvalidity: box.uidvalidity,
    cards: intake.cards.map(c => ({
      job_id: c.job_id, url: c.url, title: c.title, company: c.company, location: c.location,
      message_uid: c.message_uid, alert_date: c.alert_date,
    })),
  }, null, 2) + '\n', 'utf8');

  // Only after the file is written: the run log, which is the next run's watermark.
  const data = {
    uidvalidity: box.uidvalidity, last_uid: intake.last_uid, sender, since,
    messages: intake.messages, cards: intake.found, new: intake.cards.length,
  };
  if (sendersSeen) data.senders_seen = sendersSeen;
  try {
    await db.insert('career_records', [{
      kind: 'log', title: LOG_TITLE, body: null, data, target_row: null,
      source: `fetch-linkedin-alerts ${fetchedAt.slice(0, 10)}`,
    }]);
  } catch (e) { fail(e.message); }

  process.stdout.write(JSON.stringify({
    messages: intake.messages, cards: intake.found, new: intake.cards.length,
    skipped_uid: intake.skipped_uid, known: intake.known, out: args.out,
  }) + '\n');

  if (sendersSeen) {
    console.error(`personal-agent: no alert mail from ${sender}; seen: ${sendersSeen.map(s => `${s.address} (${s.count})`).join(', ')}`);
    process.exitCode = 4;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  if (args.mode === 'render') return render(args);
  if (args.mode === 'write') return write(args);
  if (args.mode === 'fetch-linkedin-alerts') return fetchLinkedinAlerts(args);
  return fetchPostings();
}

// Entry guard, same shape as agent-prompt.js: importing this module (the regression guard does)
// must not run it. Windows argv[1] and import.meta.url can disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
