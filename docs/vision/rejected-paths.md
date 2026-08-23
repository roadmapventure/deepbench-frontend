<!-- DeepBench v7.0.206 | docs/vision/rejected-paths.md | SES-157 — RETIRED to a pointer. Its 51 claims are now rows in public.vision_claims (claim_ref VC-REJECTED-001..051, status 'rejected'), imported verbatim with their grounds as provenance and verified text-for-text against this file's prior revision before it was replaced. Spec docs/design/BRIEFING-COMMENTS-0823-DRAFT.md decision 5, John-approved 2026-08-23: "vision/rejected-paths.md retires — a rejected claim is a kept row, since rejections teach what not to build." The prior revision is in git history at e1ffa65 and earlier; nothing was discarded. -->

# Rejected Paths — RETIRED (the claims are rows now)

**This document no longer holds claims.** Its 51 rejected paths live in `public.vision_claims` as of
`SES-157` (`v7.0.206`), one row each, `claim_ref` `VC-REJECTED-001` … `VC-REJECTED-051`,
`status = 'rejected'`, each carrying its original `*grounds:*` text as `provenance`.

**Do not append to this file.** A new rejection is a row — written by harvesting John's Reverse on a
§12 vision card, which sets `status = 'rejected'` with his own words as the provenance. Appending here
would give one fact two homes, which is how two copies start disagreeing.

## Why the rejections became rows rather than a deletion

The purpose is unchanged and is stated in John's own framing: no future cycle (EXECUTE / HEAL /
INVENT) re-proposes an approach he already rejected or reversed. What changed is that the drip card's
Reverse used to **delete** the claim from its essay and append a line here. A deleted claim is
re-invented; a `rejected` row is what the invention pass can actually check itself against. John's
ruling, verbatim: *"a rejected claim is a kept row, since rejections teach what not to build."*

## Where to read them

```sql
SELECT claim_ref, claim_text, confidence, provenance
  FROM public.vision_claims
 WHERE status = 'rejected'
 ORDER BY claim_ref;
```

A rejection that has **re-opened** is not an edit to a row's text and not a deletion: it is John's tap
on that claim, which rewrites it in his words (`status = 'rewritten'`, `superseded_by` naming the new
row). The old text stays readable, because *why* a door was shut is the part that stops it being
re-opened by accident.

Deeper treatment of most items — the criterion numbers the grounds cite — remains in
`docs/JOHN-DECISION-PATTERNS.md`, whose own standing patterns are also rows now
(`VC-JDP-001` … `VC-JDP-040`). The full contract for how §12 serves and harvests these rows is
`docs/runbooks/briefing-page.md`, *Vision-corpus drip cards*.
