// DeepBench v7.0.598 | tests/regression/agt-153-linkedin-alerts.test.mjs | AGT-153
//
// FEATURE: AGT-153 -- the career agent reads LinkedIn job-alert mail from the Yahoo inbox, READ-ONLY,
// 7 days back: lib/imap-readonly.js (a six-verb IMAP reader) and scripts/personal-agent.js
// --fetch-linkedin-alerts (card parsing, uid watermark, known-id dedupe).
//
// PARTS, matching the kickoff's Task 3:
//   (a) STATIC -- the lib's code lines carry none of the eight mutating / read-write verbs; control: a
//       copy with a read-write open spliced in fails. The agent name appears only on `//` lines of
//       the script.
//   (b) readMail against a FAKE localhost IMAP server that logs every command: every logged verb is
//       in ALLOWED, EXAMINE is there and the read-write open is not; the search line carries the
//       sender and SINCE now-7d; uidvalidity 7; UID 13 (9 days old) is dropped -> uids [11,12]. A
//       refused verb rejects IMAP_REFUSED_COMMAND and the server's log gains nothing.
//   (c) the fake answers LOGIN with NO (echoing the user) -> IMAP_AUTH_FAILED, the message holds
//       neither the user nor the password; exitCodeFor -> 3. A closed port -> IMAP_CONNECT_FAILED -> 3.
//   (d) parseAlertCards on UID 12 -> 2 cards; the known card's title/company/location parsed, the
//       "actively hiring" badge absent, urls exactly jobUrl(id). The HTML-only path finds the same ids.
//   (e) intakeFromMessages: watermark {7, 11} skips UID 11 and drops the known id -> [4000000002];
//       a changed uidvalidity (6) reads both -> [4000000001, 4000000002].
//   LIVE: none. Never Yahoo, never a runner_secrets value (AGT-156's first run proves the login).
//
// BASELINE (`node scripts/baseline-red-set.js --tests=tests/regression/agt-153-linkedin-alerts.test.mjs`,
// unchanged tree):
//   baseline-red-set: these paths do not exist, so no baseline was measured:
//       tests/regression/agt-153-linkedin-alerts.test.mjs
// New file: the whole file is the red set. On the unchanged tree lib/imap-readonly.js is absent, so
// every part throws on the import.
//
// FIXTURES ARE SYNTHETIC: recipient fixture@example.com, login fixture-user / fx-pw-1, job ids
// 4000000001..4. No real message, address or credential.

import assert from "assert";
import fs from "fs";
import net from "net";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { selfRun } from "./_lib/self-run.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIB_REL = "lib/imap-readonly.js";
const SCRIPT_REL = "scripts/personal-agent.js";
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const DAY = 24 * 3600 * 1000;
const USER = "fixture-user";
const PW = "fx-pw-1";
const SENDER = "jobalerts-noreply@linkedin.com";

const loadLib = () => import(pathToFileURL(path.join(ROOT, LIB_REL)).href);
const loadScript = () => import(pathToFileURL(path.join(ROOT, SCRIPT_REL)).href);

// --- synthetic alert mail ------------------------------------------------------------------------
function qp(str) {
  const out = [];
  for (const line of str.split("\n")) {
    let enc = "";
    for (const b of Buffer.from(line, "utf8")) {
      enc += (b >= 33 && b <= 126 && b !== 61) || b === 32 ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    const wrapped = [];
    while (enc.length > 70) {
      let cut = 70;
      while (/=[0-9A-F]?$/.test(enc.slice(0, cut))) cut -= 1;   // never split an =XX escape
      wrapped.push(enc.slice(0, cut) + "=");
      enc = enc.slice(cut);
    }
    wrapped.push(enc);
    out.push(...wrapped);
  }
  return out.join("\r\n");
}

const CARDS = {
  "4000000001": { title: "Senior Product Manager, Platform", company: "Fixture Co One", location: "Chicago, IL (Remote)" },
  "4000000002": { title: "Director of Product Management", company: "Fixture Co Two", location: "Zürich, Switzerland" },
  "4000000003": { title: "Group Product Manager", company: "Fixture Co Three", location: "Austin, TX" },
  "4000000004": { title: "VP Product", company: "Fixture Co Four", location: "Denver, CO" },
};
const trackUrl = id => `https://www.linkedin.com/comm/jobs/view/${id}/?trackingId=Zm9vYmFyYmF6%3D%3D&refId=fixture-${id}&lipi=urn%3Ali%3Apage%3Aemail_jobs`;

function alertMessage({ uid, daysAgo, ids, badgeOn = null }) {
  const date = new Date(Date.now() - daysAgo * DAY).toUTCString().replace("GMT", "+0000");
  const text = ["Your job alert for product manager", "--------------------------------------------", ""];
  const html = ["<html><body><h2>Your job alert for product manager</h2><table>"];
  for (const id of ids) {
    const c = CARDS[id];
    text.push(c.title, c.company, c.location);
    if (id === badgeOn) text.push("This company is actively hiring");
    text.push(`View job: ${trackUrl(id)}`, "", "--------------------------------------------", "");
    html.push(`<tr><td><a href="${trackUrl(id)}">${c.title}</a><p>${c.company}</p><p>${c.location}</p>` +
      (id === badgeOn ? "<p>This company is actively hiring</p>" : "") + "</td></tr>");
  }
  html.push("</table></body></html>");
  const b = `----=_Part_${uid}_fixture`;
  return [
    `From: LinkedIn Job Alerts <${SENDER}>`,
    "To: fixture@example.com",
    `Subject: New jobs — product manager (${uid})`,
    `Date: ${date}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative;`,
    `\tboundary="${b}"`,
    "",
    `--${b}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    qp(text.join("\n")),
    `--${b}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: quoted-printable",
    "",
    qp(html.join("\n")),
    `--${b}--`,
    "",
  ].join("\r\n");
}

const FIXTURE = [
  { uid: 11, daysAgo: 2, raw: alertMessage({ uid: 11, daysAgo: 2, ids: ["4000000001", "4000000002"] }) },
  { uid: 12, daysAgo: 6, raw: alertMessage({ uid: 12, daysAgo: 6, ids: ["4000000002", "4000000003"], badgeOn: "4000000002" }) },
  { uid: 13, daysAgo: 9, raw: alertMessage({ uid: 13, daysAgo: 9, ids: ["4000000004"] }) },
];

// --- the fake IMAP server: 127.0.0.1:0, logs every command line ----------------------------------
function fakeImap({ authFail = false } = {}) {
  const log = [];
  const server = net.createServer(sock => {
    let buf = "";
    sock.write("* OK [CAPABILITY IMAP4rev1] fake ready\r\n");
    sock.on("data", d => {
      buf += d.toString("latin1");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        log.push(line);
        const [tag, ...rest] = line.split(" ");
        const verb = /^UID$/i.test(rest[0]) ? `${rest[0]} ${rest[1]}`.toUpperCase() : String(rest[0]).toUpperCase();
        if (verb === "LOGIN") {
          sock.write(authFail ? `${tag} NO [AUTHENTICATIONFAILED] LOGIN failed for ${USER}\r\n` : `${tag} OK LOGIN completed\r\n`);
        } else if (verb === "EXAMINE") {
          sock.write(`* 3 EXISTS\r\n* OK [UIDVALIDITY 7] UIDs valid\r\n${tag} OK [READ-ONLY] EXAMINE completed\r\n`);
        } else if (verb === "UID SEARCH") {
          sock.write(`* SEARCH 11 12 13\r\n${tag} OK SEARCH completed\r\n`);
        } else if (verb === "UID FETCH") {
          const wanted = rest[2].split(",").map(Number);
          const chunks = [];
          FIXTURE.filter(m => wanted.includes(m.uid)).forEach((m, k) => {
            const bytes = Buffer.from(m.raw, "utf8");
            const internal = new Date(Date.now() - m.daysAgo * DAY);
            const idate = `${String(internal.getUTCDate()).padStart(2, "0")}-${internal.toUTCString().slice(8, 11)}-${internal.getUTCFullYear()} 10:00:00 +0000`;
            chunks.push(Buffer.from(`* ${k + 1} FETCH (UID ${m.uid} INTERNALDATE "${idate}" BODY[] {${bytes.length}}\r\n`, "latin1"), bytes, Buffer.from(")\r\n"));
          });
          chunks.push(Buffer.from(`${tag} OK FETCH completed\r\n`));
          const all = Buffer.concat(chunks);
          const mid = Math.floor(all.length / 2);          // split mid-literal: the reader must buffer
          sock.write(all.subarray(0, mid));
          setTimeout(() => sock.write(all.subarray(mid)), 20);
        } else if (verb === "LOGOUT") {
          sock.write(`* BYE fake logging out\r\n${tag} OK LOGOUT completed\r\n`);
          sock.end();
        } else {
          sock.write(`${tag} BAD unknown command\r\n`);
        }
      }
    });
    sock.on("error", () => {});
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    resolve({ port, log, connect: () => net.connect(port, "127.0.0.1"), close: () => new Promise(r => server.close(r)) });
  }));
}

const verbOf = line => {
  const parts = line.split(" ");
  return /^UID$/i.test(parts[1]) ? `${parts[1]} ${parts[2]}`.toUpperCase() : String(parts[1]).toUpperCase();
};

// ---------------------------------------------------------------------------------------------
// (a) STATIC
// ---------------------------------------------------------------------------------------------
const MUTATING = /\b(STORE|COPY|MOVE|EXPUNGE|APPEND|DELETE|CREATE|SELECT)\b/;
const codeLines = src => src.split("\n").filter(l => !l.trim().startsWith("//"));
const libIsReadOnly = src => codeLines(src).every(l => !MUTATING.test(l));
const nameOnlyInComments = src => src.split("\n").every(l => !/\bjerry\b/.test(l) || l.trim().startsWith("//"));

function partA() {
  const lib = read(LIB_REL);
  assert.ok(libIsReadOnly(lib), `${LIB_REL} carries a mutating verb on a code line: ${codeLines(lib).filter(l => MUTATING.test(l)).join(" | ")}`);
  const spliced = lib.replace("export const ALLOWED", "const box = 'SELECT INBOX';\nexport const ALLOWED");
  assert.notStrictEqual(spliced, lib, "control setup failed: `export const ALLOWED` not found verbatim");
  assert.ok(!libIsReadOnly(spliced), "control: a copy with SELECT INBOX spliced in still passes -- the verb check does not discriminate");
  const script = read(SCRIPT_REL);
  assert.ok(nameOnlyInComments(script), `${SCRIPT_REL} names the agent outside a // line`);
  return ["lib-has-no-mutating-verb", "control-spliced-select-fails", "agent-name-only-in-comments"];
}

// ---------------------------------------------------------------------------------------------
// (b) readMail against the fake
// ---------------------------------------------------------------------------------------------
async function partB(ctx) {
  const { readMail, openImap, ALLOWED, imapDate } = await loadLib();
  const fake = await fakeImap();
  try {
    const box = await readMail({ host: "127.0.0.1", port: fake.port, user: USER, password: PW, from: SENDER, connect: fake.connect });
    const verbs = fake.log.map(verbOf);
    for (const v of verbs) assert.ok(ALLOWED.includes(v), `a logged verb is outside ALLOWED: ${v}`);
    assert.ok(verbs.includes("EXAMINE"), `EXAMINE never sent: ${verbs.join(",")}`);
    assert.ok(!fake.log.some(l => /\bSELECT\b/i.test(l)), "the read-write open reached the server");
    const search = fake.log.find(l => verbOf(l) === "UID SEARCH");
    const want = `FROM "${SENDER}" SINCE ${imapDate(Date.now() - 7 * DAY)}`;
    assert.ok(search && search.endsWith(want), `search line ${JSON.stringify(search)} does not end with ${JSON.stringify(want)}`);
    const fetchLine = fake.log.find(l => verbOf(l) === "UID FETCH");
    assert.ok(/BODY\.PEEK\[\]/.test(fetchLine), `fetch is not a PEEK: ${fetchLine}`);
    assert.strictEqual(box.uidvalidity, 7, `uidvalidity ${box.uidvalidity}`);
    assert.deepStrictEqual(box.messages.map(m => m.uid), [11, 12], `uids ${JSON.stringify(box.messages.map(m => m.uid))} -- UID 13 (9 days) must be dropped`);
    assert.ok(box.messages[0].subject.includes("—"), `subject not decoded as UTF-8: ${box.messages[0].subject}`);
    ctx.messages = box.messages;

    const client = await openImap({ host: "127.0.0.1", port: fake.port, connect: fake.connect });
    const before = fake.log.length;
    await assert.rejects(client.send("SELECT INBOX"), e => e.code === "IMAP_REFUSED_COMMAND");
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(fake.log.length, before, `the refused verb reached the server: ${fake.log.slice(before).join(" | ")}`);
    await client.send("LOGOUT");
    client.close();
  } finally {
    await fake.close();
  }
  return ["verbs-within-allowed", "examine-not-select", "search-from-since-7d", "uidvalidity-7", "uid-13-dropped", "refused-verb-sends-nothing"];
}

// ---------------------------------------------------------------------------------------------
// (c) auth NO and a dead port
// ---------------------------------------------------------------------------------------------
async function partC() {
  const { readMail } = await loadLib();
  const { exitCodeFor, YAHOO_FAIL } = await loadScript();
  const fake = await fakeImap({ authFail: true });
  let err = null;
  try {
    await readMail({ host: "127.0.0.1", port: fake.port, user: USER, password: PW, from: SENDER, connect: fake.connect });
  } catch (e) { err = e; } finally { await fake.close(); }
  assert.ok(err, "readMail resolved despite LOGIN NO");
  assert.strictEqual(err.code, "IMAP_AUTH_FAILED", `code ${err.code}: ${err.message}`);
  assert.ok(/AUTHENTICATIONFAILED/.test(err.message) && err.message.includes("[redacted]"), `the server's echo was not carried redacted: ${err.message}`);
  assert.ok(!err.message.includes(USER) && !err.message.includes(PW), "a credential leaked into the error message");
  assert.strictEqual(exitCodeFor(err), 3);
  assert.strictEqual(YAHOO_FAIL, "Yahoo connection failed - recreate the app password");

  const dead = net.createServer();
  const port = await new Promise(r => dead.listen(0, "127.0.0.1", () => r(dead.address().port)));
  await new Promise(r => dead.close(r));
  let cerr = null;
  try {
    await readMail({ host: "127.0.0.1", port, user: USER, password: PW, from: SENDER, connect: () => net.connect(port, "127.0.0.1") });
  } catch (e) { cerr = e; }
  assert.ok(cerr && cerr.code === "IMAP_CONNECT_FAILED", `closed port gave ${cerr && cerr.code}`);
  assert.strictEqual(exitCodeFor(cerr), 3);
  assert.strictEqual(exitCodeFor(Object.assign(new Error("x"), { code: "IMAP_REFUSED_COMMAND" })), 2);
  return ["auth-no-maps-auth-failed", "no-credential-in-error", "exit-3", "dead-port-connect-failed"];
}

// ---------------------------------------------------------------------------------------------
// (d) parseAlertCards on UID 12
// ---------------------------------------------------------------------------------------------
async function partD(ctx) {
  const { parseAlertCards, jobUrl, parseArgs } = await loadScript();
  const m12 = ctx.messages.find(m => m.uid === 12);
  const cards = parseAlertCards(m12);
  assert.deepStrictEqual(cards.map(c => c.job_id), ["4000000002", "4000000003"], `UID 12 cards ${JSON.stringify(cards)}`);
  const two = cards[0];
  assert.deepStrictEqual({ title: two.title, company: two.company, location: two.location }, CARDS["4000000002"],
    `4000000002 parsed as ${JSON.stringify(two)}`);
  for (const c of cards) {
    assert.ok(![c.title, c.company, c.location].some(v => /actively/i.test(String(v))), `the badge became a field: ${JSON.stringify(c)}`);
    assert.strictEqual(c.url, jobUrl(c.job_id));
    assert.strictEqual(c.url, `https://www.linkedin.com/jobs/view/${c.job_id}/`);
  }
  const fromHtml = parseAlertCards({ text: null, html: m12.html });
  assert.deepStrictEqual(fromHtml.map(c => c.job_id), ["4000000002", "4000000003"], `HTML path ${JSON.stringify(fromHtml)}`);
  assert.strictEqual(fromHtml[0].title, CARDS["4000000002"].title);

  assert.ok(parseArgs(["--fetch-linkedin-alerts", "--agent=a"]).error, "--out not required");
  assert.strictEqual(parseArgs(["--fetch-linkedin-alerts", "--agent=a", "--out=x.json", "--days=3"]).days, 7, "--days below 7 not raised to 7");
  return ["uid12-two-cards", "fields-parsed", "badge-dropped", "canonical-urls", "html-fallback", "args"];
}

// ---------------------------------------------------------------------------------------------
// (e) intakeFromMessages: watermark and known-id dedupe
// ---------------------------------------------------------------------------------------------
async function partE(ctx) {
  const { intakeFromMessages } = await loadScript();
  const known = new Set(["4000000003"]);
  const a = intakeFromMessages(ctx.messages, { knownJobIds: known, watermark: { uidvalidity: 7, last_uid: 11 }, uidvalidity: 7 });
  assert.deepStrictEqual(a.cards.map(c => c.job_id), ["4000000002"], `watermarked intake ${JSON.stringify(a)}`);
  assert.strictEqual(a.skipped_uid, 1);
  assert.strictEqual(a.known, 1);
  assert.strictEqual(a.last_uid, 12);
  assert.strictEqual(a.cards[0].message_uid, 12);
  const b = intakeFromMessages(ctx.messages, { knownJobIds: known, watermark: { uidvalidity: 6, last_uid: 11 }, uidvalidity: 7 });
  assert.deepStrictEqual(b.cards.map(c => c.job_id), ["4000000001", "4000000002"], `new-uidvalidity intake ${JSON.stringify(b)}`);
  assert.strictEqual(b.skipped_uid, 0);
  return ["watermark-skips-uid-11", "known-id-dropped", "uidvalidity-change-rereads"];
}

async function run() {
  const ctx = {};
  const results = [];
  results.push(...partA());
  results.push(...(await partB(ctx)));
  results.push(...(await partC()));
  results.push(...(await partD(ctx)));
  results.push(...(await partE(ctx)));
  return results;
}

selfRun(import.meta.url, run);
export default run;
