// DeepBench v7.0.598 | lib/imap-readonly.js | AGT-153 -- a read-only IMAP reader over node:tls.
// Kickoff: docs/kickoffs/v7.0.598-AGT-153-linkedin-alerts-intake.md (Task 1).
//
// WHY HAND-ROLLED AND NOT A PACKAGE. The ticket's cap is "no new dependency" (harvest §2), and the
// job is six commands: log in, open the mailbox read-only, search by sender and date, fetch, log out.
// node:tls plus a literal-aware line reader covers that without pulling a mail client into a public
// repo's dependency tree.
//
// READ-ONLY BY CONSTRUCTION, NOT BY CARE. send() refuses any verb outside ALLOWED before a byte is
// written (IMAP_REFUSED_COMMAND). The mailbox is opened with EXAMINE -- the read-only open -- and the
// body is fetched with BODY.PEEK[], which does not set the \Seen flag. No flag write, no message move,
// no expunge can be expressed through this module. The regression guard
// (tests/regression/agt-153-linkedin-alerts.test.mjs part a) greps the code lines of this file for
// the eight mutating or read-write verbs: STORE, COPY, MOVE, EXPUNGE, APPEND, DELETE, CREATE and the
// read-write open SELECT. They may appear only on `//` lines like these.
//
// CREDENTIALS NEVER LEAVE. The user and password go onto the wire inside LOGIN and nowhere else:
// every error message passes redact(), which replaces both (raw and quoted-escaped) with
// [redacted], so a server that echoes the user back into its NO line cannot leak it into a log.
//
// ERRORS carry `code`:
//   IMAP_CONNECT_FAILED  -- socket/TLS error, timeout, a BYE greeting, or the server hung up.
//   IMAP_AUTH_FAILED     -- LOGIN answered NO or BAD.
//   IMAP_REFUSED_COMMAND -- a verb outside ALLOWED (refused locally, nothing sent), or the server
//                           answered NO/BAD to a command after login.

import tls from 'node:tls';

export const ALLOWED = ['CAPABILITY', 'LOGIN', 'EXAMINE', 'UID SEARCH', 'UID FETCH', 'LOGOUT'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 3600 * 1000;
const TIMEOUT_MS = 60000;

// IMAP's search date: DD-Mon-YYYY, taken in UTC.
export function imapDate(d) {
  const x = new Date(d);
  return `${String(x.getUTCDate()).padStart(2, '0')}-${MONTHS[x.getUTCMonth()]}-${x.getUTCFullYear()}`;
}

const quote = s => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function redact(text, secrets) {
  let out = String(text ?? '');
  for (const s of secrets || []) {
    if (!s) continue;
    for (const form of new Set([String(s), quote(s).slice(1, -1)])) {
      out = out.split(form).join('[redacted]');
    }
  }
  return out;
}

function imapError(code, message, secrets) {
  const e = new Error(redact(message, secrets));
  e.code = code;
  return e;
}

// --- the response reader: CRLF lines with {n} literals read byte-exact ---------------------------
function makeReader(socket) {
  let buf = Buffer.alloc(0);
  const ready = [];
  const waiters = [];
  let ended = null;

  function parseOne() {
    let pos = 0;
    const segments = [];
    const literals = [];
    for (;;) {
      const idx = buf.indexOf('\r\n', pos);
      if (idx < 0) return null;
      const line = buf.subarray(pos, idx).toString('latin1');
      const m = /\{(\d+)\}$/.exec(line);
      if (!m) {
        segments.push(line);
        buf = buf.subarray(idx + 2);
        return { text: segments.join(' '), literals };
      }
      const n = Number(m[1]);
      if (buf.length < idx + 2 + n) return null;
      segments.push(line);
      literals.push(Buffer.from(buf.subarray(idx + 2, idx + 2 + n)));
      pos = idx + 2 + n;
    }
  }

  function pump() {
    for (let r = parseOne(); r; r = parseOne()) ready.push(r);
    while (waiters.length && ready.length) waiters.shift().resolve(ready.shift());
    if (ended) while (waiters.length) waiters.shift().reject(ended);
  }

  socket.on('data', d => { buf = Buffer.concat([buf, d]); pump(); });
  socket.on('error', e => { ended = ended || e; pump(); });
  socket.on('close', () => { ended = ended || new Error('the server closed the connection'); pump(); });

  return {
    next() {
      return new Promise((resolve, reject) => { waiters.push({ resolve, reject }); pump(); });
    },
  };
}

// --- one session: greeting, then tagged commands through the allow-list --------------------------
// Exported for the regression guard, which proves a refused verb writes nothing. readMail is the
// production caller.
export async function openImap({ host, port = 993, connect, secrets = [] }) {
  const socket = connect ? connect({ host, port, servername: host }) : tls.connect({ host, port, servername: host });
  socket.setTimeout?.(TIMEOUT_MS, () => socket.destroy(new Error(`no answer from the server in ${TIMEOUT_MS / 1000}s`)));
  const reader = makeReader(socket);
  let n = 0;

  const next = async () => {
    try { return await reader.next(); } catch (e) {
      throw imapError('IMAP_CONNECT_FAILED', `IMAP connection to ${host}:${port} failed: ${e.message}`, secrets);
    }
  };

  const greeting = await next().catch(e => { socket.destroy(); throw e; });
  if (/^\* BYE\b/i.test(greeting.text)) {
    socket.destroy();
    throw imapError('IMAP_CONNECT_FAILED', `IMAP server refused the connection: ${greeting.text}`, secrets);
  }

  async function send(verb, args = '') {
    if (!ALLOWED.includes(verb)) {
      throw imapError('IMAP_REFUSED_COMMAND', `refused IMAP command "${verb}" -- only ${ALLOWED.join(', ')} are allowed`, secrets);
    }
    const tag = `A${++n}`;
    socket.write(`${tag} ${verb}${args ? ` ${args}` : ''}\r\n`);
    const untagged = [];
    for (;;) {
      const r = await next();
      if (r.text.startsWith(`${tag} `)) {
        const status = (r.text.slice(tag.length + 1).split(' ')[0] || '').toUpperCase();
        return { status, text: r.text, untagged };
      }
      if (!r.text.startsWith('+')) untagged.push(r);
    }
  }

  function close() {
    socket.end();
    socket.destroy();
  }

  return { send, close, greeting: greeting.text };
}

// --- MIME decoding --------------------------------------------------------------------------------
function decodeBytes(bytes, charset) {
  const label = String(charset || 'utf-8').trim().toLowerCase();
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function decodeQP(str) {
  const soft = str.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < soft.length; i++) {
    const c = soft[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
      bytes.push(parseInt(soft.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(soft.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

// RFC 2047 encoded words in a header value (=?charset?B|Q?text?=).
function decodeWords(value) {
  return String(value).replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=(\s+(?==\?))?/g, (_, cs, enc, txt) => {
    const bytes = enc.toUpperCase() === 'B'
      ? Buffer.from(txt, 'base64')
      : decodeQP(txt.replace(/_/g, ' '));
    return decodeBytes(bytes, cs);
  });
}

// Header text is carried as latin1 (one char per byte); re-read raw 8-bit bytes as UTF-8.
function headerText(value) {
  const bytes = Buffer.from(value, 'latin1');
  return decodeWords(/[\x80-\xff]/.test(value) ? decodeBytes(bytes, 'utf-8') : value);
}

function splitHead(bin) {
  const m = /\r?\n\r?\n/.exec(bin);
  if (!m) return { head: bin, body: '' };
  return { head: bin.slice(0, m.index), body: bin.slice(m.index + m[0].length) };
}

function parseHeaders(head) {
  const unfolded = head.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    if (!(name in headers)) headers[name] = line.slice(i + 1).trim();
  }
  return headers;
}

function param(value, name) {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, 'i').exec(value || '');
  return m ? (m[1] ?? m[2]) : null;
}

function walk(bin, found) {
  const { head, body } = splitHead(bin);
  const headers = parseHeaders(head);
  const ctype = headers['content-type'] || 'text/plain';
  const type = ctype.split(';')[0].trim().toLowerCase();
  if (type.startsWith('multipart/')) {
    const boundary = param(ctype, 'boundary');
    if (!boundary) return headers;
    const delim = `--${boundary}`;
    const pieces = body.split(delim);
    for (const piece of pieces.slice(1)) {
      if (piece.startsWith('--')) break;
      walk(piece.replace(/^[ \t]*\r?\n/, '').replace(/\r?\n$/, ''), found);
    }
    return headers;
  }
  if (type !== 'text/plain' && type !== 'text/html') return headers;
  const key = type === 'text/plain' ? 'text' : 'html';
  if (found[key] !== null) return headers;
  const cte = String(headers['content-transfer-encoding'] || '7bit').trim().toLowerCase();
  let bytes;
  if (cte === 'quoted-printable') bytes = decodeQP(body);
  else if (cte === 'base64') bytes = Buffer.from(body.replace(/\s+/g, ''), 'base64');
  else bytes = Buffer.from(body, 'latin1');
  found[key] = decodeBytes(bytes, param(ctype, 'charset'));
  return headers;
}

// One raw RFC 822 message (Buffer or string) -> its sender, subject, date and first text/html parts.
export function decodeMessage(raw) {
  const bin = Buffer.isBuffer(raw) ? raw.toString('latin1') : Buffer.from(String(raw), 'utf8').toString('latin1');
  const found = { text: null, html: null };
  const headers = walk(bin, found);
  const date = headers.date ? new Date(headers.date) : null;
  return {
    from: headers.from ? headerText(headers.from) : null,
    subject: headers.subject ? headerText(headers.subject) : null,
    date: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    text: found.text,
    html: found.html,
  };
}

function internalDate(s) {
  if (!s) return null;
  const d = new Date(s.replace(/^(\s?\d{1,2})-([A-Za-z]{3})-(\d{4})/, '$1 $2 $3'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- the one production entry: read a sender's mail from the last N days --------------------------
export async function readMail({
  host, port = 993, user, password, mailbox = 'INBOX', from, sinceDays = 7, headersOnly = false, connect,
} = {}) {
  const secrets = [user, password];
  const client = await openImap({ host, port, connect, secrets });
  try {
    const login = await client.send('LOGIN', `${quote(user)} ${quote(password)}`);
    if (login.status !== 'OK') throw imapError('IMAP_AUTH_FAILED', `IMAP login refused: ${login.text}`, secrets);

    const need = (r, what) => {
      if (r.status !== 'OK') throw imapError('IMAP_REFUSED_COMMAND', `IMAP ${what} answered: ${r.text}`, secrets);
      return r;
    };

    const box = /^[A-Za-z0-9._/-]+$/.test(mailbox) ? mailbox : quote(mailbox);
    const opened = need(await client.send('EXAMINE', box), 'EXAMINE');
    let uidvalidity = null;
    for (const line of [...opened.untagged.map(u => u.text), opened.text]) {
      const m = /\[UIDVALIDITY (\d+)\]/i.exec(line);
      if (m) { uidvalidity = Number(m[1]); break; }
    }

    const cutoff = Date.now() - sinceDays * DAY_MS;
    const search = need(await client.send('UID SEARCH', `FROM ${quote(from)} SINCE ${imapDate(cutoff)}`), 'UID SEARCH');
    const uids = [];
    for (const u of search.untagged) {
      const m = /^\* SEARCH\b(.*)$/i.exec(u.text);
      if (m) uids.push(...m[1].trim().split(/\s+/).filter(Boolean).map(Number));
    }

    const messages = [];
    if (uids.length) {
      const item = headersOnly ? 'BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)]' : 'BODY.PEEK[]';
      const fetched = need(await client.send('UID FETCH', `${uids.join(',')} (UID INTERNALDATE ${item})`), 'UID FETCH');
      for (const r of fetched.untagged) {
        if (!/^\* \d+ FETCH\b/i.test(r.text) || !r.literals.length) continue;
        const uid = Number((/\bUID (\d+)/i.exec(r.text) || [])[1]);
        const internal = internalDate((/INTERNALDATE "([^"]+)"/i.exec(r.text) || [])[1]);
        const msg = decodeMessage(r.literals[0]);
        const when = msg.date ? new Date(msg.date) : internal;
        if (when && when.getTime() < cutoff) continue;
        messages.push({
          uid, date: when ? when.toISOString() : null, from: msg.from, subject: msg.subject, text: msg.text, html: msg.html,
        });
      }
    }

    await client.send('LOGOUT').catch(() => {});
    return { uidvalidity, messages: messages.sort((a, b) => a.uid - b.uid) };
  } finally {
    client.close();
  }
}
