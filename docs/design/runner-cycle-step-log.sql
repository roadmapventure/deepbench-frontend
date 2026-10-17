-- Repo record of the migration `runner_cycle_step_log` (applied 2026-10-17, John: "yes, build the step log").
-- Why: shipped cycles take a median 74 minutes (94% over 25) and per-step times were never recorded (finding b174d535), so the
-- build stretch (first write -> verdict, median 55 min) could not be split. Cycles already overwrite runner_cycles.last_step as they
-- go; this keeps every change with its time. Additive only: no routine, script or prompt changes.
-- A heartbeat-only update adds no row. The trigger body swallows any error, so it can never fail a cycle's own write.
-- READ: select * from public.runner_cycle_step_durations where ticket = 'AGT-480' order by at;   (minutes_in_step = time until the next change)
-- UNDO: remove the two triggers runner_cycles_step_log_ins / _upd, then the view, the function log_cycle_step() and the table.

CREATE TABLE IF NOT EXISTS public.runner_cycle_step_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cycle_id      uuid NOT NULL,
  at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  event         text NOT NULL,            -- opened | step | outcome
  step          text,
  previous_step text,
  outcome       text,
  heartbeat_at  timestamptz
);
CREATE INDEX IF NOT EXISTS runner_cycle_step_log_cycle_idx ON public.runner_cycle_step_log (cycle_id, at);
ALTER TABLE public.runner_cycle_step_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runner_cycle_step_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_cycle_step()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.runner_cycle_step_log (cycle_id, event, step, outcome, heartbeat_at)
      VALUES (NEW.id, 'opened', NEW.last_step, NEW.outcome::text, NEW.heartbeat_at);
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.last_step IS DISTINCT FROM OLD.last_step THEN
        INSERT INTO public.runner_cycle_step_log (cycle_id, event, step, previous_step, heartbeat_at)
        VALUES (NEW.id, 'step', NEW.last_step, OLD.last_step, NEW.heartbeat_at);
      END IF;
      IF NEW.outcome IS DISTINCT FROM OLD.outcome THEN
        INSERT INTO public.runner_cycle_step_log (cycle_id, event, step, previous_step, outcome, heartbeat_at)
        VALUES (NEW.id, 'outcome', NEW.last_step, OLD.last_step, NEW.outcome::text, NEW.heartbeat_at);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END
$fn$;

CREATE OR REPLACE TRIGGER runner_cycles_step_log_ins AFTER INSERT ON public.runner_cycles FOR EACH ROW EXECUTE FUNCTION public.log_cycle_step();
CREATE OR REPLACE TRIGGER runner_cycles_step_log_upd AFTER UPDATE OF last_step, outcome ON public.runner_cycles FOR EACH ROW EXECUTE FUNCTION public.log_cycle_step();

CREATE OR REPLACE VIEW public.runner_cycle_step_durations AS
SELECT l.cycle_id,
       (SELECT b.backlog_id FROM public.backlog_items b WHERE b.id = c.backlog_item_id) AS ticket,
       c.stamp, c.started_at AS cycle_started_at, l.id AS log_id, l.at, l.event, l.step, l.outcome,
       round((extract(epoch FROM (lead(l.at) OVER w - l.at)) / 60.0)::numeric, 2) AS minutes_in_step,
       round((extract(epoch FROM (l.at - c.started_at)) / 60.0)::numeric, 2) AS minutes_since_cycle_start
  FROM public.runner_cycle_step_log l JOIN public.runner_cycles c ON c.id = l.cycle_id
WINDOW w AS (PARTITION BY l.cycle_id ORDER BY l.at, l.id);
ALTER VIEW public.runner_cycle_step_durations SET (security_invoker = true);
REVOKE ALL ON public.runner_cycle_step_durations FROM anon, authenticated;
