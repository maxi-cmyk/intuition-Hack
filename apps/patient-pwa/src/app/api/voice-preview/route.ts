import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 },
      );
    }

    const { voiceId, text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Use default ElevenLabs voice (Rachel) if voiceId is missing or "default"
    const targetVoiceId =
      !voiceId || voiceId === "default" ? "21m00Tcm4TlvDq8ikWAM" : voiceId;

    console.log(
      "Voice Preview: Using voiceId:",
      targetVoiceId,
      "for text:",
      text.substring(0, 50),
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs Error:", response.status, error);
      return NextResponse.json(
        { error: error || "Failed to generate speech" },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Voice Preview Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to preview voice",
      },
      { status: 500 },
    );
  }
}
