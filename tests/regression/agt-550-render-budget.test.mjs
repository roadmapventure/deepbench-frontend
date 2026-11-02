// DeepBench v7.0.935 | tests/regression/agt-550-render-budget.test.mjs | AGT-550 -- the render byte
// budget. scripts/agent-prompt.js gains recordHead() / overBudget() / SECTION_BYTE_CEILING, the two
// render scripts push record HEADS instead of whole bodies, and a section over the ceiling REFUSES
// the render (exit 2 through fail()) instead of assembling a prompt no model can read.
// Kickoff: docs/kickoffs/v7.0.935-AGT-550-render-byte-budget.md section 5, T4.
//
//   A  STATIC -- recordHead() returns exactly id,kind,title,date,head with a 240-character head, and
//      falls back body -> data.headline/can_do/summary/text -> '' (each fallback asserted separately,
//      so the arm proves WHICH branch fired, LOO-013); overBudget() measures each section in bytes,
//      names only the sections over the ceiling, and JSON-measures object sections;
//      SECTION_BYTE_CEILING is 786432 and HEAD_CHARS is 240.
//   A' SOURCE -- both render scripts hold the AGT-550 import AND their pinned renderAssembly import
//      byte-same (agt-121:67 / agt-84:151 pin it), the refusal string, `overBudget(task_context)`,
//      and `body: r.body` exactly once (market) / twice (personal) -- the surviving occurrences are
//      the corrections reads, which stay WHOLE (agt-266). NEGATIVE CONTROL: the same arm run over a
//      copy of each source with the guard line spliced out must FAIL, so a passing arm is evidence.
//   B  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- pmm-messaging (nathan, market) and
//      humor-weekly-draft (dilbert, personal) render exit 0 under the ceiling; the prompt's own
//      `records: ` line parses, every entry carries `id` and `head` and NO `body` / `data`; the
//      newest live market `message` id and humor `draft` id are still in the prompt, so the heads
//      are the real records and not an empty read. Read-only: no row is written, temp files deleted.
//
// Pre-change on origin/dev arm A dies at import (`git grep -F recordHead -- scripts` -> 0 files) and
// pmm-messaging's 1,840,855-B `records: ` line is full of `"body"` keys; after, 139,910 B of prompt
// and 0 `"body"` keys there.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { recordHead, overBudget, SECTION_BYTE_CEILING, HEAD_CHARS } from "../../scripts/agent-prompt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MARKET = path.join(ROOT, "scripts", "market-agent.js");
const PERSONAL = path.join(ROOT, "scripts", "personal-agent.js");

const NEW_IMPORT = "import { overBudget, recordHead } from './agent-prompt.js';";
const PINNED_IMPORT = "import { renderAssembly, resolveJudgmentModel } from './agent-prompt.js';";
const GUARD_LINE = "  const budget = overBudget(task_context);";
const REFUSAL = "render refused: section(s)";
const RECORDS_PREFIX = "records: ";

const occurrences = (hay, needle) => hay.split(needle).length - 1;

// The source arm, as a function, so the NEGATIVE CONTROL can run the very same assertions over a
// mutated copy. A source arm that is only ever run over the real file proves nothing about itself.
function sourceArm(name, src, bodyCount) {
  assert.ok(src.includes(NEW_IMPORT), `${name}: the AGT-550 import line is present`);
  assert.ok(src.includes(PINNED_IMPORT), `${name}: the pinned renderAssembly import is still byte-same`);
  assert.ok(src.includes(GUARD_LINE), `${name}: the render measures its sections before assembling`);
  assert.ok(src.includes(REFUSAL), `${name}: the refusal names the over-budget sections`);
  assert.ok(src.includes("overBudget(task_context)"), `${name}: overBudget() is called on the task_context`);
  assert.equal(occurrences(src, "body: r.body"), bodyCount,
    `${name}: exactly ${bodyCount} whole-body push(es) left -- the corrections read(s), which stay WHOLE (agt-266)`);
}

// The prompt's own `records: ` line -- the section this ticket shrank.
function recordsLine(text) {
  const line = text.split("\n").find(l => l.startsWith(RECORDS_PREFIX));
  assert.ok(line, "the rendered prompt carries a `records: ` line");
  return { line, value: JSON.parse(line.slice(RECORDS_PREFIX.length)) };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt550-"));

  try {
    await arm("A static", async () => {
      const head = recordHead({ id: "r1", kind: "draft", title: "t", created_at: "2026-11-02T00:00:00Z", body: "x".repeat(1000) });
      assert.deepEqual(Object.keys(head), ["id", "kind", "title", "date", "head"], "a head is id,kind,title,date,head and nothing else");
      assert.equal(head.head.length, HEAD_CHARS, "the head is cut to 240 characters");
      assert.equal(head.date, "2026-11-02T00:00:00Z", "created_at travels as `date`");
      // Which fallback fired, one at a time (LOO-013): body wins, then each data key, then ''.
      assert.equal(recordHead({ id: "r2", body: "b", data: { headline: "h" } }).head, "b");
      assert.equal(recordHead({ id: "r3", data: { headline: "h  h" } }).head, "h h", "whitespace is collapsed");
      assert.equal(recordHead({ id: "r4", data: { can_do: "c" } }).head, "c");
      assert.equal(recordHead({ id: "r5", data: { summary: "s" } }).head, "s");
      assert.equal(recordHead({ id: "r6", data: { text: "t" } }).head, "t");
      assert.equal(recordHead({ id: "r7" }).head, "", "a record with neither body nor data has an empty head");
      assert.equal(recordHead({ id: "r8" }).date, null, "a missing created_at is null, never undefined");

      const over = overBudget({ a: "x".repeat(10) }, 8);
      assert.deepEqual(over.over, ["a"], "a 10-byte section is over an 8-byte ceiling");
      assert.equal(over.ceiling, 8, "the ceiling is reported with the sizes");
      // 10, not 12: a string section is measured as its own bytes, an object section as its JSON.
      // The kickoff's section 5 A writes 12 for this value, which is JSON.stringify's two quotes
      // added -- the section 4 definition it ships is the one asserted here (see DEVIATIONS).
      assert.equal(over.sizes.a, 10, "a string section measures its own utf8 bytes");
      assert.deepEqual(overBudget({ a: "x".repeat(10) }, 12).over, [], "the same section is inside a 12-byte ceiling");
      assert.equal(overBudget({ a: { b: 1 } }, 1e9).sizes.a, 7, 'an object section measures its JSON ({"b":1})');
      assert.equal(overBudget({ a: null }, 1e9).sizes.a, 0, "a null section is 0 bytes, never the string 'null'");
      assert.deepEqual(overBudget({ a: "x", b: "y".repeat(20) }, 8).over, ["b"], "only the over-budget section is named");
      assert.equal(SECTION_BYTE_CEILING, 786432, "one 200k-token context at 4 B/token");
      assert.equal(HEAD_CHARS, 240);
    });

    await arm("A' source + negative control", async () => {
      const market = fs.readFileSync(MARKET, "utf8");
      const personal = fs.readFileSync(PERSONAL, "utf8");
      sourceArm("market-agent.js", market, 1);
      sourceArm("personal-agent.js", personal, 2);

      for (const [name, src, count] of [["market-agent.js", market, 1], ["personal-agent.js", personal, 2]]) {
        assert.equal(occurrences(src, GUARD_LINE + "\n"), 1, `${name}: the guard line appears once, so the splice is exact`);
        const spliced = src.split(GUARD_LINE + "\n").join("");
        assert.notEqual(spliced, src, `${name}: the negative control really removed the guard`);
        assert.throws(() => sourceArm(name, spliced, count),
          `${name}: NEGATIVE CONTROL -- the source arm must FAIL on a copy with the guard spliced out`);
      }
    });

    await arm("B live", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-550 arm B (live renders under the ceiling)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- market_records and humor_records are unreadable here, so the live half is UNVERIFIED. Arms A and A' DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const newestId = async q => {
        const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
        assert.equal(r.status, 200, `read the newest live row (${q}) -- HTTP ${r.status}`);
        const rows = await r.json();
        assert.ok(rows[0]?.id, `the live store answered at least one row (${q})`);
        return rows[0].id;
      };
      const newestMessage = await newestId("market_records?kind=eq.message&status=neq.retired&select=id&order=created_at.desc&limit=1");
      const newestDraft = await newestId("humor_records?kind=eq.draft&select=id&order=created_at.desc&limit=1");

      const cases = [
        { name: "pmm-messaging", script: MARKET, agent: "nathan", capability: "pmm-messaging", mustHold: newestMessage },
        { name: "humor-weekly-draft", script: PERSONAL, agent: "dilbert", capability: "humor-weekly-draft", mustHold: newestDraft },
      ];
      for (const c of cases) {
        const out = path.join(tmp, `${c.name}.txt`);
        const r = spawnSync(process.execPath,
          [c.script, "--render", `--agent=${c.agent}`, `--capability=${c.capability}`, "--json", `--out=${out}`],
          { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
        assert.equal(r.status, 0, `${c.name} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        const json = JSON.parse(r.stdout.trim().split("\n").pop());
        const text = fs.readFileSync(out, "utf8");
        console.log(`    B ${c.name}: prompt_bytes=${json.prompt_bytes} records_loaded=${json.records_loaded}`);
        assert.equal(json.prompt_bytes, Buffer.byteLength(text, "utf8"), `${c.name}: --out holds the prompt the run measured`);
        assert.ok(json.prompt_bytes < SECTION_BYTE_CEILING,
          `${c.name}: prompt_bytes ${json.prompt_bytes} must be under the ${SECTION_BYTE_CEILING}-byte ceiling`);

        const { line, value } = recordsLine(text);
        let entries = 0;
        for (const [kind, arr] of Object.entries(value)) {
          assert.ok(Array.isArray(arr), `${c.name}: records.${kind} is an array`);
          for (const e of arr) {
            entries += 1;
            assert.ok(Object.prototype.hasOwnProperty.call(e, "id"), `${c.name}: every records.${kind} entry carries id`);
            assert.ok(Object.prototype.hasOwnProperty.call(e, "head"), `${c.name}: every records.${kind} entry carries head`);
            assert.ok(!Object.prototype.hasOwnProperty.call(e, "body"), `${c.name}: no records.${kind} entry carries body`);
            assert.ok(!Object.prototype.hasOwnProperty.call(e, "data"), `${c.name}: no records.${kind} entry carries data`);
          }
        }
        assert.ok(entries > 0, `${c.name}: the records section is not empty (${entries} entries) -- an empty read would pass the keys vacuously`);
        assert.equal(occurrences(line, '"body"'), 0, `${c.name}: the records line holds no "body" key`);
        assert.ok(text.includes(c.mustHold),
          `${c.name}: the newest live record ${c.mustHold} is still in the prompt -- heads, not a short read`);
        console.log(`    B ${c.name}: records line ${Buffer.byteLength(line, "utf8")} B, ${entries} heads, newest ${c.mustHold} present`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    assert.equal(fs.existsSync(tmp), false, "the temp renders are deleted");
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed -- ${failures.join(" | ")}`);
}

selfRun(import.meta.url, run);
export default run;
