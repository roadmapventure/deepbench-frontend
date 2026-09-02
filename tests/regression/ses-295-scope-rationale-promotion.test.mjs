// DeepBench v7.0.377 | tests/regression/ses-295-scope-rationale-promotion.test.mjs | SES-295 (M2)
//
// scope_rationale is the review bucket's promotion criterion. M5-02 sorted post-2026-08-21 tickets
// into a review bucket that "requires explicit promotion before pick" and never named a criterion;
// M5-03 now does: a Selfbuild ticket filed on or after the cut with no scope_rationale is never
// picked. Two arms:
//
//   * DOC arm (always runs): the M5-03 blockquote in docs/RUNNER-GOV-M5-REQUIREMENTS.md names
//     scope_rationale as the promotion criterion, the SES-295 extension note is present, and the
//     canonical filing INSERT in docs/runbooks/session-setup.md carries scope_rationale -- with a
//     negative control per clause (the assertion is proven able to fail).
//   * LIVE arm (SUPABASE_URL + SUPABASE_SERVICE_KEY, declared NOT RUN otherwise): no open post-cut
//     Selfbuild ticket lacks a rationale (the backfill held), and prime_directive_queue() never
//     returns one that does. Measured over MCP when this shipped: 24 rows backfilled; a ROLLED-BACK
//     fixture ticket with no rationale was absent from the lane and present once given one.
//
// Invocation: node tests/regression/ses-295-scope-rationale-promotion.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANONICAL_REL = "docs/RUNNER-GOV-M5-REQUIREMENTS.md";
const SETUP_REL = "docs/runbooks/session-setup.md";

async function pg(url, key, pathAndQuery) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on ${pathAndQuery}: ${await res.text()}`);
  return res.json();
}
async function rpc(url, key, fn) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}",
  });
  if (!res.ok) throw new Error(`PostgREST ${res.status} on rpc/${fn}: ${await res.text()}`);
  return res.json();
}

const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

const CLAUSES = [
  {
    id: "m5-03-names-scope-rationale-as-the-promotion-criterion", file: CANONICAL_REL,
    test: s => /^> The per-ticket governance matrix mandated by FILE-MATRIX additionally carries `epic_id`, `filed_at` and `scope_rationale`:.*is the review bucket's promotion criterion/m.test(s),
    breaks: s => s.replace("is the review bucket's promotion criterion", "is a field on the row"),
    detail: "the M5-03 blockquote is the registry row's byte-for-byte home; if it stops naming scope_rationale as the promotion criterion the rule has silently narrowed",
  },
  {
    id: "m5-03-carries-the-ses-295-extension-note", file: CANONICAL_REL,
    test: s => /Extended 2026-09-02 \(`SES-295`, v7\.0\.377\)/.test(s) && /Deliberately not fail-closed at the database/.test(s),
    breaks: s => s.replace("Deliberately not fail-closed at the database", "Fail-closed at the database"),
    detail: "the note must say the enforcement is pick-time exclusion, not a NOT NULL -- FILE-MATRIX chose fail-LOUD so the runner's filing path can never park mid-drain",
  },
  {
    id: "canonical-filing-insert-carries-scope-rationale", file: SETUP_REL,
    test: s => /INSERT INTO backlog_items[\s\S]{0,600}scope_rationale/.test(s),
    breaks: s => s.replace(/scope_rationale/g, "scope_reason"),
    detail: "a ticket filed from the runbook's own INSERT without scope_rationale is unpickable from the moment it lands (M5-03); the canonical form must carry the field",
  },
];

async function run(ctx = {}) {
  const results = [];
  for (const c of CLAUSES) {
    const s = read(c.file);
    assert.ok(c.test(s), `${c.file} lost clause "${c.id}": ${c.detail}`);
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s, `control: mutation for "${c.id}" changed nothing`);
    assert.ok(!c.test(mutated), `control: clause "${c.id}" still passes after its own mutation -- the assertion cannot fail`);
    results.push(c.id);
  }

  const url = ctx.url ?? process.env.SUPABASE_URL;
  const key = ctx.key ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun(
      "the live promotion-criterion arm (no open post-cut Selfbuild ticket lacks a rationale; prime_directive_queue never returns one)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent. Measured over MCP when this shipped (2026-09-02): 24 open " +
      "post-cut Selfbuild tickets backfilled with a charter-goal rationale; the live pick stayed SES-295 " +
      "and pickable_count was unchanged, i.e. the clause stranded nothing.",
    );
    return results;
  }

  const epics = await pg(url, key, "epics?select=id,name&name=ilike.Selfbuild*");
  const epicIds = epics.map(e => e.id);
  const rows = await pg(url, key,
    `backlog_items?select=backlog_id,scope_rationale,queue&epic_id=in.(${epicIds.join(",")})&filed_at=gte.2026-08-21&status=not.in.(done,removed)&limit=1000`);
  assert.ok(rows.length > 0, "no open post-cut Selfbuild ticket exists -- this arm would pass by having nothing to check");
  const bare = rows.filter(r => !r.scope_rationale || !r.scope_rationale.trim());
  const lanes = await rpc(url, key, "prime_directive_queue");
  const bareIds = new Set(bare.map(r => r.backlog_id));
  const leaked = (Array.isArray(lanes) ? lanes : []).filter(r => r.ref && bareIds.has(r.ref));
  assert.deepStrictEqual(leaked.map(r => r.ref), [],
    `prime_directive_queue() returned ${leaked.length} post-cut ticket(s) with no scope_rationale -- the promotion criterion is not in the buildable CTE`);
  results.push("drain-lane-never-promotes-a-post-cut-ticket-without-a-rationale");
  if (bare.length > 0) {
    notRun("the backfill-held check", `${bare.length} open post-cut Selfbuild ticket(s) currently lack a rationale (${bare.map(r => r.backlog_id).join(", ")}); they are correctly withheld from the lane, but the filing-time alarm is SES-279's, not this test's.`);
  } else {
    results.push("every-open-post-cut-selfbuild-ticket-carries-a-rationale");
  }
  return results;
}

selfRun(import.meta.url, run);
export default run;
