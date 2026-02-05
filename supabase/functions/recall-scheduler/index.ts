/// <reference types="https://deno.land/x/deno@v2.1.4/cli/tsc/dts/lib.deno.d.ts" />
// Recall Scheduler - spaced repetition for memory reinforcement

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecordInteractionRequest {
  memory_id: string;
  interaction_type: "like" | "swipe" | "recall" | "video_generated";
  cooldown_hours?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "record") {
      const {
        memory_id,
        interaction_type,
        cooldown_hours = 24,
      }: RecordInteractionRequest = await req.json();

      let cooldown_until = null;
      if (interaction_type === "like") {
        cooldown_until = new Date(
          Date.now() + cooldown_hours * 60 * 60 * 1000,
        ).toISOString();
      }

      return new Response(
        JSON.stringify({
          success: true,
          memory_id,
          interaction_type,
          cooldown_until,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "stats") {
      const algorithm = {
        description: "Spaced repetition for memory reinforcement",
        cooldown: "Applied when user likes a memory",
        engagement: "Tracked to reduce over-fixation",
      };

      return new Response(JSON.stringify(algorithm), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
