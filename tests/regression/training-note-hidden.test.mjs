// DeepBench | tests/regression/training-note-hidden.test.mjs -- "+ Type a note" is hidden from end users (shown on the admin address),
// the code is kept behind one constant, and existing notes still edit / switch off / delete.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selfRun } from "./_lib/self-run.js";

export default async function run() {
const screen = readFileSync(new URL("../../src/screens/PersonnelScreen.jsx", import.meta.url), "utf8");
assert.ok(screen.includes("const NOTE_ADD_HIDDEN = true;"));
assert.ok(screen.includes("const canTypeNote = !NOTE_ADD_HIDDEN || IS_ADMIN_HOST;"), "hidden unless this is the admin address");
assert.ok(screen.includes('[...(canTypeNote ? [["+ Type a note"'), "the button renders only when allowed");
assert.ok(screen.includes('initialAdd === "note" && canTypeNote'), "the ?add=note deep link cannot open the form either");
assert.ok(screen.includes("function NoteForm") && screen.includes("handleEditClick"), "the note form and editing an existing note are kept");
assert.ok(screen.includes('["+ Upload a file"'), "uploading a file is untouched");
console.log("ok training-note-hidden");
}

selfRun(import.meta.url, run);
