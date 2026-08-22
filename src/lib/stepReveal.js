// DeepBench v7.0.153 | src/lib/stepReveal.js | CHI-84 -- the two pure pieces of "tap a chat step
// chip, reveal that step's drawer". Extracted rather than inlined for one measured reason: the
// regression harness (tests/regression/*.js) runs under plain Node with no DOM and no JSX
// transform, so it cannot import MarketIntelligenceScreen.jsx at all. Logic that lives here can be
// tested; logic inlined in the screen cannot be.

/**
 * Build the next drawer-reveal request.
 *
 * FEATURE: CHI-84 -- the token increments on EVERY call, including when `key` is unchanged, and
 * that is the entire point of this function rather than holding a bare key string in state.
 * Tapping the same chip twice must scroll back to that drawer the second time; React bails out of
 * a state update that is `Object.is`-equal to the current value, so a plain string (or an object
 * whose fields only change when the key changes) makes the second tap a silent no-op. The token is
 * what makes the request observably new to the consuming effect's dependency array.
 *
 * @param {{key: string, token: number}|null|undefined} prev the current request, if any
 * @param {string} key the drawer's scrollKey (=== the Drawer's `data-drawer-key`)
 * @returns {{key: string, token: number}}
 */
export function nextRevealRequest(prev, key) {
  return { key, token: (prev?.token ?? 0) + 1 };
}

/**
 * Decide whether a chat bubble's stepRef can target a drawer, and with which key.
 *
 * Returns the key only when it is a genuinely usable non-empty string. Anything else -- a stepRef
 * from before CHI-84 threaded the key through, a build site that forgets it, an empty string --
 * returns null, and the caller renders the plain visual-only chip exactly as CHI-82 shipped it.
 * A dead button that looks tappable is worse than a chip that was never tappable.
 *
 * @param {{key?: string, n?: number, label?: string}|null|undefined} stepRef
 * @returns {string|null}
 */
export function resolveStepChipKey(stepRef) {
  const key = stepRef?.key;
  return typeof key === "string" && key.trim() !== "" ? key : null;
}
