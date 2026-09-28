// DeepBench v7.0.681 | tests/regression/agt-161-market-findings.test.mjs | AGT-161
//
// THE PRODUCT LANE'S PROPOSALS REACH THE ONE FINDINGS LIST. A `feature_signal` row carrying a whole
// `data.proposed_ticket` used to sit in market_records, on no list the Development Manager reviews.
// scripts/market-agent.js now derives a finding from that record -- no model call, nothing re-worded
// (pattern:9, pattern:10) -- and files it through audit-ledger.js's ONE intake (AGT-131), and
// migration `agt161_finding_routes_agent` gives the `agent` source the finding_routes row without
// which finding_group_epic() RAISEs and stops the whole review.
//
// ARMS, each discriminating -- every one FAILS on the tree before the change:
//   A  PURE (no network) -- proposalFindings() over two feature_signals and one competitor yields
//      exactly 2 findings with the kickoff §4 fields (kind `other`, finding_type `proposal`,
//      check_slug `market:feature_signal`, the record as its one location, and the suggested class
//      inside proposed_resolution); fingerprint() is stable across calls and DISTINCT for the two;
//      the empty list yields the empty list. CONTROLS: a feature_signal with NO proposed_ticket
//      still yields a finding, on the row's own title and `unassigned`, and a record whose kind is
//      anything else yields nothing -- a filter wired to "has a proposed_ticket" rather than to the
//      kind passes the first of those and fails the second.
//      Pre-change: proposalFindings did not exist.
//   B  STUBBED (no network) -- raiseFindings() with a `get` returning [] and a recording `post`,
//      apply:true, writes 2 runner_before_images and THEN 2 audit_findings rows, each carrying
//      found_by 'agent:x', session_name 's' on the image and cycle_id null on the row; and
//      cycleId + sessionName TOGETHER throws `exactly one`. CONTROL: the same call with apply
//      falsy posts NOTHING while still returning both verdicts, so a dry run is genuinely dry.
//      Pre-change: raiseFindings did not exist.
//   C  LIVE, READ-ONLY -- finding_routes holds exactly 1 `source=agent` row and its project_slug is
//      NULL (the manager picks, the staff-watch shape); and a real `--raise-findings` DRY RUN over
//      the live table exits 0 or 1 -- NEVER 2 -- and reports `considered` >= 5.
//      Pre-change: 0 agent rows, and the flag was an unrecognized argument (exit 2).
//   D  LIVE -- one `market_size` draft written through `--write` prints `findings.raised 0`: the
//      raise is wired to the KIND, not to "this run inserted something". The row is read back and
//      deleted, and the finding count is re-read equal on both sides of the arm.
//      Pre-change: --write printed no `findings` key at all.
//
// NO ARM WRITES public.audit_findings (SES-382, and audit_findings_guard() refuses every DELETE, so
// a fixture row filed here would be PERMANENT). Arm B's whole network is two stubs; arm C reads; arm
// D's one write is a market_records draft it deletes, and it asserts the ledger did not move.

import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "market-agent.js");
const LEDGER = path.join(ROOT, "scripts", "audit-ledger.js");
const RUN = `${Date.now()}`;

// The live count the backfill landed: Nathan's 2026-09-26 runs left five `feature_signal` rows, and
// the floor is `>=` deliberately -- a later run adding a sixth proposal is the mechanism working,
// not a regression, while a read that finds four means rows went missing.
const CONSIDERED_FLOOR = 5;

const signal = (id, over = {}) => ({
  id,
  kind: "feature_signal",
  title: `Synthetic signal ${id}`,
  data: {
    proposed_ticket: {
      title: `Ticket for ${id}`,
      description: `Do the thing ${id} names.`,
      suggested_class: "P4 - New Customers",
    },
  },
  ...over,
});

async function armA(mod, ledger) {
  const { proposalFindings } = mod;
  const { fingerprint } = ledger;

  const a = signal("aaaaaaaa-0000-4000-8000-000000000001");
  const b = signal("bbbbbbbb-0000-4000-8000-000000000002");
  const c = { id: "cccccccc-0000-4000-8000-000000000003", kind: "competitor", title: "Synthetic competitor", data: {} };

  const found = proposalFindings([a, b, c]);
  assert.equal(found.length, 2, `two feature_signals and one competitor must yield 2 findings; got ${found.length}`);

  assert.deepEqual(found[0], {
    kind: "other",
    finding_type: "proposal",
    check_slug: "market:feature_signal",
    locations: [{ location: `market_records:${a.id}`, text: a.title }],
    governing_fact: `${a.title} -- Ticket for ${a.id}`,
    confidence: "high",
    proposed_resolution: `Do the thing ${a.id} names. [suggested class: P4 - New Customers]`,
  }, "the kickoff §4 field set, exactly");

  // `other` is not a preference: audit_findings_kind_check allows six values and a proposal is none
  // of the other five, which is why the description travels in governing_fact.
  for (const f of found) {
    assert.equal(f.kind, "other", "kind must be one of the table's six, and a proposal is `other`");
    assert.equal(f.finding_type, "proposal", "finding_type is the column that says what this IS");
  }

  // STABLE ACROSS CALLS and DISTINCT between records -- the property that makes a second run read
  // `seen` instead of filing a sixth copy of the same proposal.
  const again = proposalFindings([a, b, c]);
  assert.equal(fingerprint(found[0]), fingerprint(again[0]), "the same record must fingerprint the same twice");
  assert.equal(fingerprint(found[1]), fingerprint(again[1]), "the same record must fingerprint the same twice");
  assert.notEqual(fingerprint(found[0]), fingerprint(found[1]), "two different records must not share one fingerprint");

  assert.deepEqual(proposalFindings([]), [], "no records, no findings");
  assert.deepEqual(proposalFindings(undefined), [], "and an absent list is not a crash");

  // CONTROL 1: a feature_signal with no proposed_ticket STILL raises -- on its own title, with the
  // class unassigned and the manager named as the decider. A filter keyed on the presence of
  // `proposed_ticket` would drop it silently.
  const bare = { id: "dddddddd-0000-4000-8000-000000000004", kind: "feature_signal", title: "Bare signal", data: {} };
  const bareFound = proposalFindings([bare]);
  assert.equal(bareFound.length, 1, "a feature_signal with no proposed_ticket must still raise");
  assert.equal(bareFound[0].governing_fact, "Bare signal -- Bare signal");
  assert.equal(bareFound[0].proposed_resolution, "The Development Manager decides [suggested class: unassigned]");

  // CONTROL 2: and a NON-feature_signal carrying a proposed_ticket raises nothing, so the filter is
  // provably the kind and not the payload.
  const impostor = { id: "eeeeeeee-0000-4000-8000-000000000005", kind: "market_size", title: "Impostor",
    data: { proposed_ticket: { title: "should never be raised" } } };
  assert.deepEqual(proposalFindings([impostor]), [],
    "control: only a feature_signal names a ticket -- the kind decides, never the payload");
}

async function armB(mod) {
  const { raiseFindings } = mod;
  const rows = [
    signal("aaaaaaaa-0000-4000-8000-000000000001"),
    signal("bbbbbbbb-0000-4000-8000-000000000002"),
  ];

  const posts = [];
  const get = async q => {
    assert.match(String(q), /^audit_findings\?select=fingerprint,iso_week,status,locations&/,
      "the shared intake's over-read, unchanged");
    return [];
  };
  const post = async (table, body) => { posts.push({ table, body }); };

  const out = await raiseFindings(rows, { agent: "x", sessionName: "s", get, post, apply: true });
  assert.equal(out.written, 2, `two findings must be written; got ${out.written}`);

  const images = posts.filter(p => p.table === "runner_before_images");
  const filed = posts.filter(p => p.table === "audit_findings");
  assert.equal(images.length, 2, `one before-image per append (§19v); got ${images.length}`);
  assert.equal(filed.length, 2, `two ledger rows; got ${filed.length}`);
  // §19v is an ORDER, not a count: the image authorises the append that follows it.
  assert.ok(posts.indexOf(images[0]) < posts.indexOf(filed[0]) && posts.indexOf(images[1]) < posts.indexOf(filed[1]),
    "each before-image must be posted BEFORE the row it authorises");

  for (const r of filed) {
    assert.equal(r.body.found_by, "agent:x", "found_by is 'agent:' + the flag -- one source, and no agent named in code");
    assert.equal(r.body.finding_type, "proposal");
    assert.equal(r.body.kind, "other");
    assert.equal(r.body.cycle_id, null, "a session filing leaves cycle_id NULL on the row");
    assert.equal(r.body.check_slug, "market:feature_signal");
  }
  for (const i of images) {
    assert.equal(i.body.table_name, "audit_findings");
    assert.equal(i.body.session_name, "s");
    assert.equal(i.body.cycle_id, null);
    assert.equal(i.body.row_data, null, "row_data null = this row did not exist before");
  }

  // Two attributions is refused HERE, not as a 23514 after half a batch is classified.
  await assert.rejects(
    () => raiseFindings(rows, { agent: "x", cycleId: "00000000-0000-4000-8000-000000000161", sessionName: "s", get, post, apply: true }),
    /exactly one/,
    "a cycle AND a session together must be refused by name");

  // CONTROL: a dry run is genuinely dry -- both verdicts, zero posts.
  const dryPosts = [];
  const dry = await raiseFindings(rows, { agent: "x", get, post: async (t, b) => { dryPosts.push({ t, b }); }, apply: false });
  assert.equal(dry.written, 0, "a dry run writes nothing");
  assert.equal(dryPosts.length, 0, "control: a dry run must post NOTHING, not even a before-image");
  assert.deepEqual(dry.verdicts.map(v => v.verdict), ["new", "new"], "and still returns the verdict for every finding");
}

function runScript(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

async function armC(getJson, env) {
  const routes = await getJson("finding_routes?source=eq.agent&select=precedence,source,finding_type,project_slug");
  assert.equal(routes.length, 1, `exactly one finding_routes row for source=agent; got ${routes.length}`);
  assert.equal(routes[0].project_slug, null,
    "project_slug must be NULL -- the Development Manager picks the project, the staff-watch shape");
  assert.equal(routes[0].precedence, 30);
  assert.equal(routes[0].finding_type, "*");

  const dry = runScript(["--raise-findings", "--agent=nathan", "--capability=pmm-feature-signals"], env);
  assert.ok(dry.status === 0 || dry.status === 1,
    `a --raise-findings DRY RUN exits 0 or 1 and NEVER 2 (2 is a refused input); got ${dry.status}: ${dry.stderr.trim()}`);
  const out = JSON.parse(dry.stdout.trim());
  assert.ok(out.considered >= CONSIDERED_FLOOR,
    `the dry run considered ${out.considered} feature_signal rows, expected at least ${CONSIDERED_FLOOR}`);
  assert.equal(out.raised, 0, "a dry run raises nothing");
  assert.equal(out.verdicts.length, out.considered, "one verdict per record considered");
  console.log(`  [AGT-161] dry run: considered=${out.considered} exit=${dry.status} verdicts=${
    JSON.stringify(out.verdicts.reduce((a, v) => ({ ...a, [v.verdict]: (a[v.verdict] ?? 0) + 1 }), {}))}`);
}

async function armD(getJson, env, base, hdr) {
  const session = `agt161-${RUN}`;
  const tagged = () => getJson(`market_records?session_name=eq.${session}&select=id`);
  assert.equal((await tagged()).length, 0, `control premise: rows already tagged ${session}`);
  const ledgerCount = async () => {
    const r = await fetch(`${base}/rest/v1/audit_findings?select=id`, { headers: { ...hdr, Prefer: "count=exact", Range: "0-0" } });
    return Number((r.headers.get("content-range") ?? "/0").split("/")[1]);
  };
  const before = await ledgerCount();

  let ids = [];
  try {
    const answer = {
      records_to_write: [{
        kind: "market_size", title: `agt-161 synthetic fixture ${RUN}`, status: "draft", audience: "internal",
        data: { segment: "synthetic segment", method: "synthetic" },
      }],
      napkin_notes: [], napkin_left: [],
    };
    const w = runScript(["--write", "--agent=nathan", "--capability=pmm-market-size",
      `--answer=${JSON.stringify(answer)}`, `--session-name=${session}`], env);
    assert.equal(w.status, 0, `--write exited ${w.status}: ${w.stderr.trim()}`);
    const wout = JSON.parse(w.stdout.trim());
    ids = wout.ids || [];
    assert.equal(wout.inserted, 1, `--write reported ${wout.inserted} rows, expected exactly 1`);
    assert.ok(wout.findings, "--write must report what it raised, even when that is nothing");
    assert.equal(wout.findings.raised, 0,
      `a market_size draft raises NO finding -- the raise is wired to the kind, not to "this run inserted something"; got ${wout.findings.raised}`);
    assert.deepEqual(wout.findings.verdicts, [], "and there is no verdict to report");
    assert.equal((await tagged()).length, 1, "the session tag holds other than the 1 written row");
    console.log(`  [AGT-161] write: inserted=${wout.inserted} findings.raised=${wout.findings.raised}`);
  } finally {
    const gone = await fetch(`${base}/rest/v1/market_records?session_name=eq.${session}`, { method: "DELETE", headers: hdr });
    if (!gone.ok) console.log(`  [AGT-161] WARNING: fixture cleanup failed (HTTP ${gone.status}) -- delete session_name=${session} by hand`);
  }
  assert.equal((await tagged()).length, 0, `fixture rows survived the cleanup (ids ${JSON.stringify(ids)})`);
  assert.equal(await ledgerCount(), before,
    "NO arm of this file may append to audit_findings -- the table refuses every DELETE, so a fixture row is permanent (SES-382)");
}

async function run() {
  const failures = [];
  const arm = async (name, fn) => {
    try { await fn(); console.log(`    [arm ${name}] ok`); }
    catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); console.log(`    [arm ${name}] FAIL -- ${e.message.split("\n")[0]}`); }
  };

  const mod = await import(pathToFileURL(SCRIPT).href);
  const ledger = await import(pathToFileURL(LEDGER).href);

  await arm("A pure derivation", () => armA(mod, ledger));
  await arm("B stubbed intake", () => armB(mod));

  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    notRun("AGT-161 live arms (C, D)",
      "SUPABASE_URL + SUPABASE_SERVICE_KEY absent -- the agent route row, the dry run's exit code and " +
      "the --write raise are unverified here. Measured live when this shipped (2026-09-28, v7.0.681): " +
      "finding_routes holds exactly 1 source=agent row with project_slug NULL; the dry run considered 5 " +
      "feature_signal rows, all `new`, and exited 1; one market_size draft wrote findings.raised 0. " +
      "Run: node --env-file=.env.local tests/regression/agt-161-market-findings.test.mjs");
  } else {
    const hdr = { apikey: key, Authorization: `Bearer ${key}` };
    const env = { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key };
    const getJson = async q => {
      const r = await fetch(`${url}/rest/v1/${q}`, { headers: hdr });
      if (!r.ok) assert.fail(`GET ${q.split("?")[0]} -> HTTP ${r.status} ${await r.text()}`);
      return r.json();
    };
    await arm("C live route + dry run", () => armC(getJson, env));
    await arm("D live write raises nothing", () => armD(getJson, env, url, hdr));
  }

  if (failures.length) throw new Error(`${failures.length} arm(s) failed:\n      ${failures.join("\n      ")}`);
}

selfRun(import.meta.url, run);
export default run;
