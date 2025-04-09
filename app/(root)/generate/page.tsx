"use client";

import { useState } from "react";
import { STYLE_PRESETS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { StylePresets } from "@/components/StylePresets";
import { GenerateButton } from "@/components/GenerateButton";
import { ImageUpload, ImagePreview } from "@/components/ImageUpload";
import Image from "next/image";

export default function GeneratePage() {
  const [apiKey, setApiKey] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = (file: File) => {
    setImage(file);
    // Convert the file to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!resultImageUrl) return;

    const link = document.createElement("a");
    link.href = resultImageUrl;
    link.download = `wantujiang-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setResultImageUrl(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>AI 图片风格重绘</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-2">
            <Label htmlFor="api-key">使用密钥</Label>
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

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>上传图片</Label>
            <ImageUpload onFileSelect={handleFileSelect} disabled={!apiKey} />
            {image && (
              <ImagePreview file={image} onRemove={() => setImage(null)} />
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
            image={imageBase64}
            presetId={selectedPreset}
            onSuccess={(image) => setResultImageUrl(image)}
            onError={(message) => setError(message)}
          />

          {/* Error Display */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Result Display */}
          {resultImageUrl && (
            <div className="mt-6 space-y-4">
              <h3 className="font-medium">生成结果</h3>
              <div className="relative">
                <Image
                  src={resultImageUrl}
                  alt="Generated result"
                  width={600}
                  height={400}
                  className="w-full rounded-md border object-contain"
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
