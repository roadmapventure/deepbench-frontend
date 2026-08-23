// DeepBench v7.0.197 | tests/regression/DIR-b8d5ea7e-briefing-state-seed.js | directive b8d5ea7e
// FEATURE: a cycle's rebuild cannot silently take John's typed threads off the briefing page.
//
// John, 2026-08-23T13:57Z, Rework on card 9eacb4d5 (SES-132), repeated 13:59Z on 8c8deaae
// (SES-133), verbatim: "Let's test this within the next 2 hours i will be entering text in
// shipped, gated, questions, and vision, and the thread and any tickets must stay within their
// cards along with ticket id's it creates".
//
// THE DEFECT, MEASURED RATHER THAN REASONED ABOUT. briefing-template.html shipped a hardcoded
// EMPTY `briefing-state` block. thread(), orphanThreads(), readingSlot() and readingRecordedLine()
// read `state` and ONLY `state` -- not one of them queries Supabase -- so a cycle rebuilding the
// page structurally from the template published the empty skeleton and John's whole ask history
// and every meter reading left the page. His own taps were never the problem: doc(), the page's
// self-publish, serialises the LIVE state, so a tap preserves its own thread. Only a REBUILD wiped.
// The served artifact carried PAGE_BUILT = '2026-08-23T15:57Z' with asks:{} and reading:{} while
// the ledger held 8 answered threads across 8 targets -- one of them on item-chi84-gate, a card
// still awaiting his decision -- and 10 readings, latest 13:51Z. That rebuild landed two hours
// INSIDE the window he had announced for testing this exact behaviour.
//
// SES-132 had already shipped the section 9.1 orphan renderer and was INERT, because the wipe
// happens upstream of the renderer it added. The regeneration contract never told a cycle to seed
// the block; it only ASSERTED, as a fact it relied on for insert idempotency, that "the page keeps
// every ask in briefing-state forever". public.briefing_state_seed() is what makes that true.
//
// WHY A TEST AND NOT A SENTENCE IN A DOC. The template's old default was VALID, EMPTY JSON -- the
// most natural thing in the world for a later editor to "restore" while tidying, and completely
// indistinguishable from a correct state once published. That is the same class of silent,
// plausible-looking regression SES-138 guards for the page's title. So the sentinel is asserted
// here, where undoing it fails the suite.
//
// Five assertions. Assertions 1, 2 and 4 FAIL on the pre-change tree -- that is the negative
// control, and it is what makes this QA rather than a presence check.
//
// No network, no credentials, no database. It reads two repo files.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const TEMPLATE = path.join(ROOT, "docs", "runbooks", "briefing-template.html");
const CONTRACT = path.join(ROOT, "docs", "runbooks", "briefing-page.md");

export const SEED_FN = "public.briefing_state_seed()";
export const SENTINEL = '{"__unseeded":true}';

// The keys the page is the ONLY render home for. Everything else in the state block is harvested
// to a durable table and re-derived from it at render time, so a blank value there is correct by
// design; a blank value for these two is data John typed, no longer shown to him.
export const PAGE_OWNED_KEYS = ["asks", "reading"];

export async function run() {
  const src = fs.readFileSync(TEMPLATE, "utf8");

  // ---- 1. The template ships the SENTINEL, not a valid empty state -------------------------
  // FAILS on the pre-change tree, which shipped {"items":{},"directive":"","reading":{},...}.
  const blockRe = /<script type="application\/json" id="briefing-state">([\s\S]*?)<\/script>/;
  const m = src.match(blockRe);
  assert.ok(m, "briefing-template.html no longer carries a #briefing-state block at all");
  assert.strictEqual(m[1].trim(), SENTINEL,
    `the template's #briefing-state block reads ${JSON.stringify(m[1].trim())} -- it must be the ` +
    `sentinel ${SENTINEL}. A valid-looking empty state is indistinguishable from a correctly ` +
    `seeded one once published, which is precisely how John's threads went missing.`);

  // The sentinel must not parse as a usable state either -- belt and braces on assertion 1.
  const parsed = JSON.parse(m[1].trim());
  assert.strictEqual(parsed.__unseeded, true,
    "the sentinel no longer carries __unseeded:true, so the page cannot tell a seeded rebuild " +
    "from an unseeded one");
  for (const k of PAGE_OWNED_KEYS) {
    assert.ok(!(k in parsed),
      `the sentinel carries a "${k}" key. It must carry NOTHING but __unseeded: a sentinel that ` +
      `also looks like a state is the defect wearing the fix's clothes.`);
  }

  // ---- 2. The page detects the sentinel and reacts to it -------------------------------------
  // FAILS on the pre-change tree: neither identifier existed.
  assert.ok(/var unseeded\s*=/.test(src),
    "the #code script no longer derives an `unseeded` flag -- without it the sentinel is just a " +
    "broken state object and the page renders empty with no explanation");
  assert.ok(/function seedBanner\s*\(/.test(src),
    "seedBanner() was removed -- a cycle that skips the seed would ship a page that looks " +
    "complete, which is the whole failure this guards");
  assert.ok(/seedBanner\(\)\s*\+/.test(src),
    "seedBanner() is defined but never rendered into the page output");

  // ---- 3. The banner names the fix and does not claim the data was lost ----------------------
  // The honest failure here is "this page is not showing you everything", never "your threads
  // were deleted" -- the ledger is the home and it is untouched. Getting that wrong would tell
  // John he had lost work he had not lost, on the page he reads first.
  const bannerStart = src.indexOf("function seedBanner");
  const banner = src.slice(bannerStart, bannerStart + 900);
  assert.ok(banner.includes(SEED_FN),
    `the unseeded banner no longer names ${SEED_FN} -- it must say which call fixes it, or it is ` +
    `an error message with no remedy`);
  assert.ok(/stored/i.test(banner),
    "the unseeded banner must tell John his threads and readings are STORED, not lost -- the " +
    "ledger is untouched by an unseeded rebuild and telling him otherwise is a false alarm");

  // ---- 4. The regeneration contract carries the rule -----------------------------------------
  // FAILS on the pre-change tree: briefing-page.md never mentioned seeding the state block. Its
  // only related sentence asserted the page "keeps every ask forever" as a fact it relied on,
  // while nothing anywhere made that true.
  const contract = fs.readFileSync(CONTRACT, "utf8");
  for (const needle of [SEED_FN, "__unseeded"]) {
    assert.ok(contract.includes(needle),
      `docs/runbooks/briefing-page.md no longer mentions ${JSON.stringify(needle)} -- the ` +
      `regeneration contract must keep telling a rebuilding cycle to seed the state block`);
  }

  // ---- 5. The `at` format rule survives in writing -------------------------------------------
  // The seed MANUFACTURES the timestamps the harvest parses back, and the harvest stays idempotent
  // only through uniq_card_ask (target_id, asked_at, question). Emit CST -- which the page's own
  // display rule actively tempts -- or seconds, and every rebuild+harvest silently DOUBLES every
  // ask. Proven live at ship: the shipped UTC/minute/Z form round-trips 8 of 8, while the CST and
  // seconds forms match 0 of 8. Nothing in JS can enforce that, so the rule is asserted where a
  // later editor of the contract will see it.
  assert.ok(/UTC/.test(contract) && /minute/i.test(contract),
    "briefing-page.md no longer states that the seeded timestamps are UTC at minute precision -- " +
    "that format is the only thing keeping the ask harvest idempotent against uniq_card_ask");
}

export default run;
selfRun(import.meta.url, run);
