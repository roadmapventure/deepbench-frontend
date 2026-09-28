#!/usr/bin/env node
// DeepBench v7.0.673 | scripts/check-findings-intake.js | AGT-160 -- A FINDING HAS ONE HOME AND A
// TICKET HAS ONE AUTHOR, AND BOTH ARE NOW GRADED BY A COMMAND INSTEAD OF BY MEMORY.
//
// Two clauses, both measured on this tree this cycle rather than recalled:
//
//   A  THE ONE FILING PATH. `git grep rest/v1/backlog_items` over `api/ scripts/ lib/` returns
//      exactly ONE INSERT -- scripts/tripwire-to-backlog.js:520, The Development Manager's own
//      filing path -- and NOTHING PINNED IT. So the value of this clause is the pin, never a
//      deletion: the day a second writer appears, this exits 1 naming it. It matches the POST,
//      NOT THE URL, because scripts/export-backlog-snapshot.js holds the same URL for a GET
//      (that file is the live negative control, and arm A of the regression file uses it as one):
//      a URL-only test would have refused the snapshot exporter for reading the board.
//
//   B  THE SIX AGENTS' DIRECTIVE. The AGT-131 intake shipped (`scripts/audit-ledger.js`,
//      `ingestFindings()`) and 0 of the eight `public.skill_profiles` guardrail rows name
//      `audit_findings`, so no governance agent is told where a finding goes and findings stay in
//      run notes. This clause is REPORT-OR-ASK, never a red wording assertion, and that is a
//      scope call rather than a softened bar: `node scripts/agent-row-gate.js --ticket=AGT-160
//      --action=edit-active --json` answers
//      `{"verdict":"gated","rule":"AGENT-ROW-AGREED-TICKET","clause":"no-authority"}` because
//      AGT-160's `scope_origin` is `discovered`, so the eight words are NOT buildable unattended
//      and wait on John's signature. A slug is satisfied by the WORDING or by the standing ask
//      that asks for the wording; it refuses only when a slug has neither, and it prints the
//      paste-ready `--file-card` line that creates the ask.
//
// ABSENT CREDENTIALS ARE NOT GRADED, THE EXIT CODE IS UNTOUCHED, AND THE GREEN SAYS SO (§19v, the
// shape scripts/verifier.js uses for its AGT-189 clause). Clause B is a live read; a machine with
// no service key cannot grade it, and a green that quietly covered the ungraded half would be the
// false green the whole check exists to remove.
//
// NOT IN SCOPE, AND UNWRITTEN BY THIS BUILD ON PURPOSE (both filed as findings through the intake,
// never as tickets -- only The Development Manager files):
//   (a) the eight `skill_profiles` guardrail rows -- gated above; `--file-card` asks instead.
//   (b) docs/runbooks/runner-cycle.md -- 380,862 of its 381,000-byte ceiling, with its sha256
//       pinned in docs/runbooks/cycle-card.md, so a one-byte edit reds two green tests and forces
//       a card re-render. The runbook says nothing about this check yet.
// The runner's own residue-ticket filing is AGT-133's and is untouched here.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Clause A -- the one filing path
// ---------------------------------------------------------------------------

// The complete set of code paths allowed to INSERT a ticket. One entry, and it is the Development
// Manager's own path. An addition here is a governance change, not a maintenance chore.
export const FILING_ALLOWLIST = Object.freeze(["scripts/tripwire-to-backlog.js"]);

export const SCAN_DIRS = Object.freeze(["api", "scripts", "lib", "src"]);
const SCAN_EXTS = Object.freeze([".js", ".mjs"]);

// The table, written once. Every matcher below is built from this constant so the check cannot
// drift from the thing it is checking (pattern:14, pattern:93).
const TABLE = "backlog_items";
const REST_PATH = `rest/v1/${TABLE}`;

// A COMMENT IS PROSE, NEVER A CALL, and dropping comment-only lines before any matching is the
// root-cause fix for a false positive this check produced against ITSELF the moment it became a
// tracked file (v7.0.673, found by running it rather than by reasoning about it): the header above
// QUOTES `fetch(`, quotes the table's REST path, and later quotes `method: "POST"`, so the matcher
// opened a slice inside the prose, never balanced it, swept the cap's worth of comment, and read
// this file as a second filing path. Both halves of the fix matter -- see the balance guard below.
export function stripCommentLines(text) {
  return String(text).split("\n").map(l => (/^\s*(\/\/|\/\*|\*)/.test(l) ? "" : l)).join("\n");
}

// A `fetch(` call's own text, parens balanced, strings skipped so a `(` inside a literal or a
// template cannot end the slice early. Capped, because an unterminated call must not walk the file.
//
// AN UNBALANCED SLICE IS NOT A CALL AND IS DISCARDED. That is the second half of the fix above and
// it is the structural half: a comment-only line can be dropped, but an inline `// see fetch(` on a
// line of real code cannot, and the cap's worth of text after it would otherwise be searched as if
// it were one call's options. A real call closes its parens.
function fetchCallSlices(text, cap = 4000) {
  const slices = [];
  const re = /\bfetch\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    const openIdx = m.index + m[0].length - 1;
    const end = Math.min(text.length, openIdx + cap);
    let depth = 0;
    let quote = null;
    for (let i = openIdx; i < end; i++) {
      const c = text[i];
      if (quote) {
        if (c === "\\") { i++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) { slices.push(text.slice(openIdx, i + 1)); break; }
      }
    }
  }
  return slices;
}

// `.from("backlog_items")` … `.insert(` -- the supabase-js form of the same write. Bounded lookahead
// rather than a single regex, so `.from(t).select(...)` on one line and `.insert()` on the next
// still reads as one chained call.
function hasClientInsert(text, lookahead = 400) {
  const re = new RegExp(`\\.from\\(\\s*["'\`]${TABLE}["'\`]\\s*\\)`, "g");
  let m;
  while ((m = re.exec(text))) {
    const tail = text.slice(m.index, m.index + lookahead);
    if (/\.insert\s*\(/.test(tail)) return true;
  }
  return false;
}

function hasRestPost(text) {
  for (const slice of fetchCallSlices(text)) {
    if (!slice.includes(REST_PATH)) continue;
    if (/\bmethod\s*:\s*["'`]POST["'`]/.test(slice)) return true;
  }
  return false;
}

/**
 * PURE. Given `{path, text}` records, return the paths whose text FILES A TICKET -- a
 * `rest/v1/backlog_items` occurrence inside a `fetch` whose options carry `method: "POST"`, or a
 * `.from("backlog_items").insert(`. A GET-only occurrence of the same URL does NOT count.
 * Sorted, so two runs over the same tree print the same set (pattern:3).
 */
export function filingPaths(files) {
  const hits = [];
  for (const f of Array.isArray(files) ? files : []) {
    const raw = typeof f?.text === "string" ? f.text : "";
    if (!raw.includes(TABLE)) continue;
    const text = stripCommentLines(raw);
    if (hasRestPost(text) || hasClientInsert(text)) hits.push(f.path);
  }
  return hits.sort();
}

// The comparison, pure and separate from the walk so the regression file can drive it with an
// emptied allowlist (arm A's discriminator).
export function filingVerdict(measured, allowlist = FILING_ALLOWLIST) {
  const allowed = new Set(allowlist);
  const measuredSet = new Set(measured);
  const unauthorized = measured.filter(p => !allowed.has(p)).sort();
  const stoppedFiling = [...allowed].filter(p => !measuredSet.has(p)).sort();
  return { measured: [...measured].sort(), unauthorized, stoppedFiling, ok: !unauthorized.length && !stoppedFiling.length };
}

// Tracked files only: an untracked scratch copy of a filing path is not a shipped filing path, and
// `git ls-files` is the one authority on what ships.
export function trackedSources(root = ROOT, dirs = SCAN_DIRS, exts = SCAN_EXTS) {
  const r = spawnSync("git", ["-C", root, "ls-files", "-z", ...dirs], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ls-files failed: ${(r.stderr || "").trim()}`);
  return (r.stdout || "")
    .split("\0")
    .filter(Boolean)
    .filter(p => exts.includes(path.extname(p)))
    .sort();
}

export function readSources(root = ROOT, dirs = SCAN_DIRS, exts = SCAN_EXTS) {
  return trackedSources(root, dirs, exts).map(p => {
    let text = "";
    try { text = fs.readFileSync(path.join(root, p), "utf8"); } catch { text = ""; }
    return { path: p, text };
  });
}

// ---------------------------------------------------------------------------
// Clause B -- the six agents' directive
// ---------------------------------------------------------------------------

// ONE HOME FOR THE SENTENCE. Every printer, the card ask and the regression file quote this
// constant; nobody restates it (pattern:14, pattern:93).
export const INTAKE_DIRECTIVE =
  "A finding goes into public.audit_findings through ingestFindings() with found_by, finding_type "
  + "and locations, and no agent files a ticket.";

// The six governance guardrail rows this clause grades.
export const GOVERNED_SLUGS = Object.freeze([
  "pz-guardrails", "rs-guardrails", "ds-guardrails", "bd-guardrails", "vf-guardrails", "au-guardrails",
]);

// All eight guardrail rows the card ask names for John's signature -- the six above plus the two
// that are not graded here (`to-` and `dm-guardrails`).
export const ALL_GUARDRAIL_SLUGS = Object.freeze([...GOVERNED_SLUGS, "to-guardrails", "dm-guardrails"]);

export const CARD_TARGET_KIND = "item";
export const CARD_TARGET_ID = "AGT-160";

// The gate verdict, read live 2026-09-28 and re-readable at any time with the command in the text.
export const GATE_VERDICT = Object.freeze({
  verdict: "gated", rule: "AGENT-ROW-AGREED-TICKET", clause: "no-authority", scope_origin: "discovered",
});

// `guardrails` is a JSON array on every live row, not a string -- so the text this clause searches
// is the serialized value. Read live, never assumed: a string column would work here too.
export function guardrailText(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try { return JSON.stringify(value); } catch { return String(value); }
}

// An ask counts only while it is OPEN. Once John answers it, the wording either landed (and the
// slug passes on wording) or it did not, and the slug is unsatisfied again -- which is the
// difference between an ask and a mute (AGT-172's lesson, applied here).
export function openCardAsk(asks) {
  return (Array.isArray(asks) ? asks : []).find(a =>
    a?.target_kind === CARD_TARGET_KIND && a?.target_id === CARD_TARGET_ID && a?.status === "open") ?? null;
}

/**
 * PURE. A slug is satisfied when its own `guardrails` text names `audit_findings`, OR while an open
 * `runner_card_asks` row asks John for that wording. Refuses only when a slug has neither.
 */
export function directiveState(rows, asks, slugs = GOVERNED_SLUGS) {
  const bySlug = new Map((Array.isArray(rows) ? rows : []).map(r => [r?.slug, r]));
  const ask = openCardAsk(asks);
  const byWording = [];
  const byAsk = [];
  const missing = [];
  for (const slug of slugs) {
    const row = bySlug.get(slug);
    if (row && guardrailText(row.guardrails).includes("audit_findings")) byWording.push(slug);
    else if (ask) byAsk.push(slug);
    else missing.push(slug);
  }
  return { byWording, byAsk, missing, ask, ok: !missing.length };
}

export function fileCardLine(cycleId = "<cycle-id>") {
  return `node scripts/check-findings-intake.js --file-card --cycle-id=${cycleId}`;
}

// The card's question: the directive VERBATIM, the eight slugs, and the gate verdict that says why
// this is John's signature and not a build task.
export function cardQuestion() {
  return `${INTAKE_DIRECTIVE}\n\n`
    + `AGT-160 asks you to sign that sentence into the \`guardrails\` of all eight governance Skill `
    + `rows in public.skill_profiles: ${ALL_GUARDRAIL_SLUGS.join(", ")}. `
    + `0 of the 8 name \`audit_findings\` today, so no governance agent is told where a finding goes `
    + `and findings stay in run notes. This build cannot write the rows itself: `
    + `\`node scripts/agent-row-gate.js --ticket=AGT-160 --action=edit-active --json\` answers `
    + `${JSON.stringify({ verdict: GATE_VERDICT.verdict, rule: GATE_VERDICT.rule, clause: GATE_VERDICT.clause })} `
    + `because AGT-160's scope_origin is "${GATE_VERDICT.scope_origin}". `
    + `Once the wording lands, \`node scripts/check-findings-intake.js\` goes green on wording with no further code.`;
}

// ---------------------------------------------------------------------------
// Live reads (service key, read-only) -- and the NOT GRADED answer when they cannot happen
// ---------------------------------------------------------------------------

function creds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const absent = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean);
  if (absent.length) return { absent };
  return { base: String(url).replace(/\/+$/, ""), key };
}

function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function restGet(base, key, query) {
  const r = await fetch(`${base}/rest/v1/${query}`, { headers: restHeaders(key) });
  const text = await r.text().catch(() => "");
  if (!r.ok) return { error: `GET ${query} -> HTTP ${r.status} ${text}` };
  try { return { value: JSON.parse(text || "[]") }; }
  catch (e) { return { error: `GET ${query} -> unparseable body (${text.length} B): ${e.message}` }; }
}

export const NOT_GRADED_PREFIX = "NOT GRADED (AGT-160)";

function notGradedNote(reason) {
  return `${NOT_GRADED_PREFIX}: clause B was not checked -- ${reason}. Exit code unchanged -- this `
    + `green does NOT say the governance Skills name \`audit_findings\`.`;
}

// Returns { state } when it graded, or { note } when it could not. NEVER throws and NEVER moves the
// exit code: an ungraded clause is a declaration, not a refusal (§19v).
async function gradeDirective() {
  const c = creds();
  if (c.absent) return { note: notGradedNote(`${c.absent.join(" and ")} absent, so public.skill_profiles and public.runner_card_asks could not be read`) };
  const slugList = GOVERNED_SLUGS.map(s => `"${s}"`).join(",");
  const rowsRes = await restGet(c.base, c.key, `skill_profiles?select=slug,guardrails&slug=in.(${slugList})`);
  if (rowsRes.error) return { note: notGradedNote(`public.skill_profiles was unreadable (${rowsRes.error})`) };
  const asksRes = await restGet(c.base, c.key,
    `runner_card_asks?select=id,target_kind,target_id,status,asked_at&target_id=eq.${CARD_TARGET_ID}&target_kind=eq.${CARD_TARGET_KIND}`);
  if (asksRes.error) return { note: notGradedNote(`public.runner_card_asks was unreadable (${asksRes.error})`) };
  return { state: directiveState(rowsRes.value ?? [], asksRes.value ?? []), rows: rowsRes.value ?? [] };
}

// ---------------------------------------------------------------------------
// --file-card: ONE runner_card_asks row, and a re-run is a no-op
// ---------------------------------------------------------------------------

async function fileCard(cycleId) {
  const c = creds();
  if (c.absent) return { error: `--file-card needs ${c.absent.join(" and ")} in env` };

  // READ THE STANDING ASK FIRST. The INSERT below names `?on_conflict=target_id,asked_at,question`
  // as its backstop, exactly as scripts/staff-watch.js:652 does -- and exactly as that file's own
  // note says, that target CANNOT fire across runs while `asked_at` is fresh per run. The read is
  // what makes a second run a no-op; the constraint only catches an identical ask inside one run.
  const standing = await restGet(c.base, c.key,
    `runner_card_asks?select=id,target_kind,target_id,status,asked_at&target_id=eq.${CARD_TARGET_ID}&target_kind=eq.${CARD_TARGET_KIND}`);
  if (standing.error) return { error: standing.error };
  const open = openCardAsk(standing.value ?? []);
  if (open) return { standing: open };

  // No before-image: `runner_card_asks` takes a plain INSERT -- nothing is overwritten and no
  // decision is reversed (precedent scripts/staff-watch.js:652).
  const row = {
    target_kind: CARD_TARGET_KIND,
    target_id: CARD_TARGET_ID,
    question: cardQuestion(),
    asked_at: new Date().toISOString(),
    harvested_cycle: cycleId,
    status: "open",
  };
  const r = await fetch(`${c.base}/rest/v1/runner_card_asks?on_conflict=target_id,asked_at,question`, {
    method: "POST",
    headers: restHeaders(c.key, { "Content-Type": "application/json", Prefer: "return=representation,resolution=ignore-duplicates" }),
    body: JSON.stringify([row]),
  });
  const text = await r.text().catch(() => "");
  if (!r.ok) return { error: `POST runner_card_asks -> HTTP ${r.status} ${text}` };
  let filed = null;
  try { filed = (JSON.parse(text || "[]") ?? [])[0] ?? null; } catch { filed = null; }
  return { filed };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { json: false, fileCard: false, cycleId: null };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a === "--file-card") out.fileCard = true;
    else if (a.startsWith("--cycle-id=")) out.cycleId = a.slice("--cycle-id=".length);
    else return { error: `unknown argument ${a}` };
  }
  if (out.fileCard && !out.cycleId) return { error: "--file-card needs --cycle-id=<uuid>" };
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    process.stderr.write(`check-findings-intake: ${args.error}\n`);
    process.exit(2);
  }

  const verdictA = filingVerdict(filingPaths(readSources()));
  const b = await gradeDirective();

  if (args.fileCard) {
    const card = await fileCard(args.cycleId);
    if (card.error) {
      process.stderr.write(`check-findings-intake: ${card.error}\n`);
      process.exit(2);
    }
    const payload = card.standing
      ? { filed: null, standing_ask_id: card.standing.id, asked_at: card.standing.asked_at }
      : { filed: card.filed?.id ?? null, standing_ask_id: null, asked_at: card.filed?.asked_at ?? null };
    if (args.json) process.stdout.write(JSON.stringify({ ...payload, question: cardQuestion() }) + "\n");
    else if (card.standing) process.stdout.write(`runner_card_asks: nothing filed -- ask ${card.standing.id} is already open (asked ${card.standing.asked_at})\n`);
    else process.stdout.write(`runner_card_asks: filed ${payload.filed} for ${CARD_TARGET_ID}\n`);
    // Filing the ask satisfies clause B for every governed slug, so the exit code below is clause A's.
    process.exit(verdictA.ok ? 0 : 1);
  }

  const refuse = !verdictA.ok || (b.state ? !b.state.ok : false);

  if (args.json) {
    process.stdout.write(JSON.stringify({
      ok: !refuse,
      clause_a: verdictA,
      clause_b: b.state
        ? { ok: b.state.ok, by_wording: b.state.byWording, by_ask: b.state.byAsk, missing: b.state.missing, ask_id: b.state.ask?.id ?? null }
        : { ok: null, note: b.note },
      not_graded: b.note ? [b.note] : [],
      directive: INTAKE_DIRECTIVE,
    }) + "\n");
  } else {
    process.stdout.write(`clause A -- the one filing path: ${verdictA.measured.length} path(s) file a ticket\n`);
    for (const p of verdictA.measured) process.stdout.write(`  ${p}${FILING_ALLOWLIST.includes(p) ? "" : "   <-- NOT ON THE ALLOWLIST"}\n`);
    for (const p of verdictA.stoppedFiling) process.stdout.write(`  ${p}   <-- ON THE ALLOWLIST AND NO LONGER FILING\n`);
    if (b.state) {
      process.stdout.write(`clause B -- the directive: ${b.state.byWording.length}/${GOVERNED_SLUGS.length} satisfied by wording, ${b.state.byAsk.length} by the open ask${b.state.ask ? ` (${b.state.ask.id})` : ""}\n`);
      for (const s of b.state.missing) process.stdout.write(`  ${s}   <-- neither the wording nor an open ask\n`);
      if (b.state.missing.length) process.stdout.write(`  file the ask: ${fileCardLine(args.cycleId ?? "<cycle-id>")}\n`);
    } else {
      process.stdout.write(`clause B -- ${b.note}\n`);
    }
    process.stdout.write(refuse ? "REFUSED\n" : "OK\n");
  }
  process.exit(refuse ? 1 : 0);
}

// Importable by the regression file without running the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch(e => {
    process.stderr.write(`check-findings-intake: ${e.message}\n`);
    process.exit(2);
  });
}
