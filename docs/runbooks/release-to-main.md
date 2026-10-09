<!-- DeepBench v7.0.793 | runbooks/release-to-main.md | AGT-391 — a production release runs the FULL regression suite on the exact tree it proposes for main, and every red becomes a finding before John is asked to merge. A build runs only its related set since AGT-391; this and the weekly Auditor run are the two places the whole suite runs. -->
# Release to main — the full-suite run before a production release

## Why this exists

Since `AGT-391` a build runs only its **related** test set (`scripts/related-tests.js` →
`node tests/regression/run-all.js --only=<set>`), graded against its kickoff's BASELINE block. The
whole suite still runs, in exactly two places: weekly in the Auditor routine
(`docs/runbooks/auditor-routine.md` Step 1) and **here, before a production release**. This runbook
runs it on the tree that would actually land on `main`, turns every red into a finding for the
Development Manager, and hands John a pull request that quotes the result.

**John merges.** `CLAUDE.md`'s hard rule — *never merge `dev → main` without John's explicit
sign-off* — is untouched: this runbook ends at an open PR, never at a merge.

## Steps

`$S` is your scratchpad; `<name>` is a short release name (e.g. `bench-0915`); `<ship>` is the commit
on `dev` that the release ends at (one ship, or the last of a run of ships).

**1. Build the release commit on top of `origin/main`** — the narrow-release pattern: a three-way
merge of the ship onto main, with nothing else from `dev` riding along.

```
git -C "<worktree>" fetch origin main dev
git -C "<worktree>" merge-tree --write-tree --merge-base=<ship>^ origin/main <ship>
```

A conflict prints conflicted paths and exits non-zero: stop and report them. Otherwise the first
line is a tree id; wrap it in a commit whose only parent is `origin/main`:

```
git -C "<worktree>" commit-tree <tree id> -p origin/main -m "release <name>: <ship subject>"
```

**2. Put a worktree on that commit** — never the shared checkout:

```
git -C "<worktree>" worktree add "<release worktree>" <the commit-tree sha>
```

Copy `.env.local` in and `npm install` there (`docs/STANDARDS.md` Section 2 rule 5).

**3. Run the full suite, credentialed**, with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` read by name
from `public.runner_secrets` and exported inline for this one command (never printed, never written
to a file):

```
SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node "<release worktree>/tests/regression/run-all.js" > $S/release-<name>-suite.txt
```

No `--only` here: this run is the full suite by design.

**4. Every red becomes a finding** — through the one findings intake, never a ticket INSERT:

```
node scripts/audit-suite-reds.js --suite=$S/release-<name>-suite.txt --found-by=release:<name> --out=$S/release-<name>-reds.json
node scripts/audit-ledger.js --ingest=$S/release-<name>-reds.json --session-name=release-<name> --apply
```

`audit-suite-reds.js` exits 2 when the run printed no `regression suite: x/y passed` line (a
`[NOT RUN]` transport exit, a killed process): that run is neither green nor a set of reds — re-run
step 3, do not open the PR on it.

**5. Push the release branch and open the PR for John:**

```
git -C "<release worktree>" push origin HEAD:refs/heads/release/<name>
gh pr create --base main --head release/<name> --title "Release <name>" --body-file $S/release-<name>-pr.md
```

The PR body quotes the suite's summary line verbatim (`regression suite: x/y passed`) and every
`[FAIL]` line, each with the finding it became. A red does not by itself stop the release: it is
John's call at the merge, made with the reds in front of him.

**6. Clean up** the release worktree once the PR is open (`git worktree remove`), and leave the
`release/<name>` branch for the PR.
