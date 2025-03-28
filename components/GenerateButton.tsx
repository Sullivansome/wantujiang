"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export function GenerateButton({
  apiKey,
  image,
  presetId,
  onSuccess,
  onError,
}: {
  apiKey: string;
  image: File | null;
  presetId: string | null;
  onSuccess: (imageUrl: string) => void;
  onError: (message: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!apiKey || !image || !presetId) return;

    setIsLoading(true);
    onError("");

    try {
      const formData = new FormData();
      formData.append("api_key", apiKey);
      formData.append("image", image);
      formData.append("style", presetId);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      onSuccess(imageUrl);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      onClick={handleGenerate}
      disabled={isLoading || !apiKey || !image || !presetId}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          生成中...
        </>
      ) : (
        "开始生成"
      )}
    </Button>
  );
}
