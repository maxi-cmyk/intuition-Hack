# Echo Adaptive

A reminiscence therapy platform with adaptive accessibility for dementia patients.

## Architecture

```
echo-adaptive/
├── apps/
│   ├── caregiver-web/    # Next.js + Clerk + Tailwind
│   └── patient-pwa/      # Next.js PWA (offline-first)
├── supabase/
│   ├── migrations/       # Database schema
│   └── functions/        # Edge Functions
└── shared/               # Types, constants
```

## Getting Started

```bash
# Install dependencies
npm install

# Run caregiver dashboard
npm run dev:caregiver

# Run patient app
npm run dev:patient
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
