// DeepBench v7.0.39 | lib/request-context.js | LOG-121 -- `ui` now means a real browser: a fourth
// legal source `script` is the default when no browser signal is present
// FEATURE: LOG-121 (part b, Task 1) -- part `a` defaulted to `ui` whenever no automation header was
// sent, which silently labelled every script as a human. Measured on the first hour of live data:
// 283 of 333 calls (79.3% of cost) were scripts wearing the `ui` label; only 48 came from an actual
// browser. The By Platform User drawer's headline number is exactly "him vs. Claude vs. the public,"
// so shipping the drawer on that default would make it wrong in its single most important cell --
// and per ARCHITECTURE.md §19i there is no backfill, so every hour it stayed wrong was permanently
// mislabelled history. The browser test deliberately does NOT read the User-Agent: it is trivially
// spoofed, and this session's own predecessor sent a desktop Chrome UA from a Node script, which any
// UA-based rule would have classified as a browser. The Sec-Fetch-* / Sec-CH-UA family (plus a
// same-host origin/referer) is sent by real browsers and by nothing else; `curl`, Node `fetch` and
// this repo's own scripts send none of it. Device detection below is a different question and is
// untouched -- it still reads client hints and the UA, because "what kind of machine" tolerates a
// spoof that "is this a human" does not.
// FEATURE: LOG-121 -- The AI Audit could say what the platform did but not who set it off: John's
// CHI clicking, a regression run and Claude's live QA all landed in one undifferentiated pile, and
// an outside visitor was invisible entirely. Two cheaper mechanisms were measured and rejected in
// the design session: a per-call-site parameter (45 call sites across 15 files, lib/librarian.js
// alone holds 25) and logging once per request joined by trace_id (58.3% of the last 30 days' rows
// carry no trace_id, across every ai_type). The writer in lib/activity-log.js, however, produced
// 27,948 of 27,948 rows in that window -- a genuine single choke point -- so a request-scoped
// context read *inside* it covers 100% of traffic with zero call-site edits. AsyncLocalStorage is
// Node's standard mechanism for exactly this and all 12 routes are already runtime: "nodejs".
//
// NOTHING IN THIS FILE MAY THROW, REJECT, OR BLOCK A REQUEST. Attribution is observability; it may
// never become a failure mode for the platform. A missing or malformed cookie header, an absent
// User-Agent, an absent x-forwarded-for and a client that refuses cookies must all degrade to null
// fields and a normally-served response.
//
// Never call the activity logger from this file -- this module is read *from* the logging path, so
// a logging call here is infinite recursion.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const als = new AsyncLocalStorage();

// An unrecognized value lands as unattributed (null), never silently coerced to 'ui' -- otherwise a
// typo'd or spoofed header would quietly inflate the human-traffic number the drawer reports.
// FEATURE: LOG-121b -- 'script' joins the allowlist as the inferred default (see the file header).
const ALLOWED_CALL_SOURCES = new Set(['ui', 'script', 'regression', 'session-test']);

const VISITOR_COOKIE = 'db_visitor';
const VISITOR_COOKIE_MAX_AGE = 63072000; // 2 years, in seconds

// FEATURE: LOG-121b -- the fetch-metadata headers every current browser attaches to a same-origin
// request, plus the low-entropy client-hint brand header. A plain HTTP client sends none of them
// unless it is deliberately imitating a browser header-for-header, which is a far higher bar than
// copying one string. Read as presence-only: the VALUES are never trusted for anything.
const BROWSER_SIGNAL_HEADERS = ['sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-ch-ua'];

function hasBrowserSignal(headers) {
  for (const h of BROWSER_SIGNAL_HEADERS) if (headers[h]) return true;
  // Second signal: an Origin/Referer whose host is OUR host. A foreign origin is somebody else's
  // page and must not count -- it says nothing about whether this request came from a browser we
  // served. Malformed values parse-fail into "no signal" rather than throwing.
  const host = headers.host ? String(headers.host) : null;
  if (!host) return false;
  for (const key of ['origin', 'referer']) {
    const raw = headers[key];
    if (!raw) continue;
    try {
      if (new URL(String(raw)).host === host) return true;
    } catch {
      // not a parseable absolute URL -- no signal, never an exception
    }
  }
  return false;
}

function deriveCallSource(headers) {
  const raw = headers['x-db-call-source'];
  // An explicit allowlisted header always wins over inference (the regression driver's own tag).
  if (raw === undefined) return hasBrowserSignal(headers) ? 'ui' : 'script';
  return ALLOWED_CALL_SOURCES.has(raw) ? raw : null;
}

function deriveCallerIp(headers) {
  const xff = headers['x-forwarded-for'];
  if (!xff) return null;
  const first = String(xff).split(',')[0].trim();
  return first || null;
}

// Do NOT reuse src/hooks/useIsMobile.js despite the name match: that is a 768px viewport media
// query, so a narrowed desktop window reports mobile there. Different question, different answer --
// the two are expected to disagree and must not be wired together.
function deriveDeviceType(headers) {
  const ch = headers['sec-ch-ua-mobile'];
  if (ch === '?1') return 'mobile';
  if (ch === '?0') return 'desktop';
  const ua = headers['user-agent'];
  if (!ua) return null;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
}

function readCookie(cookieHeader, name) {
  // An absent Cookie header is `undefined` and must read as null, never an exception.
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1) || null;
  }
  return null;
}

// Set on the response *before* the wrapped handler runs -- several routes stream SSE, and a header
// set after the response has begun is silently dropped.
function mintVisitorCookie(res) {
  try {
    if (!res || typeof res.setHeader !== 'function' || res.headersSent) return;
    const cookie = `${VISITOR_COOKIE}=${randomUUID()}; Path=/; Max-Age=${VISITOR_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
    const existing = typeof res.getHeader === 'function' ? res.getHeader('Set-Cookie') : undefined;
    if (existing === undefined || existing === null) res.setHeader('Set-Cookie', cookie);
    else res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
  } catch {
    // Cookie acceptance is not observable server-side anyway: set the header, move on.
  }
}

function derive(req, res) {
  try {
    const headers = (req && req.headers) || {};
    const callSource = deriveCallSource(headers);
    const sentVisitorId = readCookie(headers.cookie, VISITOR_COOKIE);

    // Mint for 'ui' only. Node's fetch does not persist cookies, so minting for a regression or
    // session-test caller would burn a fresh useless UUID on every single request.
    // FEATURE: LOG-121b -- unchanged gate, strictly better behaviour now that 'ui' means a genuine
    // browser: before Task 1 every unheadered script matched this branch and minted a cookie it
    // could never return, so the mint path ran for the ~79% of traffic that could not use it.
    if (callSource === 'ui' && !sentVisitorId) mintVisitorCookie(res);

    return {
      callSource,
      callerIp: deriveCallerIp(headers),
      deviceType: deriveDeviceType(headers),
      // A MINTED ID IS NOT LOGGED ON THE REQUEST THAT MINTS IT. Only an id the browser actually
      // sent back is written, so `visitor_id IS NULL` means exactly one thing: this browser has not
      // demonstrably stored an identity. Two consequences, both intended:
      //   - Cookie accepted (normal): request 1 mints, sets, and logs NULL; requests 2..N carry the
      //     cookie and log the real id. Cost is one unattributed row per new visitor. Acceptable.
      //   - Cookie rejected/blocked: every request mints, sets, is ignored, and logs NULL -- that
      //     visitor collapses into one honest "no visitor id" bucket, grouped by IP at read time.
      // Writing the minted id instead would render a single cookie-blocking visitor as one distinct
      // platform user per request -- the By Platform User drawer's central number, silently and
      // unfalsifiably wrong.
      visitorId: sentVisitorId,
      requestHost: headers.host || null,
    };
  } catch {
    // Degrade to no attribution rather than failing the request.
    return {};
  }
}

/** Wraps a route handler so everything it awaits can read the caller's attribution. */
export function withRequestContext(handler) {
  return (req, res) => als.run(derive(req, res), () => handler(req, res));
}

/** The current store, or {} off-request (in-process lib/ callers, tests). Never throws. */
export function getRequestContext() {
  try {
    return als.getStore() || {};
  } catch {
    return {};
  }
}

/**
 * Lets an in-process caller -- a Category L session test importing lib/ directly, which never makes
 * an HTTP request -- establish a context without a `req`. Allowlisted like the header path so
 * call_source can only ever hold one of the three known values or NULL.
 */
export function runWithCallSource(source, fn) {
  return als.run({ callSource: ALLOWED_CALL_SOURCES.has(source) ? source : null }, fn);
}
