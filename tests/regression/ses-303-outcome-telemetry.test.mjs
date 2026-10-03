// DeepBench v7.0.382 | tests/regression/ses-303-outcome-telemetry.test.mjs | SES-303 (M5 required set)
//
// Outcome telemetry, Shape B (John 2026-09-02, verbatim "b"): one platform scoreboard stamped at every
// ship; a ticket's verdict is read off the series around its ship. Two arms:
//
//   * DOC arm (always runs): runner-cycle.md's step-7 close-out and session-setup.md's step 4 both
//     name the stamp call (snapshot_platform_scoreboard), and the M5 register records that M5-12's
//     72-hour observation now has an instrument. Negative controls per clause.
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): the scoreboard
//     table has at least one row, anon cannot read it, and ticket_outcome resolves. Measured over
//     MCP when this shipped on a ROLLED-BACK fixture: a ship row + a row 73h later with the claim
//     "noship_tokens_week: down" graded held when the number fell, did_not_hold when it rose,
//     unmeasurable with no claim, pending with no after-row.
//
// Invocation: node tests/regression/ses-303-outcome-telemetry.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

const CLAUSES = [
  {
    id: "runner-close-out-stamps-the-scoreboard", file: "docs/runbooks/runner-cycle.md",
    test: s => /snapshot_platform_scoreboard\('ship'/.test(s) && /SES-303/.test(s),
    breaks: s => s.split("snapshot_platform_scoreboard('ship'").join("snapshot_platform_scoreboard('later'"),
    detail: "the runner's ship close-out must stamp the scoreboard with trigger 'ship' -- without it the series has no before-rows and every verdict reads pending forever",
  },
  {
    id: "attended-push-stamps-the-scoreboard", file: "docs/runbooks/session-setup.md",
    test: s => /snapshot_platform_scoreboard\('ship', '<TICKET-ID>', '<push sha>'/.test(s),
    breaks: s => s.split("snapshot_platform_scoreboard('ship', '<TICKET-ID>', '<push sha>'").join("snapshot_platform_scoreboard('ship', '<TICKET-ID>'"),
    detail: "attended sessions ship most of Selfbuild; their pushes must stamp the same series",
  },
  {
    id: "m5-12-names-its-instrument", file: "docs/RUNNER-GOV-M5-REQUIREMENTS.md",
    test: s => /Instrumented 2026-09-02 \(`SES-303`, v7\.0\.382\)/.test(s) && /public\.ticket_outcome/.test(s),
    breaks: s => s.replace("Instrumented 2026-09-02 (`SES-303`, v7.0.382)", "Not yet instrumented"),
    detail: "M5-12's 72-hour observation must point at the scoreboard/outcome view, or 'observed non-recurring' stays a judgment call",
  },
];

async function run(ctx = {}) {
  const results = [];
  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation`);
    results.push(c.id);
  }

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    notRun("the live arm (scoreboard has rows; anon cannot read it; ticket_outcome resolves)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-02): first manual row " +
      "stamped (70 no-ship cycles / 53.04M tokens this window, 72 shipped, worst silence 25.4h); anon SELECT denied; " +
      "rolled-back fixture graded held / did_not_hold / unmeasurable / pending as designed.");
    return results;
  }
  const base = url.replace(/\/+$/, "");
  const hdr = k => ({ apikey: k, Authorization: `Bearer ${k}` });
  const rows = await (await fetch(`${base}/rest/v1/platform_scoreboard?select=id,trigger,taken_at&order=taken_at.desc&limit=3`, { headers: hdr(key) })).json();
  assert.ok(Array.isArray(rows) && rows.length > 0, "platform_scoreboard has no rows -- the series never started");
  results.push("scoreboard-has-rows");
  const outcome = await fetch(`${base}/rest/v1/ticket_outcome?select=backlog_id,verdict&limit=5`, { headers: hdr(key) });
  assert.ok(outcome.ok, `ticket_outcome did not resolve: HTTP ${outcome.status}`);
  results.push("ticket-outcome-resolves");
  if (anon) {
    const denied = await fetch(`${base}/rest/v1/platform_scoreboard?select=id&limit=1`, { headers: hdr(anon) });
    assert.ok(!denied.ok, `anon can read platform_scoreboard (HTTP ${denied.status}) -- the SELECT revoke did not take`);
    results.push("anon-cannot-read-the-scoreboard");
  } else {
    notRun("the anon-denied check", "VITE_SUPABASE_ANON_KEY absent; the service-role arms still ran.");
  }
  return results;
}

selfRun(import.meta.url, run);
export default run;
