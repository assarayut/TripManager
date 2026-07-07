-- Trip Expense Manager schema
-- Run against a Supabase Postgres project (SQL editor or `supabase db push`).

create extension if not exists pgcrypto;

-- ============================================================
-- profiles (one row per auth.users, created via trigger below)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  hue int not null default 235,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- auto-create a profile row when a user signs up.
-- expects auth signup to pass { username, display_name, hue } in options.data.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, hue)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'hue')::int, 235)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- trips + membership
-- ============================================================
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🧳',
  budget numeric not null default 0,
  start_date date,
  end_date date,
  money_mode text not null default 'equal' check (money_mode in ('equal', 'pool')),
  invite_code text not null unique,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table trip_members (
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (trip_id, profile_id)
);

-- security-definer helper avoids RLS-policy self-recursion on trip_members.
create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id and profile_id = auth.uid()
  );
$$;

alter table trips enable row level security;
alter table trip_members enable row level security;

create policy "members can read their trips"
  on trips for select to authenticated
  using (is_trip_member(id));

create policy "authenticated users can create a trip"
  on trips for insert to authenticated
  with check (created_by = auth.uid());

create policy "members can update their trips"
  on trips for update to authenticated
  using (is_trip_member(id));

create policy "members can read trip membership"
  on trip_members for select to authenticated
  using (is_trip_member(trip_id));

create policy "the trip creator can add the first member (self)"
  on trip_members for insert to authenticated
  with check (
    profile_id = auth.uid()
    or is_trip_member(trip_id)
  );

create policy "members can leave a trip"
  on trip_members for delete to authenticated
  using (is_trip_member(trip_id));

-- ============================================================
-- categories (global presets + per-trip custom ones)
-- ============================================================
create table categories (
  id text primary key,
  trip_id uuid references trips(id) on delete cascade,
  label text not null,
  icon text not null,
  hue int not null,
  is_custom boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "global categories are readable by everyone; trip categories by members"
  on categories for select to authenticated
  using (trip_id is null or is_trip_member(trip_id));

create policy "members can add custom categories to their trip"
  on categories for insert to authenticated
  with check (trip_id is not null and is_trip_member(trip_id));

insert into categories (id, trip_id, label, icon, hue, is_custom) values
  ('fuel', null, 'น้ำมัน/เดินทาง', '⛽', 238, false),
  ('food', null, 'อาหาร', '🍜', 178, false),
  ('hotel', null, 'ที่พัก', '🏨', 300, false),
  ('activity', null, 'กิจกรรม', '🎟️', 145, false),
  ('shopping', null, 'ช้อปปิ้ง/ของฝาก', '🛍️', 20, false),
  ('other', null, 'อื่นๆ', '💰', 60, false);

-- ============================================================
-- per-trip category budgets
-- ============================================================
create table trip_category_budgets (
  trip_id uuid not null references trips(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  budget numeric not null check (budget > 0),
  primary key (trip_id, category_id)
);

alter table trip_category_budgets enable row level security;

create policy "members can manage their trip's category budgets"
  on trip_category_budgets for all to authenticated
  using (is_trip_member(trip_id))
  with check (is_trip_member(trip_id));

-- ============================================================
-- expenses + splits
-- ============================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  category_id text not null references categories(id),
  amount numeric not null check (amount > 0),
  note text not null default 'ไม่มีรายละเอียด',
  payer_id uuid references profiles(id),
  is_pool_payment boolean not null default false,
  slip_url text,
  expense_date date not null default current_date,
  expense_time time not null default current_time,
  reimbursement_status text check (reimbursement_status in ('pending', 'reimbursed')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table expense_splits (
  expense_id uuid not null references expenses(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (expense_id, profile_id)
);

alter table expenses enable row level security;
alter table expense_splits enable row level security;

create policy "members can manage their trip's expenses"
  on expenses for all to authenticated
  using (is_trip_member(trip_id))
  with check (is_trip_member(trip_id));

create policy "members can manage splits of their trip's expenses"
  on expense_splits for all to authenticated
  using (exists (select 1 from expenses e where e.id = expense_id and is_trip_member(e.trip_id)))
  with check (exists (select 1 from expenses e where e.id = expense_id and is_trip_member(e.trip_id)));

-- ============================================================
-- pool contribution ledger
-- ============================================================
create table pool_transactions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  amount numeric not null check (amount > 0),
  type text not null check (type in ('contribute', 'withdraw')),
  created_at timestamptz not null default now()
);

alter table pool_transactions enable row level security;

create policy "members can manage their trip's pool ledger"
  on pool_transactions for all to authenticated
  using (is_trip_member(trip_id))
  with check (is_trip_member(trip_id));

-- ============================================================
-- storage bucket for receipt slips
-- ============================================================
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do nothing;

create policy "anyone can view slip photos (public bucket)"
  on storage.objects for select
  using (bucket_id = 'slips');

create policy "trip members can upload slip photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'slips'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );

create policy "trip members can delete slip photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'slips'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );
