"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  if (fileIds.length === 0) return null;

  const safeIndex = Math.min(activeIndex, fileIds.length - 1);
  const currentId = fileIds[safeIndex];
  const hasMultiple = fileIds.length > 1;

  return (
    <div className="bg-[#EFE6D8] relative select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/image/${currentId}`}
        alt={alt}
        className={`w-full ${maxHeightClass} object-cover transition-[filter] duration-500 ${
          isGrayscale ? "grayscale contrast-95" : ""
        }`}
      />

      {hasMultiple && (
        <>
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#2F241E]/70 text-white text-[11px] font-semibold backdrop-blur-sm tabular-nums">
            {safeIndex + 1} / {fileIds.length}
          </span>

          <button
            type="button"
            onClick={() =>
              setActiveIndex((i) => (i - 1 + fileIds.length) % fileIds.length)
            }
            aria-label="Previous photo"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#2F241E]/60 hover:bg-[#2F241E]/85 text-white backdrop-blur-sm transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i + 1) % fileIds.length)}
            aria-label="Next photo"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#2F241E]/60 hover:bg-[#2F241E]/85 text-white backdrop-blur-sm transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2F241E]/45 backdrop-blur-sm">
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
