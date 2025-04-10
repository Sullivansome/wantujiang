import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return NextResponse.json(
        { error: "Telegram configuration missing" },
        { status: 500 },
      );
    }

    // Prepare text message
    const paymentMethod = formData.get("paymentMethod");
    const email = formData.get("email");
    const contact = formData.get("contact");
    const phone = formData.get("phone");
    const orderId = formData.get("orderId");
    const paymentProof = formData.get("paymentProof");

    let message = `⚡️ 有新的支付信息提交 ⚡️\n\n`;
    message += `💰 支付方式: ${paymentMethod === "wechat" ? "微信支付" : "支付宝"}\n`;
    if (email) message += `📧 邮箱: ${email}\n`;
    if (contact) message += `💬 微信/QQ: ${contact}\n`;
    if (phone) message += `📱 手机: ${phone}\n`;
    if (orderId) message += `🆔 订单号: ${orderId}\n`;
    message += `🔼 支付凭证: ${paymentProof ? "已上传截图" : "未上传"}\n`;

    // Send text message
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      },
    );

    // If there's an image, send it separately
    if (paymentProof instanceof File) {
      const imageFormData = new FormData();
      imageFormData.append("chat_id", TELEGRAM_CHAT_ID);
      imageFormData.append("photo", paymentProof);
      imageFormData.append("caption", "支付凭证截图");

      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          body: imageFormData,
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting payment:", error);
    return NextResponse.json(
      { error: "Failed to submit payment" },
      { status: 500 },
    );
  }
}
