import { NextResponse } from "next/server";
import { OllamaClient } from "../../../lib/ollama";

export async function POST(req: Request) {
  try {
    const { imageUrl, voiceId } = await req.json();

    // 1. Fetch Image and Convert to Base64 (for Ollama)
    // Small limit to avoid blowing up payload
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // 2. Generate Script using Ollama (Llava)
    const ollama = new OllamaClient(
      process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      process.env.OLLAMA_VISION_MODEL || "llava",
    );

    console.log("Generating narration with Ollama...");
    const prompt =
      "Write a very short, warm, reminiscent narration (max 10 words) for this photo, addressing the viewer as 'you'. It should sound like a gentle familiar memory. make it descriptive and also simple as the person is very confused. You are a kind parent explaining a picture to a child very simply. Output ONLY the narration text.";

    const script = await ollama.generate(prompt, base64Image);
    console.log("Ollama Script:", script);

    // 3. Generate Audio using ElevenLabs
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY is missing");
    }

    // Default voice (Rachel) if none provided
    const targetVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM";

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("ElevenLabs Error:", errorText);
      throw new Error("TTS Generation failed");
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString("base64")}`;

    return NextResponse.json({ script, audioUrl: audioBase64 });
  } catch (error) {
    console.error("Narration Generation Error:", error);
    return NextResponse.json(
      { error: "Narration generation failed" },
      { status: 500 },
    );
  }
}
