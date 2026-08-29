// DeepBench v7.0.318 | tests/regression/SES-133-ratification-survives-import.js | SES-133
//
// Guards the rule that John's vision-claim verdicts survive a move between homes.
//
// THE TICKET'S PREMISE MOVED RATHER THAN DIED, and that is why this file exists at all. SES-133 was
// filed against docs/vision/*.md: three of John's taps (C-mission-6 Yes at 00:14Z, C-CUST-20 Yes at
// 00:40Z, C-thesis-30 his typed replacement at 00:08Z, all 2026-08-23) had not reached the corpus.
// That half shipped at v7.0.171 -- the markdown carries all three. Then ses157_vision_claims
// (2026-08-23T20:47Z) moved the corpus into public.vision_claims and seeded EVERY row 'proposed',
// including those three, which were already decided in the very files it imported. Same three
// claims, same harm, new home: §12 was queued to hand John a card asking him to ratify a claim whose
// own text reads "(ratified 2026-08-23)" -- and for VC-THESIS-030, to ratify HIS OWN SENTENCE back
// to him, which is SES-166's "an ask he cannot act on" in a corpus card's clothes.
//
// MEASURED AT THE SHIP, not recalled: exactly 3 rows were status='proposed' with a claim_text
// beginning "(ratified <date>)" or "(John's words, ...)". After the fix: 0.
//
// WHAT THIS FILE DELIBERATELY DOES NOT ASSERT, because it would be the same defect facing the other
// way: it does NOT require every ratified row to carry a marker in its prose, and it does NOT parse
// claim_text to decide status. The status column is the home. The prose marker is a SYMPTOM of the
// lossy import, and the assertion below is one-directional for that reason -- a 'proposed' row whose
// own text says it was decided is a contradiction; a 'ratified' row with plain text is normal.
//
// THE CREDENTIALED HALF SKIPS LOUDLY (SES-61 / SES-135 policy): without SUPABASE_URL and
// SUPABASE_SERVICE_KEY the live arm declares itself not-run rather than passing vacuously. The doc
// arm always runs, so a rewrite of briefing-page.md's §12 rule fails this test on any machine.
//
// FILE-LEVEL NEGATIVE CONTROL, run by the shipping cycle: against origin/dev's own copy of
// briefing-page.md all four doc clauses FAIL (the rule is not there), and the live arm's query
// returned 3 rows before the fix and 0 after -- same query, one variable.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PAGE_DOC = path.join(ROOT, "docs/runbooks/briefing-page.md");

// The four clauses the §12 rule must carry. Each pairs a matcher with the mutation that must break
// it, so no clause can pass against a doc that merely mentions the words.
export const CLAUSES = [
  {
    id: "seeded-ratified-never-proposed",
    re: /seeded\s+`ratified`,\s*NEVER\s+`proposed`/i,
    breaks: s => s.replace(/NEVER `proposed`/i, "and also `proposed`"),
  },
  {
    id: "names-the-lossy-migration",
    re: /ses157_vision_claims[\s\S]{0,200}stamped the whole set `proposed`/i,
    // GLOBAL on purpose: the migration is named twice in this doc (§12's own history block names it
    // too), and a first-occurrence replace left THIS clause's copy standing, so the control passed
    // while proving nothing. Caught by the control's own meta-assertion below, which is the point of
    // having one.
    breaks: s => s.replace(/ses157_vision_claims/gi, "some earlier migration"),
  },
  {
    id: "restoring-is-transcription-not-a-decision",
    re: /TRANSCRIPTION, not a decision the runner may make/i,
    breaks: s => s.replace(/TRANSCRIPTION, not a decision the runner may make/i,
      "a judgement the cycle makes on the evidence"),
  },
  {
    id: "marker-is-the-symptom-never-parse-prose",
    re: /SYMPTOM, not the state[\s\S]{0,320}parsing prose on every read/i,
    // The break targets the distinctive phrase alone rather than the whole sentence: the sentence
    // wraps mid-clause in the shipped doc, so a line-sensitive matcher silently failed to remove
    // anything and the control passed vacuously. Global, for the same reason as clause 2.
    breaks: s => s.replace(/parsing prose on every read/gi, "reading the status column"),
  },
];

async function run() {
  const doc = fs.readFileSync(PAGE_DOC, "utf8");

  for (const c of CLAUSES) {
    assert.match(doc, c.re,
      `SES-133 doc clause '${c.id}' is absent from docs/runbooks/briefing-page.md §12 -- the rule ` +
      "that makes a verdict survive an import lives there and nowhere else");
    // Each clause's own negative control: with its subject removed it must stop matching.
    assert.ok(!c.re.test(c.breaks(doc)),
      `SES-133 control for '${c.id}' has no teeth -- the clause still matches with its subject removed`);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    notRun("the live vision_claims arm", "SUPABASE_URL / SUPABASE_SERVICE_KEY are not set in " +
      "this environment; the §12 rule is asserted against the shipped doc above, but the board " +
      "itself was NOT checked and this file's pass does not cover it");
    return true;
  }

  // The live arm: no claim may sit undecided while its own text records a decision.
  const q = `${url}/rest/v1/vision_claims?status=eq.proposed&select=claim_ref,claim_text`;
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(res.ok, `SES-133: vision_claims read failed HTTP ${res.status} -- this is 'could not run', not a pass`);
  const rows = await res.json();

  const marker = /^\s*\((ratified\s+\d{4}-\d{2}-\d{2}|John's words,\s*\d{4})/i;
  const contradictions = rows.filter(r => marker.test(r.claim_text || ""));
  assert.deepStrictEqual(contradictions.map(r => r.claim_ref), [],
    "SES-133: these vision_claims rows are still 'proposed' while their own claim_text records " +
    "John's verdict, so §12 would ask him to re-ratify a decision he already made:\n" +
    contradictions.map(r => `  ${r.claim_ref}: ${String(r.claim_text).slice(0, 90)}`).join("\n"));

  // The three this ship restored must be decided AND carry their evidence -- ck_vision_claim_decided
  // makes provenance structural, and a restore without it would be the runner deciding rather than
  // transcribing.
  const refs = ["VC-MISSION-006", "VC-CUST-020", "VC-THESIS-030"];
  const q2 = `${url}/rest/v1/vision_claims?claim_ref=in.(${refs.join(",")})` +
             `&select=claim_ref,status,confidence,provenance`;
  const res2 = await fetch(q2, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  assert.ok(res2.ok, `SES-133: second vision_claims read failed HTTP ${res2.status} -- could not run, not a pass`);
  const restored = await res2.json();
  assert.strictEqual(restored.length, refs.length,
    `SES-133: expected ${refs.length} restored claims, read ${restored.length}`);
  for (const r of restored) {
    assert.strictEqual(r.status, "ratified", `SES-133: ${r.claim_ref} is '${r.status}', not 'ratified'`);
    assert.strictEqual(r.confidence, "high", `SES-133: ${r.claim_ref} confidence is '${r.confidence}', not 'high'`);
    assert.ok(r.provenance && r.provenance.length > 40,
      `SES-133: ${r.claim_ref} carries no usable provenance -- a decided row must say what decided ` +
      "it (ck_vision_claim_decided), and a restore without that is a verdict the runner invented");
  }

  return true;
}

export default run;
selfRun(import.meta.url, run);
