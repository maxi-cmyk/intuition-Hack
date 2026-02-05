/// <reference types="https://deno.land/x/deno@v2.1.4/cli/tsc/dts/lib.deno.d.ts" />
// Memory Synthesis - analyzes images with GPT-4o to generate narrative scripts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SynthesisRequest {
  media_asset_id: string;
  image_url: string;
}

interface SynthesisResponse {
  script: string;
  date?: string;
  location?: string;
  tags: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { media_asset_id, image_url }: SynthesisRequest = await req.json();

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a memory narrator for dementia patients. Analyze the image and create a warm, descriptive narrative that helps trigger memories. 
            
            Return a JSON object with:
            - script: A 2-3 sentence narrative describing the scene in present tense, mentioning people, activities, and emotions
            - date: Estimated date if visible or inferable (format: "Month YYYY" or "circa 1980s")
            - location: Location if identifiable
            - tags: Array of relevant memory tags (e.g., "family", "birthday", "vacation", "1960s")
            
            Keep the tone warm, positive, and personal.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: image_url },
                },
                {
                  type: "text",
                  text: "Analyze this memory photo and generate a narrative script.",
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 500,
        }),
      },
    );

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisResult: SynthesisResponse = JSON.parse(
      openaiData.choices[0].message.content,
    );

    return new Response(
      JSON.stringify({
        success: true,
        media_asset_id,
        analysis: analysisResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
