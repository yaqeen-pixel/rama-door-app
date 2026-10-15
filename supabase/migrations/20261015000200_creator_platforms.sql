-- Platforms each creator posts on, and whether the account is a person or a page
-- (news, media or community account). Used by the Discover filters. RAMA can edit
-- both columns in Table Editor; the sync only fills them for newly added accounts.
alter table public.creators
  add column if not exists platforms text[] not null default '{instagram}',
  add column if not exists account_type text not null default 'creator'
    check (account_type in ('creator', 'page'));

comment on column public.creators.platforms is 'Any of: instagram, tiktok, snapchat, youtube';
comment on column public.creators.account_type is 'creator = a person; page = news, media or community account';

-- Rate card creators deliver Instagram, TikTok and Snapchat (see the rate card scopes).
-- Others: Instagram plus any platform their bio mentions.
update public.creators set platforms = array_remove(array[
  'instagram',
  case when rates is not null or bio ~* '(tik ?tok|تيك ?توك)' then 'tiktok' end,
  case when rates is not null or bio ~* '(snap|👻|سناب)' then 'snapchat' end,
  case when bio ~* '(youtube|ytube|يوتيوب|يوتيوب)' then 'youtube' end
], null);

-- News, media and community pages (reviewed by hand from the INF Profile sheet).
update public.creators set account_type = 'page'
where lower(username) in (
  '3yoon_aldeerah','5osh.fkra','aak_news','alayam','alayambusiness','alayamsport','albayanmagazine','albiladpress',
  'alfarooo8','alkhabaronline.bh','alwatan_live','bahnews','bahrainconfidential','bahrainfintechbay','bahrainthismonth',
  'bftbahrain','bh_muharraqi','bh_now','bh_w_ahalha','bhr_sky','bizbahrain','bkweddings','bwabtek','deertybhr',
  'dinarbh973','gdn_life','gdnonline','gulfinsider','gulfweekly','hanialfardan2020','localbh','m7rrgy',
  'newscom_bahrain','newsofbahrain_','project2pr','radio.bh','thegdnmedia','trend_albahrain','trend.albahrain'
);

create index if not exists creators_followers_idx on public.creators (followers desc);
