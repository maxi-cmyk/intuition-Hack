import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image for a reminiscence therapy app for patients with dementia. Provide a brief, warm, and engaging summary of what is happening. Also identify who is likely in the photo (e.g. 'two young grandchildren', 'a daughter', 'friends') - use generic relationship terms. Estimate the date or season if visual cues exist (e.g. 'Christmas 2023' or 'Summer afternoon'). Return strictly valid JSON with keys: 'summary', 'people', 'date'.",
            },
            {
              type: "image_url",
              image_url: {
                url: fileUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(content || "{}");
    } catch (e) {
      console.error("Failed to parse JSON from AI", content);
      result = {
        summary: "Analysis completed but format was invalid.",
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
