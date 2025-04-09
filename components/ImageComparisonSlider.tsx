// components/ImageComparisonSlider.tsx
"use client";

import { useState, useEffect, useRef } from "react";

export function ImageComparisonSlider({
  original,
  generated,
  className = "",
}: {
  original: string;
  generated: string;
  className?: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);

  // Load both images to determine dimensions
  useEffect(() => {
    const originalImg = new Image();
    const generatedImg = new Image();
    let originalLoaded = false;
    let generatedLoaded = false;

    originalImg.onload = () => {
      originalLoaded = true;
      if (generatedLoaded) compareAndSetDimensions();
    };

    generatedImg.onload = () => {
      generatedLoaded = true;
      if (originalLoaded) compareAndSetDimensions();
    };

    function compareAndSetDimensions() {
      // Use the maximum width and height for container
      const maxWidth = Math.max(originalImg.width, generatedImg.width);
      const maxHeight = Math.max(originalImg.height, generatedImg.height);

      // Maintain aspect ratio
      const aspectRatio = maxWidth / maxHeight;
      const containerWidth = containerRef.current?.clientWidth || 0;

      let newWidth, newHeight;

      if (containerWidth / maxHeight > aspectRatio) {
        // Container is wider than image aspect ratio
        newHeight = Math.min(
          maxHeight,
          containerRef.current?.clientHeight || 0,
        );
        newWidth = newHeight * aspectRatio;
      } else {
        // Container is taller than image aspect ratio
        newWidth = Math.min(maxWidth, containerWidth);
        newHeight = newWidth / aspectRatio;
      }

      setImageWidth(newWidth);
      setImageHeight(newHeight);
    }

    originalImg.src = original;
    generatedImg.src = generated;

    // Resize on window resize
    window.addEventListener("resize", () => {
      if (originalLoaded && generatedLoaded) compareAndSetDimensions();
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, [original, generated]);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.touches[0].clientX - rect.left, rect.width),
    );
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden rounded-lg ${className} flex items-center justify-center`}
    >
      <div
        style={{
          width: imageWidth || "100%",
          height: imageHeight || "100%",
          position: "relative",
        }}
        className="overflow-hidden"
      >
        {/* Generated Image (Background) */}
        <div className="absolute inset-0">
          <img
            src={generated}
            alt="Generated"
            className="h-full w-full object-contain select-none"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Original Image (Foreground with clip path) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <img
            src={original}
            alt="Original"
            className="h-full w-full object-contain select-none"
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Slider */}
        <div
          className="absolute top-0 bottom-0 z-10 w-1 cursor-ew-resize bg-white shadow-[0_0_10px_rgba(0,0,0,0.7)]"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 rounded bg-black/50 px-2 py-1 text-sm text-white">
          原图
        </div>
        <div className="absolute right-4 bottom-4 rounded bg-black/50 px-2 py-1 text-sm text-white">
          对比
        </div>
      </div>
    </div>
  );
}
