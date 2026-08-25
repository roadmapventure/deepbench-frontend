// DeepBench v7.0.249 | tests/regression/SES-191-backup-path-portability.js | SES-191 -- the full
// restore drill's first finding, guarded: a backup set's manifest records each data file's path,
// and if that path carries the DUMPING machine's separator it resolves on no other platform.
//
// FOUND LIVE 2026-08-25 by cycle c8c2d547, running the drill against the offsite copy from a Linux
// cloud container -- the first time the recovery net was exercised from a machine that is not
// John's, which is the entire point of SES-192's offsite copy. All 52 table entries in
// `selfbuild-step0-2026-08-23/manifest.json` read `data\<table>.ndjson`. Measured, both directions:
// 0 of 52 resolved as stored; 52 of 52 resolved after normalizing the separator, with 0 checksum
// mismatches over 50,841 rows. The set is byte-perfect. Only the separator is wrong.
//
// WHY THAT IS WORSE THAN A LOUD FAILURE, and why it earns a permanent test: restore-supabase.mjs
// treats an unresolvable path as an ALTERED file and exits with "Refusing to restore from an
// altered backup." Nothing is altered. During a real outage that message points the person
// restoring at the integrity of their last backup rather than at a separator, which is the most
// expensive possible place to send them.
//
// THE ASSERTION PARTS 1-2 GATE ON IS "RESOLVES AFTER NORMALIZATION", NOT "RESOLVES AS STORED" --
// and that is deliberate, not a softened bar. Gating a stored SET on as-stored resolution would
// paint the suite red over sets that were already taken and cannot be retaken; the reader fix
// below is what makes those readable, and it is the right place for the repair. What Parts 1-2
// gate is the claim the restore runbook makes to whoever is mid-outage: the documented procedure
// works. That goes red if a set is genuinely incomplete or corrupt.
//
// UPDATED v7.0.249 (SES-191, 2026-08-25) -- THE TOOLING FIX NOW EXISTS, AND PART 3 GATES IT.
// dump-supabase.mjs stores POSIX separators (so future sets are clean) and BOTH readers resolve
// either separator (so sets already taken -- including the live recovery net -- stay readable).
// A third site was found while fixing it and is the reason Part 3 runs the real script instead of
// checking source text: restore-supabase.mjs resolved rec.file in TWO places, the integrity check
// AND the data read. Fixing only the first yields a run that verifies clean and then fails the
// actual restore, which is a worse failure than the one being fixed.
//
// THAT FIX IS NOT IN THIS REPO AND IS NOT MERGED. It lives on branch
// `ses191/backup-path-portability` of `roadmapventure/deepbench-backups-offsite`. So Part 3 is
// env-gated on DEEPBENCH_BACKUP_TOOLING rather than skipped or faked: where the tooling is
// present it is exercised for real, and where it is absent that is DECLARED. Do not "simplify"
// Part 3 into a grep of the scripts' source -- a source check passes on a script that imports the
// helper and forgets to call it at one of the two sites, which is precisely the bug that was here.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { selfRun, notRun } from "./_lib/self-run.js";

// The resolve the readers SHOULD do, and the one the runbook's workaround performs by rewriting
// the manifest. Kept as a named function so the negative control below can prove it does work --
// a normalization that were a no-op would pass every "does it resolve" check on Windows and be
// caught by nothing else.
function resolveEntry(setDir, file) {
  return path.join(setDir, ...String(file).split(/[\\/]/));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function run() {
  // --- Part 1: the claim itself, on a fixture. Always runs, no backup set needed. ------------
  //
  // Two entries, one carrying a foreign separator and one native, so the check cannot pass by
  // being indiscriminate.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ses191-"));
  try {
    fs.mkdirSync(path.join(tmp, "data"));
    fs.writeFileSync(path.join(tmp, "data", "alpha.ndjson"), '{"id":1}\n');
    fs.writeFileSync(path.join(tmp, "data", "beta.ndjson"), '{"id":2}\n');

    const windowsStyle = "data\\alpha.ndjson";
    const posixStyle = "data/beta.ndjson";

    // The naive resolve both readers perform today (restore-supabase.mjs:68, verify-backup.mjs:28).
    const naive = f => path.join(tmp, f);

    if (process.platform === "win32") {
      // On Windows both separators resolve, which is exactly why this defect shipped unnoticed:
      // the machine that takes the dumps is the one machine that cannot see it.
      notRun(
        "naive-join fails on a foreign separator",
        "only observable off win32; on Windows path.join accepts both separators, which is how this shipped unseen"
      );
    } else {
      assert(
        !fs.existsSync(naive(windowsStyle)),
        "negative control failed: a manifest path with a backslash resolved under a naive join on " +
          process.platform + ". If this ever passes, the runbook's workaround is describing a " +
          "problem that no longer exists and should be re-measured, not deleted."
      );
    }
    assert(fs.existsSync(naive(posixStyle)), "fixture is wrong: the POSIX-style entry should resolve naively on every platform");

    // The normalizing resolve must find BOTH on every platform. This is the assertion the
    // runbook's workaround rests on.
    assert(fs.existsSync(resolveEntry(tmp, windowsStyle)), "separator normalization did not resolve the backslash entry");
    assert(fs.existsSync(resolveEntry(tmp, posixStyle)), "separator normalization broke an already-POSIX entry");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // --- Part 2: a real backup set, when one is on this machine. --------------------------------
  //
  // Point DEEPBENCH_BACKUP_SET at a set directory (the one holding manifest.json) to gate on it.
  // Absent -- the normal case in CI and in a repo clone -- it is declared, never silently passed.
  const setDir = process.env.DEEPBENCH_BACKUP_SET;
  if (!setDir) {
    notRun(
      "every manifest entry of a real backup set resolves",
      "no DEEPBENCH_BACKUP_SET on this machine; backup sets are not in this repo (offsite: github.com/roadmapventure/deepbench-backups-offsite)"
    );
  } else {
    const manifestPath = path.join(setDir, "manifest.json");
    assert(fs.existsSync(manifestPath), `DEEPBENCH_BACKUP_SET=${setDir} has no manifest.json`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const entries = [];
    for (const group of ["tables", "views", "auth_storage"]) {
      for (const [name, rec] of Object.entries(manifest[group] || {})) {
        if (!rec || rec.failed || rec.skipped || !rec.file) continue;
        entries.push({ name, file: rec.file });
      }
    }
    assert(entries.length > 0, `no usable file entries in ${manifestPath} -- a manifest with nothing to restore is itself the failure`);

    const unresolved = entries.filter(e => !fs.existsSync(resolveEntry(setDir, e.file)));
    assert(
      unresolved.length === 0,
      `${unresolved.length} of ${entries.length} manifest entries do not resolve even after separator ` +
        `normalization -- the set is incomplete, not merely non-portable: ` +
        unresolved.slice(0, 5).map(e => `${e.name} -> ${e.file}`).join(", ")
    );
  }

  // --- Part 3: the fixed tooling itself, when a checkout of it is on this machine. ------------
  //
  // Point DEEPBENCH_BACKUP_TOOLING at a clone of roadmapventure/deepbench-backups-offsite. The
  // gate is end-to-end: build a set whose manifest records a FOREIGN separator -- the exact shape
  // that broke the live recovery net -- and require the real verify-backup.mjs to accept it.
  const tooling = process.env.DEEPBENCH_BACKUP_TOOLING;
  if (!tooling) {
    notRun(
      "the fixed backup tooling reads a foreign-separator manifest",
      "no DEEPBENCH_BACKUP_TOOLING on this machine; the tooling lives in github.com/roadmapventure/deepbench-backups-offsite (fix on branch ses191/backup-path-portability, not yet merged to its main)"
    );
  } else {
    const verifier = path.join(tooling, "verify-backup.mjs");
    assert(fs.existsSync(verifier), `DEEPBENCH_BACKUP_TOOLING=${tooling} has no verify-backup.mjs`);

    // A minimal set that is genuinely sound in every respect EXCEPT that its manifest path uses a
    // backslash. Anything the verifier rejects here, it rejects for the separator alone.
    const mkSet = (sha) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ses191-set-"));
      const body = '{"id":1}\n{"id":2}\n';
      fs.mkdirSync(path.join(dir, "data"));
      fs.writeFileSync(path.join(dir, "data", "alpha.ndjson"), body);
      // Both schema artifacts must exist and exceed 1 KB or the verifier fails for that reason
      // instead, which would make this test pass or fail for something other than the separator.
      for (const f of ["schema.sql", "migrations.sql"]) fs.writeFileSync(path.join(dir, f), "-- x\n".repeat(400));
      fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({
        tables: { alpha: { file: "data\\alpha.ndjson", rows: 2, pk: "id",
                           sha256: sha ?? crypto.createHash("sha256").update(body).digest("hex") } },
        views: {}, auth_storage: {},
      }));
      return dir;
    };

    const good = mkSet(null);
    const corrupt = mkSet("0".repeat(64));   // negative control: same shape, wrong checksum
    try {
      const run = (dir) => {
        try { execFileSync(process.execPath, [verifier, dir], { encoding: "utf8", stdio: "pipe" }); return 0; }
        catch (e) { return e.status ?? 1; }
      };

      assert(
        run(good) === 0,
        "the backup tooling still cannot read a manifest path written by another platform. This is " +
          "SES-191's original defect: an unresolvable path is reported as an ALTERED file, which " +
          "sends whoever is mid-outage to the integrity of their last backup instead of a separator."
      );
      // Without this, a verifier that exited 0 unconditionally would satisfy the assertion above.
      assert(
        run(corrupt) !== 0,
        "negative control failed: the verifier accepted a set whose checksum does not match, so its " +
          "acceptance of the foreign-separator set proves nothing"
      );
    } finally {
      fs.rmSync(good, { recursive: true, force: true });
      fs.rmSync(corrupt, { recursive: true, force: true });
    }
  }

  // The half of SES-191 that is still open. Declared rather than implied by silence.
  // John granted BOTH authorizations on card a9278eca (2026-08-25, attended architect session):
  // the $0 scratch slot and rebuilding the offsite archive. So this is no longer waiting on a
  // decision -- it is waiting on the drill being run.
  notRun(
    "restore into a clean scratch target, platform booted against it",
    "authorized by John 2026-08-25 (card a9278eca) and not yet executed; it needs a second Supabase project on his org (free tier, $0/mo, his last free slot, not deletable by the runner's tools) -- charter exit criterion 5 is scored by this drill"
  );
}

export default run;
selfRun(import.meta.url, run);
