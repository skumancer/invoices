alter table public.invoices
  add column if not exists recurrence_every integer check (recurrence_every is null or recurrence_every >= 1),
  add column if not exists recurrence_unit text check (
    recurrence_unit is null or recurrence_unit in ('days', 'weeks', 'months', 'years')
  ),
  drop column if exists recurrence_interval,
  drop column if exists recurrence_day;

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
      (select coalesce(max(number), 0) + 1 from public.invoices where user_id = rec.user_id),
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

