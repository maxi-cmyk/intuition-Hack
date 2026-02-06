-- Echo Adaptive Database Schema
-- Patient-focused reminiscence therapy platform
-- Version: 1.1 - Added storage buckets and comprehensive drop statements

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- DROP EXISTING OBJECTS (for idempotent runs)
-- ============================================

-- Drop triggers
drop trigger if exists patient_settings_updated_at on patient_settings;

-- Drop functions
drop function if exists update_updated_at();

-- Drop policies on all tables
drop policy if exists "Patients can view own data" on patients;
drop policy if exists "Patients can update own data" on patients;
drop policy if exists "Patients can insert own data" on patients;
drop policy if exists "Patient settings access" on patient_settings;
drop policy if exists "Voice profiles access" on voice_profiles;
drop policy if exists "Media assets access" on media_assets;
drop policy if exists "Memories access" on memories;
drop policy if exists "Interactions access" on interactions;
drop policy if exists "Sessions access" on sessions;

-- Drop storage policies
drop policy if exists "Public read access for media-assets" on storage.objects;
drop policy if exists "Authenticated upload for media-assets" on storage.objects;
drop policy if exists "Authenticated delete for media-assets" on storage.objects;
drop policy if exists "Public read access for voice-samples" on storage.objects;
drop policy if exists "Authenticated upload for voice-samples" on storage.objects;
drop policy if exists "Authenticated delete for voice-samples" on storage.objects;

-- Drop indexes
drop index if exists idx_memories_patient;
drop index if exists idx_memories_status;
drop index if exists idx_memories_cooldown;
drop index if exists idx_memories_last_shown;
drop index if exists idx_media_assets_patient;
drop index if exists idx_media_assets_type;
drop index if exists idx_interactions_memory;
drop index if exists idx_interactions_patient;
drop index if exists idx_interactions_created;
drop index if exists idx_sessions_patient;
drop index if exists idx_voice_profiles_patient;

-- Drop tables (in reverse dependency order)
drop table if exists sessions cascade;
drop table if exists interactions cascade;
drop table if exists memories cascade;
drop table if exists media_assets cascade;
drop table if exists voice_profiles cascade;
drop table if exists patient_settings cascade;
drop table if exists patients cascade;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets for media assets and voice samples
-- Note: In Supabase, buckets are created via the dashboard or API, not SQL
-- However, you can insert into storage.buckets if it exists

insert into storage.buckets (id, name, public)
values ('media-assets', 'media-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('voice-samples', 'voice-samples', true)
on conflict (id) do update set public = true;

-- ============================================
-- TABLES
-- ============================================

-- Patients (standalone, no caregiver dependency)
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique,
  display_name text not null,
  pin_hash text not null default '1234',
  created_at timestamptz default now()
);

-- Patient Settings
create table if not exists patient_settings (
  patient_id uuid primary key references patients(id) on delete cascade,
  fixation_cooldown_hours int default 24,
  novelty_weight text default 'medium' check (novelty_weight in ('low', 'medium', 'high')),
  tap_sensitivity text default 'medium' check (tap_sensitivity in ('low', 'medium', 'high')),
  sundowning_time time default '18:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Voice Profiles (for narration)
create table if not exists voice_profiles (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  name text not null,
  sample_url text,
  elevenlabs_voice_id text,
  status text default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz default now()
);

-- Media Assets (uploaded photos/videos/audio)
create table if not exists media_assets (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  storage_path text not null,
  public_url text,
  type text not null check (type in ('photo', 'video', 'audio')),
  date_taken date,
  location text,
  tags text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Memories (synthesized content from media assets)
create table if not exists memories (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  media_asset_id uuid references media_assets(id) on delete cascade,
  script text,
  voice_profile_id uuid references voice_profiles(id) on delete set null,
  audio_url text,
  video_url text,
  status text default 'processing' check (status in ('processing', 'needs_review', 'approved', 'rejected')),
  cooldown_until timestamptz,
  engagement_count int default 0,
  last_shown_at timestamptz,
  created_at timestamptz default now()
);

-- Interactions (engagement tracking for feed algorithm)
create table if not exists interactions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  memory_id uuid references memories(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('view', 'like', 'swipe', 'hold', 'recall', 'video_generated', 'audio_played')),
  duration_ms int,
  created_at timestamptz default now()
);

-- Session logs (for analytics and debugging)
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  memories_viewed int default 0,
  interactions_count int default 0
);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists idx_memories_patient on memories(patient_id);
create index if not exists idx_memories_status on memories(status);
create index if not exists idx_memories_cooldown on memories(cooldown_until);
create index if not exists idx_memories_last_shown on memories(last_shown_at);
create index if not exists idx_media_assets_patient on media_assets(patient_id);
create index if not exists idx_media_assets_type on media_assets(type);
create index if not exists idx_interactions_memory on interactions(memory_id);
create index if not exists idx_interactions_patient on interactions(patient_id);
create index if not exists idx_interactions_created on interactions(created_at);
create index if not exists idx_sessions_patient on sessions(patient_id);
create index if not exists idx_voice_profiles_patient on voice_profiles(patient_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table patients enable row level security;
alter table patient_settings enable row level security;
alter table voice_profiles enable row level security;
alter table media_assets enable row level security;
alter table memories enable row level security;
alter table interactions enable row level security;
alter table sessions enable row level security;

-- ============================================
-- RLS POLICIES - Tables
-- ============================================

-- Patients policies
create policy "Patients can view own data"
  on patients for select
  using (clerk_id = auth.jwt() ->> 'sub');

create policy "Patients can update own data"
  on patients for update
  using (clerk_id = auth.jwt() ->> 'sub');

create policy "Patients can insert own data"
  on patients for insert
  with check (clerk_id = auth.jwt() ->> 'sub');

-- Patient settings policy
create policy "Patient settings access"
  on patient_settings for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Voice profiles policy
create policy "Voice profiles access"
  on voice_profiles for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Media assets policy
create policy "Media assets access"
  on media_assets for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Memories policy
create policy "Memories access"
  on memories for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Interactions policy
create policy "Interactions access"
  on interactions for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Sessions policy
create policy "Sessions access"
  on sessions for all
  using (patient_id in (
    select id from patients where clerk_id = auth.jwt() ->> 'sub'
  ));

-- ============================================
-- RLS POLICIES - Storage Buckets
-- ============================================

-- Media assets bucket policies
create policy "Public read access for media-assets"
  on storage.objects for select
  using (bucket_id = 'media-assets');

create policy "Authenticated upload for media-assets"
  on storage.objects for insert
  with check (bucket_id = 'media-assets');

create policy "Authenticated delete for media-assets"
  on storage.objects for delete
  using (bucket_id = 'media-assets');

-- Voice samples bucket policies
create policy "Public read access for voice-samples"
  on storage.objects for select
  using (bucket_id = 'voice-samples');

create policy "Authenticated upload for voice-samples"
  on storage.objects for insert
  with check (bucket_id = 'voice-samples');

create policy "Authenticated delete for voice-samples"
  on storage.objects for delete
  using (bucket_id = 'voice-samples');

-- ============================================
-- FUNCTIONS
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

create trigger patient_settings_updated_at
  before update on patient_settings
  for each row execute function update_updated_at();
