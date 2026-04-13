-- Sista Viljan — Supabase schema
-- Run this in your Supabase SQL editor

-- ============================================================
-- Will drafts table
-- ============================================================
create table if not exists public.will_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  step integer not null default 1,
  circumstances jsonb not null default '{}',
  wishes jsonb not null default '{}',
  funeral_wishes jsonb not null default '{}',
  testator_name text,
  testator_personal_number text,
  testator_address text,
  partner_name text,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.will_drafts enable row level security;

create policy "Users can view own drafts"
  on public.will_drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert own drafts"
  on public.will_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own drafts"
  on public.will_drafts for update
  using (auth.uid() = user_id);

-- ============================================================
-- User profiles table (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  -- Storage
  storage_active boolean not null default false,
  storage_expires_at timestamptz,
  storage_reminder_sent_90 boolean not null default false,
  -- Reminders
  next_reminder_date date,           -- set to purchase_date + 12 months on first will creation
  last_reminder_sent timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Contact persons table
-- ============================================================
create table if not exists public.contact_persons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_persons enable row level security;

create policy "Users can view own contacts"
  on public.contact_persons for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contact_persons for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contact_persons for delete
  using (auth.uid() = user_id);

-- Limit to 3 contacts per user
create or replace function public.check_contact_limit()
returns trigger as $$
begin
  if (select count(*) from public.contact_persons where user_id = new.user_id) >= 3 then
    raise exception 'Max 3 kontaktpersoner tillåtna';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_contact_limit
  before insert on public.contact_persons
  for each row execute procedure public.check_contact_limit();

-- ============================================================
-- Generated documents table
-- ============================================================
create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  will_draft_id uuid references public.will_drafts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('legal_will', 'personal_letter')),
  storage_path text,
  created_at timestamptz not null default now()
);

alter table public.generated_documents enable row level security;

create policy "Users can view own documents"
  on public.generated_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.generated_documents for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- View for reminder processing
-- Determines which scenario (A/B/C/D) applies per user
-- ============================================================
create or replace view public.users_with_reminders as
select
  au.id,
  au.email,
  p.name,
  p.storage_active,
  p.storage_expires_at,
  p.next_reminder_date,
  p.storage_reminder_sent_90,
  case
    -- C: storage expiring within 90 days (check first — overrides B)
    when p.storage_active
      and p.storage_expires_at is not null
      and p.storage_expires_at <= now() + interval '90 days'
      and p.storage_expires_at > now()
      and not p.storage_reminder_sent_90
    then 'C'
    -- D: storage expired
    when p.storage_active
      and p.storage_expires_at is not null
      and p.storage_expires_at <= now()
    then 'D'
    -- B: has will + active storage
    when p.storage_active and p.storage_expires_at > now()
    then 'B'
    -- A: has will, no active storage
    else 'A'
  end as scenario
from auth.users au
join public.profiles p on p.id = au.id
where p.next_reminder_date <= current_date;

-- ============================================================
-- auto-update updated_at triggers
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_will_drafts_updated
  before update on public.will_drafts
  for each row execute procedure public.handle_updated_at();

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- pg_cron job — runs daily at 08:00 UTC
-- Requires pg_cron and pg_net extensions enabled in Supabase
-- ============================================================
-- select cron.schedule(
--   'send-reminders-daily',
--   '0 8 * * *',
--   $$
--     select net.http_post(
--       url := 'https://YOUR_APP_URL/api/reminders',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_REMINDER_SECRET'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
