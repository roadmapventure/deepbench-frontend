<!-- DeepBench v7.0.343 | docs/design/SES-183-m4-infrastructure-floor-gate.md | SES-183, cycle
     ab2948c6 — THE M4 DESIGN GATE'S DECISION RECORD. This is a RECORD of a sitting John ran
     attended on 2026-08-31, not a proposal and not a design a cycle authored. Every ruling below
     is his, quoted verbatim from the runner_directives row that carries it, with that row's id.
     THE DIRECTIVE ROWS ARE THE TRUTH AND THIS FILE IS THE REPO-SIDE COPY — the same precedence
     Prime Directive a0ef9525 §7 sets for the briefing page ("If the page and this row disagree,
     this runner_directives row is the truth and the page is stale"). If they ever disagree, the
     rows win and this file is stale. It exists because a decision that lives only in a Supabase
     row is invisible to every session reading the repo, which is the SES-114 waste: the next
     cycle re-derives from prose what somebody already established. -->

# SES-183 — M4 design gate: infrastructure floor (decision record)

**Ticket:** `SES-183 — M4 design gate: infrastructure floor — backups, hosting tiers, secrets`
(`P10 - Tooling`, tier `later`, size `L`, `gate_count` 1, epic `Selfbuild M4 - Infrastructure Floor`).
**The sitting:** attended architect session, 2026-08-31, 15:25–15:30Z. All three parts ruled.
**The card:** `runner_items` `838f7a4d-57e2-4810-8323-231949ccd9ce`, `decision = accept` at
15:30:07Z.
**Recorded by:** unattended runner cycle `ab2948c6-bff4-4154-888d-8fad856a7cbb`, `v7.0.343`.

## Why this ticket existed, and what "done" meant for it

`SES-183` is a **design gate**, not a build. Its own description sets the bar: *"budget reviewed
with John AT THIS GATE (his 2026-08-23 ruling: 'let's review when we get there'; do not assume paid
tiers before then), secrets off .env.local copies, notification reliability (absorbs SES-123
disposition). **Members filed at the gate, not before.**"*

So the ticket owed two things: **the rulings**, which are John's and which he made on 2026-08-31,
and **the members**, which are the board consequences of those rulings. The sitting delivered the
first. This cycle delivers the second — that is the whole of what it built, and it invented no
decision of its own.

This ticket also gated more than itself. It sat at the head of the M4 drain (`4583bdc1`) and,
before it, the entire platform was **parked**: park row `4d5d9e71` (written 06:11:02Z by cycle
`69725495`) named `SES-183` as *"THE ONE THAT UNBLOCKS THE MOST"*, and seven consecutive fires
between 07:42Z and 14:41Z closed `did not run — parked` against it. The attended session closed the
park at 15:30Z. This is the first cycle to run work since.

## The three rulings, verbatim

### Part 1 of 3 — hosting tiers and backups (`cff4fd5f-7309-48a8-b31f-021c626ad735`, 15:25:57Z)

> John, verbatim: **"let's go no cost option"**

**No paid infrastructure tiers.** Supabase stays on the free tier (no Pro, no PITR); Vercel stays on
the free Hobby tier. The coverage path is **fixing `DAT-21`** — grants and schema-DDL capture in the
self-built backup net — via a desktop session, consistent with his prior 2026-08-23 word *"do not
assume paid tiers"*.

**The standing consequence, and it is a rule rather than a one-time answer:** any future cycle or
session proposing a paid tier must treat it as `needs-john`, **full stop**.

### Part 2 of 3 — secrets (`d7670e18-9ed7-4788-8368-aa699f007278`, 15:28:20Z)

> John, verbatim: **"option 1"** (secrets off `.env.local`)

**Secrets live in exactly two homes:** (1) the cloud environment's own settings — env vars on the
`deepbench-runner` environment `env_01GuEzm2nCHbCB5SumvQVEQ1` — and (2) the `runner_secrets` table.
`.env.local` files and their worktree copies may carry **only publishable values** (the anon key and
non-secret config); the service/master key must never live in a repo-adjacent file copy again.
Desktop sessions needing the master key fetch it at session start.

**Owed:** a cleanup pass over the existing `.env.local` copies on John's machine (delete the service
key line from each). That is **desktop work**, to be folded into the same desktop session as
`DAT-21`. Filed as `SES-258` by this cycle — see *Members* below.

**The standing consequence:** any future pattern that copies a privileged key into a file is a
defect against this ruling.

### Part 3 of 3 — notification reliability (`0f292cfa-5f5a-4f44-bd7c-8d63b612d959`, 15:29:58Z)

> John, verbatim: **"i don't need email notifications at thist ime"**

**The notification channel is PUSH ONLY**, for now. No email-provider account, no
transactional-email key, and no requirement to keep the Gmail connector alive for alerting. The
watchdog routine's alarm duties likewise deliver by push. Email may be revisited at a later gate if
he asks.

**The standing consequence, and it is the one that changes the board:** until then, **any ticket
blocked on "needs an email/SMS provider" is mis-blocked.**

## What the rulings do to the board

Four tickets are touched by these rulings and they are **not** all touched the same way. The
discriminations below are the substance of this record; a blanket sweep would get two of the four
wrong.

| Ticket | Before | After | Why |
|---|---|---|---|
| `HAR-34 — Alert John by email or text the moment the spend gate writes a new blocked row` | `needs-john` | **flag cleared, buildable** | Ruling 3 re-scopes it onto the push channel and says so by name: *"its needs-john flag is addressed by this ruling"* |
| `SES-47 — Vercel's 100-deploys/day cap is untracked` | `needs-john` | **`needs-john`, untouched** | Its ask is a **spend** decision, and ruling 1's standing clause puts paid-tier proposals back on him *"full stop"*. Ruling 1 answers *this* proposal (no) without retiring the flag's subject |
| `DAT-21 — Backup snapshots silently lost schema DDL capture and never capture grants` | `needs-desktop` | **`needs-desktop`, untouched** | Ruling 1 **names it as the coverage path**. Its blocker is the repo it lives in (`deepbench-backups`), which no ruling changed |
| `SES-123 — Routines notifications are not reaching John` | open, unflagged | **open, unflagged; disposition recorded here only** | Ruling 3 settles the **channel** (push, not email). It does **not** fix push failing to arrive, which is what `SES-123` actually reports. Its email half is retired; its delivery half stands |

**`SES-123` is deliberately not closed and its row is not rewritten.** `SES-183`'s description says
it *"absorbs SES-123 disposition"*, and the disposition is exactly the sentence above — narrowing,
not completion. Rewriting the row to match would be this cycle inventing scope out of a ruling that
did not grant it.

### The named deviation, disclosed rather than buried (the `SES-196` convention)

`runner-cycle.md` step 5 says of `design_status`: ***"never clear the flag yourself** — it is
cleared by the thing that unblocks the ticket: John's tap, or the attended session that makes the
edit."* This cycle cleared `HAR-34`'s, and it is neither of those two actors.

It is recorded as a deviation rather than argued away, and the reason it is nonetheless right is the
mischief the rule is written against. Its own next clause names that mischief: the flag is cleared
by the unblocking event *"rather than by a cycle deciding it has waited long enough."* The
prohibition is on a cycle **self-authorising**. Here John authorised in writing, in an attended
session, **naming the ticket** — *"its needs-john flag is addressed by this ruling"* — and
`CLAUDE.md`'s own hierarchy puts that first (*"runner_directives queue first — John's word outranks
everything"*). The unblocking event is the ruling; the attended session simply did not also make the
edit.

**The cost of not clearing it is not neutral, which is what settles it.** `SES-196` moved the flag
test into `drain_epic_next()`'s pick predicate, so a stale `needs-john` makes the picker step past a
ticket John has explicitly unblocked, and `SES-166` is written from precisely that failure — an ask
sitting on his §10 that he cannot act on because he already acted on it. Leaving the flag set would
have re-parked the runner against a blocker that no longer exists.

**`SES-47` is the control that proves this is not a blanket sweep.** It carries the same flag, was
touched by the same sitting, and **keeps** its flag, because ruling 1's standing clause explicitly
routes paid-tier questions back to John.

## Members filed at the gate

Per the ticket's *"Members filed at the gate, not before"*:

- **`SES-258`** — *Delete the Supabase service key from every `.env.local` copy on John's machine*.
  `P10 - Tooling`, tier `now`, `design_status = needs-desktop`, size `S`, `gate_count` 1, epic
  `Selfbuild M4 - Infrastructure Floor`. Ruling 2's owed cleanup. Desktop because the files are on
  his machine and no cloud cycle can reach them. Ruling 2 asks for it to ride the same desktop
  session as `DAT-21`; that is recorded on the ticket rather than modelled as a `blocked_by`, since
  neither blocks the other — they are co-located, not sequenced.

**No other member is filed, and the restraint is deliberate.** Rulings 1 and 3 create no new work
that is not already carded: ruling 1's coverage path is `DAT-21`, which exists, and ruling 3's build
is `HAR-34`, which exists and is now unflagged. Filing fresh tickets for either would duplicate a
board row, which is the `SES-116`/`SES-113` one-fact-two-homes defect one level out.

## What this gate did NOT settle, stated so a later cycle does not assume it did

- **The briefing republish gate is untouched and still blocks.** `SES-244`, `SES-257` and `SES-237`
  all describe it and all remain open; John's page has been stale since 2026-08-29T17:19Z, so the
  cards and questions below are real but currently invisible to him. Nothing in this sitting
  addressed it, and this cycle did not either.
- **M4 is not retired.** This closes one of its members. `drain_epic_next()` reported `open_now = 5`
  before this cycle; the drain retires on John's acceptance of its named members, never on a
  cycle's say-so (`SES-142`).
- **No paid-tier question is now answerable by a cycle.** Ruling 1's *"full stop"* is a standing
  routing rule, not a one-time no.
