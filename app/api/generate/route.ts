import { STYLE_CATEGORIES } from "@/lib/constants";
import {
  recordGenerationFailure,
  recordGenerationSuccess,
  reservePaidGeneration,
  reserveRetryGeneration,
  type GenerationReservation,
} from "@/lib/db/credit";
import { detectImageType } from "@/lib/image";
import { LEVEL, logApiEvent } from "@/lib/logger";
import {
  analyzeApiResult,
  ProviderResponse,
  ProviderUsage,
} from "@/lib/api-provider";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["jpeg", "png", "webp", "heic", "tiff"]);

const generateRequestSchema = z.object({
  apiKey: z.string().trim().min(1),
  presetId: z.string().trim().min(1),
  image: z.string().trim().min(1),
  cycleId: z.string().uuid().optional(),
});

type GenerateRequest = z.infer<typeof generateRequestSchema>;

interface ValidatedImage {
  base64: string;
  imageType: string;
  imageHash: string;
}

interface StreamMetadata {
  id: string;
  object: string;
  created: number;
  model: string;
  finishReason: string;
  usage?: ProviderUsage;
}

export async function POST(req: Request) {
  let reservation: GenerationReservation | null = null;

  try {
    const payload = await parseJsonRequest(req);
    if (!payload.success) {
      return NextResponse.json(
        { success: false, error: payload.error },
        { status: 400 },
      );
    }

    const { apiKey, presetId, image, cycleId } = payload.data;
    const isRetryRequest = Boolean(cycleId);

    logApiEvent("api_generate_request", LEVEL.INFO, {
      apiKey: apiKey ? "***" : "",
      presetId,
      isRetryRequest,
    });

    const validatedImage = await validateImagePayload(image);
    if (!validatedImage.success) {
      return NextResponse.json(
        { success: false, error: validatedImage.error },
        { status: 400 },
      );
    }

    const prompt = getPresetPrompt(presetId);
    if (!prompt) {
      logApiEvent("api_generate_invalid_preset", LEVEL.ERROR, { presetId });
      return NextResponse.json(
        { success: false, error: "风格预设无效，请重新选择。" },
        { status: 400 },
      );
    }

    try {
      reservation = cycleId
        ? await reserveRetryGeneration({
            apiKey,
            cycleId,
            presetId,
            imageHash: validatedImage.data.imageHash,
          })
        : await reservePaidGeneration({
            apiKey,
            presetId,
            imageHash: validatedImage.data.imageHash,
          });
    } catch (creditError) {
      return handleReservationError(creditError);
    }

    let normalizedResponse: ProviderResponse;
    try {
      normalizedResponse = await generateImageWithOpenAI(
        validatedImage.data.base64,
        validatedImage.data.imageType,
        prompt,
      );
    } catch (openaiError) {
      const errorMessage = String(openaiError);
      logApiEvent("api_generate_provider_error", LEVEL.ERROR, {
        error: errorMessage,
        cycleId: reservation.cycleId,
        attemptId: reservation.attemptId,
      });

      const completion = await markAttemptFailedSafe(
        reservation.attemptId,
        errorMessage,
        reservation,
      );

      return NextResponse.json(
        {
          success: false,
          error: "服务器繁忙，请稍后重试或更换风格。",
          ...generationState(completion),
        },
        { status: 500 },
      );
    }

    const analysis = analyzeApiResult(normalizedResponse);

    if (!analysis.success) {
      const completion = await markAttemptFailedSafe(
        reservation.attemptId,
        analysis.error || "provider_response_missing_image",
        reservation,
      );

      logApiEvent("api_generate_failure", LEVEL.ERROR, {
        presetId,
        apiKey: "***",
        cycleId: reservation.cycleId,
        attemptId: reservation.attemptId,
        error: analysis.error || "provider_response_missing_image",
      });

      return NextResponse.json(
        {
          success: false,
          error: analysis.error || "获取图片结果失败，请稍后重试。",
          ...generationState(completion),
        },
        { status: 500 },
      );
    }

    const completion = await markAttemptSucceededSafe(
      reservation.attemptId,
      reservation,
    );

    logApiEvent("api_generate_success", LEVEL.INFO, {
      presetId,
      apiKey: "***",
      cycleId: completion.cycleId,
      isRetry: completion.isRetry,
      isNewCycle: completion.isNewCycle,
      imageUrl: analysis.imageUrl,
      "tokens.prompt_tokens": analysis.tokens.prompt_tokens,
      "tokens.completion_tokens": analysis.tokens.completion_tokens,
      "tokens.total_tokens": analysis.tokens.total_tokens,
      ...(analysis.tokens.prompt_tokens_details && {
        "tokens.prompt_tokens_details": JSON.stringify(
          analysis.tokens.prompt_tokens_details,
        ),
      }),
      ...(analysis.tokens.completion_tokens_details && {
        "tokens.completion_tokens_details": JSON.stringify(
          analysis.tokens.completion_tokens_details,
        ),
      }),
    });

    return NextResponse.json({
      success: true,
      tokens: analysis.tokens,
      imageUrl: analysis.imageUrl,
      downloadUrl: analysis.downloadUrl,
      prompt: analysis.prompt,
      ...generationState(completion),
    });
  } catch (err: unknown) {
    if (reservation) {
      await markAttemptFailedSafe(
        reservation.attemptId,
        String(err),
        reservation,
      );
    }

    logApiEvent("api_generate_internal_error", LEVEL.ERROR, {
      error: String(err),
    });
    return NextResponse.json(
      { success: false, error: "内部错误，请稍后重试。" },
      { status: 500 },
    );
  }
}

async function parseJsonRequest(
  req: Request,
): Promise<
  { success: true; data: GenerateRequest } | { success: false; error: string }
> {
  try {
    const json = await req.json();
    const parsed = generateRequestSchema.safeParse(json);
    if (!parsed.success) {
      return {
        success: false,
        error: "参数缺失，请检查密钥、风格和图片是否填写完整。",
      };
    }
    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "请求格式无效。" };
  }
}

async function validateImagePayload(
  value: string,
): Promise<
  { success: true; data: ValidatedImage } | { success: false; error: string }
> {
  const base64 = value.includes(",") ? value.split(",").pop() || "" : value;
  const normalized = base64.replace(/\s/g, "");

  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    normalized.length % 4 !== 0
  ) {
    return { success: false, error: "图片数据无效，请重新上传。" };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(normalized, "base64");
  } catch {
    return { success: false, error: "图片数据无效，请重新上传。" };
  }

  if (buffer.length === 0 || buffer.toString("base64") !== normalized) {
    return { success: false, error: "图片数据无效，请重新上传。" };
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return { success: false, error: "图片大小不能超过10MB。" };
  }

  const imageType = detectStrictImageType(buffer, normalized);
  if (!SUPPORTED_IMAGE_TYPES.has(imageType)) {
    return {
      success: false,
      error: "不支持的图片格式，请上传 JPG、PNG、WebP 或 HEIC 图片。",
    };
  }

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const imageHash = Buffer.from(digest).toString("hex");

  return {
    success: true,
    data: {
      base64: normalized,
      imageType,
      imageHash,
    },
  };
}

function detectStrictImageType(buffer: Buffer, base64: string) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "jpeg";
  }

  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "II*\u0000" ||
    buffer.subarray(0, 4).toString("ascii") === "MM\u0000*"
  ) {
    return "tiff";
  }

  const detected = detectImageType(base64);
  return detected === "heic" ? detected : "unknown";
}

function getPresetPrompt(presetId: string) {
  return STYLE_CATEGORIES.flatMap((category) => category.presets).find(
    (preset) => preset.id === presetId && preset.enabled,
  )?.prompt;
}

function handleReservationError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg === "invalid_key") {
    logApiEvent("api_generate_invalid_key", LEVEL.ERROR, { apiKey: "***" });
    return NextResponse.json(
      {
        success: false,
        error: "无效或未激活的密钥",
        details: "未找到有效密钥",
      },
      { status: 401 },
    );
  }

  if (msg === "key_revoked") {
    return NextResponse.json(
      { success: false, error: "密钥已被禁用" },
      { status: 401 },
    );
  }

  if (msg.startsWith("blocked_until:")) {
    logApiEvent("api_generate_blocked", LEVEL.WARN, {
      apiKey: "***",
      blocked_until: msg.slice("blocked_until:".length),
    });
    return NextResponse.json(
      { success: false, error: "服务繁忙，请稍后再试。" },
      { status: 429 },
    );
  }

  if (msg === "no_credits") {
    logApiEvent("api_generate_no_credits", LEVEL.WARN, { apiKey: "***" });
    return NextResponse.json(
      { success: false, error: "次数不足，请购买更多次数" },
      { status: 402 },
    );
  }

  if (msg === "cycle_not_found") {
    return NextResponse.json(
      { success: false, error: "重试记录不存在，请重新开始生成。" },
      { status: 404 },
    );
  }

  if (msg === "cycle_mismatch") {
    return NextResponse.json(
      { success: false, error: "重试内容与原绘画周期不匹配，请重新开始生成。" },
      { status: 409 },
    );
  }

  if (msg === "cycle_closed" || msg === "retry_limit_exceeded") {
    return NextResponse.json(
      { success: false, error: "免费重试次数已用完，请开始新的绘画周期。" },
      { status: 409 },
    );
  }

  logApiEvent("api_generate_credit_unknown_error", LEVEL.ERROR, {
    error: msg,
  });
  return NextResponse.json(
    { success: false, error: "余额查询失败，请稍后重试。" },
    { status: 500 },
  );
}

async function markAttemptFailedSafe(
  attemptId: string,
  errorMessage: string,
  fallback: GenerationReservation,
) {
  try {
    return await recordGenerationFailure(attemptId, errorMessage);
  } catch (error) {
    logApiEvent("api_generate_accounting_failure", LEVEL.ERROR, {
      attemptId,
      error: String(error),
    });
    return fallback;
  }
}

async function markAttemptSucceededSafe(
  attemptId: string,
  fallback: GenerationReservation,
) {
  try {
    return await recordGenerationSuccess(attemptId);
  } catch (error) {
    logApiEvent("api_generate_accounting_success_failure", LEVEL.ERROR, {
      attemptId,
      error: String(error),
    });
    return fallback;
  }
}

function generationState(state: {
  cycleId: string;
  remainingCredits: number;
  retryCount: number;
  maxRetries: number;
  isRetry: boolean;
  isNewCycle: boolean;
}) {
  return {
    cycleId: state.cycleId,
    remainingCredits: state.remainingCredits,
    retryCount: state.retryCount,
    maxRetries: state.maxRetries,
    isRetry: state.isRetry,
    isNewCycle: state.isNewCycle,
  };
}

async function generateImageWithOpenAI(
  image: string,
  imageType: string,
  prompt: string,
): Promise<ProviderResponse> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL,
  });

  const messageContent: ChatCompletionContentPart[] = [
    {
      type: "image_url",
      image_url: { url: `data:image/${imageType};base64,${image}` },
    },
    { type: "text", text: prompt },
  ];

  const providerResponse = await openai.chat.completions.create({
    stream: true,
    model: process.env.OPENAI_MODEL as string,
    messages: [{ role: "user", content: messageContent }],
  });

  let fullContent = "";
  const metadata: StreamMetadata = {
    id: "",
    object: "chat.completion",
    created: 0,
    model: process.env.OPENAI_MODEL ?? "",
    finishReason: "stop",
  };

  for await (const chunk of providerResponse) {
    metadata.id = chunk.id ?? metadata.id;
    metadata.object = chunk.object ?? metadata.object;
    metadata.created = chunk.created ?? metadata.created;
    metadata.model = chunk.model ?? metadata.model;
    metadata.finishReason =
      chunk.choices?.[0]?.finish_reason ?? metadata.finishReason;

    const usage = "usage" in chunk ? chunk.usage : undefined;
    if (usage) metadata.usage = normalizeUsage(usage);

    const content = chunk.choices?.[0]?.delta?.content;
    if (content) fullContent += content;
  }

  return {
    id: metadata.id,
    object: metadata.object,
    created: metadata.created,
    model: metadata.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: fullContent,
        },
        finish_reason: metadata.finishReason,
      },
    ],
    usage: metadata.usage ?? emptyUsage(),
  };
}

function normalizeUsage(usage: {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  prompt_tokens_details?: unknown;
  completion_tokens_details?: unknown;
}): ProviderUsage {
  return {
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0,
    prompt_tokens_details: toNumberRecord(usage.prompt_tokens_details),
    completion_tokens_details: toNumberRecord(usage.completion_tokens_details),
  };
}

function emptyUsage(): ProviderUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
}

function toNumberRecord(value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => {
      return typeof entry[1] === "number";
    }),
  );
}
