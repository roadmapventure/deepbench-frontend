<!-- DeepBench v7.0.171 | docs/vision/customer.md | SES-133 — C-CUST-20 ratified LOW -> HIGH on John's Yes of 2026-08-23T00:40Z, same §12 rule and same stamp form as current-mission.md's C-mission-6 in this ship. Worth noting for whoever reads this claim next: "customer zero is John himself" moving from LOW to HIGH is the self-replication thread (C-mission-8, the Recruiter agent) gaining John's own confirmation on the customer side, not just the mission side. Claim text unchanged. -->
<!-- DeepBench v7.0.134 | docs/vision/customer.md | SES-84 phase 1 — Claude's best-inference draft, 2026-08-21. NOTHING here is ratified until John's tap; confidence marks are the drip queue. -->

# Customer — Who Actually Uses, Evaluates, and Would Pay for DeepBench

Defines **P4 - New Customers** concretely: who would pay or adopt, for what job-to-be-done.

## Who is on the platform today (evaluators, not payers)

- [C-CUST-1] (HIGH) Today's primary "user" is an evaluator, not a customer: Apple reviewers and hiring-side technical leaders assessing John's work. — *grounds:* John 2026-07-22: "beta means sending deepbench over to apple to see my work building a multi-agent platform and they will want to hire me."
- [C-CUST-2] (HIGH) The evaluator persona John designs surfaces for: "chief architects and senior developers, and senior product managers… I want the skeptic audience to feel at ease." — *grounds:* John 2026-08-20 (About screen redesign).
- [C-CUST-3] (HIGH) A second evaluator persona is opportunistic: "something that would look good if apple caught my post, or it ran past a chief architect of an ai company looking to hire a product role like this." — *grounds:* John 2026-07-24.
- [C-CUST-4] (HIGH) The scripted in-product user is a VP of Channel Sales at Apple asking strategic business questions of the CHI screen. — *grounds:* John 2026-07-09: "come up with the top 20 business questions apple is most likely to ask to run a channel business sales organization, acting as a VP of channel sales"; same day: "if you were apple looking over this, a vp in the channel sales department."
- [C-CUST-5] (HIGH) Real visitors are a small, known, hand-admitted set: private beta behind an IP gate with a $5 spend cap; unknown visitors must email John for access. — *grounds:* ARCHITECTURE.md §19t (IP Access Gate, 2026-08-08); John 2026-08-19 (block-popup copy: "DeepBench is in private beta. Contact John…").
- [C-CUST-6] (HIGH) John expects the earliest genuine adopters to arrive through personal channels, not self-serve: "The true users will know how to get a hold of me. I don't want to expose my email to everyone." — *grounds:* John 2026-08-08.
- [C-CUST-7] (MED) There is no organic paying-demand signal yet: traffic attribution shows John himself plus a handful of labeled visitors; all customer definitions in this doc are forward-looking. — *grounds:* memory `reference-visitor-attribution.md` (dev-URL=John rule, visitor ledger); inference — treat as honest baseline, not a criticism.

## The job-to-be-done (John's own definition)

- [C-CUST-8] (HIGH) The platform's job: "prove the platform can create agents to do the job of any data or business analyst, project manager, or product manager." — *grounds:* John 2026-07-16 (verbatim).
- [C-CUST-9] (HIGH) The deliverable the customer buys: "a team of experts that can take a strategic business question, find data in the library, and give you a management consultant advice of what to do next." — *grounds:* John 2026-07-16 (same message).
- [C-CUST-10] (HIGH) The customer must see how the work is built, not just the answer — John's contractor analogy: with a house "you got to see the purpose and tangible output of the individual contributors"; DeepBench must show the deliverable being assembled. — *grounds:* John 2026-07-16; locked as §19r/§19s (Deliverable Build View, Assembly Content Contract).
- [C-CUST-11] (HIGH) The one-line value proposition to the paying customer: "Your team, without the headcount or loss of domain knowledge." — *grounds:* ARCHITECTURE.md §0 [LOCKED].
- [C-CUST-12] (HIGH) Work surfaces are per-work-type dashboards, implying the customer is defined by the kind of work they run: "channel sales, spend analysis, project management, etc." — *grounds:* John (session archive, Work-dropdown design): "All these screens under the 'Work' drop down are considered individual dashboards… depending on the type of work you are conducting."
- [C-CUST-13] (MED) Quality bar the customer experiences: answers end-to-end in under ~2 minutes, all charts rendering, no choreography-without-substance — speed and continuity are part of the product promise. — *grounds:* John 2026-07-28: "I can't get anything to answer within a considerable timeline, which at this point should be under 2 minutes."

## Who would pay (the named segments)

- [C-CUST-14] (HIGH) Documented target segments: businesses, consultants, software companies, and government agencies; organizations wanting AI-augmented data analysis/cleanup, document automation, web research, workflow intelligence. — *grounds:* `docs/DeepBench-Business-Context.md` "Who It's For".
- [C-CUST-15] (HIGH) The first paying customers are planned as 2–3 agencies, sequenced after beta testers (friends/trusted contacts) and alongside an NIGP partnership. — *grounds:* Business-Context "Near-Term Milestones" 3–5.
- [C-CUST-16] (MED) The highest-conviction paying vertical is government procurement analytics — DeepBench's lineage (NIGP Spend Analyzer live at nigp.roadmapventure.com, John's 20+ years govtech) and NIGP relationship give it a beachhead no horizontal agent product has. — *grounds:* Business-Context "Origin" + "Key Relationships"; inference.
- [C-CUST-17] (MED) Apple functions as a customer-shaped prospect too, not only an employer: John asked what a channel-sales VP would need "for a mvp and v1 release" — the demo doubles as a real product-requirements probe for a channel-sales buyer. — *grounds:* John 2026-07-09; inference on dual role.
- [C-CUST-18] (LOW) A secondary future customer is the capability buyer rather than the platform buyer: Competencies/Capabilities sold individually (MCP-accessible, priceable) to teams who never adopt the full workbench. — *grounds:* John 2026-07-15 ("both individually marketable in the future"); §0b Capabilities definition; inference.
- [C-CUST-19] (MED) The buyer persona to convince is a procurement director AND a VP of Product simultaneously — the repo's own design test. — *grounds:* ARCHITECTURE.md §0: "Does this impress a procurement director AND a VP of Product reviewing John's portfolio?"
- [C-CUST-20] (HIGH) (ratified 2026-08-23) John's long-term "customer zero" is himself: an agent trained on his own knowledge generating reports and research on his behalf — the self-replication vision. — *grounds:* Business-Context "Long-term personal vision"; ratified by John on the briefing page 2026-08-23T00:40Z.

## What P4 - New Customers means concretely (feature classes that win adopters)

- [C-CUST-21] (MED) P4 features let a stranger succeed unaided: onboarding, guided first question, self-serve data upload into the Library — today every successful run presumes John-curated data and hand-granted access. — *grounds:* inference from §19t gate + Apple-demo curation; C-CUST-5.
- [C-CUST-22] (MED) P4 features generalize beyond the Apple channel-sales demo: a second working domain dashboard (spend analysis is the named next one) proves the platform is a platform. — *grounds:* C-CUST-12 quote; Business-Context origin in spend analysis; inference.
- [C-CUST-23] (MED) P4 features make trust legible to a non-technical buyer: sources/citations on answers, confidence tiers, the honest audit surface in customer language — the same surfaces that serve diligence (P3) serve buyer trust. — *grounds:* John's citation/confidence-tier corrections (2026-08-07 Owen Marsh verification example); inference.
- [C-CUST-24] (MED) P4 features reduce time-to-value: under-2-minute answers, mobile access (John: "how much work is it to have you build deepbench as an apple mobile app?" 2026-08-10), and reliability (no dead controls) are adoption features, not polish. — *grounds:* C-CUST-13; John 2026-08-10.
- [C-CUST-25] (LOW) P4 eventually includes pricing/packaging surfaces (plans, seat or capability pricing, usage billing) — none exist today, and none is needed until a first payer archetype is ratified. — *grounds:* inference; $5-cap ledger (§19t) is the only billing-shaped mechanism in the platform.
- [C-CUST-26] (MED) Anti-P4: features aimed at impressing the skeptical architect (P1/P3 evaluator) do not automatically serve a payer; P4 classification requires naming which paying segment's workflow the feature advances. — *grounds:* inference from the P-class separation John locked 2026-08-19 (§19v).

## Open questions for John

1. Who is the first real paying-customer archetype: a procurement agency via NIGP, a channel-sales org (the Apple demo shape), or a consultant reselling deliverables?
2. Is Apple only an employer audience, or also a genuine customer prospect for CHI?
3. Do the friends/trusted-contacts beta testers ever convert to paid, or are they purely feedback sources?
4. Would you sell Capabilities/Competencies à la carte (MCP marketplace-style) before selling platform seats — or is the platform always the unit of sale?
5. What would a first customer pay for one delivered answer/deliverable — do you think in seats, usage, or per-deliverable pricing?
6. Should P4 work wait until after the Apple/beta milestone, or should the runner start P4 tickets (onboarding, second domain) now?
