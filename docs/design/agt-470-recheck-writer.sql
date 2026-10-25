-- DeepBench v7.0.898 | docs/design/agt-470-recheck-writer.sql | AGT-470 — migration
-- `agt470_recheck_writer`, mirrored byte-identical between the MIGRATION markers below.
--
-- What: the weekly recheck gains a WRITER. The Researcher rechecks `public.vision_claims` and
-- `public.market_records` but has had no write path to either, so a recheck that finds a wrong fact
-- could only report it — live 2026-10-10 that left eleven rows wrong in the two stores the catalog
-- and the competitor prompts are read from (`docs/research/2026-10-10-weekly-market.md`). This
-- migration creates ONE function, `public.apply_claim_recheck(uuid, text, jsonb)`, shaped on
-- `public.apply_ticket_validation(uuid, text, jsonb)` (`docs/design/agt-493-stale-validation.sql`
-- L171-250): every rule before any write, then ONE `record_decision` row, then the full-row
-- `runner_before_images` row, then ONE `UPDATE` by id.
--
-- Premise measured on this tree before the build, not recalled:
--   * `GET rpc/apply_claim_recheck` → 404 `PGRST202`; `pg_proc` holds 0 overloads of the name.
--   * `array_length(public.reversible_tables(), 1)` = 17, `vision_claims` on it, `market_records`
--     not — unchanged by this migration (§2 call 1).
--   * the four claims (`VC-MAP-037/038/039/072`) and the seven `market_records` rows T4 names are
--     all live and uncorrected; all seven records are `kind` `competitor`, `status` `draft`.
--
-- The five designer calls this file implements (kickoff §2, JOHN-0925-DESIGNER-DECIDES, reversible):
--   1. `reversible_tables()` stays 17 — not widened. So the CLAIM half reverses through
--      `reverse_decision()` and the RECORD half reverses through the table's own `supersedes`
--      chain: the retired row is never destroyed, and the replacement points back at it. That is
--      why the record branch retires-and-replaces instead of rewriting in place.
--   2. A corrected record is a SAME-`kind` replacement row carrying `supersedes`, never
--      `kind = 'correction'` (`market_records_kind_check` allows `correction`; that kind is the
--      capability-scoped correction channel `scripts/market-agent.js` reads separately, and using
--      it here would file a correction ABOUT a competitor instead of a corrected competitor).
--   3. Recheck dates ride `provenance` on a claim and the row's own `data` jsonb on a record. No
--      `ALTER TABLE` anywhere: `market_records` has no `provenance` column, and `data` is the
--      column the table already carries its own machine stamps in.
--   4. `judgment_class` is never touched — `ck_vision_claim_class` takes only the four named forms
--      and `VC-MAP-039`'s class stays `P2 - Inventive`. The claim branch therefore writes
--      `claim_text`, `provenance`, `confidence` and `updated_at` and nothing else; `status`,
--      `judgment_class`, `class_reason` and `classified_at` are outside its column list by
--      construction, not by convention.
--   5. `AA-30`'s grade is untouched here; T5 files the re-grade as its own P5 row.
--
-- ONE IMAGE PER CALL, and why the replacement INSERT carries none. §4 names one
-- `runner_before_images` row per call: the full row of the thing being changed. The replacement
-- `market_records` INSERT gets no image of its own because `market_records` is deliberately NOT on
-- `reversible_tables()` — `reverse_decision()` would refuse to replay it, so an image there buys
-- nothing (pattern:9) while the retired row plus `supersedes` already carries the whole undo.
--
-- Rule #1 holds: no row written here names another agent.

-- =====================================================================================================
-- T1(a) — the down capture. Run in the call IMMEDIATELY BEFORE `apply_migration`, never after: run
-- after, it captures the state the up just wrote, which is a down that restores the bug.
-- =====================================================================================================
-- Result, this ship: captured_up_name `agt470_recheck_writer`, captured_class `auto-downable`,
-- objects_captured 1, refusals 0. `apply_claim_recheck` did not exist yet, so the derived down is a
-- DROP by the full identity argument list — which is also what
-- `.claude/rules/supabase-function-signature.md` requires of any later signature change.
select * from public.capture_migration_down('2b16018e-78b5-4bda-bac9-15268ad6e5cb','agt470_recheck_writer',
 '[{"kind":"function","identity":"public.apply_claim_recheck(uuid, text, jsonb)"}]'::jsonb);

-- >>> MIGRATION agt470_recheck_writer BEGIN
-- =====================================================================================================
-- THE WRITER — the one write path of a recheck. R1-R5, every rule before any write.
-- =====================================================================================================
create or replace function public.apply_claim_recheck(p_cycle uuid, p_session text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  v_target   text := lower(btrim(coalesce(p ->> 'target', '')));
  v_ref      text := btrim(coalesce(p ->> 'ref', ''));
  v_verdict  text := lower(btrim(coalesce(p ->> 'verdict', '')));
  v_reason   text := btrim(coalesce(p ->> 'reason', ''));
  v_claim    public.vision_claims%rowtype;
  v_rec      public.market_records%rowtype;
  v_text     text;
  v_prov     text;
  v_conf     text;
  v_title    text;
  v_body     text;
  v_stamp    text;
  v_data     jsonb;
  v_decision uuid;
  v_new      uuid;
begin
  -- R1. Exactly one author, the same rule `record_decision()` and `runner_before_images` both carry.
  if (p_cycle is not null) = (p_session is not null) then
    raise exception 'apply_claim_recheck: exactly one of p_cycle / p_session must be set -- a recheck has exactly one author';
  end if;

  -- R2. A recheck without its reason is a stamp, and a stamp is what this ticket exists to replace:
  --     the whole point is that the catalog records WHY a fact moved, where the catalog is read.
  if v_reason = '' then
    raise exception 'AGT-470: a recheck carries its one-line reason';
  end if;

  -- R3. The vocabulary.
  if v_verdict not in ('holds', 'corrected', 'unverified') then
    raise exception 'AGT-470: verdict must be holds, corrected or unverified; got %',
      coalesce(p ->> 'verdict', '(none)') using errcode = 'check_violation';
  end if;

  -- R4. THE REF, resolved before anything is written. An unknown `target` lands on this same raise
  --     on purpose: "target is not one of the two" and "ref matched no row" are one fact — `p` names
  --     no row this writer can reach — and splitting them would leave a third, silent path where an
  --     unknown target falls through to a no-op that returns a decision handle for nothing.
  if v_target = 'claim' then
    select * into v_claim from public.vision_claims c where c.claim_ref = v_ref;
  elsif v_target = 'record' then
    -- The shape test is the cast guard: `v_ref::uuid` on a non-uuid raises 22P02 from the cast,
    -- which is a different refusal wearing this rule's clothes.
    if v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_rec from public.market_records m where m.id = v_ref::uuid;
    end if;
  end if;
  if v_claim.id is null and v_rec.id is null then
    raise exception 'AGT-470: p names no row to recheck -- target %, ref % (target is claim or record, ref a vision_claims.claim_ref or a market_records.id)',
      coalesce(nullif(v_target, ''), '(none)'), coalesce(nullif(v_ref, ''), '(none)');
  end if;

  -- The recheck stamp every branch below writes. §2 call 3: the recheck DATE rides the row's own
  -- stamp column, so no ALTER TABLE and no new knob.
  v_stamp := 'Rechecked ' || to_char(now(), 'YYYY-MM-DD') || ' (AGT-470, ' || v_verdict || '): ' || v_reason;

  -- R5. A `corrected` that corrects nothing. The text IS the correction: a same-text "correction"
  --     would move nothing while reading to every later session as a rewrite, and it would spend a
  --     reversible decision on a no-op. `holds` and `unverified` carry no such requirement —
  --     `holds` changes no text by definition, and an `unverified` record's replacement body is
  --     allowed to restate the lead it could not confirm.
  if v_target = 'claim' then
    v_text := coalesce(p ->> 'claim_text', v_claim.claim_text);
    v_prov := coalesce(p ->> 'provenance', v_claim.provenance);
    v_conf := coalesce(p ->> 'confidence', v_claim.confidence);
    if v_verdict = 'corrected' and v_text is not distinct from v_claim.claim_text then
      raise exception 'AGT-470: a corrected recheck of % carries claim_text that differs from the row''s', v_ref
        using errcode = 'check_violation';
    end if;
  else
    v_title := coalesce(p ->> 'title', v_rec.title);
    v_body  := coalesce(p ->> 'body',  v_rec.body);
    if v_verdict = 'corrected'
       and v_title is not distinct from v_rec.title
       and coalesce(v_body, '') = coalesce(v_rec.body, '') then
      raise exception 'AGT-470: a corrected recheck of % carries a title or body that differs from the row''s', v_ref
        using errcode = 'check_violation';
    end if;
  end if;

  -- ONE decision, the handle AGT-470 and never the claim_ref: the handle is what
  -- `runner_decisions_backlog_id_check` accepts and what a later `reverse_decision()` is called by,
  -- and `VC-MAP-072` is not a backlog id. The ref travels in the summary, where it belongs.
  v_decision := public.record_decision(p_cycle, p_session, 'claim-recheck', 'AGT-470',
    v_target || ' recheck: ' || v_ref || ' ' || v_verdict,
    v_reason, public.ladder_work_class('P9 - Bug Fixes'));

  if v_target = 'claim' then
    -- The full-row image FIRST (pk_value the uuid, pattern:169), then exactly ONE UPDATE by id, so
    -- one reverse_decision() puts the whole recheck back. `vision_claims` is on
    -- reversible_tables() and HAS updated_at, so that restore lands in `restored`.
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'vision_claims', v_claim.id::text, to_jsonb(v_claim), v_decision);

    if v_verdict = 'holds' then
      -- A verdict that changes no fact still changes what the catalog knows about itself: when it
      -- was last rechecked, and by which decision.
      update public.vision_claims
         set provenance = btrim(coalesce(v_claim.provenance || ' ', '') || v_stamp),
             updated_at = now()
       where id = v_claim.id;
    else
      update public.vision_claims
         set claim_text = v_text,
             provenance = btrim(coalesce(v_prov || ' ', '') || v_stamp),
             confidence = v_conf,
             updated_at = now()
       where id = v_claim.id;
    end if;
  else
    insert into public.runner_before_images
      (cycle_id, session_name, table_name, pk_value, row_data, decision_id)
    values
      (p_cycle, p_session, 'market_records', v_rec.id::text, to_jsonb(v_rec), v_decision);

    v_data := jsonb_build_object('recheck', jsonb_build_object(
      'ticket', 'AGT-470', 'verdict', v_verdict, 'reason', v_reason,
      'rechecked_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'decision_id', v_decision, 'supersedes', v_rec.id));

    if v_verdict = 'holds' then
      update public.market_records
         set data = coalesce(data, '{}'::jsonb) || v_data,
             updated_at = now()
       where id = v_rec.id;
    else
      -- RETIRE + SAME-KIND REPLACEMENT (§2 call 2). `scripts/market-agent.js` reads
      -- `status=neq.retired`, so retiring is what actually takes the wrong fact out of the prompt;
      -- the row itself survives, and `supersedes` is the undo.
      update public.market_records
         set status = 'retired', updated_at = now()
       where id = v_rec.id;

      -- `data` is a FRESH stamp, never a copy of the retired row's: `RECORD_FIELDS` renders `data`
      -- into the prompt, so copying it would carry forward the very strings the correction removes
      -- (measured on this tree: the retired rows' `data` carries the wrong launch date). Nothing is
      -- lost — the retired row keeps its own `data` and `supersedes` points back at it.
      insert into public.market_records
        (kind, title, body, data, source, audience, status, supersedes)
      values
        (v_rec.kind, v_title, v_body, v_data, v_rec.source, v_rec.audience, 'draft', v_rec.id)
      returning id into v_new;
    end if;
  end if;

  return v_decision;
end
$fn$;

-- =====================================================================================================
-- T1(b) — GRANTS, BY NAME. `pg_default_acl` grants EXECUTE to anon, authenticated and service_role
-- by name the instant a function is created, and `REVOKE ... FROM PUBLIC` leaves those named grants
-- standing — the migration would report success and the function would stay open
-- (`.claude/rules/supabase-column-grants.md`, addendum SES-315).
-- =====================================================================================================
revoke all on function public.apply_claim_recheck(uuid, text, jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.apply_claim_recheck(uuid, text, jsonb) to service_role;

-- =====================================================================================================
-- T1(c) — the GATE. Three arms, reads only, each RAISEing on failure, so any failure aborts the
-- transaction and rolls the whole migration back. Never the success flag of the REVOKE.
-- =====================================================================================================
DO $gate$
DECLARE
  v_n int;
BEGIN
  -- G1. The grant surface, BOTH directions. One direction alone cannot tell a closed gate from a
  --     function that is simply broken for everyone.
  IF has_function_privilege('anon', 'public.apply_claim_recheck(uuid, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'GATE 1: anon may EXECUTE apply_claim_recheck';
  END IF;
  IF has_function_privilege('authenticated', 'public.apply_claim_recheck(uuid, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'GATE 1: authenticated may EXECUTE apply_claim_recheck';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.apply_claim_recheck(uuid, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'GATE 1: service_role may NOT EXECUTE apply_claim_recheck';
  END IF;

  -- G2. ONE overload (`.claude/rules/supabase-function-signature.md`): a second one would answer
  --     every omitted-parameter call as an ambiguity error, which PostgREST hands back as an empty
  --     result rather than a crash.
  SELECT count(*) INTO v_n FROM pg_proc
   WHERE proname = 'apply_claim_recheck' AND pronamespace = 'public'::regnamespace;
  IF v_n <> 1 THEN RAISE EXCEPTION 'GATE 2: apply_claim_recheck has % overload(s), not 1', v_n; END IF;

  -- G3. The reversible vocabulary is UNWIDENED (§2 call 1). `reversible_tables()` returns `text[]`
  --     — one row holding seventeen names — so the count is `array_length`, not `count(*)` over the
  --     call, which is 1 by construction and would abort a correct migration.
  SELECT array_length(public.reversible_tables(), 1) INTO v_n;
  IF v_n <> 17 THEN RAISE EXCEPTION 'GATE 3: reversible_tables() returns % names, not 17', v_n; END IF;
  IF 'market_records' = ANY (public.reversible_tables()) THEN
    RAISE EXCEPTION 'GATE 3: market_records is on reversible_tables(); the record half reverses through supersedes, not reverse_decision()';
  END IF;
  IF NOT ('vision_claims' = ANY (public.reversible_tables())) THEN
    RAISE EXCEPTION 'GATE 3: vision_claims is NOT on reversible_tables(); the claim half would have no undo';
  END IF;

  RAISE NOTICE 'GATE: all three arms pass';
END $gate$;
-- >>> MIGRATION agt470_recheck_writer END
