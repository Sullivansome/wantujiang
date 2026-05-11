"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export function ImageComparisonSlider({
  original,
  generated,
  className = "",
}: {
  original: string;
  generated: string;
  className?: string;
}) {
  const sliderId = useId();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef({
    original: { width: 0, height: 0 },
    generated: { width: 0, height: 0 },
  });

  const calculateViewDimensions = useCallback(() => {
    const container = containerRef.current;
    const { original: originalSize, generated: generatedSize } =
      naturalSizeRef.current;

    if (!container) return;
    if (!originalSize.width || !generatedSize.width) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = originalSize.width / originalSize.height;

    let width = containerWidth;
    let height = width / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspectRatio;
    }

    setViewSize({
      width: Math.min(width, containerWidth),
      height: Math.min(height, containerHeight),
    });
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    setIsLoaded(false);
    setSliderPosition(50);
  }, [original, generated]);

  useEffect(() => {
    calculateViewDimensions();
    window.addEventListener("resize", calculateViewDimensions);

    return () => {
      window.removeEventListener("resize", calculateViewDimensions);
    };
  }, [calculateViewDimensions, original, generated]);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
    >
      <Image
        src={original}
        alt=""
        aria-hidden="true"
        width={1}
        height={1}
        unoptimized
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onLoad={(event) => {
          const image = event.currentTarget;
          naturalSizeRef.current.original = {
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
          calculateViewDimensions();
        }}
      />
      <Image
        src={generated}
        alt=""
        aria-hidden="true"
        width={1}
        height={1}
        unoptimized
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onLoad={(event) => {
          const image = event.currentTarget;
          naturalSizeRef.current.generated = {
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
          calculateViewDimensions();
        }}
      />

      <div
        className="relative overflow-hidden"
        style={{
          width: viewSize.width ? `${viewSize.width}px` : "100%",
          height: viewSize.height ? `${viewSize.height}px` : "100%",
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <Image
          src={generated}
          alt="生成图"
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover select-none"
          draggable={false}
        />
        <div
          className="absolute inset-0 select-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <Image
            src={original}
            alt="原图"
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
            draggable={false}
          />
        </div>

        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-1 bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.7)]"
          style={{ left: `calc(${sliderPosition}% - 2px)` }}
        >
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
            <span className="text-sm font-semibold text-gray-700">↔</span>
          </div>
        </div>

        <input
          id={sliderId}
          type="range"
          min="0"
          max="100"
          step="1"
          value={sliderPosition}
          aria-label="调整原图和生成图对比位置"
          onChange={(event) => setSliderPosition(Number(event.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
        />

        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
          原图
        </div>
        <div className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
          对比
        </div>
      </div>

      {!isLoaded && (
        <div className="bg-muted/20 pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-background rounded-md p-2 shadow">
            <svg
              className="text-muted-foreground h-6 w-6 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
