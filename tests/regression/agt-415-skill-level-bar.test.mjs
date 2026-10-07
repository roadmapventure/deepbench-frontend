// DeepBench v7.0.814 | tests/regression/agt-415-skill-level-bar.test.mjs | AGT-415 -- the Skill Ladder as a five-section
// bar in the Profile top card: the user clicks a level and its STARTING score is saved to agents.skill_score;
// Future Controls keeps the ladder and gains a sample "Promotion by accomplishments" card.
//
// PURE (always run):
//   (a) readSkillLevelInput() is CALLED: each of the five levels maps to its starting score (0/30/55/75/90); an
//       unknown level, a bad agent id and an unlisted field are refused by name.
//   (b) the bar's own LEVELS and levelOf() (compiled from AgentFacts.jsx's source) agree with the server's
//       SKILL_LEVELS: the same five names, the same starting scores, and levelOf() puts every band edge in the
//       band the ladder card draws (29 Trainee, 30 Developing, 54, 55 Proficient, 74, 75 Expert, 89, 90 Principal).
// FAKE fetch (always run):
//   (c) updateSkillLevel() PATCHes only { skill_score } on the one agent; an empty result is a 404.
// STATIC (always run):
//   (d) the route holds "update_skill_level" once; PersonnelScreen mounts the bar in the desktop badge AND the
//       phone persona block, only under `proposed`; Future Controls carries the Promotion card WITH sample rows.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   (e) the test agent testjohn-w50rvr is set to Expert, read back as 75, and `finally` restores its before value.
//
// BASELINE: RED on the unchanged tree -- lib/skill-write.js has no readSkillLevelInput.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;
const LIVE_ID = "testjohn-w50rvr";

export default async function run() {
  const { readSkillLevelInput, updateSkillLevel, SKILL_LEVELS } = await import("../../lib/skill-write.js");
  assert.equal(typeof readSkillLevelInput, "function", "lib/skill-write.js must export readSkillLevelInput");
  assert.equal(typeof updateSkillLevel, "function", "lib/skill-write.js must export updateSkillLevel");

  // ── (a) ────────────────────────────────────────────────────────────────────
  const expected = { trainee: 0, developing: 30, proficient: 55, expert: 75, principal: 90 };
  for (const [level, score] of Object.entries(expected)) {
    assert.deepEqual(readSkillLevelInput({ action: "update_skill_level", tenant_id: "global", agent_id: "zoe-k3x9ab", level }), { agentId: "zoe-k3x9ab", level, score });
  }
  assert.ok(readSkillLevelInput({ agent_id: "zoe", level: "wizard" }).error.includes("level must be one of"));
  assert.equal(readSkillLevelInput({ level: "expert" }).error, "agent_id required");
  assert.equal(readSkillLevelInput({ agent_id: "Bad Id", level: "expert" }).error, "agent_id required");
  assert.ok(readSkillLevelInput({ agent_id: "zoe", level: "expert", skill_score: 99 }).error.includes("skill_score cannot be edited"));

  // ── (b) ────────────────────────────────────────────────────────────────────
  const facts = read("src/screens/personnel/AgentFacts.jsx");
  const start = facts.indexOf("export const LEVELS");
  const end = facts.indexOf("export function SkillLevelBar");
  const { LEVELS, levelOf } = new Function(`${facts.slice(start, end).replace(/export const/g, "const")}; return { LEVELS, levelOf };`)();
  assert.deepEqual(LEVELS.map(([slug, , score]) => [slug, score]), SKILL_LEVELS, "the bar and the server hold the same five levels and scores");
  const edges = [[0, "trainee"], [29, "trainee"], [30, "developing"], [54, "developing"], [55, "proficient"], [74, "proficient"], [75, "expert"], [89, "expert"], [90, "principal"], [100, "principal"]];
  for (const [score, level] of edges) assert.equal(levelOf(score), level, `score ${score} is ${level}`);
  for (const [slug, , score] of LEVELS) assert.equal(levelOf(score), slug, "each level's starting score lands in its own band");

  // ── (c) ────────────────────────────────────────────────────────────────────
  const sent = [];
  const mk = (json, status = 200) => async (url, init) => { sent.push({ url: String(url), method: init.method, body: JSON.parse(init.body) }); return { ok: status < 300, status, json: async () => json, text: async () => JSON.stringify(json) }; };
  const deps = f => ({ supabaseUrl: "https://example.test", supabaseKey: "k", fetchImpl: f });
  const out = await updateSkillLevel({ agentId: "zoe", score: 55 }, deps(mk([{ id: "zoe", skill_score: 55 }])));
  assert.deepEqual(out, { agent: { id: "zoe", skill_score: 55 } });
  assert.equal(sent[0].method, "PATCH");
  assert.ok(sent[0].url.includes("agents?id=eq.zoe"));
  assert.deepEqual(sent[0].body, { skill_score: 55 }, "only skill_score is written");
  await assert.rejects(updateSkillLevel({ agentId: "nobody", score: 0 }, deps(mk([]))), e => e.status === 404 && e.message === "Agent not found");

  // ── (d) ────────────────────────────────────────────────────────────────────
  assert.equal(count(read("api/agent-configs.js"), '"update_skill_level"'), 1);
  const screen = read("src/screens/PersonnelScreen.jsx");
  assert.equal(count(screen, "<SkillLevelBar"), 2, "desktop badge and phone persona block both mount the bar");
  assert.equal(count(screen, "{proposed && <SkillLevelBar"), 2, "both only under `proposed`");
  assert.ok(/label:"Promotion by accomplishments",[^\n]*rows:\[\[/.test(screen), "Future Controls shows the Promotion card with sample rows");
  assert.ok(/label:"Skill score",[^\n]*rows:\[\[/.test(screen), "Future Controls shows the typed Skill score card with sample rows");
  assert.ok(screen.includes("<SkillLadderCard"), "the Skill Ladder card stays on Future Controls");

  // ── (e) LIVE ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    notRun("(e) live level save on the test agent", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (node --env-file-if-exists=.env.local)");
    return;
  }
  const rest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`;
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const get = async () => (await (await fetch(`${rest}agents?id=eq.${LIVE_ID}&select=id,skill_score`, { headers })).json())[0];
  const before = await get();
  assert.ok(before, `${LIVE_ID} must exist`);
  try {
    const input = readSkillLevelInput({ agent_id: LIVE_ID, level: "expert" });
    await updateSkillLevel(input, { supabaseUrl, supabaseKey });
    const after = await get();
    assert.equal(after.skill_score, 75, "Expert saves as 75");
    console.log(`[LIVE] before skill_score=${before.skill_score} | after skill_score=${after.skill_score}`);
  } finally {
    await fetch(`${rest}agents?id=eq.${LIVE_ID}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ skill_score: before.skill_score }) });
    assert.deepEqual(await get(), before, "the test agent is restored to its before value");
    console.log("[LIVE] restored row equals before value");
  }
}

selfRun(import.meta.url, run);
