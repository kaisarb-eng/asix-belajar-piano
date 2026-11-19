-- ==============================================================================
-- File: supabase-setup.sql
-- Fungsi: Skema database Supabase, tabel songs, usage_daily, fungsi atomik, dan RLS
-- Fitur: 4 (Penyimpanan lagu, pembatasan kuota harian pembuatan lagu AI)
-- ==============================================================================

-- 1. Tabel songs (Lagu)
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  artist text,
  category text not null default 'lainnya' check (category in ('nasional','daerah','islami','dangdut','lainnya')),
  tempo_bpm int not null check (tempo_bpm >= 40 and tempo_bpm <= 200),
  time_signature text not null default '4/4',
  notes jsonb not null check (jsonb_typeof(notes) = 'array'),
  is_ai boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index pada category dan created_at desc
create index if not exists idx_songs_category on songs (category);
create index if not exists idx_songs_created_at_desc on songs (created_at desc);

-- 2. Tabel usage_daily (Jatah Harian Pembuatan Lagu)
create table if not exists usage_daily (
  day date primary key,
  count int not null default 0
);

-- 3. Fungsi atomik take_generation_slot
create or replace function take_generation_slot(p_limit int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_today date;
  v_rows_affected int;
begin
  -- Tanggal hari ini berbasis UTC
  v_today := (now() at time zone 'utc')::date;

  -- Pastikan baris untuk hari ini ada
  insert into usage_daily (day, count)
  values (v_today, 0)
  on conflict (day) do nothing;

  -- Naikkan count secara atomik hanya bila masih di bawah limit
  update usage_daily
  set count = count + 1
  where day = v_today and count < p_limit;

  get diagnostics v_rows_affected = row_count;

  if v_rows_affected > 0 then
    return true;
  else
    return false;
  end if;
end;
$$;

-- Hak akses fungsi take_generation_slot:
-- Revoke execute dari public, anon, authenticated; grant ke service_role
revoke all on function take_generation_slot(int) from public, anon, authenticated;
grant execute on function take_generation_slot(int) to service_role;

-- 4. Row Level Security (RLS)
alter table songs enable row level security;
alter table usage_daily enable row level security;

-- Policy songs: hanya SELECT untuk anon dan authenticated. Tanpa policy insert/update/delete.
drop policy if exists "Allow public select on songs" on songs;
create policy "Allow public select on songs" on songs
  for select
  to anon, authenticated
  using (true);

-- Catatan usage_daily: RLS aktif tanpa policy, sehingga anon/authenticated tidak bisa akses.
-- Akses hanya melalui service_role (fungsi server Vercel).
