-- Function to generate recurring invoices (run by cron)
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

    insert into public.invoices (
      user_id, customer_id, status, issue_date, due_date,
      is_recurring, recurrence_interval, recurrence_day, next_recurrence_at,
      number, tax_type, tax_value
    )
    values (
      rec.user_id, rec.customer_id, 'draft', new_issue, new_due,
      true, rec.recurrence_interval, rec.recurrence_day, next_ts,
      (select coalesce(max(number), 0) + 1 from public.invoices where user_id = rec.user_id),
      rec.tax_type, rec.tax_value
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

-- Supabase Cron: enable the Cron module in the project dashboard, then add a job that runs:
--   SELECT public.generate_recurring_invoices();
-- Schedule: 0 0 * * * (daily at midnight UTC)
-- If using pg_cron directly (e.g. self-hosted), uncomment below:
create extension if not exists pg_cron with schema extensions;
select cron.schedule('generate-recurring-invoices', '0 0 * * *', $$select public.generate_recurring_invoices()$$);
