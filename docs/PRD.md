# Product Requirements Document (PRD)

## Echo Adaptive: Personalized Reminiscence Therapy Platform

### 1. Problem Statement

Patients with dementia and cognitive impairment suffer from isolation, anxiety, and loss of identity. Traditional reminiscence therapy is resource-intensive and often static. Caregivers struggle to provide continuous, personalized engagement that adapts to the patient's fluctuating cognitive state (e.g., sundowning).

### 2. Product Goal

To provide an autonomous, adaptive digital companion that delivers personalized media (memories) to patients, using AI to narrate context and an "Adaptation Engine" to adjust the interface based on environmental and behavioral cues.

### 3. User Personas

- **Primary User (Patient)**: Seniors with mild-to-moderate dementia.
  - **Needs**: Simplicity, clarity, emotional connection, autonomy.
  - **Capabilities**: Limited fine motor skills, potential confusion with complex navigation.
- **Secondary User (Caregiver/Family)**: Administers the device and uploads content.
  - **Needs**: Easy upload tools, peace of mind, insight into engagement.

### 4. Key Features

#### 4.1. The "Forever Feed" (Patient View)

- **Reverse-TikTok Interface**: Full-screen, vertical scroll-snap feed of memories.
- **Automated Narration**: AI-generated voiceovers explaining the memory (who, when, what) to aid recall.
- **Simple Interactions**: Large "Like" (Heart) and "Recall" (Arrow loop) buttons.
  - **Like**: Increases engagement score and applies a **24-hour cooldown** to prevent repetitive looping.
  - **Recall**: Logs a recall event. Future viewings may trigger an **Active Recall Prompt** ("Do you remember this?") to reinforce memory pathways.
    - **"Yes"**: Confirms retention and maintains current schedule.
    - **"No"**: Increases frequency (clears cooldown) to strengthen the memory.
- **Zero-UI Navigation**: No complex menus; simple gestures.

#### 4.2. Media Management (Caregiver/Patient Mode)

- **Security**: PIN-protected settings area.
- **Upload**: Support for Photos, Videos, and Audio.
- **AI Analysis**: Automatically generates descriptions/scripts from uploaded images using Vision AI.
- **Voice Customization**: Caregivers can clone a familiar voice (e.g., family member) using ElevenLabs integration for personalized narration.

#### 4.3. Adaptation Engine

- **Sundowning Support**: Automatically shifts UI to warmer, calmer colors after 6:00 PM to mitigate agitation.
- **Accessibility Mode**: Switches to "Voice Mode" if repeated missed taps are detected.

#### 4.4. Security & Auth

- **Identity**: Clerk Authentication (Passwordless/OTP).
- **Data**: Row-Level Security (RLS) ensuring patients only see their own data.

### 5. Non-Functional Requirements

- **Performance**: Instant playback (prefetching).
- **Availability**: PWA (Offline capable).
- **Privacy**: HIPAA-compliant interactions (secure storage).
