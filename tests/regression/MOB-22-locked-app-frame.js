// DeepBench v7.0.496 | tests/regression/MOB-22-locked-app-frame.js | MOB-22
//
// FEATURE: MOB-22 -- on a phone the app frame IS the visible screen: the header never moves and
// the page never bounces. Two shipped edits make that true and this file guards both. (1) tokens.js
// ends GLOBAL_CSS with a guarded block that pins html/body to the real viewport
// (height:100%, overflow:hidden, overscroll-behavior:none) and re-points AppShell's --shell-h at
// 100dvh -- the DYNAMIC viewport unit. 100vh is the wrong unit on a phone: the browser sizes it as
// if the address bar were hidden, so the frame is taller than the screen, which is what let the
// page scroll the header out of view. (2) MarketIntelligenceScreen's mobile chat input carries
// minWidth:0, so a flex:1 input can actually shrink and Clear stays inside a 375px phone (MOB-14).
//
// WHY THE @supports GUARD IS ASSERTED AND NOT MERELY THE VALUE, which is the whole risk of this
// change. `--shell-h:100dvh` unguarded is not a no-op where dvh is unsupported: AppShell reads it
// as `height:var(--shell-h, 100vh)`, the fallback only applies when the variable is UNSET, and an
// unsupported value makes the declaration invalid-at-computed-value-time -- height computes to
// `auto` and the whole shell collapses. So the assertion is the exact nested text of the @supports
// block, not `css.includes("100dvh")`: a future edit that hoists any of these declarations out of
// the guard has to fail here rather than ship a collapsed frame to an old browser.
//
// ORDER IS ASSERTED BECAUSE CSS RESOLVES BY ORDER (assertion 2). CHI-100's desktop block
// (`zoom:0.8` plus the two calc(100vh / 0.8) compensations) and the new desktop clause inside the
// guard set the SAME two properties at the same specificity. The dvh values must win on desktop
// browsers that support dvh, and they only do so by coming later in the sheet. Asserting presence
// without order would pass just as happily with the blocks swapped, and desktop would silently
// keep the vh sizing -- a green test over the bug.
//
// ASSERTION 3 IS THE NEGATIVE CONTROL ON 1. `includes()` cannot see a SECOND, contradictory dvh
// site added elsewhere in GLOBAL_CSS -- an unguarded `--shell-h:100dvh` bolted on later would leave
// 1 and 2 green while re-opening exactly the collapse described above. Counting every occurrence
// pins the total to the five the guarded block contains, so any sixth site fails here.
//
// PURE AND CREDENTIAL-FREE, and it asserts the REAL artifacts, never a recreation (STANDARDS.md
// Section 4, the SES-45 rule): the CSS comes from importing the shipped GLOBAL_CSS, and the two JSX
// facts are read out of the shipped source files -- JSX does not import under node, so the shipped
// file is read and sliced rather than rebuilt. Dry-run against unchanged source before the src
// edits landed: assertions 1-4 fail, 5-6 pass.

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { selfRun } from "./_lib/self-run.js";
import { GLOBAL_CSS } from "../../src/tokens.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The shipped block, comment-stripped and whitespace-stripped -- the same normalisation `css` gets
// below, so the comparison is about declarations and nesting and not about how the file is indented.
const FRAME_BLOCK =
  "@supports(height:100dvh){" +
    "html,body{height:100%;overflow:hidden;overscroll-behavior:none;}" +
    "html,body,#root{min-height:100dvh;}" +
    "#root{--shell-h:100dvh;}" +
    "@media(min-width:769px){#root{min-height:calc(100dvh/0.8);--shell-h:calc(100dvh/0.8);}}" +
  "}";

// CHI-100's desktop block, which must still be there and must still come FIRST.
const ZOOM_BLOCK =
  "@media(min-width:769px){#root{zoom:0.8;min-height:calc(100vh/0.8);--shell-h:calc(100vh/0.8);}}";

// Every 100dvh site the guarded block is allowed to contain: the @supports condition, the
// min-height, the phone --shell-h, and the two desktop calc() compensations.
const DVH_SITES = 5;

export default async function run() {
  // Comments first, then whitespace: stripping whitespace first would weld a `/*` to whatever
  // precedes it, and the prose inside GLOBAL_CSS's own comments names these very declarations --
  // counting those mentions as code is how assertion 3 would go green on a file with no fix in it.
  const css = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "");

  assert.ok(
    css.includes(FRAME_BLOCK),
    "1: GLOBAL_CSS does not contain the guarded 100dvh app-frame block. Expected, nested exactly " +
    `as written: ${FRAME_BLOCK}`
  );

  const zoomAt = css.indexOf(ZOOM_BLOCK);
  assert.notStrictEqual(
    zoomAt, -1,
    `2: CHI-100's desktop block is gone from GLOBAL_CSS. Expected: ${ZOOM_BLOCK}`
  );
  assert.ok(
    zoomAt < css.indexOf(FRAME_BLOCK),
    "2: CHI-100's desktop block must come BEFORE the 100dvh block so the dvh values win on desktop " +
    `where dvh is supported. Found zoom block at ${zoomAt}, dvh block at ${css.indexOf(FRAME_BLOCK)}.`
  );

  assert.strictEqual(
    css.split("100dvh").length - 1, DVH_SITES,
    `3: GLOBAL_CSS must contain exactly ${DVH_SITES} 100dvh sites, all inside the @supports guard. ` +
    "A different count means a dvh declaration was added or removed outside the block asserted in 1."
  );

  // JSX does not import under node, so the shipped screen is read and sliced. The slice is anchored
  // on the input's own id, which appears once as a tag (STANDARDS.md Section 4: an anchor that also
  // appears in prose above its target yields an empty slice and a vacuously green assertion).
  const screen = fs.readFileSync(
    path.join(ROOT, "src/screens/MarketIntelligenceScreen.jsx"), "utf8");
  const tagStart = screen.indexOf('<input id="mobile-chat-input"');
  const tagEnd = tagStart === -1 ? -1 : screen.indexOf("/>", tagStart);
  const tag = tagStart === -1 || tagEnd === -1 ? "" : screen.slice(tagStart, tagEnd + 2);

  assert.ok(
    tag.length > 0,
    '4: could not slice the mobile chat input out of MarketIntelligenceScreen.jsx. Anchors: ' +
    '\'<input id="mobile-chat-input"\' then the next "/>".'
  );
  assert.ok(
    tag.includes('style={{flex:1,minWidth:0,padding:"9px 12px",'),
    "4: the mobile chat input is missing minWidth:0. Without it a flex:1 input refuses to shrink " +
    "below its content width, the mobile row overflows, and Clear sits off a 375px screen (MOB-14). " +
    `Sliced tag: ${tag}`
  );

  assert.ok(
    tag.includes("fontSize:16"),
    "5: the mobile chat input's fontSize:16 is gone. CHI-88: iOS Safari auto-zooms the whole app " +
    "on focus for any input under 16px and never zooms back out. Do not lower it to fit the row."
  );

  const appShell = fs.readFileSync(path.join(ROOT, "src/AppShell.jsx"), "utf8");
  assert.ok(
    appShell.includes('height:"var(--shell-h, 100vh)"'),
    '6: AppShell.jsx no longer reads height:"var(--shell-h, 100vh)". That variable is the only ' +
    "thing the frame block in 1 sets on the shell, so nothing above this line ships without it."
  );
}

selfRun(import.meta.url, run);
