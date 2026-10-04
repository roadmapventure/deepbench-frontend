// DeepBench v7.0.767 | tests/regression/agt-337-hire-exemption.test.mjs | AGT-337 slice 4
//
// FEATURE: AGT-337 -- John's ruling of 2026-10-03 (decision a828b44f-11f3-4570-a35a-18b28b2d7382)
// is written in docs/ARCHITECTURE.md §19u, and the AI Audit counts each created agent under a
// named service: the `agent-create` rows land on the `agent-config-store` row of
// `platform_services` through its match key.
//
// OFFLINE (always run; no network call, no database read):
//   (a) THE DOC. §19u (from `## 19u.` up to `## 19v.`) holds, in order: decision 5, its
//       exemption, decision 6, its narrow-precursor note, `### Current vs. future state`. It
//       names the decision id and lib/private-agent-create.js, and still holds decision 5's and
//       decision 6's own closing words -- nothing was retired. Exactly one line of the file is
//       the v7.0.767 amendment stamp, and it names AGT-337 and the decision id.
//   (b) THE KEY (THE DISCRIMINATOR). The match key and tracking status are READ from the
//       migration mirror docs/design/agt-337-agent-create-match-key.sql and fed to the real
//       hook: three `agent-create` rows resolve to `agent-config-store`, the service shows
//       calls 3 / avgLatency 200, and nothing is left unregistered.
//   (c) CONTROLS. The same row with no key: slug null and one unregistered line of 3 calls.
//       The same row with the key but `untracked`: calls is null -- a key alone shows no numbers.
//
// The live `platform_services` row is NOT read here: the mirror's UPDATE is applied by the
// attended session after this build ships, so (b) grades the mirror against the hook, which is
// true both before and after that apply.
//
// BASELINE: the file is new. On the unchanged tree (a) fails (no stamp, no exemption) and (b)
// fails (no mirror file); (c) passes -- it is today's behavior, pinned.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const ARCH_REL = "docs/ARCHITECTURE.md";
const SQL_REL = "docs/design/agt-337-agent-create-match-key.sql";
const DECISION_ID = "a828b44f-11f3-4570-a35a-18b28b2d7382";
const MODULE_REL = "lib/private-agent-create.js";
const STAMP_PREFIX = "# Amended v7.0.767 |";
const SERVICE_SLUG = "agent-config-store";

const IN_ORDER = [
  "**Every hire is signed.**",
  "**Exemption — a private agent a user creates (John, 2026-10-03, decision",
  "6. **Taxonomy writes get an owner",
  "**Narrow precursor (",
  "### Current vs. future state",
];
const STILL_HELD = ["John signs every hire card.", "Registry row to be added to"];

const LOG = [100, 200, 300].map(latencyMs => ({ type: "deterministic", location: "agent-create", cost: 0, latencyMs }));
const rowWith = over => ({ slug: SERVICE_SLUG, layer: "deterministic", functions: [], match_keys: [], tracking_status: "untracked", ...over });

async function loadHook() {
  // src/lib/supabase.js builds its client at import time; no call is made through it here.
  if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = "http://localhost:54321";
  if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = "regression-placeholder";
  return import("../../src/hooks/useAIActivity.js");
}

// ---------------------------------------------------------------------------------------------
// (c) CONTROLS -- today's behavior, pinned. Runs first so it reports even while (a)/(b) are red.
// ---------------------------------------------------------------------------------------------
function partControls(hook) {
  const { buildServiceMatcher, platformServiceForRow, computePlatformServices, computeUnregisteredServices } = hook;

  const noKey = rowWith({ match_keys: [] });
  assert.strictEqual(platformServiceForRow(LOG[0], buildServiceMatcher([noKey])), null,
    "(c) with no match key an agent-create row still resolves to a service");
  assert.deepStrictEqual(computeUnregisteredServices(LOG, [noKey], new Set()).map(u => u.calls), [3],
    "(c) with no match key the three agent-create rows are not one unregistered line of 3 calls");

  const keyUntracked = rowWith({ match_keys: [{ feature: "agent-create" }], tracking_status: "untracked" });
  assert.strictEqual(computePlatformServices(LOG, [keyUntracked])[0].services[0].calls, null,
    "(c) an untracked service with the key shows a call count -- the status must gate the numbers");
  return ["control-no-key-unregistered", "control-key-untracked-no-numbers"];
}

// ---------------------------------------------------------------------------------------------
// (a) THE DOC
// ---------------------------------------------------------------------------------------------
function partDoc() {
  const arch = read(ARCH_REL);
  const start = arch.indexOf("\n## 19u.");
  const end = arch.indexOf("\n## 19v.");
  assert.ok(start >= 0 && end > start, `${ARCH_REL}: §19u (from '## 19u.' up to '## 19v.') was not found`);
  const S = arch.slice(start, end);

  let at = -1;
  for (const marker of IN_ORDER) {
    const next = S.indexOf(marker, at + 1);
    assert.ok(next > at, `${ARCH_REL} §19u: '${marker}' is missing or out of order`);
    at = next;
  }
  assert.ok(S.includes(DECISION_ID), `${ARCH_REL} §19u does not name decision ${DECISION_ID}`);
  assert.ok(S.includes(MODULE_REL), `${ARCH_REL} §19u does not name ${MODULE_REL}`);
  for (const kept of STILL_HELD) {
    assert.ok(S.includes(kept), `${ARCH_REL} §19u no longer holds '${kept}' -- the amendment retires nothing`);
  }

  const stamps = arch.split("\n").filter(line => line.startsWith(STAMP_PREFIX));
  assert.strictEqual(stamps.length, 1, `${ARCH_REL}: ${stamps.length} lines start '${STAMP_PREFIX}', expected exactly 1`);
  assert.ok(stamps[0].includes("AGT-337"), `${ARCH_REL}: the v7.0.767 stamp does not name AGT-337`);
  assert.ok(stamps[0].includes(DECISION_ID), `${ARCH_REL}: the v7.0.767 stamp does not name decision ${DECISION_ID}`);
  return ["doc-19u-exemption-and-precursor-in-order", "doc-stamp-once"];
}

// ---------------------------------------------------------------------------------------------
// (b) THE KEY -- the mirror's values, through the real hook
// ---------------------------------------------------------------------------------------------
function partKey(hook) {
  const { buildServiceMatcher, platformServiceForRow, computePlatformServices, computeUnregisteredServices } = hook;
  assert.ok(fs.existsSync(path.join(ROOT, SQL_REL)), `${SQL_REL} does not exist -- the match key has no mirror`);
  const sql = read(SQL_REL);
  const keyMatch = sql.match(/match_keys = '([^']*)'::jsonb/);
  const statusMatch = sql.match(/tracking_status = '([^']*)'/);
  assert.ok(keyMatch, `${SQL_REL}: no \`match_keys = '<json>'::jsonb\``);
  assert.ok(statusMatch, `${SQL_REL}: no \`tracking_status = '<word>'\``);

  const ROW = rowWith({ match_keys: JSON.parse(keyMatch[1]), tracking_status: statusMatch[1] });
  assert.strictEqual(platformServiceForRow(LOG[0], buildServiceMatcher([ROW])), SERVICE_SLUG,
    `(b) the mirror's match key does not put an agent-create row under ${SERVICE_SLUG}`);
  const service = computePlatformServices(LOG, [ROW])[0].services[0];
  assert.strictEqual(service.calls, 3, `(b) ${SERVICE_SLUG} shows calls ${service.calls}, expected 3`);
  assert.strictEqual(service.avgLatency, 200, `(b) ${SERVICE_SLUG} shows avgLatency ${service.avgLatency}, expected 200`);
  assert.deepStrictEqual(computeUnregisteredServices(LOG, [ROW], new Set()), [],
    "(b) agent-create rows are still unregistered with the mirror's key in place");
  return [`key-counts-under-${SERVICE_SLUG} (calls 3, status '${statusMatch[1]}')`];
}

async function run() {
  const hook = await loadHook();
  const results = [];
  results.push(...partControls(hook));
  results.push(...partDoc());
  results.push(...partKey(hook));
  return results;
}

selfRun(import.meta.url, run);
export default run;
