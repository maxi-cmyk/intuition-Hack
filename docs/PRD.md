# Product Requirements Document (PRD)

## 1. Overview

Echo Adaptive is a reminiscence therapy platform for dementia patients. It uses AI to narrate personal memories and adapts its interface to the user's cognitive state.

## 2. Core Features (MVP)

- **Forever Feed**: TikTok-style vertical scroll of memories.
- **AI Narration**:
  - **Vision**: Analyzes photos using **Local Ollama (Llava)** to generate context.
  - **Voice**: Reads narration using **ElevenLabs** (with Voice Cloning support).
- **Voice Mode**: Hands-free control ("Next", "Like", "Recall") via Web Speech API.
- **Sundowning Mode**: Auto-activates warm amber theme after 6 PM.
- **Engagement Tracking**: Likes and Recalls are logged to adapt content.

## 3. Architecture

- **Frontend**: Next.js (PWA)
- **Backend**: Supabase (Auth, DB, Storage)
- **AI Provider**:
  - **Local**: Ollama (Llava) exposed via Ngrok for analysis.
  - **Cloud**: ElevenLabs for high-quality TTS.

## 4. Security

- **RLS**: Row-Level Security ensures data isolation.
- **PIN**: Settings protected by 4-digit PIN.

## 5. Deployment

- **Vercel**: hosting the PWA.
- **Ngrok**: tunneling local AI to the cloud.
