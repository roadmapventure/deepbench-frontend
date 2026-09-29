// DeepBench v7.0.728 | tests/regression/agt-156-linkedin-alerts-routine.test.mjs | AGT-156 -- the
// jerry-linkedin-alerts routine, repo half. docs/runbooks/personal-agent.md section (e) is the
// SOURCE and the cloud routine is the copy (ARCHITECTURE.md §19v); scripts/check-routine-prompt.js
// is what compares the two. Creating the routine itself is ATTENDED work (Dev Manager ruling
// 2026-09-28), so nothing here depends on it existing and the registry id is null by design.
// Kickoff: docs/kickoffs/v7.0.728-AGT-156-jerry-linkedin-alerts-routine.md §5 tasks 1-6, §6.
//
//   A  DRIFT -- the real block as --prompt -> exit 0, findings []; one character changed at block
//      line 2 -> exit 1, ONE finding, location 1 routine/jerry-linkedin-alerts/prompt (the NAME,
//      because the routine does not exist yet and its id is null); a copy of the runbook with a
//      marker line removed -> exit 2.
//   B  CONTENT -- the block carries docs/runbooks/personal-agent.md, --fetch-linkedin-alerts,
//      career-linkedin-alerts, YAHOO_IMAP_USER, "Yahoo connection failed", "7 days" and the ticket's
//      Q4 NEVER list verbatim; it carries NO model id, NO trigger id and NO `<lower case>`
//      placeholder. Each forbidden pattern is proved to have teeth on a deliberately violating copy
//      of the same text (LOO-013).
//   C  REGISTRY -- ROUTINES["jerry-linkedin-alerts"] has id null, file personal-agent.md and both
//      marker lines; the five pre-existing ids are byte-unchanged.
//   D  CHANNEL (credentialed, else notRun) -- postingChannel() splits by `source`, then two real
//      fixture postings prove the two reads end to end: the career-market-watch render carries the
//      alert posting and NOT the board control and every posting it carries is channel
//      "linkedin-alert", while career-growth-review carries both channels. The fixtures are deleted
//      in `finally` and the deletion is asserted.
//
// Pre-change on the unchanged tree: --routine=jerry-linkedin-alerts exits 2 (no registry entry, no
// block) so arms A-C throw, and Sunday's READ_MAP has no `posting` key at all so arm D's render
// carries neither fixture. The CONTROL that gives arm D its teeth: adding `posting` to Sunday's
// READ_MAP *without* the channel filter carries BOTH postings and fails arm D -- it is the filter
// that is under test, not the read.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { selfRun, notRun } from "./_lib/self-run.js";
import { ROUTINES } from "../../scripts/check-routine-prompt.js";
import { postingChannel, READ_MAP, KIND_FILTERS } from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "check-routine-prompt.js");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "personal-agent.md");
const BEGIN = "<!-- JERRY-LINKEDIN-ALERTS-PROMPT-BEGIN -->";
const END = "<!-- JERRY-LINKEDIN-ALERTS-PROMPT-END -->";
const RUN = randomUUID().slice(0, 8);
const lf = t => String(t).replace(/\r\n/g, "\n");

// The ticket's Q4 NEVER list, verbatim from backlog_items.AGT-156.description (walkthrough
// 2026-09-25). The block must carry it word for word -- a paraphrase is a different rule.
const NEVER_LIST =
  "NEVER apply/message/contact anyone, click email links (tracking - rebuild the public job URL " +
  "from the job id), log into LinkedIn or any job site, change the mailbox, share personal data " +
  "outside career_records, spend money.";

function blockLines(md) {
  const lines = lf(md).split("\n");
  const a = lines.indexOf(BEGIN), b = lines.indexOf(END);
  assert.ok(a >= 0 && b > a, "jerry-linkedin-alerts prompt markers present");
  return lines.slice(a + 1, b);
}

function check(args, opts = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", ...opts });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt156-"));
  const write = (n, t) => { const p = path.join(tmp, n); fs.writeFileSync(p, t); return p; };
  const readOut = p => JSON.parse(fs.readFileSync(p, "utf8"));
  const md = fs.readFileSync(RUNBOOK, "utf8");
  const lines = blockLines(md);
  const block = lines.join("\n");

  try {
    await arm("A drift", async () => {
      const okOut = path.join(tmp, "a.json");
      const r0 = check(["--routine=jerry-linkedin-alerts", `--prompt=${write("a.txt", block)}`, `--out=${okOut}`]);
      assert.equal(r0.code, 0, `exit 0 on the real block (got ${r0.code}: ${r0.stderr})`);
      const j = readOut(okOut);
      assert.deepEqual(j.findings, [], "no findings on the real block");
      assert.equal(j.found_by, "check-routine-prompt:jerry-linkedin-alerts");
      assert.deepEqual([j.carried, j.gone], [[], []]);

      // Block line 2 is the blank paragraph separator. Drifting it is the stronger control: a
      // comparator that collapsed blank lines would pass a prompt whose paragraphs had run together.
      assert.equal(lines[1], "", "block line 2 is the blank paragraph separator");
      const d = [...lines];
      d[1] = "X";
      const dOut = path.join(tmp, "b2.json");
      const r1 = check(["--routine=jerry-linkedin-alerts", `--prompt=${write("b2.txt", d.join("\n"))}`, `--out=${dOut}`]);
      assert.equal(r1.code, 1, `exit 1 on drift (got ${r1.code}: ${r1.stderr})`);
      const f = readOut(dOut).findings;
      assert.equal(f.length, 1, "exactly one finding");
      assert.equal(f[0].check_slug, "routine-prompt-drift");
      assert.equal(f[0].kind, "contradiction");
      assert.equal(f[0].confidence, "high");
      assert.equal(f[0].locations[0].location, "routine/jerry-linkedin-alerts/prompt",
        "an id-less routine locates by NAME, never by the string 'null'");
      assert.ok(!f[0].locations[0].location.includes("null"), "no `routine/null/prompt`");
      assert.equal(f[0].locations[0].text, "X", "location 1 quotes the first differing live line");
      assert.match(f[0].locations[1].location, /^docs\/runbooks\/personal-agent\.md:\d+$/);
      const repoNo = Number(f[0].locations[1].location.split(":")[1]);
      assert.equal(lf(md).split("\n")[repoNo - 1], lines[1], "the repo line number points at that line");

      // A runbook COPY with the BEGIN marker line removed is a check that cannot run: exit 2, never
      // a silent pass and never a finding. Run against a scratch ROOT so the real file is untouched.
      const fakeRoot = path.join(tmp, "root");
      fs.mkdirSync(path.join(fakeRoot, "docs", "runbooks"), { recursive: true });
      fs.mkdirSync(path.join(fakeRoot, "scripts"), { recursive: true });
      fs.copyFileSync(SCRIPT, path.join(fakeRoot, "scripts", "check-routine-prompt.js"));
      fs.writeFileSync(path.join(fakeRoot, "docs", "runbooks", "personal-agent.md"),
        lf(md).split("\n").filter(l => l !== BEGIN).join("\n"));
      const r2 = spawnSync(process.execPath,
        [path.join(fakeRoot, "scripts", "check-routine-prompt.js"), "--routine=jerry-linkedin-alerts",
         `--prompt=${write("c.txt", block)}`], { cwd: ROOT, encoding: "utf8" });
      assert.equal(r2.status, 2, `a missing marker line exits 2 (got ${r2.status})`);
      assert.match(r2.stderr, /must be a whole line exactly once/, "the reason names the marker rule");
      // Control: the same scratch root WITH the marker intact still exits 0, so the exit 2 above is
      // the missing marker and not the copied tree.
      fs.writeFileSync(path.join(fakeRoot, "docs", "runbooks", "personal-agent.md"), md);
      const r3 = spawnSync(process.execPath,
        [path.join(fakeRoot, "scripts", "check-routine-prompt.js"), "--routine=jerry-linkedin-alerts",
         `--prompt=${write("c2.txt", block)}`], { cwd: ROOT, encoding: "utf8" });
      assert.equal(r3.status, 0, `control: the intact copy exits 0 (got ${r3.status}: ${r3.stderr})`);
    });

    await arm("B content", async () => {
      for (const s of ["docs/runbooks/personal-agent.md", "--fetch-linkedin-alerts",
                       "career-linkedin-alerts", "YAHOO_IMAP_USER", "YAHOO_IMAP_APP_PASSWORD",
                       "Yahoo connection failed", "7 days"]) {
        assert.ok(block.includes(s), `the block carries ${JSON.stringify(s)}`);
      }
      assert.ok(block.includes(NEVER_LIST),
        "the block carries the ticket's Q4 NEVER list verbatim, not a paraphrase");
      const forbidden = [
        ["a model id", /claude-[a-z]+-\d/, "claude-opus-5"],
        ["a trigger id", /trig_/, "trig_01BCzPdanZ1YiK956dAqU6YN"],
        ["an unfilled placeholder", /<[a-z ]+>/, "<routine id>"],
      ];
      for (const [what, re, violation] of forbidden) {
        assert.ok(!re.test(block), `the block carries no ${what}`);
        // Teeth: the same pattern DOES fire on a copy that violates it, so a green arm above means
        // the block is clean -- not that the regex never matches anything (LOO-013).
        assert.ok(re.test(block + "\n" + violation), `control: ${what} is detectable when present`);
      }
      // The secrets are named, never valued: no line carries an `=` assignment of either name.
      for (const name of ["YAHOO_IMAP_USER", "YAHOO_IMAP_APP_PASSWORD"]) {
        assert.ok(!new RegExp(`${name}\\s*=`).test(block), `${name} is named, never assigned a value`);
      }
      assert.ok(block.includes("public.runner_secrets"), "the block says where the secrets are read from");
      // The Q5 order, as the summary step states it.
      const step3 = lines.find(l => l.startsWith("Step 3"));
      assert.ok(step3, "the block carries a step 3");
      const order = ["scam warnings", "Apply now", "Apply with prep", "Watch and Skip", "leads sent", "nothing new"];
      let at = -1;
      for (const s of order) {
        const i = step3.indexOf(s);
        assert.ok(i > at, `the summary names ${JSON.stringify(s)} after ${JSON.stringify(order[order.indexOf(s) - 1] ?? "the start")}`);
        at = i;
      }
    });

    await arm("C registry", async () => {
      const r = ROUTINES["jerry-linkedin-alerts"];
      assert.ok(r, "ROUTINES carries jerry-linkedin-alerts");
      assert.equal(r.id, null, "no id until the attended session creates the routine");
      assert.equal(r.file, "personal-agent.md");
      assert.equal(r.begin, BEGIN);
      assert.equal(r.end, END);
      // The five pre-existing entries are byte-unchanged -- adding a routine moves nothing else.
      assert.equal(ROUTINES.runner.id, "trig_017TZ3JZcLBK6AYH6DKURqMH", "runner id unchanged");
      assert.equal(ROUTINES.auditor.id, "trig_01BCzPdanZ1YiK956dAqU6YN", "auditor id unchanged");
      assert.equal(ROUTINES.researcher.id, "trig_01862LsK4ZQF8PTgQoK2cgCV", "researcher id unchanged");
      // model-watch's id was filled on 2026-09-29 by attended session status-0929 (commit a370dbe4),
      // which landed on origin/dev while this build was in flight. It is pinned at its CURRENT value
      // -- that is what "pre-existing ids byte-unchanged" asserts -- and its move from null to a real
      // id is the precedent this routine follows, not a thing this ticket may change.
      assert.equal(ROUTINES["model-watch"].id, "trig_01QTxphS7u5dzD5HdChCBzjV", "model-watch id unchanged");
      assert.equal(ROUTINES.market.id, "trig_015K3zgtnMztuNritHxC6uSW", "market id unchanged");
    });

    await arm("D channel", async () => {
      // The pure half first: the derivation itself, both directions.
      assert.equal(postingChannel({ source: "career-linkedin-alerts 2026-09-29" }), "linkedin-alert");
      assert.equal(postingChannel({ source: "fetch-linkedin-alerts 2026-09-29" }), "linkedin-alert");
      assert.equal(postingChannel({ source: "fetch-postings 2026-09-29" }), "board");
      assert.equal(postingChannel({ source: "career-market-watch 2026-09-29" }), "board");
      assert.equal(postingChannel({}), "board", "no source at all is a board posting");
      // The record readRecords pushes carries the label and never the raw stamp, so the label is
      // read first -- exactly as postingOrigin (§19d/§19e Rule #1).
      assert.equal(postingChannel({ channel: "linkedin-alert" }), "linkedin-alert");
      assert.equal(postingChannel({ channel: "board", source: "career-linkedin-alerts 2026-09-29" }), "board");
      // The seam the filter sits on: Sunday reads postings, and reads only the alert channel.
      assert.ok(READ_MAP["career-market-watch"].includes("posting"), "Sunday's READ_MAP reads postings");
      const mw = KIND_FILTERS["career-market-watch"];
      assert.equal(mw.posting({ source: "career-linkedin-alerts 2026-09-29" }), true);
      assert.equal(mw.posting({ source: "fetch-postings 2026-09-29" }), false);

      const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_KEY ?? "";
      if (!url || !key) {
        notRun("AGT-156 arm D (the two renders on real fixture postings)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- career_records is unreadable and unwritable here, so the end-to-end half of the channel split is UNVERIFIED. The derivation and the filter above DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const rest = async (q, init) => {
        const res = await fetch(`${url}/rest/v1/${q}`,
          { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, ...(init?.headers ?? {}) } });
        const text = await res.text();
        if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${q} -> HTTP ${res.status} ${text.slice(0, 240)}`);
        return text ? JSON.parse(text) : [];
      };
      const agent = (args) => {
        const r = spawnSync(process.execPath, [AGENT, ...args], { cwd: ROOT, encoding: "utf8" });
        if (r.status !== 0) throw new Error(`personal-agent ${args[0]} exited ${r.status}: ${(r.stderr ?? "").slice(-400)}`);
        return r;
      };
      const t = "agt-156-regression-" + RUN;
      try {
        const answer = title => JSON.stringify({ records_to_write: [
          { kind: "posting", title, body: "AGT-156 regression fixture", data: { status: "reviewed" } },
        ] });
        agent(["--write", "--agent=jerry", "--capability=career-linkedin-alerts",
               `--session-name=${t}`, `--answer=${write("fixture.json", answer("AGT-156 fixture posting"))}`]);
        agent(["--write", "--agent=jerry", "--capability=career-market-watch",
               `--session-name=${t}`, `--answer=${write("control.json", answer("AGT-156 control posting"))}`]);

        const renderOf = slug => {
          const out = path.join(tmp, `${slug}.md`);
          agent(["--render", "--agent=jerry", `--capability=${slug}`, `--out=${out}`, "--json"]);
          return fs.readFileSync(out, "utf8");
        };
        const channels = text => [...new Set([...text.matchAll(/"channel"\s*:\s*"([a-z-]+)"/g)].map(m => m[1]))].sort();

        const sunday = renderOf("career-market-watch");
        assert.ok(sunday.includes("AGT-156 fixture posting"),
          "Sunday's render carries the alert posting");
        assert.ok(!sunday.includes("AGT-156 control posting"),
          "Sunday's render must NOT carry the board control -- this is the assertion the un-filtered READ_MAP fails");
        assert.deepEqual(channels(sunday), ["linkedin-alert"],
          `every posting Sunday carries is channel linkedin-alert (got ${JSON.stringify(channels(sunday))})`);

        const monday = renderOf("career-growth-review");
        assert.ok(monday.includes("AGT-156 fixture posting"), "Monday's render carries the alert posting");
        assert.ok(monday.includes("AGT-156 control posting"), "Monday's render carries the board control too");
        assert.deepEqual(channels(monday), ["board", "linkedin-alert"],
          `Monday carries BOTH channels (got ${JSON.stringify(channels(monday))})`);
      } finally {
        await rest(`career_records?session_name=eq.${encodeURIComponent(t)}`, { method: "DELETE" });
        const left = await rest(`career_records?session_name=eq.${encodeURIComponent(t)}&select=id`);
        assert.equal(left.length, 0, `${left.length} fixture row(s) left behind under ${t}`);
        console.log(`    D fixtures ${t} deleted, 0 rows left`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
