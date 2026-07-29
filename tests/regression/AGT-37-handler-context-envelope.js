// DeepBench v6.3.224 | tests/regression/AGT-37-handler-context-envelope.js | AGT-37
// FEATURE: AGT-37 -- Category M (cross-reference consistency), persisted per SES-009a.
//
// Locks in this session's central invariant and the one cross-file vocabulary it created.
//
// THE INVARIANT: `handler_context` is a HANDLER-facing envelope. It reaches the write handler and
// nothing else. It must never reach the model -- not via assemblePrompt(), not via enrichPrompt(),
// not merged into prompt_request. This is not a nicety: AGT-37 exists because an id-shaped decoy in
// prose defeats instruction-level guards (docs/harvests/AGT-37.md -- two failed attempts, no third
// wording permitted), and AGT-39 records that these agents write ids they can see into their own
// prose, which becomes the NEXT step's decoy. A real chunk id rendered into the prompt would hand
// that problem a fresh source while the first assertion still looked green.
//
// THE CONSISTENCY RULE: the harness carries the envelope opaquely, so nothing checks that what a
// caller puts IN matches what the handler reads OUT. Renaming a key on either side would silently
// resume the old behavior -- the write would still succeed, just with an empty provenance link, the
// exact failure mode AGT-37 was filed for. That is precisely the class Category M exists to catch.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selfRun } from "./_lib/self-run.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");

// The two files that build what the model actually sees. Nothing else assembles a prompt.
const PROMPT_ASSEMBLY_FILES = ["api/prompt/db-assembly.js", "api/prompt/ai-enrichment.js"];

// Files that CONSTRUCT a handler_context literal (the supply side of the vocabulary).
const SUPPLY_SIDE_FILES = ["api/capabilities/execute.js", "src/screens/MarketIntelligenceScreen.jsx"];

// Slice out a single call's argument text, e.g. everything between `assemblePrompt({` and its `});`.
function callBlock(source, callee) {
  const open = source.indexOf(`${callee}({`);
  if (open === -1) return null;
  const close = source.indexOf("});", open);
  return close === -1 ? null : source.slice(open, close);
}

// Line-level assertions below are about what the code DOES, so comment lines are excluded --
// otherwise this file's own explanatory comments (and every version header, which names both
// handler_context and the functions it must stay away from) would trip the very rules they describe.
function codeLines(source) {
  return source.split(/\r?\n/).filter(l => {
    const t = l.trim();
    return t && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
  });
}

export default async function run() {
  // 1. The invariant, in its strongest form: the prompt-assembly files do not know this field
  //    exists at all. A zero-occurrence check cannot be satisfied by a subtle mis-thread.
  for (const rel of PROMPT_ASSEMBLY_FILES) {
    assert.ok(
      !read(rel).includes("handler_context"),
      `${rel} must never mention handler_context -- it builds what the model sees`
    );
  }

  // 2. execute.js threads the envelope to sendRequest() and to nothing else on the model path.
  const executeSrc = read("api/capabilities/execute.js");
  const assembleCall = callBlock(executeSrc, "assemblePrompt");
  assert.ok(assembleCall, "expected an assemblePrompt({...}) call in execute.js");
  assert.ok(
    !assembleCall.includes("handler_context"),
    "execute.js must not pass handler_context to assemblePrompt() -- that is the entire point of it being a separate field"
  );
  const sendRequestCall = callBlock(executeSrc, "sendRequest");
  assert.ok(sendRequestCall, "expected a sendRequest({...}) call in execute.js");
  assert.ok(
    sendRequestCall.includes("handler_context"),
    "execute.js must pass handler_context to sendRequest() -- otherwise the envelope never reaches the handler"
  );
  // enrichPrompt() is called with a short inline argument list rather than a multi-line block;
  // assert against its whole call line instead of a block slice.
  for (const line of codeLines(executeSrc)) {
    if (line.includes("enrichPrompt(")) {
      assert.ok(
        !line.includes("handler_context"),
        "execute.js must not pass handler_context to enrichPrompt()"
      );
    }
  }

  // 3. request-receivable.js relays the envelope to the handler and never folds it into
  //    prompt_request -- prompt_request IS the model's input.
  const receivableSrc = read("api/prompt/request-receivable.js");
  assert.ok(
    /export async function sendRequest\({[^}]*handler_context/.test(receivableSrc),
    "sendRequest() must accept handler_context in its parameter list"
  );
  const handlerDispatch = callBlock(receivableSrc, "handlerFn");
  assert.ok(handlerDispatch, "expected a handlerFn({...}) dispatch in request-receivable.js");
  assert.ok(
    handlerDispatch.includes("handler_context"),
    "the handlerFn({...}) dispatch must forward handler_context"
  );
  // sendRequest()'s signature legitimately names both -- they are SIBLING parameters, which is the
  // whole design. What must never happen is the two being joined: read off prompt_request, or
  // destructured out of it. Either would put the envelope on the model's side of the boundary.
  for (const joined of ["prompt_request.handler_context", "prompt_request?.handler_context"]) {
    assert.ok(
      !receivableSrc.includes(joined),
      `handler_context must never be read off prompt_request (${joined}) -- prompt_request IS the model's input`
    );
  }
  for (const line of codeLines(receivableSrc)) {
    if (line.includes("= prompt_request") && line.includes("handler_context")) {
      assert.fail("handler_context must never be destructured out of prompt_request: " + line.trim());
    }
  }

  // 4. Cross-file vocabulary consistency: every key a caller SUPPLIES must be a key the handler
  //    READS. This is the assertion that catches a rename on either side.
  const suppliedKeys = new Set();
  for (const rel of SUPPLY_SIDE_FILES) {
    for (const [, body] of read(rel).matchAll(/handler_context:\s*\{([^}]*)\}/g)) {
      for (const [, key] of body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) suppliedKeys.add(key);
    }
  }
  assert.ok(suppliedKeys.size > 0, "expected at least one handler_context literal among the supply-side files");

  const handlerSrc = read("api/_lib/handlers/reasoning-write.js");
  const readKeys = new Set(
    [...handlerSrc.matchAll(/handler_context\?\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1])
  );
  assert.ok(readKeys.size > 0, "reasoning-write.js must read at least one key off handler_context");
  for (const key of suppliedKeys) {
    assert.ok(
      readKeys.has(key),
      `handler_context.${key} is supplied by a caller but never read by reasoning-write.js -- the write would silently land an empty provenance link, which is the bug AGT-37 was filed for`
    );
  }

  // 5. The handler resolves the SUPPLIED ids, not HAR-21's placeholder null -- and never reaches for
  //    task_context, which is prompt material and therefore model-visible by construction.
  assert.ok(
    /resolveReferenceIds\(\{\s*supplied:\s*suppliedIds/.test(handlerSrc),
    "reasoning-write.js must pass the caller-supplied ids as resolveReferenceIds()'s `supplied` argument"
  );
  assert.ok(
    !codeLines(handlerSrc).some(l => l.includes("task_context")),
    "reasoning-write.js must never read task_context -- conflating agent-facing context with handler-facing facts is exactly what this session's correction exists to prevent"
  );

  // 6. The guard AGT-37 deliberately did not weaken. Caller-supplied is not caller-trusted: a
  //    well-formed but fabricated or cross-room id must still be refused downstream.
  const harnessSrc = read("lib/search-harness.js");
  assert.ok(
    harnessSrc.includes("denied-source-chunk-cross-room-or-missing"),
    "the AA-189 existence/cross-room guard must remain in lib/search-harness.js -- supplying an id must not become a way around it"
  );
}

selfRun(import.meta.url, run);
