-- Influencer briefs: a brand picks creators on Discover and sends one brief request to RAMA.
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_name text not null,
  budget numeric,
  company_name text not null,
  email text not null,
  phone text not null,
  brief_mode text not null default 'shared' check (brief_mode in ('shared', 'perCreator')),
  brief_languages text[] not null default '{english}',
  brief_text text,
  attachment_path text,
  attachment_name text,
  default_content jsonb not null default '{}',
  submission_deadline date,
  posting_date date,
  posting_time time,
  dress_code text[] not null default '{noRestrictions}',
  dress_code_comments text,
  additional_notes text,
  estimate integer,
  status text not null default 'Submitted' check (status in ('Draft', 'Submitted', 'In review', 'Confirmed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brief_creators (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs (id) on delete cascade,
  creator_id integer not null references public.creators (id),
  platforms text[] not null default '{instagram}',
  content_types jsonb not null default '{}',
  specific_brief text,
  video_quality text not null default 'professional' check (video_quality in ('professional', 'phone', 'client')),
  location_type text not null default 'studio' check (location_type in ('studio', 'outdoor', 'influencer')),
  sponsored_ads text not null default 'yes' check (sponsored_ads in ('yes', 'no', 'later')),
  submission_deadline date,
  posting_date date,
  posting_time time,
  estimate integer
);

create index if not exists briefs_user_idx on public.briefs (user_id, created_at desc);
create index if not exists brief_creators_brief_idx on public.brief_creators (brief_id);

alter table public.briefs enable row level security;
alter table public.brief_creators enable row level security;

create policy "own briefs" on public.briefs for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own brief creators" on public.brief_creators for all
  using (exists (select 1 from public.briefs b where b.id = brief_id and b.user_id = (select auth.uid())))
  with check (exists (select 1 from public.briefs b where b.id = brief_id and b.user_id = (select auth.uid())));

-- Private bucket for brief attachments (PDF, Word, PowerPoint up to 10 MB).
-- Files live under <user id>/..., and each brand can only reach its own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brief-files', 'brief-files', false, 10485760, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do nothing;

create policy "brief files upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'brief-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "brief files read own" on storage.objects for select to authenticated
  using (bucket_id = 'brief-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
