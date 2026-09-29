-- DeepBench v7.0.721 | docs/design/agt-020-skill-levels.sql | AGT-020 — `level` becomes the
-- execution-depth line of the fired intent. Applied live as migration `agt020_skill_levels`
-- by cycle 3fa9bf7c-4dca-420e-9722-be83cefddaa5.
--
-- WHY A TABLE AND NOT FOUR STRINGS IN CODE. `capability_skill_profiles.level` has been written on
-- every link since the schema was born and read by nothing: measured 2026-09-29, `api/prompt/
-- db-assembly.js` selects it at L621/L646/L706 and no file in `api/`, `lib/`, `scripts/` or `src/`
-- consumes it afterwards, so ARCHITECTURE.md §2's "Depth and quality grade" (L469) and
-- INTENT-MODEL.md:65's "quality of execution" were a documented promise with no runtime. The lever
-- is the FIRED intent's link level, and the directive text that turns a number into an instruction
-- is content, so it lives in a row John can edit, never in a branch in the assembler
-- (pattern:2, pattern:11). One new table rather than four columns on an existing one, because the
-- levels are a closed domain the links point AT (pattern:17, pattern:19 — the fkey is the gate).
--
-- MEASURED BEFORE THE WRITE (this cycle, live): 312 links — L1 10, L2 283, L3 19, 0 NULL, 0 outside
-- 1..4; no `skill_levels` relation; no `capability_skill_profiles_level_fkey`. (The design cycle
-- counted 311 / L3 18 — one L3 link was added between the two cycles. Every level still resolves,
-- so the fkey lands without a backfill.)
--
-- REVERSAL. Captured FIRST, before `apply_migration`, into `public.runner_migration_downs`
-- (up_name `agt020_skill_levels`, captured_by_cycle 3fa9bf7c-4dca-420e-9722-be83cefddaa5,
-- row eb68e2dd-4bea-4fd5-a61b-4e83761664b5): **1 captured, 1 refused**.
--   captured — `public.skill_levels`, existed=false, so the derived down is to drop the new table.
--   refused  — `public.capability_skill_profiles`: the up ALTERs a table that already exists, and a
--              lossless down for an in-place alteration is not derivable from current state alone.
-- The refused half's undo is by hand, and this is its home:
--
--   ALTER TABLE public.capability_skill_profiles DROP CONSTRAINT IF EXISTS capability_skill_profiles_level_fkey;
--   DROP TABLE IF EXISTS public.skill_levels;
--   NOTIFY pgrst, 'reload schema';
--
-- (Order matters: the constraint depends on the table.) Nothing in the up mutates a link row, so a
-- reversal loses no data — only the gate and the four directive strings.

-- (1) The closed domain. `level` is the primary key, so the fkey below can point at it, and the
--     CHECK keeps the domain shut at four even if a fifth row is attempted.
--     `execution_directive` is NOT NULL because a level with no directive is a level that silently
--     contributes nothing — the exact shape of the defect this ticket removes.
CREATE TABLE public.skill_levels (
  level int PRIMARY KEY CHECK (level BETWEEN 1 AND 4),
  name text NOT NULL,
  execution_directive text NOT NULL
);

-- (2) The four rows, exactly. This text is content, reviewed as content: it is what the model reads
--     as its depth instruction, appended to the fired intent's section as
--     `Execution depth: L<n> <name> — <directive>`. Changing a directive is an UPDATE here, never
--     a code change and never a migration.
INSERT INTO public.skill_levels (level, name, execution_directive) VALUES
  (1, 'General',
   'Run a general pass: answer what was asked from what is in front of you, keep to the essentials, do not widen the task.'),
  (2, 'Trained',
   'Run a trained pass: apply the method as written, check the obvious failure modes before answering, name what you are unsure of.'),
  (3, 'Expert',
   'Run an expert pass: reason end to end, weigh alternatives before choosing, verify each claim against the evidence given, state what remains uncertain and why.'),
  (4, 'Proprietary',
   'Run a proprietary-grade pass: exhaustive rigor — test every claim against the evidence, surface trade-offs and edge cases, stop only when a reviewing specialist would find nothing missing.');

-- (3) No public key on this table, in either direction. A new table is born `anon=rm` on this
--     instance (SES-384), and this content is read only by the server-side assembler with the
--     service key — so the grant is revoked outright rather than narrowed to a column list.
--     `.claude/rules/supabase-column-grants.md`: the assertion in (5) reads
--     `role_table_grants` for ALL privilege types, not only SELECT, because that rule's DAT-18
--     addendum is precisely that a SELECT lockdown can guard a table the public key still writes.
REVOKE ALL ON public.skill_levels FROM anon, authenticated;

-- (4) The gate. Every link's level must name a real level — this is what makes the directive
--     lookup in db-assembly.js total rather than best-effort, and what makes a typo'd level a
--     write-time 23503 instead of a silently missing depth line at render time (pattern:19).
ALTER TABLE public.capability_skill_profiles
  ADD CONSTRAINT capability_skill_profiles_level_fkey
  FOREIGN KEY (level) REFERENCES public.skill_levels(level);

-- (5) Assert, in the same transaction, and RAISE rather than report success on a half-landed
--     migration. Four independent facts, each the negation of a way this could ship broken.
DO $$
DECLARE
  v_rows      int;
  v_grants    int;
  v_orphans   int;
  v_fkey      int;
BEGIN
  SELECT count(*) INTO v_rows FROM public.skill_levels;
  IF v_rows <> 4 THEN
    RAISE EXCEPTION 'skill_levels holds % rows, expected exactly 4', v_rows;
  END IF;

  SELECT count(*) INTO v_grants
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'skill_levels'
     AND grantee IN ('anon', 'authenticated');
  IF v_grants <> 0 THEN
    RAISE EXCEPTION 'skill_levels still carries % grant(s) for anon/authenticated', v_grants;
  END IF;

  SELECT count(*) INTO v_orphans
    FROM public.capability_skill_profiles csp
    LEFT JOIN public.skill_levels sl ON sl.level = csp.level
   WHERE sl.level IS NULL;
  IF v_orphans <> 0 THEN
    RAISE EXCEPTION '% link(s) carry a level with no skill_levels row', v_orphans;
  END IF;

  SELECT count(*) INTO v_fkey
    FROM pg_constraint
   WHERE conname = 'capability_skill_profiles_level_fkey';
  IF v_fkey <> 1 THEN
    RAISE EXCEPTION 'capability_skill_profiles_level_fkey present % time(s), expected 1', v_fkey;
  END IF;

  RAISE NOTICE 'agt020_skill_levels: 4 rows, 0 public grants, 0 orphan links, fkey present';
END $$;

-- (6) The embedded read `skill_levels(name,execution_directive)` in db-assembly.js resolves through
--     PostgREST's schema cache, so a stale cache presents as a 400 on every assembled prompt.
NOTIFY pgrst, 'reload schema';
