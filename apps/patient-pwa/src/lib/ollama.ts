export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl = "http://localhost:11434", model = "llava") {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(prompt: string, imageBase64?: string, jsonMode = false) {
    const body: any = {
      model: this.model,
      prompt: prompt,
      stream: false,
    };

    if (jsonMode) {
      body.format = "json";
    }

    if (imageBase64) {
      // Ensure raw base64 without data URI prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      body.images = [cleanBase64];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Ollama Request Failed:", error);
      throw error;
    }
  }
}
