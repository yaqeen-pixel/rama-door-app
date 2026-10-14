-- RAMA Door: initial database schema
-- Run in Supabase: SQL Editor > New query > paste this file > Run.
-- Then run supabase/seed.sql to load the rate card, outdoor sites and media outlets.

create extension if not exists "pgcrypto";

-------------------------------------------------------------------------------
-- Brand accounts (one row per signed-in user)
-------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Catalogue: influencers
-------------------------------------------------------------------------------
create table public.creators (
  id serial primary key,
  name text not null,
  nickname text,
  -- 12 prices in BD. Order: [with video: full, scope, full+ads, scope+ads,
  --  without video: same four, package of 2 with video: same four]
  rates integer[] check (rates is null or array_length(rates, 1) = 12),
  photo_url text,
  instagram text,
  tiktok text,
  snapchat text,
  followers integer,
  categories text[],
  audience jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-------------------------------------------------------------------------------
-- Catalogue: outdoor sites
-------------------------------------------------------------------------------
create table public.outdoor_sites (
  id serial primary key,
  name text not null,
  format text not null check (format in ('Billboard','LED screen','Unipole','Mall screen','Bridge banner','Airport screen','Bus shelters')),
  area text not null,
  lat double precision not null,
  lng double precision not null,
  size text,
  faces text,
  daily_views integer,
  weekly_price integer not null,
  lighting text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per site per booked week (week_start is always a Monday).
create table public.outdoor_site_weeks (
  site_id integer not null references public.outdoor_sites (id) on delete cascade,
  week_start date not null,
  booking_id uuid,
  primary key (site_id, week_start)
);

-------------------------------------------------------------------------------
-- Catalogue: media outlets and PR packages
-------------------------------------------------------------------------------
create table public.media_outlets (
  id text primary key,
  name text not null,
  name_ar text,
  kind text not null check (kind in ('daily','monthly')),
  language text not null check (language in ('Arabic','English')),
  about text,
  column_cm_rate numeric,          -- dailies: BD per column centimetre
  magazine_rates jsonb,            -- monthlies: {"full":..,"half":..,"dps":..,"ifc":..,"obc":..}
  web_rates integer[] not null,    -- [leaderboard per week, MPU per week]
  social_rates integer[] not null, -- [Instagram post, Instagram story]
  active boolean not null default true
);

create table public.pr_packages (
  key text primary key,
  label text not null,
  price integer not null,
  description text
);

-------------------------------------------------------------------------------
-- Brand activity: campaigns, offers, bookings, insertion orders
-------------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  objective text,
  platforms text[] not null default '{}',
  budget integer not null default 0,
  start_date date,
  end_date date,
  brief text,
  status text not null default 'Draft' check (status in ('Draft','Live','Completed')),
  created_at timestamptz not null default now()
);

create table public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  creator_id integer not null references public.creators (id),
  rate_index smallint not null check (rate_index between 0 and 11),
  price integer not null,
  note text,
  status text not null default 'new' check (status in ('new','hired','passed')),
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  creator_id integer not null references public.creators (id),
  rate_index smallint not null check (rate_index between 0 and 11),
  list_price integer not null,
  amount integer not null,
  status text not null default 'Pending' check (status in ('Pending','Countered','Accepted','Declined')),
  deliverables_done jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.offer_messages (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  from_brand boolean not null,
  body text not null,
  amount integer,
  created_at timestamptz not null default now()
);

create table public.outdoor_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site_id integer not null references public.outdoor_sites (id),
  weeks date[] not null,
  total integer not null,
  status text not null default 'Requested' check (status in ('Requested','Confirmed','Cancelled')),
  created_at timestamptz not null default now()
);

create sequence public.insertion_order_seq start 1041;
create table public.insertion_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  number text not null default ('RD-' || nextval('public.insertion_order_seq')),
  subtotal integer not null,
  vat integer not null,
  total integer not null,
  status text not null default 'Requested' check (status in ('Requested','Confirmed','Cancelled')),
  created_at timestamptz not null default now()
);

create table public.insertion_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.insertion_orders (id) on delete cascade,
  outlet text not null,
  description text not null,
  run_dates text,
  deadline text,
  total integer not null
);

-------------------------------------------------------------------------------
-- Row level security
-------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.creators enable row level security;
alter table public.outdoor_sites enable row level security;
alter table public.outdoor_site_weeks enable row level security;
alter table public.media_outlets enable row level security;
alter table public.pr_packages enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.offers enable row level security;
alter table public.offer_messages enable row level security;
alter table public.outdoor_bookings enable row level security;
alter table public.insertion_orders enable row level security;
alter table public.insertion_order_lines enable row level security;

-- Catalogue is public to read; only RAMA staff (service role / dashboard) can edit it.
create policy "catalogue read" on public.creators for select using (active);
create policy "catalogue read" on public.outdoor_sites for select using (active);
create policy "catalogue read" on public.outdoor_site_weeks for select using (true);
create policy "catalogue read" on public.media_outlets for select using (active);
create policy "catalogue read" on public.pr_packages for select using (true);

-- Brands see and change only their own rows.
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own campaigns" on public.campaigns for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own offers" on public.offers for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own outdoor bookings" on public.outdoor_bookings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own insertion orders" on public.insertion_orders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own applications" on public.campaign_applications for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "own offer messages" on public.offer_messages for all
  using (exists (select 1 from public.offers o where o.id = offer_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.offers o where o.id = offer_id and o.user_id = auth.uid()));
create policy "own order lines" on public.insertion_order_lines for all
  using (exists (select 1 from public.insertion_orders o where o.id = order_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.insertion_orders o where o.id = order_id and o.user_id = auth.uid()));

create index on public.campaigns (user_id);
create index on public.offers (user_id);
create index on public.offer_messages (offer_id);
create index on public.outdoor_bookings (user_id);
create index on public.insertion_orders (user_id);
create index on public.insertion_order_lines (order_id);
