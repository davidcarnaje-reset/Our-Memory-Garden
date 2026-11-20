"use client";

import React, { useEffect, useState } from "react";
import { Camera, Droplets, ImagePlus, Loader2, X } from "lucide-react";
import type { DailyWaterEntry, GardenStats, WateringLog } from "@/src/lib/db";

const MAX_DAILY_PHOTOS = 3;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode image"));
      image.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight)
    );
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "daily";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface DailyWaterResult {
  stats?: GardenStats;
  alreadyWatered?: boolean;
  coopBonusAwarded?: boolean;
  milestoneReached?: boolean;
  latest?: WateringLog;
  latestByPartner?: Record<string, string>;
  dailyEntry?: DailyWaterEntry | null;
}

interface DailyWaterModalProps {
  isOpen: boolean;
  uploadedBy: string;
  cycleKey: string;
  onClose: () => void;
  onSuccess: (result: DailyWaterResult) => void;
}

export default function DailyWaterModal({
  isOpen,
  uploadedBy,
  cycleKey,
  onClose,
  onSuccess,
}: DailyWaterModalProps) {
  const [photos, setPhotos] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const remainingSlots = MAX_DAILY_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_DAILY_PHOTOS} daily photos.`);
      e.target.value = "";
      return;
    }

    const picked = incoming.slice(0, remainingSlots).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...picked]);
    setError(
      incoming.length > remainingSlots
        ? `Only the first ${remainingSlots} photo(s) were added (max ${MAX_DAILY_PHOTOS}).`
        : null
    );
    e.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) {
      setError("Take or choose 1 to 3 photos to water the garden!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const uploadedIds: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
        const compressed = await compressImageFile(photos[i].file);
        const form = new FormData();
        form.append("image", compressed);
        form.append("memory_date", cycleKey);
        form.append("folder", "daily");

        const upRes = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const upData = await upRes.json();
        if (!upRes.ok || !upData.fileId) {
          setError(upData.error ?? "Failed to upload daily photo.");
          return;
        }
        uploadedIds.push(upData.fileId);
      }

      setProgress("Watering your garden...");
      const res = await fetch("/api/garden/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wateredBy: uploadedBy,
          drive_file_ids: uploadedIds,
          caption: caption.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not water the garden.");
        return;
      }

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setCaption("");
      onSuccess(data);
      onClose();
    } catch {
      setError("Network error while watering. Please try again.");
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#2F241E]/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Water Garden with Daily Photos"
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-[#FFFCF7] border-t sm:border border-[#E6DACB] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-bloom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 bg-[#EEF6FB] border-b border-[#D5E6F2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#659EC7] text-white flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-serif)] text-lg sm:text-xl font-semibold text-[#2E485C]">
                Water with Daily Photos
              </h2>
              <p className="text-xs text-[#54758E]">
                Share 1–3 quick snaps for {uploadedBy}&apos;s daily check-in
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full text-[#54758E] hover:bg-[#DCECF7] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
        >
          {/* Preview Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-[#E4D9CB] bg-[#F2E9DC]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt="Daily check-in preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label="Remove photo"
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#2F241E]/75 text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Camera & Gallery Buttons */}
          {photos.length < MAX_DAILY_PHOTOS && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl border-2 border-dashed border-[#BFD8EA] bg-[#F5FAFD] hover:bg-[#EBF4FA] transition cursor-pointer text-center">
                <Camera className="w-5 h-5 text-[#4E89B5]" />
                <span className="text-xs font-semibold text-[#2E485C]">
                  Take Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAddFiles}
                  className="sr-only"
                />
              </label>

              <label className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl border-2 border-dashed border-[#D8CBB9] bg-[#FAF6F0] hover:bg-[#F3ECE1] transition cursor-pointer text-center">
                <ImagePlus className="w-5 h-5 text-[#C87A65]" />
                <span className="text-xs font-semibold text-[#3F322B]">
                  Choose 1–{MAX_DAILY_PHOTOS - photos.length}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddFiles}
                  className="sr-only"
                />
              </label>
            </div>
          )}

          {/* Optional Caption */}
          <div>
            <label
              htmlFor="daily-caption"
              className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-1.5"
            >
              Quick Update (Optional)
            </label>
            <input
              id="daily-caption"
              type="text"
              maxLength={255}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What are you up to right now?"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] text-sm text-[#3F322B] placeholder:text-[#A9988C] focus:outline-none focus:ring-2 focus:ring-[#659EC7]/40"
            />
          </div>

          <p className="text-[11px] text-[#8D7B6F] leading-relaxed">
            Photos bloom in today&apos;s <strong>Daily Garden</strong> vase and
            reset at <strong>6:00 PM PHT</strong>—while staying saved in your
            Google Drive <strong>Daily Pictures</strong> folder.
          </p>

          {error && (
            <div className="rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-2.5 text-xs text-[#A94E43] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || photos.length === 0}
            className="w-full py-3 px-5 rounded-2xl bg-[#4E89B5] hover:bg-[#3F78A3] disabled:opacity-60 text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progress ?? "Watering..."}</span>
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4" />
                <span>
                  Send {photos.length > 0 ? photos.length : ""}{" "}
                  {photos.length === 1 ? "Photo" : "Photos"} &amp; Water
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
