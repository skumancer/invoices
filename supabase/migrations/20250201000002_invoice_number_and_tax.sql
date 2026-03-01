-- Invoice number (user-chosen, incremental per user)
alter table public.invoices add column if not exists number integer;

-- Backfill: assign sequential numbers per user by created_at
with ordered as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.invoices
)
update public.invoices i
set number = ordered.rn
from ordered
where i.id = ordered.id;

alter table public.invoices alter column number set not null;
create unique index if not exists idx_invoices_user_id_number on public.invoices(user_id, number);

-- Tax: fixed amount or percent of items
alter table public.invoices add column if not exists tax_type text check (tax_type is null or tax_type in ('fixed', 'percent'));
alter table public.invoices add column if not exists tax_value numeric default 0 check (tax_value >= 0);
