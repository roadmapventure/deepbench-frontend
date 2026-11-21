#!/usr/bin/env node
// DeepBench v7.0.1102 | scripts/ci-new-reds.js | AGT-611 -- CI fails only on a red this push introduced.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { failingTestsFrom } from "./verifier.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SUITE = "tests/regression";
const say = (code, m) => { console.log(`AGT-611: ${m}`); return code; };

export function newReds({ headFails, baseFails }) {
  const standing = headFails.filter(n => baseFails.includes(n));
  return { standing, fresh: headFails.filter(n => !standing.includes(n)) };
}

const arg = (argv, name) => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;

export function main(argv) {
  const code = Number(arg(argv, "head-code") ?? NaN);
  const headRoot = path.resolve(arg(argv, "head-root") ?? ROOT);
  const baseRoot = arg(argv, "base-root");
  const log = arg(argv, "head-log");
  if (!Number.isInteger(code) || !baseRoot || !log || !fs.existsSync(log)) return say(2, "flags missing");
  if (code !== 1) return say(code, `HEAD exited ${code}: passed through.`);
  const headFails = failingTestsFrom(fs.readFileSync(log, "utf8"))
    .filter(n => fs.existsSync(path.join(headRoot, SUITE, n)));
  if (!headFails.length) return say(1, "HEAD exited 1 and named no failing test file.");
  const inBase = headFails.filter(n => fs.existsSync(path.join(baseRoot, SUITE, n)));
  let baseFails = [];
  if (inBase.length) {
    const runner = path.resolve(arg(argv, "base-runner") ?? path.join(baseRoot, SUITE, "run-all.js"));
    const r = spawnSync(process.execPath, [runner, `--dir=${path.join(baseRoot, SUITE)}`, `--only=${inBase.join(",")}`],
      { cwd: baseRoot, encoding: "utf8" });
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    console.log(out.replace(/^/gm, "  base| "));
    baseFails = failingTestsFrom(out);
    if (r.status !== 0 && !(r.status === 1 && baseFails.length)) return say(1, `BASE exited ${r.status}: proved no red standing.`);
  }
  const { standing, fresh } = newReds({ headFails, baseFails });
  for (const n of headFails) console.log(`  [${fresh.includes(n) ? "NEW RED" : "STANDING"}] ${n}`);
  return say(fresh.length ? 1 : 0, `${standing.length} standing (red at BASE too), ${fresh.length} new.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
