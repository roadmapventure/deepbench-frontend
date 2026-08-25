// DeepBench v7.0.245 | tests/regression/SES-191-backup-path-portability.js | SES-191 -- the full
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
// THE ASSERTION THIS FILE GATES ON IS "RESOLVES AFTER NORMALIZATION", NOT "RESOLVES AS STORED" --
// and that is deliberate, not a softened bar. As-stored resolution is what the tooling fix
// (SES-191's gated remainder: dump-supabase.mjs:159/204 must write POSIX separators) will make
// true; gating on it today would paint the suite red over a defect this repo cannot fix, since the
// tooling lives in `roadmapventure/deepbench-backups-offsite`, not here. What IS gated is the
// claim the restore runbook now makes to whoever is mid-outage: normalize the separators and the
// documented procedure works. That goes red if a set is genuinely incomplete or corrupt.

import fs from "fs";
import os from "os";
import path from "path";
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

  // The half of SES-191 this repo cannot close. Declared rather than implied by silence.
  notRun(
    "restore into a clean scratch target, platform booted against it",
    "SES-191's gated remainder -- it needs a second Supabase project on John's org (free tier, $0/mo, but his last free slot and not deletable by the runner's tools); carded for his decision"
  );
}

export default run;
selfRun(import.meta.url, run);
