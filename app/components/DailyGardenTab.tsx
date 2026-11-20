"use client";

import React from "react";
import { Camera, Clock, Droplets, FolderHeart, Sparkles, User } from "lucide-react";
import type { DailyWaterEntry } from "@/src/lib/db";
import MemoryPhotoCarousel from "./MemoryPhotoCarousel";
import VaseIllustration, { type PlantHealth } from "./VaseIllustration";

interface DailyGardenTabProps {
  cycleKey: string;
  entries: DailyWaterEntry[];
  isNight: boolean;
  isWatered: boolean;
  plantHealth: PlantHealth;
  countdownLabel: string;
  onOpenWaterModal: () => void;
}

export default function DailyGardenTab({
  cycleKey,
  entries,
  isNight,
  isWatered,
  plantHealth,
  countdownLabel,
  onOpenWaterModal,
}: DailyGardenTabProps) {
  const flowerCount = entries.length;

  return (
    <div className="space-y-6">
      {/* Single Daily Vase Spotlight */}
      <div
        className={`rounded-3xl border p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 ${
          isNight
            ? "bg-[#232B27]/90 border-[#35403A]"
            : "bg-[#FFFCF7] border-[#E7DDD0] shadow-[0_10px_30px_-14px_rgba(74,59,50,0.14)]"
        }`}
      >
        <div className="w-44 sm:w-52 shrink-0">
          <VaseIllustration
            count={flowerCount}
            monthIndex={10}
            isWatered={isWatered}
            plantHealth={plantHealth}
          />
          <div
            className={`w-full h-2 rounded-full opacity-75 -mt-1 ${
              isNight
                ? "bg-gradient-to-b from-[#54463B] to-[#3B3028]"
                : "bg-gradient-to-b from-[#DFCEB9] to-[#CCB69B]"
            }`}
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF6FB] text-[#2F5E82]">
            <Clock className="w-3.5 h-3.5" />
            <span>Today&apos;s Daily Vase • Resets in {countdownLabel}</span>
          </div>

          <h2
            className={`font-[family-name:var(--font-serif)] text-2xl sm:text-3xl font-semibold ${
              isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
            }`}
          >
            {flowerCount === 0
              ? "Waiting for Today's Watering"
              : flowerCount === 1
                ? "1 Daily Flower Bloomed Today!"
                : `${flowerCount} Daily Flowers Bloomed Today!`}
          </h2>

          <p
            className={`text-xs sm:text-sm leading-relaxed max-w-xl ${
              isNight ? "text-[#B5ACA0]" : "text-[#6E5C51]"
            }`}
          >
            Every day at <strong>6:00 PM PHT</strong>, this vase resets to an
            empty pot. Snap or share 1–3 quick photos to water the garden, make
            today&apos;s flower bloom, and stay updated with each other!
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <button
              type="button"
              onClick={onOpenWaterModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4E89B5] hover:bg-[#3F78A3] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Take 1–3 Photos to Water</span>
            </button>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs border ${
                isNight
                  ? "bg-[#1D2420] border-[#35403A] text-[#A8A095]"
                  : "bg-[#FAF6F0] border-[#E4D9CB] text-[#7A685D]"
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5 text-[#C87A65]" />
              <span>Saved to Drive: Daily Pictures ({cycleKey})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Today's Photo Updates */}
      {entries.length === 0 ? (
        <div
          className={`rounded-3xl border border-dashed p-10 text-center ${
            isNight
              ? "border-[#35403A] bg-[#232B27]/50 text-[#9A9287]"
              : "border-[#DFD2C1] bg-[#FFFCF7]/70 text-[#7D6B60]"
          }`}
        >
          <Droplets className="w-8 h-8 mx-auto mb-2.5 text-[#659EC7]" />
          <p className="font-[family-name:var(--font-serif)] text-lg font-medium">
            No daily photos yet for this cycle
          </p>
          <p className="text-xs mt-1">
            Be the first to water the garden with 1–3 photos!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className={`rounded-3xl border overflow-hidden shadow-sm ${
                isNight
                  ? "bg-[#232B27] border-[#35403A]"
                  : "bg-[#FFFCF7] border-[#E7DDD0]"
              }`}
            >
              <MemoryPhotoCarousel
                fileIds={entry.drive_file_ids}
                alt={`Daily update by ${entry.uploaded_by}`}
                maxHeightClass="h-[260px] sm:h-[320px]"
                isGrayscale={plantHealth === "withered"}
              />

              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E4EDE4] text-[#4C6B50] font-semibold">
                    <User className="w-3.5 h-3.5" />
                    {entry.uploaded_by}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#8D7B6F]">
                    <Sparkles className="w-3 h-3 text-[#C87A65]" />
                    Daily Check-in
                  </span>
                </div>

                {entry.caption && (
                  <p
                    className={`text-sm leading-relaxed ${
                      isNight ? "text-[#EAE4DA]" : "text-[#3F322B]"
                    }`}
                  >
                    {entry.caption}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
