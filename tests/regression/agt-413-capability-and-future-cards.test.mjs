// DeepBench v7.0.810 | tests/regression/agt-413-capability-and-future-cards.test.mjs | AGT-413 / AGT-399 / AGT-402 -- the
// Capability editor, the Skills view grouping, and the Future Controls cards (each shown with SAMPLE values).
//
// PURE (always run):
//   (a) readCapabilityInput() is CALLED: a valid body is trimmed; a bad id, slug, an unknown field, a blank name
//       and an over-long description are each refused by name; absent fields stay absent.
// FAKE fetch (always run):
//   (b) the capabilities PATCH body is exactly the fields given; an empty result is a 404 `Capability not found`.
// STATIC (always run):
//   (c) the route holds `"update_capability"` once and imports readCapabilityInput / updateCapability.
//   (d) PersonnelScreen groups Skills under SKILL_TYPES headers, uses CapabilityHeader / TeamHeading /
//       UsageCountRow, no longer prints the constant "Bureau of Procurement Intelligence", and the Future
//       Controls groups carry the Access, Voice, Rating and Teaching origin placeholders WITH rows (a sample).
//   (e) SKILL_TYPES in SkillEditor.jsx is the same six types lib/skill-write.js accepts.
// LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else NOT RUN):
//   (f) a THROWAWAY capabilities row (assigned to no agent) is edited through updateCapability(), read back,
//       restored and deleted.
//
// BASELINE: RED on the unchanged tree -- lib/skill-write.js has no readCapabilityInput.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const count = (hay, needle) => hay.split(needle).length - 1;
const ID = "11111111-2222-4333-8444-555555555555";

function fake(respond) {
  const sent = [];
  const fetchImpl = async (url, init = {}) => {
    sent.push({ method: init.method || "GET", url: String(url), body: init.body ? JSON.parse(init.body) : null });
    const answer = respond();
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.json, text: async () => JSON.stringify(answer.json) };
  };
  return { fetchImpl, sent };
}

export default async function run() {
  const lib = await import("../../lib/skill-write.js");
  const { readCapabilityInput, updateCapability, SKILL_TYPES } = lib;
  assert.equal(typeof readCapabilityInput, "function", "lib/skill-write.js must export readCapabilityInput");
  assert.equal(typeof updateCapability, "function", "lib/skill-write.js must export updateCapability");

  // ── (a) ────────────────────────────────────────────────────────────────────
  assert.deepEqual(readCapabilityInput({ action: "update_capability", tenant_id: "global", capability_id: ID, name: "  New name ", description: "  d " }),
    { capabilityId: ID, fields: { name: "New name", description: "d" } });
  assert.deepEqual(Object.keys(readCapabilityInput({ capability_id: ID, description: "" }).fields), ["description"]);
  assert.equal(readCapabilityInput({ capability_id: ID, description: "" }).fields.description, null, "a blank description saves as null");
  const refused = (body, fragment) => {
    const r = readCapabilityInput({ capability_id: ID, ...body });
    assert.ok(r.error && r.error.includes(fragment), `${JSON.stringify(body)} -> expected "${fragment}", got ${JSON.stringify(r)}`);
  };
  assert.equal(readCapabilityInput({ name: "x" }).error, "capability_id required");
  assert.equal(readCapabilityInput({ capability_id: "nope", name: "x" }).error, "capability_id required");
  for (const key of ["slug", "execution_type", "id", "tenant_id_x"]) refused({ [key]: "x" }, `${key} cannot be edited`);
  refused({ name: "   " }, "Enter a capability name");
  refused({ description: "x".repeat(2001) }, "description is at most 2000");
  refused({}, "Nothing to save");

  // ── (b) ────────────────────────────────────────────────────────────────────
  const live = { supabaseUrl: "https://example.test", supabaseKey: "k" };
  const f1 = fake(() => ({ status: 200, json: [{ id: ID, slug: "s", name: "New", description: null }] }));
  const saved = await updateCapability({ capabilityId: ID, fields: { name: "New" } }, { ...live, fetchImpl: f1.fetchImpl });
  assert.equal(saved.capability.name, "New");
  assert.equal(f1.sent[0].method, "PATCH");
  assert.ok(f1.sent[0].url.includes(`capabilities?id=eq.${ID}`));
  assert.deepEqual(f1.sent[0].body, { name: "New" });
  const f2 = fake(() => ({ status: 200, json: [] }));
  await assert.rejects(updateCapability({ capabilityId: ID, fields: { name: "x" } }, { ...live, fetchImpl: f2.fetchImpl }), e => e.status === 404 && e.message === "Capability not found");

  // ── (c) ────────────────────────────────────────────────────────────────────
  const route = read("api/agent-configs.js");
  assert.equal(count(route, '"update_capability"'), 1, 'the route holds "update_capability" once');
  assert.ok(route.includes("readCapabilityInput") && route.includes("updateCapability"), "the route imports both helpers");

  // ── (d) ────────────────────────────────────────────────────────────────────
  const screen = read("src/screens/PersonnelScreen.jsx");
  assert.ok(screen.includes("SKILL_TYPES.map("), "Skills are grouped under the six fixed type headers");
  assert.equal(count(screen, "<CapabilityHeader"), 1);
  assert.ok(count(screen, "<TeamHeading") === 2 && count(screen, "<UsageCountRow") === 2, "desktop and phone badges both read the team and usage count");
  assert.ok(!screen.includes("Bureau of Procurement Intelligence"), "the constant bureau heading is gone");
  assert.ok(screen.includes("db-team-changed") && read("src/screens/personnel/AgentFacts.jsx").includes("addEventListener(\"db-team-changed\""), "the heading follows a team picked in the team picker");
  assert.ok(screen.includes("taughtCounts(entries).always + taughtCounts(entries).lookedUp"), "Documents counts the active taught items");
  for (const label of ["Access", "Voice", "Rating", "Teaching origin and date"]) {
    const m = screen.match(new RegExp(`label:"${label}",[^\\n]*rows:\\[\\[`));
    assert.ok(m, `Future Controls card "${label}" is shown with sample rows`);
  }
  const future = read("src/screens/personnel/FutureViewTab.jsx");
  assert.ok(future.includes("<SampleTag />"), "placeholder cards that carry rows are tagged as sample");

  // ── (e) ────────────────────────────────────────────────────────────────────
  const editor = read("src/screens/personnel/SkillEditor.jsx");
  const slugs = [...editor.slice(editor.indexOf("export const SKILL_TYPES"), editor.indexOf("// [column, label")).matchAll(/\["(\w+)", "\w+"\]/g)].map(m => m[1]);
  assert.deepEqual(slugs, SKILL_TYPES, "the editor's six types are the six the server accepts");

  // ── (f) LIVE ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    notRun("(f) live round trip on a throwaway capability row", "SUPABASE_URL / SUPABASE_SERVICE_KEY not set (node --env-file-if-exists=.env.local)");
    return;
  }
  const rest = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/`;
  const headers = { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
  const slug = `agt-413-throwaway-${Date.now()}`;
  const made = await fetch(`${rest}capabilities?select=*`, {
    method: "POST", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ slug, name: "AGT-413 throwaway", description: "before-description", execution_type: "deterministic" }),
  });
  assert.ok(made.ok, `throwaway insert HTTP ${made.status} ${await made.clone().text()}`);
  const before = (await made.json())[0];
  const get = async () => (await (await fetch(`${rest}capabilities?id=eq.${before.id}&select=*`, { headers })).json())[0];
  try {
    await updateCapability(readCapabilityInput({ capability_id: before.id, name: "AGT-413 throwaway EDITED", description: "after-description" }), { supabaseUrl, supabaseKey });
    const after = await get();
    assert.equal(after.name, "AGT-413 throwaway EDITED");
    assert.equal(after.description, "after-description");
    assert.equal(after.slug, before.slug, "the slug is untouched");
    console.log(`[LIVE] before name=${before.name} description=${before.description} | after name=${after.name} description=${after.description}`);
    await updateCapability(readCapabilityInput({ capability_id: before.id, name: before.name, description: before.description }), { supabaseUrl, supabaseKey });
    assert.deepEqual(await get(), before, "the throwaway row is restored to its before-image");
    console.log("[LIVE] restored row equals before-image");
  } finally {
    await fetch(`${rest}capabilities?id=eq.${before.id}`, { method: "DELETE", headers: { ...headers, Prefer: "return=minimal" } });
  }
}

selfRun(import.meta.url, run);
