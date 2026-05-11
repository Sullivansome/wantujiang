import { consumeRateLimit } from "@/lib/db/credit";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const PAYMENT_RATE_LIMIT = 5;
const PAYMENT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const paymentSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("请输入有效的邮箱")
      .optional()
      .or(z.literal("")),
    contact: z.string().trim().max(100).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    paymentMethod: z.enum(["wechat", "alipay"]),
    orderId: z.string().trim().max(100).optional().or(z.literal("")),
    hasPaymentProof: z.boolean().optional(),
  })
  .refine((data) => data.email || data.contact || data.phone, {
    message: "请至少提供一种联系方式",
    path: ["email"],
  })
  .refine((data) => data.orderId || data.hasPaymentProof, {
    message: "请提供支付凭证或订单号",
    path: ["orderId"],
  });

type TelegramResponse = {
  ok: boolean;
  description?: string;
};

export async function POST(request: Request) {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return NextResponse.json(
        { error: "Telegram configuration missing" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const paymentProof = formData.get("paymentProof");
    const proofValidation = validatePaymentProof(paymentProof);
    if (!proofValidation.success) {
      return NextResponse.json(
        { error: proofValidation.error },
        { status: 400 },
      );
    }

    const parsed = paymentSchema.safeParse({
      email: stringField(formData.get("email")),
      contact: stringField(formData.get("contact")),
      phone: stringField(formData.get("phone")),
      paymentMethod: stringField(formData.get("paymentMethod")),
      orderId: stringField(formData.get("orderId")),
      hasPaymentProof: proofValidation.hasPaymentProof,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment submission", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const subjectHash = await hashRateLimitSubject(getClientIp(request));
    const rateLimit = await consumeRateLimit({
      subjectHash,
      action: "payment_submit",
      limit: PAYMENT_RATE_LIMIT,
      windowSeconds: PAYMENT_RATE_LIMIT_WINDOW_SECONDS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "提交过于频繁，请稍后再试。", resetAt: rateLimit.resetAt },
        { status: 429 },
      );
    }

    const messageId = crypto.randomUUID();
    const message = buildPaymentMessage(messageId, parsed.data);
    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    await sendTelegramJson(`${baseUrl}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });

    if (proofValidation.file) {
      const imageFormData = new FormData();
      imageFormData.append("chat_id", TELEGRAM_CHAT_ID);
      imageFormData.append("photo", proofValidation.file);
      imageFormData.append("caption", messageId);

      await sendTelegramForm(`${baseUrl}/sendPhoto`, imageFormData);
    }

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    if (error instanceof TelegramDeliveryError) {
      return NextResponse.json(
        { error: "Failed to deliver payment notification" },
        { status: 502 },
      );
    }

    console.error("Error submitting payment:", error);
    return NextResponse.json(
      { error: "Failed to submit payment" },
      { status: 500 },
    );
  }
}

function stringField(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function validatePaymentProof(
  value: FormDataEntryValue | null,
):
  | { success: true; hasPaymentProof: boolean; file?: File }
  | { success: false; error: string } {
  if (!value) return { success: true, hasPaymentProof: false };

  if (!(value instanceof File)) {
    return { success: false, error: "支付凭证格式无效。" };
  }

  if (value.size === 0) {
    return { success: true, hasPaymentProof: false };
  }

  if (value.size > MAX_PROOF_BYTES) {
    return { success: false, error: "支付截图不能超过10MB。" };
  }

  if (!ALLOWED_PROOF_TYPES.has(value.type)) {
    return {
      success: false,
      error: "支付截图仅支持 JPG、PNG、WebP 或 HEIC 格式。",
    };
  }

  return { success: true, hasPaymentProof: true, file: value };
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function hashRateLimitSubject(value: string) {
  const salt = process.env.RATE_LIMIT_HASH_SALT || "payment-submit";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${value}`),
  );
  return Buffer.from(digest).toString("hex");
}

function buildPaymentMessage(
  messageId: string,
  data: z.infer<typeof paymentSchema>,
) {
  const lines = [
    "有新的支付信息提交",
    "",
    `消息ID: ${messageId}`,
    `支付方式: ${data.paymentMethod === "wechat" ? "微信支付" : "支付宝"}`,
  ];

  if (data.email) lines.push(`邮箱: ${data.email}`);
  if (data.contact) lines.push(`微信/QQ: ${data.contact}`);
  if (data.phone) lines.push(`手机: ${data.phone}`);
  if (data.orderId) lines.push(`订单号: ${data.orderId}`);
  lines.push(`支付凭证: ${data.hasPaymentProof ? "已上传截图" : "未上传"}`);

  return lines.join("\n");
}

async function sendTelegramJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  await assertTelegramOk(response);
}

async function sendTelegramForm(url: string, body: FormData) {
  const response = await fetch(url, {
    method: "POST",
    body,
  });

  await assertTelegramOk(response);
}

async function assertTelegramOk(response: Response) {
  let data: TelegramResponse | null = null;
  try {
    data = (await response.json()) as TelegramResponse;
  } catch {
    // Telegram usually returns JSON; treat non-JSON as delivery failure.
  }

  if (!response.ok || !data?.ok) {
    throw new TelegramDeliveryError(data?.description || response.statusText);
  }
}

class TelegramDeliveryError extends Error {}
