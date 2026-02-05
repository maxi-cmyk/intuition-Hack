# Echo Adaptive

A reminiscence therapy platform with adaptive accessibility for dementia patients.

## Architecture

```
echo-adaptive/
├── apps/
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

# 3. Run the app
npm run dev
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

## Settings Access

Settings are protected by a PIN. Default PIN: `1234`

To access settings:

1. Tap the ⚙️ icon in the top-right corner
2. Enter your PIN
3. You can change the PIN in the settings page

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

| Command         | Description          |
| --------------- | -------------------- |
| `npm run dev`   | Start patient PWA    |
| `npm run build` | Build for production |
| `npm run lint`  | Lint code            |
