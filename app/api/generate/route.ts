import { STYLE_PRESETS } from "@/lib/constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

interface FormattedResponse {
  id: string;
  model: string;
  status: "success" | "queued" | "generating" | "failed";
  tokens: {
    prompt: number;
    completion: number;
    total: number;
    details: {
      prompt: { text: number };
      completion: { content: number };
    };
  };
  prompt?: {
    text: string;
    ratio: string;
  };
  generation?: {
    id?: string;
    imageUrl?: string;
    progress?: number[];
  };
  moderation?: {
    rejected: boolean;
    reason?: string;
    suggestion?: string;
    taskId?: string;
  };
  rawContent: string;
  createdAt: Date;
}

export async function POST(req: Request) {
  console.log("Received request to generate image");
  const { apiKey, presetId, image } = await req.json();
  try {
    if (!apiKey || !presetId || !image) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const imageType = image.startsWith("/")
      ? "jpeg"
      : image.startsWith("iVBOR")
        ? "png"
        : "jpeg";

    const prompt = STYLE_PRESETS.find(
      (preset) => preset.id === presetId,
    )?.prompt;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL,
    });

    // This error occurs the proxy do not follow openai api standard
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/${imageType};base64,${image}` },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s]+)\)/);
    const imageUrl = imageUrlMatch?.[1];

    console.log("\n=== TOKEN USAGE ===");
    console.log(`Prompt Tokens: ${response.usage?.prompt_tokens}`);
    console.log(`Completion Tokens: ${response.usage?.completion_tokens}`);
    console.log(`Total Tokens: ${response.usage?.total_tokens}\n`);

    console.log("\n=== IMAGE URL ===");
    console.log(imageUrl || "No image URL found in response");

    console.log("\n=== FULL RESPONSE ===");
    console.log(response);

    const formatted = formatTuZiResponse(response);

    console.log("Formatted Response:", formatted);

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Image generation failed" },
        { status: 500 },
      );
    }

    // return NextResponse.json(fullResponse);
    return NextResponse.json({
      success: true,
      tokens: response.usage,
      imageUrl,
      // rawContent: content,
      // fullResponse: response,
    });
  } catch (err: any) {
    console.error("Generation failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Image generation failed" },
      { status: 500 },
    );
  }
}

function formatTuZiResponse(response: any): FormattedResponse {
  // Extract basic info
  const base = {
    id: response.id,
    model: response.model,
    tokens: {
      prompt: response.usage?.prompt_tokens,
      completion: response.usage?.completion_tokens,
      total: response.usage?.total_tokens,
      details: {
        prompt: response.usage?.prompt_tokens_details,
        completion: response.usage?.completion_tokens_details,
      },
    },
    rawContent: response.choices?.[0]?.message?.content,
    createdAt: new Date(response.created * 1000),
  };

  // Parse the raw content
  const content = response.choices?.[0]?.message?.content;
  // const promptMatch = content.match(/```(json\n)?({[^]+?})```/);
  // const promptData = promptMatch ? JSON.parse(promptMatch[2]) : null;

  // Check for moderation failure
  const isRejected = content.includes('is_output_rejection":true');
  const failureMatch = content.match(
    /Failure reason：(.+?)\n> \*\*Reason\*\*: (.+?)\n> \*\*Suggestion\*\*: (.+?)\n/,
  );
  const taskIdMatch = content.match(/task_id":"(.+?)"/);

  // Extract generation progress if available
  const progressMatches = [...content.matchAll(/Progress (\d+)%/g)];
  const progress = progressMatches.map((m) => parseInt(m[1]));

  // Extract image URL if successful
  const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s]+)\)/);
  const genIdMatch = content.match(/gen_id: `(.+?)`/);

  if (isRejected) {
    return {
      ...base,
      status: "failed",
      moderation: {
        rejected: true,
        reason: failureMatch?.[2],
        suggestion: failureMatch?.[3],
        taskId: taskIdMatch?.[1],
      },
      // prompt: promptData,
    };
  }
  return {
    ...base,
    status: imageUrlMatch
      ? "success"
      : progress.length
        ? "generating"
        : "queued",
    // prompt: promptData,
    generation: {
      id: genIdMatch?.[1],
      imageUrl: imageUrlMatch?.[1],
      progress: progress.length ? progress : undefined,
    },
  };
}
