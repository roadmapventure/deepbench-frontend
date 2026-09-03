// DeepBench v7.0.414 | tests/regression/ses-160-invention-engine.test.mjs | SES-160 — the
// invention engine after cards: the daily pass files a proposal as an enhancement-lane row
// (EL-01) under a recorded decision, paced by the invention rung and the weekly cap, and a
// reversal stores a rejected claim so it is never re-proposed (M7 gate ruling i, decision
// 05cc2722).
//
// TWO ARMS, the same split as every prior migration-plus-runbook ticket in this file (SES-159,
// SES-320): DOC (always runs) pins step 4b's rewrite — the precondition is `invention_due()`,
// the egress probe names the missing WebSearch tool, step 5 files with
// `file_invention_proposal()` and the retired card/Accept sentence is quoted as retired rather
// than live, and the Reverse ceremony calls `record_rejected_invention()`; LIVE (SUPABASE_URL +
// SUPABASE_SERVICE_KEY, else declared NOT RUN) calls the one READ-ONLY function over PostgREST
// and declares the two WRITERS not-run, because a permanent regression test must never write
// backlog_items / runner_decisions / vision_claims on the live board (the SES-196 / SES-218 /
// SES-275 refusal, the same boundary SES-159 and SES-320 draw for this table family). The
// writers' evidence is the rolled-back `DO` block run at this ship, recorded in run() below.
//
// Invocation: node tests/regression/ses-160-invention-engine.test.mjs
// (Section 2 rule 5 for the credentialed form.)

import assert from "assert";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// origin/dev immediately before this coding session -- the SES-160 kickoff commit, doc-only.
const PRE_CHANGE_SHA = "66acd810b84d12df748f491e355191469c147d90";

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
const LANE_REL = "docs/RUNNER-GOV-ENHANCEMENT-LANE.md";

// The runbook is hard-wrapped, so a load-bearing phrase can straddle a line break (SES-194).
export const norm = s => s.replace(/\s+/g, " ");

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ---------------------------------------------------------------------------------------------
// THE DOC HALF. A clause earns its place only if REMOVING it would change what a later editor does.
// ---------------------------------------------------------------------------------------------

export const CLAUSES = [
  {
    id: "4b-precondition-is-invention-due-not-notes-grep",
    file: RUNBOOK_REL,
    detail:
      "the old designation ('run this pass iff no runner_cycles row today carries INVENTION " +
      "PASS in notes') let a cycle run the pass with no pacing at all -- invention_due() is the " +
      "one function that reads the rung, the settings and EL-02's cap, and a reader who cannot " +
      "see this call would resurrect the free-running form the first time they 'simplified' the " +
      "precondition",
    test: s => /SELECT \* FROM public\.invention_due\(\);/.test(s) &&
               !/Deterministic designation, no coordination needed: run this pass/.test(norm(s)),
    breaks: s => s.replace(
      "Precondition: `SELECT * FROM public.invention_due();` (the old notes-grep designation retires).",
      "Deterministic designation, no coordination needed: run this pass iff no `runner_cycles` " +
        "row in the current America/Chicago day carries `INVENTION PASS` in `notes`.",
    ),
  },
  {
    id: "egress-probe-names-the-missing-websearch-tool",
    file: RUNBOOK_REL,
    detail:
      "the routine's allowed_tools carry WebFetch only, not WebSearch, so a cycle that tries a " +
      "bare WebSearch call every day either burns a cycle re-discovering the same missing tool " +
      "or -- worse -- an editor 'fixes' the probe to silently swap in WebFetch, which is not the " +
      "same precondition C3 measures. The exact skip sentence is what makes 'no tool' and 'a " +
      "real search failure' two different, both-honest outcomes",
    test: s => {
      const n = norm(s);
      return /allowed_tools.{0,20}CARRY `WebFetch` ONLY, NOT `WebSearch`/.test(n) &&
             /INVENTION PASS: egress blocked \(no WebSearch tool\)/.test(s) &&
             /never a defect to re-file/.test(n);
    },
    breaks: s => s.replace(
      "INVENTION PASS: egress blocked (no WebSearch tool)",
      "INVENTION PASS: egress blocked",
    ),
  },
  {
    id: "step-5-files-with-the-function-and-the-card-sentence-is-quoted-retired",
    file: RUNBOOK_REL,
    detail:
      "step 5 used to file a gated_before_build card that John's Accept turned into a ticket -- " +
      "SES-283/M6-04 killed that surface, and this ship is the rewrite SES-289's annotation " +
      "deferred. A reader must see the LIVE instruction is file_invention_proposal(), and must " +
      "see the old card/Accept sentence appear ONLY as a quoted, explicitly-retired thing, never " +
      "as a second live instruction sitting beside the new one",
    test: s => {
      const n = norm(s);
      return /public\.file_invention_proposal\(<your cycle id>, NULL, p\)/.test(s) &&
             /is retired, not merely\s*annotated: the card surface it named no longer exists at all/.test(n) &&
             // the retired sentence is INSIDE quotes, immediately preceded by "REPLACES"
             /sentence this REPLACES — "file the surviving proposal as a/.test(n);
    },
    breaks: s => s.replace(
      /\*\*The sentence this REPLACES.*?exists at all\.\*\*/s,
      "**File the surviving proposal as a `gated_before_build` `runner_items` card.**",
    ),
  },
  {
    id: "reverse-ceremony-calls-record-rejected-invention-before-anything-else",
    file: RUNBOOK_REL,
    detail:
      "a reversed invention decision without this call leaves the rejection unrecorded -- the " +
      "corpus never learns what John turned down, and the SAME idea can be re-proposed on a " +
      "later pass because nothing marks it rejected. 'before anything else' is load-bearing: " +
      "record_rejected_invention() reads the reversal's own before-image, which only exists " +
      "once reverse_decision() has already run",
    test: s => {
      const n = norm(s);
      return /SELECT \* FROM public\.record_rejected_invention\('<decision id>'\);/.test(s) &&
             /before selection or anything else runs, call/.test(n) &&
             /idempotent per decision/.test(n);
    },
    // A REGEX, never a literal carrying a space where the runbook carries a line break: this
    // worktree's line endings are not guaranteed (CRLF after a checkout, LF after a raw edit),
    // and the sentence this clause pins wraps across a line break -- a literal multi-word string
    // is a no-op against the wrapped form and the teeth check below would pass vacuously (the
    // SES-315/SES-159 lesson).
    breaks: s => s.replace(
      /and then, before\s+selection or anything else runs, call/,
      "and then, at the end of the cycle if there is time, call",
    ),
  },
  {
    id: "enhancement-lane-doc-names-the-pass-as-the-lane-producer",
    file: LANE_REL,
    detail:
      "the lane's own doc named EL-01/02/03 but never said what actually FILES a row through " +
      "them -- a reader auditing the lane for its one producer would find nothing pointing back " +
      "at the runbook, and could conclude (wrongly) that any code path may file an enhancement " +
      "row as long as it passes the admission test",
    test: s => {
      const n = norm(s);
      return /this lane's producer/.test(n) &&
             /public\.file_invention_proposal\(\)/.test(s) &&
             /LOG-143.{0,40}first row through/.test(n);
    },
    breaks: s => s.replace(
      "**The invention pass is this lane's producer",
      "**The invention pass is one of several possible producers",
    ),
  },
];

function theDocsCarryTheRuling() {
  for (const c of CLAUSES) {
    assert.ok(c.test(readRel(c.file)), `${c.id} (${c.file}) -- ${c.detail}`);
  }
}

function everyClauseHasTeeth() {
  for (const c of CLAUSES) {
    const src = readRel(c.file);
    const broken = c.breaks(src);
    assert.notStrictEqual(
      broken, src,
      `clause "${c.id}"'s breaks() returned its input unchanged -- the teeth check below would ` +
        "pass vacuously, which is a control that controls nothing",
    );
    assert.ok(!c.test(broken), `${c.id} is VACUOUS -- it still passes after its own breaks() mutation`);
  }
}

// FILE-LEVEL NEGATIVE CONTROL against the commit this ship was written on (the SES-160 kickoff,
// doc-only). Every clause must FAIL there -- that tree is the one where step 4b still ran the
// withdrawn card route and the enhancement-lane doc named no producer.
function theClausesFailOnThePreChangeTree() {
  const before = {};
  for (const rel of [RUNBOOK_REL, LANE_REL]) {
    try {
      before[rel] = execFileSync("git", ["show", `${PRE_CHANGE_SHA}:${rel}`], {
        cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      notRun(
        "the file-level negative control",
        `commit ${PRE_CHANGE_SHA} is unreachable in this checkout (a shallow clone), so the ` +
          "pre-change docs could not be read. The clauses above still ran against the shipped " +
          "tree; what is unproven is that they FAIL on the tree where SES-160 did not exist.",
      );
      return;
    }
  }
  const passing = CLAUSES.filter(c => c.test(before[c.file])).map(c => c.id);
  assert.deepStrictEqual(
    passing, [],
    `these clauses pass on the PRE-CHANGE tree and therefore pin nothing: ${passing.join(", ")}`,
  );
}

// ---------------------------------------------------------------------------------------------
// THE LIVE HALF -- Supabase over PostgREST. invention_due() is read-only by construction (it
// only SELECTs), so it is the one function this permanent suite may call live.
// ---------------------------------------------------------------------------------------------

const base = url => url.replace(/\/+$/, "");

async function post(url, key, name, body) {
  return fetch(`${base(url)}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function theDueCheckIsReadOnlyAndNeverRaises(url, key) {
  const res = await post(url, key, "invention_due", {});
  const body = await res.text();
  assert.ok(
    !/PGRST202|PGRST203|Could not find the function/i.test(body),
    `public.invention_due() is not resolvable at exactly one overload: ${body.slice(0, 300)}. ` +
      "This is the arm that fails against a database still missing migration " +
      "ses160_invention_engine, or one where service_role lost EXECUTE",
  );
  assert.strictEqual(res.status, 200, `rpc/invention_due returned HTTP ${res.status}: ${body.slice(0, 300)}`);
  const rows = JSON.parse(body);
  assert.ok(Array.isArray(rows) && rows.length === 1, `expected exactly one row, got ${body.slice(0, 200)}`);
  const row = rows[0];
  assert.ok(typeof row.due === "boolean", `due must be a boolean: ${JSON.stringify(row)}`);
  assert.ok(Number.isInteger(row.allowed), `allowed must be an integer: ${JSON.stringify(row)}`);
  assert.ok(typeof row.reason === "string" && row.reason.length > 0, "reason must be a non-empty sentence");
  // due=false must never claim allowed>0, and vice versa -- a cheap internal-consistency check
  // that reads the function's own contract rather than a remembered number.
  if (!row.due) {
    assert.strictEqual(row.allowed, 0, `due=false must report allowed=0, got ${JSON.stringify(row)}`);
  } else {
    assert.ok(row.allowed > 0, `due=true must report allowed>0, got ${JSON.stringify(row)}`);
  }
  // Read-only by construction: calling it twice in a row must return the identical row (nothing
  // it read moved between the two calls it made itself).
  const res2 = await post(url, key, "invention_due", {});
  const row2 = (JSON.parse(await res2.text()))[0];
  assert.deepStrictEqual(row2, row, "invention_due() must be idempotent across two immediate calls -- it only SELECTs");
}

async function run() {
  theDocsCarryTheRuling();
  everyClauseHasTeeth();
  theClausesFailOnThePreChangeTree();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live read-only arm (invention_due() resolvable and returning an internally-consistent " +
        "row) and the two writer arms below",
      "SUPABASE_URL and/or SUPABASE_SERVICE_KEY are absent. The doc arm above still graded all " +
        "five clauses against the committed tree and its pre-change control. Canonical " +
        "invocation: STANDARDS.md Section 2 rule 5.",
    );
  } else {
    await theDueCheckIsReadOnlyAndNeverRaises(url, key);
  }

  notRun(
    "the two WRITER paths -- file_invention_proposal()'s admission raises and its filed-row-plus-" +
      "decision shape, and record_rejected_invention()'s claim insert and its idempotency -- and " +
      "every pg_proc fact (overload counts, EXECUTE grants)",
    "both write backlog_items / runner_decisions / runner_before_images and, on a rejection, " +
      "vision_claims. A permanent regression test must never do that on the live board (the " +
      "SES-196 / SES-218 / SES-275 refusal, the same boundary SES-159 and SES-320 draw for this " +
      "table family). MEASURED AT THIS SHIP INSTEAD, live over the MCP, inside one deliberately " +
      "failing DO block with the whole fixture rolled back, asserted on the OUTCOME AND THE " +
      "MESSAGE rather than on 'it returned': file_invention_proposal(NULL, 'ses-160-fixture', " +
      "<a P2 - Inventive payload citing VC-CUST-001 and docs/research/SES-131-market-faang-" +
      "research.md>) filed SES-322 (scope_origin 'enhancement', epic 'Selfbuild M7 - The " +
      "Inventor', milestone 'M7', enhancement_claim 'shipped_cycles_week: up') under a NEW " +
      "record_decision(kind='invention', ladder_work_class='invention') decision, with exactly " +
      "one runner_before_images row (table_name backlog_items, row_data NULL, the SES-89 insert " +
      "convention) under that decision id; the SAME call with a description citing neither a " +
      "VC- ref nor a docs/research/ path RAISED 'description must cite at least one VC- claim " +
      "ref and one docs/research/ path -- a proposal with no evidence is a feature mill (§19d)'; " +
      "the same call with class 'P9 - Bug Fixes' RAISED 'class must be one of P1..P4, got P9 - " +
      "Bug Fixes'. reverse_decision() on the valid decision returned outcome='applied', " +
      "restored=1, demoted=true, and the SES-322 row was gone (the NULL-image delete). " +
      "record_rejected_invention() on that decision returned applied=true, " +
      "claim_ref='VC-REJ-001', reason naming it; a SECOND call for the SAME decision returned " +
      "applied=false, reason=\"already recorded as VC-REJ-001\" -- idempotent, no second row. " +
      "The resulting vision_claims row carried status='rejected', class_scope='classed', " +
      "judgment_class='P2 - Inventive', is_root=false, source_doc correctly extracted from the " +
      "description's own docs/research/ path, and claim_text 'Rejected proposal: ZZZ SES-160 " +
      "fixture invention proposal — SES-160 fixture rejection test'. ONE BUG FOUND AND FIXED " +
      "BEFORE THIS RESULT, the SES-134 class: record_rejected_invention()'s claim-numbering " +
      "query read the bare `claim_ref` identifier, ambiguous between the function's own OUT " +
      "parameter of that name and the vision_claims column (42702) -- fixed by table-qualifying " +
      "it (migration ses160_invention_engine_fix_claim_ref_ambiguity). ZERO RESIDUE on re-read " +
      "after rollback: 0 fixture backlog_items rows, 0 VC-REJ-* rows, 0 fixture runner_decisions " +
      "rows, feature_id_counter for SES back at 321 (so the next real filing is still SES-322), " +
      "invention rung unmoved at 0, invention_due() unchanged before and after. Grants asserted " +
      "by the migration's own trailing DO block rather than its success flag: exactly one " +
      "overload each of invention_due/file_invention_proposal/record_rejected_invention, EXECUTE " +
      "false for anon and authenticated and true for service_role on all three " +
      "(has_function_privilege, both directions -- functions default OPEN in this project, " +
      ".claude/rules/supabase-column-grants.md SES-315 addendum). LIVE BOARD FACT MEASURED AT " +
      "THIS SHIP: invention_due() returns due=false, allowed=0, reason naming the 7-day floor -- " +
      "LOG-143 (John's ratified first feature, decided 2026-09-03T02:38:27Z) is the newest " +
      "unreversed invention decision and sits inside runner_settings.invention_floor_days (7), " +
      "exactly the Manual QA Checklist's predicted result.",
  );
}

selfRun(import.meta.url, run);
export default run;
