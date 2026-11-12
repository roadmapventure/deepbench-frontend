#!/usr/bin/env node
// DeepBench v7.0.1011 | scripts/library-sync.js | AGT-651 -- the principal's Library sync, in the repo. A Node port of the
// session-only Python loader (AGT-645): reads a manifest of local documents, extracts text (md/txt/docx/pdf), splits it at
// headings into public.personal_source_sections, stores the original bytes in public.personal_source_files, and versions
// every item by sha256 (an unchanged item writes nothing; a changed one gets a new version row and the old row is marked
// superseded, never deleted). Two more sources ride the same versioning: a product snapshot of the dashboard repo
// (--product-repo) and the connections export (--connections). With OPENAI_API_KEY set, every section and strategy record
// that has no embedding yet is embedded through lib/vector-search.js embedContent() and each call is logged.
//
// METHOD ONLY. The manifest, the connections export and every personal document stay OUTSIDE this repository: --manifest
// refuses a path inside it. No personal path, person or client name lives in this file.
//
// THE TESTIMONY FOLDERS. The product snapshot never reads or lists anything under EXCLUDED_DIRS (testimony and named
// individuals). It reads only the repo's top-level entries, the last 30 commit subjects, and the `#` headings of the
// top-level architecture and patch-notes files. tests/regression/agt-651-harry-mentor-routines.test.mjs proves the exclusion.
//
// Usage:
//   node scripts/library-sync.js --manifest=<path outside the repo> [--product-repo=<path>] [--connections=<csv>]
//                                [--only=documents|product_snapshot|connections|embeddings] [--dry-run]
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (required); OPENAI_API_KEY (optional).
// Stdout: one JSON summary {added, versioned, unchanged, sections, files, embedded}. Exit 2 on a refused argument.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EXCLUDED_DIRS = ['registers', 'notes', 'audit', 'canon', 'consultant', 'trials', 'survey', 'ask_log'];
export const BODY_MAX = 12000;          // the Python loader's rule: body kept inline only up to 12,000 characters
export const CHUNK_CHARS = 8000;        // a heading-less long text is chunked at paragraph breaks near 8,000 characters
export const COMMITS = 30;
export const SOURCES = ['documents', 'product_snapshot', 'connections', 'embeddings'];
const LOADED_BY = 'library-sync.js AGT-651';

// ---------------------------------------------------------------------------------------------
// Pure parts (the test imports these)
// ---------------------------------------------------------------------------------------------

// True when `p` is the repo root or anything below it. Windows paths compare case-insensitively.
export function isInsideRepo(p, root = ROOT) {
  const norm = s => (process.platform === 'win32' ? path.resolve(s).toLowerCase() : path.resolve(s));
  const rel = path.relative(norm(root), norm(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

// The Python loader's split_sections(), line for line: a `#`..`###` line opens a section (heading capped at 300
// characters); text before the first heading is a heading-less section; a long heading-less text is chunked.
export function splitSections(text) {
  let parts = [];
  let head = null;
  let cur = [];
  const flush = () => { if (cur.join('').trim()) parts.push([head, cur.join('\n').trim()]); };
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^(#{1,3})\s+(.*)/);
    if (m) { flush(); head = m[2].trim().slice(0, 300); cur = []; } else cur.push(line);
  }
  flush();
  if (parts.length <= 1 && text.length > BODY_MAX) {
    parts = [];
    let buf = '';
    for (const para of String(text).split(/\n\s*\n/)) {
      if (buf.length + para.length > CHUNK_CHARS && buf) { parts.push([null, buf.trim()]); buf = ''; }
      buf += para + '\n\n';
    }
    if (buf.trim()) parts.push([null, buf.trim()]);
  }
  return parts;
}

// Whether a source's sections get their own rows (the Python rule).
export const writesSections = (sections, text) => sections.length > 0 && (sections.length > 1 || text.length > BODY_MAX);

// Splits a connections export into one section per company. The export opens with preamble lines (a notes block)
// before its header row; everything above the line that starts `First Name,` is skipped.
export function parseConnections(csvText) {
  const Papa = require('papaparse');
  const lines = String(csvText).replace(/^﻿/, '').split(/\r?\n/);
  const at = lines.findIndex(l => /^"?First Name"?,/.test(l));
  if (at < 0) throw new Error('connections: no header row starting "First Name," was found');
  const { data } = Papa.parse(lines.slice(at).join('\n'), { header: true, skipEmptyLines: true });
  const byCompany = new Map();
  for (const r of data) {
    const name = [r['First Name'], r['Last Name']].map(s => (s || '').trim()).filter(Boolean).join(' ');
    if (!name) continue;
    const company = (r.Company || '').trim() || '(no company)';
    const line = `${name} — ${(r.Position || '').trim()} — ${(r['Connected On'] || '').trim()}`;
    if (!byCompany.has(company)) byCompany.set(company, []);
    byCompany.get(company).push(line);
  }
  const sections = [...byCompany.keys()].sort((a, b) => a.localeCompare(b))
    .map(company => [company.slice(0, 300), byCompany.get(company).join('\n')]);
  return { people: data.length, sections };
}

// The product snapshot's text. Reads ONLY: the repo's top-level entries (minus the excluded folders and dot entries),
// the last COMMITS commit subjects, and the `#` headings of top-level *architecture* / *patch notes* markdown files.
// It never opens a path under an excluded folder, so nothing beneath one can reach the text.
export function productSnapshotText(repo, { gitLog = defaultGitLog } = {}) {
  const top = fs.readdirSync(repo, { withFileTypes: true })
    .filter(d => !d.name.startsWith('.') && !EXCLUDED_DIRS.includes(d.name.toLowerCase()));
  const folders = top.filter(d => d.isDirectory()).map(d => d.name).sort();
  const docs = top.filter(d => d.isFile() && /\.md$/i.test(d.name) && /(architecture|patch[ _-]?notes)/i.test(d.name))
    .map(d => d.name).sort();
  const out = ['# Recent commits', ...gitLog(repo).map(s => `- ${s}`), '', '# Top-level folders', ...folders.map(f => `- ${f}/`)];
  for (const name of docs) {
    const heads = fs.readFileSync(path.join(repo, name), 'utf8').split(/\r?\n/).filter(l => /^#{1,6}\s+\S/.test(l))
      .map(l => `- ${l.replace(/^#+\s+/, '').trim()}`);
    out.push('', `# Headings of ${name}`, ...heads);
  }
  return out.join('\n') + '\n';
}

function defaultGitLog(repo) {
  const r = spawnSync('git', ['-C', repo, 'log', `-${COMMITS}`, '--format=%s'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`product snapshot: git log failed in the product repo: ${(r.stderr || '').trim().slice(0, 200)}`);
  return r.stdout.split(/\r?\n/).filter(Boolean);
}

export function parseArgs(argv) {
  const a = { dryRun: false };
  for (const s of argv) {
    if (s === '--dry-run') a.dryRun = true;
    else if (s.startsWith('--manifest=')) a.manifest = s.slice(11);
    else if (s.startsWith('--product-repo=')) a.productRepo = s.slice(15);
    else if (s.startsWith('--connections=')) a.connections = s.slice(14);
    else if (s.startsWith('--only=')) a.only = s.slice(7);
    else throw new Error(`unknown argument ${s}`);
  }
  if (!a.manifest) throw new Error('--manifest=<path> is required');
  if (isInsideRepo(a.manifest)) throw new Error('--manifest must be outside the repository: the manifest and every personal document stay out of the repo');
  if (a.only && !SOURCES.includes(a.only)) throw new Error(`--only must be one of ${SOURCES.join(', ')}`);
  return a;
}

// ---------------------------------------------------------------------------------------------
// Text extraction (documents)
// ---------------------------------------------------------------------------------------------

const xmlText = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// docx through jszip (already a dependency): paragraphs in order, a Heading*/Title style becomes `# `, then every
// table row as `cell | cell`, as the Python loader's python-docx pass wrote them.
async function extractDocx(raw) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(raw);
  const xml = await zip.file('word/document.xml').async('string');
  const body = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');
  const lines = [];
  for (const p of body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) {
    const t = xmlText(p.replace(/<w:tab\/>/g, '\t')).trim();
    if (!t) continue;
    const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
    lines.push(/^(heading|title)/i.test(style) ? `# ${t}` : t);
  }
  for (const tbl of xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []) {
    for (const row of tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []) {
      lines.push((row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(c => xmlText(c).trim()).join(' | '));
    }
  }
  return lines.join('\n\n');
}

// pdf through `pdftotext -layout` (the Python loader's tool); pdf-parse (already a dependency) when it is absent.
async function extractPdf(file, raw) {
  const r = spawnSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 0 && !r.error) return r.stdout;
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  return (await pdfParse(raw)).text;
}

async function extract(file, raw) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.docx') return extractDocx(raw);
  if (ext === '.pdf') return extractPdf(file, raw);
  return raw.toString('utf8');
}

const MIME = { '.md': 'text/markdown', '.txt': 'text/plain', '.csv': 'text/csv', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

// ---------------------------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------------------------

function rest() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (read them by name from public.runner_secrets)');
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  return async (method, p, body) => {
    const r = await fetch(`${url}/rest/v1/${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) throw new Error(`${method} ${p.split('?')[0]} answered HTTP ${r.status}: ${t.slice(0, 300)}`);
    return t ? JSON.parse(t) : null;
  };
}

// One versioned item: skip when the current row for this origin has the same sha256; otherwise insert a new version
// (sections and file bytes with it) and supersede the old row. Dry run counts what would be written and writes nothing.
async function syncItem(call, sum, { origin, sha, row, text, sections, file, dryRun }) {
  const existing = await call('GET', `personal_sources?select=id,sha256,version&status=eq.current&origin=eq.${encodeURIComponent(origin)}`);
  const prev = existing && existing[0];
  if (prev && prev.sha256 === sha) { sum.unchanged++; return `unchanged  ${row.title}`; }
  const secs = typeof sections === 'function' ? await sections() : sections;
  const body = typeof text === 'function' ? await text() : text;
  const list = secs || splitSections(body);
  const sectionRows = (secs || writesSections(list, body)) ? list : [];
  if (prev) sum.versioned++; else sum.added++;
  sum.sections += sectionRows.length;
  if (file) sum.files++;
  const label = `${prev ? `new v${prev.version + 1}` : 'added'}  ${row.title}  (${body.length} chars, ${list.length} sections)`;
  if (dryRun) return `[dry-run] ${label}`;
  const [created] = await call('POST', 'personal_sources', {
    ...row, origin, sha256: sha, body: body.length <= BODY_MAX ? body : null, version: prev ? prev.version + 1 : 1,
    data: { ...(row.data || {}), chars: body.length, sections: list.length, loaded_by: LOADED_BY },
  });
  if (sectionRows.length) {
    await call('POST', 'personal_source_sections', sectionRows.map(([heading, b], ord) => ({ source_id: created.id, ord, heading, body: b })));
  }
  if (file) {
    await call('POST', 'personal_source_files', { source_id: created.id, filename: file.filename, mime: file.mime,
      bytes: '\\x' + file.raw.toString('hex'), size_bytes: file.raw.length, sha256: sha });
  }
  if (prev) await call('PATCH', `personal_sources?id=eq.${prev.id}`, { status: 'superseded', superseded_by: created.id });
  return label;
}

async function syncDocuments(call, sum, manifest, dryRun) {
  const items = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  for (const it of items) {
    try {
      const raw = fs.readFileSync(it.path);
      const row = { title: it.title };
      for (const k of ['kind', 'section', 'purpose', 'trust', 'sensitivity', 'audience', 'doc_date']) if (it[k] !== undefined) row[k] = it[k];
      let text;
      const getText = async () => (text ??= await extract(it.path, raw));
      console.error(await syncItem(call, sum, {
        origin: it.path, sha: sha256(raw), row, dryRun, text: getText,
        file: { filename: path.basename(it.path), mime: MIME[path.extname(it.path).toLowerCase()] || 'application/octet-stream', raw },
      }));
    } catch (e) {
      sum.failed = (sum.failed || 0) + 1;
      console.error(`FAIL  ${it.title}  ${String(e.message || e).slice(0, 300)}`);
    }
  }
}

async function syncProductSnapshot(call, sum, repo, dryRun) {
  const abs = path.resolve(repo);
  const text = productSnapshotText(abs);
  const date = new Date().toISOString().slice(0, 10);
  console.error(await syncItem(call, sum, {
    origin: `product-repo:${path.basename(abs)}`, sha: sha256(Buffer.from(text, 'utf8')), text, dryRun,
    row: { title: `Dashboard product state ${date}`, kind: 'product_snapshot', section: 'evidence', trust: 'measured', sensitivity: 'client_private' },
  }));
}

async function syncConnections(call, sum, csvPath, dryRun) {
  const raw = fs.readFileSync(csvPath);
  const { sections } = parseConnections(raw.toString('utf8'));
  const text = sections.map(([h, b]) => `# ${h}\n${b}`).join('\n\n');
  console.error(await syncItem(call, sum, {
    origin: path.resolve(csvPath), sha: sha256(raw), text, sections, dryRun,
    row: { title: 'Connections', kind: 'connections', section: 'log', trust: 'measured', sensitivity: 'personal_private' },
    file: { filename: path.basename(csvPath), mime: 'text/csv', raw },
  }));
}

// Every section row and strategy record with a null embedding, through embedContent(), each call logged as
// lib/knowledge-write.js logs its own (model text-embedding-3-small, total tokens, latency, patterns ['embeddings']).
async function embedMissing(call, sum, dryRun) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) { console.error('embeddings: skipped (no key)'); return; }
  const [{ embedContent }, { logActivity }, { MAX_EMBED_CHARS }] = await Promise.all([
    import('../lib/vector-search.js'), import('../lib/activity-log.js'), import('../lib/knowledge-write.js'),
  ]);
  const targets = [
    ['personal_source_sections', 'id,heading,body', r => `${r.heading || ''}\n\n${r.body || ''}`],
    ['strategy_records', 'id,title,body', r => `${r.title || ''}\n\n${r.body || ''}`],
  ];
  for (const [table, cols, textOf] of targets) {
    const rows = await call('GET', `${table}?select=${cols}&embedding=is.null&limit=5000`);
    if (dryRun) { console.error(`[dry-run] embeddings: ${rows.length} ${table} rows would be embedded`); continue; }
    for (const r of rows) {
      const t = textOf(r).replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '  ').trim().slice(0, MAX_EMBED_CHARS);
      if (!t) continue;
      const start = Date.now();
      const { embedding, usage } = await embedContent(t, openaiKey);
      await logActivity({ tenantId: 'global', agentId: null, aiType: 'reinforcement', feature: 'library-sync',
        model: 'text-embedding-3-small', inputTokens: usage?.total_tokens ?? null, latencyMs: Date.now() - start, patternsUsed: ['embeddings'] });
      await call('PATCH', `${table}?id=eq.${r.id}`, { embedding: JSON.stringify(embedding) });
      sum.embedded++;
    }
  }
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`library-sync: ${e.message}`); process.exit(2); }
  const call = rest();
  const sum = { added: 0, versioned: 0, unchanged: 0, sections: 0, files: 0, embedded: 0 };
  const want = s => !args.only || args.only === s;
  if (want('documents')) await syncDocuments(call, sum, args.manifest, args.dryRun);
  if (want('product_snapshot') && args.productRepo) await syncProductSnapshot(call, sum, args.productRepo, args.dryRun);
  if (want('connections') && args.connections) await syncConnections(call, sum, args.connections, args.dryRun);
  if (want('embeddings')) await embedMissing(call, sum, args.dryRun);
  const { failed, ...out } = sum;
  if (failed) console.error(`library-sync: ${failed} item(s) failed`);
  console.log(JSON.stringify(out));
  if (failed) process.exitCode = 1;
}

if (process.argv[1]
    && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  main().catch(e => { console.error(`library-sync: ${e.message || e}`); process.exit(1); });
}
