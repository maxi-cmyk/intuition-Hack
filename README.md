# Echo Adaptive: Tiktok, but for Dementia

> **A reminiscence therapy platform with adaptive accessibility for dementia patients.**

<p align="center">
  <img width="200" src="https://github.com/user-attachments/assets/8eaab12e-8eb0-4cfa-81eb-7039a7628929" />
  <img width="200" src="https://github.com/user-attachments/assets/9f4981b7-c771-43a7-b6f7-04dc972f0ed1" />
  <img width="200" src="https://github.com/user-attachments/assets/f5bd56b8-b924-4ba5-b620-e09798c26092" />
</p>

Echo Adaptive is a digital companion that delivers personalized memories to patients with cognitive impairment. It uses AI-powered narration and an "Adaptation Engine" that dynamically adjusts the interface based on time of day, behavioral cues, and environmental factors.

---

## ✨ Features

| Feature             | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| **Forever Feed**    | TikTok-style fullscreen memory viewer with vertical snap-scroll          |
| **AI Narration**    | Automatic voiceover generation for each memory using GPT-4o + ElevenLabs |
| **Voice Commands**  | Say "Next", "Like", or "Recall" to control the app hands-free            |
| **Sundowning Mode** | Warm amber theme automatically activates after 6PM                       |
| **Error Tolerance** | Detects missed taps and offers Voice Mode for accessibility              |
| **Voice Cloning**   | Clone a familiar voice (e.g., family member) for personalized narration  |
| **PIN Protection**  | Caregiver settings are secured behind a numeric PIN                      |

---

## ❤️ Core Interactions

- **Like (Heart)**: Acknowledges a memory and applies a **24-hour cooldown** to prevent repetitive loops.
- **Recall (Loop)**: Logs a meaningful memory. Future viewings may trigger an **Active Recall Prompt** ("Do you remember this?") to help strengthen neural pathways.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 + React + Tailwind CSS
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL + Row-Level Security)
- **AI**:
  - **Vision/Text**: Local Ollama (Llava) via Ngrok tunnel
  - **Voice**: ElevenLabs (TTS)

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- npm v9+
- Supabase project (with anon key)
- Clerk application (with publishable + secret keys)
- OpenAI API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd intuition-Hack
npm install
```

### 2. Configure Environment

Create a `.env.local` file in `apps/patient-pwa/`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

### 3. Set Up Database

Apply the schema to your Supabase project:

```bash
# Option A: Via Supabase Dashboard
# Copy contents of supabase/migrations/001_initial_schema.sql and run in SQL Editor

# Option B: Via CLI
supabase link --project-ref <your-ref>
supabase db push
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Usage

### 1. **Setup AI Tunnel**

Before using the app, ensure your local AI is reachable:

```bash
./scripts/expose-ollama.sh
# Copy the URL -> Vercel Env Var: OLLAMA_BASE_URL
```

### 2. **Get Started**

1.  **Sign In**: Use your email (Clerk passwordless login).
2.  **Unlock Settings**: Tap the ⚙️ icon (top-right). Default PIN: `1234`.

### 3. **Manage Content**

- **Upload**: In Settings > Media Management, upload photos/videos.
  - _Note_: The AI will automatically analyze them to generate descriptions.
- **Review**: Greenlight memories to add them to the patient's feed.

### 4. **Clone a Voice**

1.  Go to **Settings > Neural Proxy**.
2.  Tap "Start Recording" and read the prompt for 1 minute.
3.  Name the voice (e.g., "Grandma") and save.
4.  Select it as the **Active Narrator**.

### 5. **Patient Mode**

- **Watch**: Memories play automatically with AI narration.
- **Interact**:
  - Double-tap to **Like** ❤️ (boosts engagement score).
  - Long-press to **Recall** 🔄 (triggers future "Do you remember?" prompts).
- **Voice Control**: Tap empty space 3x (or miss targets) to activate Voice Mode. Say "Next", "Like", or "Recall".

---

## 🌙 Adaptive Modes

| Mode           | Trigger        | Effect                                       |
| -------------- | -------------- | -------------------------------------------- |
| **Sundowning** | After 6:00 PM  | Warm amber colors, sepia-tinted media        |
| **Voice Mode** | 3+ missed taps | Large mic button, speech recognition enabled |

---

## 📁 Project Structure

```
intuition-Hack/
├── apps/
│   └── patient-pwa/        # Next.js PWA
│       ├── src/app/        # Pages & API routes
│       ├── src/hooks/      # useSupabase, useAdaptationEngine
│       └── src/services/   # Video caching
├── supabase/
│   └── migrations/         # Database schema (RLS enabled)
├── docs/                   # PRD, Architecture, Design
└── README.md               # This file
```

---

## 📜 Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run lint`  | Run ESLint               |

---

## 🔐 Security Notes

- All data is protected by Supabase Row-Level Security (RLS)
- Patients can only access their own memories
- Settings are PIN-protected
- Auth tokens are refreshed automatically via Clerk

---

## 📄 License

MIT
