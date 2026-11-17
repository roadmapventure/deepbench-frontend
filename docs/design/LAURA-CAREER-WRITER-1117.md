<!-- DeepBench v7.0.1051 | docs/design/LAURA-CAREER-WRITER-1117.md | design-laura-1117 — the design record for Laura (CW-01, Career Writer, LinkedIn & Resume), a personal-lane agent. Walkthrough Q1 approved 2026-11-10, Q2–Q5 approved in chat 2026-11-17, one question per message; go-ahead "Build Laura now"; John added a monthly trade-press watch and asked that its first run happen after the build and before the tryout. Need source john:runner_decisions:f229084b-37f4-4708-bbb0-7bba47d5ad49. Tickets AGT-721 (store + seed), AGT-722 (call path, write guard, runbook, /laura), AGT-723 (first monthly watch + Career Desk, attended), AGT-724 (blind tryout, attended). METHOD ONLY: no client name, no secret value, no personal fact lives in this file. The repo is public; drafts and facts live in the private stores. -->

# Laura (CW-01): Career Writer, LinkedIn & Resume

Laura keeps the principal's LinkedIn profile and master resume current and tailors a resume and cover letter to a job posting in minutes. She writes only from confirmed facts, chooses the format from cited best practice she re-reads every month, and proposes; the principal approves, publishes and applies.

## 0. Why she exists

The principal is in an active executive job search. The career strategist already finds and judges postings, but no team member writes: earlier attempts routed LinkedIn text to a consulting writer, whose format the principal rejected ("I want someone to suggest the format based on best practices"). A side-by-side test on 2026-11-10 of three open tailoring methods showed that every one got the facts right only when handed the confirmed facts with a "facts outrank the resume" rule, and that two of three named a client anyway, so the client rule must be enforced by the store, not by a prompt line.

## 1. The walkthrough (approved)

**Q1, what she is for (2026-11-10):** (1) keep the LinkedIn headline, About and Experience current, with a weekly check that proposes edits; (2) keep the master resume current, same check; (3) tailor a resume and cover letter to a pasted posting or link in minutes, never inventing a fact; (4) hold cited best-practice expertise and suggest the format; the principal's grades tune taste only; (5) never publish or apply.

**Q2, what she reads (2026-11-17):** the personal Library (confirmed facts outrank everything; identity; resumes and cover letters as drafts, not truth; the integrated story; evidence including the current product snapshots; goals; voice rules; a few posts as voice samples), the career records, the strategy records of kinds fact, correction, decision and offer, the market records of kinds message, feature_benefit, ip_asset and correction, the Napkin ideas as direction only (validated research verdict only, never a bullet), the posting, cited best-practice sources, and the tailoring method with no approval pauses by default (guided mode on request). **Never:** engagement documents, partner-proposal documents, the connections list.

**Q3, alone and the principal's:** alone = the weekly check's proposals, tailoring, pre-drafts for postings marked apply-now, format choice, the source watch, versions, approved pieces back into the Library, new facts saved as waiting. The principal's OK = any LinkedIn or master resume edit, new facts, a change to the hiring framing or the master format. The principal's alone = posting, applying, sending, contacting, naming a client, deleting Library items, the hire.

**Q4, schedule and how he hears:** three cloud routines created switched off, Central time, each opening with the STEP 0 weekly meter stop: weekdays 7:30 AM pre-draft; Thursday 7:00 AM weekly check; first Saturday of each month 8:00 AM trade-press watch (John replaced the quarterly refresh with monthly on 2026-11-17: executive resumes and AI-product resumes; vendor blogs only corroborate; a tip enters the method when two or more independent non-vendor sources agree). On demand: `/laura`. Output on one pinned private page, the **Career Desk** (Waiting on you, Drafts ready, Expertise notes, History and grades). Answers in a `/laura` session, because routines cannot read page comments and phone alerts are off. Grades 1–10 with a phrase.

**Q5, where she lives:** Laura, she/her, code CW-01, title Career Writer, LinkedIn & Resume, personal lane, the Fable line at the platform pin (`claude-fable-5-1`) with the existing Opus degrade under pace, created inactive. Tryout (AGT-724): blind, three tasks against plain Claude handed the same Library items: (A) tailor to a real open posting from the career records; (B) the current-employment LinkedIn Experience entry and resume entry; (C) the LinkedIn headline and About. Hired on two of three; any invented fact loses that task.

## 2. Architecture

- **`public.writing_records`** (AGT-721): her private store, RLS on, zero public grants asserted both ways. Kinds: `rule` (the write guard's blocked client terms, private), `draft` (a tailored resume, cover letter or profile piece, versioned in `data`), `proposal` (an edit to the live profile or master resume: target, section, current, proposed, reason, source), `match_report`, `fact_candidate` (a new fact waiting for the principal's tick; never cited as fact until ticked, then it becomes a `confirmed_fact` Library item), `practice` (a dated note in her own words with its link and publisher type), `method` (a tip admitted on two or more independent non-vendor sources), `source` (watch list), `correction` and `grade` (the principal's).
- **`public.personal_source_denies`** (AGT-721): a per-agent, per-item deny list on the Library. Grants are by kind, and the engagement and proposal documents share kind `document` with items she needs, so the "never reads" rule is a row per item. Seeded with every current `client_private` item in the works, market and ideas sections plus five engagement-specific items in evidence and value (32 rows). The AGT-722 read applies the denies and, as a second line, refuses any `client_private` item outside the evidence and value sections.
- **Capabilities (five):** `writing-tailor`, `writing-draft`, `writing-weekly-check`, `writing-predraft`, `writing-watch`.
- **Skills:** `cw-identity`, `cw-knowledge-method` (truthful tailoring: posting analysis, success profile, structure, band scoring direct/transferable/adjacent/gap, match report, voice pass, cover letter; fast by default, guided on request), `cw-knowledge-craft` (executive resume and LinkedIn baseline; a dated practice note outranks it), `cw-behavior`, `cw-guardrails`, plus one intent per capability. Method only; no row names another agent or the product (the seed asserts this).
- **Library grants (13 kinds):** confirmed_fact, cover_letter, document, goals, linkedin_comment, linkedin_position, linkedin_post, linkedin_profile, product_snapshot, resume, style_sample, synthesis, vision. Never connections.
- **Call path (AGT-722):** `scripts/personal-agent.js` gains the writing store (STORES entry, WRITING_READ_MAP per capability, `--write`), the deny-aware Library read ranked by the ask, the team reads cut to the kinds above, Napkin as direction only, and a **write guard**: a draft whose text names a blocked client term, or states a fact-candidate as fact, is refused before anything is written. Blocked terms live in a private record, never in the repo. Runbook `docs/runbooks/career-writer-agent.md` with three routine blocks created off, user-level `/laura` loader, AI Audit via `scripts/agent-log.js`.

## 3. The build, in order

1. **AGT-721 (done in this session):** migration `agt721_writing_store` (mirror `docs/design/agt-721-writing-store.sql`) and seed `docs/design/agt-721-laura-seed.sql`, applied; test `tests/regression/agt-721-laura.test.mjs` green live.
2. **AGT-722:** the call path, the write guard, the runbook, the loader. Kickoff in `docs/kickoffs/`.
3. **AGT-723 (attended):** the first monthly watch, before any test; then the Career Desk page.
4. **AGT-724 (attended):** the blind tryout. Hire is the principal's word; he switches the routines on.

## 4. Exceptions to `docs/AGENT-ARCHITECTURE.md`

The same as the other personal-lane agents: no deliverables row, no Agent Intelligence Score, no Knowledge Hunger states, no marketplace economics, no Test Scorecard, no roster entry in `src/data/agents.js`. Pronouns live in the agent row's bio.

## 5. Reverse handles

- Need source: `runner_decisions` `f229084b-37f4-4708-bbb0-7bba47d5ad49` (kind `john-ruling`, session `design-laura-1117`).
- Requirement checks (Victoria, need_score 3 each): `ed11cb7b` (AGT-721), `8561539c` (AGT-722), `19b806ab` (AGT-723), `28639e62` (AGT-724).
- Tickets: AGT-721 to AGT-724 (`scope_origin` `john-named`, P1 - Improves John's Skills).
