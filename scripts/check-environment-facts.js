#!/usr/bin/env node
// DeepBench v7.0.504 | scripts/check-environment-facts.js | SES-396 slice 2 — the gated remainder,
// ungated: `--check-row` grades the live `ds-knowledge-environment` row against `--render`, and
// `--write-row` is the only hand that creates or updates it, before-image first.
//
// WHY THE ROW HALF IS HERE NOW, replacing slice 1's "this is gated" note below rather than sitting
// beside it. Slice 1 was written while `.claude/rules/agent-roster-inert.md` read as a flat bar on
// an automated session writing an active agent's rows. `SES-394` shipped the callable form of what
// John actually ruled — `scripts/agent-row-gate.js`, rule `AGENT-ROW-AGREED-TICKET` — and against
// ticket `SES-396` (`scope_origin = 'john-named'`, read live) it answers BUILD for `create` and for
// `edit-active`, and GATED for `activate`. So the row is build work under this ticket with no
// approval card, on the two conditions the rule attaches and this file therefore implements rather
// than assumes: EVERY row written gets its OWN `runner_before_images` row (`row_data` NULL for an
// INSERT, because there is no prior row to image), and they all hang off ONE decision handle.
// `--write-row` refuses to write without the cycle id that attribution needs, and prints every
// image id it wrote, because an image nobody can name is an undo nobody can perform.
//
// THE ROW IS NEVER HAND-TYPED INTO SUPABASE, AND THAT IS THE WHOLE POINT OF `--write-row` EXISTING
// as a flag on THIS file rather than as a one-off SQL block in a kickoff. The body of
// `ds-knowledge-environment` IS `--render`'s bytes; a hand-pasted copy is a second home for the
// register's text that drifts the first time a fact is appended (`SES-400` appended one within days
// of slice 1 shipping). One command reads the register, renders it, images the row and writes it,
// so the register stays the only source and `--check-row` can be a real grader instead of a
// re-render comparing itself to itself.
//
// WHAT THIS IS FOR. A cycle re-measures the same handful of environment truths every run — the
// default branch is stale, the runbook is at its byte ceiling, a counter drifts, CI clones shallow
// — and each re-measurement costs a session's attention or, worse, is skipped and guessed. The
// register is the one committed place those facts live, and this script is what stops it rotting
// into a list of plausible sentences nobody checked. A line that names a ticket must name a ticket
// that EXISTS on the board, because a register whose provenance is decorative is worse than no
// register: it launders a guess into a citation.
//
// THE DEFAULT PATH IS STILL NO NETWORK AND NO CREDENTIALS, BY CONSTRUCTION — the same rule
// scripts/render-rule-blocks.js states at length: a network round trip does not belong in a
// pre-commit tripwire, and a checker that silently no-ops without credentials is a FALSE ALL-CLEAR.
// The ticket-existence check therefore reads the committed docs/backlog/BACKLOG-SNAPSHOT.md, never
// Supabase. A missing snapshot is a loud failure naming the regeneration command, never a skip.
// `--check-row` and `--write-row` are the two OPT-IN exceptions: nothing reaches the network unless
// one of them is passed, so the tripwire invocation (`node scripts/check-environment-facts.js`,
// bare) is byte-for-byte the offline check it was in slice 1.
//
// `--check-row` WITHOUT CREDENTIALS EXITS 0 WITH A SKIPPED NOTE, WHICH LOOKS LIKE THE FALSE
// ALL-CLEAR THE PARAGRAPH ABOVE FORBIDS AND IS NOT. The difference is who is asking. The offline
// validator answers "is the committed register well-formed", a question that is always answerable,
// so a skip there would be a lie. `--check-row` answers "does a row in a database this process may
// not be able to reach match the register" — unanswerable without credentials, and the honest
// output is a declared skip, printed, never swallowed. Its caller in the suite
// (tests/regression/ses-396b-designer-knowledge-row.test.mjs) declares the same gap through
// notRun() rather than counting a pass, which is where the visibility actually lands.
//
// EXIT CODES ARE THE INTERFACE: 0 valid (prints the summary line), 1 the register is present but a
// line is wrong (prints the line number and the offending text), 2 the register is missing or
// unreadable. 1 and 2 are kept distinct deliberately — "you wrote a bad line" and "the file this
// whole mechanism depends on is gone" are different problems with different fixes, and a single
// non-zero would let the second hide inside the first. `--check-row` adds a THIRD: 3, the row does
// not exist. Absent is not the same failure as drifted — one is "create it", the other is "the
// register moved and the row did not" — and folding them together would let the first cycle after
// a row deletion report a content drift it could never fix.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER_REL = "docs/runbooks/environment-facts.md";
const SNAPSHOT_REL = "docs/backlog/BACKLOG-SNAPSHOT.md";

// The exact body of the future `ds-knowledge-environment` Skill Profile. Exported so the guard can
// assert the row's `method` equals `--render` byte for byte once the gated row exists — one home
// for the header text, never a copy in the test and a copy here.
export const RENDER_HEADER =
  "Environment facts this platform has measured. Each line: date | the ticket or cycle that " +
  "found it | the fact. Revalidate a premise that contradicts one.";

export const FACTS_HEADING = "## Facts";
export const MIN_FACT_CHARS = 20;

// A ticket-form source (`SES-396`, `LOG-124`, `AGT-79a`) is checked against the board. A
// cycle-form source (`cycle:601227fb`) names a runner_cycles row, which the snapshot does not
// carry, so it is accepted on its shape alone — the cycle id is in the commit that added the line.
export const SOURCE_RE = /^(?:[A-Z]{2,4}-\d+[a-z]?|cycle:[0-9a-f]{8})$/;
export const TICKET_SOURCE_RE = /^[A-Z]{2,4}-\d+[a-z]?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // Round-trips only if the calendar accepted it: catches 2026-13-01 and 2026-02-30, which the
  // regex alone is happy with.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Parses the register. Returns { facts, errors } — never throws for a CONTENT problem, because the
// caller needs every bad line at once, not the first one.
export function parseRegister(text) {
  const lines = String(text).split(/\r?\n/);
  const facts = [];
  const errors = [];
  const seen = new Map();

  let inFacts = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    const trimmedRight = raw.replace(/\s+$/, "");

    if (trimmedRight.trim() === FACTS_HEADING) { inFacts = true; continue; }
    if (!inFacts) continue;
    // A later `## Heading` closes the fact block; prose and blank lines inside it are ignored, so
    // the file can carry a note without every sentence having to be a fact.
    if (/^##\s/.test(trimmedRight)) { inFacts = false; continue; }
    if (trimmedRight.trim() === "") continue;
    if (!trimmedRight.startsWith("- ")) continue;

    const body = trimmedRight.slice(2);
    const parts = body.split("|");
    if (parts.length !== 3) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `expected exactly 3 pipe-separated fields (date | SOURCE | fact), got ${parts.length}` });
      continue;
    }
    const [dateRaw, sourceRaw, factRaw] = parts.map(p => p.trim());

    if (!isRealDate(dateRaw)) {
      errors.push({ lineNo, text: trimmedRight, reason: `date "${dateRaw}" is not a real YYYY-MM-DD date` });
      continue;
    }
    if (!SOURCE_RE.test(sourceRaw)) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `SOURCE "${sourceRaw}" must match a ticket id (SES-396) or a cycle (cycle:601227fb)` });
      continue;
    }
    if (factRaw.length < MIN_FACT_CHARS) {
      errors.push({ lineNo, text: trimmedRight,
        reason: `the fact is ${factRaw.length} characters; under ${MIN_FACT_CHARS} is a label, not a fact` });
      continue;
    }
    const prior = seen.get(trimmedRight);
    if (prior) {
      errors.push({ lineNo, text: trimmedRight, reason: `verbatim duplicate of line ${prior}` });
      continue;
    }
    seen.set(trimmedRight, lineNo);
    facts.push({ lineNo, date: dateRaw, source: sourceRaw, fact: factRaw, raw: trimmedRight });
  }
  return { facts, errors };
}

// The provenance check. `snapshot` is the committed BACKLOG-SNAPSHOT.md text; a ticket-form SOURCE
// must appear in it as a table cell `| <ID> |`. Substring-free on purpose: matching bare "SES-38"
// would be satisfied by SES-384, so the pipes are load-bearing.
export function checkSources(facts, snapshot) {
  const errors = [];
  for (const f of facts) {
    if (!TICKET_SOURCE_RE.test(f.source)) continue;
    if (!snapshot.includes(`| ${f.source} |`)) {
      errors.push({ lineNo: f.lineNo, text: f.raw,
        reason: `SOURCE ${f.source} does not appear in ${SNAPSHOT_REL} as \`| ${f.source} |\` — ` +
                `a citation to a ticket that is not on the board` });
    }
  }
  return errors;
}

export function render(facts) {
  return [RENDER_HEADER, "", ...facts.map(f => f.raw)].join("\n");
}

// ---------------------------------------------------------------------------
// The live row: --check-row, --write-row, --decision
// ---------------------------------------------------------------------------

export const ROW_SLUG = "ds-knowledge-environment";
export const ROW_NAME = "Designer Knowledge — the environment";
// The row's LLM settings are COPIED off the Designer's other Knowledge row at write time rather
// than typed here. Two Knowledge Skills on one capability that disagree about provider or model is
// a difference nobody chose, and a constant in this file would be a third place to keep in step.
export const ROW_SOURCE_SLUG = "ds-knowledge-standard";
export const ROW_CAPABILITY = "design-kickoff";
export const ROW_DISPLAY_ORDER = 5;

// The SAME normalisation tests/regression/ses-396-environment-facts.test.mjs arm (d) applies before
// its byte pin. Exported so there is one definition of "these two texts are the same text" — the
// alternative is the checker and the guard each carrying their own, and agreeing until the day a
// CRLF checkout makes them disagree (SES-313's measured false drift, the other direction).
export function normaliseBody(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\n$/, "");
}

// Returns { lineNo, row, want } for the FIRST differing line, or null when the texts match. A whole
// diff would bury the one fact the caller acts on; the first divergence is where the drift starts.
export function firstDifference(rowText, renderText) {
  const a = normaliseBody(rowText).split("\n");
  const b = normaliseBody(renderText).split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return { lineNo: i + 1, row: a[i] ?? "(row ends here)", want: b[i] ?? "(render ends here)" };
  }
  return null;
}

function creds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url: url.replace(/\/+$/, ""), key } : null;
}

async function rest(c, pathAndQuery, init = {}) {
  const res = await fetch(`${c.url}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathAndQuery} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function readRow(c, slug, select = "*") {
  const rows = await rest(c, `skill_profiles?slug=eq.${encodeURIComponent(slug)}&select=${select}`);
  return rows.length ? rows[0] : null;
}

async function checkRow(renderText) {
  const c = creds();
  if (!c) {
    console.log(
      "check-environment-facts: --check-row SKIPPED — SUPABASE_URL / SUPABASE_SERVICE_KEY are not " +
      `set, so the live ${ROW_SLUG} row was never read. This is a declared skip, not a pass.`);
    return 0;
  }

  let row;
  try {
    row = await readRow(c, ROW_SLUG, "slug,method");
  } catch (e) {
    console.error(`check-environment-facts: --check-row could not read skill_profiles: ${e.message}`);
    return 1;
  }

  if (!row) {
    console.error(
      `check-environment-facts: --check-row: no skill_profiles row with slug ${ROW_SLUG}. The row ` +
      `does not exist — create it with \`--write-row --cycle=<uuid>\`, which images it first. ` +
      `(Exit 3: absent, NOT drifted.)`);
    return 3;
  }

  const diff = firstDifference(row.method ?? "", renderText);
  if (diff) {
    console.error(
      `check-environment-facts: --check-row: ${ROW_SLUG}.method has drifted from --render at ` +
      `line ${diff.lineNo}.\n    row:    ${diff.row}\n    render: ${diff.want}\n` +
      `    The row is created FROM the register, so the register wins: re-run \`--write-row\`.`);
    return 1;
  }

  console.log(`check-environment-facts: ${ROW_SLUG}.method matches --render (${normaliseBody(renderText).length} chars)`);
  return 0;
}

// Writes ONE before-image and returns its id. `row_data` NULL is the INSERT case and is a positive
// statement, not a missing value: there was no prior row, and reverse_decision() reads that as
// "delete what this decision created" rather than "restore nothing".
async function writeBeforeImage(c, { cycleId, tableName, pkValue, rowData }) {
  const ins = await rest(c, "runner_before_images", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      cycle_id: cycleId,
      session_name: null,   // ck_before_image_attribution: exactly one of the two, never both
      table_name: tableName,
      pk_value: pkValue,
      row_data: rowData,
      decision_id: null,
    }),
  });
  const id = ins[0].id;
  console.log(`check-environment-facts: before-image ${id} — ${tableName}/${pkValue} ` +
    `row_data=${rowData === null ? "NULL (INSERT)" : "the row as read (UPDATE)"}`);
  return id;
}

async function writeRow(argv, renderText) {
  const c = creds();
  if (!c) {
    console.error("check-environment-facts: --write-row cannot run — SUPABASE_URL / " +
      "SUPABASE_SERVICE_KEY are not set. Nothing was written.");
    return 1;
  }
  const cycleId = flagValue(argv, "--cycle=") || process.env.RUNNER_CYCLE_ID || "";
  if (!cycleId) {
    console.error("check-environment-facts: --write-row cannot run — pass --cycle=<uuid> (or set " +
      "RUNNER_CYCLE_ID). runner_before_images.ck_before_image_attribution requires exactly one of " +
      "cycle_id / session_name, and an unattended write is the cycle_id half. Nothing was written.");
    return 1;
  }
  const decision = flagValue(argv, "--decision=") || "";

  const imageIds = [];
  let existing;
  try {
    existing = await readRow(c, ROW_SLUG);
  } catch (e) {
    console.error(`check-environment-facts: --write-row could not read skill_profiles: ${e.message}`);
    return 1;
  }

  try {
    if (existing) {
      imageIds.push(await writeBeforeImage(c, {
        cycleId, tableName: "skill_profiles", pkValue: existing.id, rowData: existing,
      }));
      await rest(c, `skill_profiles?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ objective: RENDER_HEADER, method: normaliseBody(renderText) }),
      });
      console.log(`check-environment-facts: UPDATED ${ROW_SLUG} (${existing.id}) from --render`);
    } else {
      const source = await readRow(c, ROW_SOURCE_SLUG);
      if (!source) {
        console.error(`check-environment-facts: --write-row cannot run — ${ROW_SOURCE_SLUG} is ` +
          `missing, and this row's execution_type / llm_* are copied from it rather than retyped. ` +
          `Nothing was written.`);
        return 1;
      }
      // The id is minted HERE, not by the database, so the before-image can name the primary key of
      // a row that does not exist yet. An image whose pk_value is a placeholder is an undo that
      // addresses nothing (SES-407, measured: 418 images keyed by the wrong value reversed nothing).
      const id = crypto.randomUUID();
      imageIds.push(await writeBeforeImage(c, {
        cycleId, tableName: "skill_profiles", pkValue: id, rowData: null,
      }));
      await rest(c, "skill_profiles", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          id,
          slug: ROW_SLUG,
          name: ROW_NAME,
          description: "The environment facts this platform has measured, rendered from " +
            "docs/runbooks/environment-facts.md.",
          skill_type_slug: "knowledge",
          objective: RENDER_HEADER,
          method: normaliseBody(renderText),
          traits: { source: "inline" },   // SES-341: without it db-assembly.js renders the section empty and drops it
          execution_type: source.execution_type,
          llm_provider: source.llm_provider,
          llm_model: source.llm_model,
          max_tokens: source.max_tokens,
          api_key_source: source.api_key_source,
          temperature: source.temperature,
        }),
      });
      console.log(`check-environment-facts: INSERTED ${ROW_SLUG} (${id}) from --render`);
    }

    if (decision) {
      await rest(c, "rpc/attach_before_images", {
        method: "POST",
        body: JSON.stringify({ p_decision: decision, p_image_ids: imageIds }),
      });
      console.log(`check-environment-facts: attached ${imageIds.length} image(s) to decision ${decision}`);
    } else {
      console.log("check-environment-facts: no --decision=<uuid> given — the image(s) above carry " +
        "decision_id NULL and are not yet under a handle. AGENT-ROW-AGREED-TICKET requires one.");
    }
  } catch (e) {
    console.error(`check-environment-facts: --write-row failed: ${e.message}`);
    return 1;
  }
  return 0;
}

function flagValue(argv, prefix) {
  const hit = argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : "";
}

// `--register=<path>` points the check at a copy instead of the committed register. It exists so
// the guard can prove each failure mode on a TEMP COPY: a mutation test that had to edit the real
// file in place would race every other cycle sharing this clone and could leave a corrupted
// register behind if it threw. The snapshot path is deliberately NOT overridable — the provenance
// check must always be answered by the real board.
function registerPathFrom(argv) {
  const flag = argv.find(a => a.startsWith("--register="));
  return flag ? path.resolve(flag.slice("--register=".length)) : path.join(ROOT, REGISTER_REL);
}

async function main(argv) {
  const registerPath = registerPathFrom(argv);
  let text;
  try {
    text = fs.readFileSync(registerPath, "utf8");
  } catch (e) {
    const shown = path.relative(ROOT, registerPath) || REGISTER_REL;
    console.error(`check-environment-facts: cannot read ${shown} (${e.code || e.message}). ` +
      `The register is the file this check exists to validate; recreate it or revert its deletion.`);
    return 2;
  }

  const { facts, errors } = parseRegister(text);

  let snapshot = null;
  try {
    snapshot = fs.readFileSync(path.join(ROOT, SNAPSHOT_REL), "utf8");
  } catch {
    console.error(`check-environment-facts: cannot read ${SNAPSHOT_REL}; regenerate it with ` +
      `\`node scripts/export-backlog-snapshot.js\` — a ticket SOURCE cannot be checked without it.`);
    return 2;
  }
  const allErrors = errors.concat(checkSources(facts, snapshot));

  if (allErrors.length) {
    for (const e of allErrors.sort((a, b) => a.lineNo - b.lineNo)) {
      console.error(`check-environment-facts: line ${e.lineNo}: ${e.reason}\n    ${e.text}`);
    }
    return 1;
  }

  if (facts.length === 0) {
    console.error(`check-environment-facts: ${REGISTER_REL} parses but carries no facts under ` +
      `"${FACTS_HEADING}" — an empty register is a check that can never fail.`);
    return 1;
  }

  if (argv.includes("--render")) {
    console.log(render(facts));
    return 0;
  }

  // The register is validated BEFORE either row flag runs, and that order is the contract: the row
  // is written from these bytes, so a register with a bad line must never reach the database, and a
  // row must never be graded against a render the validator would have rejected.
  const renderText = render(facts);
  if (argv.includes("--write-row")) return writeRow(argv, renderText);
  if (argv.includes("--check-row")) return checkRow(renderText);

  const dates = facts.map(f => f.date).sort();
  console.log(`${facts.length} facts, oldest ${dates[0]}, newest ${dates[dates.length - 1]}`);
  return 0;
}

const isEntry = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isEntry) {
  main(process.argv.slice(2)).then(code => process.exit(code), e => {
    console.error(`check-environment-facts: unhandled failure: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });
}
