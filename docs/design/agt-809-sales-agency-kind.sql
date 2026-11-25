-- AGT-809 — migration agt809_sales_agency_kind (2026-11-25, design-bill-1125, decision 1e4ff32c): kind 'agency' added to public.sales_records for the all-agencies checklist; one row per unit, unique on data->>'key'.
ALTER TABLE public.sales_records DROP CONSTRAINT sales_records_kind_check;
ALTER TABLE public.sales_records ADD CONSTRAINT sales_records_kind_check CHECK (kind IN
  ('source','solicitation','rating','status','keyword','vocabulary','reminder','correction','grade','agency'));
CREATE UNIQUE INDEX sales_records_agency_key ON public.sales_records ((data->>'key')) WHERE kind = 'agency';
