-- Instagram profile details for creators, filled from the "Influencers IG - INF Profile" sheet.
alter table public.creators
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists following integer,
  add column if not exists posts integer,
  add column if not exists profile_url text,
  add column if not exists source_photo_url text,
  add column if not exists synced_at timestamptz;

-- One creator per Instagram account (case-insensitive).
create unique index if not exists creators_username_key on public.creators (lower(username));

comment on column public.creators.username is 'Instagram username, without @';
comment on column public.creators.display_name is 'Name shown on the Instagram profile';
comment on column public.creators.photo_url is 'Profile photo copied into Supabase Storage (does not expire)';
comment on column public.creators.source_photo_url is 'Original Instagram CDN photo link from the sheet (expires after a few weeks)';

-- Public bucket for creator profile photos.
insert into storage.buckets (id, name, public)
values ('creator-photos', 'creator-photos', true)
on conflict (id) do nothing;
