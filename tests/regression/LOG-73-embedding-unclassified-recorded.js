// DeepBench v7.0.261 | tests/regression/LOG-73-embedding-unclassified-recorded.js | LOG-73
//
// Guards ARCHITECTURE.md §19k against re-asserting two claims its own data falsified.
//
// THE SILENT BREAK THIS EXISTS FOR: a later editor "tidying" the coverage bullet back into a
// standing invariant -- resurrecting "going-forward unmatchable = 0" or the one-gold-row naming
// sentence, or dropping Susan's discard reason as stale prose. Each of those reads as a cleanup and
// each restores a false claim, so the guard asserts BOTH directions: the retired sentences are
// ABSENT, and the dated measurement plus the reason for the retraction are PRESENT.
//
// WHY BOTH HALVES, and neither is sufficient alone. An absence assertion on its own passes
// vacuously if the string was never what shipped -- so each absence clause is paired with a
// presence clause naming what replaced it. And a presence assertion on its own passes while the
// retired sentence sits three lines above it, which is precisely the state this ticket found §19k
// in: the body asserted the naming role and a blockquote directly beneath it retracted the same
// claim. (Same pairing as SES-201, for the same reason.)
//
// THE FILE IS READ, NEVER RECREATED (SES-45): every clause runs against the real shipped
// docs/ARCHITECTURE.md via fs.readFileSync, sliced to §19k. A doc has no importable logic, so
// reading the shipped artifact is the strongest available form of that rule.
//
// NEGATIVE CONTROL: everyClauseHasTeeth() mutates the §19k slice per clause and asserts the clause
// then FAILS. That is what gives the two survival clauses (Susan's reason, the false-generation
// guard) teeth -- they pass before and after the edit by design, so without a mutation control they
// would be indistinguishable from assertions that can never fire.
//
// Measured live 2026-08-25 by runner cycle befe50e3 against public.ai_call_patterns and
// public.pattern_vocabulary; the counts asserted below trace to that measurement, recorded in
// docs/kickoffs/v7.0.261-LOG-73-embedding-unclassified.md.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARCH_REL = "docs/ARCHITECTURE.md";

const read = () => fs.readFileSync(path.join(ROOT, ARCH_REL), "utf8");

// Exported so the slice boundary is itself testable rather than an inline regex nobody can see.
export function extractBlock(md, startsWith, endsWith) {
  const start = md.indexOf(startsWith);
  assert.ok(start !== -1, `${ARCH_REL}: could not find the section opening "${startsWith}"`);
  const end = md.indexOf(endsWith, start + startsWith.length);
  assert.ok(end !== -1, `${ARCH_REL}: could not find the section closing "${endsWith}"`);
  return md.slice(start, end);
}

const section19k = () => extractBlock(read(), "## 19k.", "## 19l.");

// Normalized for PROSE, not for markup: blockquote markers are stripped and whitespace collapsed,
// because these sentences get reflowed by editors and one of them spans a `>` continuation line. A
// clause that failed on a line wrap, or on prose moving into or out of a blockquote, would be noise
// rather than a guard -- and the historical note this file protects is exactly such a blockquote.
const flat = s => s.replace(/^[ \t]*>[ \t]?/gm, "").replace(/\s+/g, " ");

// ---------------------------------------------------------------------------
// The clauses, as data. `test` runs against the §19k slice; `breaks` mutates that slice so the
// clause must fail -- the meta-assertion below runs every one of them.
// ---------------------------------------------------------------------------
const CLAUSES = [
  {
    id: "stale-naming-sentence-gone",
    why: "the POC's naming role for model_modality was overturned 2026-07-25 (S-LOG-66); the body " +
         "must not still assert it above its own retraction",
    test: s => !flat(s).includes("It lets one gold row name the retrieval subroutines"),
    breaks: s => s + "\n It lets one gold row name the retrieval subroutines (`criteria: {model_modality: embedding}`).",
  },
  {
    id: "stale-invariant-gone",
    why: "\"going-forward unmatchable = 0\" was falsified by the platform's own log: 3,740 embedding " +
         "rows were written AFTER the claim was locked",
    test: s => !flat(s).includes("Coverage: going-forward unmatchable = 0."),
    breaks: s => s + "\n- **Coverage: going-forward unmatchable = 0.** The unmatchable rows are 100% historical.",
  },
  {
    id: "measurement-is-dated",
    why: "the replacement must read as a measurement taken on a date, never as a new standing " +
         "invariant -- that is the whole shape of the defect being fixed",
    // Case-insensitive on the date phrase only: it opens a bolded sentence, so an editor may
    // legitimately re-case it. The figures are matched exactly.
    test: s => {
      const f = flat(s);
      return /remeasured live 2026-08-25/i.test(f)
          && f.includes("5,081")
          && f.includes("19,700 unmatched");
    },
    breaks: s => s.replace(/remeasured live 2026-08-25/gi, "always true"),
  },
  {
    id: "johns-call-recorded",
    why: "part (c) of LOG-73 is settled -- John's call is 'accept as unclassified' -- and the doc " +
         "must record it so no later session reopens a decision he already made",
    test: s => flat(s).includes("accepted as unclassified"),
    breaks: s => s.replace(/accepted as unclassified/g, "pending a decision"),
  },
  {
    id: "discard-reason-preserved",
    why: "a retraction's REASON is kept, never dropped as stale prose -- Susan's words are why the " +
         "gold pattern does not exist, and without them the next session re-proposes it",
    test: s => flat(s).includes("a foundational NLP primitive already inside RAG/HyDE"),
    breaks: s => s.replace(/foundational NLP primitive/g, "bad idea"),
  },
  {
    id: "guard-survives-verbatim",
    why: "only model_modality's NAMING role was overturned; its false-generation guard stands, and " +
         "is live in the gold data (all 8 model_modality criteria assert generative)",
    test: s => {
      const f = flat(s);
      return f.includes("structurally forbids any generation pattern from matching a non-generative row")
          && f.includes("`none` assumes null `model` = deterministic");
    },
    // Mutate a SHORT contiguous phrase: the full sentence is line-wrapped in the doc, and a
    // mutation written against the flattened form silently matches nothing -- which the teeth
    // assertion below correctly refuses (it caught exactly that while this file was being written).
    breaks: s => s.replace(/structurally forbids/g, "does not forbid"),
  },
];

function everyClauseHolds() {
  const s = section19k();
  for (const c of CLAUSES) {
    assert.ok(c.test(s), `§19k clause "${c.id}" failed -- ${c.why}`);
  }
}

function everyClauseHasTeeth() {
  // NEGATIVE CONTROL. A clause that cannot be made to fail is not guarding anything, and this is
  // the assertion that carries the two survival clauses: they pass on the pre-change file too, so
  // only a mutation proves they are real.
  const s = section19k();
  for (const c of CLAUSES) {
    const mutated = c.breaks(s);
    assert.notStrictEqual(mutated, s,
      `§19k clause "${c.id}": its breaks() mutation changed nothing, so the control below is vacuous`);
    assert.ok(!c.test(mutated),
      `§19k clause "${c.id}" still passes against a slice mutated to violate it -- the assertion ` +
      `has no teeth and would not catch the regression it is written for`);
  }
}

function theSliceIsReallyTheSection() {
  // If §19l is ever renamed the slice silently becomes the rest of the file, and every absence
  // clause above starts reporting on text it was never meant to read.
  const s = section19k();
  assert.ok(s.startsWith("## 19k."), "the §19k slice must start at the section heading");
  assert.ok(!s.includes("## 19l."), "the §19k slice must stop before §19l");
  assert.ok(s.includes("LOG-65 POC 2 outcomes"),
    "the §19k slice must contain the LOG-65 POC 2 subsection -- that is where both edits live");
}

function run() {
  theSliceIsReallyTheSection();
  everyClauseHolds();
  everyClauseHasTeeth();

  notRun(
    "the live coverage counts themselves (34,702 rows / 15,002 matched / 5,081 embedding, 0 matched)",
    "they need Supabase credentials the regression suite does not carry; this file asserts that the " +
    "DOC records the measurement, not that the measurement is currently true. Re-measure against " +
    "public.ai_call_patterns before citing the numbers as live -- the bullet says so in the doc too.",
  );
}

selfRun(import.meta.url, run);
export default run;
