// DeepBench v7.0.1120 | tests/regression/agt-806-store-f-nathan.test.mjs | AGT-805/806 -- Nathan reads store F on every pmm render, his four writer slugs feed market_term entries, and store F's goals and target roles never reach one of his records
// Kickoff: docs/kickoffs/v7.0.1120-AGT-806-store-f-nathan.md section 5, T4.
//
//   A  WRITERS (pure) -- STORE_F_WRITERS holds pmm-competitors, pmm-feature-signals, pmm-customer-profile and
//      pmm-feature-benefits; pmm-release-notes (a reader only) is absent (control); storeFWriteErrors refuses
//      market_terms on pmm-release-notes and passes the same term on pmm-competitors (control).
//   B  LEAK GUARD (pure) -- storeFLeakErrors refuses a record quoting a Goals line (in its body) and a record
//      quoting a Target roles line (in a data leaf, re-wrapped and re-cased), and passes a record quoting
//      neither, a record quoting a line of a non-private section (control) and a short private line (< 20).
//   C  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun) -- the nathan pmm-competitors and
//      pmm-release-notes renders exit 0 and carry store_f.offering.text with
//      `Any product management role that manages a team`, placed after `ask` (before `since`).
//   D  LIVE -- nathan holds the career_offering and market_term grants, and the default intents of the four
//      pmm writer slugs contain `STORE F VOCABULARY`.
//
// Pre-change on the unchanged tree: storeFLeakErrors is not exported by market-agent.js, so the module fails to
// link and every arm is red; the pmm-competitors render carries no store_f key.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { STORE_F_WRITERS, storeFWriteErrors } from "../../scripts/personal-agent.js";
import { storeFLeakErrors, storeFPrivateLines } from "../../scripts/market-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(ROOT, "scripts", "market-agent.js");
const lf = t => String(t).replace(/\r\n/g, "\n");
const PHRASE = "Any product management role that manages a team";
const PMM_WRITERS = ["pmm-competitors", "pmm-feature-signals", "pmm-customer-profile", "pmm-feature-benefits"];

// A fixture offering in the joinSections shape (`## heading\nbody`, sections joined by a blank line).
const GOAL = "Path B: a product management role paying $300K a year by 2027-11.";
const ROLE = "Any product management role that manages a team, whatever the title: Head of Product.";
const PUBLIC = "Never word anything in public as job-seeking, ever at all.";
const OFFERING = [
  "## # Store F: fixture\nPrivate to the Business team.\n",
  `## Goals\n- Path A: a value exit of at least $2M within 2 years.\n- ${GOAL}\n- Short line.\n`,
  `## Target roles\n- ${ROLE}\n`,
  `## Public rules\n- ${PUBLIC}\n`,
].join("\n\n");
const term = { term: "Product Operations Lead", matches: "ran the product org", in_his_words: "product leadership", strength: "strong" };

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt806-"));
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const live = Boolean(url && key);

  try {
    await arm("A writers", async () => {
      for (const s of PMM_WRITERS) assert.ok(STORE_F_WRITERS.includes(s), `STORE_F_WRITERS holds ${s}`);
      assert.ok(!STORE_F_WRITERS.includes("pmm-release-notes"), "control: pmm-release-notes is a reader only");
      const answer = { records_to_write: [], napkin_notes: [], napkin_left: [], market_terms: [term] };
      assert.ok(storeFWriteErrors(answer, "pmm-release-notes").some(x => /reads store F only/.test(x)), "market_terms on pmm-release-notes are refused");
      assert.deepEqual(storeFWriteErrors(answer, "pmm-competitors"), [], "control: the same term on pmm-competitors passes");
    });

    await arm("B leak guard", async () => {
      const lines = storeFPrivateLines(OFFERING);
      assert.ok(lines.includes(GOAL) && lines.includes(ROLE), `the Goals and Target roles lines are private (got ${JSON.stringify(lines)})`);
      assert.ok(!lines.includes(PUBLIC), "control: a Public rules line is not private");
      assert.ok(!lines.some(l => l.startsWith("Short line")), "control: a line under 20 characters is not counted");
      const goal = storeFLeakErrors([{ kind: "competitor", title: "Rival", body: `We note: ${GOAL} More text.` }], OFFERING);
      assert.equal(goal.length, 1, `a record quoting the Goals line is refused (got ${JSON.stringify(goal)})`);
      assert.match(goal[0], /records_to_write\[0\].*Path B/);
      const wrapped = ROLE.toUpperCase().replace(/, /g, ",\n  ");
      const role = storeFLeakErrors([{ kind: "message", title: "ok", body: null }, { kind: "message", title: "Pitch", data: { lines: ["x", { quote: wrapped }] } }], OFFERING);
      assert.equal(role.length, 1, `a data leaf quoting the Target roles line (re-wrapped, re-cased) is refused (got ${JSON.stringify(role)})`);
      assert.match(role[0], /records_to_write\[1\]/);
      assert.deepEqual(storeFLeakErrors([{ kind: "competitor", title: "Rival", body: "A product role elsewhere.", data: { note: "Short line." } }], OFFERING), [], "control: a record quoting neither passes");
      assert.deepEqual(storeFLeakErrors([{ kind: "message", title: "Rule", body: PUBLIC }], OFFERING), [], "control: a non-private section line passes");
      assert.deepEqual(storeFLeakErrors([{ kind: "competitor", title: "x", body: GOAL }], ""), [], "control: no offering text refuses nothing");
    });

    const svc = { apikey: key, Authorization: `Bearer ${key}` };
    const get = async q => {
      const r = await fetch(`${url}/rest/v1/${q}`, { headers: svc });
      assert.equal(r.status, 200, `GET ${q.split("?")[0]} HTTP ${r.status}`);
      return r.json();
    };

    await arm("C live renders", async () => {
      if (!live) {
        notRun("AGT-806 arm C (the two nathan pmm renders)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the Library is unreadable here, so the live half is UNVERIFIED. Arms A-B DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const sizes = [];
      for (const cap of ["pmm-competitors", "pmm-release-notes"]) {
        const out = path.join(tmp, `${cap}.md`);
        const r = spawnSync(process.execPath, [SCRIPT, "--render", "--agent=nathan", `--capability=${cap}`, "--ask=store F check", `--out=${out}`, "--json"],
          { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 240000 });
        assert.equal(r.status, 0, `${cap} render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
        const lines = lf(fs.readFileSync(out, "utf8")).split("\n");
        const si = lines.findIndex(l => l.startsWith("store_f: "));
        assert.ok(si >= 0, `${cap}: the render carries a store_f key`);
        const sf = JSON.parse(lines[si].slice("store_f: ".length));
        assert.ok(sf?.offering?.text?.includes(PHRASE), `${cap}: store_f.offering.text carries the target-roles line`);
        const ai = lines.findIndex(l => l.startsWith("ask: "));
        const ni = lines.findIndex(l => l.startsWith("since: "));
        assert.ok(ai >= 0 && ai < si, `${cap}: store_f follows ask (ask ${ai}, store_f ${si})`);
        if (ni >= 0) assert.ok(si < ni, `${cap}: store_f precedes since`);
        sizes.push(`${cap} ${JSON.parse(r.stdout.trim().split("\n").pop()).prompt_bytes}`);
      }
      console.log(`    C renders: ${sizes.join(", ")}`);
    });

    await arm("D live grants and intents", async () => {
      if (!live) {
        notRun("AGT-806 arm D (nathan's grants and the four intents)", "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the rows are unreadable here, UNVERIFIED");
        return;
      }
      const grants = await get("personal_source_grants?agent_id=eq.nathan&select=kind");
      for (const k of ["career_offering", "market_term"]) assert.ok(grants.some(g => g.kind === k), `nathan holds the ${k} grant`);
      const caps = await get(`capabilities?slug=in.(${PMM_WRITERS.join(",")})&tenant_id=eq.global&select=slug,default_intent_slug`);
      assert.equal(caps.length, PMM_WRITERS.length, `every pmm writer has a capabilities row (got ${caps.length})`);
      const rows = await get(`skill_profiles?slug=in.(${caps.map(c => c.default_intent_slug).join(",")})&select=slug,method`);
      for (const c of caps) {
        const row = rows.find(r => r.slug === c.default_intent_slug);
        assert.ok(row, `${c.slug}: its intent ${c.default_intent_slug} exists`);
        assert.ok(String(row.method ?? "").includes("STORE F VOCABULARY"), `${c.slug}: intent ${row.slug} carries STORE F VOCABULARY`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
