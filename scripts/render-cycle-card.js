#!/usr/bin/env node
// DeepBench v7.0.463 | scripts/render-cycle-card.js | SES-377 -- the cycle card: a 5-10 KB
// executable digest of docs/runbooks/runner-cycle.md, GENERATED from it and never hand-written.
//
// WHY THIS EXISTS. Measured 2026-09-12 in this clone: runner-cycle.md is 363,840 bytes over 4,409
// lines, and routine-prompt.md step 3 told every cycle to "read docs/runbooks/runner-cycle.md ...
// and execute it EXACTLY, top to bottom" -- roughly 90K tokens spent on the read before a cycle
// had done anything. The runbook is still the complete procedure and still outranks everything
// here (ARCHITECTURE.md 19v). What the card replaces is the *undirected* read: one line per step,
// in execution order, carrying the step's L-anchor, its own verdict/write, and the command it
// runs, so a cycle opens the runbook at a line number instead of from the top.
//
// THE CARD IS A VIEW, NOT A SECOND HOME. Everything on it is derived: the step list, the line
// numbers, the fenced blocks and the sha256 of the runbook it was rendered from. NOTES below is
// the one hand-written part, and it carries no procedure -- only each step's own verdict in the
// runbook's words. Run with no flag, the script CHECKS that the committed card still equals what
// this renderer produces from the current runbook; tests/regression/ses-377-cycle-card.test.mjs
// runs that same comparison in the suite. Edit the runbook, then re-render -- never the reverse.
//
// WHY FULL_BLOCK_MAX IS A BYTE BUDGET AND NOT A COUNT. The runbook carries 55 fenced blocks
// totalling ~14.8 KB; the card cannot hold them and stay a digest. Blocks at or under
// FULL_BLOCK_MAX are copied byte-identical (so a cycle can run them without opening anything);
// anything larger degrades to a pointer -- the card line still names its L-anchor, its language
// and its size, which is what you need to go read it. If the card ever grows past CARD_BYTE_CAP,
// LOWER FULL_BLOCK_MAX. Raising the cap is the one repair that defeats the ticket.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
export const CARD_REL = "docs/runbooks/cycle-card.md";

// A block at or under this many bytes is copied in full; anything bigger becomes a pointer.
export const FULL_BLOCK_MAX = 400;
// The card's whole reason for being. Over this, lower FULL_BLOCK_MAX -- never raise this.
export const CARD_BYTE_CAP = 10240;

const OUTCOME_MAX = 90;
const TITLE_MAX = 72;

// The runbook's steps are bold markers at column 0: `**<label>. <text>**`. `7a` is a list item,
// not a step, and is correctly not matched. The pre-boot gate is the one step whose marker is not
// numbered -- it is labelled `gate` on the card and it sorts first because it IS first (SES-297's
// position assertion, mirrored in tests/regression/ses-297-pre-boot-pickability.test.mjs).
const STEP_RE = /^\*\*(\d+[a-z]?(?:-bis)?)\. /;
const GATE_RE = /^\*\*PRE-BOOT GATE/;

const lf = text => String(text).replace(/\r\n/g, "\n");

// Cut at the first of " — ", "(", "." or ":". That is what keeps rule IDs off the card: every
// marker parks its `(SES-nnn, vX, migration ...)` provenance behind one of those four, so no
// registry ID survives into the card's live voice and check 9 has nothing to flag.
export function stepTitle(rest) {
  let t = String(rest);
  let cut = -1;
  for (const c of [" — ", "(", ".", ":"]) {
    const i = t.indexOf(c);
    if (i >= 0 && (cut < 0 || i < cut)) cut = i;
  }
  if (cut >= 0) t = t.slice(0, cut);
  t = t.replace(/\*\*/g, "").replace(/`/g, "").trim();
  return t.length > TITLE_MAX ? t.slice(0, TITLE_MAX).trim() : t;
}

// -> [{ label, line (1-based), title }] in runbook order.
export function parseSteps(md) {
  const lines = lf(md).split("\n");
  const out = [];
  lines.forEach((l, i) => {
    const m = STEP_RE.exec(l);
    if (m) { out.push({ label: m[1], line: i + 1, title: stepTitle(l.slice(m[0].length)) }); return; }
    if (GATE_RE.test(l)) out.push({ label: "gate", line: i + 1, title: stepTitle(l.slice(2)) });
  });
  return out;
}

// -> [{ lang, start (1-based line of the opening fence), end, body }] in runbook order.
export function parseBlocks(md) {
  const lines = lf(md).split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = /^```([a-z]*)\s*$/.exec(lines[i]);
    if (!m) { i++; continue; }
    let j = i + 1;
    while (j < lines.length && !/^```\s*$/.test(lines[j])) j++;
    out.push({ lang: m[1], start: i + 1, end: j + 1, body: lines.slice(i + 1, j).join("\n") });
    i = j + 1;
  }
  return out;
}

// Every block belongs to the last step marker above it.
export function blocksByStep(steps, blocks) {
  const by = new Map(steps.map(s => [s.label, []]));
  for (const b of blocks) {
    let owner = null;
    for (const s of steps) { if (s.line < b.start) owner = s; else break; }
    if (owner) by.get(owner.label).push(b);
  }
  return by;
}

// THE ONE HAND-WRITTEN PART. `outcome` is the step's own verdict or write, in the runbook's words,
// <= 90 chars -- what a cycle needs to know before it decides whether to open the runbook at all.
// `block` is the 1-based index of the step's fenced block to show in full (1 = the first, which is
// the command in almost every step; 0 = the step has no block, or none worth carrying). A selected
// block over FULL_BLOCK_MAX degrades to a pointer on its own -- that is a size fact, not an edit.
export const NOTES = {
  gate:       { outcome: "should_boot true → step 0; false → one did_not_run row and end, nothing else", block: 1 },
  "0":        { outcome: "branch session/cycle-<UTC>; never main; an unattended cycle writes no .claude/", block: 1 },
  "0b":       { outcome: "a silent predecessor is pushed to John; never close a row that is not yours", block: 1 },
  "1":        { outcome: "insert runner_cycles with the claimed id, outcome NULL; one push per cycle open", block: 1 },
  "1b":       { outcome: "verdict 'run' → step 2; anything else → close did_not_run, run the tail, end", block: 1 },
  "2":        { outcome: "read-only here; the harvest writes happen in the step-9 serial tail", block: 2 },
  "2b":       { outcome: "every Requirement becomes exactly ONE artifact, and the card says which", block: 1 },
  "3":        { outcome: "a wall fails → close did_not_run with the reason, run the tail, end", block: 1 },
  "4":        { outcome: "dev must serve; a user-blocking failure preempts everything, root-cause first", block: 0 },
  "4a":       { outcome: "read CI's conclusion for that sha and hand it to the actuator", block: 1 },
  "4a-bis":   { outcome: "exit 0 serving-green → carry on; exit 1 → 4a with its engine object; 2 = cannot tell", block: 1 },
  "4b":       { outcome: "due false → write INVENTION PASS: <reason> in notes and skip the rest", block: 1 },
  "4c":       { outcome: "exit 2 is a refusal and nothing was written — continue to step 5 normally", block: 0 },
  "5":        { outcome: "the queue's first admitted row is the pick; ONE item; rename at the pick", block: 1 },
  "5a":       { outcome: "write files N (+k) / tasks M (+k) into notes; step 7 grades the ship on them", block: 1 },
  "6":        { outcome: "premise holds → revalidated_at = now() and build; dead → removal proposed", block: 1 },
  "7":        { outcome: "assemble build-ticket, never hand-build the prompt; ONE ship point", block: 1 },
  "7b":       { outcome: "every judgment write is a decision row with a handle and a reversal window", block: 2 },
  "8":        { outcome: "your own ship broke dev → revert-forward, restore before-images, 'reverted'", block: 0 },
  "8a":       { outcome: "re-run 4a with the post-push sha; the engine classifies, never you by hand", block: 0 },
  "8b":       { outcome: "exit 1 → re-run with --apply --cycle-id; exit 2 is never a pass", block: 1 },
  "8b-bis":   { outcome: "exit 1 → claim one id block in ONE call, then --apply; exit 2 is never a pass", block: 1 },
  "8c":       { outcome: "age triggers, premise decides; on spare capacity, never instead of the build", block: 1 },
  "8d":       { outcome: "0 rows = nothing owed; one review per cycle, never instead of the build", block: 1 },
  "9":        { outcome: "write the record, close your own row, THEN the gate; a continue is this turn", block: 1 },
};

export function runbookSha(md) {
  return crypto.createHash("sha256").update(lf(md), "utf8").digest("hex").slice(0, 16);
}

export function render(md) {
  const text = lf(md);
  const steps = parseSteps(text);
  if (!steps.length) throw new Error(`${RUNBOOK_REL}: parsed 0 step markers — refusing to render a card from it.`);

  const labels = new Set(steps.map(s => s.label));
  for (const s of steps) {
    if (!Object.prototype.hasOwnProperty.call(NOTES, s.label)) {
      throw new Error(`${RUNBOOK_REL} line ${s.line}: step **${s.label}.** has no NOTES entry in scripts/render-cycle-card.js. A new step is a card line a human writes the outcome for — add it, do not let the card silently omit a step.`);
    }
  }
  for (const label of Object.keys(NOTES)) {
    if (!labels.has(label)) {
      throw new Error(`NOTES carries label "${label}", which ${RUNBOOK_REL} no longer has as a step. Remove it, or restore the step.`);
    }
    const o = NOTES[label].outcome;
    if (typeof o !== "string" || !o.length) throw new Error(`NOTES["${label}"].outcome is empty.`);
    if (o.length > OUTCOME_MAX) throw new Error(`NOTES["${label}"].outcome is ${o.length} chars, over the ${OUTCOME_MAX}-char cap.`);
  }

  const by = blocksByStep(steps, parseBlocks(text));
  const out = [];
  out.push(`<!-- GENERATED by scripts/render-cycle-card.js from ${RUNBOOK_REL} sha256 ${runbookSha(text)} — do not edit; node scripts/render-cycle-card.js --write (SES-377) -->`);
  out.push("");
  out.push("**Execute these steps in order — this is the runner cycle, one line per step.**");
  out.push(`**Open \`${RUNBOOK_REL}\` only at the L-anchor of the step you are on, and only when that step's line is a pointer or names an exception.**`);
  out.push("**The runbook is the complete procedure and outranks this card; the card is generated from it.**");
  out.push("");

  for (const s of steps) {
    const note = NOTES[s.label];
    const blocks = by.get(s.label) || [];
    const list = blocks.length
      ? blocks.map(b => `L${b.start}(${b.lang || "-"} ${Buffer.byteLength(b.body, "utf8")}B)`).join(" ")
      : "none";
    out.push(`**${s.label}.** ${s.title} · L${s.line} · ${note.outcome} · blocks: ${list}`);
    const chosen = note.block > 0 ? blocks[note.block - 1] : null;
    if (chosen && Buffer.byteLength(chosen.body, "utf8") <= FULL_BLOCK_MAX) {
      out.push("");
      out.push("```" + chosen.lang);
      out.push(chosen.body);
      out.push("```");
    }
    out.push("");
  }
  return out.join("\n");
}

// ---- CLI ----------------------------------------------------------------------------------
// no flag  -> check: 0 the committed card equals render(runbook); 1 it differs or is over cap
//             (prints the first differing line and the --write command); 2 the runbook or the card
//             could not be read, a step has no NOTES entry, or NOTES names a step the runbook lacks.
// --write  -> write the card. Refuses over CARD_BYTE_CAP.

function firstDiff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return { line: i + 1, committed: x[i], rendered: y[i] };
  }
  return null;
}

function main() {
  const write = process.argv.slice(2).includes("--write");
  const runbookPath = path.join(WORKTREE, RUNBOOK_REL);
  const cardPath = path.join(WORKTREE, CARD_REL);

  let md;
  try {
    md = fs.readFileSync(runbookPath, "utf8");
  } catch {
    console.error(`render-cycle-card: ${RUNBOOK_REL} is missing or unreadable — nothing to render from.`);
    process.exit(2);
  }

  let card;
  try {
    card = render(md);
  } catch (e) {
    console.error(`render-cycle-card: ${e.message}`);
    process.exit(2);
  }

  const bytes = Buffer.byteLength(card, "utf8");

  if (write) {
    if (bytes > CARD_BYTE_CAP) {
      console.error(`render-cycle-card: the rendered card is ${bytes} bytes, over the ${CARD_BYTE_CAP}-byte cap — refusing to write.\n` +
        "Lower FULL_BLOCK_MAX in this script so fewer blocks are carried in full. Never raise CARD_BYTE_CAP: the cap IS the feature.");
      process.exit(1);
    }
    fs.writeFileSync(cardPath, card);
    console.log(`render-cycle-card: wrote ${CARD_REL} — ${bytes} bytes, ${parseSteps(md).length} steps, from ${RUNBOOK_REL} sha256 ${runbookSha(md)}`);
    process.exit(0);
  }

  let committed;
  try {
    committed = lf(fs.readFileSync(cardPath, "utf8"));
  } catch {
    console.error(`render-cycle-card: ${CARD_REL} is missing. Generate it with:  node scripts/render-cycle-card.js --write`);
    process.exit(2);
  }

  if (bytes > CARD_BYTE_CAP) {
    console.error(`render-cycle-card: the card would render at ${bytes} bytes, over the ${CARD_BYTE_CAP}-byte cap. Lower FULL_BLOCK_MAX — never raise the cap.`);
    process.exit(1);
  }

  const d = firstDiff(committed, card);
  if (d) {
    console.error(`render-cycle-card: ${CARD_REL} is STALE — it no longer matches what ${RUNBOOK_REL} renders to.`);
    console.error(`  first difference at line ${d.line}`);
    console.error(`  committed: ${d.committed === undefined ? "<end of file>" : d.committed}`);
    console.error(`  rendered : ${d.rendered === undefined ? "<end of file>" : d.rendered}`);
    console.error("Re-render it (the runbook is the source, the card is the view):  node scripts/render-cycle-card.js --write");
    process.exit(1);
  }

  console.log(`render-cycle-card: ${CARD_REL} is current — ${bytes} bytes, ${parseSteps(md).length} steps, ${RUNBOOK_REL} sha256 ${runbookSha(md)}`);
  process.exit(0);
}

// SES-176's contract, kept here too: importing this module for its exports must never run the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
