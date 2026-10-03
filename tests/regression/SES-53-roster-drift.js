// DeepBench v7.0.316 | tests/regression/SES-53-roster-drift.js | SES-53
//
// Guards the session-history corpus against agent name/role drift away from src/data/agents.js,
// which ARCHITECTURE.md and the ticket both name as the roster's source of truth.
//
// FOUND LIVE 2026-07-29 (S-HAR-21-design) and re-measured at this ship: the corpus called Nadia
// Farouk "Nadia Rahman — Data Analyst" and Owen Marsh "Owen Brennan — Quality Gate Reviewer".
// The ticket's harm model is propagation, not the single line: "a single wrong name propagates
// into every session that quotes the entry."
//
// THE TICKET'S OWN FILE NAME HAD DECAYED, and that is why this file sweeps TWO paths. SES-53 says
// docs/SESSIONS.md; by the time it was built, the S-AGT-37 entry it cites had been ARCHIVED into
// docs/SESSIONS-ARCHIVE-2026-0607.md, taking the drift with it -- grep "Rahman" over SESSIONS.md
// returned nothing while the archive held three hits. A spot-fix of the named file would have
// found nothing and closed a live defect as dead. The two files are one document split by size,
// and a session quoting either half is misled the same way.
//
// WHY THE ROLE SLOT IS CAPTURED GENERICALLY AND NOT MATCHED AGAINST THE ROSTER'S ROLE LIST. This
// detector's first working version compared the text after the em-dash against the list of roles
// in agents.js and reported ZERO findings on a corpus that demonstrably contains "Nadia Rahman --
// Data Analyst". A DRIFTED ROLE IS BY DEFINITION NOT IN THE ROSTER, so matching against the roster
// can only ever re-find the correct ones. The slot is captured as a title-case run and compared
// afterwards. Do not "simplify" it back.
//
// THREE EXCLUSIONS, each a decision rather than an oversight, and each encoded as a rule so the
// next sweep applies the same line instead of re-deriving a different one:
//
//   (1) TEXT THAT QUOTES THE DEFECT IS EXEMPT, in exactly two places, and for one reason: a
//       sentence ABOUT the wrong string has to contain it. Those are (a) the SES-53 filing the
//       archive itself carries, matched by CONTENT rather than by line number -- a re-flow of a
//       7,000-line file must not silently turn the exemption into a hole -- and (b) the archive's
//       PROVENANCE HEADER, the block above the first `## ` entry, where v7.0.316 records which ten
//       strings it corrected and why. The header is provenance, not session history; the boundary
//       is structural (first `## `) rather than a line count, so the exemption cannot creep into
//       the entries themselves as the file grows.
//   (2) A LINE-WRAPPED ROLE IS NOT DRIFT. "Michelle Manning — Project" at end-of-line continues
//       "Manager" on the next one. A match that ends at EOL is skipped.
//   (3) A CONTRACTION OF THE RIGHT ROLE IS NOT AN ATTRIBUTION OF A DIFFERENT ONE -- but only when
//       it stays unambiguous. "Susan Smith — Trainer's" (roster: Trainer Agent) misidentifies
//       nobody, because no second agent answers to "Trainer". The test is AMBIGUITY WITH ANOTHER
//       ROSTER MEMBER, and it is what makes "Bob Whitfield — Procurement Analyst" a real finding
//       rather than a contraction: the roster also carries Junior Procurement Analyst (Chloe
//       Okafor) and Senior Procurement Analyst (Mike Alvarez), so the short form is a role three
//       people could answer to. That case is the reason the rule is ambiguity and not length.
//
// A WRONG SURNAME IS NEVER EXCUSED BY ANY OF THE THREE. There is no contraction of "Farouk" that
// is "Rahman"; the exclusions apply to the role slot only.
//
// NEGATIVE CONTROL, so this proves a DIFFERENCE from the pre-change corpus rather than a property
// both versions share: the retired strings are asserted ABSENT by name. Reverting the doc fix
// fails `retired-forms-are-gone` even if the general sweep were somehow weakened.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AGENTS = path.join(ROOT, "src/data/agents.js");
const CORPUS = ["docs/SESSIONS.md", "docs/SESSIONS-ARCHIVE-2026-0607.md"];

// The site that quotes the defect, matched by content (exclusion 1).
const DEFECT_QUOTE = 'this file records her as "Nadia Rahman — Data Analyst"';

// The forms this ship retired. Present anywhere in the corpus except the defect quote = regression.
const RETIRED = [
  "Nadia Rahman",
  "Owen Brennan",
  "GEO/CSO Expert",
  "Nadia Farouk — Data Analyst",
  "Bob Whitfield — Procurement Analyst",
];

// A role is a title-case run. A lowercase connector only continues it when a CAPITAL follows, so
// "Head of Product Strategy" is one role while "GEO CSO Expert and the benefit half" stops at
// "Expert" instead of swallowing the sentence.
const ROLE = "[A-Z][A-Za-z/]*(?:(?:\\s+(?:of|the|and))?\\s+[A-Z][A-Za-z/]*)*";

export function roster(src) {
  // The agent objects carry id + name + role together; the state-portal objects further down the
  // same file carry `key:`/`portal:` and no `role:`, so this shape excludes them by construction.
  const out = [];
  const re = /id:\s*"([a-z]+)",\s*name:\s*"([^"]+)",\s*role:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], name: m[2], role: m[3] });
  return out;
}

// Exclusion 3: `stated` is a contiguous word-run inside `correct`, and inside NO other role.
export function isUnambiguousContraction(stated, correct, allRoles) {
  const inside = (needle, hay) => ` ${hay} `.includes(` ${needle} `);
  if (stated === correct) return true;
  if (!inside(stated, correct)) return false;
  return allRoles.filter(r => inside(stated, r)).length === 1;
}

// Exclusion 1b: the provenance header — everything above the file's first `## ` entry heading.
export function bodyStartsAt(lines) {
  const i = lines.findIndex(l => l.startsWith("## "));
  return i < 0 ? 0 : i;
}

export function sweep(text, agents) {
  const byFirst = new Map(agents.map(a => [a.name.split(" ")[0], a]));
  const allRoles = [...new Set(agents.map(a => a.role))];
  const site = new RegExp(`\\b([A-Z][a-z]+)\\s+([A-Z][A-Za-z'’-]+?)\\s*—\\s*(${ROLE})`, "g");
  const found = [];
  const all = text.split("\n");
  const from = bodyStartsAt(all);
  all.forEach((line, i) => {
    if (i < from) return;                                          // exclusion 1b (provenance header)
    if (line.includes(DEFECT_QUOTE)) return;                       // exclusion 1
    let hit;
    site.lastIndex = 0;
    while ((hit = site.exec(line))) {
      const [whole, first, rawSurname, statedRole] = hit;
      const agent = byFirst.get(first);
      if (!agent) continue;
      if (hit.index + whole.length >= line.length) continue;       // exclusion 2 (line wrap)
      const surname = rawSurname.replace(/['’]s$/, "");
      const surnameWrong = surname !== agent.name.split(" ").slice(1).join(" ");
      const roleWrong = !isUnambiguousContraction(statedRole, agent.role, allRoles);
      if (surnameWrong || roleWrong) {
        found.push({
          line: i + 1,
          saw: `${first} ${surname} — ${statedRole}`,
          expected: `${agent.name} — ${agent.role}`,
        });
      }
    }
  });
  return found;
}

async function run() {
  const agents = roster(fs.readFileSync(AGENTS, "utf8"));
  assert.ok(agents.length >= 20,
    `SES-53: parsed only ${agents.length} agents from src/data/agents.js -- the roster shape ` +
    "changed and this sweep is reading nothing, which would pass vacuously");

  const nadia = agents.find(a => a.id === "nadia");
  assert.deepStrictEqual(
    nadia && { name: nadia.name, role: nadia.role },
    { name: "Nadia Farouk", role: "Data Expert" },
    "SES-53: the roster entry this ticket is written from moved -- re-check the corpus by hand " +
    "before editing this assertion, because the corrections below were made against it");

  // The sweep itself.
  for (const rel of CORPUS) {
    const drift = sweep(fs.readFileSync(path.join(ROOT, rel), "utf8"), agents);
    assert.deepStrictEqual(drift, [],
      `SES-53: ${rel} carries agent roster drift against src/data/agents.js:\n` +
      drift.map(d => `  ${rel}:${d.line}  saw "${d.saw}"  expected "${d.expected}"`).join("\n"));
  }

  // Negative control: the retired forms, by name. Same two exemptions as the sweep — a sentence
  // recording WHICH strings were retired must be allowed to name them.
  for (const rel of CORPUS) {
    const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").split("\n");
    const from = bodyStartsAt(lines);
    for (const bad of RETIRED) {
      const hits = lines
        .map((l, i) => ({ l, n: i + 1 }))
        .filter(x => x.n > from && x.l.includes(bad) && !x.l.includes(DEFECT_QUOTE));
      assert.strictEqual(hits.length, 0,
        `SES-53 retired-forms-are-gone: "${bad}" is back in ${rel} at line(s) ` +
        `${hits.map(h => h.n).join(", ")} -- v7.0.316 replaced it against src/data/agents.js`);
    }
  }

  // The exemption must still have something to exempt: if the defect quote disappears, this file's
  // exclusion (1) is silently guarding nothing and the next editor should know.
  const archive = fs.readFileSync(path.join(ROOT, CORPUS[1]), "utf8");
  assert.ok(archive.includes(DEFECT_QUOTE),
    "SES-53: the site that quotes the defect is gone from the archive. That sentence is the " +
    "record of the bug this ticket fixed; if it was deliberately removed, delete exclusion (1) " +
    "here in the same commit rather than leaving a dead exemption behind");

  // The contraction rule's own boundary, pinned with the case that decides it.
  const roles = agents.map(a => a.role);
  assert.ok(isUnambiguousContraction("Trainer", "Trainer Agent", roles),
    "SES-53: 'Trainer' must read as a contraction of 'Trainer Agent' -- no second agent answers " +
    "to it, so it misidentifies nobody");
  assert.ok(!isUnambiguousContraction("Procurement Analyst", "Professional Procurement Analyst", roles),
    "SES-53: 'Procurement Analyst' must NOT read as a safe contraction -- the roster also carries " +
    "Junior and Senior Procurement Analyst, so it is a role three people could answer to. This is " +
    "the case that makes the rule ambiguity rather than length");
  assert.ok(!isUnambiguousContraction("Data Analyst", "Data Expert", roles),
    "SES-53: 'Data Analyst' is a different role, not a contraction of 'Data Expert' -- this is " +
    "the original drift and the contraction rule must never swallow it");

  return true;
}

export default run;
selfRun(import.meta.url, run);
