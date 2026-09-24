#!/usr/bin/env node
// DeepBench v7.0.583 | scripts/market-agent.js | AGT-121 -- the call path for a product-lane marketing agent run
// inside a Claude session: read its market records and the platform rows its capability needs,
// assemble its prompt, and write its checked answer back. First caller: nathan (Nathan Laan, the
// product-marketing agent).
//
// A SIBLING OF personal-agent.js, NOT FLAGS ON IT (kickoff ruling). The two lanes read different
// tables with different kinds and check their answers by different rules; personal-agent.js and its
// regression test stay untouched. The shape is the same: records read and handed to the assembly
// IN-PROCESS (Windows caps argv, the AGT-86 gotcha), and agent-prompt.js imported, never shelled.
//
// ONE ASSEMBLY PATH (§19b). This script builds NO prompt text. It calls assemblePrompt() -- the same
// function api/capabilities/execute.js calls -- then resolveJudgmentModel() and renderAssembly()
// from agent-prompt.js. The task_context carries no `goal`, so db-assembly.js renders it as the
// TASK DETAILS section (AI-44), one `key: JSON` line per field, exactly as the executor would.
// assemblePrompt() does not read agents.is_active, so the executor's inactive-holder refusal
// (execute.js) is off this path by construction -- the hire card stays John's.
//
// AGENT-AGNOSTIC (§19d/§19e Rule #1, pattern:13). The agent id is a flag; the read map is keyed by
// capability slug, never by agent. The agent's name appears only in these comments, and so does the
// personal lane's table (career_records): the regression guard
// (tests/regression/agt-121-market-agent.test.mjs) greps for both outside `//` lines.
//
// THE NAPKIN. The owner's idea board is read ONLY by the session (ArtifactData) into a scratch JSON
// file, handed here with --napkin-file. This script never reaches the Napkin; --write prints the
// answer's napkin_notes so the session writes back each entry's note -- and nothing else.
//
// USAGE (credentials by NAME from public.runner_secrets, exported inline, never printed)
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/market-agent.js \
//     --render --agent=<id> --capability=pmm-why-deepbench [--ask=<text>] [--input-file=<path>]
//     [--napkin-file=<path.json>] [--since=<iso>] [--out=<path>] [--json]
//   ... --write --agent=<id> --capability=pmm-competitors --answer=<json | path to .json>
//     [--session-name=<n>]
//
// --render   since = --since, else the newest ai_activity_log.created_at for this agent with feature
//            like '<slug>:%', else null. Reads the capability's kinds (READ_MAP, status not retired)
//            plus its `correction` records and the platform rows PLATFORM names, assembles, prints the
//            header + prompt (to --out when given); stderr `# model: <id>`; --json prints
//            {model, since, records_loaded, napkin_entries, prompt_bytes} on stdout.
// --write    validateMarketAnswer() refuses a bad answer (exit 2, nothing written); otherwise ONE
//            insert of records_to_write with source '<slug> <ISO date>'. Prints
//            {inserted, ids, napkin_notes}.
//
// EXIT CODES: 0 ok; 2 missing/invalid input or credential, a refused answer, or a failed read/write.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js';

// Same tenant agent-prompt.js measured: every agent_configs / assignment row carries 'global'.
const TENANT = 'global';

// The thirteen kinds market_records_kind_check allows (measured 2026-09-24 from pg_constraint; no `log`).
export const KINDS = [
  'customer_profile', 'competitor', 'objection', 'message', 'feature_signal', 'feature_benefit',
  'pricing_proposal', 'market_size', 'release_note', 'conversation', 'correction', 'moat', 'ip_asset',
];

// What each capability reads. Keyed by capability slug, never by agent (kickoff §4).
export const READ_MAP = {
  'pmm-why-deepbench': ['objection', 'competitor', 'message', 'customer_profile'],
  'pmm-competitors': ['competitor', 'customer_profile'],
  'pmm-customer-profile': ['customer_profile', 'conversation', 'competitor'],
  'pmm-objections': ['customer_profile', 'competitor', 'conversation', 'objection'],
  'pmm-messaging': ['customer_profile', 'competitor', 'objection', 'feature_benefit', 'message'],
  'pmm-feature-signals': ['objection', 'competitor', 'conversation', 'feature_signal'],
  'pmm-feature-benefits': ['feature_benefit', 'customer_profile'],
  'pmm-release-notes': ['feature_benefit', 'release_note'],
  'pmm-pricing-proposals': ['customer_profile', 'competitor', 'pricing_proposal'],
  'pmm-market-size': ['customer_profile', 'competitor', 'market_size'],
  'pmm-moat-and-ip': ['moat', 'ip_asset', 'objection', 'competitor', 'message'],
};

// The platform rows each capability reads (kickoff §4). shipped: backlog rows done/delivered since
// `since` (default 7 days); open: open backlog rows; inventive: rows classed 'P2 - Inventive';
// catalog: the capability catalog.
const NO_SHIPPED = ['pmm-why-deepbench', 'pmm-messaging', 'pmm-pricing-proposals', 'pmm-market-size', 'pmm-moat-and-ip'];
export const PLATFORM = Object.fromEntries(Object.keys(READ_MAP).map(slug => [slug, [
  ...(NO_SHIPPED.includes(slug) ? [] : ['shipped']),
  ...(slug === 'pmm-feature-signals' ? ['open'] : []),
  ...(slug === 'pmm-moat-and-ip' ? ['inventive'] : []),
  ...(['pmm-moat-and-ip', 'pmm-why-deepbench', 'pmm-customer-profile'].includes(slug) ? ['catalog'] : []),
]]));

// The capabilities whose records must carry data.copy_tests (THE COPY TEST in the knowledge Skill).
const COPY_TESTED = ['pmm-why-deepbench', 'pmm-competitors', 'pmm-objections', 'pmm-messaging'];
const STATUSES = ['draft', 'proposed'];
const AUDIENCES = ['customer', 'investor', 'career', 'internal'];
const MOAT_TYPES = ['feature', 'incentive', 'structural', 'data', 'market', 'regulatory'];
const VERDICTS = ['durable', 'temporary', 'weak'];
const IP_TYPES = ['patent', 'patentable_candidate', 'trade_secret', 'proprietary_data', 'copyright_brand'];
const RECORD_FIELDS = 'id,kind,title,body,data,audience,status';
const BACKLOG_FIELDS = 'backlog_id,title,type,priority_class,status,updated_at';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function fail(message) {
  console.error(`market-agent: ${message}`);
  process.exit(2);
}

// One copy test. Returns an error string or null.
function copyTestError(ct, where) {
  if (!isObj(ct)) return `${where} is not an object`;
  if (typeof ct.competitor !== 'string' || !ct.competitor.trim()) return `${where} has no competitor`;
  if (typeof ct.why_not !== 'string' || !ct.why_not.trim()) return `${where} has no why_not`;
  if (ct.why_not.length > 400) return `${where}.why_not is over 400 characters`;
  if (!Array.isArray(ct.evidence) || ct.evidence.length < 1) return `${where} has no evidence`;
  if (!MOAT_TYPES.includes(ct.moat_type)) return `${where} has moat_type "${ct.moat_type}"`;
  if (!Number.isInteger(ct.time_to_copy_months) || ct.time_to_copy_months < 0) {
    return `${where}.time_to_copy_months is not a whole number >= 0`;
  }
  if (!VERDICTS.includes(ct.verdict)) return `${where} has verdict "${ct.verdict}"`;
  if (ct.moat_type === 'feature' && ct.time_to_copy_months < 6 && ct.verdict !== 'weak') {
    return `${where} is a feature moat under 6 months with verdict "${ct.verdict}" -- it is weak`;
  }
  return null;
}

// Walk the whole answer: every copy_test object and copy_tests[] entry is checked, and no headline or
// lead may carry a weak copy test. Returns an error string or null.
function walkError(node, where) {
  if (Array.isArray(node)) {
    for (const [i, v] of node.entries()) {
      const e = walkError(v, `${where}[${i}]`);
      if (e) return e;
    }
    return null;
  }
  if (!isObj(node)) return null;
  for (const [k, v] of Object.entries(node)) {
    const at = `${where}.${k}`;
    if (k === 'copy_test') {
      const e = copyTestError(v, at);
      if (e) return e;
    } else if (k === 'copy_tests') {
      if (!Array.isArray(v)) return `${at} is not an array`;
      for (const [i, ct] of v.entries()) {
        const e = copyTestError(ct, `${at}[${i}]`);
        if (e) return e;
      }
    }
    if ((k === 'headline' || k === 'lead') && isObj(v) && isObj(v.copy_test) && v.copy_test.verdict === 'weak') {
      return `${at} leads with a weak claim -- a weak item is supporting proof only`;
    }
    const e = walkError(v, at);
    if (e) return e;
  }
  return null;
}

// The answer, checked before anything is written (kickoff Task 1). Returns {ok} or {error}.
export function validateMarketAnswer(answer, capability) {
  if (!isObj(answer)) return { error: 'the answer must be a JSON object' };
  for (const f of ['records_to_write', 'napkin_notes', 'napkin_left']) {
    if (!Array.isArray(answer[f])) return { error: `the answer carries no ${f} array` };
  }
  for (const [i, n] of answer.napkin_notes.entries()) {
    if (!isObj(n) || n.entry_id === undefined || n.entry_id === null || String(n.entry_id).trim() === '') {
      return { error: `napkin_notes[${i}] has no entry_id` };
    }
    if (typeof n.note !== 'string' || n.note.length > 200) {
      return { error: `napkin_notes[${i}].note is missing or over 200 characters` };
    }
  }
  for (const [i, item] of answer.records_to_write.entries()) {
    const at = `records_to_write[${i}]`;
    if (!isObj(item)) return { error: `${at} is not an object` };
    if (!KINDS.includes(item.kind)) return { error: `${at} has unknown kind "${item.kind}"` };
    if (typeof item.title !== 'string' || !item.title.trim()) return { error: `${at} (${item.kind}) has no title` };
    const status = item.status ?? 'draft';
    if (!STATUSES.includes(status)) return { error: `${at} has status "${status}" -- only draft or proposed are written` };
    const audience = item.audience ?? null;
    if (audience !== null && !AUDIENCES.includes(audience)) return { error: `${at} has audience "${audience}"` };
    if (item.data !== undefined && !isObj(item.data)) return { error: `${at}.data must be an object` };
    const data = item.data || {};
    if (item.kind === 'correction' && data.capability !== capability) {
      return { error: `${at} is a correction for "${data.capability}", not "${capability}"` };
    }
    // A correction is John's cut, not a differentiator: exempt from the copy test (decision 247bcab1).
    if (COPY_TESTED.includes(capability) && item.kind !== 'correction'
        && (!Array.isArray(data.copy_tests) || data.copy_tests.length < 1)) {
      return { error: `${at} carries no data.copy_tests -- ${capability} records need at least one` };
    }
    if (item.kind === 'ip_asset') {
      if (!IP_TYPES.includes(data.ip_type)) return { error: `${at} has ip_type "${data.ip_type}"` };
      if (!Array.isArray(data.proof) || data.proof.length < 1) return { error: `${at} has no proof` };
      if (typeof data.public_today !== 'boolean') return { error: `${at}.public_today is not a boolean` };
      if (typeof data.flag_for_counsel !== 'boolean') return { error: `${at}.flag_for_counsel is not a boolean` };
      if (data.ip_type === 'trade_secret' && data.public_today) {
        return { error: `${at} is a public trade_secret -- a public item is never a trade secret` };
      }
    }
  }
  if (answer.moat_found === true && answer.moat?.copy_test?.verdict !== 'durable') {
    return { error: 'moat_found is true but the moat\'s copy_test verdict is not durable' };
  }
  if (answer.moat_found === false && !isObj(answer.closest_candidate)) {
    return { error: 'moat_found is false with no closest_candidate' };
  }
  const walked = walkError(answer, 'answer');
  if (walked) return { error: walked };
  return { ok: true };
}

export function parseArgs(argv) {
  const out = { json: false };
  const modes = [];
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case 'render': case 'write': modes.push(key); break;
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'ask': out.ask = value; break;
      case 'input-file': out.inputFile = value; break;
      case 'napkin-file': out.napkinFile = value; break;
      case 'since': out.since = value; break;
      case 'out': out.out = value; break;
      case 'answer': out.answer = value; break;
      case 'session-name': out.sessionName = value; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (modes.length !== 1) return { error: 'exactly one of --render, --write is required' };
  out.mode = modes[0];
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (!out.capability) return { error: '--capability=<slug> is required' };
  if (!READ_MAP[out.capability]) return { error: `--capability "${out.capability}" is not in the read map` };
  if (out.since && Number.isNaN(Date.parse(out.since))) return { error: `--since "${out.since}" is not an ISO date` };
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

// The last run of this capability by this agent, from the audit log (§19k), else null.
async function lastRun(db, agent, capability) {
  const rows = await db.get(
    `ai_activity_log?agent_id=eq.${encodeURIComponent(agent)}&feature=like.${encodeURIComponent(`${capability}:*`)}` +
    '&select=created_at&order=created_at.desc&limit=1',
  );
  return rows[0]?.created_at || null;
}

async function readRecords(db, capability) {
  const kinds = READ_MAP[capability];
  const rows = await db.get(`market_records?kind=in.(${kinds.join(',')})&status=neq.retired&select=${RECORD_FIELDS}&order=created_at.asc`);
  const records = Object.fromEntries(kinds.map(k => [k, []]));
  for (const r of rows) records[r.kind].push({ id: r.id, title: r.title, body: r.body, data: r.data, audience: r.audience, status: r.status });
  const corrections = (await db.get(
    `market_records?kind=eq.correction&status=neq.retired&data->>capability=eq.${encodeURIComponent(capability)}&select=${RECORD_FIELDS}&order=created_at.asc`,
  )).map(r => ({ id: r.id, title: r.title, body: r.body, data: r.data, audience: r.audience, status: r.status }));
  return { records, corrections };
}

async function readPlatform(db, capability, since) {
  const reads = PLATFORM[capability];
  const platform = {};
  if (reads.includes('shipped')) {
    const from = since || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    platform.shipped = await db.get(`backlog_items?status=in.(done,delivered)&updated_at=gte.${encodeURIComponent(from)}&select=${BACKLOG_FIELDS}&order=updated_at.asc`);
  }
  if (reads.includes('open')) {
    platform.open = await db.get(`backlog_items?status=eq.open&select=${BACKLOG_FIELDS}&order=updated_at.desc`);
  }
  if (reads.includes('inventive')) {
    platform.inventive = await db.get(`backlog_items?priority_class=eq.${encodeURIComponent('P2 - Inventive')}&select=${BACKLOG_FIELDS}&order=updated_at.desc`);
  }
  if (reads.includes('catalog')) {
    platform.catalog = await db.get(`capabilities?tenant_id=eq.${TENANT}&select=slug,name,description&order=slug.asc`);
  }
  return platform;
}

// The session's Napkin scratch file: an array of entries, or {entries|docs|documents: [...]}.
export function loadNapkin(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  for (const k of ['entries', 'docs', 'documents']) if (Array.isArray(parsed?.[k])) return parsed[k];
  throw new Error('expected a JSON array of entries (or {entries: [...]})');
}

async function render(args) {
  const db = rest();
  const caps = await db.get(`capabilities?slug=eq.${encodeURIComponent(args.capability)}&tenant_id=eq.${TENANT}&select=default_intent_slug&limit=1`);
  const intentSlug = caps[0]?.default_intent_slug;
  if (!intentSlug) fail(`capability "${args.capability}" has no capabilities row or no default_intent_slug`);

  const since = args.since || await lastRun(db, args.agent, args.capability);
  const { records, corrections } = await readRecords(db, args.capability);
  const platform = await readPlatform(db, args.capability, since);
  let input = null;
  if (args.inputFile) {
    try { input = fs.readFileSync(args.inputFile, 'utf8'); } catch (e) { fail(`--input-file: ${e.message}`); }
  }
  let napkin = null;
  if (args.napkinFile) {
    try { napkin = loadNapkin(args.napkinFile); } catch (e) { fail(`--napkin-file: ${e.message}`); }
  }
  const task_context = { ask: args.ask || null, since, records, corrections, platform, napkin, input };

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
  if (lane.warning) console.error(`market-agent: ${lane.warning}`);
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
  if (omitted.length) console.error(`market-agent: sections omitted (no stored content): ${omitted.join(', ')}`);

  if (args.out) fs.writeFileSync(args.out, text, 'utf8');
  if (args.json) {
    process.stdout.write(JSON.stringify({
      model: assembly.llm?.model,
      since,
      records_loaded: recordsLoaded,
      napkin_entries: napkin ? napkin.length : 0,
      prompt_bytes: Buffer.byteLength(text, 'utf8'),
    }) + '\n');
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
  const check = validateMarketAnswer(answer, args.capability);
  if (check.error) fail(`answer refused, nothing written: ${check.error}`);

  const source = `${args.capability} ${new Date().toISOString().slice(0, 10)}`;
  const session_name = args.sessionName || null;
  const rows = answer.records_to_write.map(item => ({
    kind: item.kind,
    title: item.title,
    body: item.body ?? null,
    data: item.data ?? {},
    audience: item.audience ?? null,
    status: item.status ?? 'draft',
    supersedes: item.supersedes ?? null,
    source,
    session_name,
  }));

  let inserted = [];
  if (rows.length) {
    try { inserted = await rest().insert('market_records', rows); } catch (e) { fail(e.message); }
  }
  process.stdout.write(JSON.stringify({ inserted: inserted.length, ids: inserted.map(r => r.id), napkin_notes: answer.napkin_notes }) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  if (args.mode === 'render') return render(args);
  return write(args);
}

// Entry guard, same shape as agent-prompt.js: importing this module (the regression guard does)
// must not run it. Windows argv[1] and import.meta.url can disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
