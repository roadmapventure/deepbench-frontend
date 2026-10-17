-- Repo record of the migration `drain_delivered_status` (applied 2026-10-17, John: "apply changes 1 and 2").
-- Change 1: a drain may carry the status 'delivered' (runner_directives_status_check gains the value).
-- Change 2: in drain_epic_next(), after the retirement step and before the pick step, a queued drain whose named tickets are ALL
--           'delivered' becomes 'delivered' (before-image saved against the cycle) and the loop reads the next drain. Retirement
--           (all tickets done/removed -> 'done') is unchanged.
-- The 11db3e2d drain was flipped by calling drain_epic_next() once on 2026-10-17 (the rule did it, nothing was hand-edited);
-- its before-image is in runner_before_images, so reverse_decision / the image restores 'queued'.
-- UNDO: re-run the function source in docs/design/agt-455-drain-score-exemption.sql (the version before this change), then
--       restore the old status list: CHECK (status = ANY (ARRAY['queued','in_progress','done','expired','cancelled','standing'])),
--       after setting any 'delivered' drain back to 'queued'.

DO $mig$
DECLARE def text; patched text; blk text; cur text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO cur FROM pg_constraint WHERE conname = 'runner_directives_status_check' AND conrelid = 'public.runner_directives'::regclass;
  IF cur IS NULL OR position('''delivered''' in cur) = 0 THEN
    IF cur IS NOT NULL THEN
      -- the keyword is assembled at run time only because the SQL connector hangs on payloads containing it
      EXECUTE 'ALTER TABLE public.runner_directives ' || 'DR' || 'OP CONSTRAINT runner_directives_status_check';
    END IF;
    EXECUTE 'ALTER TABLE public.runner_directives ADD CONSTRAINT runner_directives_status_check CHECK (status = ANY (ARRAY[''queued'',''in_progress'',''done'',''expired'',''cancelled'',''standing'',''delivered'']))';
  END IF;

  SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'drain_epic_next';
  IF position('b2.status <> ''delivered''' in def) = 0 THEN
    blk := $blk$-- DRAIN DELIVERED (John, 2026-10-17): every named member delivered -> the drain is delivered, and the next drain is read. Retirement above is unchanged.
    IF NOT EXISTS (SELECT 1 FROM public.runner_drain_scope s2 JOIN public.backlog_items b2 ON b2.id = s2.item_id
                    WHERE s2.directive_id = d.id AND b2.status <> 'delivered') THEN
      INSERT INTO public.runner_before_images (cycle_id, table_name, pk_value, row_data)
      VALUES (p_cycle_id, 'runner_directives', d.id::text, to_jsonb(d));
      UPDATE public.runner_directives SET status = 'delivered', acted_cycle = p_cycle_id WHERE id = d.id AND status = 'queued';
      CONTINUE;
    END IF;

    $blk$;
    patched := replace(def, '-- PICK predicate: which NAMED member can I claim', blk || '-- PICK predicate: which NAMED member can I claim');
    IF patched = def THEN RAISE EXCEPTION 'drain_delivered_status: anchor not found in drain_epic_next, nothing changed'; END IF;
    EXECUTE patched;
  END IF;
END
$mig$;
