#!/usr/bin/env node
// DeepBench v7.0.681 | scripts/market-agent.js | AGT-161 -- THE PRODUCT LANE'S PROPOSALS REACH THE ONE
// FINDINGS LIST. --write used to end at market_records: a `feature_signal` row carrying a whole
// `data.proposed_ticket` sat in the marketing table, on no list the Development Manager reviews, so
// every proposal this lane produced needed a human to notice it and re-type it as a ticket. It now
// files each one as an `audit_findings` row through audit-ledger.js's ONE intake (AGT-131) in the same
// run, and `--raise-findings` does the same over the rows already in the table.
//
// NO MODEL CALL IS ADDED, and that is the whole design (pattern:9, pattern:10): the proposal already
// EXISTS in the record the platform just wrote and validateMarketAnswer() already checked, so the
// finding is DERIVED from it deterministically rather than asked of a second model turn that could
// word it differently every Wednesday. See proposalFindings() for the field-by-field derivation.
//
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
//     [--session-name=<n> | --cycle-id=<uuid>]
//   ... --raise-findings --agent=<id> --capability=<slug> [--apply]
//     [--cycle-id=<uuid> | --session-name=<n>]
//
// --render   since = --since, else the newest ai_activity_log.created_at for this agent with feature
//            like '<slug>:%', else null. Reads the capability's kinds (READ_MAP, status not retired)
//            plus its `correction` records and the platform rows PLATFORM names, assembles, prints the
//            header + prompt (to --out when given); stderr `# model: <id>`; --json prints
//            {model, since, records_loaded, napkin_entries, prompt_bytes} on stdout.
// --write    validateMarketAnswer() refuses a bad answer (exit 2, nothing written); otherwise ONE
//            insert of records_to_write with source '<slug> <ISO date>'. Prints
//            {inserted, ids, napkin_notes, findings}. `findings` is AGT-161: every `feature_signal`
//            row this run inserted is raised on public.audit_findings through raiseFindings(), so
//            the row and its finding cannot drift apart between two commands nobody remembers to
//            pair. Attribution is --cycle-id when given, else --session-name, else the source line.
// --raise-findings
//            AGT-161's backfill and re-run door: reads every non-retired `feature_signal` row and
//            raises the ones the ledger does not already hold. Prints {considered, verdicts, raised}.
//            A DRY RUN (no --apply) writes nothing and is the whole point -- its EXIT CODE is the
//            answer: 1 while `new + recurring` > 0 (work the ledger does not hold for this week),
//            0 when there is none. --apply needs exactly one of --cycle-id / --session-name.
//
// EXIT CODES: 0 ok; 1 a --raise-findings DRY RUN with findings the ledger does not yet hold (a
//             report, never a failure); 2 missing/invalid input or credential, a refused answer, or
//             a failed read/write.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js';
// ONE INTAKE FOR THE FINDINGS LIST (AGT-131, pattern:14/pattern:15): the read, the four-way
// classification and the appended before-image + row live in audit-ledger.js and are CALLED here,
// never re-spelled. `attribution` comes from the same module for the same reason -- the
// exactly-one-of-cycle-or-session rule is that file's, and a second copy of it here is a copy that
// drifts (scripts/audit-cluster.js imports it on the same footing).
import { ingestFindings, attribution } from './audit-ledger.js';

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

// --- AGT-161: a proposal already in the record becomes a finding on the ONE list -----------------
//
// PURE, AND THAT IS LOAD-BEARING. rows in, findings out, no network and no clock: the same five
// market_records rows derive the same five fingerprints on every run, which is what makes a second
// `--raise-findings` read `seen` rather than filing a sixth copy (pattern:3).
//
// `kind` IS 'other' BY THE TABLE'S OWN CONSTRAINT, not by preference. audit_findings_kind_check
// allows exactly six values -- duplicate, contradiction, redundant, stale-or-irrelevant,
// competing-purpose, other -- and a proposal is none of the first five. The column that says what
// this IS is `finding_type` ('proposal'), which is the distinction AGT-131 shipped two columns for;
// the description travels in `governing_fact`, which is also the field the fingerprint hashes.
//
// ONE LOCATION, THE ROW ITSELF: `market_records:<uuid>`. locationKey() drops a trailing `:<line>`
// from a file citation and a uuid has none, so the home is the record and the finding is stable
// across re-wordings of the title.
//
// A NON-PROPOSAL KIND YIELDS NOTHING rather than an error: --write's answer legitimately carries
// `market_size`, `competitor` and the other eleven kinds, and only a `feature_signal` names a ticket.
export function proposalFindings(rows) {
  return (rows ?? [])
    .filter(row => row?.kind === 'feature_signal')
    .map(row => {
      const pt = row.data?.proposed_ticket ?? {};
      return {
        kind: 'other',
        finding_type: 'proposal',
        check_slug: 'market:feature_signal',
        locations: [{ location: `market_records:${row.id}`, text: row.title }],
        governing_fact: `${row.title} -- ${pt.title ?? row.title}`,
        confidence: 'high',
        proposed_resolution: `${pt.description ?? 'The Development Manager decides'} `
          + `[suggested class: ${pt.suggested_class ?? 'unassigned'}]`,
      };
    });
}

// `get` AND `post` ARE THE CALLER'S, which is the contract that lets this share AGT-131's intake
// rather than open a fifth writer of public.audit_findings. A script hands in its own REST pair; the
// regression guard hands in two stubs and never touches the live ledger (SES-382).
//
// AGENT-AGNOSTIC (§19d/§19e Rule #1, pattern:13): `found_by` is 'agent:' + the --agent flag. No
// agent is named in this file's code or in the row it writes, and agt-121 part (a) greps for it.
export async function raiseFindings(rows, { agent, cycleId, sessionName, get, post, apply } = {}) {
  // Refused HERE, before the read and before the first before-image, rather than as a 23514 from
  // runner_before_images.ck_before_image_attribution after half a batch has been classified.
  attribution({ cycleId, sessionName, apply });
  return ingestFindings({
    findings: proposalFindings(rows),
    foundBy: `agent:${agent}`,
    cycleId: cycleId ?? null,
    sessionName: sessionName ?? null,
    get,
    post,
    apply,
  });
}

export function parseArgs(argv) {
  const out = { json: false, apply: false };
  const modes = [];
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) return { error: `unrecognized argument "${raw}"` };
    const [, key, value] = m;
    switch (key) {
      case 'render': case 'write': case 'raise-findings': modes.push(key); break;
      case 'agent': out.agent = value; break;
      case 'capability': out.capability = value; break;
      case 'ask': out.ask = value; break;
      case 'input-file': out.inputFile = value; break;
      case 'napkin-file': out.napkinFile = value; break;
      case 'since': out.since = value; break;
      case 'out': out.out = value; break;
      case 'answer': out.answer = value; break;
      case 'session-name': out.sessionName = value; break;
      case 'cycle-id': out.cycleId = value; break;
      case 'apply': out.apply = true; break;
      case 'json': out.json = true; break;
      default: return { error: `unrecognized flag "--${key}"` };
    }
  }
  if (modes.length !== 1) return { error: 'exactly one of --render, --write, --raise-findings is required' };
  out.mode = modes[0];
  if (!out.agent) return { error: '--agent=<agents.id> is required' };
  if (!out.capability) return { error: '--capability=<slug> is required' };
  if (!READ_MAP[out.capability]) return { error: `--capability "${out.capability}" is not in the read map` };
  if (out.since && Number.isNaN(Date.parse(out.since))) return { error: `--since "${out.since}" is not an ISO date` };
  if (out.mode === 'write' && !out.answer) return { error: '--answer=<json | path> is required with --write' };
  // AGT-161 -- the same exactly-one rule audit-ledger.js's attribution() enforces, refused at the
  // command line so a --apply run cannot get as far as the ledger with two attributions or none.
  if (out.cycleId && out.sessionName) return { error: 'exactly one of --cycle-id / --session-name' };
  if (out.mode === 'raise-findings' && out.apply && !out.cycleId && !out.sessionName) {
    return { error: '--apply needs exactly one of --cycle-id / --session-name' };
  }
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

  // AGT-161 -- IN THE SAME RUN, over the rows that actually landed (never over `answer`): a finding
  // whose location cites a market_records id must cite an id that exists. A write carrying no
  // `feature_signal` raises nothing and says so with `raised: 0`, which is a measurement rather
  // than a silence.
  let raised;
  try {
    raised = await raiseFindings(inserted, {
      agent: args.agent,
      cycleId: args.cycleId ?? null,
      sessionName: args.cycleId ? null : (args.sessionName ?? source),
      get: q => rest().get(q),
      post: (t, b) => rest().insert(t, [b]),
      apply: true,
    });
  } catch (e) { fail(e.message); }

  process.stdout.write(JSON.stringify({
    inserted: inserted.length,
    ids: inserted.map(r => r.id),
    napkin_notes: answer.napkin_notes,
    findings: {
      raised: raised.written,
      verdicts: raised.verdicts.map(v => ({ fingerprint: v.fingerprint, verdict: v.verdict })),
    },
  }) + '\n');
}

// --raise-findings: the backfill and re-run door over the rows already in the table. It reads the
// SAME projection proposalFindings() needs and nothing else, and its dry run is the cheap, safe form
// of the command -- so the dry run is what carries the exit code, never a refusal.
async function doRaise(args) {
  const db = rest();
  let rows = [];
  try {
    rows = await db.get(
      'market_records?select=id,kind,title,data&kind=eq.feature_signal&status=neq.retired&order=created_at.asc');
  } catch (e) { fail(e.message); }

  let result;
  try {
    result = await raiseFindings(rows, {
      agent: args.agent,
      cycleId: args.cycleId ?? null,
      sessionName: args.cycleId ? null : (args.sessionName ?? null),
      get: q => db.get(q),
      post: (t, b) => db.insert(t, [b]),
      apply: args.apply,
    });
  } catch (e) { fail(e.message); }

  process.stdout.write(JSON.stringify({
    considered: rows.length,
    verdicts: result.verdicts.map(v => ({ fingerprint: v.fingerprint, verdict: v.verdict })),
    raised: result.written,
  }) + '\n');

  // `new + recurring` AND NOT `new` ALONE: both are work this week's ledger does not hold yet
  // (audit-ledger.js's header carries the reasoning -- `recurring` appends, `seen` cannot). And
  // process.exitCode, never process.exit(): on Node 24 a process.exit() straight after a fetch
  // aborts on the libuv UV_HANDLE_CLOSING assertion and the code never reaches the caller (AGT-86).
  const outstanding = result.summary.new + result.summary.recurring;
  process.exitCode = (!args.apply && outstanding > 0) ? 1 : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) fail(args.error);
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  if (args.mode === 'render') return render(args);
  if (args.mode === 'raise-findings') return doRaise(args);
  return write(args);
}

// Entry guard, same shape as agent-prompt.js: importing this module (the regression guard does)
// must not run it. Windows argv[1] and import.meta.url can disagree on drive-letter case.
if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}
