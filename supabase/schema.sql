create table if not exists public.orders (
  id bigint primary key,
  number text not null,
  created_at timestamptz not null,
  status text,
  customer_name text,
  phone text,
  city text,
  total_sum numeric(12, 2) not null default 0,
  items_count integer not null default 0,
  source text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at);
create index if not exists idx_orders_total_sum on public.orders (total_sum);
create index if not exists idx_orders_city on public.orders (city);

alter table public.orders enable row level security;
alter table public.sync_state enable row level security;

drop policy if exists "orders_select_all" on public.orders;
create policy "orders_select_all"
  on public.orders
  for select
  to anon, authenticated
  using (true);

drop policy if exists "orders_write_all" on public.orders;
create policy "orders_write_all"
  on public.orders
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "sync_state_all" on public.sync_state;
create policy "sync_state_all"
  on public.sync_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
