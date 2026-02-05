# Echo Adaptive

A reminiscence therapy platform with adaptive accessibility for dementia patients.

## Architecture

```
echo-adaptive/
├── apps/
│   ├── caregiver-web/    # Next.js dashboard for caregivers
│   └── patient-pwa/      # Next.js PWA for patients (offline-first)
├── supabase/
│   ├── migrations/       # Database schema
│   └── functions/        # Deno Edge Functions
│       ├── memory-synthesis/   # GPT-4o image analysis
│       ├── voice-synthesis/    # ElevenLabs TTS & cloning
│       ├── novelty-engine/     # "Reverse TikTok" feed algorithm
│       └── recall-scheduler/   # Spaced repetition logic
└── shared/               # Shared TypeScript types
```

## Prerequisites

- **Node.js** v18+
- **npm** v9+
- **Supabase CLI** (for edge functions)
- **Deno** v1.40+ (for local edge function development)

## Dependencies

### Caregiver Web App

| Package                 | Purpose         |
| ----------------------- | --------------- |
| `next`                  | React framework |
| `react` / `react-dom`   | UI library      |
| `@clerk/nextjs`         | Authentication  |
| `@supabase/supabase-js` | Database client |
| `tailwindcss`           | Styling         |

### Patient PWA

| Package                 | Purpose                    |
| ----------------------- | -------------------------- |
| `next`                  | React framework (PWA mode) |
| `react` / `react-dom`   | UI library                 |
| `@clerk/nextjs`         | Authentication             |
| `@supabase/supabase-js` | Database client            |
| `tailwindcss`           | Styling                    |

### Edge Functions (Deno)

| Import                       | Purpose                          |
| ---------------------------- | -------------------------------- |
| `jsr:@supabase/functions-js` | Supabase runtime types           |
| OpenAI API                   | GPT-4o Vision for image analysis |
| ElevenLabs API               | Voice cloning & text-to-speech   |

## Getting Started

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd echo-adaptive
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in your API keys (see below)

# 3. Run caregiver dashboard
npm run dev:caregiver

# 4. Run patient app (in another terminal)
npm run dev:patient
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable                            | Description                              |
| ----------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key                         |
| `CLERK_SECRET_KEY`                  | Clerk secret key                         |
| `NEXT_PUBLIC_SUPABASE_URL`          | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Supabase anonymous key                   |
| `OPENAI_API_KEY`                    | OpenAI API key (for GPT-4o)              |
| `ELEVENLABS_API_KEY`                | ElevenLabs API key (for voice synthesis) |

## Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy memory-synthesis
supabase functions deploy voice-synthesis
supabase functions deploy novelty-engine
supabase functions deploy recall-scheduler
```

## Scripts

| Command                 | Description             |
| ----------------------- | ----------------------- |
| `npm run dev:caregiver` | Start caregiver web app |
| `npm run dev:patient`   | Start patient PWA       |
| `npm run build`         | Build all workspaces    |
| `npm run lint`          | Lint all workspaces     |
