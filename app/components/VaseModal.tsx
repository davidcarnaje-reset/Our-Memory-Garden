"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Flower2,
  Heart,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Memory } from "@/src/lib/db";

interface VaseModalProps {
  isOpen: boolean;
  year: number;
  monthIndex: number; // 0-11
  monthName: string;
  memories: Memory[];
  uploadedBy: string;
  onClose: () => void;
  onMemoryCreated: (memory: Memory) => void;
  onMemoryDeleted: (memoryId: number) => void;
}

function getDefaultDateForMonth(year: number, monthIndex: number): string {
  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() === monthIndex) {
    const dayStr = String(now.getDate()).padStart(2, "0");
    return `${year}-${monthStr}-${dayStr}`;
  }
  return `${year}-${monthStr}-01`;
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Compresses and resizes an image client-side via <canvas> so phone photos
 * stay well under Vercel's 4.5 MB serverless request body limit.
 */
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

    const { naturalWidth: width, naturalHeight: height } = img;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    // Keep original if it is already smaller and within max dimensions
    if (scale === 1 && blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "memory";
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

export default function VaseModal({
  isOpen,
  year,
  monthIndex,
  monthName,
  memories,
  uploadedBy,
  onClose,
  onMemoryCreated,
  onMemoryDeleted,
}: VaseModalProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "plant">(
    memories.length > 0 ? "gallery" : "plant"
  );

  // Form state
  const [memoryDate, setMemoryDate] = useState(() =>
    getDefaultDateForMonth(year, monthIndex)
  );
  const [note, setNote] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlanting, setIsPlanting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Clean up object URL for image preview
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFormError(null);
  }

  function clearSelectedImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
  }

  async function handlePlantMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      setFormError("Please choose a photo for this memory.");
      return;
    }
    if (!note.trim()) {
      setFormError("Please write a love note or caption.");
      return;
    }
    if (!memoryDate) {
      setFormError("Please pick a date for this memory.");
      return;
    }

    setIsPlanting(true);
    setFormError(null);

    try {
      const compressedImage = await compressImageFile(imageFile);

      const formData = new FormData();
      formData.append("image", compressedImage);
      formData.append("note", note.trim());
      formData.append("memory_date", memoryDate);
      formData.append("uploaded_by", uploadedBy);

      const res = await fetch("/api/memories", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to plant memory.");
        return;
      }

      onMemoryCreated(data.memory);
      setNote("");
      clearSelectedImage();
      setActiveTab("gallery");
    } catch {
      setFormError("Network error while planting memory. Please try again.");
    } finally {
      setIsPlanting(false);
    }
  }

  async function handleDelete(memoryId: number) {
    setDeletingId(memoryId);
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onMemoryDeleted(memoryId);
        setConfirmDeleteId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const minDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const maxDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2F241E]/45 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${monthName} ${year} Vase`}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FFFCF7] border border-[#E6DACB] rounded-3xl shadow-2xl overflow-hidden animate-bloom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#F6EFE5] border-b border-[#E8DDD0] flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-[family-name:var(--font-serif)] text-2xl font-semibold text-[#3F322B]">
                {monthName} {year}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E4EDE4] text-[#4C6B50] whitespace-nowrap shrink-0">
                <Flower2 className="w-3.5 h-3.5" />
                {memories.length} {memories.length === 1 ? "flower" : "flowers"}
              </span>
            </div>
            <p className="text-xs text-[#7D6B60] mt-0.5">
              {memories.length === 0
                ? "This vase is waiting for its first bloom."
                : "Every memory here adds a flower to this month's bouquet."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full text-[#7D6B60] hover:text-[#3F322B] hover:bg-[#EAE0D2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 bg-[#FBF7F1] border-b border-[#EDE3D6] flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "gallery"
                ? "border-[#6D8C70] text-[#3F322B] bg-[#FFFCF7]"
                : "border-transparent text-[#86756A] hover:text-[#3F322B]"
            }`}
          >
            <Heart className="w-4 h-4 text-[#D98A8C]" />
            <span>Memories in this Vase ({memories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plant")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "plant"
                ? "border-[#C87A65] text-[#3F322B] bg-[#FFFCF7]"
                : "border-transparent text-[#86756A] hover:text-[#3F322B]"
            }`}
          >
            <Plus className="w-4 h-4 text-[#C87A65]" />
            <span>Plant a New Memory</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {activeTab === "gallery" ? (
            memories.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 rounded-full bg-[#F2E9DC] flex items-center justify-center mx-auto mb-4">
                  <Flower2 className="w-7 h-7 text-[#9B8678]" />
                </div>
                <h3 className="font-[family-name:var(--font-serif)] text-lg font-medium text-[#3F322B]">
                  No memories planted in {monthName} yet
                </h3>
                <p className="text-sm text-[#7D6B60] mt-1.5 max-w-sm mx-auto">
                  Upload a favorite photo and a sweet note to grow the first
                  flower in this vase.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("plant")}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#C87A65] hover:bg-[#B86B56] text-white text-sm font-medium transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Plant First Memory</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {memories.map((memory) => {
                  const imageUrl = `/api/image/${memory.drive_file_id}`;
                  const isConfirming = confirmDeleteId === memory.id;
                  const isDeleting = deletingId === memory.id;

                  return (
                    <article
                      key={memory.id}
                      className="rounded-2xl bg-[#FAF6F0] border border-[#E7DDD0] overflow-hidden shadow-sm"
                    >
                      <div className="bg-[#EFE6D8] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={memory.note.slice(0, 80)}
                          className="w-full max-h-[380px] object-cover"
                        />
                      </div>

                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#736156]">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFE6D8] font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#C87A65]" />
                              {formatDisplayDate(memory.memory_date)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E4EDE4] text-[#4C6B50] font-medium">
                              <User className="w-3.5 h-3.5" />
                              Planted by {memory.uploaded_by}
                            </span>
                          </div>

                          {/* Delete control */}
                          <div className="flex items-center gap-1.5">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(memory.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[#B85042] text-white text-xs font-medium hover:bg-[#9E4034] disabled:opacity-60 cursor-pointer"
                                >
                                  {isDeleting ? "Removing..." : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-[#EAE0D2] text-[#5C4C42] text-xs font-medium hover:bg-[#DFD2C1] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(memory.id)}
                                aria-label="Delete memory"
                                className="p-1.5 rounded-lg text-[#9C897C] hover:text-[#B85042] hover:bg-[#F6E5E2] transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[#3F322B] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                          {memory.note}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : (
            <form onSubmit={handlePlantMemory} className="space-y-5">
              {/* Date Picker */}
              <div>
                <label
                  htmlFor="memory-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2"
                >
                  Memory Date
                </label>
                <input
                  id="memory-date"
                  type="date"
                  value={memoryDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] text-[#3F322B] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/40 focus:border-[#6D8C70]"
                  required
                />
              </div>

              {/* Photo Upload + Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2">
                  Photo
                </label>
                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#E4D9CB] bg-[#F2E9DC]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected memory preview"
                      className="w-full max-h-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#3F322B]/75 hover:bg-[#3F322B] text-white text-xs font-medium backdrop-blur-sm transition cursor-pointer"
                    >
                      Change photo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2.5 py-9 px-4 rounded-2xl border-2 border-dashed border-[#D8CBB9] bg-[#FAF6F0] hover:bg-[#F5EFE6] hover:border-[#C87A65] transition cursor-pointer text-center">
                    <div className="w-11 h-11 rounded-full bg-[#EFE5D7] flex items-center justify-center text-[#C87A65]">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#3F322B]">
                        Click to choose a photo
                      </p>
                      <p className="text-xs text-[#8D7B6F] mt-0.5">
                        JPG, PNG, HEIC, or WebP
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              {/* Love Note */}
              <div>
                <label
                  htmlFor="memory-note"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2"
                >
                  Love Note / Caption
                </label>
                <textarea
                  id="memory-note"
                  rows={4}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder={`Write what made this ${monthName} moment special...`}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] text-[#3F322B] placeholder:text-[#A9988C] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/40 focus:border-[#6D8C70] resize-y"
                  required
                />
              </div>

              {formError && (
                <div className="rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-2.5 text-xs text-[#A94E43] font-medium">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isPlanting}
                className="w-full py-3 px-5 rounded-2xl bg-[#6D8C70] hover:bg-[#5B7A5F] disabled:opacity-65 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPlanting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Planting memory...</span>
                  </>
                ) : (
                  <>
                    <Flower2 className="w-4 h-4" />
                    <span>Plant Memory in {monthName}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
