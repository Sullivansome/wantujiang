// app/generate/page.tsx
"use client";

import { useState } from "react";
import { STYLE_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StylePresets } from "@/components/StylePresets";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageComparisonSlider } from "@/components/ImageComparisonSlider";
import { ImagePreview } from "@/components/ImagePreview";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GeneratedImage {
  url: string;
  presetId: string;
  presetName: string;
  timestamp: number;
}

type StreamedMessage = {
  done?: boolean;
  error?: string;
  content?: string;
  imageUrl?: string;
  remainingCredits?: number;
  isRetry?: boolean;
  isNewCycle?: boolean;
};

export default function GeneratePage() {
  const [apiKey, setApiKey] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [requestTimes, setRequestTimes] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isNewCycleStarting, setIsNewCycleStarting] = useState(false);

  const handleFileSelect = async (file: File) => {
    setRetryCount(0);
    setError("");
    setGeneratedImages([]);
    setCurrentImageIndex(0);

    if (file.type === "image/heic" || file.type === "image/heif") {
      try {
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.95,
        });
        // result can be Blob or Blob[]
        const outputBlob = Array.isArray(result) ? result[0] : result;
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageBase64(event.target?.result as string);
        };
        reader.readAsDataURL(outputBlob);
        return;
      } catch (e) {
        setError("HEIC/HEIF 转换失败，请尝试其他图片格式！");
        console.error(e);
        return;
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSelectedPresetName = (presetId: string) => {
    for (const category of STYLE_CATEGORIES) {
      const preset = category.presets.find((p) => p.id === presetId);
      if (preset) return preset.name;
    }
    return "未知风格";
  };

  const handleGenerate = async () => {
    if (!imageBase64 || !selectedPreset) return;

    if (!apiKey) {
      setError("请输入使用密钥后再生成图片");
      return;
    }

    const isCurrentActionARetry = generatedImages.length > 0 && retryCount < 2;

    if (!isCurrentActionARetry && generatedImages.length > 0) {
      setIsNewCycleStarting(true);
      return; // Stop here and wait for confirmation
    }

    // Continue with generation
    await startGeneration(isCurrentActionARetry);
  };

  const startGeneration = async (isRetry: boolean) => {
    setIsDownloading(false);
    setIsLoading(true);
    setElapsed(0);
    setError("");
    setIsNewCycleStarting(false);

    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 100);

    let finalResult: StreamedMessage | null = null;

    try {
      const base64Data = imageBase64!.split(",")[1];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          image: base64Data,
          presetId: selectedPreset,
          isRetry,
        }),
      });

      if (!response.ok) {
        let errorMsg = "生成失败，请重试";
        try {
          const errorData = await response.json();
          errorMsg =
            errorData.error ||
            (errorData.details
              ? `${errorData.error}: ${errorData.details}`
              : errorMsg);
          if (response.status === 402) {
            errorMsg = "次数不足，请购买更多次数";
          } else if (response.status === 401) {
            errorMsg = "无效或未激活的密钥";
          }
        } catch (parseError) {
          errorMsg = response.statusText || errorMsg;
          console.error(parseError);
        }
        throw new Error(errorMsg);
      }

      // ---- STREAMING SECTION ----
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: StreamedMessage;
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.content) {
            // Optionally display or accumulate content
          }
          if (msg.done) {
            finalResult = msg;
          }
          if (msg.error) {
            throw new Error(msg.error);
          }
        }
      }
      if (buffer.trim()) {
        try {
          const msg: StreamedMessage = JSON.parse(buffer);
          if (msg.content) {
            // Optionally accumulate/display
          }
          if (msg.done) {
            finalResult = msg;
          }
          if (msg.error) throw new Error(msg.error);
        } catch {}
      }

      if (!finalResult) throw new Error("No result received from server");

      if (finalResult.imageUrl) {
        const newImage: GeneratedImage = {
          url: finalResult.imageUrl,
          presetId: selectedPreset!,
          presetName: getSelectedPresetName(selectedPreset!),
          timestamp: Date.now(),
        };

        setGeneratedImages((prev) => [...prev, newImage]);
        setCurrentImageIndex(generatedImages.length);
      }

      const duration = Date.now() - start;
      setRequestTimes((prev) => [...prev, duration]);

      if (isRetry) {
        setRetryCount((prev) => prev + 1);
      } else {
        setRetryCount(0);
      }

      if (typeof finalResult.remainingCredits === "number") {
        setRemainingCredits(finalResult.remainingCredits);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      clearInterval(timer);
      setIsLoading(false);
      setElapsed(0);
    }
  };

  const handleDownload = async () => {
    if (
      generatedImages.length === 0 ||
      currentImageIndex >= generatedImages.length
    )
      return;

    const imageToDownload = generatedImages[currentImageIndex].url;
    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch(imageToDownload);
      if (!response.ok) throw new Error("下载失败");

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `wantujiang-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      setError("下载失败，请重试");
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const navigateImages = (direction: "prev" | "next") => {
    if (generatedImages.length <= 1) return;

    if (direction === "prev") {
      setCurrentImageIndex((prev) =>
        prev > 0 ? prev - 1 : generatedImages.length - 1,
      );
    } else {
      setCurrentImageIndex((prev) =>
        prev < generatedImages.length - 1 ? prev + 1 : 0,
      );
    }
  };

  // Show current results or upload
  const showResults = generatedImages.length > 0;
  const currentImage = showResults ? generatedImages[currentImageIndex] : null;
  const cycleLocked =
    isLoading ||
    (selectedPreset !== null && generatedImages.length > 0 && retryCount < 2);

  return (
    <div className="mx-auto min-h-screen w-full py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">AI 图片风格重绘</h1>
        <p className="text-muted-foreground mt-2">
          告别复杂参数，图片风格随心变。
        </p>
      </div>

      {isNewCycleStarting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background w-full max-w-md rounded-lg p-6">
            <h3 className="text-lg font-semibold">开始新的绘画过程</h3>
            <p className="mt-2">
              您将开始一个新的绘画过程，这将消耗一次生成次数。确定要继续吗？
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsNewCycleStarting(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  // Clear the selected preset but keep the image and results
                  setSelectedPreset(null);
                  setRetryCount(0);
                  setIsNewCycleStarting(false);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-8 px-4 lg:flex-row lg:px-8">
        {/* Left Section - Image Upload & Preview */}
        <div className="w-full lg:w-3/5">
          <div className="bg-card h-full rounded-xl border p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-medium">图片处理区</h2>

            {!imageBase64 ? (
              <ImageUploader onFileSelect={handleFileSelect} />
            ) : showResults ? (
              <div className="h-[600px] w-full">
                <ImageComparisonSlider
                  original={imageBase64}
                  generated={currentImage!.url}
                />

                {generatedImages.length > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => navigateImages("prev")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      {currentImageIndex + 1} / {generatedImages.length} -{" "}
                      {currentImage!.presetName}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => navigateImages("next")}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {generatedImages.length > 0 &&
                  requestTimes[currentImageIndex] != null && (
                    <div className="text-muted-foreground mt-2 text-center text-sm">
                      该次生成耗时:{" "}
                      {(requestTimes[currentImageIndex] / 1000).toFixed(2)}秒
                    </div>
                  )}

                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedImages([]);
                      setCurrentImageIndex(0);
                      setImageBase64(null);
                    }}
                  >
                    换张图片
                  </Button>
                  <Button onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        下载中...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        下载图片
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <ImagePreview
                src={imageBase64}
                onReset={() => {
                  setImageBase64(null);
                }}
              />
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="w-full space-y-6 lg:w-2/5">
          {/* API Key */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-medium">使用密钥</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的密钥"
                />
                <Button variant="secondary" asChild>
                  <a href="/pricing" target="_blank">
                    购买密钥
                  </a>
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                没有密钥？点击购买获取使用权限
              </p>
            </div>

            {!apiKey && imageBase64 && (
              <Alert className="mt-4 bg-amber-50 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  您必须输入有效的API密钥才能生成图片
                </AlertDescription>
              </Alert>
            )}

            {remainingCredits !== null && (
              <div className="mt-2 text-center">
                <p className="text-sm">
                  剩余次数:{" "}
                  <span className="font-medium">{remainingCredits}</span>
                </p>
              </div>
            )}
          </div>

          {/* Style Selection */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-medium">选择风格</h2>
            <StylePresets
              onSelect={setSelectedPreset}
              disabled={cycleLocked}
              currentPreset={selectedPreset}
            />

            {selectedPreset && (
              <p className="text-muted-foreground mt-2 text-sm">
                已选择: {getSelectedPresetName(selectedPreset)}
              </p>
            )}
          </div>

          {/* Generate Button */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={
                isLoading ||
                !apiKey ||
                !imageBase64 ||
                !selectedPreset ||
                isNewCycleStarting
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  生成中... ({elapsed}s)
                </>
              ) : generatedImages.length > 0 && retryCount < 2 ? (
                <>重试（免费，剩余{2 - retryCount}次）</>
              ) : generatedImages.length > 0 ? (
                <>开始新周期（将扣费）</>
              ) : (
                <>开始生成</>
              )}
            </Button>

            {generatedImages.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground text-center text-sm">
                  当前图片已生成 {generatedImages.length} 次
                  {retryCount > 0 && `，其中包含 ${retryCount} 次免费重试`}
                </p>
              </div>
            )}

            {retryCount >= 2 && (
              <p className="text-muted-foreground mt-2 text-sm">
                免费重试次数已用完，可以开始新周期
              </p>
            )}

            {!selectedPreset && generatedImages.length > 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                请选择一个新风格开始新的绘画过程
              </p>
            )}

            <div className="text-muted-foreground mt-4 text-sm">
              <p>提示:</p>
              <ul className="list-inside list-disc">
                <li>大约需要两分钟</li>
                <li>两次免费重画机会</li>
                <li>图片大小不超过10MB</li>
                <li>
                  新图片或新预设会开启新周期（消耗次数），绘制失败不会消耗次数
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
