// DeepBench v7.0.770 | tests/regression/agt-344-training-tab.test.mjs | AGT-344 -- the facts behind the
// Training tab as the single home for what an agent was taught. Pure: no network, no model, no esbuild.
//
// Each arm discriminates a wrong build: counting every row as taught gives 5 not 4 (H is the agent's
// own record); counting a switched-off item as given gives always 3 not 2 (I is disabled, at the
// limit); a `<` limit reads 12,000 characters as looked up; a character count on a NOTE card is not
// null; and the screen source must hold the two add buttons, the note save and the deep link, and
// must no longer hold the single upload-only button, the made-up id or the strip's three color literals.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selfRun } from "./_lib/self-run.js";
import { ALWAYS_MAX_CHARS, toEntry, taughtCounts, cardFacts, countLine } from "../../src/lib/taughtItems.js";

const c = n => "x".repeat(n);
const row = (id, kind, source_type, n, status = "active") => ({
  id, title: `Item ${id}`, category: "Standards", jurisdiction: "All", priority: 50, triggers: [],
  status, teaching_note: null, content: c(n), created_at: "2026-10-03T16:00:00Z", kind, source_type,
});

const A = row("a", "note", "user", 48);
const F = row("f", "file", "user", 172);
const G = row("g", "file", "user", 35531);
const H = row("h", "file", "agent", 100);
const I = row("i", "file", "user", 12000, "disabled");

const TOO_LARGE = "Too large to give every time. Brittany is told it exists and searches it when relevant.";

export default async function run() {
  assert.equal(ALWAYS_MAX_CHARS, 12000);

  // (a) -- the mapper.
  const a = toEntry(A);
  assert.equal(a.kind, "note");
  assert.equal(a.taught, true);
  assert.equal(a.chars, 48);
  assert.equal(a.always, true);
  assert.equal(a.content, c(48));
  assert.equal(a.learnedSummary, c(48));
  assert.equal(toEntry(H).taught, false, "the agent's own record is not a taught item");
  assert.equal(toEntry(F).kind, "file");
  assert.equal(toEntry({ ...F, kind: undefined }).kind, "file", "kind is note only when the row says note");
  // The eleven fields of the load mapper survive.
  assert.deepEqual(
    Object.keys(a).sort(),
    ["always", "category", "chars", "content", "createdAt", "fieldNotes", "id", "isDemo", "jurisdiction", "kind",
      "learnedSummary", "priority", "status", "taught", "title", "triggers"],
  );
  assert.equal(a.createdAt, "2026-10-03T16:00:00Z");
  assert.equal(a.fieldNotes, "");

  // (b) -- the strip.
  assert.deepEqual(taughtCounts([A, F, G].map(toEntry)), { taught: 3, always: 2, lookedUp: 1 });
  assert.deepEqual(taughtCounts([A, F, G, H, I].map(toEntry)), { taught: 4, always: 2, lookedUp: 1 });

  // (c) -- the card.
  assert.deepEqual(cardFacts(toEntry(A), "Brittany"),
    { kind: "NOTE", reach: "ALWAYS GIVEN", count: null, line: c(48) });
  assert.deepEqual(cardFacts(toEntry(F), "Brittany"),
    { kind: "FILE", reach: "ALWAYS GIVEN", count: "172 characters", line: c(172) });
  assert.deepEqual(cardFacts(toEntry(G), "Brittany"),
    { kind: "FILE", reach: "LOOKED UP BY SEARCH", count: "35,531 characters", line: TOO_LARGE });

  // (d) -- the form's count line; the limit itself is still always given.
  assert.equal(countLine(c(48)), "48 of 12,000 characters · always given");
  assert.equal(countLine(c(12000)), "12,000 of 12,000 characters · always given");
  assert.equal(countLine(c(12001)), "12,001 of 12,000 characters · looked up by search");

  // (e) -- SOURCE: the screen.
  const src = readFileSync(new URL("../../src/screens/PersonnelScreen.jsx", import.meta.url), "utf8");
  for (const held of ["+ Type a note", "+ Upload a file", "Save note", 'kind: "note"', "../lib/taughtItems.js", 'searchParams.get("add")']) {
    assert.equal(src.includes(held), true, `PersonnelScreen.jsx holds ${held}`);
  }
  for (const gone of ["+ Add Courses", "Date.now()"]) {
    assert.equal(src.includes(gone), false, `PersonnelScreen.jsx no longer holds ${gone}`);
  }
  assert.equal((src.match(/#[0-9a-fA-F]{6}\b/g) || []).length, 10, "color literals in PersonnelScreen.jsx");
}

selfRun(import.meta.url, run);
