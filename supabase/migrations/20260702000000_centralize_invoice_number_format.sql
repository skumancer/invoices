-- Single source of truth for invoice number display formatting.
-- Mirrors src/lib/invoice-number.ts formatInvoiceNumber (prefix + padStart(length) + suffix).
-- Uses greatest(len(counter), length) so a counter with more digits than `length`
-- is never truncated (Postgres lpad truncates when target length < string length,
-- which previously turned counter 62 with length 1 into "6").
create or replace function public.format_invoice_display(
  p_prefix text,
  p_length integer,
  p_suffix text,
  p_counter integer
)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(p_prefix, '')
      || lpad(
           p_counter::text,
           greatest(length(p_counter::text), greatest(1, coalesce(p_length, 1))),
           '0'
         )
      || coalesce(p_suffix, '');
$$;

-- Recurring job must format number_display through the shared function so it can
-- never diverge from the app again.
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
  every integer;
  unit text;
  step interval;
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
    every := coalesce(rec.recurrence_every, 1);
    if every <= 0 then
      every := 1;
    end if;

    unit := coalesce(rec.recurrence_unit, 'months');

    if unit = 'days' then
      step := make_interval(days => every);
    elsif unit = 'weeks' then
      step := make_interval(weeks => every);
    elsif unit = 'years' then
      step := make_interval(years => every);
    else
      step := make_interval(months => every);
    end if;

    new_issue := (rec.next_recurrence_at at time zone 'utc')::date;
    new_due := new_issue + step;
    next_ts := (new_issue + step)::timestamptz;

    new_counter := public.get_next_invoice_number(rec.user_id);

    select prefix, suffix, length into seq
    from public.invoice_sequences
    where user_id = rec.user_id;

    new_number_display := public.format_invoice_display(
      seq.prefix,
      seq.length,
      seq.suffix,
      new_counter
    );

    insert into public.invoices (
      user_id,
      customer_id,
      status,
      issue_date,
      due_date,
      is_recurring,
      recurrence_every,
      recurrence_unit,
      next_recurrence_at,
      number,
      number_display,
      tax_type,
      tax_value
    )
    values (
      rec.user_id,
      rec.customer_id,
      'draft',
      new_issue,
      new_due,
      false,
      null,
      null,
      null,
      new_counter,
      new_number_display,
      rec.tax_type,
      rec.tax_value
    )
    returning id into new_id;

    insert into public.invoice_lines (invoice_id, invoice_item_id, description, quantity, unit_price, sort_order)
    select new_id, invoice_item_id, description, quantity, unit_price, sort_order
    from public.invoice_lines
    where invoice_id = rec.id;

    update public.invoices
    set next_recurrence_at = next_ts,
        updated_at = now()
    where id = rec.id;
  end loop;
end;
$$;
