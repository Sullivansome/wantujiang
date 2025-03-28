"use client";

import { useState, useRef } from "react";
import { STYLE_PRESETS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";
import { StylePresets } from "@/components/StylePresets";
import { GenerateButton } from "@/components/GenerateButton";
import Image from "next/image";

export default function GeneratePage() {
  const [apiKey, setApiKey] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `ai-generated-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clear result after download
    setResultImage(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>AI 图片生成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API 密钥</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入您的API密钥"
              />
              <Button variant="secondary" asChild>
                <a href="/pricing" target="_blank">
                  购买密钥
                </a>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              没有密钥？点击购买获取API访问权限
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>上传图片</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && setImage(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {image ? image.name : "选择图片"}
            </Button>
            {image && (
              <div className="mt-2">
                <Image
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  className="max-h-48 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Style Presets */}
          <div className="space-y-2">
            <Label>选择风格</Label>
            <StylePresets onSelect={setSelectedPreset} />
            {selectedPreset && (
              <p className="text-muted-foreground text-sm">
                已选择:{" "}
                {STYLE_PRESETS.find((p) => p.id === selectedPreset)?.name}
              </p>
            )}
          </div>

          {/* Generate Button */}
          <GenerateButton
            apiKey={apiKey}
            image={image}
            presetId={selectedPreset}
            onSuccess={(imageUrl) => setResultImage(imageUrl)}
            onError={(message) => setError(message)}
          />

          {/* Error Display */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Result Display */}
          {resultImage && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">生成结果</h3>
              <div className="relative">
                <Image
                  src={resultImage}
                  alt="Generated result"
                  className="w-full rounded-md border"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载图片
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                注意: 图片仅显示一次，请及时下载
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
