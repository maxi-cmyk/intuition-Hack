// Echo Adaptive - Shared Types

// Database tables
export interface Caregiver {
  id: string;
  clerk_id: string;
  email: string;
  created_at: string;
}

export interface Patient {
  id: string;
  caregiver_id: string;
  display_name: string;
  always_on_token: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  patient_id: string;
  storage_path: string;
  type: "photo" | "video";
  metadata: {
    date?: string;
    location?: string;
    tags?: string[];
  };
  created_at: string;
}

export interface Memory {
  id: string;
  media_asset_id: string;
  script: string;
  voice_profile_id: string | null;
  audio_url: string | null;
  status: "processing" | "needs_review" | "approved";
  cooldown_until: string | null;
  engagement_count: number;
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  patient_id: string;
  name: string;
  sample_url: string | null;
  elevenlabs_voice_id: string | null;
  status: "pending" | "ready";
  created_at: string;
}

export interface PatientSettings {
  patient_id: string;
  fixation_cooldown_hours: number;
  novelty_weight: "low" | "medium" | "high";
  tap_sensitivity: "low" | "medium" | "high";
  sundowning_time: string; // HH:MM format
  pin_hash: string;
}

export interface Interaction {
  id: string;
  memory_id: string;
  interaction_type: "like" | "swipe" | "recall" | "video_generated";
  created_at: string;
}

// API types
export interface MemorySynthesisRequest {
  media_asset_id: string;
  image_url: string;
}

export interface MemorySynthesisResponse {
  script: string;
  date?: string;
  location?: string;
  tags: string[];
}

export interface VoiceSynthesisRequest {
  memory_id: string;
  script: string;
  voice_profile_id: string;
}

// Patient app types
export interface MemoryCard {
  id: string;
  image_url: string;
  date: string;
  location: string;
  audio_url?: string;
}
