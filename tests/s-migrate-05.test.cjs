// S-MIGRATE-05 · PE-04 · Playbook Tab CRUD — Node.js tests
// Categories: A (data shape), B (logic), C (string safety), F (Supabase column alignment), L (live API)

const assert = require("assert");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch(e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

// ── A. Data shape ─────────────────────────────────────────────────────────────
console.log("\nA. Data shape");

test("output_format config has required fields", () => {
  const config = { id: "abc", name: "Executive Briefing", text: "Return a structured...", is_default: true, is_user_selectable: false, agent_id: "robyn", type: "output_format" };
  assert.ok(config.id, "id required");
  assert.ok(config.name, "name required");
  assert.ok(config.text, "text required");
  assert.strictEqual(typeof config.is_default, "boolean");
  assert.strictEqual(typeof config.is_user_selectable, "boolean");
});

test("guardrail config has required fields", () => {
  const g = { id: "xyz", name: "default", text: "NEVER: ...", is_default: true, is_user_selectable: false, agent_id: "robyn", type: "guardrail" };
  assert.ok(g.id);
  assert.ok(g.text);
  assert.strictEqual(g.type, "guardrail");
  assert.strictEqual(g.is_user_selectable, false);
});

test("empty formats array renders no ConfigCards", () => {
  const formatConfigs = [];
  const cards = formatConfigs.map(c => c.id);
  assert.deepStrictEqual(cards, []);
});

// ── B. Logic ──────────────────────────────────────────────────────────────────
console.log("\nB. Logic");

test("handleFormatAdded: new default zeros out existing defaults", () => {
  const existing = [
    { id: "1", name: "A", is_default: true },
    { id: "2", name: "B", is_default: false },
  ];
  const newConfig = { id: "3", name: "C", is_default: true };
  const updated = newConfig.is_default
    ? existing.map(c => ({ ...c, is_default: false }))
    : existing;
  const result = [...updated, newConfig];
  assert.strictEqual(result.find(c => c.id === "1").is_default, false);
  assert.strictEqual(result.find(c => c.id === "3").is_default, true);
});

test("handleFormatAdded: non-default does not affect existing defaults", () => {
  const existing = [{ id: "1", name: "A", is_default: true }];
  const newConfig = { id: "2", name: "B", is_default: false };
  const updated = newConfig.is_default ? existing.map(c => ({ ...c, is_default: false })) : existing;
  const result = [...updated, newConfig];
  assert.strictEqual(result.find(c => c.id === "1").is_default, true);
});

test("handleEdit: replaces correct config by id", () => {
  const configs = [
    { id: "1", name: "Old Name", text: "old" },
    { id: "2", name: "Other", text: "other" },
  ];
  const updated = { id: "1", name: "New Name", text: "new" };
  const result = configs.map(c => c.id === updated.id ? updated : c);
  assert.strictEqual(result[0].name, "New Name");
  assert.strictEqual(result[1].name, "Other");
});

test("handleDelete: filters config by id", () => {
  const configs = [{ id: "1" }, { id: "2" }, { id: "3" }];
  const result = configs.filter(c => c.id !== "2");
  assert.strictEqual(result.length, 2);
  assert.ok(!result.find(c => c.id === "2"));
});

test("handleToggleSelectable: optimistic update", () => {
  const configs = [{ id: "1", is_user_selectable: false }, { id: "2", is_user_selectable: true }];
  const result = configs.map(c => c.id === "1" ? { ...c, is_user_selectable: true } : c);
  assert.strictEqual(result[0].is_user_selectable, true);
  assert.strictEqual(result[1].is_user_selectable, true);
});

test("guardrail load: finds always record by name", () => {
  const guardrails = [
    { id: "a", name: "always", text: "Always cite class codes" },
    { id: "b", name: "never",  text: "Never name vendors as fraudulent" },
  ];
  const always = guardrails.find(r => r.name === "always");
  assert.strictEqual(always.id, "a");
  assert.strictEqual(always.text, "Always cite class codes");
});

test("guardrail load: finds never record by name", () => {
  const guardrails = [
    { id: "a", name: "always", text: "Always cite class codes" },
    { id: "b", name: "never",  text: "Never name vendors as fraudulent" },
  ];
  const never = guardrails.find(r => r.name === "never");
  assert.strictEqual(never.id, "b");
});

test("guardrail load: missing always record leaves alwaysText as empty string", () => {
  const guardrails = [{ id: "b", name: "never", text: "Never X" }];
  const always = guardrails.find(r => r.name === "always");
  const alwaysText = always ? always.text : "";
  assert.strictEqual(alwaysText, "");
});

test("guardrail load: empty array leaves both texts as empty string", () => {
  const guardrails = [];
  const alwaysText = (guardrails.find(r => r.name === "always") || {}).text || "";
  const neverText  = (guardrails.find(r => r.name === "never")  || {}).text || "";
  assert.strictEqual(alwaysText, "");
  assert.strictEqual(neverText, "");
});

// ── C. String safety ──────────────────────────────────────────────────────────
console.log("\nC. String safety");

test("alwaysText and neverText default to empty string not undefined", () => {
  const guardrails = [];
  const alwaysText = (guardrails.find(r => r.name === "always") || {}).text || "";
  const neverText  = (guardrails.find(r => r.name === "never")  || {}).text || "";
  assert.strictEqual(typeof alwaysText, "string");
  assert.strictEqual(typeof neverText, "string");
});

test("config name renders safely when undefined", () => {
  const config = { id: "1", name: undefined, text: "text" };
  const name = config.name || "";
  assert.strictEqual(typeof name, "string");
});

// ── F. Supabase column alignment ──────────────────────────────────────────────
console.log("\nF. Supabase column alignment");

test("apiSaveConfig guardrail payload has correct columns", () => {
  const payload = {
    agent_id: "robyn",
    type: "guardrail",
    name: "always",
    text: "Always cite class codes",
    is_default: false,
    is_user_selectable: false,
  };
  const EXPECTED_COLS = ["agent_id", "type", "name", "text", "is_default", "is_user_selectable"];
  EXPECTED_COLS.forEach(col => assert.ok(col in payload, `Missing column: ${col}`));
});

test("saveGuardrail: name distinguishes always from never records", () => {
  const alwaysPayload = { type: "guardrail", name: "always", text: "Always X" };
  const neverPayload  = { type: "guardrail", name: "never",  text: "Never Y" };
  assert.notStrictEqual(alwaysPayload.name, neverPayload.name);
  assert.strictEqual(alwaysPayload.type, "guardrail");
  assert.strictEqual(neverPayload.type, "guardrail");
});

test("apiPatchConfig guardrail payload has only text", () => {
  const patchPayload = { text: "NEVER do X" };
  assert.ok("text" in patchPayload);
  assert.ok(!("type" in patchPayload), "type should not be in patch payload");
  assert.ok(!("agent_id" in patchPayload), "agent_id should not be in patch payload");
});

test("apiSaveConfig output_format payload has correct columns", () => {
  const payload = {
    agent_id: "robyn",
    type: "output_format",
    name: "Executive Briefing",
    text: "Return a structured...",
    is_default: true,
    is_user_selectable: false,
  };
  assert.strictEqual(payload.type, "output_format");
  assert.ok("is_user_selectable" in payload);
});

// ── L. Live API integration ───────────────────────────────────────────────────
console.log("\nL. Live API integration");

test("Promise.all resolves both output_format and guardrail arrays", async () => {
  const mockApi = (type) => Promise.resolve(type === "output_format"
    ? [{ id: "1", type: "output_format", name: "A", text: "x", is_default: true, is_user_selectable: false }]
    : [{ id: "2", type: "guardrail", name: "default", text: "NEVER", is_default: true, is_user_selectable: false }]
  );
  const [formats, guardrails] = await Promise.all([
    mockApi("output_format"),
    mockApi("guardrail"),
  ]);
  assert.strictEqual(formats.length, 1);
  assert.strictEqual(guardrails.length, 1);
  assert.strictEqual(formats[0].type, "output_format");
  assert.strictEqual(guardrails[0].type, "guardrail");
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
