// DeepBench | tests/regression/sent-lens-hidden.test.mjs -- the "Dim what stays in DeepBench" switch is hidden but kept: one constant
// turns it off, the code and the data-sent marks stay, and a browser that had it switched on is not dimmed while it is hidden.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const screen = readFileSync(new URL("../../src/screens/PersonnelScreen.jsx", import.meta.url), "utf8");
assert.ok(screen.includes("const SENT_LENS_HIDDEN = true;"), "the switch is hidden");
assert.ok(screen.includes("{!SENT_LENS_HIDDEN && (activeTab === \"profile\" || activeTab === \"training\") && isPrivateAgent(agent) && <SentLensToggle"), "the toggle renders only when not hidden");
assert.ok(screen.includes('className={!SENT_LENS_HIDDEN && sentLens && isPrivateAgent(agent) ? "sent-lens" : undefined}'), "no dimming while hidden, even if this browser had it on");
assert.ok(screen.includes("function SentLensToggle") && screen.includes("SENT_LENS_CSS") && screen.includes('data-sent="no"'), "the feature itself is kept");
console.log("ok sent-lens-hidden");
