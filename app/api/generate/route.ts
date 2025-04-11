import { STYLE_CATEGORIES } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ChatCompletionContentPart,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

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

function detectImageType(base64: string): string {
  if (base64.startsWith("/9j/")) return "jpeg"; // JPEG
  if (base64.startsWith("iVBOR")) return "png"; // PNG
  if (base64.startsWith("UklGR")) return "webp"; // WebP
  if (base64.startsWith("SUkqA") || base64.startsWith("AAABAA")) return "tiff"; // TIFF (less common)
  // HEIC/HEIF signatures (first 4 bytes are ftyp, followed by 'heic'/'heix'/'hevc'/'hevx'..., encoded in base64)
  // Example for HEIC: 00000018 66747970 68656963 (in base64: "AAAAAWZ0eXBoZWlj")
  if (base64.slice(4, 16).includes("ZnR5cG")) {
    // check for 'ftyp'
    const brand = atob(base64).slice(8, 12);
    if (
      brand === "heic" ||
      brand === "heix" ||
      brand === "hevc" ||
      brand === "hevx" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "heic";
    }
  }
  // fallback
  return "jpeg";
}

export async function POST(req: Request) {
  const { apiKey, presetId, image, isRetry = false } = await req.json();

  // Validate input
  if (!apiKey || !presetId || !image) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Prepare credits, etc
  let remainingCredits: number | undefined;
  let isNewCycle = false;

  // Streaming body set-up
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Validate API, check credits (if not retry)
        if (!isRetry) {
          const { data: keyData, error: keyError } = await supabaseAdmin
            .from("api_keys")
            .select("credits")
            .eq("key", apiKey)
            .eq("status", "active")
            .single();
          if (keyError || !keyData) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  done: true,
                  error: keyError?.message || "Invalid API key or inactive key",
                }) + "\n",
              ),
            );
            controller.close();
            return;
          }
          if (keyData.credits < 1) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  done: true,
                  error: "Insufficient credits",
                }) + "\n",
              ),
            );
            controller.close();
            return;
          }
          // Deduct credit up front
          isNewCycle = true;
          const { error: updateError } = await supabaseAdmin
            .from("api_keys")
            .update({ credits: keyData.credits - 1 })
            .eq("key", apiKey);
          if (updateError) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  done: true,
                  error: "Failed to deduct credits",
                }) + "\n",
              ),
            );
            controller.close();
            return;
          }
          remainingCredits = keyData.credits - 1;
        }

        // Prepare for streaming from OpenAI
        const imageType = detectImageType(image);

        const prompt = STYLE_CATEGORIES.flatMap((c) => c.presets).find(
          (p) => p.id === presetId,
        )?.prompt;

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
          baseURL: process.env.OPENAI_API_BASE_URL,
        });

        const content: ChatCompletionContentPart[] = [
          {
            type: "image_url",
            image_url: { url: `data:image/${imageType};base64,${image}` },
          },
          {
            type: "text",
            text: prompt as string,
          },
        ];

        const responseStream: Stream<ChatCompletionChunk> =
          await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL as string,
            // Correct message typing:
            messages: [
              {
                role: "user",
                content,
              },
            ],
            stream: true,
          });

        let finalText = "";

        // Send open stream data to the client as ndjson
        for await (const chunk of responseStream) {
          // Stream each chunk.plain delta/content as it arrives
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ done: false, content }) + "\n"),
            );
            finalText += content;
          }
        }

        // Try to extract image URL from the final output
        const imageUrlMatch = finalText.match(
          /!\[.*?\]\((https?:\/\/[^\s]+)\)/,
        );
        const imageUrl = imageUrlMatch?.[1];

        if (!imageUrl && isNewCycle) {
          await supabaseAdmin // revert credits if fail
            .from("api_keys")
            .update({ credits: remainingCredits! + 1 })
            .eq("key", apiKey);
          remainingCredits = remainingCredits! + 1;
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              done: true,
              imageUrl: imageUrl || null,
              remainingCredits,
              isRetry,
              isNewCycle,
            }) + "\n",
          ),
        );
        controller.close();
      } catch (err: unknown) {
        // Ensure credit rollback if needed
        if (isNewCycle) {
          await supabaseAdmin
            .from("api_keys")
            .update({ credits: remainingCredits! + 1 })
            .eq("key", apiKey);
          remainingCredits = remainingCredits! + 1;
        }
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              done: true,
              error: err || "Image generation failed",
            }) + "\n",
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
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
