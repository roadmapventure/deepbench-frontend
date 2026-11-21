-- AGT-781 (v7.0.1106) -- three company knowledge records and their pins. MIRROR of the migration
-- `agt781_company_knowledge_records`, applied by the orchestrator over the Supabase connector (apply_migration wraps
-- the text above the down marker in ONE transaction, so the trailing GATE's RAISE rolls every statement back).
-- Kickoff: docs/kickoffs/v7.0.1106-AGT-781-company-knowledge-records.md; reasoning: docs/harvests/AGT-781.md.
--
-- GENERATED, NEVER TYPED. The three record texts are taken from docs/design/RMV-COMPANY-PROFILE-1121.md sections
-- 9a, 9b and 9c by the generator in the harvest (S1): the "Source:" and "Closing line:" lines dropped, a trailing
-- "(The principal ...)" note stripped from a line, and section 9a's closing rule appended to each record.
--
-- WHAT IT WRITES, all INSERTs: 55 before-images (row_data NULL = an INSERT) under the two decisions the orchestrator
-- recorded just before the apply, 3 public.skill_profiles rows (type knowledge, traits source inline, tenant NULL --
-- the north star's own shape) and 52 public.agent_skill_pins rows (17 agents x 3 records at display_order 10, 11, 12,
-- plus one north-star pin at 0). It updates nothing: agents.is_active is untouched, the north star row is untouched,
-- and the agent paul-dy86jo gets no pin.
--
-- Row ids are derived, md5('AGT-781/skill/' || slug)::uuid and md5('AGT-781/pin/' || agent_id || '/' || slug)::uuid,
-- so the before-images, the rows and the down below name the same rows without a list of typed uuids.
--
-- THE UNDO IS ATTENDED. public.reverse_decision() restores skill_profiles and not agent_skill_pins, and the pin
-- table's foreign key (no cascade) refuses removing a record while a pin points at it. The undo is the two
-- statements under the down marker at the foot of this file, pins first; each leads with a word the connector asks a
-- human about, so an unattended cycle never sends them.

-- 1. Before-images first.
insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select d.cycle_id, d.session_name, 'skill_profiles', md5('AGT-781/skill/' || s.slug)::uuid::text, null, d.id
  from (select id, cycle_id, session_name from public.runner_decisions
         where backlog_id = 'AGT-781' and kind = 'agent-row' and status = 'open' and summary like 'AGT-781 records:%'
           and decided_at > now() - interval '2 hours'
         order by decided_at desc limit 1) d
 cross join (values ('rmv-company-profile'), ('rmv-offerings'), ('rmv-consulting-automation')) s(slug);

insert into public.runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
select d.cycle_id, d.session_name, 'agent_skill_pins', md5('AGT-781/pin/' || p.agent_id || '/' || p.slug)::uuid::text, null, d.id
  from (select id, cycle_id, session_name from public.runner_decisions
         where backlog_id = 'AGT-781' and kind = 'agent-row' and status = 'open' and summary like 'AGT-781 pins:%'
           and decided_at > now() - interval '2 hours'
         order by decided_at desc limit 1) d
 cross join (select a.agent_id, r.slug, r.ord
          from unnest(array['architect', 'auditor', 'builder', 'designer', 'devmanager', 'dilbert', 'harry', 'jerry', 'laura', 'nathan', 'prioritizer', 'researcher', 'ticketowner', 'trenton', 'verifier', 'victoria', 'malcolm']) a(agent_id)
         cross join (values ('rmv-company-profile', 10), ('rmv-offerings', 11), ('rmv-consulting-automation', 12)) r(slug, ord)
        union all select 'malcolm', 'deepbench-north-star', 0) p;

-- 2. The three records.
insert into public.skill_profiles (id, slug, name, description, skill_type_slug, objective, method, traits)
values (md5('AGT-781/skill/' || 'rmv-company-profile')::uuid, 'rmv-company-profile', 'RMV Company Profile',
  'The company''s own description of itself, client-free. One row, pinned to the product-team agents. Text approved by the principal 2026-11-21.',
  'knowledge', 'RMV company profile: what the company does, its two practices, three products, services, numbers and wording rules',
  $rec$1. **What RMV does.** RoadMap Venture (RMV) architects and builds AI products end to end: agents, data platforms, and the governance to run them.
2. **Two practices.**
   - AI product management across industries. The problem: AI agents drift, forget what they learn, struggle to carry domain expertise, and stay locked in one AI client. Customers drive new revenue by licensing the use of their self-built domain expert agent.
   - GovTech, for state and local government, with the same AI and data product. The problem: every system exports its own report and none combines them into one view leadership trusts. RMV turns the exports an agency already has into full procurement analysis, AI dashboards and KPIs. A benefit of the dashboards is that they do not need a data warehouse. As part of the services offered, RMV can help design and model a data warehouse if the customer wants one.
3. **Three products.**
   - DeepBench: a multi-agent AI platform for building, running and governing specialized AI agents, available over MCP.
   - Procurement Intelligence: a procurement analytics platform for state and local government: spend analysis, KPI dashboards and AI agents built from an agency's reports or system exports.
   - Procurement KPI Library: a curated catalog of procurement KPIs and assessment questions for state and local government, with KPI Packs, a five-level maturity scale, and every KPI tagged Inform, Track or Act.
4. **Services.** Product management from 0 to 1 and scaling a roadmap strategy: design, build and release.
   - AI: multi-agent build-out, governance; readiness assessments
   - Data practice: data platforms, custom dashboards, KPIs
   - Enterprise SaaS: design and implementation
   - Fractional staff augmentation
   - Specialties: GovTech procurement technology and data assessments; strategic sourcing (procurement KPIs, spend analysis and analytics)
5. **Numbers.**
   - In anything public: "500+ KPIs", "200+ assessment questions", "nearly 90 published sources".
   - Measured at release 50 (2026-11-20): 560 KPIs, 215 questions, 91 organizations, 501 publications.
   - RMV has contributed 80+ measures to the library: 26 KPIs RMV created, and 67 industry KPIs that carry an RMV-defined measure.
6. **Wording rules.**
   - Say "practice", never "division".
   - A product is a product or a platform, never a service.
   - No client name or client data in anything public.
   - Every price reads "Contact sales". The principal alone sets prices, offers and what is published.

This record wins. If your evidence disagrees with a line here, flag it as a gap naming the line; do not state it differently.$rec$,
  '{"source":"inline"}'::jsonb);

insert into public.skill_profiles (id, slug, name, description, skill_type_slug, objective, method, traits)
values (md5('AGT-781/skill/' || 'rmv-offerings')::uuid, 'rmv-offerings', 'RMV Offerings',
  'The stated menu of services and products, client-free and without prices. One row, pinned to the product-team agents. Text approved by the principal 2026-11-21.',
  'knowledge', 'RMV offerings: the stated menu of services and products, and how it is sold',
  $rec$**Getting started**
- Public-Data Preview (free): a first look at an agency's procurement picture, peer comparison and expiring contracts, built from its own published data.

**Services**
- Assessments
  - Procurement Organization Assessment: systems, data, AI and KPIs; full scope or a single topic.
  - Data Centralization & Modernization: review of current systems and data, data modeling, and the design and modeling of a data warehouse if the customer wants one.
  - AI Readiness Assessment: organizational readiness, an AI use policy, and an adoption plan.
- Implementation
  - Implementation Management: oversight, guidance or hands-on delivery of an assessment's technology, data or AI recommendations.
  - Procurement Software Design & Development: requirements, design and build for new or existing procurement systems.
- Staff augmentation: fractional staffing delivered by RMV's founder himself, from individual contributor up to executive level, whatever the client's need.
- Training: staff training on dashboards, KPIs and AI tools, plus AI policy workshops.

**Products**
- Procurement dashboards and reporting: Executive Dashboards; Operations & Performance Dashboards; Analyzers (ready-made spend, contract, KPI and interview-findings analysis); Custom Dashboards; Managed Analytics (ongoing refreshes, quality checks and upkeep).
- Data centralization views: Contract, Supplier & Department Views (data from multiple systems joined into one searchable view); Living Assessment Portal (every assessment and deliverable in one hosted place, kept current after the engagement).
- Libraries and benchmarks: Procurement KPI Library (licensed or included in an assessment); Assessment Question Library; Peer Benchmark (an agency's KPIs compared with peer governments).
- AI agents, pilot stage: AI Search Agent; AI Procurement Assistant.
- Commodity-code platform services (proposal sent separately).

**How it is sold**
- An item can sit inside an association consulting engagement or be offered on its own.

This record wins. If your evidence disagrees with a line here, flag it as a gap naming the line; do not state it differently.$rec$,
  '{"source":"inline"}'::jsonb);

insert into public.skill_profiles (id, slug, name, description, skill_type_slug, objective, method, traits)
values (md5('AGT-781/skill/' || 'rmv-consulting-automation')::uuid, 'rmv-consulting-automation', 'RMV Consulting Automation',
  'What the company''s consulting automation is, what it gives an engagement and how a partner can deliver it. One row, pinned to the product-team agents. Text approved by the principal 2026-11-21.',
  'knowledge', 'RMV consulting automation: benefits and partnering',
  $rec$**What it is**
- These are RMV's own products and benefits. RMV delivers all of them directly, with or without a partner.
- RMV has automated consulting work into web products: interview notes, spend extracts and assessment drafts become validated KPIs, tech diagrams, visual insights and a client web portal.
- RMV believes 60% of an assessment's information is reusable across GovTech engagements.
- A consulting partner can deliver the same products under its own brand. RMV has proposed this to NIGP; it is a proposal, not a signed agreement.

**What it gives a consulting engagement**
- Speed: fieldwork to findings in days, not weeks.
- Margin: the analysis phases cost less every time.
- Differentiation: a client portal no competitor is offering, with all findings converted into dashboards.

**Why it works**
- Clients are asking for more: executives want follow-up, a return on the consulting investment, and transparency.
- Domain history and staffing are becoming scarce.
- A living assessment, not one-and-done.
- A partner's domain knowledge, powered by RMV, works anywhere and is both competitive and preferred.
- Complements a consulting partner with white-labeled product branding and services.
- Consultants move to leading strategy, with repeatability, not content assembly.
- A consulting partner does not have to hire a data team.

**What the client receives**
- The dashboard portal as a standard offer in RFP responses.
- New findings added anytime; updates and metrics are instant.
- First dashboard in under a week; no data lakehouse or integration costs; maintenance-free access.
- All project deliverables in one portal after the project ends, with AI as its information assistant.

**How the business grows, for RMV and for a partner**
- An annual subscription to dashboards and portal, tiered by refresh cadence; recurring revenue after the project ends.
- An AI agent subscription.
- A pipeline to the next project.
- Marketing: a client showcase, and past assessments or public datasets pre-loaded as a teaser.

**Where it leads**
- Industry-first AI consulting automation and a lower cost per engagement.
- A government procurement meta-dashboard: procurement data aggregated across governments.
- Industry insights, trends and benchmarking from the only organization with a deep dataset.
- A five-level maturity model: Reactive, Aware, Structured, Strategic, Intelligence-led.

**Proposed to NIGP**
- The commodity code server upgrade.

This record wins. If your evidence disagrees with a line here, flag it as a gap naming the line; do not state it differently.$rec$,
  '{"source":"inline"}'::jsonb);

-- 3. The 52 pins.
insert into public.agent_skill_pins (id, tenant_id, agent_id, skill_profile_slug, display_order)
select md5('AGT-781/pin/' || p.agent_id || '/' || p.slug)::uuid, 'global', p.agent_id, p.slug, p.ord
  from (select a.agent_id, r.slug, r.ord
          from unnest(array['architect', 'auditor', 'builder', 'designer', 'devmanager', 'dilbert', 'harry', 'jerry', 'laura', 'nathan', 'prioritizer', 'researcher', 'ticketowner', 'trenton', 'verifier', 'victoria', 'malcolm']) a(agent_id)
         cross join (values ('rmv-company-profile', 10), ('rmv-offerings', 11), ('rmv-consulting-automation', 12)) r(slug, ord)
        union all select 'malcolm', 'deepbench-north-star', 0) p;

-- 4. GATE: reads only. Any RAISE applies nothing.
do $gate$
declare n integer; bad text;
begin
  select count(*) into n from public.skill_profiles
   where slug in ('rmv-company-profile', 'rmv-offerings', 'rmv-consulting-automation') and skill_type_slug = 'knowledge' and traits->>'source' = 'inline' and tenant_id is null;
  if n <> 3 then raise exception 'GATE 1 records: % of 3', n; end if;
  select string_agg(s.slug, ', ') into bad from public.skill_profiles s
    join (values ('rmv-company-profile', 'f75e38ad85a1ee3b811a739dee5b2de6'), ('rmv-offerings', '3f5156283e521a62942097c2968d3669'), ('rmv-consulting-automation', '1a77b53425c4eaec780004221536e0d0')) e(slug, m) on e.slug = s.slug
   where md5(s.method) <> e.m;
  if bad is not null then raise exception 'GATE 2 record text differs from the approved text: %', bad; end if;
  select count(*) into n from public.agent_skill_pins where tenant_id = 'global' and skill_profile_slug in ('rmv-company-profile', 'rmv-offerings', 'rmv-consulting-automation');
  if n <> 51 then raise exception 'GATE 3 record pins: % of 51', n; end if;
  select count(*) into n from (select agent_id from public.agent_skill_pins
    where tenant_id = 'global' and skill_profile_slug in ('rmv-company-profile', 'rmv-offerings', 'rmv-consulting-automation') group by agent_id having count(*) = 3) x;
  if n <> 17 then raise exception 'GATE 4 agents holding all three: % of 17', n; end if;
  select count(*) into n from public.agent_skill_pins
   where agent_id = 'malcolm' and skill_profile_slug = 'deepbench-north-star' and display_order = 0 and tenant_id = 'global';
  if n <> 1 then raise exception 'GATE 5 north-star pin: % of 1', n; end if;
  select count(*) into n from public.agent_skill_pins where agent_id = 'paul-dy86jo';
  if n <> 0 then raise exception 'GATE 6 an agent outside the ruling holds % pin(s)', n; end if;
  select count(*) into n from public.runner_before_images b join public.runner_decisions d on d.id = b.decision_id
   where d.backlog_id = 'AGT-781' and d.kind = 'agent-row' and b.row_data is null
     and (b.pk_value in (select md5('AGT-781/skill/' || s.slug)::uuid::text from (values ('rmv-company-profile'), ('rmv-offerings'), ('rmv-consulting-automation')) s(slug))
       or b.pk_value in (select md5('AGT-781/pin/' || p.agent_id || '/' || p.slug)::uuid::text from (select a.agent_id, r.slug, r.ord
          from unnest(array['architect', 'auditor', 'builder', 'designer', 'devmanager', 'dilbert', 'harry', 'jerry', 'laura', 'nathan', 'prioritizer', 'researcher', 'ticketowner', 'trenton', 'verifier', 'victoria', 'malcolm']) a(agent_id)
         cross join (values ('rmv-company-profile', 10), ('rmv-offerings', 11), ('rmv-consulting-automation', 12)) r(slug, ord)
        union all select 'malcolm', 'deepbench-north-star', 0) p));
  if n <> 55 then raise exception 'GATE 7 before-images: % of 55 -- were the two decisions recorded first?', n; end if;
  select count(*) into n from public.skill_profiles
   where slug = 'deepbench-north-star' and md5(method) = 'bf8ea1d7697b17c2ea189b2ea64241ea';
  if n <> 1 then raise exception 'GATE 8 the north star row moved'; end if;
end
$gate$;

-- down
-- ATTENDED ONLY, pins first. Never sent by an unattended cycle.
delete from public.agent_skill_pins where id in (
  select md5('AGT-781/pin/' || p.agent_id || '/' || p.slug)::uuid from (select a.agent_id, r.slug, r.ord
          from unnest(array['architect', 'auditor', 'builder', 'designer', 'devmanager', 'dilbert', 'harry', 'jerry', 'laura', 'nathan', 'prioritizer', 'researcher', 'ticketowner', 'trenton', 'verifier', 'victoria', 'malcolm']) a(agent_id)
         cross join (values ('rmv-company-profile', 10), ('rmv-offerings', 11), ('rmv-consulting-automation', 12)) r(slug, ord)
        union all select 'malcolm', 'deepbench-north-star', 0) p);
delete from public.skill_profiles where id in (
  select md5('AGT-781/skill/' || s.slug)::uuid from (values ('rmv-company-profile'), ('rmv-offerings'), ('rmv-consulting-automation')) s(slug));
