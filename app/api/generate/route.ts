import { STYLE_CATEGORIES } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { detectImageType } from "@/lib/image";
import { LEVEL, logApiEvent } from "@/lib/logger";
import { analyzeApiResult, ProviderResponse } from "@/lib/api-provider";

const FAILURE_THRESHOLD = 2;
const BLOCK_MINUTES = 10;
let consecutive_failures = 0;

export async function POST(req: Request) {
  const { apiKey, presetId, image, isRetry = false } = await req.json();
  logApiEvent("api_generate_request", LEVEL.INFO, {
    apiKey: apiKey ? "***" : "",
    presetId,
    isRetry,
  });

  try {
    if (!apiKey || !presetId || !image) {
      logApiEvent("api_generate_missing_params", LEVEL.ERROR, {
        apiKey: !!apiKey,
        presetId: !!presetId,
        image: !!image,
      });
      return NextResponse.json(
        { error: "参数缺失，请检查密钥、风格和图片是否填写完整。" },
        { status: 400 },
      );
    }

    let remainingCredits: number | undefined = undefined;
    let isNewCycle = false;

    // --- Validate and Deduct Credits ---
    try {
      const result = await validateAndDeductCredits(apiKey, isRetry);
      consecutive_failures = result.consecutive_failures;
      remainingCredits = result.remainingCredits;
      isNewCycle = result.isNewCycle;
    } catch (creditError) {
      const msg =
        typeof creditError === "object" &&
        creditError !== null &&
        "message" in creditError
          ? String((creditError as Error).message)
          : String(creditError);

      if (msg.startsWith("db_error:")) {
        logApiEvent("api_generate_db_error", LEVEL.ERROR, { error: msg });
        return NextResponse.json(
          { error: "验证密钥错误，请稍后重试。", details: msg },
          { status: 500 },
        );
      }
      if (msg === "invalid_key") {
        logApiEvent("api_generate_invalid_key", LEVEL.ERROR, { apiKey: "***" });
        return NextResponse.json(
          { error: "无效或未激活的密钥", details: "未找到有效密钥" },
          { status: 401 },
        );
      }
      if (msg === "key_revoked") {
        return NextResponse.json({ error: "密钥已被禁用" }, { status: 401 });
      }
      if (msg.startsWith("blocked_until:")) {
        const blocked_until = msg.split(":")[1];
        logApiEvent("api_generate_blocked", LEVEL.WARN, {
          apiKey: "***",
          blocked_until,
        });
        return NextResponse.json(
          { error: "服务繁忙，请稍后再试。" },
          { status: 429 },
        );
      }
      if (msg === "no_credits") {
        logApiEvent("api_generate_no_credits", LEVEL.WARN, { apiKey: "***" });
        return NextResponse.json(
          { error: "次数不足，请购买更多次数" },
          { status: 402 },
        );
      }
      if (msg.startsWith("deduct_failed:")) {
        logApiEvent("api_generate_credit_deduct_failed", LEVEL.ERROR, {
          error: msg,
        });
        return NextResponse.json(
          { error: "扣费失败，请稍后重试。" },
          { status: 500 },
        );
      }
      // fallback
      logApiEvent("api_generate_credit_unknown_error", LEVEL.ERROR, {
        error: msg,
      });
      return NextResponse.json(
        { error: "余额查询失败，请稍后重试。" },
        { status: 500 },
      );
    }

    // --- Prepare Prompt ---
    const imageType = detectImageType(image);
    const prompt = STYLE_CATEGORIES.flatMap(
      (category) => category.presets,
    ).find((p) => p.id === presetId)?.prompt;

    if (!prompt) {
      logApiEvent("api_generate_invalid_preset", LEVEL.ERROR, { presetId });
      return NextResponse.json(
        { error: "风格预设无效，请重新选择。" },
        { status: 400 },
      );
    }

    // --- OpenAI Call ---
    let normalizedResponse: ProviderResponse;
    try {
      normalizedResponse = await generateImageWithOpenAI(
        image,
        imageType,
        prompt,
      );
    } catch (openaiError) {
      logApiEvent("api_generate_provider_error", LEVEL.ERROR, {
        error: String(openaiError),
      });

      // Refund credits if needed
      if (isNewCycle && remainingCredits !== undefined) {
        await refundCredits(apiKey, remainingCredits);
      }

      await handleProviderFailure(apiKey, consecutive_failures);

      return NextResponse.json(
        { success: false, error: "服务器繁忙，请稍后重试或更换风格。" },
        { status: 500 },
      );
    }

    // --- Analyze Result ---
    const analysis = analyzeApiResult(normalizedResponse);

    if (process.env.NODE_ENV === "development")
      console.log(
        "Full provider response: ",
        normalizedResponse,
        "\n",
        "Analysis:",
        analysis,
      );

    if (!analysis.success) {
      if (isNewCycle && remainingCredits !== undefined)
        await refundCredits(apiKey, remainingCredits);

      await handleProviderFailure(apiKey, consecutive_failures);

      logApiEvent("api_generate_failure", LEVEL.ERROR, {
        presetId,
        apiKey: "***",
        error: analysis.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: analysis.error || "获取图片结果失败，请稍后重试。",
        },
        { status: 500 },
      );
    }

    logApiEvent("api_generate_success", LEVEL.INFO, {
      presetId,
      apiKey: "***",
      isRetry,
      isNewCycle,
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

    await supabaseAdmin.rpc("increment_total_used", { key_value: apiKey });
    await supabaseAdmin
      .from("api_keys")
      .update({ consecutive_failures: 0, blocked_until: null })
      .eq("key", apiKey);

    return NextResponse.json({
      success: true,
      tokens: analysis.tokens,
      imageUrl: analysis.imageUrl,
      downloadUrl: analysis.downloadUrl,
      prompt: analysis.prompt,
      remainingCredits,
      isRetry,
      isNewCycle,
    });
  } catch (err: unknown) {
    logApiEvent("api_generate_internal_error", LEVEL.ERROR, {
      error: String(err),
    });
    return NextResponse.json(
      { success: false, error: "内部错误，请稍后重试。" },
      { status: 500 },
    );
  }
}

// --- Helpers ---

async function validateAndDeductCredits(apiKey: string, isRetry: boolean) {
  const { data: keyData, error: keyError } = await supabaseAdmin
    .from("api_keys")
    .select("consecutive_failures, blocked_until, credits, status")
    .eq("key", apiKey)
    .single();

  if (keyError) throw new Error("db_error:" + keyError.message);

  if (!keyData) throw new Error("invalid_key");

  if (keyData.status !== "active") throw new Error("key_revoked");

  if (keyData.blocked_until && new Date(keyData.blocked_until) > new Date()) {
    throw new Error("blocked_until:" + keyData.blocked_until);
  }

  if (isRetry) return { remainingCredits: keyData.credits, isNewCycle: false };

  if (keyData.credits < 1) throw new Error("no_credits");

  const { error: updateError } = await supabaseAdmin
    .from("api_keys")
    .update({ credits: keyData.credits - 1 })
    .eq("key", apiKey);

  if (updateError) throw new Error("deduct_failed:" + updateError.message);

  return {
    remainingCredits: keyData.credits - 1,
    isNewCycle: true,
    consecutive_failures: keyData.consecutive_failures ?? 0,
  };
}

async function handleProviderFailure(
  apiKey: string,
  currentFailures: number | undefined | null,
) {
  const newFailures = (currentFailures ?? 0) + 1;
  const updates: Record<string, unknown> = {
    consecutive_failures: newFailures,
  };

  if (newFailures >= FAILURE_THRESHOLD) {
    updates.blocked_until = new Date(
      Date.now() + BLOCK_MINUTES * 60 * 1000,
    ).toISOString();
  }

  await supabaseAdmin.from("api_keys").update(updates).eq("key", apiKey);
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
    model: process.env.OPENAI_MODEL as string,
    messages: [{ role: "user", content: messageContent }],
  });

  const usage = providerResponse.usage ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  return {
    id: providerResponse.id,
    object: providerResponse.object,
    created: providerResponse.created,
    model: providerResponse.model,
    choices: providerResponse.choices.map((choice) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content ?? "",
      },
      finish_reason: choice.finish_reason ?? "",
    })),
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      prompt_tokens_details: getTokensDetails(usage, "prompt_tokens_details"),
      completion_tokens_details: getTokensDetails(
        usage,
        "completion_tokens_details",
      ),
    },
  };
}

async function refundCredits(apiKey: string, remainingCredits: number) {
  await supabaseAdmin
    .from("api_keys")
    .update({ credits: remainingCredits + 1 })
    .eq("key", apiKey);
}

function getTokensDetails(
  obj: unknown,
  key: string,
): Record<string, number> | undefined {
  if (obj && typeof obj === "object" && key in obj) {
    const val = (obj as Record<string, unknown>)[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      // Check all values are numbers
      if (Object.values(val).every((v) => typeof v === "number")) {
        return val as Record<string, number>;
      }
    }
  }
  return undefined;
}
