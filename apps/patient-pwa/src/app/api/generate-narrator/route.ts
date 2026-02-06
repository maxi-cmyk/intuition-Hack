import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { imageUrl, voiceId } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    // 1. Generate Script using GPT-4o
    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Write a very short, warm, reminiscent narration (max 15 words) for this photo, addressing the viewer as 'you'. It should sound like a gentle familiar memory. make it descriptive and also simple as the person is very confused. You are a kind parent explaining a picture to a child very simply",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const script =
      scriptResponse.choices[0].message.content ||
      "This looks like a wonderful memory.";

    // 2. Determine Voice
    // Map internal voice IDs to OpenAI TTS voices
    // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    const voiceMap: Record<
      string,
      "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
    > = {
      "1": "alloy", // Default Narrator
    };

    // If activeVoice is not mapped, pick 'shimmer' as a gentle female alternative
    // or 'onyx' as male. Defaulting to 'shimmer' for unmapped custom voices for now.
    const selectedVoice = voiceMap[voiceId as string] || "shimmer";

    // 3. Generate Audio using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice,
      input: script,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = `data:audio/mp3;base64,${buffer.toString("base64")}`;

    return NextResponse.json({ script, audioUrl: audioBase64 });
  } catch (error) {
    console.error("Narration Generation Error:", error);
    return NextResponse.json(
      { error: "Narration generation failed" },
      { status: 500 },
    );
  }
}
