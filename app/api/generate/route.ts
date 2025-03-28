import { NextResponse } from "next/server";
import { STYLE_PRESETS } from "@/lib/constants";

export const runtime = "edge"; // Optional: Use Edge Runtime for faster response

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Validate API Key
    const apiKey = formData.get("api_key") as string;
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Validate Image
    const imageFile = formData.get("image") as File;
    if (!imageFile || !imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 },
      );
    }

    // Validate Preset
    const presetId = formData.get("style") as string;
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      return NextResponse.json(
        { error: "Invalid style preset" },
        { status: 400 },
      );
    }

    // Prepare request to Chinese AI service
    const serviceFormData = new FormData();
    serviceFormData.append("image", imageFile);
    serviceFormData.append("prompt", preset.promptTemplate);
    serviceFormData.append("negative_prompt", preset.negativePrompt);
    serviceFormData.append("params", JSON.stringify(preset.apiParams));

    // Call Chinese AI service (example using Baidu)
    const response = await fetch("https://api.baidu.com/ai/image/v2/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BAIDU_AI_KEY}`,
      },
      body: serviceFormData,
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    // Return the generated image directly
    return new Response(response.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "attachment; filename=generated-image.jpg",
      },
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 },
    );
  }
}
