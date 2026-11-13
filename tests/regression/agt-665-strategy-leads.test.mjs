// DeepBench v7.0.1019 | tests/regression/agt-665-strategy-leads.test.mjs | AGT-665
// Kickoff: docs/kickoffs/v7.0.1019-AGT-665-strategy-market-check-leads.md section 5, T3. Offline.
//
//   A  marketCheckLeads -- only offer/roadmap competitors shipping yes|partial become leads; the name is
//      cut at its first " (" (the model's remark); keys are LEAD_COLUMNS; seen_on is the check date when
//      it is a day, else today; nothing of the record's title, body or price crosses.
//   B  newLeads -- a lead on the competitor list (name equal, name + space prefix, or domain host match)
//      or already in the inbox (company or URL host) is skipped, and so is a repeat within the batch.
//   C  validateStrategyAnswer -- a non-https or tracking-form competitor url refuses the answer.
//   D  fileNewLeads -- 2 reads then 1 insert into market_leads; an empty batch makes no call; in
//      writeStrategy the leads are filed after the strategy_records insert, inside `if (inserted.length)`.
//   E  the runbook names the new stdout key.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  LEAD_COLUMNS, validateStrategyAnswer, marketCheckLeads, newLeads, fileNewLeads,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENT = path.join(ROOT, "scripts", "personal-agent.js");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "strategy-agent.md");

const C = (name, url, ships) => ({ name, url, ships });
const mc = (checked_on, ...competitors) => ({ market_check: { checked_on, verdict: 'parity', competitors } });
const fx = acme => ({ records_to_write: [
  { kind: 'offer', title: 'Client X at $9,000', body: 'private', data: mc('2026-11-12', C('Acme (cheaper than Client X)', acme, 'yes'), C('ACME', 'https://a2.example', 'partial'),
    C('Bo', 'https://b.example', 'no'), C('Hazel', 'https://n.example', 'partial'), C('Linked', 'https://www.linkedin.com/company/l', 'yes')) },
  { kind: 'roadmap', title: 'r', data: mc('soon', C('Quill', 'https://q.example', 'partial'), C('Old Lead', 'https://old.example', 'yes'), C('Domco', 'https://app.domco.example/x', 'yes')) },
  { kind: 'brief', title: 'b', data: mc('soon', C('Never', 'https://v.example', 'yes')) }] });
const FX = fx('https://www.acme.example/p');
const LIST = [{ name: 'Hazel AI - city tool', domain: 'domco.example' }];
const INBOX = [{ company: 'old lead', public_url: 'https://www.linkedin.com/jobs/view/1/' }];

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };
  const B = marketCheckLeads(FX, 'strategy-advise', '2026-11-13', 's1');

  await arm("A marketCheckLeads", async () => {
    assert.equal(B.length, 7, "seven leads");
    assert.deepEqual(B.map(l => l.company), ['Acme', 'ACME', 'Hazel', 'Linked', 'Quill', 'Old Lead', 'Domco']);
    for (const [i, row] of B.entries()) assert.deepEqual(Object.keys(row), LEAD_COLUMNS, `row ${i} keys are LEAD_COLUMNS`);
    assert.equal(B[0].overlap_with_deepbench, 'Strategy market check: ships yes on an offer line');
    assert.ok(B[4].overlap_with_deepbench.endsWith('partial on a roadmap line'), `B[4] overlap: ${B[4].overlap_with_deepbench}`);
    for (const i of [0, 1, 2, 3]) assert.equal(B[i].seen_on, '2026-11-12', `row ${i} seen_on is the check date`);
    for (const i of [4, 5, 6]) assert.equal(B[i].seen_on, '2026-11-13', `row ${i} seen_on falls back to today`);
    assert.equal(B[0].source_capability, 'strategy-advise');
    assert.equal(B[0].status, 'new');
    assert.equal(B[0].session_name, 's1');
    assert.equal(B[0].what_they_sell, null);
    assert.doesNotMatch(JSON.stringify(B), /Client X|9,000|private|cheaper/);
  });

  await arm("B newLeads", async () => {
    assert.deepEqual(newLeads(B, LIST, INBOX).map(l => l.company), ['Acme', 'Quill']);
    assert.equal(newLeads(B).length, 6, "control: no list, no inbox -- only the batch repeat ACME is skipped");
  });

  await arm("C write check", async () => {
    const r = validateStrategyAnswer(FX);
    assert.equal(r.ok, true, `FX passes (errors: ${JSON.stringify(r.errors)})`);
    const http = validateStrategyAnswer(fx('http://acme.example'));
    assert.equal(http.ok, false, "http url refused");
    assert.ok(http.errors.some(e => /not an https/.test(e)), JSON.stringify(http.errors));
    const tr = validateStrategyAnswer(fx('https://acme.example/?trackingId=1'));
    assert.equal(tr.ok, false, "tracking url refused");
    assert.ok(tr.errors.some(e => /tracking form/.test(e)), JSON.stringify(tr.errors));
  });

  await arm("D fileNewLeads", async () => {
    const calls = [];
    const db = {
      get: async q => {
        calls.push(['get', q]);
        return q.startsWith('market_records') ? LIST.map(c => ({ title: c.name, data: { domain: c.domain } })) : INBOX;
      },
      insert: async (table, rows) => { calls.push(['insert', table]); return rows; },
    };
    const out = await fileNewLeads(db, B);
    assert.equal(out.length, 2, "two leads filed");
    assert.deepEqual(out.map(l => l.company), ['Acme', 'Quill']);
    assert.deepEqual(calls.map(c => c[0]), ['get', 'get', 'insert']);
    assert.ok(calls[0][1].startsWith('market_records'), calls[0][1]);
    assert.ok(calls[1][1].startsWith('market_leads'), calls[1][1]);
    assert.equal(calls[2][1], 'market_leads');
    calls.length = 0;
    assert.deepEqual(await fileNewLeads(db, []), []);
    assert.equal(calls.length, 0, "an empty batch makes no call");
    const src = fs.readFileSync(AGENT, "utf8");
    const at = src.indexOf("async function writeStrategy(");
    assert.ok(at > 0, "writeStrategy found");
    const ins = src.indexOf("db.insert('strategy_records'", at);
    const gate = src.indexOf("if (inserted.length) {", ins);
    const file = src.indexOf("fileNewLeads(", gate);
    assert.ok(ins > at && gate > ins && file > gate, `order insert ${ins} < gate ${gate} < fileNewLeads ${file}`);
  });

  await arm("E runbook", async () => {
    assert.ok(fs.readFileSync(RUNBOOK, "utf8").includes("updated, leads}"), "runbook names leads");
  });

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
