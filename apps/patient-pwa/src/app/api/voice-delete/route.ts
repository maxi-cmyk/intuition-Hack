import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "ElevenLabs API key not configured" },
                { status: 500 }
            );
        }

        const { voiceId } = await req.json();

        if (!voiceId) {
            return NextResponse.json(
                { error: "Missing voiceId" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/voices/${voiceId}`,
            {
                method: "DELETE",
                headers: {
                    "xi-api-key": apiKey,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to delete voice" },
                { status: response.status }
            );
        }

        return NextResponse.json({ status: "deleted", voiceId });
    } catch (error) {
        console.error("Voice Delete Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete voice" },
            { status: 500 }
        );
    }
}
