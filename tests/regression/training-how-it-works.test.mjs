// DeepBench | tests/regression/training-how-it-works.test.mjs -- the Training page explains, in plain words, what happens to what you add:
// short items always in full, long ones looked up, an AI tool gets every item in full, an item can be switched off.
// Each claim is tied to the code that makes it true.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALWAYS_MAX_CHARS, shapeTaught } from "../../lib/read-taught.js";
const read = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const screen = read("src/screens/PersonnelScreen.jsx");
assert.ok(screen.includes("How training works") && !screen.includes("How Background Knowledge Works"), "the heading is plain");
assert.ok(screen.includes("Everything you add here is something your agent can use."));
assert.ok(screen.includes("Short items, about five pages or less, are always given to the agent in full. Longer ones are looked up when they match the question."));
assert.ok(screen.includes("When you connect an AI tool, it gets every item you have added, in full."));
assert.ok(screen.includes("Switch an item off at any time and your agent stops using it."));
assert.ok(!screen.includes("Documents are stored in vector format"), "the old jargon is gone");
// "about five pages": the always-given limit is 12,000 characters (about 2,000 words)
assert.equal(ALWAYS_MAX_CHARS, 12000);
// "an AI tool gets every item in full": a 200,000-character item still arrives whole
const big = "x".repeat(200000);
const shaped = shapeTaught([{ id: "1", title: "Big", content: big, source: "user" }]);
assert.equal(shaped.taught[0].text.length, 200000, "no cut-off on the way to the AI client");
assert.equal(shaped.taught[0].always, false, "the always flag is only about DeepBench's own prompt");
console.log("ok training-how-it-works");
