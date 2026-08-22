// DeepBench v7.0.151 | tests/regression/DAT-003-confirmation-provenance.js | DAT-003
// FEATURE: DAT-003 -- a promoted (data_type: consolidated) the_library fact records WHO CONFIRMED
// IT, and that record has to be one nothing but a real human accept can produce.
//
// This test has two halves, and the split is deliberate rather than convenient.
//
// The SOURCE half runs everywhere, credentials or not, and guards the one property that makes the
// whole feature worth anything: confirmed_by/confirmation_id must NOT be reachable from the
// model-supplied write path. writeLibrary() spreads the model's own ...params into
// buildLibraryEntryPayload(), so the day someone "helpfully" adds these two fields to that
// builder's parameter list, Eleanor's structured output can assert confirmed_by: 'human' on a fact
// no human ever saw -- and the column still looks perfectly populated. That regression is silent,
// it is the exact failure the ticket exists to prevent, and no amount of live data would reveal it.
//
// The LIVE half is a SEAM PROOF: it imports the repo's real markAcceptedDelegated() from
// api/_lib/handlers/confirmation.js -- not a reimplementation of it -- and drives it against real
// Supabase, then reads the rows back. It needs credentials, so without them it announces itself as
// skipped rather than passing quietly (the DAT-11 convention: a green line that proved nothing is
// worse than a visible skip).
//
// Negative controls, so neither half can pass vacuously:
//   - an unconfirmed consolidated row written in the same fixture stays NULL (if the code stamped
//     indiscriminately, this fails);
//   - a SECOND accept against the already-stamped row must not move it (write-once);
//   - without the migration the read 400s on an unknown column; with the migration but without the
//     wire-up the row reads back null. A do-nothing change cannot produce a pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARIAN = path.join(__dirname, "..", "..", "lib", "librarian.js");
const CONFIRMATION = path.join(__dirname, "..", "..", "api", "_lib", "handlers", "confirmation.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pure: the parameter list buildLibraryEntryPayload() actually destructures. Read off the real
// source so this measures the file rather than a copy of it.
export function payloadBuilderParams(source) {
  const m = source.match(/async function buildLibraryEntryPayload\(\{([\s\S]*?)\}\)/);
  if (!m) return null;
  return new Set(
    m[1].split(",").map(s => s.split(/[:=]/)[0].trim()).filter(Boolean)
  );
}

export default async function run() {
  // ---- SOURCE half: the fields must be unreachable from the model-supplied write path ----
  const librarianSrc = fs.readFileSync(LIBRARIAN, "utf8");
  const confirmationSrc = fs.readFileSync(CONFIRMATION, "utf8");

  const params = payloadBuilderParams(librarianSrc);
  assert.ok(params, "could not find buildLibraryEntryPayload()'s parameter list in lib/librarian.js");
  for (const field of ["confirmed_by", "confirmation_id"]) {
    assert.ok(
      !params.has(field),
      `buildLibraryEntryPayload() now accepts \`${field}\`. writeLibrary() spreads model-supplied ` +
      `...params into it, so Eleanor's own structured output could assert its own confirmation -- ` +
      `which makes the column decorative and defeats DAT-003 entirely. Write it from ` +
      `recordLibraryConfirmation() instead.`
    );
  }

  assert.ok(
    /export async function recordLibraryConfirmation\(/.test(librarianSrc),
    "recordLibraryConfirmation() is gone from lib/librarian.js -- the_library's single-write-path rule (§19c) means the stamp has to live in this file"
  );
  assert.ok(
    librarianSrc.includes("confirmed_by=is.null"),
    "the write-once filter (confirmed_by=is.null) is gone -- a later confirmation could overwrite an earlier one's stamp"
  );
  assert.ok(
    confirmationSrc.includes("recordLibraryConfirmation"),
    "api/_lib/handlers/confirmation.js no longer calls recordLibraryConfirmation() -- accepts would resolve without ever recording who confirmed them"
  );
  // Both accept-completion functions must stamp: between them they cover the plain accept, the
  // delegated sync accept, and the checkpointed accept. Missing either loses a real path silently.
  assert.equal(
    (confirmationSrc.match(/stampLibraryConfirmation\(/g) || []).length, 3,
    "expected stampLibraryConfirmation to be defined once and called from BOTH accept-completion sites (resolvePendingConfirmation's tail and markAcceptedDelegated)"
  );

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  [DAT-003] live seam half SKIPPED -- no Supabase credentials in env " +
      "(run with `node --env-file=.env.local tests/regression/run-all.js` to include it). " +
      "The source half above did run.");
    return;
  }

  // ---- LIVE half: seam proof against real Supabase ----
  const { markAcceptedDelegated } = await import("../../api/_lib/handlers/confirmation.js");

  const headers = {
    "Content-Type": "application/json", apikey: key,
    Authorization: `Bearer ${key}`, Prefer: "return=representation",
  };
  const TAG = "apple-cso-data-room";
  const TENANT = "dat003-test";
  const created = { library: [], confirmations: [] };

  // Read the body exactly once: a fetch Response body is single-use, so building the failure
  // message with `await res.text()` inside the assert's template consumes it eagerly and the
  // subsequent res.json() throws "Body has already been read" -- masking the real HTTP error.
  const insert = async (table, body) => {
    const res = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();
    assert.ok(res.ok, `${table} insert failed: HTTP ${res.status} ${text}`);
    const [row] = JSON.parse(text);
    return row;
  };
  const readLibrary = async (id) => {
    const res = await fetch(
      `${url}/rest/v1/the_library?id=eq.${id}&select=id,confirmed_by,confirmation_id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const text = await res.text();
    assert.ok(res.ok,
      `the_library read failed: HTTP ${res.status} ${text} -- if this is a 400 on an ` +
      `unknown column, the DAT-003 migration has not been applied to this project`);
    const [row] = JSON.parse(text);
    return row;
  };

  try {
    // A = the fact being corrected; B = the promoted replacement that supersedes it;
    // C = an unconfirmed consolidated row that must stay NULL (the negative control).
    // ORDER MATTERS and mirrors production: the gate fires and writes the pending_confirmations
    // row FIRST, the human accepts, and only then is the promoted row written. The stamp's
    // not_before guard (created_at >= the confirmation's own created_at) exists precisely to
    // exclude an older superseder, so a fixture that creates the promotion before the confirmation
    // is not a simpler version of reality -- it is a different, impossible one, and it fails.
    const A = await insert("the_library", {
      title: "DAT-003 fixture target", content: "superseded fixture body",
      tenant_id: TENANT, data_room_tag: TAG, data_type: "sourced", status: "active",
    });
    created.library.push(A.id);

    const mkConfirmation = () => insert("pending_confirmations", {
      tenant_id: TENANT, agent_id: "dat003-test-agent", capability_slug: "dat003-test-capability",
      intent_slug: "dat003-test-intent", proposed_action: { chunk_id: A.id },
      prompt_request: { fixture: true }, delegation_occurred: false, status: "pending",
    });

    const P = await mkConfirmation();
    created.confirmations.push(P.id);
    // P2 is created here, BEFORE the promotion, so that the write-once assertion below is actually
    // testing the confirmed_by=is.null filter. If P2 were created after B, not_before alone would
    // exclude B and the assertion would pass for the wrong reason.
    const P2 = await mkConfirmation();
    created.confirmations.push(P2.id);

    const B = await insert("the_library", {
      title: "DAT-003 fixture promotion", content: "promoted fixture body",
      tenant_id: TENANT, data_room_tag: TAG, data_type: "consolidated", status: "active",
      supersedes_id: A.id,
    });
    created.library.push(B.id);

    const C = await insert("the_library", {
      title: "DAT-003 fixture unconfirmed", content: "never confirmed",
      tenant_id: TENANT, data_room_tag: TAG, data_type: "consolidated", status: "active",
    });
    created.library.push(C.id);

    // Act: the checkpointed-accept shape -- an EMPTY result, so the only way to reach B is the
    // supersession link. This is the hard path, and the one a real promote actually takes.
    await markAcceptedDelegated(P.id, {});

    const stamped = await readLibrary(B.id);
    assert.equal(stamped.confirmed_by, "human",
      `the promoted row was not stamped (confirmed_by=${JSON.stringify(stamped.confirmed_by)}). ` +
      `If this is null, the accept resolved without recording who confirmed it -- exactly the gap DAT-003 closes.`);
    assert.equal(stamped.confirmation_id, P.id,
      "confirmation_id must point at the pending_confirmations row that proves the claim -- that FK is what makes it checkable rather than merely asserted");
    assert.ok(UUID_RE.test(stamped.confirmation_id), "confirmation_id must be a real uuid");

    // Negative control: an unconfirmed consolidated row is untouched.
    const control = await readLibrary(C.id);
    assert.equal(control.confirmed_by, null,
      "a consolidated row with no accept behind it was stamped anyway -- the stamp is matching too broadly, which would make 'human-confirmed' meaningless");

    // Write-once: a second, different accept must not move an existing stamp.
    await markAcceptedDelegated(P2.id, {});

    const after = await readLibrary(B.id);
    assert.equal(after.confirmation_id, P.id,
      "a second confirmation overwrote the first one's stamp -- provenance must be write-once or it records the latest toucher, not the confirmer");
  } finally {
    // REVERSE order, and it is not cosmetic: the_library.supersedes_id is a self-FK, so deleting
    // the target (A) while its replacement (B) still points at it fails silently through
    // PostgREST and leaks the fixture row on EVERY run. Found live -- five orphaned "DAT-003
    // fixture target" rows accumulated in the real table before this line was reversed.
    for (const id of [...created.library].reverse()) {
      await fetch(`${url}/rest/v1/the_library?id=eq.${id}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } });
    }
    for (const id of created.confirmations) {
      await fetch(`${url}/rest/v1/pending_confirmations?id=eq.${id}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } });
    }
  }
}

selfRun(import.meta.url, run);
