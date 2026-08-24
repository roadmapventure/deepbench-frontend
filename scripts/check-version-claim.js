#!/usr/bin/env node
// DeepBench v7.0.233 | scripts/check-version-claim.js | SES-153 (M2 Truth Infrastructure)
//
// Asserts that the version number a session is about to ship was ISSUED to that session by
// public.dev_version_counter -- and says so loudly when it was not.
//
// THE DEFECT THIS EXISTS FOR, found live 2026-08-23T17:1xZ by runner cycle c4148d2a at its own ship
// point. The cycle claimed v7.0.196 atomically (the counter still carried patch=196 and
// updated_by_session='cycle-20260823-1640' as proof) while the ATTENDED session `successional-review`
// pushed TWO ships to dev, v7.0.195 and v7.0.196, having claimed neither. Nothing anywhere noticed:
// the counter cannot notice (it was never called), the push cannot notice (a version number is prose,
// not a key), and the collision surfaced only because the two sessions happened to edit the same three
// files and git raised a content conflict. Had the file sets been disjoint, BOTH ships would sit on
// dev carrying v7.0.196 with nothing to say so. THE DETECTION WAS THE DEFECT, not the claim protocol.
//
// WHY A LEDGER AND NOT A COMPARISON. The obvious cheap check -- "is the version you are shipping less
// than or equal to the counter?" -- does NOT catch the live case and must not be built: v7.0.195 and
// v7.0.196 were both <= the counter's 196. The counter is a COUNTER, one row that remembers only its
// last claimant, so it can never answer "was this number issued to YOU". public.issued_versions
// (migration ses153_issued_versions) answers exactly that, one row per number the counter has ever
// issued, written by a trigger on the counter rather than by a step each session must remember --
// which matters because the sessions that caused this bug are precisely the ones not following the
// procedure.
//
// THE FLOOR IS THE THING AN EDITOR WILL GET WRONG, IN BOTH DIRECTIONS. The counter forgets, so the
// ledger could not be backfilled: it starts at v7.0.233 and fills forward. A version BELOW the
// ledger's floor is therefore NOT ASSERTABLE -- it predates the mechanism -- and this script exits 0
// saying so in words. Two wrong builds to avoid: flagging every historical version as unclaimed (a
// checker that cries wolf on 232 versions is a checker nobody runs), and quietly passing anything
// missing from the ledger (which disarms the check completely, for every version, forever). The
// distinction is exactly "predates the ledger" versus "should be in the ledger and is not".
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//     node scripts/check-version-claim.js --version=v7.0.233 --session=cycle-50e6823a-SES-153
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/check-version-claim.js --audit
//
// Flags:
//   --version=<vX.Y.Z>  The version about to ship. Required unless --audit.
//   --session=<name>    The claimant string this session passed as dev_version_counter
//                       .updated_by_session. Required unless --audit. This is the half that catches
//                       the live case: v7.0.196 WAS issued -- just not to the session that shipped it.
//   --audit             Sweep instead of assert: report every runner_cycles.version at or above the
//                       ledger floor that the ledger does not carry, i.e. shipped-but-never-issued.
//   --json              Single-line machine-readable output instead of prose.
//
// Exit codes (the convention export-backlog-snapshot.js and export-governance-snapshot.js set):
//   0  the version was issued to this session, or it predates the ledger floor (not assertable), or
//      --audit found no drift
//   1  THE ASSERTION FAILED -- the version was never issued, or was issued to a different session, or
//      --audit found shipped versions the ledger never issued
//   2  cannot run -- missing env var, malformed --version, or the REST call failed. Deliberately
//      distinct from 1: an unrunnable check must never be reported as a pass.
//
// Env (read from process.env only -- never hardcoded, never printed):
//   SUPABASE_URL           Project REST base, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   Service-role key. issued_versions holds no anon/authenticated grants.
//
// Pure helpers (parseVersion, compareVersions, verdict, auditVerdict) are exported so the regression
// suite can exercise every branch WITHOUT network access -- the seam-proof convention this repo's
// other checkers use. The network/CLI path runs only when the file is executed directly.

import { pathToFileURL } from "url";

const VERSION_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const JSON_OUT = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// Returns {major,minor,patch} or null. NULL IS A REAL ANSWER, not a throw: a malformed version is a
// "cannot run" (exit 2), and a helper that throws would make that indistinguishable from a REST
// failure at the call site.
export function parseVersion(v) {
  const m = VERSION_RE.exec(String(v ?? "").trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

// Numeric, never lexical. `recompute_backlog_queue()`'s own header records what a text sort does to
// this project's ordering keys (P10 ahead of P2); the same trap applies to 'v7.0.9' vs 'v7.0.10'.
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  return (pa.major - pb.major) || (pa.minor - pb.minor) || (pa.patch - pb.patch);
}

// The whole rule, in one pure function so the regression suite can drive every branch.
//
//   version   the version about to ship
//   session   the claimant string this session used
//   row       the matching public.issued_versions row, or null when the ledger has none
//   floor     the ledger's lowest version, or null when the ledger is empty
//
// Returns {ok, code, kind, message}. `kind` is the branch name and is what the tests pin, so a
// reworded message can never silently turn one verdict into another.
export function verdict({ version, session, row, floor }) {
  const parsed = parseVersion(version);
  if (!parsed) {
    return { ok: false, code: 2, kind: "malformed-version",
      message: `check-version-claim: '${version}' is not a version of the form vMAJOR.MINOR.PATCH. Exiting 2 (cannot run) -- nothing was asserted.` };
  }
  if (!session || !String(session).trim()) {
    return { ok: false, code: 2, kind: "missing-session",
      message: `check-version-claim: --session is required. It is the half that catches the live case -- v7.0.196 WAS issued, just not to the session that shipped it. Exiting 2 (cannot run).` };
  }

  if (row) {
    if (String(row.issued_to) === String(session)) {
      return { ok: true, code: 0, kind: "issued-to-you",
        message: `check-version-claim: ${version} was issued to ${session} at ${row.issued_at}. Claim verified -- safe to ship.` };
    }
    return { ok: false, code: 1, kind: "issued-to-another",
      message: `check-version-claim: ${version} was issued to '${row.issued_to}' at ${row.issued_at}, NOT to '${session}'. This is the SES-153 collision: you are about to ship a number another session claimed. Claim your own with the atomic UPDATE in docs/runbooks/session-setup.md section 3 and renumber this work -- do not contest a number already issued.` };
  }

  // No ledger row. The floor decides whether that is a finding or a limit of the mechanism.
  if (floor === null || floor === undefined) {
    return { ok: true, code: 0, kind: "ledger-empty",
      message: `check-version-claim: public.issued_versions is EMPTY, so ${version} is not assertable. Exiting 0 rather than failing -- an empty ledger means the trigger has issued nothing yet, not that your claim is bad. It is NOT a verified claim; say so rather than reporting a pass.` };
  }
  const cmp = compareVersions(version, floor);
  if (cmp !== null && cmp < 0) {
    return { ok: true, code: 0, kind: "predates-ledger",
      message: `check-version-claim: ${version} is below the ledger floor ${floor}, so it PREDATES public.issued_versions and is not assertable. Exiting 0 -- the counter forgets, so the ledger could not be backfilled. This is not a verified claim.` };
  }
  return { ok: false, code: 1, kind: "never-issued",
    message: `check-version-claim: ${version} is at or above the ledger floor ${floor} and public.issued_versions has NO row for it -- the counter never issued this number to anyone. It was hand-counted. Claim one atomically (docs/runbooks/session-setup.md section 3) before you ship.` };
}

// The sweep form. `shipped` is a list of {version, cycle_id} read from runner_cycles; `issued` is the
// set of versions the ledger carries. Only versions at or above the floor can be judged, for the same
// reason a single assert cannot judge below it.
export function auditVerdict({ shipped, issued, floor }) {
  const issuedSet = new Set(issued);
  const judged = [];
  let skipped = 0;
  for (const s of shipped) {
    const parsed = parseVersion(s.version);
    if (!parsed) { skipped++; continue; }           // '7.0.232' with no v prefix -- a real live value
    if (floor && (compareVersions(s.version, floor) ?? 0) < 0) { skipped++; continue; }
    judged.push(s);
  }
  const missing = judged.filter(s => !issuedSet.has(s.version));
  if (!missing.length) {
    return { ok: true, code: 0, kind: "audit-clean", missing: [], judged: judged.length, skipped,
      message: `check-version-claim --audit: clean -- all ${judged.length} shipped version(s) at or above the ledger floor ${floor ?? "(none)"} were issued by the counter. ${skipped} row(s) below the floor or unparseable were not judged.` };
  }
  return { ok: false, code: 1, kind: "audit-drift", missing, judged: judged.length, skipped,
    message: `check-version-claim --audit: ${missing.length} shipped version(s) the counter NEVER issued: ${missing.map(m => `${m.version} (cycle ${m.cycle_id ?? "?"})`).join(", ")}. Each was hand-counted rather than claimed -- the SES-153 defect. ${skipped} row(s) below the floor or unparseable were not judged.` };
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

async function rest(base, key, pathAndQuery) {
  const url = `${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`;
  let res;
  try {
    res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (e) {
    return { error: `could not reach the Supabase REST endpoint: ${e.message}` };
  }
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* an unreadable body is still a failure */ }
    return { error: `Supabase REST returned HTTP ${res.status} ${res.statusText}: ${body}` };
  }
  try {
    const rows = await res.json();
    if (!Array.isArray(rows)) return { error: `Supabase REST returned a non-array payload for ${pathAndQuery}` };
    return { rows };
  } catch (e) {
    return { error: `Supabase REST returned unparseable JSON: ${e.message}` };
  }
}

function emit(v, extra = {}) {
  if (JSON_OUT) console.log(JSON.stringify({ ok: v.ok, exitCode: v.code, kind: v.kind, message: v.message, ...extra }));
  else if (v.ok) console.log(v.message);
  else console.error(v.message);
  process.exit(v.code);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    const missing = [!supabaseUrl && "SUPABASE_URL", !supabaseKey && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ");
    return emit({ ok: false, code: 2, kind: "missing-env",
      message: `check-version-claim: missing required env var(s): ${missing}. Exiting 2 (cannot run) -- this is NOT a pass, the ledger was never read.` });
  }

  // The floor: the ledger's lowest version. Ordered numerically on the patch column rather than
  // lexically on `version`, for the reason compareVersions() carries.
  const floorRes = await rest(supabaseUrl, supabaseKey, "issued_versions?select=version&order=major.asc,minor.asc,patch.asc&limit=1");
  if (floorRes.error) {
    return emit({ ok: false, code: 2, kind: "rest-failed",
      message: `check-version-claim: ${floorRes.error}\nExiting 2 (cannot run) -- this is NOT a pass, the ledger was never read.` });
  }
  const floor = floorRes.rows.length ? floorRes.rows[0].version : null;

  if (process.argv.includes("--audit")) {
    const shippedRes = await rest(supabaseUrl, supabaseKey, "runner_cycles?select=version,id&outcome=eq.shipped&version=not.is.null&order=started_at.desc&limit=500");
    if (shippedRes.error) {
      return emit({ ok: false, code: 2, kind: "rest-failed",
        message: `check-version-claim --audit: ${shippedRes.error}\nExiting 2 (cannot run).` });
    }
    const issuedRes = await rest(supabaseUrl, supabaseKey, "issued_versions?select=version&limit=2000");
    if (issuedRes.error) {
      return emit({ ok: false, code: 2, kind: "rest-failed",
        message: `check-version-claim --audit: ${issuedRes.error}\nExiting 2 (cannot run).` });
    }
    const shipped = shippedRes.rows.map(r => ({ version: r.version, cycle_id: r.id }));
    const v = auditVerdict({ shipped, issued: issuedRes.rows.map(r => r.version), floor });
    return emit(v, { missing: v.missing, judged: v.judged, skipped: v.skipped, floor });
  }

  const version = arg("version", "");
  const session = arg("session", "");
  const parsed = parseVersion(version);
  if (!parsed) return emit(verdict({ version, session, row: null, floor }));

  const rowRes = await rest(supabaseUrl, supabaseKey, `issued_versions?select=version,issued_to,issued_at&version=eq.${encodeURIComponent(version)}`);
  if (rowRes.error) {
    return emit({ ok: false, code: 2, kind: "rest-failed",
      message: `check-version-claim: ${rowRes.error}\nExiting 2 (cannot run) -- this is NOT a pass, the ledger was never read.` });
  }
  return emit(verdict({ version, session, row: rowRes.rows[0] ?? null, floor }), { floor });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
