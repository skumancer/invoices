-- Optional tax/identification number for invoice display
alter table public.profiles add column if not exists tax_id text;
alter table public.customers add column if not exists tax_id text;
