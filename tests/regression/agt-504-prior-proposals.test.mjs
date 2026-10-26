// DeepBench v7.0.899 | tests/regression/agt-504-prior-proposals.test.mjs | AGT-504 -- the research
// turn reads its lane's prior proposals. Kickoff: docs/kickoffs/v7.0.899-AGT-504-prior-proposals.md.
//
// THE DEFECT, measured on tree 9d505e4 rather than reasoned about: `scripts/agent-prompt.js` carried
// ZERO hits for `audit_findings`, and the method command in `docs/runbooks/researcher-routine.md`
// passed `{lens, allowed, census, corpus}` only -- so nothing on the assembly path could see that
// `audit_findings` cf3d80b5 (`found_by` = researcher:weekly-market, `ticketed`, filed as `AGT-323`)
// already held the 2026-10-17 proposal. The pass proposed it again.
//
// FOUR ARMS, each discriminating, and arms A/B/D are RED on the unchanged tree (parseArgs returns
// `unrecognized flag "--prior-proposals"`; attachPriorProposals is not exported; neither document
// holds the text), which was confirmed against `origin/dev` before this file was written:
//   A  FLAG    -- parseArgs TAKES `--prior-proposals=<v>` and REFUSES the valueless and empty forms
//                 by the message that names the flag, never by "it errored" (the LOO-013 lesson).
//                 The control is the omitted flag: it must stay undefined, because a default would
//                 make every unasked run read the board.
//   B  SEAM    -- a stub `fetchImpl` drives the real attachPriorProposals, so this arm ALWAYS runs
//                 (STANDARDS.md Section 4's labelled third option). The URL is asserted to carry
//                 both filters, the rows are asserted to land at `prior_proposals` with the
//                 caller's other keys intact, and `ok:false` is asserted to THROW -- never to
//                 return `[]`, which is the shape that would silently license the duplicate. The
//                 non-array body is the second throw case: a 200 that is not a list is not an
//                 empty board either.
//   C  LIVE    -- the real read, and the two live Skill rows the agent is assembled from; notRun
//                 without credentials rather than a quiet pass.
//   D  DOCS    -- the runbook's command holds the flag line, and the seed + the applied-SQL mirror
//                 hold both texts, so the written record cannot drift from the rows.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { parseArgs, attachPriorProposals } from "../../scripts/agent-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RUNBOOK = path.join(ROOT, "docs/runbooks/researcher-routine.md");
const SEED = path.join(ROOT, "docs/design/ga-agents-seed.sql");
const APPLIED_SQL = path.join(ROOT, "docs/design/agt-504-prior-proposals.sql");

const LANE = "researcher:weekly-market";
const BASE = ["--agent=researcher", "--capability=research-class-lens"];

// The two texts AGT-504 §4 fixes. Asserted against the live rows AND the written record, so neither
// side can move alone.
const METHOD_SENTENCE =
  " It may also carry prior_proposals: this lane's earlier audit_findings proposals, each with"
  + " status and filed_backlog_id. A candidate matching a prior_proposals row is already on the"
  + " board: drop it from survivors and name that row's filed_backlog_id in findings.";
const MUST_NOT_ITEM =
  "return a survivor matching a prior_proposals row — drop it and name its filed_backlog_id";

// The live row the premise rests on (kickoff §2), named here so arm C fails loudly if it moves
// rather than passing against whatever happens to be on the board.
const LIVE_ID_PREFIX = "cf3d80b5";
const LIVE_STATUS = "ticketed";
const LIVE_TICKET = "AGT-323";

const hasCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

// A minimal Response stand-in: only `ok`, `status` and `json()` are touched by the function.
const stubFetch = (body, { ok = true, status = 200 } = {}) => {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return { ok, status, json: async () => body };
  };
  impl.calls = calls;
  return impl;
};

export default async function run() {
  const fails = [];
  const arm = (name, fn) => {
    try { return fn(); } catch (e) { fails.push(`${name}: ${e.message}`); return undefined; }
  };
  const armAsync = async (name, fn) => {
    try { return await fn(); } catch (e) { fails.push(`${name}: ${e.message}`); return undefined; }
  };

  // --- A: the flag ----------------------------------------------------------------------------
  arm("A takes the flag", () => {
    const got = parseArgs([...BASE, `--prior-proposals=${LANE}`]);
    assert.equal(got.error, undefined, `parseArgs refused the flag: ${got.error}`);
    assert.equal(got.priorProposals, LANE, "the lane must reach the caller verbatim");
  });

  arm("A refuses the empty value", () => {
    const empty = parseArgs([...BASE, "--prior-proposals="]);
    assert.equal(empty.error, "--prior-proposals=<found_by> needs a value",
      `the refusal must name the flag and what it wants, got ${JSON.stringify(empty.error)}`);
    const bare = parseArgs([...BASE, "--prior-proposals"]);
    assert.equal(bare.error, "--prior-proposals=<found_by> needs a value",
      `a valueless flag must be refused for want of a lane, got ${JSON.stringify(bare.error)}`);
  });

  // The control. A default here would make every run that never asked read the board.
  arm("A omitted stays omitted", () => {
    const none = parseArgs([...BASE]);
    assert.equal(none.error, undefined, `the flag must stay optional, got ${none.error}`);
    assert.equal(none.priorProposals, undefined,
      `no flag must mean no lane, got ${JSON.stringify(none.priorProposals)}`);
  });

  // --- B: the read, on a stub, so this arm always runs ----------------------------------------
  const rows = [{ id: "cf3d80b5-0000-0000-0000-000000000000", iso_week: "2026-W40",
                  status: LIVE_STATUS, filed_backlog_id: LIVE_TICKET,
                  governing_fact: "stub", locations: [] }];

  await armAsync("B url and shape", async () => {
    const impl = stubFetch(rows);
    const out = await attachPriorProposals({ lens: "P3 - Investor Value", allowed: 1 }, {
      foundBy: LANE, supabaseUrl: "https://example.supabase.co/", headers: { apikey: "k" }, fetchImpl: impl,
    });
    assert.equal(impl.calls.length, 1, `exactly one read, got ${impl.calls.length}`);
    const url = impl.calls[0].url;
    assert.ok(url.includes("/rest/v1/audit_findings?"), `the read must hit audit_findings: ${url}`);
    assert.ok(url.includes("finding_type=eq.proposal"),
      `the proposal filter is the whole filter -- defect/gap rows are a different conversation: ${url}`);
    assert.ok(url.includes("found_by=eq.researcher%3Aweekly-market"),
      `the read must key on the found_by VALUE, encoded, never on a slug: ${url}`);
    assert.ok(!url.includes("//rest/v1"), `the trailing slash must be trimmed, not doubled: ${url}`);

    assert.deepEqual(out.prior_proposals, rows, "the rows must land at task_context.prior_proposals");
    assert.equal(out.lens, "P3 - Investor Value", "the caller's other keys must survive");
    assert.equal(out.allowed, 1, "the caller's other keys must survive");
  });

  await armAsync("B a failed read throws", async () => {
    await assert.rejects(
      () => attachPriorProposals({}, { foundBy: LANE, supabaseUrl: "https://example.supabase.co",
        headers: {}, fetchImpl: stubFetch(null, { ok: false, status: 503 }) }),
      /audit_findings read failed: HTTP 503/,
      "a non-ok read must THROW -- `[]` would read as `nothing has been proposed before`");
    // A 200 whose body is not a list is not an empty board either.
    await assert.rejects(
      () => attachPriorProposals({}, { foundBy: LANE, supabaseUrl: "https://example.supabase.co",
        headers: {}, fetchImpl: stubFetch({ message: "nope" }) }),
      /audit_findings read failed: HTTP 200/,
      "a non-array body must throw rather than becoming an empty prior_proposals");
  });

  // --- C: live --------------------------------------------------------------------------------
  if (!hasCreds) {
    notRun("agt-504 arm C (live audit_findings read and the two live Skill rows)",
      "set SUPABASE_URL and SUPABASE_SERVICE_KEY (runner_secrets, exported inline) and re-run: "
      + "node --env-file-if-exists=.env.local tests/regression/run-all.js --only=agt-504-prior-proposals.test.mjs");
  } else {
    const key = process.env.SUPABASE_SERVICE_KEY;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    await armAsync("C live read", async () => {
      const out = await attachPriorProposals({ lens: "P3 - Investor Value" }, {
        foundBy: LANE, supabaseUrl: process.env.SUPABASE_URL, headers,
      });
      assert.ok(Array.isArray(out.prior_proposals), "the live read must return an array");
      const hit = out.prior_proposals.find(r => String(r.id).startsWith(LIVE_ID_PREFIX));
      assert.ok(hit, `the live board must still hold ${LIVE_ID_PREFIX}… -- the premise of this ticket `
        + `(got ids ${out.prior_proposals.map(r => String(r.id).slice(0, 8)).join(", ") || "none"})`);
      assert.equal(hit.status, LIVE_STATUS, `${LIVE_ID_PREFIX}… status`);
      assert.equal(hit.filed_backlog_id, LIVE_TICKET,
        `${LIVE_ID_PREFIX}… must name the ticket the agent is to cite instead of re-proposing`);
    });

    await armAsync("C live Skill rows", async () => {
      const r = await fetch(`${String(process.env.SUPABASE_URL).replace(/\/+$/, "")}`
        + "/rest/v1/skill_profiles?select=slug,method,guardrails"
        + "&slug=in.(rs-research-intent,rs-guardrails)", { headers });
      assert.ok(r.ok, `skill_profiles read failed: HTTP ${r.status}`);
      const live = await r.json();
      const intent = live.find(x => x.slug === "rs-research-intent");
      const guards = live.find(x => x.slug === "rs-guardrails");
      assert.ok(intent && guards, "both Skill rows must be readable");
      assert.ok(intent.method.endsWith(METHOD_SENTENCE),
        "rs-research-intent.method must END with AGT-504's sentence -- a key the Intent never names "
        + "is a key the model may read past");
      const mustNot = guards.guardrails?.must_not || [];
      assert.ok(mustNot.includes(MUST_NOT_ITEM),
        `rs-guardrails.must_not must hold AGT-504's item (got ${mustNot.length} items)`);
      assert.equal(mustNot.length, 6, `rs-guardrails.must_not holds ${mustNot.length} items (expected 6)`);
    });
  }

  // --- D: the written record ------------------------------------------------------------------
  arm("D runbook", () => {
    const text = fs.readFileSync(RUNBOOK, "utf8");
    assert.ok(text.includes(`  --prior-proposals=${LANE} \\\n`),
      "the method command in docs/runbooks/researcher-routine.md must pass the flag, continued onto "
      + "the --task= line -- the routine is the only home of the research method");
    assert.ok(/--prior-proposals=[^\n]*\n\s*--task=/.test(text),
      "the flag line must sit immediately before --task=");
  });

  arm("D seed and mirror", () => {
    const seed = fs.readFileSync(SEED, "utf8");
    // The seed stores SQL text, so the apostrophes are doubled there.
    assert.ok(seed.includes(METHOD_SENTENCE.split("'").join("''")),
      "docs/design/ga-agents-seed.sql must carry the method sentence (SQL-escaped) -- the seed is the "
      + "mirror of the live row, and a seed that lags re-seeds the old text");
    assert.ok(seed.includes(MUST_NOT_ITEM),
      "docs/design/ga-agents-seed.sql must carry the must_not item");
    const applied = fs.readFileSync(APPLIED_SQL, "utf8");
    assert.ok(applied.includes(METHOD_SENTENCE) && applied.includes(MUST_NOT_ITEM),
      "docs/design/agt-504-prior-proposals.sql is the mirror of what was applied -- it must hold "
      + "both texts verbatim");
  });

  if (fails.length) throw new Error(fails.join(" | "));
}

selfRun(import.meta.url, run);
