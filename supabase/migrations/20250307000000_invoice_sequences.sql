-- Invoice sequences: prefix, suffix, length, counter per user
create table if not exists public.invoice_sequences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefix text not null default '',
  suffix text not null default '',
  length smallint not null default 1 check (length >= 1),
  counter integer not null default 0
);

alter table public.invoice_sequences enable row level security;

create policy "Users can manage own invoice_sequences"
  on public.invoice_sequences for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Add number_display to invoices (pre-computed at create time)
alter table public.invoices add column if not exists number_display text;

-- Backfill existing invoices: plain digit
update public.invoices set number_display = number::text where number_display is null;

-- Backfill invoice_sequences for users who have invoices
insert into public.invoice_sequences (user_id, prefix, suffix, length, counter)
select u.id, '', '', 1, coalesce((select max(i.number) from public.invoices i where i.user_id = u.id), 0)
from auth.users u
where exists (select 1 from public.invoices i where i.user_id = u.id)
on conflict (user_id) do nothing;

-- Atomic next number: increment counter and return it (creates row if missing)
create or replace function public.get_next_invoice_number(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_counter integer;
begin
  update public.invoice_sequences
  set counter = counter + 1
  where user_id = p_user_id
  returning counter into new_counter;

  if new_counter is not null then
    return new_counter;
  end if;

  insert into public.invoice_sequences (user_id, counter)
  values (p_user_id, 1)
  on conflict (user_id) do update set counter = invoice_sequences.counter + 1
  returning counter into new_counter;

  return new_counter;
end;
$$;

-- Recurring invoices: use get_next_invoice_number and set number_display from sequence
create or replace function public.generate_recurring_invoices()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  new_id uuid;
  new_issue date;
  new_due date;
  next_ts timestamptz;
  new_counter integer;
  new_number_display text;
  seq record;
begin
  for rec in
    select * from public.invoices
    where is_recurring = true
      and next_recurrence_at is not null
      and next_recurrence_at <= now()
  loop
    new_issue := (rec.next_recurrence_at at time zone 'utc')::date;
    if rec.recurrence_interval = 'yearly' then
      new_due := new_issue + interval '1 year';
      next_ts := (new_issue + interval '1 year')::timestamptz;
    else
      new_due := new_issue + interval '1 month';
      next_ts := (new_issue + interval '1 month')::timestamptz;
    end if;

    new_counter := public.get_next_invoice_number(rec.user_id);

    select prefix, suffix, length into seq
    from public.invoice_sequences
    where user_id = rec.user_id;

    new_number_display := coalesce(seq.prefix, '') || lpad(new_counter::text, greatest(1, coalesce(seq.length, 1)), '0') || coalesce(seq.suffix, '');

    insert into public.invoices (
      user_id, customer_id, status, issue_date, due_date,
      is_recurring, recurrence_interval, recurrence_day, next_recurrence_at,
      number, number_display, tax_type, tax_value
    )
    values (
      rec.user_id, rec.customer_id, 'draft', new_issue, new_due,
      true, rec.recurrence_interval, rec.recurrence_day, next_ts,
      new_counter, new_number_display, rec.tax_type, rec.tax_value
    )
    returning id into new_id;

    insert into public.invoice_lines (invoice_id, invoice_item_id, description, quantity, unit_price, sort_order)
    select new_id, invoice_item_id, description, quantity, unit_price, sort_order
    from public.invoice_lines
    where invoice_id = rec.id;

    update public.invoices
    set next_recurrence_at = next_ts, updated_at = now()
    where id = rec.id;
  end loop;
end;
$$;
