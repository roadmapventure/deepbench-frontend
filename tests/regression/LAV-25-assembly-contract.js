// DeepBench v7.0.59 | tests/regression/LAV-25-assembly-contract.js | LAV-25 -- the Assembly Content
// Contract's client slice (ARCHITECTURE.md §19s), asserted against the REAL buildAssemblyStages.
//
// SES-69 discipline: nothing here re-implements the fold. The module under test is imported for
// real, so a stubbed or reverted implementation fails this file rather than passing it. Plain Node
// cannot import a .jsx file, so AssemblyView.jsx is compiled by esbuild (already installed -- it is
// what `npm run build` runs under Vite) and the compiled module is imported. Only src/lib/supabase.js
// is stubbed, and only because it constructs a real client at module scope from Vite env vars that
// no test process has; the fold reads no Supabase and reaches none of it (§19s: stream frames only).
//
// Frame shapes are the run captured in docs/harvests/LAV-25.md (2026-08-04, dev cc189ce), built the
// way useHarnessStream.js's buildHopEvent builds them: { type, agentId, data, durationMs,
// secondaryAgentId? }.
//
// MUTATION (SES-69, stated so it can be re-run): delete the two `library-*-intent` entries from
// AssemblyView.jsx's STAGE_OF_INTENT and test 1 must FAIL -- Eleanor's evidence falls back to an
// unlabelled ghost, and a ghost is dropped at terminal, taking her real 74+10-chunk fetches with it.
// That is the exact regression this file exists to hold.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import esbuild from "esbuild";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE = path.join(REPO_ROOT, "src/components/AssemblyView.jsx");

// src/lib/supabase.js calls createClient() at module scope; AssemblyView pulls it in transitively
// (RunTasks.jsx -> HarnessTraceConsole.jsx -> useAIActivity.js). Stubbing it keeps this test offline
// and env-free. Every module that carries logic under test is compiled and run for real.
const stubSupabase = {
  name: "lav25-stub-supabase",
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])lib[\\/]supabase\.js$/ }, () => ({
      path: "lav25-stub-supabase", namespace: "lav25-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "lav25-stub" }, () => ({
      contents: "export const supabase = {};", loader: "js",
    }));
  },
};

async function loadAssemblyView() {
  // Compiled INTO the tree so the bundle's own `react` import resolves the same react the app uses.
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, "node_modules", ".lav25-"));
  const outfile = path.join(dir, "assembly-view.mjs");
  try {
    await esbuild.build({
      entryPoints: [SOURCE],
      bundle: true, format: "esm", platform: "node", outfile,
      loader: { ".js": "jsx", ".jsx": "jsx" },
      plugins: [stubSupabase],
      logLevel: "silent",
    });
    return await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── the harvest run's frames, in its own arrival order ────────────────────────
const hop = (type, agentId, data, extra = {}) => ({ type, agentId, data, durationMs: 1000, ...extra });

const AGENTS = [
  { id: "marcus", name: "Marcus Webb", role: "Channel Intelligence Analyst" },
  { id: "michelle", name: "Michelle Manning", role: "Project Manager" },
  { id: "eleanor", name: "Eleanor Voss", role: "The Librarian" },
  { id: "owen", name: "Owen Marsh", role: "The Proofreader" },
];

const times = (n) => Array.from({ length: n }, (_, i) => 1000 * (i + 1));
const fold = (mod, events, opts) =>
  mod.buildAssemblyStages(events, times(events.length),
    { runStartedAt: 1000, agents: AGENTS, ...opts });

export default async function run() {
  const mod = await loadAssemblyView();
  const {
    buildAssemblyStages,
    ASSEMBLY_TERMINAL_ANSWERED_TEXT, ASSEMBLY_TERMINAL_BLOCKED_TEXT, ASSEMBLY_TERMINAL_ERROR_TEXT,
  } = mod;
  assert.strictEqual(typeof buildAssemblyStages, "function",
    "the REAL buildAssemblyStages must be importable -- this suite asserts on it, never on a copy");

  // ── 1. Evidence survives terminal (the vanishing-ghost regression) ──────────────────────────
  // Run 4's real shape: Michelle delegates library-evidence-intent to Eleanor, Eleanor's catalog+
  // library fetches hang under that span, and the delegation resolves. Before LAV-25 the start
  // opened an UNLABELLED ghost (the slug was absent from STAGE_OF_INTENT), so at terminal the ghost
  // was dropped and the run's only real evidence disappeared from the finished document.
  {
    const events = [
      hop("delegation", "michelle",
        { viaTool: "delegate_to_agent", toIntentSlug: "library-evidence-intent",
          toCapabilitySlug: "the-library", span_id: "span-ev", message: "Michelle is routing to Eleanor" },
        { secondaryAgentId: "eleanor" }),
      hop("assembly_work_complete", "eleanor",
        { work: "fetch", source: "the_library_catalog", matchCount: 74, parent_span_id: "span-ev" }),
      hop("assembly_work_complete", "eleanor",
        { work: "fetch", source: "the_library", matchCount: 10, parent_span_id: "span-ev" }),
      hop("delegation_complete", "eleanor",
        { viaTool: "delegate_to_agent", toIntentSlug: "library-evidence-intent",
          span_id: "span-ev", message: "Eleanor is back — wrapping up…" }),
    ];
    const { sections } = fold(mod, events, { running: false, terminal: true });
    assert.strictEqual(sections.length, 1,
      `an Evidence stage must survive terminal, got ${sections.length} sections`);
    const [evidence] = sections;
    assert.strictEqual(evidence.stage, "evidence",
      `Eleanor's library-evidence-intent must land in the Evidence stage, got ${evidence.stage}`);
    assert.strictEqual(evidence.ghost, false, "a resolved delegation is not a ghost at terminal");
    assert.strictEqual(evidence.filled, true, "the completion must fill the Evidence stage");
    assert.strictEqual(evidence.agentId, "eleanor",
      "the Evidence stage is credited to the agent whose completion filled it");
    assert.strictEqual(evidence.subEntries.length, 2,
      `both Library fetches must survive under it, got ${evidence.subEntries.length}`);
  }

  // 1b. Record verification: the second new slug maps to Verification, not to a ghost.
  {
    const events = [
      hop("delegation", "michelle",
        { viaTool: "delegate_to_agent", toIntentSlug: "library-record-lookup-intent", span_id: "span-rec" },
        { secondaryAgentId: "eleanor" }),
      hop("delegation_complete", "eleanor",
        { viaTool: "delegate_to_agent", toIntentSlug: "library-record-lookup-intent",
          span_id: "span-rec", message: "Eleanor is back — wrapping up…" }),
    ];
    const { sections } = fold(mod, events, { running: false, terminal: true });
    assert.strictEqual(sections.length, 1, "record verification must survive terminal too");
    assert.strictEqual(sections[0].stage, "verification",
      `library-record-lookup-intent must map to Verification, got ${sections[0].stage}`);
  }

  // ── 2. Briefing fetches are excluded entirely ───────────────────────────────────────────────
  // roster/knowledge are the prompt-assembly briefing (§19s: internal, not deliverable work). Before
  // LAV-25 the first one FOUNDED the Evidence stage, so terminal "Evidence" credited plumbing.
  {
    const events = [
      hop("assembly_work_complete", "michelle", { work: "fetch", source: "roster", matchCount: 22 }),
      hop("assembly_work_complete", "michelle", { work: "fetch", source: "knowledge", matchCount: 4 }),
    ];
    for (const terminal of [false, true]) {
      const { sections } = fold(mod, events, { running: !terminal, terminal });
      assert.strictEqual(sections.length, 0,
        `briefing fetches must build no section (terminal=${terminal}), got ${sections.length}`);
    }
    // ...and they found no Evidence stage even when a real Library fetch follows them: the Library
    // fetch founds it, and the briefing pair is nowhere -- not as a section, not as a sub-entry.
    const mixed = [...events,
      hop("assembly_work_complete", "eleanor", { work: "fetch", source: "the_library", matchCount: 10 })];
    const { sections } = fold(mod, mixed, { running: false, terminal: true });
    assert.strictEqual(sections.length, 1, "the Library fetch alone founds Evidence");
    assert.strictEqual(sections[0].stage, "evidence");
    assert.strictEqual(sections[0].subEntries.length, 0,
      "no briefing fetch may nest under the Evidence stage as a sub-entry either");
    assert.ok(/the_library|10 chunk/.test(String(sections[0].did || "")),
      `the founding line must be the Library fetch's own, got ${sections[0].did}`);
  }

  // ── 3. A revision round nests under the filled Draft, never as a second Draft ────────────────
  {
    const base = [
      hop("delegation", "michelle",
        { viaTool: "delegate_to_agent", toIntentSlug: "ci-answer-intent", span_id: "span-d1" },
        { secondaryAgentId: "marcus" }),
      hop("delegation_complete", "marcus",
        { viaTool: "delegate_to_agent", toIntentSlug: "ci-answer-intent",
          span_id: "span-d1", message: "Marcus is back — wrapping up…" }),
      hop("delegation", "owen",
        { viaTool: "delegate_to_agent", toIntentSlug: "qg-review-intent", span_id: "span-v1" },
        { secondaryAgentId: "owen" }),
    ];
    const before = fold(mod, base, { running: true, terminal: false });
    const revision = hop("delegation", "owen",
      { viaTool: "delegate_to_agent", toIntentSlug: "ci-answer-intent", span_id: "span-d2",
        task: "Rework the draft so every cited record carries its own tier." },
      { secondaryAgentId: "marcus" });
    const after = fold(mod, [...base, revision], { running: true, terminal: false });

    assert.strictEqual(after.sections.length, before.sections.length,
      `a revision delegation must not change the section count (${before.sections.length} -> ${after.sections.length})`);
    assert.strictEqual(after.sections.filter(s => s.stage === "draft").length, 1,
      "there must be exactly one Draft section during a revision round");
    const draft = after.sections.find(s => s.stage === "draft");
    assert.strictEqual(draft.filled, true, "the Draft stays filled through the revision round");
    assert.strictEqual(draft.subEntries.length, 1,
      `the revision must land as a sub-entry under the filled Draft, got ${draft.subEntries.length}`);
    const [sub] = draft.subEntries;
    assert.strictEqual(sub.asked, "Rework the draft so every cited record carries its own tier.",
      `the hand-back's own task words must render on the sub-entry, got ${sub.asked}`);
    assert.strictEqual(sub.agentId, "marcus", "the sub-entry names the worker the round was handed to");
    assert.strictEqual(sub.did, null,
      "an unresolved revision round carries no completion line -- nothing is invented for it");

    // Unresolved at terminal, the sub-entry stays: it names real work, not a prediction.
    const atTerminal = fold(mod, [...base, revision], { running: false, terminal: true });
    const terminalDraft = atTerminal.sections.find(s => s.stage === "draft");
    assert.strictEqual(atTerminal.sections.filter(s => s.stage === "draft").length, 1,
      "still exactly one Draft section at terminal");
    assert.strictEqual(terminalDraft.subEntries.length, 1,
      "the revision sub-entry survives terminal -- it is real work, not a dropped ghost");
  }

  // ── 4. The terminal cap tells the truth about the run's end state ────────────────────────────
  // Discriminating by construction: each string must appear ONLY under its own state, so a cap
  // hardcoded to any single string fails at least two of these four assertions.
  {
    const t = (opts) => fold(mod, [], { running: false, terminal: true, ...opts }).terminalText;
    assert.strictEqual(t({}), ASSEMBLY_TERMINAL_ANSWERED_TEXT,
      "a plain run reads as answered");
    assert.strictEqual(t({ blocked: true }), ASSEMBLY_TERMINAL_BLOCKED_TEXT,
      "a gate-blocked run must NOT read 'build complete'");
    assert.strictEqual(t({ error: true }), ASSEMBLY_TERMINAL_ERROR_TEXT,
      "an errored run must NOT read 'build complete'");
    assert.strictEqual(t({ blocked: true, error: true }), ASSEMBLY_TERMINAL_ERROR_TEXT,
      "an error is how the run ENDED, so it wins over an earlier block");
    const all = [ASSEMBLY_TERMINAL_ANSWERED_TEXT, ASSEMBLY_TERMINAL_BLOCKED_TEXT, ASSEMBLY_TERMINAL_ERROR_TEXT];
    assert.strictEqual(new Set(all).size, 3, "the three caps must be three distinct strings");
    // John's locked wording, 2026-08-04 -- verbatim, never re-worded without him.
    assert.strictEqual(ASSEMBLY_TERMINAL_ANSWERED_TEXT, "Build complete — answer delivered");
    assert.strictEqual(ASSEMBLY_TERMINAL_BLOCKED_TEXT, "Build stopped — the reviewer blocked the draft");
    assert.strictEqual(ASSEMBLY_TERMINAL_ERROR_TEXT, "Build stopped — the run hit an error");
  }

  // ── 5. Narration renders when present, the template line when not ───────────────────────────
  // Both directions asserted, so a change that always renders one of them fails.
  {
    const message = "Marcus is back — wrapping up…";
    const account = "I drafted the answer from four sourced records and flagged the weakest one.";
    const completion = (extra) => [hop("delegation_complete", "marcus",
      { viaTool: "delegate_to_agent", toIntentSlug: "ci-answer-intent", span_id: "span-d1", message, ...extra })];

    const withAccount = fold(mod, completion({ account }), { running: false, terminal: true });
    assert.strictEqual(withAccount.sections[0].did, account,
      "an agent's own account renders as the content line, verbatim");

    const without = fold(mod, completion({}), { running: false, terminal: true });
    assert.strictEqual(without.sections[0].did, message,
      `absent an account the derived template line renders unchanged, got ${without.sections[0].did}`);

    // Same substitution on a sub-entry (a fetch), so the contract is not section-only.
    const fetchFrames = (extra) => [hop("assembly_work_complete", "eleanor",
      { work: "fetch", source: "the_library", matchCount: 10, ...extra })];
    const fetchAccount = "I pulled the ten passages that actually speak to the question.";
    const subWith = fold(mod, fetchFrames({ account: fetchAccount }), { running: false, terminal: true });
    assert.strictEqual(subWith.sections[0].did, fetchAccount,
      "a fetch frame's account replaces its template line too");
    const subWithout = fold(mod, fetchFrames({}), { running: false, terminal: true });
    assert.strictEqual(subWithout.sections[0].did, "Fetched 10 chunks from the_library.",
      `absent an account the fetch's template line is unchanged, got ${subWithout.sections[0].did}`);
    assert.notStrictEqual(subWith.sections[0].did, subWithout.sections[0].did,
      "present vs absent must produce different lines -- otherwise this assertion proves nothing");
  }

  return "LAV-25 assembly content contract: 5/5 groups PASS";
}

selfRun(import.meta.url, run);
