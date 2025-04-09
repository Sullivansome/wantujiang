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
      className={`relative h-full w-full overflow-hidden rounded-lg ${className}`}
    >
      {/* Generated Image (Background) */}
      <div className="h-full w-full">
        <img
          src={generated}
          alt="Generated"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Original Image (Foreground with clip path) */}
      <div
        className="absolute top-0 left-0 h-full w-full"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      >
        <img
          src={original}
          alt="Original"
          className="h-full w-full object-cover"
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
        生成效果
      </div>
    </div>
  );
}
