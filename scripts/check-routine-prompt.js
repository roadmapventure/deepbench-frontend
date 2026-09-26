#!/usr/bin/env node
// DeepBench v7.0.608 | scripts/check-routine-prompt.js | AGT-102 slice 1; AGT-138 -- the Researcher's
// own routine is the third the check knows, and the first whose drift is expected by design
// FEATURE: AGT-102 -- THE PROMPT A LIVE ROUTINE RUNS MUST EQUAL ITS REPO BLOCK. The runbook is the
// source and the routine a copy (ARCHITECTURE.md §19v); nothing compared the two, so the Auditor
// routine ran with the placeholder "DEEPBENCH-AUDITOR-<routine id>" for its first week. This script
// is the check, as code (no network, no model call): it reads the prompt a run was given (or a
// runner cycle's drift note) and compares it with the block between the marker LINES of the
// routine's runbook.
//
// USAGE
//   node scripts/check-routine-prompt.js --routine=runner|auditor|researcher --prompt=<file> [--out=<json>]
//   node scripts/check-routine-prompt.js --routine=runner|auditor|researcher --note=<file> --cycle=<uuid> [--out=<json>]
//
// FLAGS
//   --routine=runner|auditor|researcher
//                              required. runner  -> docs/runbooks/routine-prompt.md,
//                              <!-- ROUTINE-PROMPT-BEGIN --> / <!-- ROUTINE-PROMPT-END -->,
//                              trig_017TZ3JZcLBK6AYH6DKURqMH.
//                              auditor -> docs/runbooks/auditor-routine.md,
//                              <!-- AUDITOR-ROUTINE-PROMPT-BEGIN --> / <!-- AUDITOR-ROUTINE-PROMPT-END -->,
//                              trig_01BCzPdanZ1YiK956dAqU6YN.
//                              researcher -> docs/runbooks/researcher-routine.md,
//                              <!-- RESEARCHER-ROUTINE-PROMPT-BEGIN --> / <!-- RESEARCHER-ROUTINE-PROMPT-END -->,
//                              trig_01862LsK4ZQF8PTgQoK2cgCV (AGT-138). Drift is EXPECTED against
//                              this one until John runs RemoteTrigger update -- the playbook is the
//                              source and the live prompt is still its INTERIM text.
//   --prompt=<file>            PROMPT MODE: the prompt text the run was given, verbatim.
//   --note=<file>              NOTE MODE: a runner_cycles.notes text that reports routine-prompt drift.
//   --cycle=<uuid>             the runner_cycles id the --note came from (required with --note).
//   --out=<json>               write {found_by:"check-routine-prompt:<routine>", findings, carried:[], gone:[]}.
//   Exactly one of --prompt / --note.
//
// THE BLOCK. The lines strictly between the BEGIN and END marker lines; each marker must be a WHOLE
// line exactly once (a code-span mention inside a table row is not a marker line). Both sides are
// compared after "\r\n" -> "\n" and trailing newlines stripped -- nothing else is normalized.
//
// EXIT CODES
//   0  prompt mode, equal: findings [].
//   1  a finding: prompt mode, the texts differ (confidence high, location 1 = the first differing
//      live line, "" when the live text ends early; location 2 = the repo line at that position);
//      note mode, always (confidence medium, location 1 = "cycle <uuid>: " + the note's first 300
//      chars, location 2 = the BEGIN marker line). Exit 1 is a finding, never a stop.
//   2  anything else, with a reason on stderr: bad or missing --routine, both or neither of
//      --prompt/--note, --note without a --cycle uuid, an unreadable file, a marker count != 1.
//
// The fingerprint (scripts/audit-ledger.js fingerprint()) drops ":<line>" from locations, and the
// kind, location homes and governing fact are fixed, so one routine's drift is one fingerprint every
// week whatever line it sits on; a note-mode finding fingerprints equal to a prompt-mode one.
// Exit codes are set with process.exitCode, never process.exit() (Windows/Node 24 libuv abort).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const ROUTINES = {
  runner: {
    file: "routine-prompt.md",
    begin: "<!-- ROUTINE-PROMPT-BEGIN -->",
    end: "<!-- ROUTINE-PROMPT-END -->",
    id: "trig_017TZ3JZcLBK6AYH6DKURqMH",
  },
  auditor: {
    file: "auditor-routine.md",
    begin: "<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->",
    end: "<!-- AUDITOR-ROUTINE-PROMPT-END -->",
    id: "trig_01BCzPdanZ1YiK956dAqU6YN",
  },
  // AGT-138. The Researcher left the builder cycle for its own weekly routine, so its prompt gets
  // the same source-and-copy treatment the other two have: the block in the playbook is the source.
  researcher: {
    file: "researcher-routine.md",
    begin: "<!-- RESEARCHER-ROUTINE-PROMPT-BEGIN -->",
    end: "<!-- RESEARCHER-ROUTINE-PROMPT-END -->",
    id: "trig_01862LsK4ZQF8PTgQoK2cgCV",
  },
};

export const CHECK_SLUG = "routine-prompt-drift";
export const GOVERNING_FACT = "the live routine prompt must equal its repo block (the repo is the source)";
export const PROPOSED_RESOLUTION =
  "update the live routine from the repo block on John's word (routine-prompt.md update rule), or fix the block";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class UsageError extends Error {}

export const canon = t => String(t).replace(/\r\n/g, "\n").replace(/\n+$/, "");

// The block and the 1-based line numbers of both markers; throws UsageError on a marker count != 1.
export function extractBlock(md, r) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const at = m => lines.flatMap((l, i) => (l === m ? [i] : []));
  const a = at(r.begin), b = at(r.end);
  if (a.length !== 1) throw new UsageError(`${r.begin} must be a whole line exactly once in docs/runbooks/${r.file} (got ${a.length})`);
  if (b.length !== 1) throw new UsageError(`${r.end} must be a whole line exactly once in docs/runbooks/${r.file} (got ${b.length})`);
  if (b[0] <= a[0]) throw new UsageError(`${r.end} precedes ${r.begin} in docs/runbooks/${r.file}`);
  return { text: lines.slice(a[0] + 1, b[0]).join("\n"), beginLine: a[0] + 1, endLine: b[0] + 1, beginText: r.begin, endText: r.end };
}

function finding(r, liveText, repoLine, repoText, confidence) {
  return {
    kind: "contradiction",
    check_slug: CHECK_SLUG,
    locations: [
      { location: `routine/${r.id}/prompt`, text: liveText },
      { location: `docs/runbooks/${r.file}:${repoLine}`, text: repoText },
    ],
    governing_fact: GOVERNING_FACT,
    confidence,
    proposed_resolution: PROPOSED_RESOLUTION,
  };
}

// Prompt mode: [] when equal, else ONE finding at the first differing line.
export function comparePrompt(live, block, r) {
  const L = canon(live), R = canon(block.text);
  if (L === R) return [];
  const ll = L.split("\n"), rl = R.split("\n");
  let i = 0;
  while (i < ll.length && i < rl.length && ll[i] === rl[i]) i++;
  const liveText = i < ll.length ? ll[i] : "";
  // Past the block's last line the repo line at that position is the END marker line.
  const repoLine = i < rl.length ? block.beginLine + 1 + i : block.endLine;
  const repoText = i < rl.length ? rl[i] : block.endText;
  return [finding(r, liveText, repoLine, repoText, "high")];
}

// Note mode: a runner cycle reported drift in prose -- always one medium-confidence finding.
export function noteFinding(note, cycle, block, r) {
  return [finding(r, `cycle ${cycle}: ` + String(note).slice(0, 300), block.beginLine, block.beginText, "medium")];
}

export function parseArgs(argv) {
  const a = {};
  for (const s of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(s);
    if (!m) throw new UsageError(`unknown argument ${s}`);
    if (!["routine", "prompt", "note", "cycle", "out"].includes(m[1])) throw new UsageError(`unknown flag --${m[1]}`);
    a[m[1]] = m[2] ?? "";
  }
  if (!a.routine) throw new UsageError("--routine=runner|auditor is required");
  if (!Object.hasOwn(ROUTINES, a.routine)) throw new UsageError(`--routine must be one of ${Object.keys(ROUTINES).join(", ")} (got ${a.routine})`);
  const hasPrompt = a.prompt !== undefined, hasNote = a.note !== undefined;
  if (hasPrompt === hasNote) throw new UsageError("exactly one of --prompt=<file> / --note=<file>");
  if (hasPrompt && !a.prompt) throw new UsageError("--prompt needs a file");
  if (hasNote && !a.note) throw new UsageError("--note needs a file");
  if (hasNote && !UUID_RE.test(a.cycle ?? "")) throw new UsageError("--note needs --cycle=<uuid>");
  if (hasPrompt && a.cycle !== undefined) throw new UsageError("--cycle goes with --note only");
  if (a.out !== undefined && !a.out) throw new UsageError("--out needs a file");
  return a;
}

function read(file, what) {
  try { return fs.readFileSync(file, "utf8"); }
  catch (e) { throw new UsageError(`cannot read ${what} ${file}: ${e.code ?? e.message}`); }
}

export function main(argv = process.argv.slice(2)) {
  try {
    const a = parseArgs(argv);
    const r = ROUTINES[a.routine];
    const block = extractBlock(read(path.join(ROOT, "docs", "runbooks", r.file), "runbook"), r);
    const findings = a.prompt !== undefined
      ? comparePrompt(read(a.prompt, "--prompt"), block, r)
      : noteFinding(read(a.note, "--note"), a.cycle, block, r);
    const out = { found_by: `check-routine-prompt:${a.routine}`, findings, carried: [], gone: [] };
    if (a.out) fs.writeFileSync(a.out, JSON.stringify(out, null, 2));
    if (findings.length) {
      const [live, repo] = findings[0].locations;
      console.log(`${CHECK_SLUG} ${a.routine}: DRIFT (${findings[0].confidence}) at ${repo.location} -- live ${JSON.stringify(live.text.slice(0, 120))} vs repo ${JSON.stringify(repo.text.slice(0, 120))}`);
    } else {
      console.log(`${CHECK_SLUG} ${a.routine}: live prompt equals docs/runbooks/${r.file} block`);
    }
    process.exitCode = findings.length ? 1 : 0;
  } catch (e) {
    console.error(`check-routine-prompt: ${e instanceof UsageError ? "" : "error: "}${e.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
