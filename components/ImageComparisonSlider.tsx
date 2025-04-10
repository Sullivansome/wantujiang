// components/ImageComparisonSlider.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null); // Outer container ref
  const isDragging = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewWidth, setViewWidth] = useState<number>(0);
  const [viewHeight, setViewHeight] = useState<number>(0);
  const originalImgRef = useRef<HTMLImageElement>(null);
  const generatedImgRef = useRef<HTMLImageElement>(null);

  // Function to calculate and set the optimal view dimensions
  const calculateViewDimensions = useCallback(() => {
    if (
      !containerRef.current ||
      !originalImgRef.current ||
      !generatedImgRef.current
    )
      return;
    if (
      !originalImgRef.current.naturalWidth ||
      !generatedImgRef.current.naturalWidth
    )
      return; // Wait for natural dimensions

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Use the natural dimensions of the *original* image as the base aspect ratio
    // Or you could choose the generated, or an average, or the max - depends on desired behavior
    // Using original's aspect ratio here as an example:
    const naturalWidth = originalImgRef.current.naturalWidth;
    const naturalHeight = originalImgRef.current.naturalHeight;
    const aspectRatio = naturalWidth / naturalHeight;

    let targetWidth = containerWidth;
    let targetHeight = targetWidth / aspectRatio;

    // If calculated height is too tall for the container, constrain by height instead
    if (targetHeight > containerHeight) {
      targetHeight = containerHeight;
      targetWidth = targetHeight * aspectRatio;
    }

    // Ensure the calculated dimensions are not larger than the container
    targetWidth = Math.min(targetWidth, containerWidth);
    targetHeight = Math.min(targetHeight, containerHeight);

    setViewWidth(targetWidth);
    setViewHeight(targetHeight);
    setIsLoaded(true); // Set loaded *after* dimensions are calculated
  }, []); // No dependencies, relies on refs and natural sizes

  // Effect to handle image loading and initial dimension calculation
  useEffect(() => {
    let originalLoaded = false;
    let generatedLoaded = false;

    const checkAndCalculate = () => {
      // Ensure both images have reported their natural dimensions
      if (
        originalLoaded &&
        generatedLoaded &&
        originalImgRef.current?.naturalWidth &&
        generatedImgRef.current?.naturalWidth
      ) {
        calculateViewDimensions();
      }
    };

    const handleOriginalLoad = () => {
      originalLoaded = true;
      checkAndCalculate();
    };

    const handleGeneratedLoad = () => {
      generatedLoaded = true;
      checkAndCalculate();
    };

    const imgOriginal = originalImgRef.current;
    const imgGenerated = generatedImgRef.current;

    // Need to handle cases where images might already be loaded/cached
    if (imgOriginal?.complete) handleOriginalLoad();
    if (imgGenerated?.complete) handleGeneratedLoad();

    imgOriginal?.addEventListener("load", handleOriginalLoad);
    imgGenerated?.addEventListener("load", handleGeneratedLoad);

    // Add resize listener
    window.addEventListener("resize", calculateViewDimensions);

    return () => {
      imgOriginal?.removeEventListener("load", handleOriginalLoad);
      imgGenerated?.removeEventListener("load", handleGeneratedLoad);
      window.removeEventListener("resize", calculateViewDimensions);
    };
  }, [calculateViewDimensions, original, generated]); // Rerun if sources change or calc function identity changes

  // --- Drag Handlers ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent text selection/image drag artifacts
    e.preventDefault();
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;

    // Calculate position relative to the *inner view*, not the outer container directly
    // Find the inner view element (we'll add a ref or selector for it)
    const innerView = containerRef.current?.querySelector(
      ".comparison-inner-view",
    );
    if (!innerView) return;

    const rect = innerView.getBoundingClientRect();
    // ClientX needs to be relative to the viewport, getBoundingClientRect provides that
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      updateSliderPosition(e.clientX);
    },
    [updateSliderPosition],
  ); // Add dependency

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging.current) return;
      // Prevent scroll on touch devices during drag
      e.preventDefault();
      updateSliderPosition(e.touches[0].clientX);
    },
    [updateSliderPosition],
  ); // Add dependency

  // Effect for attaching global drag listeners
  useEffect(() => {
    // Use capture phase for mouseup to catch events outside the component
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, true);
    // Use passive: false for touchmove to allow preventDefault
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp, true);
    };
  }, [handleMouseMove, handleTouchMove, handleMouseUp]); // Add dependencies

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className} flex items-center justify-center`}
      // Add touch-none to prevent default touch actions like scrolling on the container
      style={{ touchAction: "none" }}
    >
      {/* Hidden images to get natural dimensions */}
      <img
        ref={originalImgRef}
        src={original}
        alt=""
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <img
        ref={generatedImgRef}
        src={generated}
        alt=""
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Inner container that defines the actual comparison view area */}
      <div
        className="comparison-inner-view relative overflow-hidden" // Added class for selector
        style={{
          width: viewWidth ? `${viewWidth}px` : "100%", // Use calculated dimensions
          height: viewHeight ? `${viewHeight}px` : "100%",
          opacity: isLoaded ? 1 : 0, // Fade in when ready
          transition: "opacity 0.3s ease",
          cursor: isDragging.current ? "ew-resize" : "default", // Change cursor while dragging
        }}
      >
        {/* Generated Image (Background) - Uses object-cover */}
        <div className="absolute inset-0 select-none">
          <img
            src={generated}
            alt="Generated"
            className="absolute inset-0 h-full w-full object-cover" // Use object-cover
            draggable="false" // Prevent browser image drag
          />
        </div>

        {/* Original Image (Foreground with clip path) - Uses object-cover */}
        <div
          className="absolute inset-0 select-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <img
            src={original}
            alt="Original"
            className="absolute inset-0 h-full w-full object-cover" // Use object-cover
            draggable="false" // Prevent browser image drag
          />
        </div>

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 z-10 w-1 cursor-ew-resize bg-white/80 shadow-[0_0_10px_rgba(0,0,0,0.7)]"
          style={{
            left: `calc(${sliderPosition}% - 2px)`, // Adjust slightly for handle width
            touchAction: "none", // Prevent scrolling when grabbing handle
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
            {/* Arrows SVG */}
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
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
          原图
        </div>
        <div className="pointer-events-none absolute right-2 bottom-2 rounded bg-black/50 px-2 py-1 text-xs font-medium text-white">
          对比
        </div>
      </div>

      {/* Loading indicator - Centered in the main container */}
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
