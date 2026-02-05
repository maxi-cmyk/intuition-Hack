/// <reference types="https://deno.land/x/deno@v2.1.4/cli/tsc/dts/lib.deno.d.ts" />
// Voice Synthesis - ElevenLabs voice cloning and text-to-speech

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CloneVoiceRequest {
  voice_profile_id: string;
  name: string;
  sample_url: string;
}

interface SynthesizeSpeechRequest {
  script: string;
  voice_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "clone") {
      const { name, sample_url }: CloneVoiceRequest = await req.json();

      const audioResponse = await fetch(sample_url);
      const audioBlob = await audioResponse.blob();

      const formData = new FormData();
      formData.append("name", name);
      formData.append("files", audioBlob, "sample.wav");

      const cloneResponse = await fetch(
        "https://api.elevenlabs.io/v1/voices/add",
        {
          method: "POST",
          headers: {
            "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY")!,
          },
          body: formData,
        },
      );

      if (!cloneResponse.ok) {
        throw new Error(`ElevenLabs clone error: ${cloneResponse.statusText}`);
      }

      const cloneData = await cloneResponse.json();

      return new Response(
        JSON.stringify({ success: true, voice_id: cloneData.voice_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "synthesize") {
      const { script, voice_id }: SynthesizeSpeechRequest = await req.json();
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY")!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: script,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.75,
            },
          }),
        },
      );

      if (!ttsResponse.ok) {
        throw new Error(`ElevenLabs TTS error: ${ttsResponse.statusText}`);
      }

      return new Response(ttsResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
        },
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
