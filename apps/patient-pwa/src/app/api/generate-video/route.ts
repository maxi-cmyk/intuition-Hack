import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    // NOTE: OpenAI does not currently have a public Image-to-Video API (Sora is in limited beta).
    // This logic simulates the requested behavior.
    // When the API becomes available, it would look akin to:
    // const response = await openai.images.generateVideo({ image: imageUrl, prompt: "Animate this content" });

    // Simulate AI processing delay (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // For demo purposes, returning a generic soothing video URL
    // In a real production environment with access to SORA/Runway/Luma, this would be the generated URL.
    const mockVideoUrl =
      "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4";

    return NextResponse.json({ videoUrl: mockVideoUrl });
  } catch (error) {
    console.error("Video Generation Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
