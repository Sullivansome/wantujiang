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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GeneratedImage {
  url: string;
  presetId: string;
  presetName: string;
  timestamp: number;
}

export default function GeneratePage() {
  const [apiKey, setApiKey] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileSelect = (file: File) => {
    setImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setImageBase64(base64String);
    };
    reader.readAsDataURL(file);
    setError("");
    // Clear generated images when uploading a new image
    setGeneratedImages([]);
    setCurrentImageIndex(0);
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
      setError("请输入API密钥后再生成图片");
      return;
    }

    setIsDownloading(false);
    setIsLoading(true);
    setError("");

    try {
      // Extract the base64 part from the data URL
      const base64Data = imageBase64.split(",")[1];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          image: base64Data,
          presetId: selectedPreset,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成失败，请重试");
      }

      const result = await response.json();

      // Add new image to the collection
      const newImage: GeneratedImage = {
        url: result.imageUrl,
        presetId: selectedPreset,
        presetName: getSelectedPresetName(selectedPreset),
        timestamp: Date.now(),
      };

      setGeneratedImages((prev) => [...prev, newImage]);
      setCurrentImageIndex(generatedImages.length); // Set to the newly added image
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="mx-auto min-h-screen w-full py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">AI 图片风格重绘</h1>
        <p className="text-muted-foreground mt-2">
          上传一张图片，选择风格，一键生成惊艳作品
        </p>
      </div>

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
                  <div className="mt-2 flex items-center justify-center gap-4">
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

                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedImages([]);
                      setCurrentImageIndex(0);
                    }}
                  >
                    返回编辑
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
              <div className="h-[600px] w-full overflow-hidden rounded-lg border">
                <img
                  src={imageBase64}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null);
                      setImageBase64(null);
                    }}
                  >
                    重新选择图片
                  </Button>
                </div>
              </div>
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
          </div>

          {/* Style Selection */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-medium">选择风格</h2>
            <StylePresets onSelect={setSelectedPreset} />
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
              disabled={isLoading || !imageBase64 || !selectedPreset}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  {generatedImages.length > 0 ? "再次生成" : "开始生成"}
                  {generatedImages.length > 0 && (
                    <span className="ml-2 text-xs">
                      ({generatedImages.length})
                    </span>
                  )}
                </>
              )}
            </Button>

            {generatedImages.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground text-center text-sm">
                  已生成 {generatedImages.length} 次
                </p>
              </div>
            )}

            <div className="text-muted-foreground mt-4 text-sm">
              <p>提示:</p>
              <ul className="list-inside list-disc">
                <li>上传高质量图片可获得更好的效果</li>
                <li>不同风格可以多次尝试</li>
                <li>可以比较多次生成的效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
