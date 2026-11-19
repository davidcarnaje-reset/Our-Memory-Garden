"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Flower2 } from "lucide-react";

interface MemoryPhotoCarouselProps {
  fileIds: string[];
  alt: string;
  maxHeightClass?: string;
  isGrayscale?: boolean;
}

export default function MemoryPhotoCarousel({
  fileIds,
  alt,
  maxHeightClass = "h-[280px] sm:h-[360px]",
  isGrayscale = false,
}: MemoryPhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});

  if (fileIds.length === 0) return null;

  const safeIndex = Math.min(activeIndex, fileIds.length - 1);
  const hasMultiple = fileIds.length > 1;

  function markLoaded(id: string) {
    setLoadedMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }

  return (
    <div
      className={`bg-[#EFE6D8] relative select-none overflow-hidden w-full ${maxHeightClass}`}
    >
      {/* Smooth horizontal slide track — keeps decoded images mounted to prevent flicker */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {fileIds.map((id, idx) => {
          const isLoaded = Boolean(loadedMap[id]);
          const shouldLoad =
            Math.abs(idx - safeIndex) <= 1 ||
            isLoaded ||
            (safeIndex === 0 && idx === fileIds.length - 1) ||
            (safeIndex === fileIds.length - 1 && idx === 0);

          return (
            <div
              key={`${id}-${idx}`}
              className="relative w-full h-full shrink-0 bg-[#EFE6D8]"
            >
              {!isLoaded && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EFE6D8] via-[#F6EFE5] to-[#E7DAC8] animate-pulse"
                  aria-label="Loading photo"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E2D4C0] flex items-center justify-center text-[#9C8677]">
                    <Flower2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-[#8C796B]">
                    Loading photo...
                  </span>
                </div>
              )}

              {shouldLoad && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/image/${id}`}
                  alt={`${alt} (${idx + 1})`}
                  onLoad={() => markLoaded(id)}
                  onError={() => markLoaded(id)}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                  } ${isGrayscale ? "grayscale contrast-95" : ""}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {hasMultiple && (
        <>
          <span className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-[#2F241E]/70 text-white text-[11px] font-semibold backdrop-blur-sm tabular-nums">
            {safeIndex + 1} / {fileIds.length}
          </span>

          <button
            type="button"
            onClick={() =>
              setActiveIndex((i) => (i - 1 + fileIds.length) % fileIds.length)
            }
            aria-label="Previous photo"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-[#2F241E]/60 hover:bg-[#2F241E]/85 text-white backdrop-blur-sm transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i + 1) % fileIds.length)}
            aria-label="Next photo"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-[#2F241E]/60 hover:bg-[#2F241E]/85 text-white backdrop-blur-sm transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2F241E]/45 backdrop-blur-sm">
            {fileIds.map((fid, idx) => (
              <button
                key={`${fid}-dot-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View photo ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
