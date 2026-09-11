#!/usr/bin/env node
// DeepBench v7.0.451 | scripts/render-claude-state.js | SES-354 — A SHIP IS A CYCLE ROW THAT RECORDS A
// PUSH (`push_sha IS NOT NULL`), not one whose `outcome` reached `shipped`. The retired predicate read a
// CYCLE-OUTCOME vocabulary (ARCHITECTURE.md §19v) as if it were a statement about what reached dev, and
// it was wrong in both directions. Measured against the live ledger 2026-09-11:
//   - INVISIBLE SHIPS. `a8000000-0000-4000-8000-0000000000a8` carries `version=v7.0.447`,
//     `push_sha=a6add235`, `outcome=gated_before_build`, `trigger=supervised` — an attended multi-ship
//     session that really did put v7.0.447 on dev and that this renderer could not see. On 2026-09-10 it
//     rendered "Version in dev: v7.0.423" (`3903a864`) while dev was at v7.0.447. Not a one-off: of 252
//     rows with a `push_sha`, 18 are `gated_before_build`, three of them carrying a version (447/324/302).
//   - PHANTOM SESSIONS. `922fa07f` — a `SCHEDULED-AGENT: rank-backlog` re-rank — is `outcome=shipped`
//     with `push_sha=null` and `version=null`. Nothing from it ever landed on dev, yet it was bullet 3 of
//     the committed file (and on 2026-09-10 all three bullets were rows of that kind).
// `push_sha` is the honest predicate on both counts: no `failed` or `did_not_run` row has one, so "has a
// push_sha" and "reached dev" are the same population. It is used in THREE places that must agree — the
// REST filter (`LEDGER_FILTER`), `checkAgainstPin`, and the guards — via the one exported `isLedgerShip`.
//
// TWO VARIANTS REJECTED WITH LIVE EVIDENCE, recorded because both read as the obvious fix:
//   (a) "read the version from the highest issued version." `issued_versions`' top row is v7.0.451,
//       issued to the cycle writing this line, while dev's head is v7.0.450. ISSUED IS NOT PUSHED — that
//       form lies on every cycle between claim and push, and it breaks SES-261 outright: `--check`
//       re-renders byte-exact from the PINNED rows, and a counter read at render time is not pinned, so
//       the committed file would go red the moment any concurrent session claimed a number.
//   (b) "list sessions from `runner_decisions kind='ship'`." That table has no `version` column (42703),
//       and `a8000000` carries 4 ship decisions and 0 ship cards for 24 versions. Not a population.
//
// The 15 version-less `gated_before_build` pushes are the sanctioned tail snapshot re-exports. They did
// commit to dev, and they render through the "(no version claimed) … no ticket" bullet this file already
// reserves for publish-only cycles — nothing new was invented for them.
//
// DeepBench v7.0.356 | scripts/render-claude-state.js | SES-265 — the two standing-brief sentences this
// script EMITS ("maintained by hand", "never regenerated") were false from v7.0.236 and shipped into
// CLAUDE-STATE.md on every render; both now name the generated block and the hand prose separately. See
// the WHAT IS STILL HAND-MAINTAINED note below. No behaviour change — string content only.
//
// DeepBench v7.0.347 | scripts/render-claude-state.js | SES-261 — `--check` IS PIN-ANCHORED and no
// longer races the pushing cycle's own close. It grades the committed file against the cycles the file
// SAYS it was rendered from (the `ledger-pin:` id list in its own trailing comment), never against the
// live top-10. THE EDIT THIS FORBIDS, and it is tempting because it reads like a freshness check:
// re-reading the live top-10 here to assert the file is CURRENT. That is precisely the race this
// removed — a cycle's row reaches `shipped` only in its step-9 tail, after it rendered and pushed, so
// "current" is unsatisfiable under the one-push rule and every ship went red by construction. This is
// an AUTHENTICITY gate now; the freshness signal is the non-gating WARN and a hard bound is a separate
// ticket. The pin is a LIST OF IDS and must not become a timestamp cutoff — a cloud cycle can be
// suspended across wall-clock gaps invisible from inside it, so `started_at <= basis` silently admits
// rows the render never saw. Guarded by tests/regression/SES-261-ledger-pin.js, whose control runs the
// retired live-top-10 form on the SAME fixture and asserts it LOSES.
//
// DeepBench v7.0.228 | scripts/render-claude-state.js | SES-177 — CLAUDE-STATE.md's derivable half is
// GENERATED; its standing judgment prose lives in docs/runbooks/standing-brief.md and is linked, never
// regenerated.
//
// John's decision, gated card 37b22393 (Accept, 2026-08-24, attended decision-drain): "Build the
// renderer with a SPLIT: derivable facts ... are generated from tables; the standing 'Next session'
// JUDGMENT PROSE moves VERBATIM to the new docs/runbooks/standing-brief.md ... Nothing is dropped and
// nothing is hand-copied — the renderer must fail rather than regenerate a file that would lose the
// standing-brief link."
//
// THE FAIL-CLOSED CONDITION IS THE POINT OF THIS SCRIPT, not a nicety. Measured before the split:
// CLAUDE-STATE.md was 14,489 chars and the standing paragraph alone was 7,643 of them — 53% — held in
// NO table. A renderer that regenerated the file from tables covering the other 47% would publish a
// tidy-looking skeleton and destroy the majority of the file, which is the v7.0.197 briefing failure
// exactly (a rebuild from an incomplete source wiped what was not in the source, and nothing on the
// result said so). So: if docs/runbooks/standing-brief.md is missing, or the rendered body would not
// carry a link to it, this script REFUSES (exit 2) and writes nothing.
//
// Exit 0 = rendered (or --check found no drift). Exit 1 = --check found drift. Exit 2 = COULD NOT RUN
// (missing env, REST failure, missing standing brief). Exit 2 is never a pass — same convention as
// export-backlog-snapshot.js and heal-engine.js.
//
// WHAT IS STILL HAND-MAINTAINED, corrected at v7.0.356 (SES-265) because the sentence that stood here
// had gone false and this script was EMITTING it into CLAUDE-STATE.md on every ship. It used to read
// that the standing brief "is maintained by hand", with the census/drain/scheduler extraction named as
// SES-177's unattempted remainder. That remainder SHIPPED at v7.0.236 (SES-177 (b)): those facts now
// live in a marked, generated block that scripts/render-standing-brief.js renders from the tables, and
// runner-cycle.md step 7 invokes that renderer at every ship. So the brief has TWO halves and the two
// user-visible strings below say so — a generated block, and hand-maintained judgment prose beneath it.
// Do not re-collapse them into one claim in either direction: "hand-maintained" understates the block
// (and is what CLAUDE-STATE.md told every session for ~120 versions), and "generated" overstates the
// prose, which this repo deliberately keeps hand-written and which render-standing-brief.js is
// structurally incapable of touching.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "CLAUDE-STATE.md");
const STANDING_REL = "docs/runbooks/standing-brief.md";
const STANDING_ABS = path.join(ROOT, STANDING_REL);

const GENERATED_MARK = "<!-- GENERATED by scripts/render-claude-state.js";

const CHARTER =
  "> Updated at the close of every session. **Keep this file short.** The three sections below are " +
  "**generated** from `runner_cycles` by `scripts/render-claude-state.js` — do not hand-edit them; " +
  "edit the row or the renderer. Standing judgment context (board census, drain state, automation-lane " +
  "rules, scheduler settings, standing filing rules) lives in [`docs/runbooks/standing-brief.md`](" +
  STANDING_REL + "), whose derivable facts are **generated from the tables at every ship** by " +
  "`scripts/render-standing-brief.js` and whose judgment prose beneath that block is hand-maintained. " +
  "Read `docs/SESSIONS.md` only when you need version " +
  "history or root-cause context from a past session, never by default.";

function die(msg, code = 2) {
  console.error(`render-claude-state: ${msg}`);
  process.exit(code);
}

// --- pure helpers (exercised directly by tests/regression/SES-177-claude-state-renderer.js) --------

// The fail-closed test. Kept pure and exported so the guard asserts the REAL predicate rather than a
// copy of it -- the DIR-603f44ea / SES-176 precedent.
export function bodyKeepsStandingLink(body) {
  return typeof body === "string" && body.includes(STANDING_REL);
}

// THE SHIP PREDICATE (SES-354). One definition, three call sites: LEDGER_FILTER below sends it to
// PostgREST, checkAgainstPin applies it to the pinned rows, and the guards import THIS function rather
// than a copy. Do not re-admit `outcome` here: `outcome` is cycle-outcome vocabulary, and
// `gated_before_build` describes how a cycle ENDED, not whether it pushed. See the header.
export function isLedgerShip(cycle) {
  return Boolean(cycle && cycle.push_sha);
}

// The REST tail main() actually sends, EXPORTED so the guard asserts the string the script uses rather
// than a copy of it (the DIR-603f44ea / SES-176 precedent — a test that retypes the query passes forever
// while the shipped filter rots).
//
// `push_sha=not.is.null`, not `outcome=eq.shipped`: see the header. It admits the attended multi-ship
// rows whose outcome is `gated_before_build`, and it drops the rank-backlog rows that close `shipped`
// having pushed nothing. It also drops the IN-FLIGHT cycle, which has claimed a version but not yet
// pushed — so this file never publishes a version that is not on dev.
//
// 10, not 3: the bullets need 3 pushed cycles but the version lines need the two highest versions among
// the pushed rows, and those can sit further back when publish-only cycles push in between. Bounded
// rather than unbounded -- a version older than ten ships is not "prior", it is history, and
// docs/SESSIONS.md is where history lives.
export const LEDGER_FILTER = "&push_sha=not.is.null&order=started_at.desc&limit=10";

// Both spellings occur on real pushed rows — `7.0.337`, `7.0.292`, `7.0.232` sit alongside `v7.0.x` —
// so the `v` is optional. Anything unparseable ranks -1 and is excluded, never sorted as zero.
export function versionRank(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(typeof v === "string" ? v.trim() : "");
  if (!m) return -1;
  return Number(m[1]) * 1e6 + Number(m[2]) * 1e3 + Number(m[3]);
}

// The two highest versions among the fetched rows, NOT the two newest by `started_at`. Sort is stable,
// so equal ranks keep REST order.
export function pickVersioned(cycles) {
  const ranked = (cycles || []).filter(c => versionRank(c && c.version) >= 0);
  const sorted = ranked.slice().sort((a, b) => versionRank(b.version) - versionRank(a.version));
  return [sorted[0], sorted[1]];
}

export function cstDate(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

// One session bullet, in John's register. `card` may be null -- a cycle can ship without a ship card
// (a publish-only cycle), and the honest rendering is the ticket line without an invented summary.
export function renderBullet(cycle, card) {
  const bits = [
    cycle.version || "(no version claimed)",
    cstDate(cycle.started_at),
    "runner cycle `" + String(cycle.id).slice(0, 8) + "`",
    "**" + (cycle.trigger || "unknown trigger") + "**",
    "model " + (cycle.model || "unknown"),
  ];
  const head = `- ${bits.join(", ")}`;
  const ticket = cycle.item_id ? `**\`${cycle.item_id}\`` + (card?.title ? ` — ${stripId(card.title, cycle.item_id)}` : "") + "**" : "**no ticket**";
  const plain = card?.plain_after ? ` ${card.plain_after}` : "";
  const worth = card?.plain_worth ? ` ${card.plain_worth}` : "";
  return `${head} — ${ticket}.${plain}${worth}`;
}

// A card title already opens with "SES-177 — ..."; rendering the id twice reads as a stutter.
export function stripId(title, id) {
  if (!id) return title;
  const re = new RegExp("^\\s*" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[—-]\\s*");
  return title.replace(re, "");
}

// THE LEDGER PIN (SES-261, v7.0.347) — the ids this file was rendered FROM, carried in the file.
//
// WHY A LIST OF IDS AND NOT A TIMESTAMP CUTOFF, which is the obvious cheaper form and is UNSOUND
// here: a cloud cycle can be suspended and resumed across wall-clock gaps invisible from inside it
// (`633fe486` started 05:07Z and was still executing at 13:10Z), so a cycle can close `shipped` long
// after a later-STARTED cycle already did. A `started_at <= basis` window would then silently admit
// rows the render never saw, and the check would go red on a file nobody touched. An id list
// describes exactly what was read and is immune to that by construction.
export function renderPin(cycles) {
  return cycles.map(c => String(c.id)).join(",");
}

// Parse the pin back out. Returns [] for a file with no parseable pin -- the CALLER decides what that
// means, and it must mean DRIFT (exit 1), never a pass: a stripped pin is a hand-edit, and a
// "gracefully skip when absent" branch here would let deleting one comment turn the gate green.
export function parsePin(fileText) {
  if (typeof fileText !== "string") return [];
  const m = fileText.match(/ledger-pin:\s*([0-9a-fA-F,-]*?)\s*-->/);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(Boolean);
}

// The comparator, pure and exported so the guard asserts the REAL predicate rather than a copy of it
// (the DIR-603f44ea / SES-176 precedent). `rows` is whatever the ledger returned for the pinned ids.
// Returns { code, reason }: 0 = no drift, 1 = drift. It never returns 2 -- "could not run" belongs to
// the caller's network/env layer, and conflating a deleted row (real drift) with a REST failure
// (could not run) is how a check softens.
export function checkAgainstPin(fileText, rows, cardsByTicket) {
  const pin = parsePin(fileText);
  if (pin.length === 0) {
    return { code: 1, reason: "no ledger-pin in the committed file — it was hand-edited or predates SES-261" };
  }
  const byId = new Map((rows || []).map(r => [String(r.id), r]));
  const missing = pin.filter(id => !byId.has(id));
  if (missing.length) {
    return { code: 1, reason: `the ledger no longer carries ${missing.length} pinned cycle(s): ${missing.join(", ")}` };
  }
  const noPush = pin.filter(id => !isLedgerShip(byId.get(id)));
  if (noPush.length) {
    return { code: 1, reason: `pinned cycle(s) no longer record a push_sha: ${noPush.join(", ")}` };
  }
  const ordered = pin.map(id => byId.get(id));
  const body = renderBody(ordered, cardsByTicket);
  return body === fileText
    ? { code: 0, reason: "the committed file is a byte-exact render of the cycles it pins" }
    : { code: 1, reason: "the committed file differs from a re-render of the cycles it pins" };
}

export function renderBody(cycles, cardsByTicket) {
  // THE VERSION LINES AND THE SESSION BULLETS READ DIFFERENT SETS, deliberately. "Version in dev" and
  // "Prior" answer *which version is on dev*, so they skip cycles that claimed no version at all -- a
  // publish-only cycle ships real work and is a real session, but it is not a version. Taking
  // cycles[0..1] instead renders "(no version claimed)" as the current version of dev, which is not a
  // gap being surfaced honestly, it is the wrong question answered. The bullets below DO list every
  // pushed cycle, version or not, because there the question is *what happened*, and there `started_at`
  // order is the right order.
  //
  // THE VERSION LINES TAKE THE TWO HIGHEST PUSHED VERSIONS, NOT THE TWO NEWEST-STARTED (SES-354).
  // `started_at` is not version order, for the same reason SES-261's pin is an id list and not a
  // timestamp cutoff (see the note above renderPin): a cloud or attended cycle can span wall-clock gaps
  // and push long after it started. Live proof: `a8000000` STARTED 2026-09-08 and pushed v7.0.447 on
  // 2026-09-10, so any scheduled cycle starting after 09-08 and pushing a LOWER number outranked it on
  // start order and would have been published as the version in dev. Numeric rank is the question the
  // line actually asks.
  const [current, prior] = pickVersioned(cycles);
  const lines = ["# DeepBench — Current State", CHARTER, ""];

  lines.push(
    "**Version in dev:** " +
      (current ? `${current.version || "(no version claimed)"} (runner cycle \`${String(current.id).slice(0, 8)}\`, ${cstDate(current.started_at)}, **${current.trigger}**, model ${current.model}${current.push_sha ? `, push \`${current.push_sha}\`` : ""}${current.item_id ? ` — \`${current.item_id}\`` : ""})`
                : "(no shipped cycle on record)"),
    ""
  );
  lines.push(
    "**Prior:** " +
      (prior ? `${prior.version || "(no version claimed)"} (runner cycle \`${String(prior.id).slice(0, 8)}\`, ${cstDate(prior.started_at)}, **${prior.trigger}**, model ${prior.model}${prior.item_id ? ` — \`${prior.item_id}\`` : ""})`
             : "(none)"),
    ""
  );
  lines.push(
    "**Standing brief:** the standing context every session reads at start — board census, drain " +
      "state, automation-lane rules, scheduler settings and the standing filing rules — lives in " +
      `[\`${STANDING_REL}\`](${STANDING_REL}). Its derivable facts are **generated**, rendered from ` +
      "the tables by `scripts/render-standing-brief.js` at every ship (`runner-cycle.md` step 7); " +
      "the judgment prose beneath that block is hand-maintained, and where the two disagree about a " +
      "number the generated block is the one that is right.",
    ""
  );

  lines.push("## Last 3 sessions", "");
  for (const c of cycles.slice(0, 3)) lines.push(renderBullet(c, cardsByTicket.get(c.item_id) || null));
  lines.push("");
  lines.push(`${GENERATED_MARK} — do not hand-edit the sections above. ledger-pin: ${renderPin(cycles)} -->`);
  return lines.join("\n") + "\n";
}

// --- data ------------------------------------------------------------------------------------------

async function rest(base, key, pathAndQuery) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let res;
  try {
    res = await fetch(`${base.replace(/\/+$/, "")}/rest/v1/${pathAndQuery}`, { headers });
  } catch (e) {
    die(`could not reach the Supabase REST endpoint: ${e.message}`);
  }
  if (!res.ok) die(`Supabase REST returned HTTP ${res.status} ${res.statusText}: ${await res.text().catch(() => "")}`);
  return res.json();
}

async function main() {
  const check = process.argv.includes("--check");

  // FAIL CLOSED, first thing and before any network call: no standing brief, no render.
  if (!fs.existsSync(STANDING_ABS)) {
    die(`${STANDING_REL} is missing. Refusing to render — regenerating CLAUDE-STATE.md without it would `
      + `destroy the standing brief's link and, historically, the majority of the file's content.`);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    die(`missing ${[!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_KEY"].filter(Boolean).join(", ")}`);
  }

  const cycles = await rest(url, key,
    "runner_cycles?select=id,started_at,trigger,model,version,item_id,push_sha,outcome" + LEDGER_FILTER);
  if (!Array.isArray(cycles) || cycles.length === 0) die("no pushed cycles on record — nothing to render");

  const tickets = [...new Set(cycles.map(c => c.item_id).filter(Boolean))];
  const cardsByTicket = new Map();
  if (tickets.length) {
    const inList = tickets.map(t => `"${t}"`).join(",");
    const cards = await rest(url, key,
      `runner_items?select=backlog_id,title,plain_after,plain_worth,kind,created_at` +
      `&kind=eq.ship&backlog_id=in.(${inList})&order=created_at.desc`);
    for (const c of cards) if (!cardsByTicket.has(c.backlog_id)) cardsByTicket.set(c.backlog_id, c);
  }

  // --check is PIN-ANCHORED (SES-261, v7.0.347): it grades the committed file against the cycles that
  // file says it was rendered from, NOT against the live top-10. The live-top-10 form made every
  // runner ship red by construction -- a cycle's own row reaches `shipped` only in its step-9 tail,
  // AFTER it rendered and pushed, so the committed file was stale the instant its own cycle closed,
  // and every LATER commit by anyone stayed red until something happened to re-render. Measured
  // 2026-08-31: `a906b726` closed shipped 17:08:22Z; `05506b0` (17:24Z) and `b7f97081` (17:43Z) were
  // both red on this one test with Build green.
  //
  // WHAT THIS DELIBERATELY TRADES AWAY, named rather than discovered later: this is now an
  // AUTHENTICITY gate, not a FRESHNESS one. A valid old render stays green indefinitely, so if step
  // 7a's render silently stopped running nothing here would go red. That is why the WARN below
  // ships with it. A hard freshness bound is a separate ticket -- do not bolt one on by re-reading
  // the live top-10 here, which is exactly the race this removed.
  if (check) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    const pin = parsePin(current);
    let pinnedRows = [];
    let pinnedCards = new Map();
    if (pin.length) {
      // Fetch EXACTLY the pinned rows. A REST failure dies at exit 2 inside rest() -- "could not run"
      // is never a pass, and is a different verdict from "a pinned row is gone" (drift, exit 1).
      pinnedRows = await rest(url, key,
        "runner_cycles?select=id,started_at,trigger,model,version,item_id,push_sha,outcome" +
        `&id=in.(${pin.join(",")})`);
      const pinnedTickets = [...new Set(pinnedRows.map(c => c.item_id).filter(Boolean))];
      if (pinnedTickets.length) {
        const pinnedCardRows = await rest(url, key,
          `runner_items?select=backlog_id,title,plain_after,plain_worth,kind,created_at` +
          `&kind=eq.ship&backlog_id=in.(${pinnedTickets.map(t => `"${t}"`).join(",")})&order=created_at.desc`);
        for (const c of pinnedCardRows) if (!pinnedCards.has(c.backlog_id)) pinnedCards.set(c.backlog_id, c);
      }
    }
    const verdict = checkAgainstPin(current, pinnedRows, pinnedCards);
    if (verdict.code === 0) {
      // Non-gating freshness signal: visibility without re-importing the race the pin just removed.
      const liveNewest = cycles[0] ? String(cycles[0].id) : null;
      if (liveNewest && pin[0] !== liveNewest) {
        console.log(`render-claude-state --check: WARN -- the file is authentic but not current; the ledger's newest pushed cycle is ${liveNewest.slice(0, 8)} and the file pins ${String(pin[0]).slice(0, 8)}. The next render folds it in. Not a failure.`);
      }
      console.log(`render-claude-state --check: no drift -- ${verdict.reason}.`);
      process.exit(0);
    }
    console.log(`render-claude-state --check: DRIFT -- ${verdict.reason}.`);
    process.exit(1);
  }

  const body = renderBody(cycles, cardsByTicket);

  // The same predicate the test asserts. A body that lost the link never reaches disk.
  if (!bodyKeepsStandingLink(body)) {
    die("the rendered body does not link the standing brief — refusing to write it (John's fail-closed condition)");
  }

  fs.writeFileSync(OUT, body);
  console.log(`render-claude-state: wrote CLAUDE-STATE.md (${Buffer.byteLength(body)} bytes, ${cycles.length} sessions, standing brief linked).`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "")) {
  main();
}
