"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

// Define validation schema
const formSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱").optional().or(z.literal("")),
    contact: z.string().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    paymentMethod: z.enum(["wechat", "alipay"]),
    orderId: z.string().optional().or(z.literal("")),
    hasPaymentProof: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // At least one contact method must be provided
      return data.email || data.contact || data.phone;
    },
    {
      message: "请至少提供一种联系方式",
      path: ["email"],
    },
  )
  .refine(
    (data) => {
      // Either screenshot or order ID must be provided
      return data.orderId || data.hasPaymentProof;
    },
    {
      message: "请提供支付凭证或订单号",
      path: ["orderId"],
    },
  );

type FormData = z.infer<typeof formSchema>;

export default function PricingPage() {
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const paymentProofRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      contact: "",
      phone: "",
      paymentMethod: "wechat",
      orderId: "",
      hasPaymentProof: false,
    },
  });

  const paymentMethod = watch("paymentMethod");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        e.target.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("支付截图不能超过10MB");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue("hasPaymentProof", true, { shouldValidate: true });
    } else {
      setPreviewImage(null);
      setValue("hasPaymentProof", false, { shouldValidate: true });
    }
  };

  // Update your onSubmit function
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append all form data
      Object.entries(data).forEach(([key, value]) => {
        // Check if the value exists and is not undefined/null
        if (value !== undefined && value !== null) {
          // Convert boolean to string before appending
          if (typeof value === "boolean") {
            formData.append(key, String(value));
          } else {
            // Append strings directly (ensure empty strings are handled if needed)
            formData.append(key, value);
          }
        }
      });

      // Append the image file if exists
      if (paymentProofRef.current?.files?.[0]) {
        formData.append("paymentProof", paymentProofRef.current.files[0]);
      }

      // Send to API route
      const response = await fetch("/api/payment/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Submission failed");
      }

      toast.success("支付信息已提交！我们会尽快核实并为您发送密钥");

      // Reset form
      reset();
      setPreviewImage(null);
      if (paymentProofRef.current) {
        paymentProofRef.current.value = "";
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "提交失败，请稍后再试",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">购买绘画次数</h1>
      <h1 className="mb-8 text-center text-3xl font-bold">
        一元一次（含两次免费重画机会）
      </h1>

      <div className="mx-auto max-w-md space-y-8">
        {/* Payment Methods */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">选择支付方式</h2>

          <div className="flex gap-4">
            <Button
              variant={paymentMethod === "wechat" ? "default" : "outline"}
              onClick={() => reset({ ...watch(), paymentMethod: "wechat" })}
              className="flex-1"
            >
              微信支付
            </Button>

            <Button
              variant={paymentMethod === "alipay" ? "default" : "outline"}
              onClick={() => reset({ ...watch(), paymentMethod: "alipay" })}
              disabled
              className="flex-1"
            >
              支付宝
            </Button>
          </div>

          {/* QR Code Display */}
          {paymentMethod && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">请扫码支付</p>
              <div className="flex justify-center rounded-lg border p-4">
                <Image
                  src={
                    paymentMethod === "wechat"
                      ? "/payment/wechat.jpg"
                      : "/alipay-qr.png"
                  }
                  alt={`${paymentMethod === "wechat" ? "WeChat" : "Alipay"} Pay QR Code`}
                  width={260}
                  height={260}
                  className="rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Customer Information Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h2 className="text-xl font-semibold">填写联系信息（任填一项）</h2>

          <div className="space-y-2">
            <Label htmlFor="email">电子邮箱</Label>
            <Input id="email" {...register("email")} placeholder="选填" />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">微信/QQ</Label>
            <Input id="contact" {...register("contact")} placeholder="选填" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号码</Label>
            <Input id="phone" {...register("phone")} placeholder="选填" />
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="font-medium">支付凭证</h3>
            <p className="text-muted-foreground text-sm">
              请提供支付成功的截图或订单号，或者直接添加客服微信
            </p>

            <div className="space-y-2">
              <Label>上传支付截图</Label>
              <Input
                type="file"
                id="paymentProofInput"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
                ref={(e) => {
                  paymentProofRef.current = e;
                }}
              />
              {previewImage && (
                <div className="mt-2 flex flex-col items-center">
                  <div className="relative h-48 w-full overflow-hidden rounded-lg border">
                    <Image
                      src={previewImage}
                      alt="Payment proof preview"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500 hover:text-red-600"
                    onClick={() => {
                      setPreviewImage(null);
                      if (paymentProofRef.current) {
                        paymentProofRef.current.value = "";
                      }
                      setValue("hasPaymentProof", false, {
                        shouldValidate: true,
                      });
                    }}
                  >
                    删除图片
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="orderId">或填写订单号</Label>
                <Input
                  id="orderId"
                  {...register("orderId")}
                  placeholder="选填"
                />
              </div>
            </div>
            {errors.orderId && (
              <p className="text-sm text-red-500">{errors.orderId.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}

          <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              "提交支付信息"
            )}
          </Button>
        </form>

        <div className="text-muted-foreground text-center text-sm">
          <p>支付完成后，我们会将密钥发送至您提供的联系方式</p>
          <p>
            如有疑问，请联系客服{" "}
            <Dialog
              open={showServiceDialog}
              onOpenChange={setShowServiceDialog}
            >
              <DialogTrigger asChild>
                <Button variant="link" className="h-auto p-0 text-inherit">
                  微信客服
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>联系客服</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center py-4">
                  <Image
                    src="/payment/contact.jpg"
                    alt="Customer Service WeChat QR Code"
                    width={260}
                    height={260}
                    className="rounded"
                  />
                  <p className="text-muted-foreground mt-4 text-sm">
                    请扫码添加微信客服
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </p>
        </div>
      </div>
    </div>
  );
}
