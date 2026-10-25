-- DeepBench v7.0.898 | docs/design/agt-470-corrections.sql | AGT-470 — T4, the corrections the new
-- writer exists for: the EIGHT corrections `docs/research/2026-10-10-weekly-market.md` found and
-- could only report, applied through `public.apply_claim_recheck(uuid, text, jsonb)` with
-- `p_cycle` = this cycle and `p_session` NULL.
--
-- EIGHT CORRECTIONS, ELEVEN CALLS, ELEVEN ROWS — the arithmetic, stated because the kickoff's §5
-- says "the EIGHT calls" and its §2 says "T4's 11 rows". Both are true of the same work and neither
-- is narrowed here: the research doc carries EIGHT cited corrections (four claims, and four verdict
-- lines at L129 / L130 / L132 / L133), and those four verdict lines name SEVEN `market_records` ids
-- between them, because the 2026-10-05 and 2026-10-07 scans each filed a row for the same
-- competitor. `apply_claim_recheck` takes ONE `ref` per call, so eight corrections over eleven rows
-- is eleven calls — 4 + 2 + 2 + 1 + 2. Narrowing to eight calls would leave three of the seven
-- records wrong, and kickoff T3 arm B asserts all seven are retired and superseded.
--
-- WORDING PROVENANCE. Every corrected wording below is the research doc's own sentences from the
-- lines the kickoff cites, with markdown emphasis and backticks dropped (the two stores hold plain
-- prose; no claim_text or body in either carries markdown) and with the referent of a pronoun
-- spelled out where the sentence was lifted out of its heading. Three sentences are quoted SHORT of
-- their full form on purpose, and each is named at its call: a replacement row may not carry the
-- wrong string it exists to remove, because `scripts/market-agent.js` renders `title`, `body` and
-- `data` straight into the competitor prompt, so quoting "not 2026-10-05 as the record is dated"
-- into the fix would put the wrong date back in the prompt the fix is for.
--
-- Each call's returned decision uuid is recorded beside it, read back from the live call.
-- `record_decision`'s handle is `AGT-470` on every one of them, never the claim_ref — §4's rule and
-- `runner_decisions_backlog_id_check`'s shape.

-- =====================================================================================================
-- CLAIMS — `public.vision_claims`, four `corrected` rechecks. `judgment_class` is never passed and
-- never touched (§2 call 4): `VC-MAP-039`'s class stays `P2 - Inventive` even though its Test 1
-- narrowed, and `ck_vision_claim_class` takes only the four named forms. `confidence` is not passed
-- either — nothing in the research doc asks for it to move, and an unrequested change is a defect.
-- =====================================================================================================

-- CALL 1 — VC-MAP-037, L44-58. Test 3's stated mechanism decayed; the narrower form holds.
-- decision_id: 665da9c0-4d9a-4d47-bfae-cc1f56dc95d7
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'claim', 'ref', 'VC-MAP-037', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L44-58: the stated API-revenue conflict is not a conflict after OpenAI's 2026-09-29 DevDay, so Test 3's mechanism decayed; the mass-market-design form still holds, with a 12-month obsolescence trigger.$r$,
  'claim_text', $w$Candidate - Deliverable marketplace. DECAYED as written; holds in a narrower form. The stated conflict is not a conflict, so the mechanism fails C-MAP-64's "name the actual reason" bar. What still holds is mass-market design: a consumer store sells prompts and apps, never work product carrying a named, trained seller and an audit trail. Obsolescence trigger (C-MAP-71), 12 months: OpenAI ships paid dots with a creator revenue share.$w$
)) as decision_id;

-- CALL 2 — VC-MAP-038, L60-75. The verdict survives; the verification line it was filed on does not.
-- decision_id: f7ddeec2-cb27-4b1f-bd1a-f305a2d0b918
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'claim', 'ref', 'VC-MAP-038', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L60-75: the 2026-09-11 UNIQUE verification named four products that are not in the C-MAP-30 competitor set, so it tested the wrong set; this pass is the first against the right one and the verdict survives it, with two 2026-10 decay signals.$r$,
  'claim_text', $w$Candidate - Self-building platform's public governance record. HOLDING, with a correction and two decay signals. Mechanism: liability and disclosure. None of Copilot, ChatGPT or Claude publishes a per-change record of which agent proposed, ruled on and built a change in a live product. The catalog recorded this entry as adversarially verified UNIQUE against named competitors 2026-09-11 (Claude Code, Agno, Made by AiMe, Paperclip). Not one of those four is in the C-MAP-30 competitor set, which is Copilot, ChatGPT and Claude. The verification the catalog leans on tested the wrong set. This pass is the first to test the right one, and the verdict survives it. Decay signals, both this week: Anthropic published a report documenting four categories of unintended model actions (2026-10-09), and Microsoft published a "Customer Zero" guide on how its own staff build governed agents. Both are periodic self-governance records, not per-decision ones, so the lane is not closed. This verdict needs its next recheck sooner than the others.$w$
)) as decision_id;

-- CALL 3 — VC-MAP-039, L77-83 + L98-102. Test 3 holds, Test 1 narrowed by AGT-399 / AGT-409.
-- decision_id: 21dde31a-c3f5-48a1-9ad3-6ba9046abf63
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'claim', 'ref', 'VC-MAP-039', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L77-83 and L98-102: Test 3 still passes on mass-market design, the grounding it leaned on was misattributed, and AGT-399 / AGT-409 shipped the display half this week, so Test 1 narrows to the agent's own derived account - the AGT-418 / AGT-251 lane, not a new ticket.$r$,
  'claim_text', $w$Candidate - Training provenance display, knowledge-freshness, and domain-coverage transparency. HOLDING on Test 3; grounding wrong, Test 1 narrowed. Mechanism: mass-market design. Checked against each competitor's own launch coverage: dots show a watchable cloud browser and an auto-review gate for account-touching actions; Muse for Small Business shows owner approval before posting or buying; Grok Bot teaches a routine by demonstration and "takes your corrections". None of them shows what the agent was taught, by whom, when, or what it does not know. Test 3 passes. Test 1 has narrowed this week. AGT-399 (every Skill visible read-only) and AGT-409 (the Skill editor) shipped, so the display half of this lane is now built, and Test 1 says deepening something already built is P5 - Enhancements, never P2. What remains unbuilt is narrower and stronger: the agent's own derived account of what it was taught, by whom, and what it was not - which is the AGT-418 / AGT-251 lane (both open, both P4), not a new ticket.$w$
)) as decision_id;

-- CALL 4 — VC-MAP-072, L85-96. The one call that rewrites `provenance` as well as `claim_text`: the
-- citation WAS the claim's provenance, and it was wrong. After this call `claim_text` no longer holds
-- the misattribution and `provenance` names Gravitee (kickoff T3 arm B reads exactly that pair).
-- decision_id: b2fbf1ad-7adb-488f-80b5-8be484d70bae
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'claim', 'ref', 'VC-MAP-072', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L85-96: both figures were credited to the wrong source - the Fortune piece (2026-03-26) carries neither - and both come from Gravitee's own sponsored survey. The gap itself survives on independent VentureBeat evidence, so only the citation was wrong.$r$,
  'claim_text', $w$Competitive intel - the accountability gap is real and current, but the citation it was filed on is wrong. The grounding is misattributed, and it is load-bearing. Rechecked: the Fortune piece (2026-03-26) carries neither figure - its actual line is "Intelligence may be scalable, but accountability is not." Both figures come from Gravitee's own "State of AI Agent Security 2026" survey, published via a Gravitee-sponsored TechCrunch post - a governance vendor's self-published marketing survey, not independent reporting. The premise nevertheless survives the correction, on better evidence found this run: VentureBeat reports 85% of IT teams claim every AI agent is under control while only 42% say ownership is clear. The gap's shape is independently corroborated; only the citation was wrong.$w$,
  'provenance', $w$Gravitee's own "State of AI Agent Security 2026" survey, published via a Gravitee-sponsored TechCrunch post - a governance vendor's self-published marketing survey, not independent reporting. Independent corroboration: VentureBeat, 85% of IT teams claim every AI agent is under control while only 42% say ownership is clear. Recheck source: docs/research/2026-10-10-weekly-market.md L85-96.$w$
)) as decision_id;

-- =====================================================================================================
-- RECORDS — `public.market_records`, retire + SAME-`kind` replacement carrying `supersedes` (§2 call
-- 2). All seven are `kind` `competitor`, `status` `draft` on this tree; each replacement is a
-- `competitor` `draft` row whose `supersedes` is the id it replaces. `kind` `correction` is never
-- used: that kind is `scripts/market-agent.js`'s separate capability-scoped correction channel.
-- =====================================================================================================

-- CALLS 5-6 — L129, dots, `corrected`. The wrong launch date is the whole correction, so the
-- replacement body carries the RIGHT date and does NOT quote the clause "not 2026-10-05 as the
-- record is dated": `RECORD_FIELDS` renders the body into the competitor prompt, and quoting the
-- wrong date into the fix would leave it in the prompt. The retired row still carries it.
-- decision_id (f7b18516-1495-49cf-a12a-08acb0ae724e): 57c39c87-4f86-45ab-a6a9-10366b24112b
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'f7b18516-1495-49cf-a12a-08acb0ae724e', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L129: the record dated the dots launch to its own scan week; dots launched at DevDay 2026-09-29. Pricing stays unresolved between two disagreeing sources.$r$,
  'title', $w$OpenAI dots - always-on ChatGPT agents$w$,
  'body',  $w$Confirmed, date wrong. Rechecked 2026-10-10: dots launched at DevDay 2026-09-29 - persistent always-on agents in ChatGPT. Pricing sources disagree with each other (a $500/mo plan vs. "first dot included on Pro/Business Premium/Enterprise") - unresolved. This row supersedes the market-scan row that carried the wrong launch date.$w$
)) as decision_id;

-- decision_id (17a93705-d759-49a1-899a-b7f5cff58e32): 78fa66b6-563e-4ba1-9405-6b5807534e92
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '17a93705-d759-49a1-899a-b7f5cff58e32', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L129: the record dated the dots launch to its own scan week; dots launched at DevDay 2026-09-29. Pricing stays unresolved between two disagreeing sources.$r$,
  'title', $w$OpenAI dots - always-on ChatGPT agents$w$,
  'body',  $w$Confirmed, date wrong. Rechecked 2026-10-10: dots launched at DevDay 2026-09-29 - persistent always-on agents in ChatGPT. Pricing sources disagree with each other (a $500/mo plan vs. "first dot included on Pro/Business Premium/Enterprise") - unresolved. This row supersedes the market-scan row that carried the wrong launch date.$w$
)) as decision_id;

-- CALLS 7-8 — L130, Grok Bot, `corrected`. The product name is the wrong fact, so neither the new
-- title nor the new body repeats it; the body says which name failed to resolve instead. Verbatim
-- kept: "The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition
-- ~$120/seat/mo."
-- decision_id (205c364a-b675-4990-86ea-b20cb1f94e3a): f062a325-9ac9-4010-bdea-4fd0ea08b723
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '205c364a-b675-4990-86ea-b20cb1f94e3a', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L130: the enterprise product name this record carried could not be found anywhere; the product itself is confirmed. The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition about $120 per seat per month.$r$,
  'title', $w$Grok Bot (SpaceXAI) - agent teams and a waitlisted enterprise tier$w$,
  'body',  $w$Product confirmed; the name is not. No product under the enterprise name this record was filed with could be found. The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition ~$120/seat/mo - agent teams on cloud computers that teach a routine by demonstration and take your corrections. This row supersedes the market-scan row that carried the name that does not exist.$w$
)) as decision_id;

-- decision_id (901bea5e-1d3d-45cc-b76b-087b85c54714): 52e8fd54-fcc8-4024-a30e-b7d3ff06c78f
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '901bea5e-1d3d-45cc-b76b-087b85c54714', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L130: the enterprise product name this record carried could not be found anywhere; the product itself is confirmed. The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition about $120 per seat per month.$r$,
  'title', $w$Grok Bot (SpaceXAI) - agent teams and a waitlisted enterprise tier$w$,
  'body',  $w$Product confirmed; the name is not. No product under the enterprise name this record was filed with could be found. The real shape is Grok Bot, beta 2026-08-12, a waitlisted enterprise tier, Team Edition ~$120/seat/mo - agent teams on cloud computers that teach a routine by demonstration and take your corrections. This row supersedes the market-scan row that carried the name that does not exist.$w$
)) as decision_id;

-- CALL 9 — L132, Hazel AI, `corrected`. The module name is the wrong fact, so the new title drops it
-- and the new body names what the directory line actually says.
-- decision_id (0d58cf7f-e4c6-4146-856a-68dabc642875): 6352f0c8-0d17-462e-8dcf-b2d15286c661
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '0d58cf7f-e4c6-4146-856a-68dabc642875', 'verdict', 'corrected',
  'reason', $r$Recheck 2026-10-10 L132: Hazel AI and its city business are confirmed, but the named module this record carried does not exist - only a third-party directory line about real-time spending visibility and alerts.$r$,
  'title', $w$Hazel AI - AI procurement workflow for cities$w$,
  'body',  $w$Company confirmed, module not. Hazel AI is real and sells to cities (Dallas partnership for solicitation drafting, vendor identification and compliance; Carahsoft-listed). The named module this record was filed with does not exist - only a third-party directory line about "real-time spending visibility and alerts". It is the vertical incumbent VC-LRN-058 warned about in the Test 6 starting market. This row supersedes the market-scan row that carried the module that does not exist.$w$
)) as decision_id;

-- CALLS 10-11 — L133, Reinventing.AI, `unverified`. The site was unreachable, so the replacement
-- body says unconfirmed lead rather than fact. Each row keeps its OWN title (no `title` is passed,
-- so the writer coalesces the retired row's) because neither title carries a wrong fact.
-- decision_id (ec7d8dfb-72c6-49d3-a887-4b75ea49dbdd): 1dfadc00-5d01-4043-a520-e6405457a4d5
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'ec7d8dfb-72c6-49d3-a887-4b75ea49dbdd', 'verdict', 'unverified',
  'reason', $r$Recheck 2026-10-10 L133: the Reinventing.AI site was unreachable from the recheck session, so this row stays an unconfirmed lead, not a fact.$r$,
  'body', $w$UNVERIFIED. The site was unreachable from this session. This record stays an unconfirmed lead, not a fact. Nothing in it has been contradicted and nothing in it has been confirmed; it is kept as a lead to re-check when the site answers. This row supersedes the market-scan row that read as a confirmed draft.$w$
)) as decision_id;

-- decision_id (31608e02-2a77-4fd6-a170-8fedaaa6209b): cd8708a6-de42-475e-ace7-a8f026812b3b
select public.apply_claim_recheck('2b16018e-78b5-4bda-bac9-15268ad6e5cb'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '31608e02-2a77-4fd6-a170-8fedaaa6209b', 'verdict', 'unverified',
  'reason', $r$Recheck 2026-10-10 L133: the Reinventing.AI site was unreachable from the recheck session, so this row stays an unconfirmed lead, not a fact.$r$,
  'body', $w$UNVERIFIED. The site was unreachable from this session. This record stays an unconfirmed lead, not a fact. Nothing in it has been contradicted and nothing in it has been confirmed; it is kept as a lead to re-check when the site answers. This row supersedes the market-scan row that read as a confirmed draft.$w$
)) as decision_id;
