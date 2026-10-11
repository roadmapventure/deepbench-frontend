// DeepBench v7.0.848 | tests/regression/agt-452-victoria-rows.test.mjs | AGT-452 -- THE DRIFT
// DETECTOR ON THE REPO'S RECORD OF VICTORIA'S ROWS.
//
// WHAT IT GUARDS. `docs/design/agt-452-victoria-rows.sql` claims, in runnable SQL, what the four
// `skill_profiles` rows carrying Victoria Chen's prioritization rules say, and what the six
// `capability_skill_profiles` rows binding them to `requirement-check` are. This test fails when
// that claim stops being true. It is NOT an existence check: arm B renders the record from a FRESH
// READ of the live rows and demands byte equality with the file's section, so one changed character
// in any of the twenty recorded columns of any of the four rows -- or one moved binding -- is red.
//
// THE DEFECT IT ANSWERS, measured live 2026-10-11 (kickoff §2). Three of the four rows had no repo
// record at all, and the one mirror that existed, `docs/design/agt-281-reorganize-intent.sql`, was
// already STALE: its objective literal hashed `266f2d40...` where the live row hashed `357da741...`.
// A stale record is worse than no record, because a cold session trusts it. Nothing detected that,
// which is why the detector ships with the record rather than after it (pattern:26).
//
// ARMS.
//   A  OFFLINE, zero network. The file's own shape: line 1's stamp, each marker a whole line exactly
//      once, the four profile comment lines in SLUGS order, the six binding comment lines in
//      display_order 0-5. Then the GENERATOR, on fixtures rather than live rows: two rows render
//      deterministically, ONE byte changed in one method renders a different block (the control --
//      an "it renders something" assertion would pass on a generator that ignored its input), a
//      value carrying the dollar-quote tag THROWS instead of producing a literal that would close
//      early, an absent column throws rather than quietly recording NULL, and compare() returns the
//      first differing line rather than a diff nobody reads.
//   B  LIVE (credentials, else declared notRun). renderRecord(await fetchRows()) === the file's
//      section, byte for byte, and the live binding slugs in display_order equal §2's six.
//   C  THE CROSS-FILE STRINGS, which are the ones that rot silently: the runbook's line 1 stamp, the
//      bullet that tells a session the record exists and how to regenerate it, and -- the one this
//      ticket must not have disturbed -- the prompt block's own DUTY sentence, byte-unchanged.
//
// WHY ARM A RE-READS NOTHING FROM THE SCRIPT BY HAND. Every constant it asserts against is imported
// from `scripts/victoria-rows-mirror.js`; the arm re-implements no rendering and no parsing. A test
// that re-implemented renderRecord() would pass while both copies were wrong together.
//
// THE WORD "deleted" IN THE RECORD, named here so nobody files it twice. The generated section
// contains the word once inside `vc-reorganize-intent.method`, where Victoria's own prose says a
// turned-down ticket is not deleted. It is a word in a dollar-quoted literal, never a statement --
// arm A asserts no line of the section STARTS with a write or removal verb, which is the property
// that matters both for safety and for the Supabase SQL channel.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";
import {
  SLUGS, PCOLS, BCOLS, CAPABILITY, TAG, BEGIN, END, FILE,
  LIT, renderRecord, extractSection, fetchRows, compare,
} from "../../scripts/victoria-rows-mirror.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK_REL = "docs/runbooks/victoria-reorg.md";
const read = rel => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r\n/g, "\n");

// §2's six bindings, in display_order. The one list in this file written by hand -- it is the
// EXPECTATION arm B grades the live rows against, so deriving it from the live rows would make the
// arm assert that the rows equal themselves.
const EXPECTED_BINDINGS = [
  "deepbench-north-star", "vc-requirement-intent", "vc-reorganize-intent",
  "vc-process-break-class", "vc-john-severity-tree", "vc-prioritization-duty",
];

// The two cross-file strings arm C grades, and the sentence the prompt block must still carry.
const STAMP = "<!-- DeepBench v7.0.848 | runbooks/victoria-reorg.md | AGT-452 — the rows the duty reads have a repo record, docs/design/agt-452-victoria-rows.sql (scripts/victoria-rows-mirror.js --write; guard tests/regression/agt-452-victoria-rows.test.mjs). It writes no row; the block below is byte-unchanged. -->";
const BULLET = "- Her rows' repo RECORD is `docs/design/agt-452-victoria-rows.sql` (`AGT-452`): `node scripts/victoria-rows-mirror.js --write` regenerates it; `--check` and `tests/regression/agt-452-victoria-rows.test.mjs` go red when file and rows differ. It writes no row.";
const DUTY_SENTENCE = "Your DUTY is not in that file, it is in the database.";

// A fixture row: every PCOLS column present, so LIT() never sees `undefined` unless an arm means it.
function fixture(slug, over = {}) {
  return {
    slug, name: `N ${slug}`, description: `D ${slug}`, skill_type_slug: "intent",
    objective: `O ${slug}`, method: `M ${slug}: one line.\nand a second.`,
    output_desc: null, tone: null, confidence: null,
    traits: { source: "inline" }, guardrails: { must: [], must_not: [] }, notes: null,
    technical_services: [], execution_type: "ai", tenant_id: null,
    llm_provider: "anthropic", llm_model: "claude-fable-5-1", max_tokens: 4000,
    api_key_source: "platform", temperature: null,
    ...over,
  };
}
const binding = (slug, display_order) => ({
  capability_slug: CAPABILITY, skill_profile_slug: slug, level: 3, is_required: true, display_order,
});

// The fixture set rendered through the real generator. renderRecord() walks SLUGS and RAISES on a
// slug it was handed no row for (asserted below), so a fixture carries all four rows by
// construction -- the control changes ONE byte of ONE of their methods, which is the two-row
// comparison the ticket asks for: two fixture sets differing by one byte.
const FOUR = (over = {}) => ({
  profiles: SLUGS.map(s => fixture(s, over[s] ?? {})),
  bindings: SLUGS.map((s, i) => binding(s, i)),
});

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`[arm ${name}] FAIL -- ${e.message}`); console.log(`    [arm ${name}] FAIL -- ${e.message}`); }
  };

  const fileText = read(FILE);

  // ---- A. OFFLINE: the file's shape and the generator's behaviour ------------------------------
  await arm("A the record's shape and the generator, zero network", async () => {
    // The stamp on line 1, so a reader knows what the file is and which version wrote it.
    const line1 = fileText.split("\n")[0];
    assert.ok(line1.startsWith("-- AGT-452 (v7.0.848)"),
      `line 1 must start with the AGT-452 (v7.0.848) stamp; got ${JSON.stringify(line1.slice(0, 60))}`);

    // Each marker a WHOLE line exactly once -- the property extractSection() depends on.
    const lines = fileText.split("\n");
    assert.equal(lines.filter(l => l === BEGIN).length, 1, "the BEGIN marker is a whole line exactly once");
    assert.equal(lines.filter(l => l === END).length, 1, "the END marker is a whole line exactly once");
    const section = extractSection(fileText);
    assert.ok(section.text.startsWith("do $agt452$"), "the section is the asserting DO block");
    assert.ok(section.text.trimEnd().endsWith("end $agt452$;"), "and it closes that block");

    // The four profile comment lines, in SLUGS order, each naming its type and its method md5.
    const profileLines = section.text.split("\n").filter(l => l.includes("-- skill_profiles ·"));
    assert.equal(profileLines.length, SLUGS.length, `${SLUGS.length} profile comment lines`);
    SLUGS.forEach((slug, i) => {
      const parts = profileLines[i].split(" · ");
      assert.equal(parts[1], slug, `profile comment line ${i} names ${slug} (SLUGS order, not slug.asc)`);
      assert.ok(/^method md5 [0-9a-f]{32}$/.test(parts[3]),
        `profile comment line ${i} carries a method md5; got ${JSON.stringify(parts[3])}`);
    });

    // The six binding comment lines, in display_order 0-5, naming the capability each time.
    const bindingLines = section.text.split("\n").filter(l => l.includes("-- capability_skill_profiles ·"));
    assert.equal(bindingLines.length, EXPECTED_BINDINGS.length, "six binding comment lines");
    EXPECTED_BINDINGS.forEach((slug, i) => {
      const parts = bindingLines[i].split(" · ");
      assert.equal(parts[1], CAPABILITY, `binding comment line ${i} names the capability`);
      assert.equal(parts[2], slug, `binding comment line ${i} names ${slug} at display_order ${i}`);
      assert.equal(parts[3], `display_order ${i}`, `binding comment line ${i} is display_order ${i}`);
    });

    // THE RECORD WRITES NOTHING. Not "the words do not appear" -- the word "deleted" appears once
    // inside Victoria's own prose -- but that no LINE of the section is a write or removal
    // statement. That is the property that keeps it safe to run and safe to paste.
    const stmt = /^\s*(insert|update|delete|drop|truncate|alter|create|grant|revoke|copy)\b/i;
    const writes = section.text.split("\n").filter(l => stmt.test(l));
    assert.deepEqual(writes, [], `the record must contain no write statement; found ${writes.length}`);

    // THE GENERATOR, on fixtures. Deterministic first: the same input renders the same bytes.
    assert.equal(renderRecord(FOUR()), renderRecord(FOUR()), "renderRecord is deterministic");

    // THE CONTROL. One byte of one method changed must render a DIFFERENT block -- and the line that
    // differs must be the method's, not something incidental.
    const base = renderRecord(FOUR());
    const changed = renderRecord(FOUR({ [SLUGS[1]]: { method: `M ${SLUGS[1]}: one line.\nand a Second.` } }));
    assert.notEqual(changed, base, "ONE byte changed in one method renders a different record");
    // The FIRST line that moves is that profile's md5 comment line, which sits above the literal --
    // so the comment cannot go on describing a row whose text has changed under it. Asserting WHICH
    // line moved, rather than that something did, is the point (the LOO-013 lesson).
    const b = base.split("\n"), c = changed.split("\n");
    let i = 0; while (b[i] === c[i]) i++;
    assert.ok(c[i].startsWith(`  -- skill_profiles · ${SLUGS[1]} ·`) && /method md5 [0-9a-f]{32}$/.test(c[i]),
      `the first differing line is ${SLUGS[1]}'s md5 comment line; got ${JSON.stringify(c[i])}`);
    assert.notEqual(c[i], b[i], "and its md5 is not the md5 of the unchanged method");
    // The changed byte itself reaches the record's literal, and only there.
    assert.ok(changed.includes("and a Second.") && !base.includes("and a Second."),
      "the changed method text is in the new record and not in the old one");
    // The other three fixture rows keep the original line, so the count drops by exactly one: the
    // change is scoped to the one row's literal and leaks into no other.
    const count = (s, n) => s.split(n).length - 1;
    assert.equal(count(changed, "and a second."), count(base, "and a second.") - 1,
      "exactly one of the four recorded methods changed; the other three are byte-untouched");

    // A value carrying the dollar-quote tag THROWS: a literal of it would close early and the rest
    // would reinterpret as SQL.
    assert.throws(
      () => renderRecord(FOUR({ [SLUGS[0]]: { objective: `holds the ${TAG} tag` } })),
      /contains the quote tag/, "a value carrying the quote tag throws");
    assert.throws(() => LIT(`a ${TAG} b`, "objective"), /contains the quote tag/, "LIT throws on it directly");

    // An ABSENT column throws rather than recording NULL about a column nobody read.
    const missing = FOUR();
    delete missing.profiles[0].tone;
    assert.throws(() => renderRecord(missing), /column tone is absent/, "an absent column throws");

    // The literal forms, by value: null, jsonb, number, boolean, text.
    assert.equal(LIT(null, "tone"), "NULL", "null renders NULL, never a quoted empty string");
    assert.equal(LIT([], "technical_services"), `${TAG}[]${TAG}::jsonb`, "a jsonb column is cast");
    assert.equal(LIT(4000, "max_tokens"), "4000", "a number renders bare");
    assert.equal(LIT(true, "is_required"), "true", "a boolean renders bare");
    assert.equal(LIT("ai", "execution_type"), `${TAG}ai${TAG}`, "text is dollar-quoted");

    // compare(): null on equality, and the FIRST differing line when a byte moves.
    const rows = FOUR();
    const built = `${BEGIN}\n${renderRecord(rows)}\n${END}\n`;
    assert.equal(compare(built, rows), null, "compare returns null when the file equals the rows");
    const drifted = built.replace("and a second.", "and a SECOND.");
    const msg = compare(drifted, rows);
    assert.ok(msg && msg.includes("AGT-452 DRIFT at line") && msg.includes("and a SECOND."),
      `compare names the first differing line; got ${JSON.stringify(msg)}`);

    // The column lists are the ones the record is built on, by value (a silent widening of PCOLS
    // would record a column nothing asserted, and a silent narrowing would stop guarding one).
    assert.equal(PCOLS.length, 20, "twenty recorded skill_profiles columns");
    assert.ok(!PCOLS.includes("updated_at") && !PCOLS.includes("id") && !PCOLS.includes("created_at"),
      "the surrogate id and the timestamps are deliberately NOT recorded (pattern:162)");
    assert.deepEqual(BCOLS, ["capability_slug", "skill_profile_slug", "level", "is_required", "display_order"],
      "all five binding columns are recorded");
  });

  // ---- B. LIVE: the record equals a fresh read, byte for byte -----------------------------------
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    notRun("AGT-452 arm B — the record against a fresh read of the live rows",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY are absent, and byte equality against the live rows is " +
      "the whole point of this guard: arm A can only prove the generator and the file's shape. Run " +
      "with node --env-file-if-exists=.env.local tests/regression/run-all.js, or with the two " +
      "secrets exported inline from public.runner_secrets.");
  } else {
    await arm("B the record equals the live rows, byte for byte", async () => {
      const rows = await fetchRows();
      assert.equal(rows.profiles.length, SLUGS.length, `${SLUGS.length} live rows were read`);
      assert.deepEqual(
        [...rows.bindings].sort((x, y) => x.display_order - y.display_order).map(x => x.skill_profile_slug),
        EXPECTED_BINDINGS,
        `the live ${CAPABILITY} bindings, in display_order, are §2's six`);

      const want = renderRecord(rows);
      const have = extractSection(fileText).text;
      if (have !== want) {
        const h = have.split("\n"), w = want.split("\n");
        let i = 0; while (i < h.length && i < w.length && h[i] === w[i]) i++;
        assert.fail(`the record has DRIFTED from the live rows at section line ${i + 1}: file ` +
          `${JSON.stringify((h[i] ?? "<ends>").slice(0, 140))} vs live ` +
          `${JSON.stringify((w[i] ?? "<ends>").slice(0, 140))}. Regenerate with ` +
          `node scripts/victoria-rows-mirror.js --write (never by hand).`);
      }
      assert.equal(compare(fileText, rows), null, "and compare() agrees there is no drift");
      console.log(`    [AGT-452 arm B] ${rows.profiles.length} rows, ${rows.bindings.length} bindings, ` +
        `${want.split("\n").length} recorded lines, byte-equal`);
    });
  }

  // ---- C. THE CROSS-FILE STRINGS, and the prompt block this ticket must not have touched --------
  await arm("C the runbook stamp, the bullet, and the untouched prompt block", async () => {
    const runbook = read(RUNBOOK_REL);
    assert.equal(runbook.split("\n")[0], STAMP, "the runbook's line 1 is AGT-452's stamp");
    assert.ok(runbook.includes(BULLET), "the runbook carries the record's bullet verbatim");
    assert.ok(runbook.includes(DUTY_SENTENCE),
      "and the prompt block still carries the DUTY sentence -- AGT-452 changed no byte of it");
    assert.ok(runbook.includes("<!-- VICTORIA-REORG-PROMPT-BEGIN -->") &&
      runbook.includes("<!-- VICTORIA-REORG-PROMPT-END -->"),
      "the prompt block's markers are both still whole lines in the file");
    // The record this ticket shipped is reachable from the architecture note as well.
    assert.ok(read("docs/ARCHITECTURE.md").includes(FILE),
      `docs/ARCHITECTURE.md names ${FILE}`);
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n    ${failures.join("\n    ")}`);
}

selfRun(import.meta.url, run);
export default run;
