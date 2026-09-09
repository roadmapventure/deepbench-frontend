#!/usr/bin/env node
// DeepBench v7.0.435 | scripts/prioritizer-first-run.mjs | SES-332 -- the Prioritizer's first run over
// the whole open board, driven from a session on subscription tokens.
//
// WHY A DRIVER AND NOT 567 SHELL INVOCATIONS. `docs/runbooks/session-setup.md` §3f says a session
// runs a governance agent through scripts/agent-prompt.js (assembly) and scripts/agent-log.js
// (audit). Both are per-call scripts, and the first run is 567 calls. This file is the loop around
// those two, not a replacement for either: --prep calls the SAME assemblePrompt() /
// renderAssembly() agent-prompt.js calls, once per ticket; --apply shells the REAL
// scripts/agent-log.js once per ruling. Nothing here re-implements assembly or logging.
//
// THE ONE RULE THAT MADE THIS FILE NECESSARY (SES-332, John's): the first run must NEVER overwrite a
// priority_class that already exists. Every one of the 567 open/partial rows has one (MEASURED
// 2026-09-09: 0 rows with priority_class NULL in status open/partial). But
// api/_lib/handlers/prioritizer-write.js REQUIRES priority_class on every classify payload and
// always writes it -- correctly, because a ruling with no class is not a ruling. So the guard cannot
// live in the handler and must not live in the sub-agent's judgment either: a model told "don't
// change it" changes it eventually. It lives HERE, mechanically -- the stored class is read back
// immediately before the write and SUBSTITUTED into the payload, so the column is written with the
// value it already holds and John's classes are unreachable by this run by construction. Where the
// Prioritizer's ruling differs from the stored class, the difference is a DISAGREEMENT: recorded to
// a file for John, never to the board.
//
// PROMPT INVARIANCE IS PROVEN, NOT ASSUMED. --prep renders all 567 prompts through the executor's
// own functions and then asserts that every one of them is byte-identical outside its own
// `=== TASK DETAILS ===` block. That assertion is what makes it legitimate to hand a sub-agent one
// shared system prompt plus N task blocks instead of N whole prompts: the concatenation of the two
// IS the per-ticket prompt agent-prompt.js would print. If the assertion ever fails the run stops --
// there is no fallback that quietly ships a prompt nobody assembled.
//
// USAGE
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/prioritizer-first-run.mjs --prep \
//     --out=<dir> [--slices=8]
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/prioritizer-first-run.mjs --apply \
//     --rulings=<file.jsonl> --disagreements=<file.jsonl> --outcomes=<file.jsonl> \
//     --cycle=<runner_cycles.id>
//
// EXIT CODES: 0 ok; 2 bad input, missing credential, or a failed invariance assertion.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { assemblePrompt } from '../api/prompt/db-assembly.js';
import { renderAssembly } from './agent-prompt.js';
import { handle as prioritizerWrite } from '../api/_lib/handlers/prioritizer-write.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TENANT = 'global';
const AGENT = 'prioritizer';
const CAPABILITY = 'classify-ticket';
const INTENT = 'pz-classify-intent';
const TASK_HEADING = '=== TASK DETAILS ===';

// The Type Taxonomy the Intent Skill names, plus the values the board actually carries. MEASURED
// 2026-09-09 across all 903 rows: the long tail is `feature` (2), `Bug Fixes` (2), `chore` (1) and a
// literal em-dash (1) -- case and synonym drift, not new categories. `type` has NO check constraint
// (pg_constraint read this session), so normalization is the only thing standing between the board
// and a fourth spelling of "feature". Applied to the MODEL'S output, never used to invent a type:
// a value outside this map is refused, not guessed.
const TYPE_CANON = new Map([
  ['feature', 'Feature'], ['bug', 'Bug'], ['bug fixes', 'Bug'], ['bugfix', 'Bug'],
  ['tooling', 'Tooling'], ['architecture', 'Architecture'],
  ['tech debt', 'Tech Debt'], ['techdebt', 'Tech Debt'], ['chore', 'Tech Debt'],
  ['observability', 'Observability'], ['data', 'Data'], ['speed', 'Speed'],
  ['task success rate', 'Task Success Rate'], ['ui', 'UI'], ['admin', 'Admin'],
  ['automation', 'Automation'], ['loop', 'Loop'],
]);

const CLASS_FORM = /^P([1-9]|10) - /;

function fail(message) {
  console.error(`prioritizer-first-run: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(raw);
    if (!m) fail(`unrecognized argument "${raw}"`);
    out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

function headers() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
}

async function rest(pathAndQuery) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: headers() });
  if (!r.ok) throw new Error(`GET ${pathAndQuery} -> ${r.status} ${await r.text()}`);
  return r.json();
}

// PostgREST caps a page at 1000 but defaults lower; the board is 567 open rows today and will not
// stay that size, so the read is paged rather than assumed to fit.
async function openTickets() {
  const cols = 'backlog_id,title,description,type,priority_class,tier,status,scope_origin,epic_id,milestone';
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = await rest(`backlog_items?status=in.(open,partial)&select=${cols}`
      + `&order=backlog_id.asc&limit=500&offset=${offset}`);
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}

function taskContextFor(row, epicName) {
  // Exactly the seven facts the Intent Skill says the task_context carries, in its own order --
  // read off the row, never summarized. A blank is passed as the literal '(blank)' rather than
  // omitted, because an omitted key renders as a missing line and the model cannot tell "no type
  // stored" from "the assembler dropped it".
  return {
    backlog_id: row.backlog_id,
    title: row.title || '(blank)',
    description: row.description || '(blank)',
    type: row.type || '(blank)',
    priority_class: row.priority_class || '(blank)',
    scope_origin: row.scope_origin || '(blank)',
    epic: epicName || '(none)',
  };
}

function splitPrompt(text) {
  const i = text.indexOf(TASK_HEADING);
  if (i === -1) return null;
  const rest = text.slice(i + TASK_HEADING.length);
  const end = rest.indexOf('\n---');
  if (end === -1) return null;
  return { head: text.slice(0, i), task: rest.slice(0, end).trim(), tail: rest.slice(end) };
}

async function prep(args) {
  const outDir = args.out || fail('--out=<dir> is required');
  const slices = Number(args.slices || 8);
  fs.mkdirSync(outDir, { recursive: true });

  const rows = await openTickets();
  const epics = await rest('epics?select=id,name');
  const epicName = new Map(epics.map(e => [e.id, e.name]));

  let head = null, tail = null, formatContract = null, model = null;
  const prepared = [];
  for (const row of rows) {
    const assembly = await assemblePrompt({
      capability_slug: CAPABILITY,
      agent_id: AGENT,
      tenant_id: TENANT,
      task_context: taskContextFor(row, epicName.get(row.epic_id)),
      intent_slug: INTENT,
    });
    const { system_prompt } = renderAssembly(assembly);
    const parts = splitPrompt(system_prompt);
    if (!parts) fail(`${row.backlog_id}: rendered prompt has no ${TASK_HEADING} block -- the assembly changed shape`);

    if (head === null) {
      head = parts.head; tail = parts.tail;
      formatContract = assembly.format_contract;
      model = assembly.llm?.model;
    } else if (parts.head !== head || parts.tail !== tail) {
      // THE ASSERTION. Not a warning: a per-ticket difference outside TASK DETAILS means the shared
      // prefix handed to the sub-agents is not the prompt this ticket would have been given, and the
      // whole slicing scheme is void.
      fail(`${row.backlog_id}: prompt differs OUTSIDE the task block -- the shared-prefix assumption is void, stop`);
    }
    prepared.push({ backlog_id: row.backlog_id, stored_priority_class: row.priority_class, stored_type: row.type, task: parts.task });
  }

  const per = Math.ceil(prepared.length / slices);
  const manifest = [];
  for (let s = 0; s < slices; s++) {
    const chunk = prepared.slice(s * per, (s + 1) * per);
    if (!chunk.length) continue;
    const file = path.join(outDir, `slice-${s + 1}.md`);
    fs.writeFileSync(file, [
      `<!-- SES-332 slice ${s + 1}/${slices} | ${chunk.length} tickets | model ${model} -->`,
      '',
      '## The system prompt (assembled by api/prompt/db-assembly.js — identical for every ticket below)',
      '',
      '```',
      head.trimEnd(),
      '```',
      '',
      '```',
      tail.trimStart(),
      '```',
      '',
      '## The per-ticket TASK DETAILS blocks',
      '',
      ...chunk.map(t => ['### ' + t.backlog_id, '', '```', TASK_HEADING, t.task, '```', ''].join('\n')),
    ].join('\n'), 'utf8');
    manifest.push({ slice: s + 1, file, count: chunk.length, ids: chunk.map(t => t.backlog_id) });
  }

  fs.writeFileSync(path.join(outDir, 'schema.json'), JSON.stringify(formatContract, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ total: prepared.length, model, slices: manifest }, null, 2), 'utf8');
  process.stdout.write(`prep: ${prepared.length} tickets, ${manifest.length} slices, model ${model}, prompt invariance asserted\n`);
}

// Shape validation against the Intent's OWN schema (read live off format_contract in --prep and
// re-read here), not a hand-written copy of it. AGT-67's rule: the schema in the row is the
// contract; a sub-agent's JSON meets it or the ruling is refused before it reaches the handler.
function validate(ruling, schema) {
  const problems = [];
  for (const key of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(ruling, key)) problems.push(`missing "${key}"`);
  }
  if (typeof ruling.backlog_id !== 'string') problems.push('backlog_id must be a string');
  if (typeof ruling.priority_class !== 'string' || !CLASS_FORM.test(ruling.priority_class)) {
    problems.push('priority_class must be a named class ("P10 - Tooling"), never a bare digit');
  }
  if (ruling.supports_class !== null) {
    if (typeof ruling.supports_class !== 'string' || !CLASS_FORM.test(ruling.supports_class)) {
      problems.push('supports_class must be null or a named class');
    } else if (typeof ruling.supports_reason !== 'string' || !ruling.supports_reason.trim()) {
      problems.push('supports_class given with no supports_reason');
    } else if (ruling.supports_reason.length > 300) {
      problems.push('supports_reason exceeds the schema maxLength of 300');
    } else if (!Array.isArray(ruling.claim_refs) || !ruling.claim_refs.length) {
      problems.push('a non-null supports_class requires at least one claim_ref (pz-guardrails)');
    }
  }
  if (!['high', 'medium', 'low'].includes(ruling.confidence)) problems.push('confidence must be high|medium|low');
  return problems;
}

function normalizeType(value) {
  if (typeof value !== 'string' || !value.trim()) return { type: null };
  const canon = TYPE_CANON.get(value.trim().toLowerCase());
  return canon ? { type: canon } : { error: `type "${value}" is outside the Type Taxonomy` };
}

async function apply(args) {
  const rulingsFile = args.rulings || fail('--rulings=<file.jsonl> is required');
  const disagreementsFile = args.disagreements || fail('--disagreements=<file.jsonl> is required');
  const outcomesFile = args.outcomes || fail('--outcomes=<file.jsonl> is required');

  const schema = JSON.parse(fs.readFileSync(args.schema || path.join(path.dirname(rulingsFile), 'schema.json'), 'utf8')).schema;
  const lines = fs.readFileSync(rulingsFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseHeaders = headers();

  const counts = { rulings: lines.length, written: 0, refused: 0, disagreements: 0, type_written: 0, supports_written: 0 };
  for (const line of lines) {
    let ruling;
    try { ruling = JSON.parse(line); } catch (e) { fail(`unparseable ruling line: ${e.message}`); }

    const problems = validate(ruling, schema);
    if (problems.length) {
      counts.refused++;
      fs.appendFileSync(outcomesFile, JSON.stringify({ backlog_id: ruling.backlog_id, written: false, refused_by: 'driver', problems }) + '\n');
      continue;
    }

    const [stored] = await rest(`backlog_items?backlog_id=eq.${encodeURIComponent(ruling.backlog_id)}&select=backlog_id,priority_class,type,title`);
    if (!stored) {
      counts.refused++;
      fs.appendFileSync(outcomesFile, JSON.stringify({ backlog_id: ruling.backlog_id, written: false, refused_by: 'driver', problems: ['no such backlog_items row'] }) + '\n');
      continue;
    }

    // THE GUARD. Read back at write time, not at prep time -- a class John set while this run was in
    // flight still wins.
    let priority_class = ruling.priority_class;
    if (stored.priority_class) {
      if (stored.priority_class !== ruling.priority_class) {
        counts.disagreements++;
        fs.appendFileSync(disagreementsFile, JSON.stringify({
          backlog_id: ruling.backlog_id,
          title: stored.title,
          stored_class: stored.priority_class,
          prioritizer_class: ruling.priority_class,
          reason: ruling.supports_reason || null,
          claim_refs: ruling.claim_refs || [],
          confidence: ruling.confidence,
        }) + '\n');
      }
      priority_class = stored.priority_class;
    }

    const norm = normalizeType(ruling.type);
    if (norm.error) {
      counts.refused++;
      fs.appendFileSync(outcomesFile, JSON.stringify({ backlog_id: ruling.backlog_id, written: false, refused_by: 'driver', problems: [norm.error] }) + '\n');
      continue;
    }

    const content = {
      backlog_id: ruling.backlog_id,
      priority_class,
      supports_class: ruling.supports_class ?? null,
      supports_reason: ruling.supports_class ? ruling.supports_reason : null,
      type: norm.type,
      claim_refs: ruling.claim_refs || [],
      confidence: ruling.confidence,
    };

    const result = await prioritizerWrite({
      agent_id: AGENT,
      tenant_id: TENANT,
      content,
      supabaseUrl,
      supabaseHeaders,
      handler_context: { trace_id: `ses-332-${ruling.backlog_id}` },
    });
    const hr = result.handler_result;
    if (hr.written) {
      counts.written++;
      if (hr.applied?.type) counts.type_written++;
      if (hr.applied?.supports_class) counts.supports_written++;
    } else {
      counts.refused++;
    }
    fs.appendFileSync(outcomesFile, JSON.stringify({ backlog_id: ruling.backlog_id, ...hr }) + '\n');

    // The audit row, through the real script (§3f: "the log row is mandatory, not a courtesy").
    // Tokens are the sub-agent's own per-ticket estimate; the script refuses a non-integer, so a
    // missing estimate lands as 0 rather than as an invented number.
    execFileSync(process.execPath, [
      path.join(HERE, 'agent-log.js'),
      `--agent=${AGENT}`, `--capability=${CAPABILITY}`, `--model=claude-fable-5-1`,
      `--ai-type=${CAPABILITY}`, `--feature=${CAPABILITY}:${INTENT}:depth0`,
      `--input-tokens=${Number(ruling.input_tokens) || 0}`,
      `--output-tokens=${Number(ruling.output_tokens) || 0}`,
      `--trace=ses-332-${ruling.backlog_id}`,
      ...(args.cycle ? [`--cycle=${args.cycle}`] : []),
    ], { stdio: 'pipe', env: process.env });
  }

  process.stdout.write(JSON.stringify(counts) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_URL) fail('SUPABASE_URL not set');
  if (!process.env.SUPABASE_SERVICE_KEY) fail('SUPABASE_SERVICE_KEY not set');
  if (args.prep) return prep(args);
  if (args.apply) return apply(args);
  fail('one of --prep or --apply is required');
}

if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => fail(e.message));
}

export { validate, normalizeType, splitPrompt, TYPE_CANON };
