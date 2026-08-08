// DeepBench v6.3.230 | src/lib/newsCardContext.js | SES-57 -- Article Context Resolver. The one place
// that turns a news-card URL into the background context an agent receives. Both callers -- the CHI
// screen and the CHI test engine -- import this; neither builds the payload itself. Registered in
// platform_services as article-context-resolver (§19m).
//
// Why this module exists: the screen and scripts/chi-true-regression.mjs each had their own copy of
// "fetch the article, work out what happened, assemble the payload." The copies diverged the moment
// CHI-91 added a fourth field (SES-57), which silently invalidated regression test #24 -- a bucket-1
// beta gate. SES-31 had already fixed the same drift once, driver-side only, because nothing coupled
// the two payloads. This module is the coupling.
//
// JSX-free on purpose, same placement rationale as src/lib/articleFaultText.js: plain Node cannot
// import a .jsx file at all (loader-level rejection, not a syntax error), so this cannot live inside
// the screen if the test engine and the regression suite are to import the real implementation.

/**
 * Fetch a news article and resolve it into the background context an agent receives.
 *
 * Fails open by contract: a fetch that cannot be completed still returns a usable payload
 * carrying the reason, never throws. Callers are not expected to try/catch this.
 *
 * @param {string} url        the news card's article URL
 * @param {string} endpoint   the fetch-article endpoint. The screen passes a relative
 *                            "/api/fetch-article"; the test engine passes an absolute URL.
 *                            This module never decides where it points.
 * @param {function} [fetchImpl=fetch]  injectable for tests
 * @returns {Promise<{payload: object, failure: object|null, degraded: boolean}>}
 *   payload  - spread directly into task_context by both callers. Always carries all four keys.
 *   failure  - the primary_failure object, or null when the article was read. The screen passes
 *              this to articleFaultText() for its chat fault line; the test engine records it.
 *   degraded - true when no article text was obtained, for whatever reason.
 */
export async function resolveNewsCardContext(url, endpoint, fetchImpl = fetch) {
  let text = null, source = null, failure = null;
  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => null); // an error body is still a body (LOG-109)
    if (res.ok) {
      text = data?.text || null;
      source = data?.source || null;
    } else {
      // api/fetch-article.js classifies WHY the primary path failed and returns it as
      // primary_failure. The fallback covers responses that carry none (e.g. the 400 on a
      // missing url) so `failure` is never a bare true/false.
      failure = data?.primary_failure || { http_status: res.status, extraction_outcome: "not_attempted" };
    }
  } catch {
    // No response at all -- network drop, abort, timeout. http_status null distinguishes this
    // from a real HTTP failure; articleFaultText() reads exactly that to decide whether
    // retrying is worth suggesting.
    failure = { http_status: null, extraction_outcome: "not_attempted" };
  }
  return {
    payload: {
      article_content: text,
      article_source: source,
      article_url: url,
      article_unavailable_reason: failure,
    },
    failure,
    degraded: !text,
  };
}
