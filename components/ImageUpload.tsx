"use client";

import { useRef, ChangeEvent } from "react";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function ImageUpload({
  onFileSelect,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    onFileSelect(selectedFile);
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="mr-2 h-4 w-4" />
        选择图片
      </Button>
    </div>
  );
}

interface ImagePreviewProps {
  file: File;
  onRemove?: () => void;
}

export function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  return (
    <div className="group relative mt-2">
      <Image
        src={URL.createObjectURL(file)}
        alt="Preview"
        width={400}
        height={300}
        className="max-h-48 rounded-md object-contain"
      />
      {onRemove && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
        >
          移除
        </Button>
      )}
    </div>
  );
}
