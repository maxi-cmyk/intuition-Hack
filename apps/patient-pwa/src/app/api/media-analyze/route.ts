import { NextResponse } from "next/server";
import { OllamaClient } from "../../../lib/ollama";

export async function POST(req: Request) {
  try {
    const { fileUrl, mediaType } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });
    }

    // Basic handling for videos or non-images
    if (mediaType === "video") {
      return NextResponse.json({
        summary: "Video uploaded. AI analysis for video is currently limited.",
        people: "Unknown",
        date: "Unknown",
      });
    }

    // 1. Fetch Image and Convert to Base64 (for Ollama)
    // Small limit to avoid blowing up payload or fetch failure
    let base64Image = "";
    try {
      const imageRes = await fetch(fileUrl);
      const imageBlob = await imageRes.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString("base64");
    } catch (e) {
      console.error("Failed to fetch image for analysis", e);
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 },
      );
    }

    // 2. Analyze using Ollama (Llava)
    const ollama = new OllamaClient(
      process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      process.env.OLLAMA_VISION_MODEL || "llava",
    );

    const prompt = `
Role: You are a compassionate memory-care assistant specializing in reminiscence therapy.

Task: Analyze the attached image and extract metadata to help a senior citizen with dementia identify the moment.

Guidelines for 'Summary':

Tone: Gentle, familiar, and reassuring.

Perspective: Second person ("You").

Clarity: Use high-frequency words and simple sentence structures. Avoid metaphors or complex timelines.

Goal: Anchor the viewer in the emotion of the photo (e.g., "You are smiling at the beach with your friend.")

Output Format: Return RAW JSON ONLY. Do not include markdown blocks or conversational filler.

Schema: { "date": "Estimated YYYY-MM-DD or null", "location": "Estimated city/setting or null", "people": "Brief physical description of individuals present or null", "summary": "String (Max 10 words. Simple, warm narration addressing 'you'.)`
    // console.log("Analyzing with Ollama...");
    const responseText = await ollama.generate(prompt, base64Image, true);
    // console.log("Ollama Analysis:", responseText);

    let result;
    try {
      // Clean up markdown code blocks if present
      const jsonStr = responseText
        .replace(/```json\n|\n```/g, "")
        .replace(/```/g, "");
      result = JSON.parse(jsonStr || "{}");
    } catch (e) {
      console.error("Failed to parse JSON from AI", responseText);
      // Fallback result
      result = {
        summary: responseText.substring(0, 100) + "...",
        people: "Unknown",
        date: "Unknown",
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
