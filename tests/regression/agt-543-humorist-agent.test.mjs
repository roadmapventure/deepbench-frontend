// DeepBench v7.0.893 | tests/regression/agt-543-humorist-agent.test.mjs | AGT-543 -- the humorist's
// call path: scripts/personal-agent.js gains its own humor read map, extra reads, the pure write check
// validateHumorAnswer() and napkinPatch(); docs/runbooks/humorist-agent.md carries the method and the
// two routine prompt blocks; migration agt543_napkin_dilbert_note adds the agent's two Napkin columns.
// Kickoff: docs/kickoffs/v7.0.893-AGT-543-dilbert-call-path.md section 5, T4.
//
//   A  MAPS -- HUMOR_READ_MAP's keys are exactly the two humor slugs and every kind it reads is one of
//      the six HUMOR_KINDS; READ_MAP is still exactly the 12 career-* slugs; the agent id appears in
//      the script only on `//` lines (control: a copy with `const a = 'dilbert';` spliced in fails);
//      napkinPatch('dilbert','n','t') names exactly dilbert_note / dilbert_noted_at, and an id that
//      cannot be a column name ('x;y') throws.
//   B  WRITE CHECK -- validateHumorAnswer() passes GOOD (90 code points / 19 words), a 280-code-point
//      text, a deny entry that is only a SUBSTRING of a word ('tea' in 'team') and a null deny list;
//      it refuses 281 code points, a period after the emoji, two `!`, a hashtag, a non-ASCII em dash,
//      a word on the deny list, empty source refs, and a bad `draft` row behind a good drafts[] entry.
//      Each refusal is paired with a passing control so the arm proves the rule, not a broken check.
//   C  RUNBOOK -- the four marker lines appear once each as whole lines; line 1 of both blocks is the
//      STEP 0 meter stop byte for byte (control: one character off fails); both blocks hold the three
//      news feeds; the file carries no model id, no trigger id, no `WebSearch` and no fenced code
//      (each pattern proved to fire on a violating copy, LOO-013); both CDT crons are present.
//   D  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- the two Napkin columns answer the
//      service key 200 and a proven anon key >= 400; a humor-weekly-draft render exits 0; --write of
//      GOOD minus its emoji exits 2 and leaves 0 rows; --write of GOOD stores exactly 1 row with
//      char_count 90 / word_count 19 and its text untouched; the rows are deleted in `finally` and the
//      deletion is asserted.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to
// link and every arm is red; the runbook does not exist; dilbert_note answers the service key 400.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  READ_MAP, HUMOR_READ_MAP, HUMOR_KINDS, napkinPatch, validateHumorAnswer,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "humorist-agent.md");
const RUN = randomUUID().slice(0, 8);
const lf = t => String(t).replace(/\r\n/g, "\n");

const E = "\u{1F60E}";
const GOOD = "I asked my agent for one answer and got nine, which is how my team feels in my meetings. " + E;
const STEP0 = "STEP 0 — WEEKLY METER STOP (John, 2026-10-17). Before anything else, using the Supabase MCP tools, run: select ok, reason, all_models_pct, threshold from public.routine_meter_ok(); If ok is false, stop the run now: do no work, write nothing, send nothing, and make the first line of your final message exactly: SKIPPED: weekly meter <all_models_pct>% at or above the ceiling <threshold>% (<reason>). If that query itself fails, also stop and say: SKIPPED: meter check failed. Only when ok is true, continue with the instructions below.";
const FEEDS = ["https://techcrunch.com/feed/", "https://venturebeat.com/feed/", "https://www.fastcompany.com/technology/rss"]; // John 2026-10-23: Mashable and Wired refuse the fetcher
const MARKERS = {
  wednesday: ["<!-- HUMORIST-WEDNESDAY-PROMPT-BEGIN -->", "<!-- HUMORIST-WEDNESDAY-PROMPT-END -->"],
  friday: ["<!-- HUMORIST-FRIDAY-PROMPT-BEGIN -->", "<!-- HUMORIST-FRIDAY-PROMPT-END -->"],
};

// One draft answer: the same text as a drafts[] entry and as a `draft` row, as the intent's output
// contract returns it.
const answerOf = (text, refs = ["r1"]) => ({
  drafts: [{ text, source_refs: refs }],
  records_to_write: [{ kind: "draft", title: "AGT-543 fixture", data: { text, source_refs: refs } }],
});

const nameOnlyInComments = src => lf(src).split("\n").every(l => !/\bdilbert\b/.test(l) || l.trim().startsWith("//"));

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt543-"));

  try {
    await arm("A maps", async () => {
      assert.deepEqual(HUMOR_KINDS, ["draft", "grade", "correction", "topic", "research", "phrase_set"]);
      assert.deepEqual(Object.keys(HUMOR_READ_MAP).sort(), ["humor-topic-scout", "humor-weekly-draft"]);
      for (const [slug, kinds] of Object.entries(HUMOR_READ_MAP)) {
        assert.ok(kinds.length, `${slug} reads no kinds`);
        for (const k of kinds) assert.ok(HUMOR_KINDS.includes(k), `${slug} reads unknown kind ${k}`);
      }
      const careerKeys = Object.keys(READ_MAP);
      assert.equal(careerKeys.length, 12, `READ_MAP has ${careerKeys.length} keys, expected 12`);
      assert.ok(careerKeys.every(k => k.startsWith("career-")), "READ_MAP holds only career-* slugs");

      const src = fs.readFileSync(AGENT, "utf8");
      assert.ok(nameOnlyInComments(src), "the agent id appears outside a `//` line of scripts/personal-agent.js");
      const spliced = src.replace("const TENANT = 'global';", "const TENANT = 'global';\nconst a = 'dilbert';");
      assert.notEqual(spliced, src, "control: the splice point exists");
      assert.ok(!nameOnlyInComments(spliced), "control: a spliced `const a = 'dilbert';` must fail the name check");

      assert.deepEqual(napkinPatch("dilbert", "n", "t"), { dilbert_note: "n", dilbert_noted_at: "t" });
      assert.throws(() => napkinPatch("x;y", "n", "t"), /cannot name a Napkin column/);
    });

    await arm("B write check", async () => {
      const ok = (answer, deny, what) => {
        const r = validateHumorAnswer(answer, deny);
        assert.ok(r.ok && !r.error, `${what} should pass: ${JSON.stringify(r)}`);
        return r;
      };
      const refused = (answer, deny, what) => {
        const r = validateHumorAnswer(answer, deny);
        assert.ok(r.error && !r.ok, `${what} should be refused: ${JSON.stringify(r)}`);
        return r;
      };

      const good = ok(answerOf(GOOD), null, "GOOD");
      assert.deepEqual(good.counts, [{ char_count: 90, word_count: 19 }], "GOOD counts 90 / 19");
      const edge = ok(answerOf("a".repeat(279) + E), null, "279 a + emoji (280 code points)");
      assert.equal(edge.counts[0].char_count, 280);
      ok(answerOf(GOOD), ["tea"], "deny 'tea' -- a substring of 'team', not a word");
      ok(answerOf(GOOD), null, "deny null");

      refused(answerOf("a".repeat(280) + E), null, "281 code points");
      refused(answerOf(GOOD + "."), null, "a period after the emoji");
      ok(answerOf(GOOD.replace("meetings.", "meetings!")), null, "control: one `!`");
      refused(answerOf(GOOD.replace("nine,", "nine!,").replace("meetings.", "meetings!")), null, "two `!`");
      refused(answerOf(GOOD.replace(E, "#AI " + E)), null, "a hashtag");
      ok(answerOf(GOOD.replace(E, "AI " + E)), null, "control: the same words without the `#`");
      refused(answerOf(GOOD.replace(",", " —")), null, "a non-ASCII em dash");
      const deny = refused(answerOf(GOOD), ["team"], "deny 'team'");
      assert.ok(!deny.error.includes("team"), "a refusal never echoes the private deny entry");
      refused(answerOf(GOOD, []), null, "empty source refs");
      refused({
        drafts: [{ text: GOOD, source_refs: ["r1"] }],
        records_to_write: [{ kind: "draft", title: "bad row", data: { text: GOOD.slice(0, -2), source_refs: ["r1"] } }],
      }, null, "a bad draft row behind a good drafts[] entry");
      refused({ records_to_write: [{ kind: "posting", title: "t" }] }, null, "a career kind in the humor store");
    });

    await arm("C runbook", async () => {
      const md = lf(fs.readFileSync(RUNBOOK, "utf8"));
      const lines = md.split("\n");
      const blocks = {};
      for (const [day, [begin, end]] of Object.entries(MARKERS)) {
        for (const m of [begin, end]) {
          // Whole lines exactly once; section (d)'s table also NAMES each marker inline, as
          // personal-agent.md (e) does, and an inline mention is not a marker line.
          assert.equal(lines.filter(l => l === m).length, 1, `${m} is a whole line exactly once`);
        }
        const a = lines.indexOf(begin), b = lines.indexOf(end);
        assert.ok(a >= 0 && b > a, `${day} markers in order`);
        blocks[day] = lines.slice(a + 1, b);
      }
      const opensWithStep0 = block => block[0] === STEP0;
      for (const [day, block] of Object.entries(blocks)) {
        assert.ok(opensWithStep0(block), `${day} block line 1 is the STEP 0 meter stop, byte for byte`);
        const off = [STEP0.replace("2026-10-17", "2026-10-18"), ...block.slice(1)];
        assert.ok(!opensWithStep0(off), `control: a ${day} line 1 one character off fails`);
        const text = block.join("\n");
        for (const f of FEEDS) assert.ok(text.includes(f), `${day} block holds ${f}`);
        assert.ok(!text.includes("```"), `${day} block carries no fenced code`);
        assert.ok((text + "\n```").includes("```"), "control: a fence is detectable when present");
      }
      const forbidden = [
        ["a model id", /claude-[a-z]+-\d/, "claude-opus-5"],
        ["a trigger id", /trig_/, "trig_01BCzPdanZ1YiK956dAqU6YN"],
        ["WebSearch", /WebSearch/, "WebSearch"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(md), `the runbook carries no ${what}`);
        assert.ok(re.test(md + "\n" + violation), `control: ${what} is detectable when present`);
      }
      for (const cron of ["0 12 * * 3", "0 15 * * 5"]) assert.ok(md.includes(cron), `the runbook carries cron ${cron}`);
    });

    await arm("D live", async () => {
      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-543 arm D (Napkin columns, humor render, humor --write)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- humor_records and napkin_ideas are unreadable here, so the live half is UNVERIFIED. Arms A-C DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const svc = { apikey: key, Authorization: `Bearer ${key}` };
      const cols = await fetch(`${url}/rest/v1/napkin_ideas?select=dilbert_note,dilbert_noted_at&limit=1`, { headers: svc });
      assert.equal(cols.status, 200, `service key reads the two Napkin columns (HTTP ${cols.status} ${await cols.text()})`);
      const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!anon || anon === "regression-placeholder") {
        notRun("AGT-543 arm D anon half", "no anon key in env (SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY), so the anon refusal is UNVERIFIED");
      } else {
        const anonHdr = { apikey: anon, Authorization: `Bearer ${anon}` };
        const ctl = await fetch(`${url}/rest/v1/agents?select=id&limit=1`, { headers: anonHdr });
        if (ctl.status !== 200) {
          notRun("AGT-543 arm D anon half", `the anon key is not a working anon key (agents answered HTTP ${ctl.status}), so a refusal would prove nothing`);
        } else {
          const n = await fetch(`${url}/rest/v1/napkin_ideas?select=dilbert_note,dilbert_noted_at&limit=1`, { headers: anonHdr });
          assert.ok(n.status >= 400, `the anon key must be refused the Napkin columns (HTTP ${n.status})`);
          console.log(`    D anon: agents 200 (control), napkin_ideas dilbert columns ${n.status}`);
        }
      }

      const agent = args => spawnSync(process.execPath, [AGENT, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const render = agent(["--render", "--agent=dilbert", "--capability=humor-weekly-draft", "--json"]);
      assert.equal(render.status, 0, `humor-weekly-draft render exits 0 (got ${render.status}: ${(render.stderr ?? "").slice(-400)})`);
      const rendered = JSON.parse(render.stdout.trim().split("\n").pop());
      assert.ok(rendered.prompt_bytes > 0 && rendered.model, `render printed a model and a prompt size: ${render.stdout.slice(0, 200)}`);
      console.log(`    D render: records_loaded=${rendered.records_loaded} prompt_bytes=${rendered.prompt_bytes}`);

      const session = `agt543-${RUN}`;
      const rows = async () => {
        const r = await fetch(`${url}/rest/v1/humor_records?session_name=eq.${encodeURIComponent(session)}&select=id,kind,data`, { headers: svc });
        assert.equal(r.status, 200, `read back humor_records (HTTP ${r.status})`);
        return r.json();
      };
      const fixture = text => {
        const p = path.join(tmp, `answer-${randomUUID().slice(0, 6)}.json`);
        fs.writeFileSync(p, JSON.stringify({
          records_to_write: [{ kind: "draft", title: "AGT-543 regression fixture", data: { text, source_refs: ["r1"], status: "proposed" } }],
        }), "utf8");
        return p;
      };
      try {
        const bad = agent(["--write", "--agent=dilbert", "--capability=humor-weekly-draft", `--session-name=${session}`, `--answer=${fixture(GOOD.slice(0, -2))}`]);
        assert.equal(bad.status, 2, `GOOD minus its emoji exits 2 (got ${bad.status}: ${(bad.stderr ?? "").slice(-300)})`);
        assert.match(bad.stderr, /answer refused, nothing written/);
        assert.equal((await rows()).length, 0, "a refused answer writes 0 rows");

        const good = agent(["--write", "--agent=dilbert", "--capability=humor-weekly-draft", `--session-name=${session}`, `--answer=${fixture(GOOD)}`]);
        assert.equal(good.status, 0, `GOOD writes (got ${good.status}: ${(good.stderr ?? "").slice(-300)})`);
        const out = JSON.parse(good.stdout.trim().split("\n").pop());
        assert.equal(out.inserted, 1, `stdout inserted 1: ${good.stdout}`);
        assert.equal(out.target, 200);
        assert.deepEqual(out.drafts, [{ char_count: 90, word_count: 19, over_target: false }]);
        const stored = await rows();
        assert.equal(stored.length, 1, `exactly 1 row stored (got ${stored.length})`);
        assert.equal(stored[0].kind, "draft");
        assert.equal(stored[0].data.char_count, 90);
        assert.equal(stored[0].data.word_count, 19);
        assert.equal(stored[0].data.text, GOOD, "the draft text is stored untouched");
        console.log(`    D write: refused -> exit 2, 0 rows; GOOD -> 1 row ${stored[0].id}, 90/19`);
      } finally {
        await fetch(`${url}/rest/v1/humor_records?session_name=eq.${encodeURIComponent(session)}`, { method: "DELETE", headers: svc });
        const left = await rows();
        assert.equal(left.length, 0, `${left.length} fixture row(s) left behind under ${session}`);
        console.log(`    D fixtures ${session} deleted, 0 rows left`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
