# MOB-22 — Phones: lock the app frame (header never moves, no page bounce)

Harvest for `MOB-22`, written by attended session `design-app-shell-0915` (2026-09-15). The row's
description is the pointer; this file carries the measurements and the proof.

## What John asked, and what he approved

John, 2026-09-15: *"is there a way to make it more like an app, and it doesn't bounce around?
Perhaps just the header is static in no movement, etc? Also, want to be able to push this as its own
release outside of everything else. Before you build anything, show me what you are thinking."*

He approved ("go") these rules, stated to him in plain words before any build:

1. The header stays locked at the top of every screen, on phones and computers.
2. The frame is exactly the size of the visible screen — never taller, never wider.
3. Only the content under the header scrolls, the same way each screen scrolls today.
4. Dragging past the end does nothing to the page: no stretch, no pull-down reload (the browser's
   reload button still works).
5. Nothing else about the look changes. The one visible difference: the Channel Sales Intelligence
   chat box gets a bit narrower on phones so Clear fits.

And the release plan: built on dev as normal, then a release branch cut from `origin/main` carrying
only this change, its own preview checked, then the merge brought to John. Production gets this and
none of dev's other commits.

## Measured on production (deepbench.roadmapventure.com), 2026-09-15, in-app browser

Every screen renders inside `AppShell` (13 routes in `src/main.jsx`; `/admin` is dev-only).

**Computer sizes — the page itself never scrolls today.** `document.scrollingElement` scrollHeight ==
clientHeight on all 12 production routes: `/`, `/channel-intelligence`, `/work`, `/work/new`,
`/work/1/analyze` at 1024x768; `/work/1`, `/work/1/fetch`, `/bench/chloe`, `/bench/chloe/teach`,
`/bench/new`, `/bench/test` at 1280x800 (`/bench` at 1024x768). `#root` zoom 0.8 (CHI-100).

**Phone sizes (375x812, 375x667, 667x375) — 11 of 12 routes keep the page still** (content scrolls
inside a panel under the header, e.g. `/bench` panel 760/9717, `/work` 760/1124). **The exception is
`/channel-intelligence`: page 410x888 at 375x812 and 410x730 at 375x667** — wider than the phone, so
the phone can pan it sideways.

What the emulator cannot show and phones do (documented browser behaviour, not measured here):

- **`100vh` on a phone is the height with the address bar hidden.** The shell's height is
  `var(--shell-h, 100vh)` (`src/AppShell.jsx`), and `--shell-h` is set only inside
  `@media (min-width: 769px)` (`src/tokens.js` GLOBAL_CSS), so below 769px the frame is `100vh`; and
  `html, body, #root { min-height: 100vh }`. While the address bar shows, the frame is taller than
  the visible screen and the page shifts up and down.
- **No overscroll rule.** Computed `overscroll-behavior-y` on `html` and `body` is `auto` on every
  route: iOS Safari rubber-bands the whole page (header included), Android Chrome pull-to-refreshes,
  and an inner panel that reaches its end chains the drag to the page.

## Root cause of the Channel Sales Intelligence overflow (proven, not guessed)

`src/screens/MarketIntelligenceScreen.jsx`, the mobile Chat branch's input row
(`<input id="mobile-chat-input" … style={{flex:1, padding:"9px 12px", … fontSize:16 …}}/>` + Send +
divider + Clear). A flex item's default `min-width: auto` keeps a text input at its intrinsic width
(~20 characters at 16px), so the row cannot shrink to 375px and Clear sits at x 358–410.
**Setting `minWidth: 0` on that input alone brought the page to 375x667 in 375x667** (from 410x730)
and put Clear's right edge at x 347. The input's `fontSize: 16` is CHI-88's iOS focus-zoom fix and
must not change.

## The approach, proven by injecting the CSS on production (debug only, nothing saved)

Injected after GLOBAL_CSS:

```css
html, body, #root { min-height: 100dvh }
html, body { height: 100%; overflow: hidden; overscroll-behavior: none }
#root { --shell-h: 100dvh }
@media (min-width: 769px) { #root { min-height: calc(100dvh / 0.8); --shell-h: calc(100dvh / 0.8) } }
```

Results: at 375x812 `/bench` shell 812 = screen, page 375x812, overscroll `none`, the roster panel
still scrolls to its end (9717/9717); `/channel-intelligence` (plus `minWidth: 0` on the input)
page 375x812, Clear right edge 347. At 1280x800 `/channel-intelligence` shell 800 before and after,
zoom still 0.8, page 1280x800; `/bench/test` page 1280x800. No route relies on page-level scrolling
at any measured size, so `overflow: hidden` on html/body hides no content.

## Constraints for the build

- **Ships live, no flag.** Attended session; John approved the exact visible change in-session
  (`.claude/rules/autonomous-surface-changes.md` governs Automated mode only).
- **Must cherry-pick onto `origin/main` cleanly.** `src/tokens.js` is byte-identical on main and
  dev; the CHI mobile input row is identical on both (only the `InteractColumn` line above it
  differs, outside a 3-line diff context); `src/AppShell.jsx`'s root line is identical. So the code
  commit must touch only those lines and must not depend on anything dev-only (e.g.
  `src/lib/featureFlags.js`). Keep the kickoff/docs in a separate commit from the code commit.
- **Do not change:** the viewport meta tag (CHI-88 chose no viewport change), the header's look,
  CHI-100's desktop zoom, the input's 16px font.
- The pending `release/bench-product-team-0915` branch touches `lib/project-manager.js`,
  `GovernanceSection.jsx`, `agents.js`, `featureFlags.js`, `CreateWorkOrderScreen.jsx`,
  `RosterScreen.jsx` — no overlap with this change, so either release can merge first.
  - *Update (The Designer, 2026-09-15):* that release has since merged as PR #10; `origin/main` is
    `0fc4cecb`. Re-measured after it: `src/tokens.js` blob `129db518` is still identical on main and
    dev, the CHI mobile input row is still identical (main lines 3631-3633), and `AppShell.jsx`'s root
    line is identical (main 375, dev 422).

## Folded-in ticket

`MOB-14` (P9 - Bug Fixes · FLAGGED, filed 2026-08-07 during `S-LAV-28` QA) is the same Clear
overflow, measured then at 406px. It closes on this ticket's QA check "Clear fully on screen and
page width 375 at 375px on `/channel-intelligence`". Its description also carries a stray copy of
`LAV-29`'s text (a table-import artifact); `LAV-29` itself is archived done
(`docs/FEATURES-ARCHIVE.md`, verified live 2026-08-07), so closing `MOB-14` loses nothing open.

## Known limit, out of scope

When the on-screen keyboard opens on an iPhone, Safari pans the visible area so the focused text box
stays above the keyboard; the header can move out of view while typing. That is Safari's handling of
a focused input, not page scrolling, and this change does not alter it.

## QA that discriminates

Before the change (production today) at 375x812: overscroll `auto`, `/channel-intelligence` page
410 wide. After (dev preview, then the release preview): computed `overscroll-behavior-y` `none` on
html and body; shell height = `innerHeight` on every route at 375x812, 375x667, 667x375 and
1280x800; `scrollWidth`/`scrollHeight` of the page equal the viewport on every route; every inner
panel still scrolls to its end; Clear fully on screen at 375px; desktop zoom still 0.8.

## Designer pass (The Designer, cycle `3a456cd8`, 2026-09-15): premise alive

Read-only. `origin/dev` = worktree HEAD `f07aa027`; `origin/main` `0fc4cecb`.

- **Cause 1.** `src/tokens.js:89` is the only `--shell-h` definition, inside `@media (min-width: 769px)`; `src/AppShell.jsx:422` is `height:"var(--shell-h, 100vh)"`; `src/tokens.js:74` gives `html, body, #root` `min-height:100vh`.
- **Cause 2.** `overscroll` in `src/`: 0 hits. Production's served bundle `assets/index-C4VydNYU.js` (2,002,457 bytes): `overscroll-behavior` 0, `100dvh` 0, `--shell-h` 2, `mobile-chat-input` 2, so a bundle grep for `100dvh` catches a stale preview.
- **Cause 3.** `src/screens/MarketIntelligenceScreen.jsx:3863-3865`: the `#mobile-chat-input` style (`flex:1,padding:"9px 12px",…,fontSize:16,…`) has no `minWidth`. Line 3685, the desktop `InteractColumn` input, has the same style prefix with `fontSize:13`; the anchor `fontSize:16,background:T.card,color:T.ink}}/>` occurs once, and so does `Clear behavior are unchanged. */}` (line 3857).
- **Every route sits in the shell.** `<AppShell` appears in all 13 routed screen files (`src/main.jsx`); main has the same routes minus `/admin`. `WelcomeSplash` is `position: fixed`; the page-level `ErrorBoundary` fallback is a small box.
- **Board.** `MOB-22` open, P5 - Enhancements, `john-named`; `MOB-14` open, P9 - Bug Fixes · FLAGGED; both claimed by `design-app-shell-0915` at 21:44:50Z. `issued_versions`: `v7.0.496` issued to `design-app-shell-0915`.
- **Caps.** `class_autonomy('P5 - Enhancements')`: rung 1, `extra_files` 0, `extra_tasks` 0, so 3 files / 4 tasks.
- **Model lanes.** `runner_model_lanes`: judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`, orchestrator `claude-opus-5`.
- **Concurrency.** The one other open cycle (`0535feab`, `SES-401`) changes how regression tests declare NOT RUN; no file overlap.

## Release mechanics, measured

- `git diff -U0 origin/dev origin/main -- src/screens/MarketIntelligenceScreen.jsx` has 29 hunks (dev line numbers): `1,23` `581,28` `1119,6` `1620,99` `1775,8` `1805` `1871,4` `1898,3` `1909,3` `1932,8` `2028,4` `2113,3` `2354,14` `2393,3` `2435,5` `2515,24` `3514,3` `3627` `3714` `3794,10` `3861` `3885` `4013,8` `4352` `4473,16` `4666` `4817` `4976` `4982,2`. The build changes dev 3857 (comment) and 3865 (style), each 3 unchanged lines from 3861, so a three-way merge takes both; git conflicts only where change ranges overlap or touch. A new line 1 would touch hunk `1,23` (dev's 23 newer header lines, absent on main) and conflict, so this file gets no line-1 version header: a deliberate STANDARDS §1 deviation forced by the release constraint, with the `FEATURE: MOB-22 (v7.0.496)` note at the change carrying the version.
- `src/AppShell.jsx` dev-to-main hunks: `1,7` `38,12` `208,17` `301,11`. Same line-1 problem; no edit is needed because the shell already reads `--shell-h`.
- `src/tokens.js`: no dev-to-main difference at all.
- A pipe-only `diff3` simulation was tried and refused (`diff3: input file shrank`; it needs seekable files and this pass wrote none). The build's `merge-tree` exit code is the real proof, and a 1 there stops the release.
- Main has `tests/regression/_lib/self-run.js` exporting `selfRun`, and `run-all.js` finds tests by `readdirSync`, so the guard travels to main unchanged.
- Worktree-free cherry-pick: `git merge-tree --write-tree --merge-base=<sha>^ origin/main <sha>` is a cherry-pick's three-way merge (base = the commit's parent), exits 1 on conflict, and never switches the session's checkout (git 2.54.0 here; `--merge-base` is listed by `git merge-tree -h`). Then `commit-tree`, push `refs/heads/release/mob-22-app-frame`, PR to `main`: the PR #10 pattern (branch from main, PR, John merges).
- `scripts/check-deploy-current.js` reads only `dev` deployments (`githubCommitRef === "dev"`), so the release preview's gate is the bundle grep; take that preview's URL from the PR rather than constructing it.
- `scripts/verifier.js` diffs against `--base` (default `origin/dev`), so it runs before the push; after the push that diff is empty.
- `C:/Projects/.claude/hooks/block-design-session-code.js` denies `src/` and `api/` writes while the branch matches `session/design-*`; `CLAUDE-DESIGN.md`'s handoff is `checkout -b session/<topic>-coding`.

## Design decisions

1. **The proven CSS, wrapped in `@supports (height: 100dvh)`.** The injected sheet is right where `dvh` exists and unsafe where it does not. (a) `--shell-h:100dvh` is accepted as a custom property; `height: var(--shell-h, 100vh)` then substitutes a unit the browser cannot parse, which is invalid at computed-value time, so `height` becomes `auto` instead of the fallback and the flex/scroll chain loses its bound (the MI-32 defect). (b) `overflow: hidden` on a `100vh` frame taller than the visible screen hides the bottom rows with no way to reach them. Guarded, those browsers keep today's behaviour exactly. Where `dvh` exists the guarded block computes the same values as the injected sheet (its two reordered rules set different properties), so the production proof carries over.
2. **Regression guard kept** (STANDARDS §4, `SES-135` clause 1): the defect can return if someone restores `100vh`, drops the overscroll rule or refactors the CHI row. It imports the real `GLOBAL_CSS`; the screen is read as shipped source because a JSX screen does not import under node. Dry-run in memory, no file written: unchanged source F1 F2 F3 F4 P5 P6; with the exact kickoff edits applied in memory, P1 to P6. Structure: the input-tag slice is 362 bytes, and the stripped vh media block sits at index 2216.
3. **No flag.** Manual attended mode, and John approved the exact visible change; `.claude/rules/autonomous-surface-changes.md` binds Automated mode only; a flag would import dev-only `src/lib/featureFlags.js` and break the cherry-pick.
4. **No FeatureBadge.** A global stylesheet has no wrapper of its own; `CHI-100` (`v7.0.73`, same file, same kind of change) shipped without one, and a badge would add an edit to a file whose top differs on main.
5. **Model `claude-opus-5`, orchestrator lane.** The edits are prescribed, but the ticket also cuts a release, opens a PR and runs two preview sweeps: the lane that orchestrates, codes, QAs and ships, not the mechanical lane's doc-sweep scope.
6. **Lanes band `$0-1`.** `fetchNewsCards()` runs on CHI load (`MarketIntelligenceScreen.jsx:4298`) and again on Clear (`:4078`). `ai_activity_log` since 18:00Z today, host `deepbench.roadmapventure.com`, `screen_origin = channel-sales-intelligence`: 19 rows in 9 traces, $0.1059 at `model_pricing` input and output rates, up to $0.1327 more if cache reads were billed at the input rate, 2 rows unpriced. No other screen origin logged a model call in that window. The build loads CHI about 8 times across two previews.
7. **No `npm install`.** The worktree already has `node_modules` and `.env.local`.

## Alternatives rejected

- The injected sheet verbatim: decision 1.
- `position: fixed; inset: 0` on the shell: needs an `AppShell.jsx` edit and changes the containing block for the shell's fixed children, for no gain once the height is right.
- JavaScript writing `window.innerHeight` into `--shell-h` on resize: a listener and a first-paint jump for what `100dvh` does in CSS.
- `100svh`: with the page unable to scroll the toolbars never collapse, so it equals `100dvh` in practice; `dvh` also follows toolbar changes that happen without scrolling, and the production proof used `dvh`.
- `-webkit-fill-available`: inconsistent across engines.
- Giving the desktop input (line 3685) `minWidth: 0` too: no desktop overflow was measured.
- `git cherry-pick` in the session worktree: it would switch the design session's checkout mid-session; `merge-tree` is the same merge without one.

## What this does not do

- The iPhone keyboard pan while typing (known limit above).
- Overlays sized in `vh` (`PromptEvolutionModal` 88vh, the LAV modal 82vh, `WelcomeSplash` mobile 75vh, the drawer clamp 80vh) stay as they are; they never scrolled the page.
- iOS 15.4 to 15.x has `dvh` but not `overscroll-behavior`, which arrived in Safari 16 (browser support tables, not measured here): the frame fits there, the bounce may remain.
- Panels keep their own edge bounce; the approved rule is about the page.
- `src/AppShell.jsx:11`, the v7.0.73 history line ("mobile falls back to 100vh"), stays as written: it records what CHI-100 shipped.

## Discovery for the attended session to file (this pass is read-only and filed nothing)

**`/bench/test`'s "↑ Back to Top" button does nothing.** `src/screens/TestTeamScreen.jsx:358` calls `window.scrollTo({ top: 0, behavior: "smooth" })`, but the page never scrolls: the content scrolls inside the panel at `TestTeamScreen.jsx:102` (`flex: 1, overflowY: "auto"`), and the attended session measured `/bench/test`'s page equal to the viewport on production today at 1280x800 and at phone sizes. MOB-22 neither causes nor fixes it. No backlog row mentions it (titles and descriptions searched for "Back to Top" and "scrollTo": 0 rows). Suggested class **P9 - Bug Fixes**; fix shape: scroll the panel element, not the window.

## QA additions in the kickoff

The emulator sizes `100vh` and `100dvh` identically, so "shell height = `innerHeight`" cannot fail before the change. The kickoff adds checks that do: `#root`'s `--shell-h` reads empty at 375px before and `100dvh` after (`calc(100vh / 0.8)` to `calc(100dvh / 0.8)` at 1280x800); `overflowY` `visible` to `hidden`; the served bundle's `100dvh`; and `scrollHeight`/`scrollWidth` equal to the viewport, which reads larger if `overflow: hidden` ever clips content. Clear is measured, never clicked.
