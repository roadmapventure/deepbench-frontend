#!/usr/bin/env node
// DeepBench v7.0.608 | scripts/render-cycle-card.js | SES-377, SES-424 slice 5, AGT-138 (4b retired) -- the cycle card: a 5-10 KB
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
  "4b":       { outcome: "retired: the Researcher runs in its own routine (researcher-routine.md); go to 4c", block: 1 },
  "4c":       { outcome: "exit 2 is a refusal and nothing was written — continue to step 5 normally", block: 0 },
  "4d":       { outcome: "retired: the Auditor runs in its own routine (auditor-routine.md); go to 4e", block: 1 },
  "4e":       { outcome: "already run today → step 5; exit 3 → ticketowner judges; no Agent/exit 2 → re-run unjudged", block: 1 },
  "5":        { outcome: "the queue's first admitted row is the pick; ONE item; rename at the pick", block: 1 },
  "5a":       { outcome: "write files N (+k) / tasks M (+k) into notes; step 7 grades the ship on them", block: 1 },
  "6":        { outcome: "premise holds → revalidated_at = now() and build; dead → removal proposed", block: 1 },
  "7":        { outcome: "assemble build-ticket, never hand-build; ONE ship point; settle-ship.js writes the status", block: 1 },
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

// ---- SES-378 slice 4: the card becomes the manager's own Knowledge Skill row --------------------
//
// WHY THE CARD NEEDS A ROW AT ALL, measured live this cycle rather than recalled. `skill_profiles`
// holds 113 rows and NOT ONE carries the runner cycle; `capability_skill_profiles` for `run-project`
// is five rows whose only Knowledge member is `dm-knowledge-platform`, and that profile's `method`
// is the instruments list -- which tables to read -- not the procedure. So the Development Manager
// is assembled with no idea what a cycle DOES, and every cycle re-reads the runbook to find out.
// The card is already the executable digest of that procedure (see this file's header); this block
// is what puts its bytes where the assembled prompt can see them, as data, through the trait
// `dm-knowledge-platform` already declares (`traits.source = "inline"`, api/prompt/db-assembly.js).
// NOTHING IN CODE LEARNS THE SLUG: db-assembly renders any profile that declares the trait
// (.claude/rules/capabilities-are-data.md), and the slug below is this script's own subject, not a
// branch anywhere else.
//
// THE PIN IS THE POINT. `traits.source_sha256` stores runbookSha() OF THE CARD -- so a row whose
// text no longer matches the committed card is DETECTABLE (`drifted`) instead of quietly stale,
// which is the failure mode a copied-into-a-row document always has. `--sync-knowledge` reports
// absent / current / drifted and exits 1 on drift, so a cycle that re-renders the card and forgets
// the row fails a check rather than running on an old procedure. It is deliberately NOT self-
// healing: repairing drift is an UPDATE over an agent's live Knowledge, which is an agent-row write
// John's rule (AGENT-ROW-AGREED-TICKET) wants imaged under a ticket that names it -- not a silent
// side effect of a render.
//
// ...AND SINCE SES-424 SLICE 5 THERE IS A REPAIR PATH, WHICH IS NOT THE SAME AS SELF-HEALING.
// `--sync-knowledge` alone still exits 1 on drift and writes nothing; what changed is that the
// message now NAMES the command that fixes it, and that command (`--repin --cycle-id=<uuid>
// --ticket=<ID>`) makes the repair the same shape as every other agent-row write: one decision
// handle, an image carrying the FULL prior row (an UPDATE's undo is a restore, never a delete),
// then the PATCH, then a read-back that must classify `current`. Before this, a drifted row had
// NO path at all -- the render exited 1 and the only way forward was a hand-written UPDATE with no
// image, which is precisely what §19v exists to stop. Requiring --ticket is the rule itself in the
// flag list: a re-pin is build work only under a ticket that names the write, so the command
// cannot be run without naming one (pattern:19 -- gate the dangerous operation through an atomic
// correct path rather than hard-blocking it).
//
// WHY --apply WRITES OVER PostgREST AND NOT AS ONE `DO` BLOCK, stated plainly because the runbook
// asks for the DO block. Node here has no SQL channel: there is no `pg`/`postgres` dependency in
// package.json and no raw-SQL RPC on this project (`public.exec_readonly_sql` does not exist --
// probed at SES-378 slice 3's ship and again here against pg_proc). So the sequence below is
// record_decision() -> both before-images -> both INSERTs, the same REST shape scripts/ticket-owner.js
// and scripts/apply-title-regeneration.js already use. EVERY PROPERTY THE UNDO DEPENDS ON SURVIVES
// that split, and the one that does not is unreachable here: runbook 7b's one-block rule exists
// because a row's `updated_at` would otherwise postdate `decided_at` and reverse_decision() would
// refuse it -- and NEITHER `skill_profiles` NOR `capability_skill_profiles` HAS an `updated_at`
// column (read from information_schema this cycle; reverse_decision()'s own SES-364 comment says
// the same of all seven agent-row tables, which is why they restore as `restored_unverified`).
// What is preserved and is not optional: one decision handle, the image written BEFORE its row,
// `row_data` NULL for an INSERT, and `pk_value` the row's uuid `id` -- so the ids are generated
// HERE and inserted explicitly, because an image cannot name a pk the database has not issued yet.
// `--decision=<uuid>` exists so a sibling write in the same slice (the guardrails edit) shares the
// one handle rather than splitting the slice's undo across two.

export const KNOWLEDGE_SLUG = "dm-knowledge-cycle-card";
export const KNOWLEDGE_NAME = "Development Manager Knowledge — the runner cycle, one line per step";
export const KNOWLEDGE_OBJECTIVE = "The runner cycle, step by step";
export const KNOWLEDGE_TYPE_SLUG = "knowledge";
export const KNOWLEDGE_CAPABILITY = "run-project";
export const KNOWLEDGE_LEVEL = 2;
export const KNOWLEDGE_DISPLAY_ORDER = 5;

// Pure. The row §4 of the kickoff specifies, derived from the card's CURRENT bytes every time --
// never a literal, so the pin cannot disagree with the text it pins.
export function knowledgeRow(cardText) {
  const text = lf(cardText);
  return {
    slug: KNOWLEDGE_SLUG,
    name: KNOWLEDGE_NAME,
    skill_type_slug: KNOWLEDGE_TYPE_SLUG,
    objective: KNOWLEDGE_OBJECTIVE,
    method: text,
    traits: { source: "inline", source_file: CARD_REL, source_sha256: runbookSha(text) },
  };
}

// THE MODEL CONFIG IS INHERITED FROM THE CAPABILITY'S OTHER SKILLS, NEVER WRITTEN HERE. A literal
// model id in this file would be a second copy of `runner_model_lanes` -- the drift SES-313 created
// that table to end, and the one tests/regression/agt-68-devmanager.test.mjs asserts against for
// every `dm-*` profile: it reads the orchestrator lane live and refuses any profile that disagrees.
// FOUND LIVE at this ship rather than reasoned about: the first seed omitted these columns, took the
// table defaults (`claude-haiku-4-5-20251001`, 4000 tokens, NULL temperature) and went RED on that
// assertion while its five siblings all carried the lane's model at 8000/0. Inheriting from the
// siblings is strictly better than reading the lane here, because it copies nothing at all -- a lane
// change that moves the other five moves this row's next seed with them, with no third place to
// update. FAIL CLOSED ON DISAGREEMENT: if the siblings do not already agree, this cannot know which
// of them is right, and guessing would write a model nobody chose.
export const INHERITED_MODEL_COLUMNS = Object.freeze([
  "llm_provider", "llm_model", "max_tokens", "api_key_source", "temperature",
]);

// Pure -- given the sibling rows, returns the config they agree on, or throws naming the column.
export function inheritedModelConfig(siblings) {
  if (!Array.isArray(siblings) || siblings.length === 0) {
    throw new Error(`no sibling ${KNOWLEDGE_CAPABILITY} Skill rows to inherit the model config from — refusing to seed ${KNOWLEDGE_SLUG} on the table defaults, which is how it lands on a model nobody chose`);
  }
  const out = {};
  for (const col of INHERITED_MODEL_COLUMNS) {
    const seen = [...new Set(siblings.map(s => JSON.stringify(s[col] ?? null)))];
    if (seen.length !== 1) {
      throw new Error(`${KNOWLEDGE_CAPABILITY}'s existing Skill rows disagree on ${col} (${seen.join(" vs ")}) — this cannot know which is right, so it writes none of them. Settle the siblings first.`);
    }
    out[col] = JSON.parse(seen[0]);
  }
  return out;
}

// Pure, and the whole classifier. `live` is the fetched row or null.
//   absent   -> no row: --apply may INSERT it
//   current  -> the pinned sha equals the card's: nothing to do, and a second --apply is a no-op
//   drifted  -> a row exists whose pin is something else: exit 1, write nothing
export function knowledgeSyncState(live, cardSha) {
  if (!live) return { state: "absent", pinned: null, expected: cardSha };
  const pinned = (live.traits && live.traits.source_sha256) || null;
  return { state: pinned === cardSha ? "current" : "drifted", pinned, expected: cardSha };
}

// Pure, and the whole of the repair's decision. `live` is the fetched row, `row` what
// knowledgeRow() renders from the committed card right now. Returns the plan, or null when there
// is nothing to re-pin -- so a caller cannot write on a row that is already current, and the test
// can drive both answers without touching Supabase.
export function repinPlan(live, row) {
  const st = knowledgeSyncState(live, row.traits.source_sha256);
  if (st.state !== "drifted") return null;
  return {
    from: st.pinned,
    to: st.expected,
    // BOTH COLUMNS MOVE TOGETHER. The pin is a sha OF THE METHOD, so patching traits alone would
    // write a row whose pin describes bytes it does not hold -- a drift that now reads as current.
    patch: { method: row.method, traits: row.traits },
  };
}

async function supaRest(base, key, pathAndQuery, init = {}) {
  const res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${pathAndQuery} -> ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function flagValue(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

// THE REPAIR. Reached only from a DRIFTED classification, and it refuses before it writes rather
// than half-way through: both flags are checked first, so "exit 2 naming the missing flag" leaves
// the ledger and the row exactly as they were.
async function repinKnowledge(base, key, live, row) {
  const cycleId = flagValue("cycle-id");
  if (!cycleId) {
    console.error("render-cycle-card --sync-knowledge --repin: --cycle-id=<uuid> is required — every agent-row write owes a runner_before_images row, and an image needs an owner (§19v). Nothing was written.");
    process.exit(2);
  }
  const ticket = flagValue("ticket");
  if (!ticket) {
    console.error("render-cycle-card --sync-knowledge --repin: --ticket=<ID> is required — AGENT-ROW-AGREED-TICKET makes an UPDATE over an active agent's Knowledge build work only under a ticket that NAMES the write. Nothing was written.");
    process.exit(2);
  }

  const plan = repinPlan(live, row);
  if (!plan) {
    console.error(`render-cycle-card --sync-knowledge --repin: nothing to re-pin — the row is already current. Nothing was written.`);
    process.exit(2);
  }

  let decision = flagValue("decision");
  try {
    if (!decision) {
      decision = await supaRest(base, key, "rpc/record_decision", {
        method: "POST",
        body: JSON.stringify({
          p_cycle_id: cycleId,
          p_session_name: null,
          p_kind: "agent-row",
          p_backlog_id: ticket,
          p_summary: `${ticket}: re-pin ${KNOWLEDGE_SLUG} ${plan.from} → ${plan.to}`,
          p_reasoning: `${CARD_REL} was re-rendered and the live Knowledge row still carried the previous procedure, so the Development Manager was being assembled with a cycle that is no longer the committed one. The row's method and its traits.source_sha256 move together; the image carries the FULL prior row, so the undo is a restore. Matrix row 1 (b84e133d, unreversed) makes this re-pin the Builder's to run.`,
          p_ladder_work_class: null,
        }),
      });
      if (typeof decision !== "string" || decision.length !== 36) {
        throw new Error(`record_decision returned ${JSON.stringify(decision)}, which is not a decision id`);
      }
    }

    // IMAGE FIRST, carrying the FULL live row -- this is an UPDATE, so its undo is a restore.
    await supaRest(base, key, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        cycle_id: cycleId, session_name: null, table_name: "skill_profiles",
        pk_value: live.id, row_data: live, decision_id: decision,
      }),
    });

    await supaRest(base, key, `skill_profiles?slug=eq.${KNOWLEDGE_SLUG}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(plan.patch),
    });

    const back = await supaRest(base, key, `skill_profiles?select=*&slug=eq.${KNOWLEDGE_SLUG}&limit=1`);
    const after = knowledgeSyncState(Array.isArray(back) && back.length ? back[0] : null, row.traits.source_sha256);
    if (after.state !== "current") {
      throw new Error(`the row read back as "${after.state}" after the PATCH — decision ${decision} is standing and holds the image; reverse it (select public.reverse_decision('${decision}','<who>','<why>');) before retrying`);
    }
    console.log(`render-cycle-card --sync-knowledge --repin: re-pinned ${KNOWLEDGE_SLUG} (${live.id}) ${plan.from} → ${plan.to} under ${ticket}, decision ${decision}; one before-image carrying the full prior row; the row reads back current.`);
    process.exit(0);
  } catch (e) {
    console.error(`render-cycle-card --sync-knowledge --repin: FAILED — ${e.message}` +
      (decision ? ` Decision ${decision} was recorded; reverse it (select public.reverse_decision('${decision}','<who>','<why>');) before retrying so the slice keeps one handle.` : ""));
    process.exit(2);
  }
}

async function syncKnowledge(opts = {}) {
  const apply = process.argv.includes("--apply");
  // AGT-112: `opts.repin` is how the --write branch falls into the SAME repair below rather than
  // growing a second one. The flags it re-pins under are the flags already on the command line.
  const repin = opts.repin === true || process.argv.includes("--repin");
  const cardPath = path.join(WORKTREE, CARD_REL);

  let cardText;
  try {
    cardText = lf(fs.readFileSync(cardPath, "utf8"));
  } catch {
    console.error(`render-cycle-card --sync-knowledge: ${CARD_REL} is missing — there is nothing to seed the row from. Generate it first:  node scripts/render-cycle-card.js --write`);
    process.exit(2);
  }

  const row = knowledgeRow(cardText);
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  console.log(`render-cycle-card --sync-knowledge: the row (${CARD_REL}, ${Buffer.byteLength(cardText, "utf8")} bytes)`);
  console.log(`  slug       ${row.slug}`);
  console.log(`  name       ${row.name}`);
  console.log(`  objective  ${row.objective}`);
  console.log(`  method     <the ${Buffer.byteLength(row.method, "utf8")} bytes of ${CARD_REL}>`);
  console.log(`  traits     ${JSON.stringify(row.traits)}`);
  console.log(`  link       ${KNOWLEDGE_CAPABILITY} · level ${KNOWLEDGE_LEVEL} · is_required true · display_order ${KNOWLEDGE_DISPLAY_ORDER}`);

  if (!base || !key) {
    const missing = [!base && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    console.error(`render-cycle-card --sync-knowledge: cannot read the live row — missing env var(s): ${missing}. Exiting 2 (cannot run), which is NOT "absent": nothing was read.`);
    process.exit(2);
  }

  let live;
  try {
    // select=* rather than four columns: a re-pin's before-image must carry the FULL prior row,
    // and an image assembled from a projection restores a row with holes in it.
    const rows = await supaRest(base, key, `skill_profiles?select=*&slug=eq.${KNOWLEDGE_SLUG}&limit=1`);
    live = Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) {
    console.error(`render-cycle-card --sync-knowledge: cannot read the live row — ${e.message}. Exiting 2 (cannot run).`);
    process.exit(2);
  }

  const st = knowledgeSyncState(live, row.traits.source_sha256);
  console.log(`  live       ${st.state}` +
    (st.state === "drifted" ? ` — pinned ${JSON.stringify(st.pinned)}, the card renders ${JSON.stringify(st.expected)}` : ""));

  if (st.state === "drifted") {
    if (!repin) {
      console.error(`render-cycle-card --sync-knowledge: DRIFTED — public.skill_profiles.${KNOWLEDGE_SLUG} pins ${JSON.stringify(st.pinned)} but ${CARD_REL} renders ${JSON.stringify(st.expected)}. The manager is being assembled with a procedure that is no longer the committed one. Repairing it is an UPDATE over an active agent's Knowledge: image it under a ticket that names the write (AGENT-ROW-AGREED-TICKET), never as a side effect of a render. Repair it with:  node scripts/render-cycle-card.js --sync-knowledge --repin --cycle-id=<uuid> --ticket=<ID> [--decision=<uuid>]`);
      process.exit(1);
    }
    return repinKnowledge(base, key, live, row);
  }

  // --repin on a row that is not drifted. `current` is the success case and writes NOTHING; `absent`
  // cannot be re-pinned at all -- there is no prior row to image, and seeding is --apply's job, a
  // different write with a different undo (a DELETE, not a restore).
  if (repin) {
    if (st.state === "absent") {
      console.error(`render-cycle-card --sync-knowledge --repin: the row is ABSENT — there is nothing to re-pin. A re-pin is an UPDATE; seeding is --apply, whose image carries row_data NULL because its undo is a DELETE. Seed it with:  node scripts/render-cycle-card.js --sync-knowledge --apply --cycle-id=<uuid>`);
      process.exit(2);
    }
    console.log(`render-cycle-card --sync-knowledge --repin: already current — the row pins ${JSON.stringify(st.expected)}, no write attempted.`);
    process.exit(0);
  }

  if (!apply) {
    console.log(`render-cycle-card --sync-knowledge: ${st.state} — no write attempted (add --apply to seed it).`);
    process.exit(0);
  }

  if (st.state === "current") {
    console.log(`render-cycle-card --sync-knowledge --apply: already current — no row written, no link written. A second --apply is a no-op by construction.`);
    process.exit(0);
  }

  const cycleId = flagValue("cycle-id");
  if (!cycleId) {
    console.error("render-cycle-card --sync-knowledge --apply: --cycle-id=<uuid> is required — every agent-row write owes a runner_before_images row, and an image needs an owner (§19v).");
    process.exit(2);
  }

  let decision = flagValue("decision");
  try {
    if (!decision) {
      decision = await supaRest(base, key, "rpc/record_decision", {
        method: "POST",
        body: JSON.stringify({
          p_cycle_id: cycleId,
          p_session_name: null,
          p_kind: "agent-row",
          p_backlog_id: "SES-378",
          p_summary: `SES-378 slice 4: the Development Manager gains ${KNOWLEDGE_SLUG}, linked to ${KNOWLEDGE_CAPABILITY} at display_order ${KNOWLEDGE_DISPLAY_ORDER}`,
          p_reasoning: `The manager's assembled prompt carried the instruments list and no procedure, so every cycle re-read the runbook to learn what a cycle does. ${CARD_REL} is already the generated digest of it, pinned here at ${row.traits.source_sha256} so a re-render that orphans the row is detectable. SES-378.scope_origin is john-named and AGENT-ROW-AGREED-TICKET makes an agreed ticket's Knowledge write build work, imaged, not a card (pattern:0).`,
          p_ladder_work_class: null,
        }),
      });
      if (typeof decision !== "string" || decision.length !== 36) {
        throw new Error(`record_decision returned ${JSON.stringify(decision)}, which is not a decision id`);
      }
    }

    // Read the siblings BEFORE the images are written, so a disagreement refuses the whole apply
    // while the ledger is still untouched rather than half-way through it.
    const sibLinks = await supaRest(base, key, `capability_skill_profiles?select=skill_profile_slug&capability_slug=eq.${KNOWLEDGE_CAPABILITY}`);
    const sibSlugs = sibLinks.map(l => l.skill_profile_slug).filter(s => s !== KNOWLEDGE_SLUG);
    const sibRows = sibSlugs.length
      ? await supaRest(base, key, `skill_profiles?select=${INHERITED_MODEL_COLUMNS.join(",")}&slug=in.(${sibSlugs.join(",")})`)
      : [];
    const modelConfig = inheritedModelConfig(sibRows);

    // The ids are issued HERE so the before-images can name the primary keys the INSERTs will use.
    const profileId = crypto.randomUUID();
    const linkId = crypto.randomUUID();

    // Both images first, and their success is what authorises the writes. row_data NULL is the
    // SES-89 convention for "this row does not exist yet" -- the undo of an INSERT is a DELETE.
    await supaRest(base, key, "runner_before_images", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        { cycle_id: cycleId, session_name: null, table_name: "skill_profiles", pk_value: profileId, row_data: null, decision_id: decision },
        { cycle_id: cycleId, session_name: null, table_name: "capability_skill_profiles", pk_value: linkId, row_data: null, decision_id: decision },
      ]),
    });

    await supaRest(base, key, "skill_profiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: profileId, ...row, ...modelConfig }),
    });

    await supaRest(base, key, "capability_skill_profiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: linkId,
        capability_slug: KNOWLEDGE_CAPABILITY,
        skill_profile_slug: KNOWLEDGE_SLUG,
        level: KNOWLEDGE_LEVEL,
        is_required: true,
        display_order: KNOWLEDGE_DISPLAY_ORDER,
      }),
    });

    // READ BACK, both halves. A PostgREST write the role could not make answers 2xx and changes
    // nothing on some paths, so the row is re-read and re-classified rather than assumed.
    const back = await supaRest(base, key, `skill_profiles?select=id,slug,method,traits&slug=eq.${KNOWLEDGE_SLUG}&limit=1`);
    const after = knowledgeSyncState(Array.isArray(back) && back.length ? back[0] : null, row.traits.source_sha256);
    const links = await supaRest(base, key, `capability_skill_profiles?select=skill_profile_slug,display_order&capability_slug=eq.${KNOWLEDGE_CAPABILITY}`);
    if (after.state !== "current") {
      throw new Error(`the row read back as "${after.state}" after the INSERT — decision ${decision} is standing and holds the images; reverse it before retrying`);
    }
    console.log(`render-cycle-card --sync-knowledge --apply: wrote ${KNOWLEDGE_SLUG} (${profileId}) and its ${KNOWLEDGE_CAPABILITY} link (${linkId}) under decision ${decision} — ${KNOWLEDGE_CAPABILITY} now has ${links.length} link rows; model config inherited from its ${sibSlugs.length} siblings (${modelConfig.llm_model}, ${modelConfig.max_tokens} tokens); both images carry row_data NULL.`);
    process.exit(0);
  } catch (e) {
    console.error(`render-cycle-card --sync-knowledge --apply: FAILED — ${e.message}` +
      (decision ? ` Decision ${decision} was recorded; reverse it (select public.reverse_decision('${decision}','<who>','<why>');) before retrying so the slice keeps one handle.` : ""));
    process.exit(2);
  }
}

// ---- CLI ----------------------------------------------------------------------------------
// no flag  -> check: 0 the committed card equals render(runbook); 1 it differs or is over cap
//             (prints the first differing line and the --write command); 2 the runbook or the card
//             could not be read, a step has no NOTES entry, or NOTES names a step the runbook lacks.
// --write [--cycle-id=<uuid> --ticket=<ID>]
//          -> write the card. Refuses over CARD_BYTE_CAP. A write that CHANGES the card refuses
//             with exit 2 unless it carries --cycle-id, --ticket and live credentials (AGT-112,
//             writeGate below), and on success re-pins the Knowledge row in the same run under the
//             same decision handle. A write that changes nothing is ungated and exits 0.
// --sync-knowledge [--apply --cycle-id=<uuid> [--decision=<uuid>]]
//          -> 0 the live Knowledge row is absent or current, 1 it is DRIFTED, 2 it cannot be read
//             (missing card, missing env, REST failure) or --apply could not complete.
// --sync-knowledge --repin --cycle-id=<uuid> --ticket=<ID> [--decision=<uuid>]
//          -> repairs a DRIFTED row: 0 re-pinned (or already current, nothing written), 2 the row is
//             absent, a required flag is missing, or the write could not complete. SES-424 slice 5.

// AGT-112 -- WHY A RENDER MAY NOT SHIP ALONE. Measured this cycle: the committed card was
// re-rendered twice in one night (187df12b -> 385a4688 -> a3c4ac6d) and the live Knowledge row was
// re-pinned neither time, so the Development Manager spent ~4 hours being assembled from a cycle
// two renders old. Nothing coupled the two: `grep "sync-knowledge\|repin" runner-cycle.md` returned
// 0 hits, and the re-pin was a separate command a human had to remember. That is the wrong shape --
// the fix is not a third wording of the instruction but a structural one (pattern:10), and the
// structure is to gate the dangerous operation through the atomic correct path instead of blocking
// it (pattern:19): a render that CHANGES the card cannot be written at all unless it arrives with
// what the re-pin needs, and then it re-pins in the same run under the same handle.
//
// A NO-OP RE-RENDER IS NOT GATED. `changed === false` writes bytes identical to the ones already
// committed, so it cannot put the pin out of date and owes nothing -- gating it would only train
// everyone to pass flags that mean nothing, and would break `--write` as an idempotent check.
//
// Pure, and the whole of the gate's decision: null when the write may proceed, else the refusal
// string. It names every missing thing at once, so a caller fixes one command line instead of
// discovering the requirements one exit at a time.
export function writeGate({ changed, ticket, cycleId, hasCreds }) {
  if (changed !== true) return null;
  const missing = [];
  if (!ticket) missing.push("--ticket=<ID>");
  if (!cycleId) missing.push("--cycle-id=<uuid>");
  if (!hasCreds) missing.push("SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment");
  if (!missing.length) return null;
  return `render-cycle-card --write: this render CHANGES ${CARD_REL}, and the live ` +
    `${KNOWLEDGE_SLUG} Knowledge row pins the card's bytes — so writing it here would leave the ` +
    `Development Manager assembled from a procedure that is no longer the committed one, which is ` +
    `exactly what happened twice on 2026-09-24 (AGT-112). The write and the re-pin are ONE ` +
    `operation under one decision handle.\n` +
    // ONE LINE, NOTHING ELSE ON IT. The hint below names every flag, so a test that only grepped
    // the whole message for "--ticket" would pass on the --cycle-id refusal too (STANDARDS §4,
    // LOO-013: assert WHICH branch fired). This line is the machine-readable answer to that.
    `  missing: ${missing.join(", ")}\n` +
    `Nothing was written. Re-run as:  node scripts/render-cycle-card.js --write --cycle-id=<uuid> --ticket=<ID>`;
}

function firstDiff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) return { line: i + 1, committed: x[i], rendered: y[i] };
  }
  return null;
}

function main() {
  // The sync branch is its own subcommand: it reads the CARD, never the runbook, so a stale card is
  // reported by the check above rather than silently re-rendered into an agent's Knowledge here.
  if (process.argv.includes("--sync-knowledge")) return syncKnowledge();

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

    // AGT-112. `changed` is measured against the bytes on disk, not assumed from the flags: a card
    // that is missing entirely is a change, and a re-render that produces what is already committed
    // is not. The gate runs BEFORE the write, so a refusal leaves the card byte-for-byte as it was.
    let onDisk = null;
    try {
      onDisk = lf(fs.readFileSync(cardPath, "utf8"));
    } catch {
      onDisk = null;
    }
    const changed = onDisk !== card;
    const refusal = writeGate({
      changed,
      ticket: flagValue("ticket"),
      cycleId: flagValue("cycle-id"),
      hasCreds: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    });
    if (refusal) {
      console.error(refusal);
      process.exit(2);
    }

    fs.writeFileSync(cardPath, card);
    console.log(`render-cycle-card: wrote ${CARD_REL} — ${bytes} bytes, ${parseSteps(md).length} steps, from ${RUNBOOK_REL} sha256 ${runbookSha(md)}`);

    // An unchanged write cannot have moved the pin, so it ends here and touches no database.
    if (!changed) process.exit(0);

    // THE COUPLING. Same process, same flags, one handle: the repair below is the existing
    // repinKnowledge(), reached through the existing classifier, never a second copy of it.
    console.log("render-cycle-card --write: the card changed — re-pinning the Knowledge row in the same run.");
    return syncKnowledge({ repin: true });
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
