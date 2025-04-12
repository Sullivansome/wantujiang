import { useState, useRef } from "react";
import { STYLE_CATEGORIES } from "@/lib/constants";
import { LEVEL, logFrontendEvent } from "@/lib/logger";

export interface GeneratedImage {
  url: string;
  presetId: string;
  presetName: string;
  timestamp: number;
}

export function useImageGeneration() {
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

  // Timer ref for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getSelectedPresetName = (presetId: string) => {
    for (const category of STYLE_CATEGORIES) {
      const preset = category.presets.find((p) => p.id === presetId);
      if (preset) return preset.name;
    }
    return "未知风格";
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setError("");
  };

  const handlePresetSelect = (presetId: string | null) => {
    setSelectedPreset(presetId);
    setError("");
  };

  const handleFileSelect = async (file: File) => {
    setRetryCount(0);
    setError("");
    setGeneratedImages([]);
    setCurrentImageIndex(0);

    if (!file.type.startsWith("image/")) {
      setError("仅支持图片文件，请重新选择。");
      return;
    }

    if (file.type === "image/heic" || file.type === "image/heif") {
      try {
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.95,
        });
        const outputBlob = Array.isArray(result) ? result[0] : result;
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageBase64(event.target?.result as string);
        };
        reader.readAsDataURL(outputBlob);
        return;
      } catch (e) {
        setError("HEIC/HEIF 转换失败，请尝试其他图片格式！");
        logFrontendEvent("heic_conversion_failed", LEVEL.ERROR, {
          error: String(e),
        });
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

  const handleGenerate = async () => {
    if (!imageBase64 || !selectedPreset) return;

    if (!apiKey) {
      setError("请输入使用密钥后再生成图片");
      return;
    }

    const isCurrentActionARetry = generatedImages.length > 0 && retryCount < 2;

    if (!isCurrentActionARetry && generatedImages.length > 0) {
      setIsNewCycleStarting(true);
      return;
    }

    await startGeneration(isCurrentActionARetry);
  };

  const startGeneration = async (isRetry: boolean) => {
    setIsDownloading(false);
    setIsLoading(true);
    setElapsed(0);
    setError("");
    setIsNewCycleStarting(false);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 100);

    try {
      const base64Data = imageBase64!.split(",")[1];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        logFrontendEvent("image_generation_failed", LEVEL.ERROR, {
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }

      const result = await response.json();

      const newImage: GeneratedImage = {
        url: result.imageUrl,
        presetId: selectedPreset!,
        presetName: getSelectedPresetName(selectedPreset!),
        timestamp: Date.now(),
      };

      setGeneratedImages((prev) => [...prev, newImage]);
      setCurrentImageIndex(generatedImages.length);

      const duration = Date.now() - start;
      setRequestTimes((prev) => [...prev, duration]);

      if (isRetry) {
        setRetryCount((prev) => prev + 1);
      } else {
        setRetryCount(0);
      }

      if (result.remainingCredits !== undefined) {
        setRemainingCredits(result.remainingCredits);
      }
      logFrontendEvent("image_generated", LEVEL.INFO, {
        presetId: selectedPreset,
        isRetry,
        duration,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
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

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `wantujiang-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      logFrontendEvent("image_downloaded", LEVEL.INFO, {
        url: imageToDownload,
      });
    } catch (error) {
      setError("下载失败，请重试");

      logFrontendEvent("image_download_failed", LEVEL.ERROR, {
        error: String(error),
      });
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

  return {
    apiKey,
    setApiKey: handleApiKeyChange,
    selectedPreset,
    setSelectedPreset: handlePresetSelect,
    imageBase64,
    setImageBase64,

    generatedImages,
    setGeneratedImages,
    currentImageIndex,
    setCurrentImageIndex,
    elapsed,
    setElapsed,
    requestTimes,
    setRequestTimes,
    error,
    setError,
    isLoading,
    setIsLoading,
    isDownloading,
    setIsDownloading,
    remainingCredits,
    setRemainingCredits,
    retryCount,
    setRetryCount,
    isNewCycleStarting,
    setIsNewCycleStarting,
    handleFileSelect,
    handleGenerate,
    handleDownload,
    navigateImages,
    getSelectedPresetName,
  };
}
