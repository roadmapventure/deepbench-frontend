// DeepBench v7.0.77 | gate-intercept.js | HAR-33
// FEATURE: HAR-33 (part b) — global fetch interceptor for the edge access gate.
//
// The gate (middleware.js, part a, v7.0.76) refuses a model-triggering /api/* call with
// HTTP 403 and body { deepbench_gate: true, reason, ip, stats? }. This module notices that
// exact shape anywhere in the app and hands it to whoever subscribed — AccessGateModal.jsx
// is the only subscriber today.
//
// INVARIANT — this wrapper is observation-only. Every caller receives the *original*
// Response object, unread and unaltered, so each screen's existing error handling for a
// failed fetch keeps working exactly as before. The body is inspected through a clone; the
// original stream is never consumed. Nothing in here may throw: a malformed body, a
// non-JSON 403, an opaque response, or a badly-behaved listener must all leave the fetch
// chain untouched. A rejected fetch (network error) propagates unchanged — it is never
// swallowed, and never inspected.

const listeners = new Set();

/**
 * Register a gate listener. Called with { reason, ip, stats } on each refusal.
 * Returns an unsubscribe function.
 */
export function subscribeGate(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit(detail) {
  // Snapshot: a listener may unsubscribe itself while we're iterating.
  for (const fn of Array.from(listeners)) {
    try {
      fn(detail);
    } catch (err) {
      // A subscriber's own bug must never surface as a failed fetch to the caller.
      console.error('[HAR-33 gate] listener threw', err);
    }
  }
}

// fetch's first argument is a string, a URL, or a Request — res.url is normally enough, but
// it is empty for some response types, so fall back to the request we were handed.
function urlOf(res, input) {
  if (res && typeof res.url === 'string' && res.url) return res.url;
  if (typeof input === 'string') return input;
  if (input && typeof input.url === 'string') return input.url;   // Request
  if (input && typeof input.href === 'string') return input.href; // URL
  return '';
}

// Idempotent: importing this module twice (or a HMR reload) must not stack wrappers, which
// would double-fire every refusal.
let installed = false;

function installGateIntercept() {
  if (installed) return;
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.fetch.__deepbenchGateWrapped) { installed = true; return; }

  const original = window.fetch.bind(window);

  const patched = async function deepbenchGateFetch(...args) {
    const res = await original(...args);
    try {
      if (res && res.status === 403 && urlOf(res, args[0]).includes('/api/')) {
        const payload = await res.clone().json();
        if (payload && payload.deepbench_gate === true) {
          emit({ reason: payload.reason, ip: payload.ip, stats: payload.stats });
        }
      }
    } catch {
      // Not a gate refusal (non-JSON body, unclonable response, …) — pure pass-through.
    }
    return res;
  };

  patched.__deepbenchGateWrapped = true;
  window.fetch = patched;
  installed = true;
}

installGateIntercept();
