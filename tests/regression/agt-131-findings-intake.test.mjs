// DeepBench v7.0.596 | tests/regression/agt-131-findings-intake.test.mjs | AGT-131
//
// ONE FINDINGS LIST: every agent and process reports into public.audit_findings with a source, a
// type and a location, and only the Development Manager files tickets. This file guards the four
// things that ticket changed, and each arm is RED on the tree it was written against:
//
//   A  PURE -- toRow() carries finding_type (the finding's own value beats the run's) and THROWS
//      when neither exists. Pre-change: the column did not exist and toRow never looked for it.
//   B  STUBBED fetch -- api/_lib/handlers/auditor-write.js's handle() over two findings posts two
//      before-images and two rows, every row carrying finding_type and a found_by that is the
//      agent id ALONE. Pre-change: the handler ran its own copy of the append loop and wrote no
//      type at all. The stub is the whole network: nothing here reaches Supabase.
//   C  STUBBED transports -- the two writers that used to have no reviewer. staff-watch.js's
//      finding and ticket-owner.js's census finding are built by the shipped functions and filed
//      through the shipped ingestFindings(), and the rows are compared field by field.
//      CONTROLS: ten open owner slugs raise ten findings and zero raise none -- a raise wired to
//      "tonight had inserts" rather than to the open set passes the first and fails the second.
//   D  LIVE (credential-gated) -- the database itself refuses what the code now refuses: a joined
//      `found_by` is 23514 and a missing `finding_type` is 23502, while a dry-run ingest of a
//      typeless fixture STILL exits 1. That last one is not padding: a type check that fired on
//      the dry run would break the runbook's step 3 signal, and only a run proves it does not.
//
// NOTHING HERE MUTATES THE LEDGER. Arm D's two live POSTs are REFUSALS -- the rows they describe
// are rejected by a constraint, so nothing lands and nothing needs cleaning up (which matters more
// than usual here: audit_findings_guard() refuses every DELETE, so a fixture row filed by a test
// would be permanent). Arms A-C touch no network at all.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER = path.join(ROOT, "scripts", "audit-ledger.js");
const CYCLE = "386e52e6-08ae-4bf6-ad3d-5944882fb8ff";
const ID = "00000000-0000-4000-8000-000000000131";

function finding(extra = {}) {
  return {
    kind: "contradiction",
    locations: [{ location: "docs/a.md:1", text: "a" }],
    governing_fact: "a fact",
    confidence: "high",
    proposed_resolution: "fix it",
    ...extra,
  };
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    ok  ${name}`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    FAIL ${name}: ${e.message.split("\n")[0]}`); }
  };

  const ledger = await import(pathToFileURL(LEDGER).href);
  const { toRow, findingTypeOf, FINDING_TYPES, ingestFindings } = ledger;

  // --- A: the row shape, pure ------------------------------------------------------------------
  await arm("A toRow carries finding_type and refuses a typeless row", () => {
    assert.deepEqual([...FINDING_TYPES], ["defect", "gap", "proposal", "security"],
      "the four values the table's CHECK allows, in the ticket's order");

    const fromRun = toRow(finding(), { week: "2026-W38", foundBy: "hand:qa", cycleId: CYCLE, id: ID, findingType: "defect" });
    assert.equal(fromRun.finding_type, "defect", "the run's --type files when the finding carries none");

    const fromFinding = toRow(finding({ finding_type: "gap" }), { week: "2026-W38", foundBy: "hand:qa", cycleId: CYCLE, id: ID, findingType: "defect" });
    assert.equal(fromFinding.finding_type, "gap",
      "a finding's OWN type beats the run's -- a batch may legitimately mix a census gap with a routine defect");

    assert.throws(() => toRow(finding(), { week: "2026-W38", foundBy: "hand:qa", cycleId: CYCLE, id: ID }),
      /finding_type is required and has no default/,
      "neither the finding nor the run said what this is: that is exit 2 here, never a 23502 from PostgREST");
    assert.throws(() => findingTypeOf({}, null), /finding_type is required/);
    assert.equal(findingTypeOf({}, "security"), "security");

    // CONTROL: every other column still passes through unchanged, so a row that gained a type did
    // not quietly lose anything else.
    assert.equal(fromRun.found_by, "hand:qa");
    assert.equal(fromRun.check_slug, null);
    assert.equal(fromRun.cycle_id, CYCLE);
    assert.equal(fromRun.status, "open");
  });

  // --- B: the Auditor's handler, over a stubbed network ------------------------------------------
  await arm("B auditor-write files typed, single-source rows through the shared intake", async () => {
    const { handle } = await import(pathToFileURL(path.join(ROOT, "api", "_lib", "handlers", "auditor-write.js")).href);

    const posts = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      const u = String(url);
      const method = init.method ?? "GET";
      if (method === "GET") {
        // The over-read: no row shares a fingerprint with this batch and none is ruled out.
        assert.match(u, /audit_findings\?select=fingerprint,iso_week,status,locations&or=/,
          "the shared intake must still over-read by fingerprint OR not-a-defect");
        return { ok: true, status: 200, text: async () => "[]" };
      }
      posts.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 201, text: async () => "" };
    };

    let out;
    try {
      out = await handle({
        agent_id: "auditor",
        tenant_id: "global",
        content: { cluster: "agt-131", findings: [finding(), finding({ governing_fact: "another fact", locations: [{ location: "docs/b.md:2", text: "b" }] })] },
        supabaseUrl: "https://stub.invalid",
        supabaseHeaders: { apikey: "stub" },
        handler_context: { week: "2026-W38", trace_id: "agt131-stub" },
      });
    } finally {
      globalThis.fetch = realFetch;
    }

    assert.deepEqual({ week: out.week, written: out.written, reseen: out.reseen, skipped: out.skipped },
      { week: "2026-W38", written: 2, reseen: 0, skipped: 0 });

    const images = posts.filter(p => p.url.includes("runner_before_images"));
    const rows = posts.filter(p => p.url.includes("/audit_findings"));
    assert.equal(images.length, 2, `two before-images, one per append (§19v); got ${images.length}`);
    assert.equal(rows.length, 2, `two rows; got ${rows.length}`);
    // §19v is an ORDER, not a count: every image must precede the row it authorises.
    assert.ok(posts.indexOf(images[0]) < posts.indexOf(rows[0]) && posts.indexOf(images[1]) < posts.indexOf(rows[1]),
      "each before-image is written FIRST and only its success authorises the append");

    for (const r of rows) {
      assert.equal(r.body.finding_type, "defect", "the Auditor's intents report governance defects");
      assert.equal(r.body.found_by, "auditor", "found_by is the agent id ALONE -- one source per row, never a join");
      assert.ok(!/ \+ /.test(r.body.found_by), "a joined found_by is what audit_findings_found_by_single refuses");
      assert.equal(r.body.iso_week, "2026-W38");
    }
    for (const i of images) {
      assert.equal(i.body.table_name, "audit_findings");
      assert.equal(i.body.row_data, null, "row_data null = this row did not exist before");
      assert.equal([i.body.cycle_id, i.body.session_name].filter(v => v != null).length, 1,
        "exactly one attribution, the rule ck_before_image_attribution enforces");
    }

    // CONTROL: a declared finding_type on the context wins, and a finding's own value beats both.
    const posts2 = [];
    globalThis.fetch = async (url, init = {}) => {
      if ((init.method ?? "GET") === "GET") return { ok: true, status: 200, text: async () => "[]" };
      posts2.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 201, text: async () => "" };
    };
    try {
      await handle({
        agent_id: "auditor", tenant_id: "global",
        content: { findings: [finding(), finding({ governing_fact: "third fact", locations: [{ location: "docs/c.md:3", text: "c" }], finding_type: "proposal" })] },
        supabaseUrl: "https://stub.invalid", supabaseHeaders: { apikey: "stub" },
        handler_context: { week: "2026-W38", finding_type: "security" },
      });
    } finally {
      globalThis.fetch = realFetch;
    }
    const types = posts2.filter(p => p.url.includes("/audit_findings")).map(p => p.body.finding_type);
    assert.deepEqual(types, ["security", "proposal"],
      "handler_context's type covers the batch; a finding that declares its own keeps it");
  });

  // --- C: the two writers that had no reviewer ---------------------------------------------------
  await arm("C staff-watch and ticket-owner raise the exact rows, through the shipped intake", async () => {
    const staff = await import(pathToFileURL(path.join(ROOT, "scripts", "staff-watch.js")).href);
    const owner = await import(pathToFileURL(path.join(ROOT, "scripts", "ticket-owner.js")).href);

    // (1) THE STAFF FINDING. The detail carries a cycle uuid, exactly as a real one does.
    const detail = "CLAIM LABEL COLLISION: run-project:moat-support:1 on cycle 3680eccd-c909-499a-84ca-bbf488fc2359.";
    const sf = staff.ledgerFindingFor({ agent: "devmanager", kind: "assignment mismatch", detail, backlog: "SES-378" });
    assert.deepEqual(sf, {
      kind: "other",
      check_slug: "staff:assignment-mismatch",
      locations: [
        { location: "agents:devmanager", text: detail },
        { location: "backlog_items:SES-378", text: detail },
      ],
      governing_fact: "claim label collision: run-project:moat-support:1 on cycle <uuid>",
      confidence: "high",
      proposed_resolution: "Skill edit via --promote at the bar",
    }, "the staff finding's exact shape, uuid-masked governing fact and all");
    assert.deepEqual(staff.ledgerFindingFor({ agent: "devmanager", kind: "assignment mismatch", detail }).locations,
      [{ location: "agents:devmanager", text: detail }], "no backlog, no second location");
    // The masking is the FINGERPRINT's, shared and not re-spelled: same defect, new cycle uuid,
    // same governing fact -- which is the only reason a recurrence can ever be recognised.
    const other = detail.replace("3680eccd-c909-499a-84ca-bbf488fc2359", "baa6df39-bdb4-4c41-b6bd-6a49800993b6");
    assert.equal(staff.ledgerFindingFor({ agent: "devmanager", kind: "assignment mismatch", detail: other }).governing_fact,
      sf.governing_fact, "two cycles reporting one defect must produce ONE governing fact");

    const posted = [];
    const stub = {
      get: async () => [],
      post: async (table, body) => { posted.push({ table, body }); },
    };
    const staffRun = await ingestFindings({
      findings: [sf], week: "2026-W39", foundBy: "staff-watch:devmanager", findingType: "defect",
      cycleId: CYCLE, apply: true, ...stub,
    });
    assert.equal(staffRun.written, 1);
    const staffRow = posted.find(p => p.table === "audit_findings").body;
    assert.equal(staffRow.finding_type, "defect");
    assert.equal(staffRow.found_by, "staff-watch:devmanager");
    assert.equal(staffRow.check_slug, "staff:assignment-mismatch");
    assert.equal(staffRow.kind, "other");
    assert.equal(staffRow.cycle_id, CYCLE);

    // (2) THE OWNER'S CENSUS. Ten checks still open tonight -> ten findings, one each.
    const now = "2026-09-25T00:00:00.000Z";
    const tenSlugs = owner.CHECKS.slice(0, 10);
    const prior = tenSlugs.map((slug, i) => ({
      id: `p${i}`, backlog_id: `ZZ-${i}`, check_slug: slug, first_seen_at: `2026-09-0${(i % 9) + 1}T00:00:00.000Z`,
    }));
    const openTen = owner.openJudgmentBySlug(prior, { insert: [], clear: [] }, now);
    assert.equal(openTen.length, 10, `ten open checks raise ten findings; got ${openTen.length}`);
    assert.deepEqual(openTen.map(o => o.slug), owner.CHECKS.filter(c => tenSlugs.includes(c)),
      "one per check, in CHECKS order");

    // CONTROL, and the one that matters: every open row cleared tonight raises NOTHING. A raise
    // driven by "the census ran" rather than by the open set passes the case above and fails here.
    assert.deepEqual(owner.openJudgmentBySlug(prior, { insert: [], clear: prior.map(p => p.id) }, now), [],
      "zero open rows raise zero findings");
    // CONTROL: a row inserted tonight counts as open, and an older prior row owns the `oldest`.
    const slug = owner.CHECKS[0];
    const mixed = owner.openJudgmentBySlug(
      [{ id: "old", backlog_id: "ZZ-1", check_slug: slug, first_seen_at: "2026-08-01T00:00:00.000Z" }],
      { insert: [{ check_slug: slug }, { check_slug: slug }], clear: [] }, now);
    assert.deepEqual(mixed, [{ slug, count: 3, oldest: "2026-08-01T00:00:00.000Z" }],
      "prior ∪ insert − clear, and the oldest first_seen is the prior row's, not tonight's");

    const cf = owner.censusFindingFor(mixed[0]);
    assert.deepEqual(cf, {
      kind: "other",
      check_slug: `owner:${slug}`,
      locations: [{ location: `ticket_owner_findings:${slug}`, text: "3 open rows, oldest first_seen 2026-08-01T00:00:00.000Z" }],
      governing_fact: `Ticket Owner check ${slug} holds open judgment rows a capability must decide`,
      confidence: "high",
      proposed_resolution: "rule the rows or retire the check",
    }, "the census finding's exact shape");
    // THE COUNT LIVES IN `text` AND NOWHERE ELSE, so the fingerprint is stable per slug and week --
    // a governing fact carrying the number would mint a new finding every night it moved.
    assert.ok(!/\d+ open rows/.test(cf.governing_fact), "no count in the governing fact");
    assert.equal(ledger.fingerprint(cf), ledger.fingerprint(owner.censusFindingFor({ slug, count: 99, oldest: mixed[0].oldest })),
      "the same check with a different count is the SAME finding");

    const posted2 = [];
    const ownerRun = await ingestFindings({
      findings: openTen.map(owner.censusFindingFor), week: "2026-W39", foundBy: "ticket-owner:census",
      findingType: "gap", cycleId: CYCLE, apply: true,
      get: async () => [], post: async (table, body) => { posted2.push({ table, body }); },
    });
    assert.equal(ownerRun.written, 10, "ten open slugs file ten rows");
    const ownerRows = posted2.filter(p => p.table === "audit_findings").map(p => p.body);
    assert.equal(ownerRows.length, 10);
    for (const r of ownerRows) {
      assert.equal(r.finding_type, "gap", "an undecided check is a gap, not a defect");
      assert.equal(r.found_by, "ticket-owner:census");
      assert.ok(r.check_slug.startsWith("owner:"));
    }
    assert.equal(posted2.filter(p => p.table === "runner_before_images").length, 10, "one before-image each");
  });

  // --- D: the database refuses what the code refuses ----------------------------------------------
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";

  // The dry run needs no credentials to be worth running, but audit-ledger.js asks for them before
  // it reads, so this arm is gated whole.
  if (!url || !key) {
    notRun("AGT-131 live arm (D)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the 23514/23502 refusals and the dry-run exit code are unverified here. Run: node --env-file=.env.local tests/regression/agt-131-findings-intake.test.mjs");
  } else {
    await arm("D the constraints refuse a joined source and a typeless row", async () => {
      const post = async body => {
        const res = await fetch(`${url}/rest/v1/audit_findings`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(body),
        });
        return { status: res.status, text: await res.text().catch(() => "") };
      };
      const base = {
        fingerprint: "zzagt131test01", iso_week: "2026-W01", kind: "contradiction",
        locations: [{ location: "docs/agt131.md:1", text: "t" }],
        governing_fact: "agt-131 regression probe — refused by design, never filed",
        confidence: "high", proposed_resolution: "none",
      };

      const joined = await post({ ...base, found_by: "a + b", finding_type: "defect" });
      assert.ok(joined.text.includes("23514"), `a joined found_by must be refused 23514; got ${joined.status} ${joined.text.slice(0, 200)}`);
      assert.ok(joined.text.includes("audit_findings_found_by_single"), `and by THAT constraint; got ${joined.text.slice(0, 200)}`);

      const typeless = await post({ ...base, found_by: "agt-131:test" });
      assert.ok(typeless.text.includes("23502"), `a row with no finding_type must be refused 23502; got ${typeless.status} ${typeless.text.slice(0, 200)}`);
      assert.ok(typeless.text.includes("finding_type"), `and name the column; got ${typeless.text.slice(0, 200)}`);

      // CONTROL: the backfill did not leave a hole, and the 27 historical joined rows are history,
      // not casualties -- the NOT VALID constraint was never applied to them.
      const read = async q => {
        const r = await fetch(`${url}/rest/v1/audit_findings?${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" } });
        return Number((r.headers.get("content-range") ?? "/0").split("/")[1]);
      };
      assert.equal(await read("select=id&finding_type=is.null"), 0, "every filed row says what it is");
      assert.equal(await read("select=id&found_by=like.*+%2B+*"), 27, "the 27 joined-source rows stay, as history");
      assert.ok(await read("select=id&finding_type=eq.defect") >= 92, "the backfill typed the Auditor's governance findings");
    });

    await arm("D2 a typeless DRY RUN still exits 1 -- the runbook's step 3 signal survives", () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agt131-"));
      const fixture = path.join(tmp, "candidates.json");
      try {
        // A fixture with NO finding_type anywhere, and a finding the ledger has never seen.
        fs.writeFileSync(fixture, JSON.stringify({
          week: "2026-W01",
          found_by: "hand:agt-131-qa",
          findings: [finding({
            governing_fact: `agt-131 dry-run probe ${Date.now()}`,
            locations: [{ location: "docs/agt131-dry.md:1", text: "d" }],
          })],
        }), "utf8");
        const dry = spawnSync(process.execPath, [LEDGER, `--ingest=${fixture}`, "--week=2026-W01"], { encoding: "utf8", cwd: ROOT, env: process.env });
        assert.equal(dry.status, 1,
          `a dry run of one unseen, typeless finding must still exit 1 (not 2); got ${dry.status}: ${dry.stderr.trim()}`);
        assert.match(dry.stderr, /1 new findings to file/, `the step 3 signal; got: ${dry.stderr.trim()}`);
        // And the SAME fixture under --apply is refused before it writes anything.
        const applied = spawnSync(process.execPath, [LEDGER, `--ingest=${fixture}`, "--week=2026-W01", "--apply", `--session-name=agt-131-test`], { encoding: "utf8", cwd: ROOT, env: process.env });
        assert.equal(applied.status, 2, `--apply with no type anywhere is exit 2; got ${applied.status}: ${applied.stderr.trim()}`);
        assert.match(applied.stderr, /finding_type is required/, `naming the missing type; got: ${applied.stderr.trim()}`);
        // CONTROL: the same fixture with --type files nothing here (dry) but is ACCEPTED as typed.
        const typed = spawnSync(process.execPath, [LEDGER, `--ingest=${fixture}`, "--week=2026-W01", "--type=nonsense"], { encoding: "utf8", cwd: ROOT, env: process.env });
        assert.equal(typed.status, 2, "a --type outside the four is refused by name, not by PostgREST");
        assert.match(typed.stderr, /not one of the four finding types/, `got: ${typed.stderr.trim()}`);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
