import { STYLE_CATEGORIES } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionContentPart } from "openai/resources/chat/completions";

export const runtime = "edge";

// interface FormattedResponse {
//   id: string;
//   model: string;
//   status: "success" | "queued" | "generating" | "failed";
//   tokens: {
//     prompt: number;
//     completion: number;
//     total: number;
//     details: {
//       prompt: { text: number };
//       completion: { content: number };
//     };
//   };
//   prompt?: {
//     text: string;
//     ratio: string;
//   };
//   generation?: {
//     id?: string;
//     imageUrl?: string;
//     progress?: number[];
//   };
//   moderation?: {
//     rejected: boolean;
//     reason?: string;
//     suggestion?: string;
//     taskId?: string;
//   };
//   rawContent: string;
//   createdAt: Date;
// }

export async function POST(req: Request) {
  // console.log("Received request to generate image");
  const { apiKey, presetId, image, isRetry = false } = await req.json();
  try {
    if (!apiKey || !presetId || !image) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    let remainingCredits;
    let isNewCycle = false;

    // Validate API key and check credits (only if not a retry)
    if (!isRetry) {
      const { data: keyData, error: keyError } = await supabaseAdmin
        .from("api_keys")
        .select("credits")
        .eq("key", apiKey)
        .eq("status", "active")
        .single();

      // console.log("Query results:", { keyData, keyError });
      if (keyError) {
        console.error("Supabase error:", keyError);
        return NextResponse.json(
          {
            error: "Database error",
            details: keyError.message,
          },
          { status: 500 },
        );
      }

      if (!keyData) {
        return NextResponse.json(
          {
            error: "Invalid API key or inactive key",
            details: `No active key found matching: ${apiKey}`,
          },
          { status: 401 },
        );
      }

      if (keyData.credits < 1) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 402 },
        );
      }

      // Deduct credits - Don't deduct on retries
      isNewCycle = true;
      const { error: updateError } = await supabaseAdmin
        .from("api_keys")
        .update({ credits: keyData.credits - 1 })
        .eq("key", apiKey);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to deduct credits" },
          { status: 500 },
        );
      }

      // Return remaining credits
      remainingCredits = keyData.credits - 1;
    }

    // Continue with image generation
    const imageType = image.startsWith("/")
      ? "jpeg"
      : image.startsWith("iVBOR")
        ? "png"
        : "jpeg";

    const prompt = STYLE_CATEGORIES.flatMap(
      (category) => category.presets,
    ).find((p) => p.id === presetId)?.prompt;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL,
    });

    try {
      const messageContent: ChatCompletionContentPart[] = [
        {
          type: "image_url",
          image_url: { url: `data:image/${imageType};base64,${image}` },
        },
        {
          type: "text",
          // prompt is now guaranteed to be a string here
          text: prompt as string,
        },
      ];

      // This error occurs the proxy do not follow openai api standard
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL as string,
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s]+)\)/);
      const imageUrl = imageUrlMatch?.[1];

      // console.log("\n=== IMAGE URL ===");
      // console.log(imageUrl || "No image URL found in response");

      if (!imageUrl) {
        // If API request failed as there's no image URL, revert credit deduction
        if (isNewCycle) {
          await supabaseAdmin
            .from("api_keys")
            .update({ credits: remainingCredits! + 1 })
            .eq("key", apiKey);
          remainingCredits = remainingCredits! + 1;
        }

        return NextResponse.json(
          { success: false, error: "Image generation failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        tokens: response.usage,
        imageUrl,
        remainingCredits,
        isRetry,
        isNewCycle,
      });
    } catch (apiError: unknown) {
      console.error("OpenAI API error:", apiError);

      // If API request failed, revert credit deduction
      if (isNewCycle) {
        await supabaseAdmin
          .from("api_keys")
          .update({ credits: remainingCredits! + 1 })
          .eq("key", apiKey);
        remainingCredits = remainingCredits! + 1;
      }

      const errorMessage =
        apiError instanceof Error ? apiError.message : "API request failed";

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 },
      );
    }
  } catch (err: unknown) {
    console.error("Generation failed:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

// function formatTuZiResponse(response: any): FormattedResponse {
//   // Extract basic info
//   const base = {
//     id: response.id,
//     model: response.model,
//     tokens: {
//       prompt: response.usage?.prompt_tokens,
//       completion: response.usage?.completion_tokens,
//       total: response.usage?.total_tokens,
//       details: {
//         prompt: response.usage?.prompt_tokens_details,
//         completion: response.usage?.completion_tokens_details,
//       },
//     },
//     rawContent: response.choices?.[0]?.message?.content,
//     createdAt: new Date(response.created * 1000),
//   };

//   // Parse the raw content
//   const content = response.choices?.[0]?.message?.content;
//   const promptMatch = content.match(/```(json\n)?({[^]+?})```/);
//   const promptData = promptMatch ? JSON.parse(promptMatch[2]) : null;

//   // Check for moderation failure
//   const isRejected = content.includes('is_output_rejection":true');
//   const failureMatch = content.match(
//     /Failure reason：(.+?)\n> \*\*Reason\*\*: (.+?)\n> \*\*Suggestion\*\*: (.+?)\n/,
//   );
//   const taskIdMatch = content.match(/task_id":"(.+?)"/);

//   // Extract generation progress if available
//   const progressMatches = [...content.matchAll(/Progress (\d+)%/g)];
//   const progress = progressMatches.map((m) => parseInt(m[1]));

//   // Extract image URL if successful
//   const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s]+)\)/);
//   const genIdMatch = content.match(/gen_id: `(.+?)`/);

//   if (isRejected) {
//     return {
//       ...base,
//       status: "failed",
//       moderation: {
//         rejected: true,
//         reason: failureMatch?.[2],
//         suggestion: failureMatch?.[3],
//         taskId: taskIdMatch?.[1],
//       },
//       prompt: promptData,
//     };
//   }
//   return {
//     ...base,
//     status: imageUrlMatch
//       ? "success"
//       : progress.length
//         ? "generating"
//         : "queued",
//     prompt: promptData,
//     generation: {
//       id: genIdMatch?.[1],
//       imageUrl: imageUrlMatch?.[1],
//       progress: progress.length ? progress : undefined,
//     },
//   };
// }
