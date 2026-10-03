// DeepBench v7.0.212 | tests/regression/LAV-17-evidence-record-titles.js | LAV-17 -- the Evidence
// card's fetch line names the RECORDS that came back, and still says how many.
//
// SES-69 discipline: nothing here re-implements the sentence. `deriveDid` is imported for real out
// of src/components/RunTasks.jsx (compiled by esbuild, the same way LAV-25-assembly-contract.js
// compiles AssemblyView.jsx and for the same reason -- plain Node cannot import .jsx), so a reverted
// or stubbed implementation FAILS this file rather than passing it.
//
// WHY THIS FILE HOLDS BOTH DIRECTIONS. The change is a fall-through, and a fall-through has two
// ways to be wrong that look opposite and pass the same one-sided check:
//   * group 1 fails against the PRE-CHANGE function, which returns "Fetched 3 chunks from
//     the_library." for a frame carrying titles -- so a no-op cannot pass it;
//   * group 2 fails against a build that ALWAYS takes the new branch, because it asserts the old
//     sentence character for character on a frame with no titles. That is the case that matters in
//     production: `roster` and queryRAG fetches carry no titles, and neither does any frame emitted
//     before v7.0.212, which is every frame in a stored trace replayed today.
// A build that satisfies only one of the two is the regression this file exists to catch.
//
// MUTATION (stated so it can be re-run): delete the `if (names.length && d.matchCount != null)`
// block from deriveDid()'s fetch branch and group 1 fails; change its guard to `if (true)` and
// group 2 fails.

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import esbuild from "esbuild";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE = path.join(REPO_ROOT, "src/components/RunTasks.jsx");

// Same stub, same reason as LAV-25-assembly-contract.js: src/lib/supabase.js builds a real client at
// module scope from Vite env vars no test process has, and RunTasks.jsx reaches it transitively.
// Every module carrying logic under test is compiled and run for real.
const stubSupabase = {
  name: "lav17-stub-supabase",
  setup(build) {
    build.onResolve({ filter: /(^|[\\/])supabase\.js$/ }, () => ({
      path: "lav17-stub-supabase", namespace: "lav17-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "lav17-stub" }, () => ({
      contents: "export const supabase = {};", loader: "js",
    }));
  },
};

async function loadRunTasks() {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, "node_modules", ".lav17-"));
  const outfile = path.join(dir, "run-tasks.mjs");
  try {
    await esbuild.build({
      entryPoints: [SOURCE],
      bundle: true, format: "esm", platform: "node", outfile,
      loader: { ".js": "jsx", ".jsx": "jsx" },
      // LAV-32c's lesson, inherited: a bare node compile has no import.meta.env, and a module-scope
      // read of it throws at import time -- which would turn every assertion below into an unrun
      // green. Empty object; nothing here calls out to a URL.
      define: { "import.meta.env": "{}" },
      plugins: [stubSupabase],
      logLevel: "silent",
    });
    return await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// A completion frame the way useHarnessStream.js's buildHopEvent builds one.
const fetchFrame = (data) => ({
  type: "assembly_work_complete",
  agentId: "eleanor",
  data: { work: "fetch", ...data },
  durationMs: 1200,
});

export default async function run() {
  const { deriveDid } = await loadRunTasks();
  assert.strictEqual(typeof deriveDid, "function",
    "the REAL deriveDid must be importable -- this suite asserts on it, never on a copy");

  // ── 1. Titles present: the records are named AND the count survives ─────────────────────────
  // Fails against the pre-change function, which returns "Fetched 3 chunks from the_library."
  const named = deriveDid(fetchFrame({
    source: "the_library", matchCount: 3,
    titles: ["FAR 52.204-21", "CMMC Level 2 scoping", "DFARS 252.204-7012"],
  }));
  assert.strictEqual(
    named,
    'Fetched 3 records from the_library — "FAR 52.204-21", "CMMC Level 2 scoping" and "DFARS 252.204-7012".',
    "a fetch carrying titles must name the records it retrieved",
  );
  assert.ok(/\b3 records\b/.test(named),
    "the measured count must survive: titles are a capped sample, and dropping the number would " +
    "make a short list read as the whole result set");

  // ── 2. No titles: TODAY'S SENTENCE, character for character ─────────────────────────────────
  // This is the production-critical direction -- roster/queryRAG fetches and every replayed
  // pre-v7.0.212 frame land here. Fails against a build that always takes the new branch.
  assert.strictEqual(
    deriveDid(fetchFrame({ source: "roster", matchCount: 12 })),
    "Fetched 12 chunks from roster.",
    "a frame with no titles must render exactly the pre-LAV-17 sentence",
  );
  assert.strictEqual(
    deriveDid(fetchFrame({ source: "the_library", matchCount: 5, titles: [] })),
    "Fetched 5 chunks from the_library.",
    "an EMPTY titles array is the same case as an absent one -- never an empty quoted list",
  );
  assert.strictEqual(
    deriveDid(fetchFrame({ source: "the_library" })),
    "Fetched supporting material from the_library.",
    "no matchCount is still the no-count sentence, titles or not",
  );

  // ── 3. The cap: three names and an honest remainder ─────────────────────────────────────────
  // api/ caps at EVIDENCE_TITLE_CAP = 3, so a 74-match catalog fetch arrives with three titles and
  // matchCount 74. The held-back count is computed from matchCount, never from a second field.
  assert.strictEqual(
    deriveDid(fetchFrame({
      source: "the_library_catalog", matchCount: 74,
      titles: ["Scoping guide", "Award history", "Vendor list"],
    })),
    'Fetched 74 records from the_library_catalog — "Scoping guide", "Award history", "Vendor list" and 71 more.',
    "a capped list must say how many records it is not naming",
  );

  // ── 4. Blank titles are filtered, never rendered as empty quotes ────────────────────────────
  // lib/vector-search.js yields `title: m.title || null`, so a row with no title is a real shape.
  assert.strictEqual(
    deriveDid(fetchFrame({
      source: "the_reasoning", matchCount: 2,
      titles: [null, "  ", "Pricing theory v3"],
    })),
    'Fetched 2 records from the_reasoning — "Pricing theory v3" and 1 more.',
    "null and whitespace titles must be dropped, not quoted as empty strings",
  );
  assert.strictEqual(
    deriveDid(fetchFrame({ source: "the_reasoning", matchCount: 2, titles: [null, "   "] })),
    "Fetched 2 chunks from the_reasoning.",
    "titles that are ALL blank leave nothing to name -- fall through, never render an empty dash",
  );

  // ── 5. A non-fetch assembly frame is untouched ──────────────────────────────────────────────
  assert.strictEqual(
    deriveDid({ type: "assembly_work_complete", agentId: "dan", data: { work: "reflect", tokens: 1832 } }),
    "Completed the reflect step · 1832 tok.",
    "only the fetch branch changed",
  );
}

selfRun(import.meta.url, run);
