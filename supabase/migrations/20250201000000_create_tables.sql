-- Profiles (optional, for display name)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('company', 'person')),
  email text,
  phone text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reusable invoice items
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric not null check (unit_price >= 0),
  created_at timestamptz default now()
);

-- Invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  issue_date date not null,
  due_date date not null,
  is_recurring boolean not null default false,
  recurrence_interval text check (recurrence_interval is null or recurrence_interval in ('monthly', 'yearly')),
  recurrence_day smallint check (recurrence_day is null or (recurrence_day >= 1 and recurrence_day <= 31)),
  next_recurrence_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoice lines
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  invoice_item_id uuid references public.invoice_items(id) on delete set null,
  description text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  sort_order smallint not null default 0
);

-- RLS
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy "Users can manage own profiles" on public.profiles for all using ((select auth.uid()) = id);
create policy "Users can manage own customers" on public.customers for all using ((select auth.uid()) = user_id);
create policy "Users can manage own invoice_items" on public.invoice_items for all using ((select auth.uid()) = user_id);
create policy "Users can manage own invoices" on public.invoices for all using ((select auth.uid()) = user_id);
create policy "Users can manage invoice_lines for own invoices" on public.invoice_lines for all
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())));

-- Indexes
create index if not exists idx_customers_user_id on public.customers(user_id);
create index if not exists idx_invoice_items_user_id on public.invoice_items(user_id);
create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_invoices_next_recurrence_at on public.invoices(next_recurrence_at) where is_recurring = true;
create index if not exists idx_invoice_lines_invoice_id on public.invoice_lines(invoice_id);
