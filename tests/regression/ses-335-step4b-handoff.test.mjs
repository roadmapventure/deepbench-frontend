// DeepBench v7.0.608 | tests/regression/ses-335-step4b-handoff.test.mjs | SES-335 -- runbook
// step 4b hands the invention pass to The Researcher, and the method retires into the rs-* Skills.
//
// RETARGETED BY AGT-138 (v7.0.608), AND THE RETARGET IS THE POINT RATHER THAN A PATH EDIT. The
// Researcher left the builder cycle for its own weekly routine, so step 4b is now one 4d-shaped
// pointer line and the method it used to carry lives in docs/runbooks/researcher-routine.md --
// moved verbatim, not summarised. Part (a) therefore reads the PLAYBOOK for every sentence of the
// method and reads the RUNBOOK for exactly two facts: that the pointer line is there, and that the
// method is NOT (a retarget that only followed the text would pass just as well on a tree with two
// live copies, which is the drift the move exists to end).
//
// WHAT IS BEING PINNED, AND THE SHAPE A LAZIER GUARD WOULD PASS VACUOUSLY.
//
// (1) THE HANDOFF IS ASSERTED ON WHAT IT REMOVED, NOT ONLY ON WHAT IT ADDED. Asserting that step 4b
// mentions `research-class-lens` would pass on a runbook that merely name-dropped the capability
// beside the old hand-run method -- which is the drift this ship exists to end. So part (a) asserts
// the four orchestration statements AND that the old numbered items are relabelled
// `(1-legacy)`-`(4-legacy)` under a RETIRED IN PLACE note pointing at ledger entry 48, i.e. that
// they are no longer the pass a cycle performs.
//
// (2) THE ONE RENAMED KEY IS CHECKED IN BOTH HOMES, AND THE PREDICATE IS THE OTHER TEST'S OWN.
// The runbook has to SAY that the Intent returns `priority_class` while file_invention_proposal()
// reads `p.class`; but a doc sentence proves nothing on its own, so part (b) imports the live
// predicate `covers()` from tests/regression/agt-64-researcher.test.mjs and asserts it agrees --
// including its negative control. Re-implementing the rename here would create the second, drifting
// copy the sentence is about.
//
// (3) THE STAMP ROTATION IS ASSERTED WHERE IT WAS MADE. Check 7's cap of five, the archived stamp's
// presence in docs/SESSIONS.md, and its ABSENCE from the runbook header -- a stamp that was copied
// rather than rotated leaves the count over the cap with a clean-looking diff.
//
// WHICH BRANCH FIRED IS ANNOUNCED. Parts (a), (b) and (c) are source-only and always run. Part (d)
// touches Supabase and declares itself NOT RUN via notRun() when credentials are absent.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { covers } from "./agt-64-researcher.test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const RUNBOOK_REL = "docs/runbooks/runner-cycle.md";
// AGT-138: the method's one home. The runbook keeps the step and points here.
const PLAYBOOK_REL = "docs/runbooks/researcher-routine.md";
const RETIREMENT_LINE =
  "**4b. Invention pass — retired from the cycle (`AGT-138`, `v7.0.608`).** The Researcher runs in " +
  "its own routine, `docs/runbooks/researcher-routine.md`; a cycle no longer runs the pass. Go to step 4c.";
const LEDGER_REL = "docs/SELFBUILD-RETIREMENT-LEDGER.md";
const SESSIONS_REL = "docs/SESSIONS.md";

// The Skills the retired method now lives in. Named as a set, never counted: `length === 4` passes
// against four copies of one slug.
const RS_HOMES = ["rs-knowledge-corpus", "rs-research-intent", "rs-behavior", "rs-guardrails"];
const CAPABILITY = "research-class-lens";
const INTENT_SLUG = "rs-research-intent";

const CRED_HINT =
  "set SUPABASE_URL and SUPABASE_SERVICE_KEY (read them by name from public.runner_secrets and " +
  "export them inline, per docs/runbooks/session-setup.md step 1b) and re-run the suite";

export default async function run() {
  const runbook = read(RUNBOOK_REL);
  const playbook = read(PLAYBOOK_REL);
  const ledger = read(LEDGER_REL);
  const sessions = read(SESSIONS_REL);

  // ---- (a0) AGT-138: the runbook keeps the step as a POINTER and keeps none of the method -----
  assert.ok(runbook.includes(RETIREMENT_LINE),
    `${RUNBOOK_REL} must carry step 4b's retirement line verbatim -- the step stays in place so ` +
    "ses-336's ordered step list and the runbook's nine `step 4b` cross-references still resolve");
  assert.ok(!/SELECT \* FROM public\.invention_due\(\);/.test(runbook),
    `${RUNBOOK_REL} still carries the invention_due() precondition -- the pass is not the cycle's ` +
    "any more, and a runbook that still gates on it is the second live copy AGT-138 removed");
  assert.ok(!/\(1-legacy\)/.test(runbook),
    `${RUNBOOK_REL} still carries the legacy method items -- they moved to ${PLAYBOOK_REL} verbatim; ` +
    "two homes for one procedure is exactly what check 13 forbids");
  console.log(`  (a0) ${RUNBOOK_REL} holds the pointer line and none of the method -- PASS`);

  // ---- (a) the method, in its one home: the playbook orchestrates and retires in place --------
  assert.ok(/\*\*THE PASS IS THE RESEARCHER'S WORK NOW, AND THIS STEP ONLY ORCHESTRATES IT/.test(playbook),
    "the playbook must name The Researcher as the owner of the pass");
  assert.ok(/--agent=researcher --capability=research-class-lens --intent=rs-research-intent/.test(playbook),
    "the playbook must assemble the prompt over scripts/agent-prompt.js with the agent, the capability " +
    "and the intent named -- a hand-built prompt is a second copy of the executor's assembly");
  // Line-break tolerant: this phrase wraps, and an assertion that depends on where it wraps is one
  // reflow away from a false red.
  assert.ok(/run on the[\s\S]{0,40}`judgment`[\s\S]{0,60}lane|\*\*`judgment`\*\*[\s\S]{0,80}lane/.test(playbook),
    "the playbook must send the run to the judgment lane, read from runner_model_lanes");
  assert.ok(/`egress = 'blocked'`[\s\S]{0,120}INVENTION PASS: egress blocked/.test(playbook),
    "the playbook must say what a blocked egress writes and that the run continues");
  assert.ok(/continue to step 5 normally/.test(playbook),
    "a blocked egress must not end the cycle -- the pass is bookkeeping plus research, not the build");

  // What it REMOVED, which is the half a mention-only assertion misses.
  for (const n of [1, 2, 3, 4]) {
    assert.ok(playbook.includes(`(${n}-legacy)`),
      `the playbook's legacy method item ${n} must be relabelled (${n}-legacy) -- it is no longer the pass`);
  }
  assert.ok(/RETIRED IN PLACE \(`SES-335`, `v7\.0\.438`\) — `docs\/SELFBUILD-RETIREMENT-LEDGER\.md` entry 48/.test(playbook),
    "the legacy block must carry its RETIRED IN PLACE note pointing at ledger entry 48");
  for (const slug of RS_HOMES) {
    assert.ok(playbook.includes(`\`${slug}\``),
      `the retirement note must name ${slug} as a surviving home -- "it moved" with no address is ` +
      "not a retirement, it is a deletion");
  }
  // The method text itself is KEPT: "it is in the Skill now" is not permission to delete it here.
  assert.ok(/Egress probe \(precondition C3, measured not assumed\)/.test(playbook),
    "the retired method must still be readable in the playbook -- deleting it leaves the pass " +
    "readable by an agent and unreadable by the person debugging it");
  assert.ok(/an editor must not treat/i.test(playbook),
    "the retirement note must forbid the delete-because-it-moved edit outright");
  console.log(`  (a) ${PLAYBOOK_REL} orchestrates; items 1-4 are (1-legacy)-(4-legacy) under entry 48 -- PASS`);

  // ---- (b) the one renamed key, checked against agt-64's own predicate -------------------------
  assert.ok(/the Intent returns\s*\n?\s*`priority_class`, `public\.file_invention_proposal\(\)` reads `p\.class`/.test(playbook)
    || /Intent returns[\s\S]{0,40}`priority_class`[\s\S]{0,80}reads `p\.class`/.test(playbook),
    "the playbook must state the one key that is renamed at the handoff");
  // The predicate itself, not a restatement of it. covers() is agt-64's export; if the rename ever
  // changes there, this assertion moves with it instead of drifting away from it.
  const P_KEYS = ["class", "title", "description", "scope_rationale", "enhancement_claim", "predicted_cycles"];
  const SURVIVOR_KEYS = ["title", "priority_class", "enhancement_claim", "scope_rationale",
    "predicted_cycles", "description", "claim_refs"];
  assert.ok(covers(P_KEYS, SURVIVOR_KEYS),
    "covers() must accept the documented survivor shape -- if it does not, the runbook sentence " +
    "and agt-64's predicate disagree about the handoff");
  assert.ok(!covers(P_KEYS, SURVIVOR_KEYS.filter(k => k !== "priority_class")),
    "covers() must REJECT a survivor shape with priority_class dropped -- a predicate that cannot " +
    "reject the mutant is not measuring the rename this step exists to state");
  console.log("  (b) the class <- priority_class rename is stated and agrees with covers() -- PASS");

  // ---- (c) the ledger entry, and the stamp rotation --------------------------------------------
  const head = "### 48. `runner-cycle.md` step 4b items (1)–(4)";
  assert.ok(ledger.includes(head), "ledger entry 48 is missing");
  const e48 = ledger.slice(ledger.indexOf(head));
  for (const slug of RS_HOMES) {
    assert.ok(e48.includes(slug),
      `ledger entry 48 must name ${slug} as a surviving home -- the ledger's whole contract is that ` +
      "an entry says where the content survives");
  }
  assert.ok(/nothing here to reverse on the database side/.test(e48),
    "entry 48 must state the honest restore path: the rs-* rows were seeded by AGT-64, so this " +
    "retirement has no decision to reverse -- an entry implying an undo that does not exist is " +
    "worse than no entry");

  const stamps = runbook.split("\n").filter(l => l.startsWith("<!-- DeepBench v")).length;
  assert.ok(stamps <= 5,
    `${RUNBOOK_REL} carries ${stamps} header stamps; session-hygiene check 7 caps it at 5`);
  assert.ok(sessions.includes("<!-- DeepBench v7.0.421 | runbooks/runner-cycle.md"),
    "the stamp SES-335 retired (v7.0.421) is not in docs/SESSIONS.md -- check 7 step 3 says retired " +
    "stamps move VERBATIM to the appendix, because git history is not where anyone looks");
  assert.ok(!runbook.includes("<!-- DeepBench v7.0.421 | runbooks/runner-cycle.md"),
    "v7.0.421 is still in the runbook header -- it was copied, not rotated");
  console.log(`  (c) ledger entry 48 names its homes; stamp count ${stamps}/5, v7.0.421 archived verbatim -- PASS`);

  // ---- (d) LIVE: the surviving home actually exists ---------------------------------------------
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("(d) the rs-* Skills the retirement points at", CRED_HINT);
    return;
  }
  const H = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = async p => {
    const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
    if (!r.ok) throw new Error(`GET ${p} -> ${r.status} ${await r.text()}`);
    return r.json();
  };

  const links = await rest(`capability_skill_profiles?capability_slug=eq.${CAPABILITY}&select=skill_profile_slug`);
  const linked = new Set(links.map(l => l.skill_profile_slug));
  for (const slug of RS_HOMES) {
    assert.ok(linked.has(slug),
      `${slug} is not linked to ${CAPABILITY} -- the runbook points a retired rule at a home the ` +
      "assembled prompt would never read, which is a deletion wearing a pointer's clothes");
  }
  const cap = (await rest(`capabilities?slug=eq.${CAPABILITY}&select=default_intent_slug`))[0];
  assert.ok(cap, `no capabilities row for ${CAPABILITY}`);
  assert.equal(cap.default_intent_slug, INTENT_SLUG,
    "the capability's default_intent_slug must be the research Intent -- step 4b tells a cycle it " +
    "MAY omit --intent, and that instruction is only safe while this row answers");
  console.log(`  (d) LIVE: ${RS_HOMES.length} rs-* Skills linked to ${CAPABILITY}, default intent ` +
    `${cap.default_intent_slug} -- PASS`);
}

selfRun(import.meta.url, run);
