export interface QueueItem {
  id: string;
  name: string;
  status: "analyzing" | "synthesizing" | "needs_review" | "ready" | "failed";
  description?: string;
  people?: string;
  location?: string;
  date?: string;
  url?: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed";
  samples: { filename: string; date: string }[];
}
