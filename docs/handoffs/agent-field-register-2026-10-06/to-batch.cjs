// Turns snapshot.json back into ArtifactData batch calls, so the register can be recreated.
//
//   node docs/handoffs/agent-field-register-2026-10-06/to-batch.cjs <out-dir>
//
// Writes one file per document into <out-dir>/docs/<id>.json (the document body only) and the batch
// files <out-dir>/batch-1.json, batch-2.json, ... Each batch file is a JSON array of
// { op: "set", collection: "fields", doc_id, file_path } entries, at most 50 each, which is the
// `writes` argument of the ArtifactData tool's "batch" action. The new artifact's url goes in the
// call itself. A document that does not exist yet needs no if_version.
const fs = require("fs");
const path = require("path");

const out = process.argv[2];
if (!out) { console.error("usage: node to-batch.cjs <out-dir>"); process.exit(2); }
const snap = JSON.parse(fs.readFileSync(path.join(__dirname, "snapshot.json"), "utf8"));
const docsDir = path.join(path.resolve(out), "docs");
fs.mkdirSync(docsDir, { recursive: true });

const entries = snap.documents.map(d => {
  const file = path.join(docsDir, d.id + ".json");
  fs.writeFileSync(file, JSON.stringify(d.data));
  return { op: "set", collection: snap.collection, doc_id: d.id, file_path: file };
});
let n = 0;
for (let i = 0; i < entries.length; i += 50) {
  n++;
  fs.writeFileSync(path.join(path.resolve(out), `batch-${n}.json`), JSON.stringify(entries.slice(i, i + 50)));
}
console.log(`${entries.length} documents -> ${n} batch files in ${path.resolve(out)}`);
