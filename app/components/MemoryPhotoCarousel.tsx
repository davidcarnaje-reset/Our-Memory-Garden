"use client";

import React, { useEffect, useState } from "react";
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
  maxHeightClass = "max-h-[380px]",
  isGrayscale = false,
}: MemoryPhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});

  const safeIndex =
    fileIds.length > 0 ? Math.min(activeIndex, fileIds.length - 1) : 0;
  const currentId = fileIds[safeIndex] ?? "";
  const isLoaded = Boolean(loadedMap[currentId]);

  // Preload adjacent photos so navigating between slides feels instant
  useEffect(() => {
    if (fileIds.length <= 1) return;
    const prevIdx = (safeIndex - 1 + fileIds.length) % fileIds.length;
    const nextIdx = (safeIndex + 1) % fileIds.length;
    [fileIds[prevIdx], fileIds[nextIdx]].forEach((id) => {
      if (id && !loadedMap[id]) {
        const img = new window.Image();
        img.src = `/api/image/${id}`;
        img.onload = () => {
          setLoadedMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
        };
      }
    });
  }, [fileIds, safeIndex, loadedMap]);

  if (fileIds.length === 0) return null;

  const hasMultiple = fileIds.length > 1;

  return (
    <div
      className={`bg-[#EFE6D8] relative select-none overflow-hidden ${
        !isLoaded ? "min-h-[240px] sm:min-h-[300px]" : ""
      }`}
    >
      {/* Skeleton loading placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EFE6D8] via-[#F6EFE5] to-[#E7DAC8] animate-pulse z-10"
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

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={currentId}
        src={`/api/image/${currentId}`}
        alt={alt}
        onLoad={() =>
          setLoadedMap((prev) =>
            prev[currentId] ? prev : { ...prev, [currentId]: true }
          )
        }
        onError={() =>
          setLoadedMap((prev) =>
            prev[currentId] ? prev : { ...prev, [currentId]: true }
          )
        }
        className={`w-full ${maxHeightClass} object-cover transition-all duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${isGrayscale ? "grayscale contrast-95" : ""}`}
      />

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
                key={`${fid}-${idx}`}
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
