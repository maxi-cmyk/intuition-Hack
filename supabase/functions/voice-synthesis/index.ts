// Voice Synthesis Edge Function
// Uses ElevenLabs for voice cloning and text-to-speech

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
  memory_id: string;
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
      // Clone voice from audio sample
      const { name, sample_url }: CloneVoiceRequest = await req.json();

      // Download the audio sample
      const audioResponse = await fetch(sample_url);
      const audioBlob = await audioResponse.blob();

      // Create FormData for ElevenLabs
      const formData = new FormData();
      formData.append("name", name);
      formData.append("files", audioBlob, "sample.wav");

      // Clone voice via ElevenLabs API
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
      // Generate speech from script
      const { memory_id, script, voice_id }: SynthesizeSpeechRequest =
        await req.json();

      // Call ElevenLabs TTS API
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

      // Return audio directly
      const audioData = await ttsResponse.arrayBuffer();

      return new Response(
        JSON.stringify({
          success: true,
          memory_id,
          audio_size: audioData.byteLength,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
