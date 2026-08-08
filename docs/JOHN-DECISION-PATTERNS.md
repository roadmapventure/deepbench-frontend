# John's Decision Patterns — Reference

> **This is the `SES-004` artifact, SEEDED early (not the full pass).** These first entries are distilled
> from the four corrections in `design-log-38-0724` (the runtime signature model design), where John's
> practice instinct beat Claude's generic best-practice four times. The **full** `SES-004` — mining
> ~3 months of `docs/SESSIONS.md` / `docs/FEATURES-ARCHIVE.md` for recurring tradeoff-calls — is still
> queued and blocked on `SES-002`. Add to this file whenever a correction reveals a *criterion*, not just
> a one-off decision.

**Why this file exists (from the `design-log-38-0724` retrospective):** Claude carries broad "best
practices," but a best practice is a *prior*, not a decision — the right answer is that prior *conditioned
on John's goal, constraints, and what "good" means for DeepBench*. Claude kept applying generic priors over
John's specific context and defending them. This file captures the criteria so a *fresh* session conditions
on them up front. Pairs with `WORKING-WITH-JOHN.md`'s "Adopt John's Practice Instinct First — Concede Fast."

---

## The criteria (seed set)

**1. Eliminate a problem; don't bound or accept it.** When Claude offers "accept the bounded/rare
downside," John's default is to remove the downside entirely if there's a way. *Seen in:* Claude proposed
living with bounded config-drift on history; John chose to backfill+freeze so drift is gone, not managed.

**2. Data-driven over code — hardcoding is the platform's premise to remove, not a convenience to weigh.**
Prefer a data row + one generic mechanism to N special cases in code. Adding a thing should be a data
insert, not a code deploy. *Seen in:* Claude defaulted to a per-pattern `CASE` ladder; John: "if the format
is the same, why per-pattern code?" → one generic `signature @> criteria` match, patterns as data.

**3. Stable / reproducible output beats convenient implementation.** Numbers and displays must not silently
change run-to-run or as internals shift. This outranks Claude's instinct to minimize storage or avoid
"redundant" work. *Seen in:* the whole reason the AI-Audit counts had to be deterministic, and the push to
*freeze* the signature rather than re-derive it live where drift could move it.

**4. A best-practice prior is conditioned on the goal — name the contextual exception, don't apply the
rule dogmatically.** "Don't store derived data / avoid staleness" is real, but had a genuine exception
here. *Seen in:* Claude locked "runtime, not stored"; John saw that a *write-time fact snapshot* is
consistent with facts already captured that way AND kills drift — so the rule's exception was the right
call. When a locked prior collides with the goal, the collision is the finding, not the rule.

**5. Model how work actually enters the pipeline, not just the design.** A settled piece of work needs the
*artifact that makes it invokable* — in DeepBench, a ticket ID — created now, or it's invisible. Design the
workflow, not only the architecture. *Seen in:* Claude proposed deferring ticket IDs; John: without an ID,
"how does it get invoked into a session?" → claim the IDs now, kickoffs later.

---

*Format for new entries: a one-line **criterion** (imperative), then a concrete **Seen in:** instance so it
stays grounded, not abstract. Only add a criterion that would change a *future* decision — not a one-off.*
