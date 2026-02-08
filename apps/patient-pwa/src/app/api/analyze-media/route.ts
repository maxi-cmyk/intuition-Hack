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

    const prompt =
      "Extract metadata from this image. Output a JSON object with keys: 'date' (guess, or null if unsure), 'location' (guess, or null if unsure), 'people' (description string, or null), 'summary' (Write a very short, warm, reminiscent narration (max 10 words) for this photo, addressing the viewer as 'you'. It should sound like a gentle familiar memory. make it descriptive and also simple as the person is very confused. You are a kind parent explaining a picture to a child very simply). If you can't extract, return null for that field. OUTPUT RAW JSON ONLY.";

    console.log("Analyzing with Ollama...");
    const responseText = await ollama.generate(prompt, base64Image, true);
    console.log("Ollama Analysis:", responseText);

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
