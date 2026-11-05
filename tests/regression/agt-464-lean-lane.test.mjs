// DeepBench v7.0.963 | tests/regression/agt-464-lean-lane.test.mjs | AGT-464
//
// WHAT THIS PINS. `AGT-464` gave the phone lane its own Postgres role, `lean_lane`, so a code
// session can be opened, claimed, versioned and closed from a cloud session that was NEVER handed
// the service key. Two constraints from the ticket are the whole subject, and neither is provable
// by reading a migration's success flag:
//
//   NEVER HAND AN INTERACTIVE SESSION THE SERVICE KEY. The lane's key may EXECUTE four narrow
//   SECURITY DEFINER functions and read the meter. It holds no SELECT on `backlog_items`, no write
//   anywhere, and nothing at all on `runner_secrets`.
//
//   NEVER WIDEN AN EXISTING GRANT. Every grant the migration issues is to the NEW role. A grant to
//   `anon` or `authenticated` anywhere in that file would be a public exposure shipped under a
//   ticket about narrowing access, so arm (a) refuses the file rather than the database.
//
// FOUR ARMS, and the first one is the one that runs everywhere:
//
//   (a)  NO CREDENTIALS. The shipped migration mirror, `docs/design/agt-464-lean-lane.sql`, read as
//        source: it grants the role to `authenticator`, it revokes EXECUTE from `public`, `anon` AND
//        `authenticated` BY NAME on all four functions (`.claude/rules/supabase-column-grants.md`
//        § addendum 2026-09-02: `REVOKE ... FROM PUBLIC` alone leaves the named role grants standing
//        and the migration still reports success), it asserts the denial back with
//        `has_function_privilege('anon', ...)`, and it grants nothing to `anon` or `authenticated`.
//
//        PLUS THE MUTATION CONTROL, which is what makes the four checks evidence rather than
//        decoration. A source check that cannot fail is indistinguishable from no check at all, so
//        every one of them is re-run against a text deliberately broken in exactly the way it
//        exists to catch, and MUST throw (`STANDARDS.md` Section 4, the LOO-013 lesson: assert
//        WHICH branch fired). The mutation is also asserted to have changed the text, so a typo in
//        a `replace()` target cannot quietly turn the control into a second copy of the pass.
//
//   (b)  SERVICE KEY. `rpc/lean_claim_ticket` answers 200 for `p_write: false` — the function is
//        reachable and resolves, which is the half a 404 PGRST202 would deny. This arm was 404
//        PGRST202 on the tree before the migration.
//
//   (c)  PUBLISHABLE KEY. The SAME call, with the key that ships in the browser bundle, is REFUSED
//        `42501 permission denied for function`. (b) and (c) are one discriminating pair: (b) alone
//        would read green on a function granted to the world, and (c) alone would read green on a
//        function that does not exist. Only the pair says the gate is real.
//
//   (d)  LEAN KEY. The arm that proves the lane itself, and it reads NOT RUN until John has minted
//        the token (`docs/runbooks/lean-lane.md`, his one chore — the JWT secret lives only in the
//        dashboard, so no build can do it). It asserts BOTH directions, which is the form
//        `.claude/rules/supabase-column-grants.md` requires: the denied read of `backlog_items`
//        fails 42501 AND the legitimate function call still returns 200. One of those alone could
//        be a key that is simply broken.
//
// NOTHING HERE MUTATES. Every live call is `p_write: false` or a GET, so no claim is taken, no
// claim is released and no ticket is filed — a regression run must never touch the real board.
//
// Invocation: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… SUPABASE_PUBLISHABLE_KEY=… [SUPABASE_LEAN_KEY=…]
//             node tests/regression/agt-464-lean-lane.test.mjs

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun, notRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION_REL = "docs/design/agt-464-lean-lane.sql";

// The four functions the lane may call, by bare name. Declared rather than parsed out of the file,
// so a file that lost one is caught by the count instead of silently lowering the bar.
const LEAN_FUNCTIONS = ["lean_claim_ticket", "lean_release_claim", "lean_claim_version", "lean_file_ticket"];

// A session name no session can hold, so every live arm below is a non-holder read.
const FOREIGN = "agt-464-regression-not-a-holder";
const TICKET = "AGT-464";

// CRLF normalised on read for the reason every doc test in this suite states: this repo checks out
// CRLF on Windows and LF in CI, and a line-anchored test that disagrees between the two is a false
// green on one of them.
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// --- Arm (a): the shipped migration mirror, as source -------------------------------------------

// Each check throws on violation, which is what lets the mutation control below re-run it in
// anger. The keys are the result names, so a failure names the property that broke.
const CHECKS = {
  "role-granted-to-authenticator": text => {
    assert.ok(/^\s*grant lean_lane to authenticator;\s*$/m.test(text),
      `${MIGRATION_REL} must carry \`grant lean_lane to authenticator\`. Without it PostgREST can `
      + "never switch into the role, so the lean key would authenticate and then act as whatever "
      + "role it claimed — the lane would be decoration.");
  },

  "execute-revoked-from-public-anon-and-authenticated-by-name": text => {
    const lines = text.split("\n").filter(l => /^\s*revoke all on function public\.lean_/.test(l));
    assert.strictEqual(lines.length, LEAN_FUNCTIONS.length,
      `${MIGRATION_REL} has ${lines.length} \`revoke all on function public.lean_\` lines, not `
      + `${LEAN_FUNCTIONS.length}. pg_default_acl in this project grants EXECUTE to anon, `
      + "authenticated and service_role BY NAME the instant a function is created, so a lean_* "
      + "function with no revoke line is callable from the browser's anon key (SES-315).");
    for (const line of lines) {
      assert.ok(/from public, anon, authenticated;?\s*$/.test(line),
        `this revoke does not name all three roles: ${line.trim()}\n`
        + "`REVOKE ALL ON FUNCTION ... FROM PUBLIC` removes only the PUBLIC grant and leaves the "
        + "named role grants standing — the migration reports success and the function stays open "
        + "(.claude/rules/supabase-column-grants.md, addendum 2026-09-02, found live by SES-315).");
    }
  },

  "denial-asserted-back-for-anon": text => {
    assert.ok(/has_function_privilege\('anon'/.test(text),
      `${MIGRATION_REL} must assert the denial back with \`has_function_privilege('anon', ...)\`. `
      + "Never trust the migration's success flag: the first LOG-124 remediation reported success "
      + "and left the data fully exposed (.claude/rules/supabase-column-grants.md).");
  },

  "no-grant-to-anon-or-authenticated": text => {
    const widened = text.split("\n").filter(l => /^\s*grant .* to (anon|authenticated)\b/i.test(l));
    assert.deepStrictEqual(widened, [],
      `${MIGRATION_REL} grants something to anon or authenticated: ${widened.join(" / ")}\n`
      + "AGT-464's second hard constraint is that no existing grant is widened — every grant in "
      + "this migration goes to the NEW role. A grant to anon here would be a public exposure "
      + "shipped under a ticket about narrowing access.");
  },
};

// The mutation for each check: the file broken in exactly the way that check exists to catch.
const MUTATIONS = {
  "role-granted-to-authenticator": text =>
    text.replace("grant lean_lane to authenticator;", "-- grant lean_lane to authenticator;"),

  "execute-revoked-from-public-anon-and-authenticated-by-name": text =>
    text.replace(
      "revoke all on function public.lean_claim_ticket(text, text, boolean) from public, anon, authenticated;",
      "revoke all on function public.lean_claim_ticket(text, text, boolean) from public;"),

  "denial-asserted-back-for-anon": text =>
    text.split("has_function_privilege('anon'").join("has_function_privilege('service_role'"),

  "no-grant-to-anon-or-authenticated": text =>
    `${text}\ngrant execute on function public.lean_claim_ticket(text, text, boolean) to anon;\n`,
};

function theMigrationClosesTheLaneToThePublic(results) {
  const text = read(MIGRATION_REL);

  for (const [name, check] of Object.entries(CHECKS)) {
    // The real file passes.
    check(text);

    // And the check can fail: the same assertion over a text broken the way it exists to catch.
    const mutated = MUTATIONS[name](text);
    assert.notStrictEqual(mutated, text,
      `the mutation for \`${name}\` did not change ${MIGRATION_REL} at all, so the control below `
      + "is a second copy of the pass rather than a test of the check. Its replace() target has "
      + "drifted from the file.");
    assert.throws(() => check(mutated),
      `\`${name}\` passed against a deliberately broken ${MIGRATION_REL}. The check cannot fail, so `
      + "its green above was never evidence about this migration.");

    results.push(`${name} (+ mutation control)`);
  }
}

// --- the live arms ------------------------------------------------------------------------------

const envKey = name => String(process.env[name] ?? "").trim();
const baseUrl = () => envKey("SUPABASE_URL").replace(/\/+$/, "");

async function call(pathAndQuery, key, init = {}) {
  const res = await fetch(`${baseUrl()}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: res.status, body, text };
}

const claimProbe = key => call("rpc/lean_claim_ticket", key, {
  method: "POST",
  body: JSON.stringify({ p_ticket: TICKET, p_session: FOREIGN, p_write: false }),
});

// Arm (b): the function resolves and answers for a credential that is allowed to call it.
async function theFunctionAnswersForAnAllowedKey(results, key, who) {
  const r = await claimProbe(key);
  assert.strictEqual(r.status, 200,
    `rpc/lean_claim_ticket answered ${r.status} for the ${who}, not 200: ${r.text.slice(0, 300)}\n`
    + "A 404 PGRST202 here means the migration agt464_lean_lane never landed (that was this call's "
    + "answer on the tree before it); a 42501 means the key's role cannot EXECUTE it.");
  assert.strictEqual(r.body?.backlog_id, TICKET,
    `the answer names backlog_id ${JSON.stringify(r.body?.backlog_id)}, not ${TICKET}`);

  // `claimed` must never be true for a name no session holds. Which falsy value it is depends on
  // the board and is derived rather than hardcoded: with a holder, `claimed_by = p_session` is
  // FALSE; with none it is `NULL = p_session`, which is SQL NULL and arrives as JSON null. Pinning
  // one of the two would go red the day this ticket's own claim is released.
  assert.notStrictEqual(r.body?.claimed, true,
    `rpc/lean_claim_ticket reported claimed=true for '${FOREIGN}', which holds nothing. A claim `
    + "answer that says yes to a non-holder would let two sessions build one ticket (rule B40).");
  const expected = r.body?.claimed_by == null ? null : false;
  assert.strictEqual(r.body?.claimed, expected,
    `with claimed_by=${JSON.stringify(r.body?.claimed_by)} the answer's claimed must be `
    + `${JSON.stringify(expected)}, got ${JSON.stringify(r.body?.claimed)}`);

  // p_write:false writes nothing, so the probe cannot have taken the claim it just read.
  assert.strictEqual(Number(r.body?.rows ?? 0), 0,
    `a p_write:false probe reported ${r.body?.rows} rows written — this arm must never claim a real `
    + "board ticket");
  results.push(`claim-rpc-answers-200-for-the-${who}-and-refuses-the-non-holder`);
}

// Arm (c): the same call with the key that ships in the browser bundle.
async function theBrowserKeyIsRefused(results, key) {
  const r = await claimProbe(key);
  assert.ok(r.status === 401 || r.status === 403,
    `the publishable key got ${r.status} from rpc/lean_claim_ticket, not 401/403. This key ships in `
    + `the browser bundle, so a 200 here is a public write path into the board: ${r.text.slice(0, 300)}`);
  assert.strictEqual(r.body?.code, "42501",
    `the refusal's code is ${JSON.stringify(r.body?.code)}, not 42501 (permission denied for `
    + "function). Another code would mean the call failed for an unrelated reason and this arm "
    + `proves nothing about the grant: ${r.text.slice(0, 300)}`);
  results.push("publishable-key-refused-42501-on-the-claim-rpc");
}

// Arm (d): the lane itself, both directions.
async function theLeanKeyIsNarrow(results, key) {
  // The denied direction: no SELECT on backlog_items, which is what makes the four functions the
  // lane's ONLY way to touch the board.
  const denied = await call("backlog_items?select=backlog_id&limit=1", key);
  assert.ok(denied.status === 401 || denied.status === 403,
    `the lean key READ backlog_items (${denied.status}). The lane's whole shape is that it reaches `
    + `the board only through the four functions: ${denied.text.slice(0, 300)}`);
  assert.strictEqual(denied.body?.code, "42501",
    `the refused read's code is ${JSON.stringify(denied.body?.code)}, not 42501: ${denied.text.slice(0, 300)}`);
  results.push("lean-key-cannot-read-backlog_items-42501");

  // And the allowed direction, in the same arm: a key that is simply broken would also fail the
  // read above, so the denial is only evidence beside a call that still works.
  await theFunctionAnswersForAnAllowedKey(results, key, "lean key");
}

async function run() {
  const results = [];
  theMigrationClosesTheLaneToThePublic(results);

  const url = envKey("SUPABASE_URL");
  const service = envKey("SUPABASE_SERVICE_KEY");
  const publishable = envKey("SUPABASE_PUBLISHABLE_KEY");
  const lean = envKey("SUPABASE_LEAN_KEY");

  if (!url || !service) {
    notRun("arms (b), (c) and (d) (every live call)",
      "set SUPABASE_URL and SUPABASE_SERVICE_KEY (by name from runner_secrets, exported inline per "
      + "docs/runbooks/session-setup.md step 1b) and re-run the suite. Arm (a) above ran against "
      + "the source tree.");
    return results;
  }
  await theFunctionAnswersForAnAllowedKey(results, service, "service key");

  if (!publishable) {
    notRun("arm (c) (the publishable key is refused 42501)",
      "set SUPABASE_PUBLISHABLE_KEY (the project's publishable/anon key — it ships in the browser "
      + "bundle, so it is not a secret) and re-run the suite. Without it, arm (b)'s 200 is "
      + "unpaired: it would read exactly the same on a function granted to the whole world.");
  } else {
    await theBrowserKeyIsRefused(results, publishable);
  }

  if (!lean) {
    notRun("arm (d) (the lean lane's own key, both directions)",
      "SUPABASE_LEAN_KEY is not set, and no build can set it: the token is signed with the project "
      + "JWT secret, which lives only in the Supabase dashboard. It is John's one chore — the "
      + "steps and the one-liner are in docs/runbooks/lean-lane.md. Until then the role, the "
      + "grants and the refusals are proven (arms a-c) but the key that exercises them is not.");
  } else {
    await theLeanKeyIsNarrow(results, lean);
  }

  return results;
}

selfRun(import.meta.url, run);
export default run;
