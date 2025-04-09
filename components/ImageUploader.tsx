// components/ImageUploader.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

export function ImageUploader({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onFileSelect(file);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all ${isDragging ? "border-primary bg-primary/5" : "hover:border-primary/70 border-gray-300"} `}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInput}
            accept="image/*"
          />
          <div className="flex flex-col items-center justify-center space-y-3 p-5 text-center">
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="text-lg font-medium">拖拽或点击上传图片</p>
            <p className="text-muted-foreground text-sm">支持 JPG, PNG 格式</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg border">
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={removeImage}
              aria-label="Remove image"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all hover:bg-red-600 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
          <div className="h-64 w-full overflow-hidden rounded-lg">
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="h-full w-full object-contain select-none"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
