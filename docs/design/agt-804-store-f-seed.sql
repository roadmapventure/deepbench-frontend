-- AGT-804 (2026-11-25): store F, John's career offering, first record + grants.
-- Need source: john:runner_decisions:1fcf1d20-03ce-426b-855a-23f2d3fadece. Design: docs/design/STORE-F-CAREER-OFFERING-1125.md.
-- Data only, applied once over the Supabase MCP by design-store-f-1125. Private: personal_private, never pinned.
-- down: update personal_sources set status='superseded' where kind='career_offering' and origin='store-f';
--       delete from personal_source_grants where kind in ('career_offering','market_term');

with ins as (
insert into public.personal_sources (kind, title, body, section, trust, sensitivity, origin, doc_date, data)
values ('career_offering',
 'Store F: John''s career offering (goals, target roles, hiring framing, proof points, public rules)',
 $f$# Store F: John's career offering
Private to the Business team (Harry, Laura, Jerry, Nathan, Dilbert). This record wins over the Integrated Story and any older Library item. Approved by John 2026-11-25 (walkthrough Q1-Q6).

## Goals
- Path A: a value exit of at least $2M within 2 years (by 2028-11), built on IP, technology, strategy and vision, not on a revenue multiple.
- Path B: a product management role paying $300K a year by 2027-11; RoadMap Venture goes with him or stays on the side.
- Either path counts as success. No income past December 2026, so speed matters.

## Target roles
- Any product management role that manages a team, whatever the title: Head of Product, Director, Senior Director, VP Product or CPO, sized to the company.
- The role must lead people; an individual-contributor product role is not a target.

## Hiring framing
Product executive who architects and builds enterprise AI and data platforms end to end: the data model, governance and audit layers, and the products on top. He designs and directs the architecture of a self-governing AI build, using AI-native development.
- Never "non-coder"; never claim hand-written code.
- At RMV he sets prices (founder scale). At employers he influenced pricing and designed monetization models; never claim employer P&L ownership.

## Proof points (confirmed facts only)
- 20+ years in SaaS, PE-backed portfolios and government technology.
- Co-founded two ventures that were acquired: IP Zone (by AMEX) and idealAsset (by Dominion Harbor).
- Contributed to two employer acquisitions over $200M each (Periscope, then mdf commerce/SOVRA).
- Co-inventor on four issued U.S. patents.
- Stewarded a $75M ARR legacy customer base; led teams of 30 including two Directors.
- Since relaunching RoadMap Venture in February 2026: took DeepBench, Procurement Intelligence and the Procurement KPI Library from concept to release; runs an AI-agent-run business where engineering agents self-govern and self-heal.

## Public rules
- Never word anything in public as job-seeking.
- No client names or client data in public.
- Say "20+ years", never "30" or "nearly 30".
- Never describe a past role as "Head of Product" (he never held that title); it is fine as a target.
- No acquisition or deal jargon; say "co-founded two ventures that were acquired" and "contributed to two employer acquisitions over $200M".
- Enlyton is not an exit.
- In drafts, prospects are "prospective clients", not "other agencies".

## Market vocabulary map
Entries are Library items of kind market_term: a role or task the market names that matches John's work under words he has not used. Use the market's term when a posting uses it; otherwise explain the alignment in John's words.
$f$,
 'goals', 'john_confirmed', 'personal_private', 'store-f', '2026-11-25',
 jsonb_build_object('store', 'F', 'decision', '1fcf1d20-03ce-426b-855a-23f2d3fadece', 'ticket', 'AGT-804'))
returning id, body)
insert into public.personal_source_sections (source_id, ord, heading, body)
select ins.id, s.ord - 1, s.heading, s.body
from ins, lateral (
  select row_number() over () ord, split_part(chunk, E'\n', 1) heading, substr(chunk, length(split_part(chunk, E'\n', 1)) + 2) body
  from unnest(string_to_array(ins.body, E'\n## ')) chunk
) s;

insert into public.personal_source_grants (agent_id, kind)
select a, k from unnest(array['harry','laura','jerry','dilbert']) a, unnest(array['career_offering','market_term']) k
on conflict do nothing;
