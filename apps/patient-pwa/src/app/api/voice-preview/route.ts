import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "ElevenLabs API key not configured" },
                { status: 500 }
            );
        }

        const { voiceId, text } = await req.json();

        if (!voiceId || !text) {
            return NextResponse.json(
                { error: "Missing voiceId or text" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_monolingual_v1",
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json(
                { error: error || "Failed to generate speech" },
                { status: response.status }
            );
        }

        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
            headers: { "Content-Type": "audio/mpeg" },
        });
    } catch (error) {
        console.error("Voice Preview Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to preview voice" },
            { status: 500 }
        );
    }
}
