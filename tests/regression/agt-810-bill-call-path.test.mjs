// DeepBench v7.0.1123 | tests/regression/agt-810-bill-call-path.test.mjs | AGT-810 -- the sales store's call path: read map, write checks, reminders, crawl plan, runbook blocks, two live renders
// Kickoff: docs/kickoffs/v7.0.1123-AGT-810-bill-call-path.md section 5, T4 (arm lists: docs/harvests/AGT-810.md H4).
//
//   A  MAPS (pure) -- SALES_READ_MAP holds exactly the three sales slugs and no list holds `agency`; storeFor('sales-scan')
//      reads sales_records (control: writing-draft reads writing_records); store_f is each sales slug's first extra read;
//      the scan filter drops a `no` source and keeps a `partly` one; the script names no agent id outside `//` lines
//      (control: the same check fails with `const a = 'bill';` spliced in) and never calls api.anthropic.com.
//   B  WRITE CHECKS (pure) -- validateSalesAnswer: a new solicitation plus its rating passes; eight refusals, each passing
//      once repaired.
//   C  REMINDERS (pure) -- salesRemindersDue, today 2026-12-01: due 12-09 -> 10, 12-03 -> 3, 12-20 -> none, a newest Pass
//      -> none, a stored 10-day reminder -> none.
//   D  CRAWL PLAN (pure) -- planCrawl: yes/yes patches exactly five keys and plans one source; yes/no one patch, no source;
//      a known page no source; three refusals.
//   E  RUNBOOK -- two prompt blocks; line 1 of each equals strategy-agent.md line 102 (control: one character off fails);
//      both crons; no `claude-`, no `trig_`.
//   F  LIVE (SUPABASE_URL + SUPABASE_SERVICE_KEY, else notRun), read-only -- the sales-scan render exits 0 under 200000
//      bytes; the --crawl=5 render exits 0 with 5 agencies, each with a website_url.
//
// Pre-change on the unchanged tree: the named imports below do not exist, so the module fails to link and every arm
// is red; a sales-scan render exits 2 with `is not in the read map`.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  SALES_READ_MAP, EXTRA_READS, KIND_FILTERS, storeFor, validateSalesAnswer, salesRemindersDue, planCrawl,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "gov-sales-agent.md");
const STRATEGY = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");
const lf = t => String(t).replace(/\r\n/g, "\n");
const AGENT_ID = ["b", "i", "l", "l"].join("");
const namesAgent = src => lf(src).split("\n").some(l => !/^\s*\/\//.test(l) && l.includes(AGENT_ID));

const TODAY = "2026-12-01";
const sol = (key, extra = {}) => ({ kind: "solicitation", data: { key, agency: "Town A", due: "2026-12-20", url: `https://example.gov/bids/${key}`, ...extra }, created_at: "2026-11-20T10:00:00Z" });
const STORED = () => ({
  solicitations: [sol("K1")],
  ratings: [{ kind: "rating", data: { key: "K1", fit: "strong", why: "fits", profile: "company" }, created_at: "2026-11-20T10:05:00Z" }],
  statuses: [], reminders: [], sourceUrls: new Set(["https://example.gov/bids"]),
});
const rec = (kind, data, title = `${kind} t`) => ({ kind, title, data });
const NEW_SOL = rec("solicitation", { key: "K2", agency: "Town B", due: "2026-12-15", url: "https://example.gov/bids/K2" });
const NEW_RATING = rec("rating", { key: "K2", fit: "strong", why: "matches the KPI work", profile: "company" });
const check = (items, opts = {}, stored = STORED()) => validateSalesAnswer(opts.capability ?? "sales-scan", { records_to_write: items }, stored, { today: TODAY, ...opts });

const AGENCY_KEYS = ["key", "name", "type", "state", "city", "county", "function", "size", "size_kind", "website_found", "website_url",
  "website_census", "gov_domain", "solicitations_searched", "solicitations_page", "checked_at", "keep_looking"];
const agencyRow = (id, over = {}) => ({
  id, title: `Agency ${id}`,
  data: { key: `ag-${id}`, name: `Agency ${id}`, type: "city", state: "TX", city: "X", county: "Y", function: "general", size: 120, size_kind: "population",
    website_found: "not-yet", website_url: null, website_census: null, gov_domain: null, solicitations_searched: "not-yet", solicitations_page: null,
    checked_at: null, keep_looking: false, ...over },
});

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt810-"));
  const live = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

  try {
    await arm("A maps", async () => {
      assert.deepEqual(Object.keys(SALES_READ_MAP).sort(), ["sales-ask", "sales-rate", "sales-scan"]);
      for (const [s, kinds] of Object.entries(SALES_READ_MAP)) assert.ok(!kinds.includes("agency"), `${s} never reads agency`);
      assert.ok(!SALES_READ_MAP["sales-rate"].includes("source") && !SALES_READ_MAP["sales-rate"].includes("reminder"), "sales-rate reads no source and no reminder");
      assert.equal(storeFor("sales-scan").table, "sales_records");
      assert.equal(storeFor("writing-draft").table, "writing_records", "control: writing-draft reads writing_records");
      for (const s of Object.keys(SALES_READ_MAP)) assert.equal([].concat(EXTRA_READS[s])[0], "store_f", `${s} reads store_f first`);
      assert.equal(KIND_FILTERS["sales-scan"].source({ data: { readable: "no" } }), false, "a `no` source is dropped");
      assert.equal(KIND_FILTERS["sales-scan"].source({ data: { readable: "partly" } }), true, "a `partly` source is kept");
      const src = fs.readFileSync(AGENT, "utf8");
      assert.equal(namesAgent(src), false, "the script names no agent id outside // lines");
      assert.equal(namesAgent(src + `\nconst a = '${AGENT_ID}';\n`), true, "control: the check fires on a spliced agent id");
      assert.ok(!src.includes("api.anthropic.com"), "the script makes no model call");
    });

    await arm("B write checks", async () => {
      const ok = check([NEW_SOL, NEW_RATING]);
      assert.deepEqual(ok.errors, [], "a new solicitation plus its rating passes");
      const cases = [
        ["1 model status", () => check([rec("status", { key: "K1", status: "Interested" })]), /only the principal marks a status/,
          () => check([rec("status", { key: "K1", status: "Interested" })], { principal: true })],
        ["2 rating without why", () => check([NEW_SOL, rec("rating", { ...NEW_RATING.data, why: "" })]), /needs data\.why/,
          () => check([NEW_SOL, NEW_RATING])],
        ["3 solicitation without due", () => check([rec("solicitation", { ...NEW_SOL.data, due: undefined }), NEW_RATING]), /no YYYY-MM-DD due date/,
          () => check([NEW_SOL, NEW_RATING])],
        ["4 second rating", () => check([rec("rating", { key: "K1", fit: "weak", why: "changed", profile: "company" })]), /already rated/,
          () => check([rec("rating", { key: "K1", fit: "weak", why: "changed", profile: "company", amended: "2026-11-25" })])],
        ["5 stored solicitation key", () => check([rec("solicitation", { ...sol("K1").data })]), /already stored: write the rating alone/,
          () => check([rec("solicitation", { ...sol("K3").data })])],
        ["6 stored source url", () => check([rec("source", { url: "https://example.gov/bids" })]), /already a stored source/,
          () => check([rec("source", { url: "https://example.gov/other-bids" })])],
        ["7 reminder not due", () => check([rec("reminder", { key: "K1", days_out: 10 })]), /not a reminder due today/,
          () => { const s = STORED(); s.statuses.push({ kind: "status", data: { key: "K1", status: "Interested" }, created_at: "2026-11-21T00:00:00Z" });
            s.solicitations = [sol("K1", { due: "2026-12-09" })]; return check([rec("reminder", { key: "K1", days_out: 10, due: "2026-12-09" })], {}, s); }],
        ["8 Pass without reason", () => check([rec("status", { key: "K1", status: "Pass" })], { principal: true }), /a Pass needs data\.reason/,
          () => check([rec("status", { key: "K1", status: "Pass", reason: "out of region" })], { principal: true })],
      ];
      for (const [name, bad, re, repaired] of cases) {
        const r = bad();
        assert.equal(r.ok, false, `${name}: refused`);
        assert.ok(r.errors.some(e => re.test(e)), `${name}: names ${re} (got ${JSON.stringify(r.errors)})`);
        const g = repaired();
        assert.deepEqual(g.errors, [], `${name}: passes once repaired`);
      }
      // A later amendment must be later than the stored rating's own day (its created_at when it carries no amended).
      assert.equal(check([rec("rating", { key: "K1", fit: "weak", why: "w", profile: "company", amended: "2026-11-20" })]).ok, false, "an amendment on the same day is refused");
    });

    await arm("C reminders", async () => {
      const st = (due, statuses, reminders = []) => ({ solicitations: [sol("K", { due })], statuses, reminders, ratings: [], sourceUrls: new Set() });
      const interested = [{ kind: "status", data: { key: "K", status: "Interested" }, created_at: "2026-11-25T00:00:00Z" }];
      assert.deepEqual(salesRemindersDue(st("2026-12-09", interested), TODAY), [{ key: "K", days_out: 10, due: "2026-12-09" }]);
      assert.deepEqual(salesRemindersDue(st("2026-12-03", interested), TODAY), [{ key: "K", days_out: 3, due: "2026-12-03" }]);
      assert.deepEqual(salesRemindersDue(st("2026-12-20", interested), TODAY), [], "19 days out: none");
      const passed = [...interested, { kind: "status", data: { key: "K", status: "Pass", reason: "r" }, created_at: "2026-11-26T00:00:00Z" }];
      assert.deepEqual(salesRemindersDue(st("2026-12-09", passed), TODAY), [], "a newest Pass: none");
      assert.deepEqual(salesRemindersDue(st("2026-12-09", interested, [{ kind: "reminder", data: { key: "K", days_out: 10 } }]), TODAY), [], "a stored 10-day reminder: none");
    });

    await arm("D crawl plan", async () => {
      const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
      const rows = [agencyRow(A), agencyRow(B, { website_found: "yes", website_url: "https://b.gov" })];
      for (const r of rows) assert.deepEqual(Object.keys(r.data).sort(), [...AGENCY_KEYS].sort(), "the fixture carries all 17 keys");
      const yes = planCrawl({ agencies: [{ id: A, website_found: "yes", website_url: "https://a.gov", solicitations_searched: "yes", solicitations_page: "https://a.gov/bids" }] }, rows, new Set(), TODAY);
      assert.deepEqual(yes.errors, []);
      assert.equal(yes.patches.length, 1);
      const changed = AGENCY_KEYS.filter(k => JSON.stringify(yes.patches[0].data[k]) !== JSON.stringify(rows[0].data[k])).sort();
      assert.deepEqual(changed, ["checked_at", "solicitations_page", "solicitations_searched", "website_found", "website_url"], "exactly the five crawl keys change");
      assert.deepEqual(Object.keys(yes.patches[0].data).sort(), [...AGENCY_KEYS].sort(), "no key added or dropped");
      assert.equal(yes.sources.length, 1);
      assert.deepEqual(yes.sources[0], { kind: "source", title: `Agency ${A}`, data: { url: "https://a.gov/bids", type: "agency", state: "TX", agency_key: `ag-${A}`, readable: "yes", checked_at: TODAY } });
      const no = planCrawl({ agencies: [{ id: B, website_found: "yes", website_url: "https://b.gov", solicitations_searched: "no" }] }, rows, new Set(), TODAY);
      assert.deepEqual([no.errors.length, no.patches.length, no.sources.length], [0, 1, 0], "yes/no: one patch, no source");
      const known = planCrawl({ agencies: [{ id: A, website_found: "yes", website_url: "https://a.gov", solicitations_searched: "yes", solicitations_page: "https://a.gov/bids" }] }, rows, new Set(["https://a.gov/bids"]), TODAY);
      assert.deepEqual([known.patches.length, known.sources.length], [1, 0], "a page already stored plans no source");
      const refusals = [
        [{ id: "33333333-3333-4333-8333-333333333333", website_found: "no" }, /not an agency row/],
        [{ id: A, website_found: "maybe" }, /website_found must be yes or no/],
        [{ id: A, website_found: "yes", website_url: "https://a.gov", solicitations_searched: "yes" }, /needs an http\(s\) solicitations_page/],
      ];
      for (const [a, re] of refusals) {
        const r = planCrawl({ agencies: [a] }, rows, new Set(), TODAY);
        assert.ok(r.errors.some(e => re.test(e)), `refused: ${re} (got ${JSON.stringify(r.errors)})`);
        assert.deepEqual([r.patches.length, r.sources.length], [0, 0], "a refusal plans nothing");
      }
    });

    await arm("E runbook", async () => {
      const text = lf(fs.readFileSync(RUNBOOK, "utf8"));
      const step0 = lf(fs.readFileSync(STRATEGY, "utf8")).split("\n")[101];
      const blocks = [["BILL-SCAN-PROMPT-BEGIN", "BILL-SCAN-PROMPT-END"], ["BILL-CRAWL-PROMPT-BEGIN", "BILL-CRAWL-PROMPT-END"]];
      assert.equal((text.match(/^<!-- BILL-[A-Z]+-PROMPT-(BEGIN|END) -->$/gm) ?? []).length, 4, "exactly four marker lines (the table cites them inline)");
      for (const [b, e] of blocks) {
        const m = new RegExp(`<!-- ${b} -->\\n([\\s\\S]*?)\\n<!-- ${e} -->`).exec(text);
        assert.ok(m, `${b}: a block`);
        const first = m[1].split("\n")[0];
        assert.equal(first, step0, `${b}: line 1 is strategy-agent.md line 102`);
        assert.notEqual(first.slice(0, -1) + "x", step0, `control: ${b} with one character changed does not match`);
      }
      assert.ok(text.includes("30 10 * * 1,4"), "the scan cron");
      assert.ok(text.includes("0 6-10 * * *"), "the crawl cron");
      assert.ok(!text.includes("claude-"), "no model id");
      assert.ok(!text.includes("trig_"), "no routine id");
    });

    await arm("F live renders", async () => {
      if (!live) {
        notRun("AGT-810 arm F (the sales-scan render and the --crawl=5 batch)",
          "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the sales store is unreadable here, so the live half is UNVERIFIED. Arms A-E DID run. Credentialed run: STANDARDS.md Section 2 rule 5");
        return;
      }
      const go = extra => spawnSync(process.execPath, [AGENT, "--render", `--agent=${AGENT_ID}`, "--capability=sales-scan", ...extra],
        { encoding: "utf8", env: { ...process.env }, maxBuffer: 1 << 26, timeout: 240000 });
      const out = path.join(tmp, "scan.md");
      const r = go([`--out=${out}`, "--json"]);
      assert.equal(r.status, 0, `sales-scan render exits 0 (got ${r.status}: ${(r.stderr ?? "").slice(-400)})`);
      const j = JSON.parse(r.stdout.trim().split("\n").pop());
      assert.ok(typeof j.model === "string" && j.model, "the render prints a model");
      assert.ok(j.prompt_bytes > 0 && j.prompt_bytes < 200000, `prompt_bytes ${j.prompt_bytes} under 200000`);
      const c = go(["--crawl=5"]);
      assert.equal(c.status, 0, `--crawl=5 render exits 0 (got ${c.status}: ${(c.stderr ?? "").slice(-400)})`);
      const batch = JSON.parse(c.stdout.trim());
      assert.equal(batch.crawl, true);
      assert.equal(batch.agencies.length, 5, `5 agencies (got ${batch.agencies.length})`);
      for (const a of batch.agencies) assert.ok(/^https?:\/\//.test(a.website_url ?? ""), `${a.id} carries a website_url`);
      console.log(`    F renders: sales-scan ${j.prompt_bytes} bytes on ${j.model}; crawl batch 5`);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
