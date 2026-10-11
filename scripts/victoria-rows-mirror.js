#!/usr/bin/env node
// DeepBench v7.0.849 | scripts/victoria-rows-mirror.js | AGT-453 -- EXPECTED_BINDINGS + bindingDrift(): the one hand-written list of the requirement-check bindings; agt-281 and agt-452 import it.
// DeepBench v7.0.848 | scripts/victoria-rows-mirror.js | AGT-452 -- THE REPO'S RECORD OF VICTORIA'S
// ROWS, GENERATED FROM A READ.
//
// THE DEFECT, measured live 2026-10-11 on the unchanged tree (kickoff §2). Victoria's prioritization
// rules live in four `skill_profiles` rows -- `vc-john-severity-tree`, `vc-prioritization-duty`,
// `vc-requirement-intent`, `vc-reorganize-intent` -- bound to the `requirement-check` capability in
// six ordered `capability_skill_profiles` rows. No tracked file carried the text of three of them,
// and the one mirror that existed, `docs/design/agt-281-reorganize-intent.sql`, was already STALE:
// its objective literal hashed `266f2d40...` where the live row hashes `357da741...`. So the rules the
// duty actually reads had no repo record, and the one record that looked like one was wrong -- which
// is worse than none, because a cold session trusts it.
//
// WHAT THIS IS, AND WHAT IT IS NOT. It is a GENERATOR and a DRIFT DETECTOR, in that order:
// `--write` reads the live rows and rewrites the section of `docs/design/agt-452-victoria-rows.sql`
// between the two marker lines; `--check` reads them again and reports the first line where the file
// and the rows disagree. It is NOT a migration and NOT a writer: nothing here, and nothing in what it
// generates, writes, moves or removes a row (AGT-452's own constraint -- the record records the rows,
// it never edits them). The generated section is one asserting `do $agt452$ ... end $agt452$;` block,
// safe to paste into the Supabase SQL channel, whose only effects are a `raise exception` naming the
// first column that has moved, or a `raise notice` saying the record still matches.
//
// GENERATED, NEVER TYPED, and that is the whole safety argument (pattern:3, pattern:93). A row's text
// is 16 KB of John's own words in one case; a human transcribing it introduces exactly the class of
// error the stale AGT-281 mirror already proves. So no row text is ever written by hand here: it is
// read over PostgREST and dollar-quoted verbatim. A value that itself contains the quote tag THROWS
// rather than producing a literal that would reinterpret as SQL.
//
// WHY A DO BLOCK AND NOT A DUMP OF INSERTS (the Designer's call, harvest §5). A dump of the rows is a
// file that can only be read by a human and only applied by overwriting the live rows -- the one thing
// this ticket must not do. An asserting block is readable as a record AND runnable as a check: the
// repo's claim about the rows is executable against the rows.
//
// USAGE
//   node scripts/victoria-rows-mirror.js --write [--file=<p>]
//   node scripts/victoria-rows-mirror.js --check [--file=<p>]
//
// FLAGS
//   --write        read the live rows and replace the file's RECORD section with the rendered block.
//                  Both marker lines must already be in the file (this never invents a file, and it
//                  never touches a byte outside the section).
//   --check        read the live rows and compare them with the file's RECORD section, byte for byte.
//   --file=<p>     a file other than docs/design/agt-452-victoria-rows.sql -- used by the guard test
//                  to point at a scratch copy with one byte changed (the control).
//   Exactly one of --write / --check.
//
// EXIT CODES
//   0  --check: the record equals the live rows. --write: the file was rewritten.
//   1  --check only: DRIFT, naming the first differing line. A finding, never a crash.
//   2  usage, missing credentials, a PostgREST failure, a profile count other than four, a marker
//      count other than one, or a value carrying the quote tag.
// Exit codes are set with process.exitCode, never process.exit() (Windows/Node 24 libuv abort).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The four rows, in the order the record renders them. NOT the order PostgREST returns them in
// (`slug.asc` puts `vc-reorganize-intent` before `vc-requirement-intent`): the render order is this
// declaration, so the record reads knowledge-then-intents the way the capability stacks them, and
// rendering is independent of how the fetch happens to sort.
export const SLUGS = [
  "vc-john-severity-tree",
  "vc-prioritization-duty",
  "vc-requirement-intent",
  "vc-reorganize-intent",
];

// Every column of a skill_profiles row that carries content or routing. `id`, `created_at` and
// `updated_at` are deliberately absent: an id is a surrogate and the timestamps are the one thing
// that moves without the rules moving, so pinning them would make the guard red on a touch that
// changed nothing (pattern:162 -- grade the change, never the clock).
export const PCOLS = [
  "slug", "name", "description", "skill_type_slug", "objective", "method", "output_desc", "tone",
  "confidence", "traits", "guardrails", "notes", "technical_services", "execution_type", "tenant_id",
  "llm_provider", "llm_model", "max_tokens", "api_key_source", "temperature",
];

export const BCOLS = ["capability_slug", "skill_profile_slug", "level", "is_required", "display_order"];

export const CAPABILITY = "requirement-check";

// §2's six bindings of `requirement-check`, in `display_order`. HAND-WRITTEN on purpose, and this is
// the ONE place in the repo that writes them down (AGT-453): derived from a read of the live rows it
// would make every guard that imports it assert that the rows equal themselves. AGT-434 (which
// removes the north-star link) edits THIS array and nothing else, then runs `--write`.
export const EXPECTED_BINDINGS = [
  "deepbench-north-star", "vc-requirement-intent", "vc-reorganize-intent",
  "vc-process-break-class", "vc-john-severity-tree", "vc-prioritization-duty",
];

// null when `bindings` is exactly `expected` in `display_order`; otherwise ONE string naming the
// FIRST drift, in this order: `missing <slugs>` (expected, not live), `extra <slugs>` (live, not
// expected), `duplicate <slugs>` (bound twice), `order: position <i> is <live>, expected <slug>`.
// TWO-DIRECTION by construction -- a missing binding and an extra one are different messages, so
// neither can pass as the other, which the one-direction deepEqual this replaced could not say.
// Pure: no network, no fs, and it writes no row. Reads only `skill_profile_slug`/`display_order`.
export function bindingDrift(bindings, expected = EXPECTED_BINDINGS) {
  const live = [...(bindings ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map(b => b.skill_profile_slug);
  const uniq = a => [...new Set(a)];
  const missing = expected.filter(s => !live.includes(s));
  if (missing.length) return `missing ${uniq(missing).join(", ")}`;
  const extra = live.filter(s => !expected.includes(s));
  if (extra.length) return `extra ${uniq(extra).join(", ")}`;
  const twice = live.filter((s, i) => live.indexOf(s) !== i);
  if (twice.length) return `duplicate ${uniq(twice).join(", ")}`;
  const name = s => (s === undefined ? "<nothing>" : s);
  for (let i = 0; i < Math.max(live.length, expected.length); i++) {
    if (live[i] !== expected[i]) return `order: position ${i} is ${name(live[i])}, expected ${name(expected[i])}`;
  }
  return null;
}

// The three jsonb columns. They are rendered as JSON text cast to jsonb, so the comparison is a jsonb
// comparison and key order on either side is not drift.
export const JSONB_COLS = new Set(["traits", "guardrails", "technical_services"]);

// The dollar-quote tag. Checked live at this ship: no value of the four rows contains a `$` at all,
// so no value can close the quote. Checked again at render time anyway, because "no $ today" is a
// measurement, not an invariant.
export const TAG = "$r452$";

export const FILE = "docs/design/agt-452-victoria-rows.sql";
export const BEGIN = "-- AGT-452 RECORD BEGIN (generated by scripts/victoria-rows-mirror.js; never edit by hand)";
export const END = "-- AGT-452 RECORD END";

export class UsageError extends Error {}

const md5 = s => crypto.createHash("md5").update(String(s), "utf8").digest("hex");

// A value as a SQL literal. `undefined` is a MISSING COLUMN and throws -- returning NULL for it would
// quietly record "this column is null" about a column the read never asked for.
export function LIT(v, col) {
  if (v === undefined) throw new UsageError(`AGT-452: column ${col} is absent from the row that was read`);
  if (v === null) return "NULL";
  if (JSONB_COLS.has(col)) return `${tagged(JSON.stringify(v), col)}::jsonb`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return tagged(String(v), col);
}

function tagged(s, col) {
  if (s.includes(TAG)) {
    throw new UsageError(
      `AGT-452: the value of ${col} contains the quote tag ${TAG}, so a dollar-quoted literal of it ` +
      `would close early and the rest would reinterpret as SQL. Change the tag in this script (and ` +
      `regenerate) rather than editing the row.`);
  }
  return `${TAG}${s}${TAG}`;
}

// The RECORD: one asserting DO block. Reads the rows it is handed; writes nothing, anywhere.
export function renderRecord({ profiles, bindings }) {
  const bySlug = new Map((profiles ?? []).map(p => [p.slug, p]));
  const ordered = [...(bindings ?? [])].sort((a, b) => a.display_order - b.display_order);
  const L = [];
  L.push("do $agt452$");
  L.push("declare r record; n int;");
  L.push("begin");
  for (const slug of SLUGS) {
    const p = bySlug.get(slug);
    if (!p) throw new UsageError(`AGT-452: no row was read for ${slug}`);
    L.push("");
    L.push(`  -- skill_profiles · ${slug} · ${p.skill_type_slug} · method md5 ${md5(p.method)}`);
    L.push(`  select * into r from public.skill_profiles where slug = ${LIT(slug, "slug")};`);
    L.push(`  if not found then raise exception 'AGT-452 drift: ${slug} missing'; end if;`);
    for (const col of PCOLS) {
      L.push(`  if r.${col} is distinct from ${LIT(p[col], col)}`);
      L.push(`    then raise exception 'AGT-452 drift: ${slug}.${col}'; end if;`);
    }
  }
  for (const b of ordered) {
    L.push("");
    L.push(`  -- capability_skill_profiles · ${b.capability_slug} · ${b.skill_profile_slug} · display_order ${b.display_order}`);
    L.push(`  select count(*) into n from public.capability_skill_profiles where`);
    L.push(`    ${BCOLS.map(c => `${c} is not distinct from ${LIT(b[c], c)}`).join(" and ")};`);
    L.push(`  if n <> 1 then raise exception 'AGT-452 drift: binding ${b.skill_profile_slug}'; end if;`);
  }
  L.push("");
  L.push(`  -- and nothing else is bound to the capability: ${ordered.length} is the whole list.`);
  L.push(`  select count(*) into n from public.capability_skill_profiles`);
  L.push(`    where capability_slug is not distinct from ${LIT(CAPABILITY, "capability_slug")};`);
  L.push(`  if n <> ${ordered.length} then raise exception 'AGT-452 drift: ${CAPABILITY} binds % profiles, the record says ${ordered.length}', n; end if;`);
  L.push("");
  L.push(`  raise notice 'AGT-452: ${SLUGS.length} rows and ${ordered.length} bindings match the record';`);
  L.push("end $agt452$;");
  return L.join("\n");
}

// The lines strictly between the two marker LINES. Each marker must be a whole line exactly once --
// the same whole-line rule scripts/check-routine-prompt.js uses, so a marker quoted inside prose
// somewhere else in the file is not a marker.
export function extractSection(text) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const at = m => lines.flatMap((l, i) => (l === m ? [i] : []));
  const a = at(BEGIN), b = at(END);
  if (a.length !== 1) throw new UsageError(`the BEGIN marker must be a whole line exactly once (got ${a.length})`);
  if (b.length !== 1) throw new UsageError(`the END marker must be a whole line exactly once (got ${b.length})`);
  if (b[0] <= a[0]) throw new UsageError("the END marker precedes the BEGIN marker");
  return { text: lines.slice(a[0] + 1, b[0]).join("\n"), beginLine: a[0] + 1, endLine: b[0] + 1 };
}

async function rest(url, key, q) {
  let res;
  try {
    res = await fetch(`${url}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    throw new UsageError(`PostgREST unreachable: ${e.message}`);
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new UsageError(`PostgREST HTTP ${res.status} on ${q.split("?")[0]}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { throw new UsageError(`PostgREST returned non-JSON on ${q.split("?")[0]}`); }
}

// The live rows. Service key, read-only: two GETs and nothing else.
export async function fetchRows(url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY) {
  if (!url || !key) throw new UsageError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required (read them by name from public.runner_secrets and export them inline)");
  const profiles = await rest(url, key,
    `skill_profiles?select=${PCOLS.join(",")}&slug=in.(${SLUGS.join(",")})&order=slug.asc`);
  if (!Array.isArray(profiles) || profiles.length !== SLUGS.length) {
    throw new UsageError(`expected ${SLUGS.length} skill_profiles rows for ${SLUGS.join(", ")}; read ${Array.isArray(profiles) ? profiles.length : "none"}`);
  }
  const bindings = await rest(url, key,
    `capability_skill_profiles?select=${BCOLS.join(",")}&capability_slug=eq.${CAPABILITY}&order=display_order.asc`);
  if (!Array.isArray(bindings) || bindings.length === 0) throw new UsageError(`no ${CAPABILITY} bindings were read`);
  return { profiles, bindings };
}

// null when the file's section equals the rendered record; otherwise a message naming the FIRST line
// that differs, with its line number in the file. One line, because one changed byte is one changed
// line and a diff of 16 KB of prose is not a finding anyone reads.
export function compare(fileText, rows) {
  const section = extractSection(fileText);
  const want = renderRecord(rows);
  const have = section.text;
  if (have === want) return null;
  const h = have.split("\n"), w = want.split("\n");
  let i = 0;
  while (i < h.length && i < w.length && h[i] === w[i]) i++;
  const fileLine = section.beginLine + 1 + i;
  const cut = s => (s === undefined ? "<the section ends here>" : JSON.stringify(s.length > 160 ? `${s.slice(0, 160)}…` : s));
  return `AGT-452 DRIFT at line ${fileLine}: file has ${cut(h[i])} where the live rows render ${cut(w[i])}`;
}

export function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(s);
    if (!m) throw new UsageError(`unknown argument ${s}`);
    if (!["write", "check", "file"].includes(m[1])) throw new UsageError(`unknown flag --${m[1]}`);
    a[m[1]] = m[2] ?? "";
  }
  if ((a.write !== undefined) === (a.check !== undefined)) throw new UsageError("exactly one of --write / --check");
  if (a.file !== undefined && !a.file) throw new UsageError("--file needs a path");
  return a;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const a = parseArgs(argv);
    const file = a.file ? path.resolve(a.file) : path.join(ROOT, FILE);
    let text;
    try { text = fs.readFileSync(file, "utf8"); }
    catch (e) { throw new UsageError(`cannot read ${file}: ${e.code ?? e.message}`); }
    const section = extractSection(text);                 // both markers, before any network call
    const rows = await fetchRows();
    if (a.check !== undefined) {
      const drift = compare(text, rows);
      if (drift) { console.log(drift); process.exitCode = 1; return; }
      console.log(`AGT-452: record equals live (${rows.profiles.length} rows, ${rows.bindings.length} bindings)`);
      process.exitCode = 0;
      return;
    }
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const next = [
      ...lines.slice(0, section.beginLine),               // through the BEGIN marker line
      ...renderRecord(rows).split("\n"),
      ...lines.slice(section.endLine - 1),                // from the END marker line on
    ].join("\n");
    fs.writeFileSync(file, next, "utf8");
    console.log(`AGT-452: wrote the record into ${path.relative(ROOT, file) || file} ` +
      `(${rows.profiles.length} rows, ${rows.bindings.length} bindings, ${renderRecord(rows).split("\n").length} lines)`);
    process.exitCode = 0;
  } catch (e) {
    console.error(`victoria-rows-mirror: ${e instanceof UsageError ? "" : "error: "}${e.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}
