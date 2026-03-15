select * from public.invoices
    where is_recurring = true
      and next_recurrence_at is not null