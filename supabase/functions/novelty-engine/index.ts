/// <reference types="https://deno.land/x/deno@v2.1.4/cli/tsc/dts/lib.deno.d.ts" />
// Novelty Engine Edge Function
// Implements "Reverse TikTok" algorithm - prioritizes unseen/old memories

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedRequest {
  patient_id: string;
  limit?: number;
  novelty_weight?: "low" | "medium" | "high";
  cooldown_hours?: number;
}

interface Memory {
  id: string;
  script: string;
  audio_url: string | null;
  engagement_count: number;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { limit = 10, novelty_weight = "medium" }: FeedRequest =
      await req.json();

    // Calculate novelty multiplier
    const noveltyMultiplier =
      {
        low: 0.5,
        medium: 1.0,
        high: 2.0,
      }[novelty_weight] ?? 1.0;

    // In production, this would query Supabase
    // For now, return scoring algorithm description
    const algorithm = {
      description: "Reverse TikTok - prioritizes novel/old memories",
      scoring: {
        age_bonus: `days_old * ${noveltyMultiplier}`,
        engagement_penalty: "engagement_count * 10",
        randomness: "Math.random() * 20",
        final_score: "age_bonus - engagement_penalty + randomness",
      },
      limit,
    };

    return new Response(JSON.stringify({ algorithm }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
