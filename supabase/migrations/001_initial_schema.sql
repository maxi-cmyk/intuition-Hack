-- Echo Adaptive Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Caregivers (synced from Clerk)
create table caregivers (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique not null,
  email text not null,
  created_at timestamptz default now()
);

-- Patients (linked to caregivers, also authenticate via Clerk)
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique not null,
  caregiver_id uuid references caregivers(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- Voice Profiles
create table voice_profiles (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  name text not null,
  sample_url text,
  elevenlabs_voice_id text,
  status text default 'pending' check (status in ('pending', 'ready')),
  created_at timestamptz default now()
);

-- Media Assets (raw uploads)
create table media_assets (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  storage_path text not null,
  type text check (type in ('photo', 'video')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Memories (synthesized content)
create table memories (
  id uuid primary key default uuid_generate_v4(),
  media_asset_id uuid references media_assets(id) on delete cascade,
  script text,
  voice_profile_id uuid references voice_profiles(id),
  audio_url text,
  status text default 'processing' check (status in ('processing', 'needs_review', 'approved')),
  cooldown_until timestamptz,
  engagement_count int default 0,
  created_at timestamptz default now()
);

-- Patient Settings
create table patient_settings (
  patient_id uuid primary key references patients(id) on delete cascade,
  fixation_cooldown_hours int default 24,
  novelty_weight text default 'medium' check (novelty_weight in ('low', 'medium', 'high')),
  tap_sensitivity text default 'medium' check (tap_sensitivity in ('low', 'medium', 'high')),
  sundowning_time time default '18:00',
  pin_hash text not null
);

-- Interactions (engagement logs)
create table interactions (
  id uuid primary key default uuid_generate_v4(),
  memory_id uuid references memories(id) on delete cascade,
  interaction_type text check (interaction_type in ('like', 'swipe', 'recall', 'video_generated')),
  created_at timestamptz default now()
);

-- Indexes
create index idx_memories_status on memories(status);
create index idx_memories_cooldown on memories(cooldown_until);
create index idx_media_assets_patient on media_assets(patient_id);
create index idx_interactions_memory on interactions(memory_id);

-- Row Level Security
alter table caregivers enable row level security;
alter table patients enable row level security;
alter table voice_profiles enable row level security;
alter table media_assets enable row level security;
alter table memories enable row level security;
alter table patient_settings enable row level security;
alter table interactions enable row level security;

-- RLS Policies (caregiver access via Clerk JWT)
create policy "Caregivers can view own data"
  on caregivers for select
  using (clerk_id = auth.jwt() ->> 'sub');

create policy "Caregivers can view own patients"
  on patients for all
  using (caregiver_id in (
    select id from caregivers where clerk_id = auth.jwt() ->> 'sub'
  ));

-- Patient access via always_on_token (using service role for patient app)
