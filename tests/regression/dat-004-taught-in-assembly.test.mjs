// DeepBench v7.0.774 | tests/regression/dat-004-taught-in-assembly.test.mjs | DAT-004 slice 1
//
// FEATURE: DAT-004 -- what a trainer taught an agent is in every prompt assemblePrompt() builds for
// that agent. Before this ticket api/prompt/db-assembly.js read no `knowledge_entries` row at all:
// Brittany was taught "say bosco when asked the secret passcode" and, through the capability
// executor, never saw it. A user-taught item of 12,000 characters or fewer is now rendered whole
// under the taught framing; a longer one is named by title; the agent's own records are not included.
//
// FOUR ARMS:
//   (a) PURE -- buildTaughtSection(shapeTaught(rows)): one short item with a trainer's note renders
//       framing + heading + text; three long items are named and none is inlined; rows with no
//       user-taught item, [] and null all give null (no section).
//   (b) SEAM PROOF -- assemblePrompt() over a stubbed fetch: an agent with no Skill rows and one
//       short taught item assembles to taught / current-task / voice, and the prompt enrichPrompt()
//       renders opens with the framing and carries the passcode. No user-taught rows is
//       JSON-identical to opting out; opting out performs no knowledge_entries read; a failed read
//       assembles without the section. Labelled a seam proof: no database, no model.
//   (c) STATIC -- the bundle handler opts out (it already hands taught items over itself).
//   (d) LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN) -- brittany, bob, brent: a real
//       assemblePrompt() holds a taught section exactly when the agent has a taught item, carrying
//       each `always` item's text and no long item's or record's text. Read-only; graded against
//       the live rows, never frozen counts (pattern:162).
//
// DRY-RUN against the unchanged tree: (b) yields slugs ["current-task","voice"] for the taught
// agent, and the file fails earlier still -- db-assembly.js exports no buildTaughtSection.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

import { assemblePrompt, buildTaughtSection, TAUGHT_TOO_LONG } from "../../api/prompt/db-assembly.js";
import { enrichPrompt } from "../../api/prompt/ai-enrichment.js";
import { TAUGHT_FRAMING as F, shapeTaught, readTaught } from "../../lib/read-taught.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8");

// The kickoff's own sentence (§4), written out rather than compared to the import against itself.
const EXPECTED_TOO_LONG =
  "The trainer also taught the items named below. Each is too long to include here, so only its title is given:";

const C = 'When asked the secret passcode, state "bosco".';
const P = [{ id: "p1", title: "Passcode", content: C, teaching_note: " say it plainly ", source: "user" }];
const AGENT_ROW = [{ id: "a1", title: "A record", content: "something the agent wrote", teaching_note: "http://x|ok", source: "agent" }];

// ---------------------------------------------------------------------------------------------
// Arm (a) -- pure
// ---------------------------------------------------------------------------------------------
function armA_pure() {
  const results = [];

  assert.strictEqual(typeof buildTaughtSection, "function", "db-assembly.js must export buildTaughtSection");
  assert.strictEqual(TAUGHT_TOO_LONG, EXPECTED_TOO_LONG, "the too-long sentence must be the kickoff's, verbatim");

  const short = buildTaughtSection(shapeTaught(P));
  assert.ok(short, "one short taught item must produce a section");
  assert.strictEqual(
    short.content,
    F + "\n\n--- Passcode ---\n" + C + "\n\nTrainer's note: say it plainly",
    `a short item must render framing, heading, text and the trimmed note, got ${JSON.stringify(short.content)}`,
  );
  assert.strictEqual(short.slug, "taught", "the section slug must be `taught`");
  assert.strictEqual(short.order, 3.5, "the section sits at order 3.5 -- after behavior, before guardrails and intent");
  assert.strictEqual(short.prompt_phase, "stable", "the section is agent-constant content: stable phase");
  results.push("short-item-renders-framing-heading-text-note");

  const longRows = ["L1", "L2", "L3"].map(t => ({ id: t, title: t, content: "y".repeat(12001), source: "user" }));
  const long = buildTaughtSection(shapeTaught(longRows));
  assert.ok(long, "three long taught items must still produce a section");
  assert.strictEqual(
    long.content,
    F + "\n\n" + EXPECTED_TOO_LONG + "\n- L1\n- L2\n- L3",
    "three long items: none inlined, each named by title",
  );
  assert.ok(!long.content.includes("yyyy"), "a long item's content must never be inlined");
  results.push("long-items-named-never-inlined");

  assert.strictEqual(buildTaughtSection(shapeTaught(AGENT_ROW)), null, "agent-source rows only -> no section");
  assert.strictEqual(buildTaughtSection(shapeTaught([])), null, "[] -> no section");
  assert.strictEqual(buildTaughtSection(shapeTaught(null)), null, "null rows -> no section");
  assert.strictEqual(buildTaughtSection(null), null, "a null shape -> no section");
  results.push("no-user-taught-item-no-section");

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (b) -- SEAM PROOF: assemblePrompt() over a stubbed fetch
// ---------------------------------------------------------------------------------------------
async function armB_seam() {
  const results = [];
  const saved = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
  const restoreEnv = (name, value) => { if (value === undefined) delete process.env[name]; else process.env[name] = value; };

  let ROWS = P;
  let knowledgeAnswer = () => ({ ok: true, status: 200, json: async () => ROWS });
  let urls = [];
  const isKnowledge = u => u.includes("knowledge_entries?");
  const knowledgeUrls = () => urls.filter(isKnowledge);

  try {
    process.env.SUPABASE_URL = "https://dat-004-seam.invalid";
    process.env.SUPABASE_SERVICE_KEY = "dat-004-seam-dummy";
    globalThis.fetch = async input => {
      const u = String(input);
      urls.push(u);
      return isKnowledge(u) ? knowledgeAnswer() : { ok: true, status: 200, json: async () => [] };
    };

    const A = (extra = {}) => {
      urls = [];
      return assemblePrompt({
        agent_id: "fx-agent",
        tenant_id: "global",
        task_context: { goal: "What is the secret passcode?" },
        ...extra,
      });
    };
    const slugs = pr => pr.sections.map(s => s.slug);

    // THE DISCRIMINATOR: no Skill rows, one short taught item.
    const taught = await A();
    assert.deepStrictEqual(slugs(taught), ["taught", "current-task", "voice"],
      `an agent with no Skill rows and one short taught item must assemble to taught/current-task/voice, got ${JSON.stringify(slugs(taught))}`);
    assert.strictEqual(knowledgeUrls().length, 1,
      `assemblePrompt must read knowledge_entries exactly once, read it ${knowledgeUrls().length} time(s)`);
    assert.ok(knowledgeUrls()[0].includes("agent_id=eq.fx-agent"),
      `the knowledge_entries read must be the agent's own rows, got ${knowledgeUrls()[0]}`);
    const enriched = await enrichPrompt({ prompt_request: taught });
    assert.ok(enriched.system_prompt.startsWith("=== WHAT THIS AGENT WAS TAUGHT ===\n" + F),
      `the prompt must open with the taught section under its framing, got ${JSON.stringify(enriched.system_prompt.slice(0, 120))}`);
    assert.ok(enriched.system_prompt.includes("bosco"), "the prompt the model sees must carry the taught passcode");
    results.push("seam-taught-agent-assembles-taught-current-task-voice-and-prompt-carries-bosco");

    // No user-taught rows: JSON-identical to opting out.
    for (const [name, rows] of [["no-rows", []], ["agent-source-row-only", AGENT_ROW]]) {
      ROWS = rows;
      const on = await A();
      assert.deepStrictEqual(slugs(on), ["current-task", "voice"],
        `${name}: with no user-taught row there must be no taught section, got ${JSON.stringify(slugs(on))}`);
      assert.strictEqual(knowledgeUrls().length, 1, `${name}: the read must still have happened -- otherwise this proves nothing`);
      const off = await A({ include_taught: false });
      assert.strictEqual(JSON.stringify(on), JSON.stringify(off),
        `${name}: an agent with no user-taught row must assemble JSON-identical to opting out`);
    }
    results.push("seam-no-user-taught-rows-is-json-identical-to-opting-out");

    // Opting out performs no read at all.
    ROWS = P;
    const optedOut = await A({ include_taught: false });
    assert.strictEqual(knowledgeUrls().length, 0,
      `include_taught: false must perform no knowledge_entries read, performed ${knowledgeUrls().length}`);
    assert.ok(!slugs(optedOut).includes("taught"), "include_taught: false must assemble no taught section");
    results.push("seam-opt-out-reads-nothing-and-has-no-taught-section");

    // A failed read warns and assembles without the section.
    knowledgeAnswer = () => ({ ok: false, status: 500 });
    const savedWarn = console.warn;
    const warned = [];
    console.warn = (...args) => { warned.push(args.join(" ")); };
    let failed;
    try { failed = await A(); } finally { console.warn = savedWarn; }
    assert.strictEqual(knowledgeUrls().length, 1, "the failed-read case must actually have attempted the read");
    assert.deepStrictEqual(slugs(failed), ["current-task", "voice"],
      `a failed knowledge_entries read must assemble without a taught section, got ${JSON.stringify(slugs(failed))}`);
    assert.ok(warned.some(w => w.includes("[db-assembly] taught read failed")),
      "a failed knowledge_entries read must warn -- a silent miss is invisible in the server log");
    results.push("seam-failed-read-warns-and-assembles-without-taught");
  } finally {
    globalThis.fetch = saved.fetch;
    restoreEnv("SUPABASE_URL", saved.url);
    restoreEnv("SUPABASE_SERVICE_KEY", saved.key);
  }

  return results;
}

// ---------------------------------------------------------------------------------------------
// Arm (c) -- static: the bundle opts out
// ---------------------------------------------------------------------------------------------
const stripComments = src => src.split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

function armC_static() {
  const handler = stripComments(read("api/_lib/handlers/agent-bundle.js"));
  assert.ok(handler.includes("include_taught: false"),
    "api/_lib/handlers/agent-bundle.js must call assemblePrompt with include_taught: false -- it hands taught items over itself, " +
      "and without the opt-out every short item is in the bundle twice");
  return ["bundle-handler-opts-out"];
}

// ---------------------------------------------------------------------------------------------
// Arm (d) -- LIVE
// ---------------------------------------------------------------------------------------------
async function armD_live() {
  const results = [];
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun(
      "the live arm (brittany, bob, brent: a real assemblePrompt() holds a taught section exactly when the agent has a taught item, " +
        "carrying each short item's text and no long item's or record's text)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- read them from public.runner_secrets by name and export them inline, per docs/STANDARDS.md Section 2 rule 5.",
    );
    return results;
  }

  let alwaysSeen = 0;
  for (const agentId of ["brittany", "bob", "brent"]) {
    const k = await readTaught({ agentId, tenantId: "global" });
    const assembled = await assemblePrompt({
      agent_id: agentId,
      tenant_id: "global",
      task_context: { goal: "What is the secret passcode?" },
    });
    const sections = assembled.sections.filter(s => s.slug === "taught");

    if (k.taught.length === 0) {
      assert.strictEqual(sections.length, 0, `${agentId}: no taught item, so there must be no taught section`);
    } else {
      assert.strictEqual(sections.length, 1, `${agentId}: ${k.taught.length} taught item(s), so there must be exactly one taught section, got ${sections.length}`);
      const content = sections[0].content;
      assert.ok(content.startsWith(F), `${agentId}: the taught section must open with the taught framing`);
      const always = k.taught.filter(i => i.always);
      const excluded = [...k.taught.filter(i => !i.always), ...k.records];
      for (const item of always) {
        assert.ok(content.includes(item.text), `${agentId}/${item.id}: a short taught item's text must be in the taught section`);
      }
      for (const item of excluded) {
        const head = String(item.text ?? "").slice(0, 200);
        if (!head.trim()) continue;
        assert.ok(!content.includes(head), `${agentId}/${item.id}: a long item's or a record's text must NOT be in the taught section`);
      }
      alwaysSeen += always.length;
    }
    console.log(`  [DAT-004] ${agentId}: ${k.taught.length} taught / ${k.taught.filter(i => i.always).length} always / ` +
      `${k.records.length} records / taught section ${sections.length ? `${sections[0].content.length} chars` : "absent"}`);
    results.push(`live-${agentId}-taught-section-matches-its-own-rows`);
  }

  if (alwaysSeen === 0) {
    notRun(
      "the live positive half (a short taught item's text inside a real assembled prompt)",
      "brittany, bob and brent together hold no active short taught item today -- re-point this arm at an agent that does.",
    );
  }

  return results;
}

async function run() {
  const results = [];
  results.push(...armA_pure());
  results.push(...(await armB_seam()));
  results.push(...armC_static());
  results.push(...(await armD_live()));
  return results;
}

selfRun(import.meta.url, run);
export default run;
