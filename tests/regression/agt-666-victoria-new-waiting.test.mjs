// DeepBench v7.0.1020 | tests/regression/agt-666-victoria-new-waiting.test.mjs | AGT-666 -- Victoria's daily check reaches a NEW waiting ticket nobody has graded.
//
// John's rule (decision 572d2b06, 2026-11-13): build it, but she only grades waiting tickets filed
// inside his window. On 2026-11-13 the daily check answered `at_floor` while AGT-637 sat ungraded in a
// planned list -- no arm of `victoria_daily_check()` could see a new waiting ticket she never graded.
//
// WHAT THIS PINS.
//   OFFLINE (always run):
//   * F -- `newOnlyFilter()` (scripts/requirement-check.js, imported by ticket-validation.js) keeps
//     ONLY the tickets `victoria_new_waiting()` names for THIS slug: a row of another list admits
//     nothing, an unnamed ticket is dropped. The pair (keep one / drop the rest) is the discriminator --
//     an identity filter and an empty filter both fail it.
//   * W -- both doors, driven as real CLIs against a local mock PostgREST (127.0.0.1, a placeholder
//     key that is no secret): `--new-only` reads `rpc/victoria_new_waiting` once and keeps exactly the
//     slug's named ticket (1 of 3); a list with nothing new is exit 1; an executing list refuses the
//     flag with exit 2 BEFORE reading the rpc; and WITHOUT the flag the rpc is never read. A door whose
//     `--new-only` filtering is removed keeps 3 of 3 (or never reads the rpc) and this arm goes red.
//   * B -- the routine block: names `new_waiting`, `--new-only` and `victoria_new_waiting()`, names
//     the verdict by its 4-arg signature, and carries NO window number. Neither door carries one
//     either: the window lives once, in `public.victoria_new_waiting()`.
//   CREDENTIALED (skips cleanly without SUPABASE_URL / SUPABASE_SERVICE_KEY):
//   * V -- the verdict's four arms in order (each old arm wins over arm 4; arm 4 alone answers
//     `new_waiting`; all zero is `at_floor`) and the 3-arg call still resolving (the DEFAULT).
//   * R -- `detail.new_waiting` / `new_ids` equal `victoria_new_waiting()` and are re-derived from the
//     raw board: every predicate except the window is applied in JavaScript (planned list, open/
//     partial, no standing grade, no live fit-stamp) and the function's ids must be a subset of that
//     set AND an age suffix of it -- the window's number is never restated here (one home).
//   Before docs/design/agt-666-victoria-new-waiting.sql is applied, V is RED (no 4-arg verdict:
//   PGRST202). That is expected and turns green on apply.
//
// READ-ONLY, always: every live call is a GET or a read-only rpc.

import assert from "assert";
import fs from "fs";
import http from "http";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";
import { newOnlyFilter, NEW_WAITING_RPC } from "../../scripts/requirement-check.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUNBOOK = path.join(ROOT, "docs", "runbooks", "victoria-daily-check.md");
const RC = path.join(ROOT, "scripts", "requirement-check.js");
const TV = path.join(ROOT, "scripts", "ticket-validation.js");
const BEGIN = "<!-- VICTORIA-DAILY-CHECK-PROMPT-BEGIN -->";
const END = "<!-- VICTORIA-DAILY-CHECK-PROMPT-END -->";

// --- the mock PostgREST: just enough of the board for both doors to reach their filter -----------
const LISTS = { wait: "planned", exec: "executing" };
const TICKETS = ["T-1", "T-2", "T-3"].map(id => ({
  backlog_id: id, title: id, description: `${id} body`, status: "open", type: "bug",
  priority_class: "P10", scope_origin: "discovered", epic_id: "e1", need_source: null,
  need_score: null, filed_at: "2026-11-10T00:00:00Z",
}));

function startMock(newRows) {
  const calls = [];
  const server = http.createServer((req, res) => {
    const u = req.url.replace(/^\/rest\/v1\//, "");
    calls.push(`${req.method} ${u.split("?")[0]}`);
    const send = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    req.resume();
    req.on("end", () => {
      if (req.method === "GET" && u.startsWith("projects?slug=eq.")) {
        const slug = decodeURIComponent(/slug=eq\.([^&]+)/.exec(u)[1]);
        return send(200, LISTS[slug] ? [{ id: `p-${slug}`, slug, name: slug, status: LISTS[slug] }] : []);
      }
      if (req.method === "GET" && u.startsWith("epics?")) return send(200, [{ id: "e1" }]);
      if (req.method === "GET" && u.startsWith("backlog_items?")) return send(200, TICKETS);
      if (u === "rpc/victoria_charter_state") {
        return send(200, [{ fingerprint: "fp", charters: [{ slug: "exec", charter: "c" }], stamped: [] }]);
      }
      if (u === "rpc/victoria_parked_homes") return send(200, []);
      if (u === `rpc/${NEW_WAITING_RPC}`) return send(200, newRows);
      if (u === "rpc/needs_validation") return send(200, TICKETS.map(t => ({ backlog_id: t.backlog_id })));
      // The stop point: every door reads grade_standing right after the filter. 418 is no transport
      // code, so the suite never mistakes this planned stop for an outage.
      if (u === "rpc/grade_standing") return send(418, "mock stop after the filter");
      return send(404, `mock has no route for ${req.method} ${u}`);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, calls })));
}

function runDoor(script, args, port) {
  return new Promise(resolve => {
    execFile(process.execPath, [script, ...args], {
      cwd: ROOT,
      env: {
        PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "",
        SUPABASE_URL: `http://127.0.0.1:${port}`,
        // A placeholder for a localhost mock -- not a credential, and never sent off this machine.
        SUPABASE_SERVICE_KEY: "agt666-offline-mock",
        DEEPBENCH_TEST_SLOT: "off",
      },
      timeout: 60000,
    }, (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === "number" ? err.code : -1) : 0, stdout, stderr }));
  });
}

async function door(script, args, newRows) {
  const { server, calls } = await startMock(newRows);
  try {
    const r = await runDoor(script, args, server.address().port);
    return { ...r, calls };
  } finally {
    await new Promise(res => server.close(res));
  }
}

async function run() {
  const results = [];

  // --- F: the pure filter ----------------------------------------------------------------------
  const rows = [
    { backlog_id: "T-2", slug: "wait", filed_at: "2026-11-10T00:00:00Z" },
    { backlog_id: "T-3", slug: "other", filed_at: "2026-11-10T00:00:00Z" },
    { backlog_id: "T-9", slug: "wait", filed_at: "2026-11-10T00:00:00Z" },
  ];
  assert.deepStrictEqual(newOnlyFilter(TICKETS, rows, "wait").map(t => t.backlog_id), ["T-2"],
    "newOnlyFilter must keep ONLY the list's tickets that victoria_new_waiting() names for THIS slug -- "
    + "T-2 (named for wait), not T-1 (unnamed) and not T-3 (named for another list).");
  assert.deepStrictEqual(newOnlyFilter(TICKETS, rows, "other").map(t => t.backlog_id), ["T-3"],
    "and for another slug, only that slug's named ticket.");
  assert.deepStrictEqual(newOnlyFilter(TICKETS, [], "wait"), [],
    "no rows from the function means nothing is new -- nothing kept.");
  assert.deepStrictEqual(newOnlyFilter(TICKETS, null, "wait"), [], "a null rpc body keeps nothing.");
  results.push("filter-keeps-only-this-slugs-new-tickets");

  // --- W: both doors, wired, against the mock ----------------------------------------------------
  const one = [{ backlog_id: "T-2", slug: "wait", filed_at: "2026-11-10T00:00:00Z" },
               { backlog_id: "T-3", slug: "other", filed_at: "2026-11-10T00:00:00Z" }];
  const nwCall = `POST ${`rpc/${NEW_WAITING_RPC}`}`;
  const cases = [
    { name: "requirement-check", script: RC, base: ["--prepare-list", "--project=wait"], exec: ["--prepare-list", "--project=exec"] },
    { name: "ticket-validation", script: TV, base: ["--prepare", "--list=wait"], exec: ["--prepare", "--list=exec"] },
  ];
  for (const c of cases) {
    let r = await door(c.script, [...c.base, "--new-only"], one);
    assert.ok(/--new-only kept 1 of 3 ticket/.test(r.stderr) && r.calls.includes(nwCall),
      `${c.name} --new-only must read rpc/${NEW_WAITING_RPC} and keep exactly 1 of 3 tickets on list wait. `
      + `exit ${r.code}, calls ${JSON.stringify(r.calls)}, stderr: ${r.stderr.slice(0, 600)}`);
    assert.ok(/rpc\/grade_standing -> HTTP 418/.test(r.stderr) && r.code === 1,
      `${c.name} --new-only must go on past the filter to the next read (the mock's planned stop). `
      + `exit ${r.code}, stderr: ${r.stderr.slice(0, 600)}`);

    r = await door(c.script, [...c.base, "--new-only"], [one[1]]);
    assert.strictEqual(r.code, 1,
      `${c.name} --new-only on a list with no new ticket must refuse with exit 1, got ${r.code}: ${r.stderr.slice(0, 400)}`);
    assert.ok(/holds no new waiting ticket/.test(r.stderr) && !r.calls.includes("POST rpc/grade_standing"),
      `${c.name}: the empty refusal must say so plainly and stop before any further read. stderr: ${r.stderr.slice(0, 400)}`);

    r = await door(c.script, [...c.exec, "--new-only"], one);
    assert.strictEqual(r.code, 2,
      `${c.name} --new-only on an executing list must be a usage refusal (exit 2), got ${r.code}: ${r.stderr.slice(0, 400)}`);
    assert.ok(!r.calls.includes(nwCall),
      `${c.name}: the executing refusal must come before rpc/${NEW_WAITING_RPC} is read. calls ${JSON.stringify(r.calls)}`);

    r = await door(c.script, c.base, one);
    assert.ok(!r.calls.includes(nwCall) && !/--new-only/.test(r.stderr),
      `${c.name} WITHOUT --new-only must never read rpc/${NEW_WAITING_RPC} -- the door is unchanged without `
      + `the flag. calls ${JSON.stringify(r.calls)}`);
  }
  results.push("both-doors-filter-on-new-only-refuse-executing-and-are-unchanged-without-it");

  // --- B: the routine block and the scripts carry no window ----------------------------------------
  const book = fs.readFileSync(RUNBOOK, "utf8");
  const block = book.split(BEGIN)[1].split(END)[0];
  for (const s of ["new_waiting", "--new-only", "public.victoria_new_waiting()",
    "public.victoria_daily_verdict(jsonb, integer, integer, integer)"]) {
    assert.ok(block.includes(s), `the routine block must name ${s} (AGT-666 step 2 / step 1).`);
  }
  assert.ok(/On reason new_waiting the lists are ONLY the slugs/.test(block)
    && /pass --new-only to BOTH doors/.test(block),
    "step 2 must say that on reason new_waiting the run takes ONLY the slugs victoria_new_waiting() returns "
    + "and passes --new-only to both doors (AGT-666).");
  assert.ok(!/\b30\b/.test(block),
    "the routine block names the number 30 -- John's window lives once, in public.victoria_new_waiting().");
  for (const f of [RC, TV]) {
    const src = fs.readFileSync(f, "utf8");
    assert.ok(!/\b30\s*-?\s*(days?|d)\b/i.test(src) && !/interval\s*'30/i.test(src),
      `${path.basename(f)} restates a 30-day window -- the window lives once, in public.victoria_new_waiting().`);
    assert.ok(src.includes("newOnlyFilter("),
      `${path.basename(f)} must filter through newOnlyFilter() (one home for the rule).`);
  }
  results.push("block-names-the-arm-and-flag-and-no-window-number-anywhere");

  // --- credentialed ------------------------------------------------------------------------------
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!base || !key) {
    notRun("AGT-666 arms V and R (the verdict's four arms and the 3-arg default; detail.new_waiting re-derived from the raw board)",
      "SUPABASE_URL / SUPABASE_SERVICE_KEY absent -- the arm is a pair of database functions. Arms F, W and B ran. "
      + "Run: node --env-file-if-exists=.env.local tests/regression/agt-666-victoria-new-waiting.test.mjs");
    return results;
  }

  const hdr = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async q => {
    const r = await fetch(`${base}/rest/v1/${q}`, { headers: { ...hdr, Prefer: "count=exact" } });
    if (!r.ok) assert.fail(`GET ${q} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    const out = await r.json();
    const total = Number(String(r.headers.get("content-range") ?? "").split("/")[1]);
    if (Number.isInteger(total)) {
      assert.strictEqual(out.length, total, `GET ${q} returned ${out.length} of ${total} rows -- raise the limit.`);
    }
    return out;
  };
  const rpc = async (fn, body = {}) => {
    const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
    if (!r.ok) assert.fail(`rpc/${fn} -> HTTP ${r.status}: ${await r.text().catch(() => "")}`);
    return r.json();
  };
  const only = r => { assert.ok(Array.isArray(r) && r.length === 1, `expected one row, got ${JSON.stringify(r).slice(0, 200)}`); return r[0]; };

  // --- V: the verdict's four arms -----------------------------------------------------------------
  const v4 = async (c, f, u, w) => only(await rpc("victoria_daily_verdict",
    { p_counts: [{ slug: "a", countable: c }], p_fives: f, p_ungraded_active: u, p_new_waiting: w }));
  for (const [c, f, u, w, p, why] of [
    [9, 0, 0, 1, true, "project_below_floor"],
    [10, 1, 0, 1, true, "five_outside_projects"],
    [10, 0, 1, 1, true, "ungraded_in_active"],
    [10, 0, 0, 1, true, "new_waiting"],
    [10, 0, 0, 0, false, "at_floor"],
  ]) {
    const v = await v4(c, f, u, w);
    assert.deepStrictEqual([v.prompt, v.reason], [p, why],
      `victoria_daily_verdict(countable ${c}, fives ${f}, ungraded_active ${u}, new_waiting ${w}) must answer `
      + `${p} / ${why}, got ${JSON.stringify(v)} (AGT-666: arm 4 answers only after the three old arms).`);
  }
  const v3 = only(await rpc("victoria_daily_verdict",
    { p_counts: [{ slug: "a", countable: 10 }], p_fives: 0, p_ungraded_active: 0 }));
  assert.deepStrictEqual([v3.prompt, v3.reason], [false, "at_floor"],
    `the 3-arg call must still resolve (p_new_waiting DEFAULT 0) and read at_floor, got ${JSON.stringify(v3)}.`);
  results.push("verdict-four-arms-in-order-and-3-arg-default");

  // --- R: detail.new_waiting re-derived from the raw board -----------------------------------------
  const row = only(await rpc("victoria_daily_check"));
  const d = row.detail ?? {};
  const fnRows = await rpc(NEW_WAITING_RPC);
  const fnIds = fnRows.map(r => r.backlog_id).sort();
  assert.deepStrictEqual([...(d.new_ids ?? [])].sort(), fnIds,
    `detail.new_ids ${JSON.stringify(d.new_ids)} must be victoria_new_waiting()'s ids ${JSON.stringify(fnIds)}.`);
  assert.strictEqual(d.new_waiting, fnIds.length, `detail.new_waiting ${d.new_waiting} must count new_ids (${fnIds.length}).`);

  const planned = await get("projects?status=eq.planned&select=id,slug");
  const slugOfProject = new Map(planned.map(p => [p.id, p.slug]));
  const epics = planned.length
    ? await get(`epics?project_id=in.(${planned.map(p => p.id).join(",")})&select=id,project_id&limit=5000`) : [];
  const slugOfEpic = new Map(epics.map(e => [e.id, slugOfProject.get(e.project_id)]));
  const open = await get("backlog_items?status=in.(open,partial)&epic_id=not.is.null"
    + "&select=backlog_id,epic_id,filed_at&limit=10000");
  const graded = new Set((await get("runner_decisions?kind=eq.requirement-check&reversed_at=is.null"
    + "&backlog_id=not.is.null&select=backlog_id&limit=100000")).map(r => r.backlog_id));
  const stamped = new Set(only(await rpc("victoria_charter_state")).stamped ?? []);
  const raw = open.filter(b => slugOfEpic.has(b.epic_id) && !graded.has(b.backlog_id) && !stamped.has(b.backlog_id));
  const rawById = new Map(raw.map(b => [b.backlog_id, b]));

  const leak = fnRows.filter(r => !rawById.has(r.backlog_id)
    || slugOfEpic.get(rawById.get(r.backlog_id).epic_id) !== r.slug);
  assert.deepStrictEqual(leak, [],
    `victoria_new_waiting() returned rows the raw board does not hold as planned, open/partial, ungraded and `
    + `unstamped on that slug: ${JSON.stringify(leak)}`);
  if (fnIds.length > 0) {
    const oldest = Math.min(...fnIds.map(id => Date.parse(rawById.get(id).filed_at)));
    const suffix = raw.filter(b => b.filed_at && Date.parse(b.filed_at) >= oldest).map(b => b.backlog_id).sort();
    assert.deepStrictEqual(fnIds, suffix,
      `victoria_new_waiting() ids are not an age suffix of the raw board: function ${JSON.stringify(fnIds)}, `
      + `raw filed since ${new Date(oldest).toISOString()} ${JSON.stringify(suffix)}.`);
  }
  if (row.reason === "at_floor") {
    assert.strictEqual(d.new_waiting, 0, `the reader answered at_floor with ${d.new_waiting} new waiting ticket(s).`);
  }
  console.log(`         AGT-666 live: ${row.prompt} / ${row.reason} | new_waiting ${d.new_waiting} `
    + `${JSON.stringify(d.new_ids)} of ${raw.length} ungraded unstamped planned ticket(s)`);
  results.push("new-waiting-re-derived-from-the-raw-board");

  return results;
}

selfRun(import.meta.url, run);
export default run;
