# Product Requirements Document (PRD)

## 1. Overview

**Echo Adaptive** is a reminiscence therapy platform designed for dementia patients. It delivers personalized memories through an intuitive, TikTok-style interface with AI-powered narration and adaptive accessibility features.

---

## 2. Core Features

### 2.1 Forever Feed (Patient View)

- **Fullscreen Memory Display**: Photos displayed in a vertical snap-scroll feed
- **AI Narration**: Each memory plays with personalized voiceover
- **Interaction Buttons**:
  - ❤️ **Like**: Acknowledges a memory, applies 24-hour cooldown to prevent repetition
  - 🔄 **Recall**: Marks memory as significant for future "Do you remember?" prompts
- **Infinite Scroll**: Memories shuffle and repeat when all have been shown

### 2.2 AI Integration

| Component         | Technology     | Purpose                                               |
| ----------------- | -------------- | ----------------------------------------------------- |
| Vision Analysis   | Ollama (Llava) | Extract metadata (people, location, date) from photos |
| Script Generation | Ollama (Llava) | Create warm, simple narration scripts                 |
| Text-to-Speech    | ElevenLabs     | Generate voiceover audio (eleven_multilingual_v2)     |
| Voice Cloning     | ElevenLabs     | Clone familiar voices for personalized narration      |

#### Using Ollama + llava + ngrok

We deliberately chose to run our vision-language model **locally** rather than using a cloud API (e.g. GPT-4 Vision, Google Cloud Vision). There are three reasons:

1. **Privacy** — Echo processes deeply personal family photos. By running LLaVA on the developer's own machine, patient images never leave the local network. No photos are uploaded to third-party AI providers, which is critical when handling sensitive medical/personal content.

2. **Cost** — Cloud vision APIs charge per request. Since every uploaded photo is analyzed and every memory needs a narration script, API costs would scale quickly. Ollama is free and open-source — the only cost is the hardware the user already owns.

3. **Control & Reliability** — There is no vendor lock-in, no rate limits, and no API key quotas. The model runs offline once downloaded, making the system resilient to internet outages or provider policy changes.

**The ngrok bridge**: Since Ollama runs on `localhost:11434`, it is not reachable from the deployed app on Vercel or from mobile devices. We use **ngrok** to create a secure HTTPS tunnel that exposes `localhost:11434` to the internet. The deployed app connects to the ngrok URL, which forwards requests to the local Ollama server.

> ⚠️ **Trade-off**: The ngrok URL changes on every restart (unless using a paid static domain), so the `OLLAMA_BASE_URL` environment variable must be updated each time. This is acceptable for a hackathon/dev context where the developer's machine is the AI backend.

### 2.3 Adaptive Modes

#### Sundowning Mode

- **Trigger**: Activates after 6:00 PM (configurable)
- **Effects**:
  - Warm amber color palette
  - Sepia filter on images/videos
  - Reduced visual stimulation

#### Voice Mode

- **Trigger**: 3+ missed taps detected
- **Effects**:
  - Large microphone button appears
  - Voice commands enabled: "Next", "Like", "Recall"
  - Uses Web Speech API for recognition

### 2.4 Caregiver Settings (PIN Protected)

- **Media Management**:
  - Upload photos/videos via drag-drop or file picker
  - AI auto-analyzes uploaded media
  - Edit metadata (description, date, location, people)
  - Greenlight/Reject memories for patient feed
  - View and manage upload history
- **Neural Proxy (Voice Cloning)**:
  - Record 1-minute voice sample
  - Clone voice for personalized narration
  - Set active narrator voice
  - Manage cloned voices
- **Account Settings**:
  - Change PIN (default: 1234)
  - Sign out

---

## 3. API Routes

| Endpoint                 | Method | Purpose                                        |
| ------------------------ | ------ | ---------------------------------------------- |
| `/api/media-analyze`     | POST   | Analyze image with Ollama, extract metadata    |
| `/api/narrator-generate` | POST   | Generate narration script + audio for a memory |
| `/api/voice-clone`       | POST   | Clone a voice from audio sample (ElevenLabs)   |
| `/api/voice-delete`      | DELETE | Delete a cloned voice                          |
| `/api/voice-preview`     | POST   | Preview TTS with specified voice               |

---

## 4. Data Model

### Tables (Supabase)

#### `media_assets`

- `id`, `user_id`, `storage_path`, `public_url`
- `type` (image/video)
- `metadata` (JSON: summary, people, location, date)
- `created_at`

#### `memories`

- `id`, `user_id`, `media_asset_id`
- `script` (AI-generated narration text)
- `audio_url` (generated TTS audio)
- `status` (needs_review, approved, rejected)
- `engagement_score`, `recall_count`
- `cooldown_until` (24hr cooldown after Like)
- `created_at`

#### `voices`

- `id`, `user_id`, `voice_id` (ElevenLabs ID)
- `name`, `is_active`
- `created_at`

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Patient Device                        │
│                   (Next.js PWA)                          │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   Supabase    │           │  API Routes   │
│  (Auth, DB,   │           │  (Next.js)    │
│   Storage)    │           └───────┬───────┘
└───────────────┘                   │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │ Ollama (Local)│               │  ElevenLabs   │
            │ via ngrok     │               │  (Cloud TTS)  │
            │ - Llava model │               │ - TTS         │
            │ - Analysis    │               │ - Cloning     │
            └───────────────┘               └───────────────┘
```

---

## 6. Security

| Layer           | Implementation                       |
| --------------- | ------------------------------------ |
| Authentication  | Clerk (passwordless email)           |
| Authorization   | Supabase RLS (Row-Level Security)    |
| Settings Access | 4-digit PIN protection               |
| Data Isolation  | Users can only access their own data |

---

## 7. Deployment

| Component          | Platform                    |
| ------------------ | --------------------------- |
| PWA Frontend       | Vercel                      |
| Database & Storage | Supabase                    |
| Local AI (Ollama)  | Developer machine via ngrok |
| Voice Services     | ElevenLabs Cloud            |

### Environment Variables Required

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI
ELEVENLABS_API_KEY=
OLLAMA_BASE_URL=         # ngrok URL
OLLAMA_VISION_MODEL=llava
```

---

## 8. Future Enhancements

- [ ] Video memory support with generated animations
- [ ] Active Recall prompts ("Do you remember this?")
- [ ] Multi-patient support per caregiver
- [ ] Offline mode with service worker caching
- [ ] Analytics dashboard for engagement tracking
