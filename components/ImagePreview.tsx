// components/ImagePreview.tsx
"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  onReset: () => void;
}

export function ImagePreview({ src, onReset }: ImagePreviewProps) {
  return (
    <div className="h-[600px] w-full overflow-hidden rounded-lg border">
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={onReset}
            aria-label="Remove image"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all hover:bg-red-600 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <img
        src={src}
        alt="Preview"
        className="h-full w-full object-contain select-none"
      />
      <div className="mt-4">
        <Button variant="outline" onClick={onReset}>
          重新选择图片
        </Button>
      </div>
    </div>
  );
}
