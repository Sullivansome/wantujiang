// components/ImageUploader.tsx
"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";

export function ImageUploader({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    handleFile(e.target.files[0]);
  };

  const handleFile = (file: File) => {
    // Check if the file is an image and not too large
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }

    // Optionally check file size (e.g., 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过10MB");
      return;
    }

    onFileSelect(file);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex h-9/10 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all ${
        isDragging
          ? "border-primary bg-primary/5"
          : "hover:border-primary/70 border-gray-300"
      } `}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInput}
        accept="image/*"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-3 p-5 text-center">
        <Upload className="h-10 w-10 text-gray-400" />
        <p className="text-lg font-medium">拖拽或点击上传图片</p>
        <p className="text-muted-foreground text-sm">
          支持 JPG, PNG, WebP, HEIC, HEIF 等格式
        </p>
      </div>
    </div>
  );
}
