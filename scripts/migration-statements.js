#!/usr/bin/env node
// DeepBench v7.0.1093 | scripts/migration-statements.js | AGT-764 -- names the statements the Supabase connector asks a human about, before a cycle sends them.
// Measured 2026-11-20 (docs/harvests/AGT-764.md): unattended cycles DO apply migrations -- 47 of the 91 applied since 2026-10-05 carry a down captured
// by one, and of the 41 with a mirror in docs/design 40 name nothing here (the 41st, agt610, a human answered). The 6 refused applies whose statements
// survive all LEAD with DROP, DELETE or TRUNCATE, at the top level or inside a DO block, and the connector's own tool text says "Destructive
// statements may require the user to confirm before they run". A MEASURED FENCE, NOT THE CONNECTOR'S RULE: exit 0 is no promise the connector stays
// silent. Not named, because each applied unattended: a keyword inside a function body (a definition, not a run), a string, a comment,
// `on delete cascade`, a grant list, `alter table ... drop ...`. Pure text in, list out: no credentials, no network, no write.
// Exit 0 = none named; 1 = at least one; 2 = usage or unreadable file.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const ASKED_LEADS = Object.freeze(["drop", "delete", "truncate"]);
export const DOWN_MARKER = /^--\s*down\s*$/i;
const DOLLAR = /(\$[A-Za-z_0-9]*\$)([\s\S]*?)\1/g;
const DO_BLOCK = /\bdo\s+(\$[A-Za-z_0-9]*\$)([\s\S]*?)\1/gi;

// The text a cycle sends: everything above a line that is exactly `-- down` (the mirror convention for a hand-kept undo).
export function upText(sql) {
  const lines = String(sql ?? "").split(/\r?\n/);
  const at = lines.findIndex(l => DOWN_MARKER.test(l.trim()));
  return (at === -1 ? lines : lines.slice(0, at)).join("\n");
}

// Blank out what cannot lead a statement: block comments, dollar-quoted bodies, line comments, single-quoted strings.
export function bareSql(sql) {
  return String(sql ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(DOLLAR, " $q$ ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, " 's' ");
}

function leads(text, splitter, where) {
  const out = [];
  text.split(splitter).forEach((raw, i) => {
    const s = raw.replace(/\s+/g, " ").trim();
    const lead = (s.split(" ")[0] || "").toLowerCase();
    if (ASKED_LEADS.includes(lead)) out.push({ n: i + 1, where, lead, text: s.slice(0, 160) });
  });
  return out;
}

export function askedStatements(sql) {
  const up = upText(sql).replace(/\/\*[\s\S]*?\*\//g, " ");
  const out = leads(bareSql(up), ";", "top");
  // A DO block's body RUNS when the migration is sent, so its statements are graded too.
  for (const m of up.matchAll(DO_BLOCK)) out.push(...leads(bareSql(m[2]), /;|\b(?:begin|then|else|loop)\b/i, "do"));
  return out;
}

function main(argv) {
  const f = (argv.find(a => a.startsWith("--file=")) || "").slice(7);
  if (!f) { console.error("usage: node scripts/migration-statements.js --file=<migration.sql>"); return 2; }
  let sql;
  try { sql = fs.readFileSync(f, "utf8"); } catch (e) { console.error(`unreadable: ${f} (${e.code})`); return 2; }
  const asked = askedStatements(sql);
  console.log(JSON.stringify({ file: f, asked: asked.length, statements: asked }, null, 1));
  if (asked.length) {
    console.error(`${asked.length} statement(s) lead with DROP, DELETE or TRUNCATE: the Supabase connector asks a human before running them. `
      + "Do NOT send this unattended and do NOT reword it past the question (CLAUDE.md SES-019). Use a real additive form where one exists "
      + "(create or replace trigger / function / view), else the ticket is attended-only: say so at design.");
  }
  return asked.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) process.exit(main(process.argv.slice(2)));
