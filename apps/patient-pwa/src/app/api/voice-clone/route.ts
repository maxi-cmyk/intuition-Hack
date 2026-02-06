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

        const formData = await req.formData();
        const name = formData.get("name") as string;
        const audio = formData.get("audio") as Blob;

        if (!name || !audio) {
            return NextResponse.json(
                { error: "Missing name or audio file" },
                { status: 400 }
            );
        }

        const audioBuffer = Buffer.from(await audio.arrayBuffer());

        const elevenLabsForm = new FormData();
        elevenLabsForm.append("name", name);
        elevenLabsForm.append(
            "files",
            new Blob([audioBuffer], { type: "audio/webm" }),
            "voice-sample.webm"
        );

        const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
            method: "POST",
            headers: {
                "xi-api-key": apiKey,
            },
            body: elevenLabsForm,
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = "Failed to create voice clone";
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.detail?.message || errorData.detail || errorMessage;
            } catch {
                errorMessage = responseText || errorMessage;
            }
            return NextResponse.json({ error: errorMessage }, { status: response.status });
        }

        const data = JSON.parse(responseText);
        return NextResponse.json({
            voice_id: data.voice_id,
            name: name,
            status: "ready",
        });
    } catch (error) {
        console.error("Voice Clone Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process voice clone" },
            { status: 500 }
        );
    }
}
