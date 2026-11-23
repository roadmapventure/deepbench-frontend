// tests/regression/career-library-lockstep.test.mjs -- career/Library lock step (John-managed, 2026-11-23).
//
// The career slugs the principal writes with read what the writing slugs read, through the same
// grant- and deny-aware Library read, plus the writing store's notes. Pure arms only: no database.
//   A  READS    -- every CAREER_LIBRARY_SLUGS slug carries the writing slugs' fixed reads in the same order,
//                  then `writing_notes`; its Library sections and client_private line equal a writing slug's;
//                  CONTROL: a scheduled career slug gained no Library read.
//   B  DENIES   -- libraryAllowed drops a denied id and a client_private item outside the two sections for a
//                  career slug exactly as for a writing slug; CONTROL: the same rows pass with no deny.
//   C  NOTES    -- writingNotes keeps only the four note kinds, never `rule` (fed one, it is dropped; an
//                  unfiltered CONTROL shows the fixture row was there to drop); corrections and grades
//                  survive a byte cut that drops practice and method notes; the reader's query names
//                  exactly the four kinds.
//   D  MARK     -- a career record whose data carries the superseded mark renders with it (source check).
//   E  CENTRAL  -- every CENTRAL_FACTS_SLUGS slug reads `central_facts` then `writing_notes` ahead of every
//                  other read and keeps the reads it had; the facts reader returns the fixed read's facts
//                  alone (source check); CONTROL: the topic scout, the daily brief and a writing slug do not
//                  read `central_facts`.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun } from "./_lib/self-run.js";
import {
  EXTRA_READS, READ_MAP, CAREER_LIBRARY_SLUGS, CAREER_LIBRARY_SECTIONS, WRITING_LIBRARY_SECTIONS,
  LIBRARY_PRIVATE_SECTIONS, WRITING_NOTE_KINDS, SUPERSEDED_KEY, CENTRAL_FACTS_SLUGS, libraryAllowed, libraryTextSkips, writingNotes,
} from "../../scripts/personal-agent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = fs.readFileSync(path.join(ROOT, "scripts", "personal-agent.js"), "utf8").replace(/\r\n/g, "\n");
const reads = s => [].concat(EXTRA_READS[s] ?? []);
const WRITER = "writing-draft";

async function run() {
  const failures = [];
  const arm = (name, fn) => {
    try { fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  arm("A reads", () => {
    assert.ok(CAREER_LIBRARY_SLUGS.length > 0, "there are lock-step slugs");
    const fixed = reads(WRITER).filter(k => ["profile_facts", "library", "goals"].includes(k));
    assert.deepEqual(fixed, ["profile_facts", "library", "goals"], "control: the writing slug's fixed reads");
    for (const s of CAREER_LIBRARY_SLUGS) {
      assert.ok(Object.prototype.hasOwnProperty.call(READ_MAP, s), `${s} is a career slug`);
      assert.deepEqual(reads(s), [...fixed, "writing_notes"], `${s} reads the fixed reads then writing_notes`);
      assert.deepEqual(CAREER_LIBRARY_SECTIONS[s], WRITING_LIBRARY_SECTIONS[WRITER], `${s} reads the writing slugs' sections`);
      assert.deepEqual(LIBRARY_PRIVATE_SECTIONS[s], LIBRARY_PRIVATE_SECTIONS[WRITER], `${s} carries the client_private line`);
      const { skipSections } = libraryTextSkips(s, []);
      assert.ok(skipSections.has("facts") && skipSections.has("goals"), `${s}: facts and goals travel once`);
    }
    for (const s of ["career-match-finder", "career-market-watch", "career-growth-review", "career-evidence-mining", "career-outreach-plan"]) {
      assert.ok(!reads(s).includes("library") && !reads(s).includes("writing_notes"), `control: ${s} is unchanged`);
    }
    assert.deepEqual(reads("career-linkedin-alerts"), ["competitors"], "control: the alert review reads competitors only");
  });

  arm("B denies", () => {
    const rows = [
      { id: "ok", kind: "confirmed_fact", section: "facts", sensitivity: "personal_private" },
      { id: "denied", kind: "document", section: "works", sensitivity: "client_private" },
      { id: "private-works", kind: "document", section: "works", sensitivity: "client_private" },
      { id: "private-evidence", kind: "document", section: "evidence", sensitivity: "client_private" },
    ];
    for (const s of CAREER_LIBRARY_SLUGS) {
      const ids = libraryAllowed(rows, ["denied"], s).map(r => r.id);
      assert.deepEqual(ids, ["ok", "private-evidence"], `${s}: the denied id and the out-of-section client_private item are gone`);
      assert.deepEqual(ids, libraryAllowed(rows, ["denied"], WRITER).map(r => r.id), `${s} reads as the writing slug does`);
    }
    assert.equal(libraryAllowed(rows, [], "strategy-advise").length, rows.length, "control: no deny, no private line, every row passes");
  });

  arm("C notes", () => {
    assert.deepEqual([...WRITING_NOTE_KINDS].sort(), ["correction", "grade", "method", "practice"], "the four note kinds");
    assert.ok(!WRITING_NOTE_KINDS.includes("rule"), "rule is never a note kind");
    const big = "x".repeat(900);
    const rows = [
      { id: "r", kind: "rule", title: "blocked", data: { terms: ["SENTINEL-TERM"] } },
      { id: "d", kind: "draft", title: "a draft", body: "draft body" },
      { id: "c", kind: "correction", title: "a correction", body: big },
      { id: "g", kind: "grade", title: "7/10", data: { score: 7 } },
      { id: "p", kind: "practice", title: "a practice", body: "short", data: { note: big } },
      { id: "m", kind: "method", title: "a method", body: "short", data: { note: big } },
    ];
    assert.ok(JSON.stringify(rows).includes("SENTINEL-TERM"), "control: the fixture carries the rule row");
    const all = writingNotes(rows);
    assert.deepEqual(all.map(n => n.id).sort(), ["c", "g", "m", "p"], "only the four kinds come back");
    assert.ok(!JSON.stringify(all).includes("SENTINEL-TERM"), "the rule row's content is not in the notes");
    const cut = writingNotes(rows, null, 1500);
    assert.deepEqual(cut.filter(n => ["correction", "grade"].includes(n.kind)).map(n => n.id), ["c", "g"], "corrections and grades survive the cut");
    assert.ok(cut.length < all.length, "the cut dropped a practice or method note");
    const q = SRC.match(/async function readWritingNotes[\s\S]*?\n}/)?.[0] ?? "";
    assert.ok(q.includes("writing_records?kind=in.(${WRITING_NOTE_KINDS.join(',')})"), "the reader's query names the note kinds only");
    assert.ok(!/kind=eq\.rule|'rule'/.test(q), "the reader never names rule");
  });

  arm("D mark", () => {
    assert.equal(SUPERSEDED_KEY, "superseded_by");
    assert.ok(SRC.includes("if (r.data?.[SUPERSEDED_KEY]) rec[SUPERSEDED_KEY] = String(r.data[SUPERSEDED_KEY]);"), "a superseded career record renders its mark");
  });

  arm("E central", () => {
    assert.deepEqual([...CENTRAL_FACTS_SLUGS].sort(), ["humor-weekly-draft", "strategy-advise", "strategy-readiness-check"]);
    const had = { "humor-weekly-draft": reads("humor-topic-scout"), "strategy-advise": ["library", "market", "napkin", "memory", "product", "goals", "security"],
      "strategy-readiness-check": ["library", "market", "memory", "product", "security"] };
    for (const s of CENTRAL_FACTS_SLUGS) {
      assert.deepEqual(reads(s).slice(0, 2), ["central_facts", "writing_notes"], `${s} reads the facts and the notes first`);
      assert.deepEqual(reads(s).slice(2), had[s], `${s} keeps the reads it had`);
      assert.ok(!reads(s).includes("profile_facts"), `${s} carries the facts alone, not the profile or the resume`);
    }
    for (const s of ["humor-topic-scout", "strategy-daily-brief", "strategy-weekly-review", "writing-draft", ...CAREER_LIBRARY_SLUGS]) {
      assert.ok(!reads(s).includes("central_facts"), `control: ${s} does not read central_facts`);
    }
    const f = SRC.match(/async function readCentralFacts[\s\S]*?\n}/)?.[0] ?? "";
    assert.ok(f.includes("await readProfileFacts(db)") && f.includes("block.facts"), "the facts reader returns the fixed read's facts");
    assert.ok(SRC.includes("central_facts: readCentralFacts,"), "the reader is registered");
  });

  if (failures.length) throw new Error(failures.join(" | "));
}

export default run;
selfRun(import.meta.url, run);
