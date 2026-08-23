---
name: triage
description: Decides whether a surprise dependency discovered mid-session actually blocks the current work, or is a separate item wearing a dependency costume. Use the moment something unexpected surfaces that seems to require fixing before the session can continue — a missing table, an unlogged event, an untagged call, an anomaly, a doc contradiction, or any "we can't do X until we fix Y" reasoning. Use it before investigating, not after. Prevents a scoped session from silently becoming an unscoped one.
---

# Dependency Triage — loader

**The procedure lives in `docs/runbooks/triage.md` — read that file and follow it; it is the canonical copy.** (Body moved there verbatim in v7.0.198, `SES-121`: it churned too often to live under `.claude/`, which unattended cycles cannot edit — register B39. This loader exists only so the harness can discover and trigger the skill; the description above is unchanged.)
