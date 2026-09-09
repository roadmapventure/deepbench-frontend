// DeepBench v7.0.436 | tests/regression/ses-333-step5-handoff.test.mjs | SES-333 -- runbook step 5
// hands the pick to the Prioritizer, and its selection rules move into pz-guardrails.
//
// WHAT IS BEING PINNED, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY.
//
// (1) THE MOVE IS ASSERTED AS BYTE-EQUALITY BETWEEN THE RUNBOOK AND THE SKILL ROW, IN BOTH
// DIRECTIONS. A guard that asserted `pz-guardrails` merely CONTAINS the words "removal proposed"
// would pass against a paraphrase — and a paraphrase is precisely the second, drifting copy this
// move exists to end. So part (c) extracts each passage from the runbook body and asserts it equals
// the stored string exactly. It also asserts the runbook STILL CARRIES all three: "it is in the Skill
// now" is not permission to delete them here, because that would leave the rules readable by an agent
// and unreadable by the person debugging it.
//
// (2) THE LAYER-3 REWRITE IS ASSERTED ON WHAT IT REMOVED, NOT ONLY ON WHAT IT ADDED. Asserting the
// runbook mentions `prime_directive_queue()` passes on the UNEDITED file — layer (1a) already cited
// it twice before this ship. The discriminating property is that the new layer (3) exists as a
// SELECTION INSTRUCTION with the supports_class precondition and the "pick is its first row" rule,
// and that the recompute-then-read pair is relabelled `(3-legacy)` under a RETIRED IN PLACE note.
//
// (3) THE STAMP ROTATION IS ASSERTED WHERE IT WAS MADE. Check 7's cap, the archived stamp's presence
// in SESSIONS.md, and — the half that is usually skipped — that SES-164 step 2's ONE relocated
// warning actually landed in the body. A rotation that moved a warning nowhere is content loss with a
// clean diff.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (a), (b) and (d) are source-only and always run. Part (c)
// touches Supabase and declares itself NOT RUN via notRun() when credentials are absent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/runner-cycle.md");
const LEDGER = path.join(ROOT, "docs/SELFBUILD-RETIREMENT-LEDGER.md");
const SESSIONS = path.join(ROOT, "docs/SESSIONS.md");

const hasCreds = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline per " +
  "docs/runbooks/session-setup.md step 1b) and re-run the suite";

const norm = s => s.replace(/\r\n/g, "\n");

// Slice the runbook between two literal anchors, exclusive of the end anchor. Used to lift each moved
// passage back out of the body so it can be compared with the stored copy — the comparison is the
// whole point, so the extraction is deliberately anchor-based rather than line-number-based (line
// numbers move on every ship; these anchors are the passages' own opening words).
function between(text, startAnchor, endAnchor) {
  const i = text.indexOf(startAnchor);
  assert.notStrictEqual(i, -1, `the runbook no longer contains: ${startAnchor.slice(0, 60)}…`);
  const j = text.indexOf(endAnchor, i);
  assert.notStrictEqual(j, -1, `no end anchor after it: ${endAnchor.slice(0, 60)}…`);
  return text.slice(i, j).trim();
}

async function skillRow() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/skill_profiles?slug=eq.pz-guardrails&select=guardrails`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  assert.ok(rows[0], "no pz-guardrails row");
  return rows[0].guardrails;
}

async function run() {
  const runbook = norm(fs.readFileSync(RUNBOOK, "utf8"));
  const ledger = norm(fs.readFileSync(LEDGER, "utf8"));
  const sessions = norm(fs.readFileSync(SESSIONS, "utf8"));

  // ---- (a) step 5 hands the pick to the Prioritizer -------------------------------------------
  assert.ok(/\(3\) \*\*THE PICK IS THE PRIORITIZER'S, AND THIS LAYER STOPPED RE-DERIVING IT/.test(runbook),
    "step 5 layer (3) must name the Prioritizer as the owner of the pick");
  // Line-break tolerant: this sentence wraps mid-phrase inside a SQL comment, and an assertion that
  // silently depends on where a line happens to wrap is one reflow away from a false red.
  assert.ok(/`supports_class IS NULL`[\s\S]{0,20}is the whole precondition/.test(runbook),
    "layer (3) must state the classify precondition -- an already-ruled ticket is not re-ruled by a cycle");
  assert.ok(/SELECT \* FROM public\.prime_directive_queue\(\);/.test(runbook),
    "layer (3) must call prime_directive_queue() rather than re-deriving the order");
  assert.ok(/the pick is its first row/i.test(runbook),
    "layer (3) must say the pick IS the first row -- without that it is a read, not a selection rule");
  // What it REMOVED, which is the half a mention-only assertion would miss: the old class-sorted
  // board read is no longer layer (3), it is (3-legacy) under a retirement note.
  assert.ok(/\(3-legacy\) The backlog by class/.test(runbook),
    "the old class-sorted board read must be relabelled (3-legacy) -- it is no longer the mechanism");
  assert.ok(/RETIRED IN PLACE \(`SES-333`, `v7\.0\.436`\) — `docs\/SELFBUILD-RETIREMENT-LEDGER\.md` entry 45/.test(runbook),
    "the (3-legacy) block must carry its RETIRED IN PLACE note pointing at ledger entry 45");
  console.log("  (a) step 5 layer (3) reads prime_directive_queue(); the old read is (3-legacy) -- PASS");

  // ---- (b) the ledger entries exist and say what they must ------------------------------------
  for (const [n, needle] of [
    [45, "the class-sorted board read as the pick mechanism"],
    [46, "the removal-proposed procedural skip"],
    [47, "the blocked-prefix table and `NULL` is not `auto`"],
  ]) {
    const head = `### ${n}. \`runner-cycle.md\` step 5`;
    assert.ok(ledger.includes(head), `ledger entry ${n} is missing`);
    assert.ok(ledger.slice(ledger.indexOf(head)).slice(0, 400).includes(needle),
      `ledger entry ${n}'s heading must name what was retired (${needle})`);
  }
  // The ledger's contract is that every entry says where the content SURVIVES and how to restore it.
  // Entries 46 and 47 also owe the honest caveat, because the restore genuinely does not work the
  // ordinary way and an entry that omitted that would be worse than no entry.
  const e46 = ledger.slice(ledger.indexOf("### 46."), ledger.indexOf("### 47."));
  assert.ok(/`skill_profiles` is \*\*not\*\* on it/.test(e46),
    "entry 46 must state that reverse_decision()'s allowlist excludes skill_profiles -- a restore path "
    + "that silently does not work is the failure this ledger exists to prevent");
  assert.ok(/21402e94-5d7c-4baf-a68b-13262b1ed1c3/.test(e46),
    "entry 46 must name the decision id the move was recorded under");
  console.log("  (b) ledger entries 45/46/47 present, with the card-only restore caveat -- PASS");

  // ---- (d) the stamp rotation ------------------------------------------------------------------
  const stamps = runbook.split("\n").filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(stamps <= 5,
    `docs/runbooks/runner-cycle.md carries ${stamps} header stamps; session-hygiene check 7 caps it at 5`);
  assert.ok(sessions.includes("<!-- DeepBench v7.0.414 | runbooks/runner-cycle.md | SES-160"),
    "the stamp SES-333 retired (v7.0.414) is not in docs/SESSIONS.md -- check 7 step 3 says retired "
    + "stamps move VERBATIM to the appendix, because git history is not where anyone looks");
  assert.ok(!runbook.includes("<!-- DeepBench v7.0.414 | runbooks/runner-cycle.md"),
    "v7.0.414 is still in the runbook header -- it was copied, not rotated");
  // SES-164 step 2's one relocation. A rotation that archived this warning instead of relocating it
  // would leave the body with no home for it at all, which is content loss with a clean diff.
  assert.ok(/Its `ladder_work_class` is the LITERAL `'invention'`, never derived from the proposal's own/.test(runbook),
    "the one v7.0.414 warning with no body home (the literal 'invention' work class) must have been "
    + "RELOCATED into the body beside step 4b item 5, not archived with the stamp");
  console.log(`  (d) stamp count ${stamps}/5, v7.0.414 archived verbatim, its one unhomed warning relocated -- PASS`);

  if (!hasCreds()) {
    notRun("(c) the verbatim rules in pz-guardrails", CRED_HINT);
    return;
  }

  // ---- (c) LIVE: the rules are in the Skill row, byte-identical --------------------------------
  const g = await skillRow();
  assert.ok(g && g.selection_rules, "pz-guardrails carries no guardrails.selection_rules");
  const sr = g.selection_rules;

  const fromRunbook = {
    blocked_prefix: between(runbook,
      "**THE BLOCKED PREFIX IS READ AT A GLANCE, NOT RE-DERIVED EVERY CYCLE",
      "**`delivered` and `john-paced` are the two rows in that table"),
    removal_proposed: between(runbook,
      "**A `removal proposed` ticket NOW HOLDS ITS NUMBER",
      "<!-- FEATURE: SES-333 — moved verbatim into pz-guardrails.selection_rules.blocked_prefix"),
    null_is_not_auto: between(runbook,
      "**`NULL` is not `auto`.**",
      "**LAYER 1b — A STANDING EPIC DRAIN"),
  };

  for (const key of ["blocked_prefix", "removal_proposed", "null_is_not_auto"]) {
    assert.ok(typeof sr[key] === "string" && sr[key].length > 0, `selection_rules.${key} is missing or empty`);
    assert.strictEqual(sr[key], fromRunbook[key],
      `selection_rules.${key} is NOT byte-identical to the runbook passage — a paraphrase is the second, `
      + "drifting copy this move exists to end. Stored length "
      + `${sr[key].length}, runbook length ${fromRunbook[key].length}.`);
  }

  // The rules have to BIND, not merely be stored: a passage sitting in a jsonb nobody's contract
  // references is documentation, not a guardrail.
  assert.ok(g.must.some(m => /blocked-prefix flag/.test(m)),
    "no `must` clause binds the blocked-prefix rule");
  assert.ok(g.must.some(m => /removal proposed/.test(m)),
    "no `must` clause binds the removal-proposed rule");
  assert.ok(g.must_not.some(m => /`NULL` is not `auto`|NULL. is not .auto|backfill `auto`/.test(m)),
    "no `must_not` clause binds the NULL-is-not-auto rule");
  assert.ok(g.must_not.some(m => /prime_directive_queue/.test(m)),
    "no `must_not` clause forbids re-deriving the pick -- which is the whole of layer (3)'s change");
  console.log(`  (c) LIVE: three passages byte-identical in pz-guardrails `
    + `(${sr.blocked_prefix.length}/${sr.removal_proposed.length}/${sr.null_is_not_auto.length} chars), `
    + `${g.must.length} must + ${g.must_not.length} must_not clauses binding them -- PASS`);
}

export default run;
selfRun(import.meta.url, run);
