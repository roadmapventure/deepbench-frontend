// DeepBench v7.0.673 | tests/regression/agt-160-findings-intake-routing.test.mjs | AGT-160
//
// A FINDING HAS ONE HOME AND A TICKET HAS ONE AUTHOR. `scripts/check-findings-intake.js` grades
// both, and this file grades the check. Four arms, and on the tree this was written against EVERY
// ONE of them is red for the same reason -- the module does not exist, so each errors on import.
// That is the discriminator the kickoff asked for: no arm here can pass by accident on an unchanged
// tree, and the two mutation controls below (an emptied allowlist, a removed ask) prove the two
// refusals are reachable rather than decorative.
//
//   A  PURE -- `filingPaths()` returns the POST file and NOT the GET-only one. The negative control
//      is a live file, not an invention: scripts/export-backlog-snapshot.js holds the same
//      `rest/v1/backlog_items` URL for a GET, so a URL-only matcher would refuse the board's own
//      snapshot exporter. MUTATION: with the allowlist replaced by `[]`, the check's own comparison
//      must refuse and NAME scripts/tripwire-to-backlog.js.
//   B  PURE -- `directiveState()` over the eight live-shaped rows. With the ask REMOVED it refuses
//      and names all six governed slugs; with the ask present it passes; and a row whose own text
//      names `audit_findings` passes with NO ask at all -- which is the state John's signature
//      creates and the reason this clause is not a permanent ask.
//   C  LIVE, READ-ONLY (service key) -- the CLI over this tree exits 0 and its measured filing set
//      is EXACTLY `scripts/tripwire-to-backlog.js`. This is the pin: one INSERT exists today
//      (scripts/tripwire-to-backlog.js:520, The Development Manager's own path) and nothing pinned
//      it, so the value of this ticket is that a second writer cannot appear unnoticed.
//   D  LIVE, READ-ONLY -- with BOTH credentials deleted from the child env the CLI exits 0 or 1,
//      NEVER 2, and prints the NOT GRADED line for clause B. An ungraded clause is a declaration,
//      never a refusal and never a silent pass (§19v).
//
// NOTHING HERE WRITES. Arms C and D run the CLI without `--file-card`, which reads and never posts;
// arms A and B touch no network at all. The one write this ticket performs -- the single
// `runner_card_asks` row -- is the build's own step, not a test fixture.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK = path.join(ROOT, "scripts", "check-findings-intake.js");

// The two live files clause A is measured against.
const FILER = "scripts/tripwire-to-backlog.js";
const GETTER = "scripts/export-backlog-snapshot.js";

function runCli(args, env = process.env) {
  return spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", cwd: ROOT, env });
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    ok  ${name}`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    FAIL ${name}: ${e.message.split("\n")[0]}`); }
  };

  const mod = await import(pathToFileURL(CHECK).href);
  const {
    FILING_ALLOWLIST, filingPaths, filingVerdict,
    INTAKE_DIRECTIVE, GOVERNED_SLUGS, ALL_GUARDRAIL_SLUGS, directiveState, guardrailText,
    NOT_GRADED_PREFIX,
  } = mod;

  // --- A: the one filing path, pure ------------------------------------------------------------
  await arm("A filingPaths counts the POST and skips the GET-only URL", () => {
    assert.deepEqual([...FILING_ALLOWLIST], [FILER],
      "one entry, and it is the Development Manager's own filing path -- an addition here is a governance change");

    const fixtures = [
      // The shape scripts/tripwire-to-backlog.js:520 actually has.
      { path: "scripts/fixture-posts.js", text: 'res = await fetch(`${base}/rest/v1/backlog_items`, {\n  method: "POST",\n  headers: restHeaders(key),\n  body: JSON.stringify(row),\n});' },
      // The shape scripts/export-backlog-snapshot.js:601 actually has: same URL, a GET.
      { path: "scripts/fixture-gets.js", text: 'const url = `${base}/rest/v1/backlog_items?select=${cols}&limit=${PAGE_SIZE}`;\nconst r = await fetch(url, { headers });' },
      // The supabase-js form of the same write.
      { path: "scripts/fixture-client-insert.js", text: 'await supabase.from("backlog_items").insert([row]);' },
      // A read through the same client, and a PATCH -- neither files a ticket.
      { path: "scripts/fixture-client-select.js", text: 'await supabase.from("backlog_items").select("id").eq("id", id);' },
      { path: "scripts/fixture-patch.js", text: 'await fetch(`${base}/rest/v1/backlog_items?id=eq.${id}`, { method: "PATCH", headers, body });' },
      // A file that never mentions the table at all.
      { path: "scripts/fixture-unrelated.js", text: 'await fetch(`${base}/rest/v1/audit_findings`, { method: "POST", headers, body });' },
      // PROSE, NOT A CALL. This fixture is the defect the check found in ITSELF the moment it became
      // a tracked file: a comment that quotes `fetch(`, quotes rest/v1/backlog_items and quotes
      // method: "POST" opened a slice inside the prose, never balanced it, and swept the cap's worth
      // of comment into one "call". A header comment describing the filing path is not a filing path.
      { path: "scripts/fixture-comment-only.js", text: '// A `fetch(` call to `rest/v1/backlog_items` carrying\n// method: "POST" is what clause A counts.\nexport const NOTHING = 1;\n' },
    ];
    assert.deepEqual(filingPaths(fixtures), ["scripts/fixture-client-insert.js", "scripts/fixture-posts.js"],
      "only the POST and the client insert file a ticket; the GET, the select, the PATCH, the unrelated POST and the COMMENT do not");

    // THE LIVE CONTROLS, not fixtures: the real files, read off this tree. The check's OWN source is
    // one of them, and it is the strongest negative control there is -- it quotes the POST, the URL
    // and the table in its header prose and files nothing.
    const live = [FILER, GETTER, "scripts/check-findings-intake.js"]
      .map(p => ({ path: p, text: fs.readFileSync(path.join(ROOT, p), "utf8") }));
    assert.deepEqual(filingPaths(live), [FILER],
      `${FILER} files; ${GETTER} does not (a URL-only matcher would refuse the snapshot exporter for reading the board) and neither does the check's own source (a comment quoting the call is not the call)`);

    // The comparison passes on the real tree...
    const ok = filingVerdict([FILER]);
    assert.equal(ok.ok, true, "the measured set equals the allowlist today");
    assert.deepEqual(ok.unauthorized, []);
    assert.deepEqual(ok.stoppedFiling, []);

    // MUTATION 1 -- the allowlist emptied: the refusal must fire and NAME the path.
    const emptied = filingVerdict([FILER], []);
    assert.equal(emptied.ok, false, "with an empty allowlist the measured filer is unauthorized -- this refusal must be reachable");
    assert.deepEqual(emptied.unauthorized, [FILER], "and it names the file, not just a count");

    // MUTATION 2 -- the allowlisted filer stopped filing: the other half of the same clause.
    const stopped = filingVerdict([]);
    assert.equal(stopped.ok, false, "an allowlist entry that no longer files is a refusal too -- the check must not silently lose its subject");
    assert.deepEqual(stopped.stoppedFiling, [FILER]);
  });

  // --- B: the six agents' directive, pure ------------------------------------------------------
  await arm("B directiveState refuses six unworded slugs, passes on the ask, passes on the wording", () => {
    assert.deepEqual([...GOVERNED_SLUGS],
      ["pz-guardrails", "rs-guardrails", "ds-guardrails", "bd-guardrails", "vf-guardrails", "au-guardrails"],
      "the six governance guardrail rows this clause grades");
    assert.equal(ALL_GUARDRAIL_SLUGS.length, 8, "the card ask names all eight rows for John's signature");
    assert.match(INTAKE_DIRECTIVE, /public\.audit_findings/);
    assert.match(INTAKE_DIRECTIVE, /ingestFindings\(\)/);
    for (const col of ["found_by", "finding_type", "locations"]) {
      assert.ok(INTAKE_DIRECTIVE.includes(col), `the directive names ${col} -- the three columns the intake refuses without`);
    }
    assert.match(INTAKE_DIRECTIVE, /no agent files a ticket/, "only The Development Manager files");

    // The eight rows in the shape the live table actually returns them: `guardrails` is a JSON
    // ARRAY, not a string -- measured live 2026-09-28, which is why guardrailText() exists.
    const rows = ALL_GUARDRAIL_SLUGS.map(slug => ({ slug, guardrails: [`${slug}: never invent a rule`, "stay inside the kickoff"] }));
    assert.equal(guardrailText(rows[0].guardrails).includes("audit_findings"), false, "no live row names it today");
    assert.equal(guardrailText("a plain string"), "a plain string", "a string column would read the same way");
    assert.equal(guardrailText(null), "", "and a null row is unsatisfied, never a crash");

    // MUTATION -- the ask REMOVED: all six slugs are unsatisfied and every one is named.
    const noAsk = directiveState(rows, []);
    assert.equal(noAsk.ok, false, "with no wording and no ask the clause refuses -- this refusal must be reachable");
    assert.deepEqual(noAsk.missing, [...GOVERNED_SLUGS], "and it names all six, not a count");
    assert.deepEqual(noAsk.byWording, []);
    assert.deepEqual(noAsk.byAsk, []);

    // The ask present: satisfied by the ask, and the ask's id is reported so a reader can find it.
    const ask = { id: "00000000-0000-4000-8000-000000000160", target_kind: "item", target_id: "AGT-160", status: "open" };
    const withAsk = directiveState(rows, [ask]);
    assert.equal(withAsk.ok, true, "an open ask for AGT-160 satisfies every unworded slug");
    assert.deepEqual(withAsk.byAsk, [...GOVERNED_SLUGS]);
    assert.equal(withAsk.ask.id, ask.id);

    // ONLY AN OPEN ASK SUPPRESSES: an answered one does not, or the clause becomes a mute.
    const answered = directiveState(rows, [{ ...ask, status: "answered" }]);
    assert.equal(answered.ok, false, "an answered ask is not a standing ask -- the wording either landed or it did not");
    // And an ask about something else never counts.
    assert.equal(directiveState(rows, [{ ...ask, target_id: "AGT-133" }]).ok, false, "another ticket's ask is not this one's");
    assert.equal(directiveState(rows, [{ ...ask, target_kind: "skill-edit" }]).ok, false, "a skill-edit ask is staff-watch's lane, not this clause's");

    // THE WORDING, WITH NO ASK -- the state John's signature creates, and the clause's exit.
    const worded = ALL_GUARDRAIL_SLUGS.map(slug => ({ slug, guardrails: [INTAKE_DIRECTIVE] }));
    const byWording = directiveState(worded, []);
    assert.equal(byWording.ok, true, "once the rows carry the sentence the clause is green with no ask and no further code");
    assert.deepEqual(byWording.byWording, [...GOVERNED_SLUGS]);
    assert.deepEqual(byWording.byAsk, []);

    // And a PARTIAL landing is still a refusal that names exactly who is left.
    const partial = directiveState(
      ALL_GUARDRAIL_SLUGS.map((slug, i) => ({ slug, guardrails: [i < 2 ? INTAKE_DIRECTIVE : "nothing about findings"] })), []);
    assert.equal(partial.ok, false, "five of six worded is not done");
    assert.deepEqual(partial.byWording, ["pz-guardrails", "rs-guardrails"]);
    assert.deepEqual(partial.missing, ["ds-guardrails", "bd-guardrails", "vf-guardrails", "au-guardrails"]);
  });

  // --- C: LIVE, read-only -- the CLI over this tree ---------------------------------------------
  const haveCreds = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  if (!haveCreds) {
    notRun("AGT-160 arm C -- the CLI's live verdict over this tree",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent, so clause B's live read of public.skill_profiles and public.runner_card_asks could not run and the CLI's exit code here would be clause A's alone. Credentialed run: STANDARDS.md Section 2 rule 5");
  } else {
    await arm("C the CLI exits 0 over this tree and measures exactly one filing path", () => {
      const r = runCli(["--json"]);
      assert.equal(r.status, 0,
        `the check must be green on this tree; got ${r.status}: ${(r.stdout || "").trim()} ${(r.stderr || "").trim()}`);
      const out = JSON.parse(r.stdout);
      assert.deepEqual(out.clause_a.measured, [FILER],
        "exactly one code path inserts a ticket, and it is the Development Manager's own");
      assert.deepEqual(out.clause_a.unauthorized, []);
      assert.deepEqual(out.clause_a.stoppedFiling, []);
      assert.equal(out.clause_b.ok, true, "clause B graded and passed -- by wording or by the standing ask");
      assert.ok(out.clause_b.by_wording.length + out.clause_b.by_ask.length === GOVERNED_SLUGS.length,
        "every governed slug is accounted for by one route or the other");
      assert.deepEqual(out.not_graded, [], "with credentials present nothing is declared ungraded");
      assert.equal(out.directive, INTAKE_DIRECTIVE, "the CLI quotes the one constant, never a restatement");
      console.log(`    [AGT-160] live: filing set ${JSON.stringify(out.clause_a.measured)}; clause B ${out.clause_b.by_wording.length} by wording / ${out.clause_b.by_ask.length} by ask ${out.clause_b.ask_id ?? "(none)"}`);
    });
  }

  // --- D: LIVE, read-only -- the ungraded clause declares itself and never refuses ---------------
  await arm("D credentials deleted: exit 0 or 1, never 2, and clause B says NOT GRADED", () => {
    const env = { ...process.env };
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_KEY;
    const r = runCli([], env);
    assert.notEqual(r.status, 2,
      `an absent credential is NOT GRADED, never a crash; got 2: ${(r.stderr || "").trim()}`);
    assert.ok(r.status === 0 || r.status === 1, `exit 0 or 1; got ${r.status}`);
    assert.ok((r.stdout || "").includes(NOT_GRADED_PREFIX),
      `clause B must declare itself ungraded; got: ${(r.stdout || "").trim()}`);
    assert.match(r.stdout, /SUPABASE_URL and SUPABASE_SERVICE_KEY absent/, "and name what was missing");
    assert.match(r.stdout, /Exit code unchanged/, "and say that the exit code did not move");
    assert.ok(r.stdout.includes("clause A"), "clause A still ran -- the walk needs no credential");

    // The same run in JSON carries the declaration as data, so a caller cannot miss it.
    const j = JSON.parse(runCli(["--json"], env).stdout);
    assert.equal(j.clause_b.ok, null, "null is not false -- an ungraded clause is neither a pass nor a fail");
    assert.equal(j.not_graded.length, 1, "and it is listed once, by name");
    assert.deepEqual(j.clause_a.measured, [FILER], "clause A's measurement is unchanged by the missing credential");
  });

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
