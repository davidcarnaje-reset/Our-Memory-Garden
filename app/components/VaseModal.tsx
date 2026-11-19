"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Flower2,
  Heart,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircleHeart,
  Plus,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Memory, MemoryMood, MemoryReply } from "@/src/lib/db";
import MemoryPhotoCarousel from "./MemoryPhotoCarousel";
import type { PlantHealth } from "./VaseIllustration";

export const MOOD_OPTIONS: {
  value: MemoryMood;
  label: string;
  flower: string;
  emoji: string;
  badgeClass: string;
}[] = [
  {
    value: "date_night",
    label: "Date Night",
    flower: "Rose",
    emoji: "🌹",
    badgeClass: "bg-[#F9E6E7] text-[#9E464D]",
  },
  {
    value: "travel",
    label: "Travel / Adventure",
    flower: "Sunflower",
    emoji: "🌻",
    badgeClass: "bg-[#FDF2D6] text-[#8F6418]",
  },
  {
    value: "milestone",
    label: "Milestone / Anniversary",
    flower: "Tulip",
    emoji: "🌷",
    badgeClass: "bg-[#FBE8E1] text-[#9D4E38]",
  },
  {
    value: "cozy",
    label: "Cozy / Everyday",
    flower: "Daisy",
    emoji: "🌼",
    badgeClass: "bg-[#EFEAF6] text-[#675285]",
  },
];

interface VaseModalProps {
  isOpen: boolean;
  year: number;
  monthIndex: number; // 0-11
  monthName: string;
  memories: Memory[];
  uploadedBy: string;
  plantHealth?: PlantHealth;
  onClose: () => void;
  onMemoryCreated: (memory: Memory) => void;
  onMemoryDeleted: (memoryId: number) => void;
  onReplyAdded: (memoryId: number, reply: MemoryReply) => void;
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

function getTomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  plantHealth = "fresh",
  onClose,
  onMemoryCreated,
  onMemoryDeleted,
  onReplyAdded,
}: VaseModalProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "plant">(
    memories.length > 0 ? "gallery" : "plant"
  );

  // Form state
  const [memoryDate, setMemoryDate] = useState(() =>
    getDefaultDateForMonth(year, monthIndex)
  );
  const [mood, setMood] = useState<MemoryMood>("date_night");
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [unlockDate, setUnlockDate] = useState(() => getTomorrowIsoDate());
  const [note, setNote] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [isPlanting, setIsPlanting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Reply thread state per memory ID
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [selectedPhotos]);

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
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newEntries = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedPhotos((prev) => [...prev, ...newEntries]);
    setFormError(null);
    e.target.value = "";
  }

  function removeSelectedPhoto(photoId: string) {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  }

  function clearAllSelectedPhotos() {
    selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setSelectedPhotos([]);
  }

  async function handlePlantMemory(e: React.FormEvent) {
    e.preventDefault();
    if (selectedPhotos.length === 0) {
      setFormError("Please choose at least one photo for this memory.");
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
    if (isTimeCapsule && !unlockDate) {
      setFormError("Please choose an unlock date for your Time Capsule.");
      return;
    }

    setIsPlanting(true);
    setFormError(null);
    setUploadProgress({ current: 0, total: selectedPhotos.length });

    try {
      const uploadedFileIds: string[] = [];

      for (let i = 0; i < selectedPhotos.length; i++) {
        const item = selectedPhotos[i];
        setUploadProgress({ current: i + 1, total: selectedPhotos.length });

        const compressedImage = await compressImageFile(item.file);

        const uploadForm = new FormData();
        uploadForm.append("image", compressedImage);
        uploadForm.append("memory_date", memoryDate);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.fileId) {
          setFormError(uploadData.error ?? "Failed to upload photo.");
          return;
        }
        uploadedFileIds.push(uploadData.fileId);
      }

      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memory_date: memoryDate,
          note: note.trim(),
          drive_file_ids: uploadedFileIds,
          uploaded_by: uploadedBy,
          mood,
          unlock_date: isTimeCapsule && unlockDate ? unlockDate : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to plant memory.");
        return;
      }

      onMemoryCreated(data.memory);
      selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setNote("");
      setIsTimeCapsule(false);
      setSelectedPhotos([]);
      setActiveTab("gallery");
    } catch {
      setFormError("Network error while planting memory. Please try again.");
    } finally {
      setIsPlanting(false);
      setUploadProgress(null);
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

  async function handleSendReply(
    memoryId: number,
    options: { message?: string; reaction?: string }
  ) {
    setSendingReplyId(memoryId);
    try {
      const res = await fetch(`/api/memories/${memoryId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: uploadedBy,
          message: options.message ?? "",
          reaction: options.reaction ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        onReplyAdded(memoryId, data.reply);
        if (options.message) {
          setReplyDrafts((prev) => ({ ...prev, [memoryId]: "" }));
        }
      }
    } finally {
      setSendingReplyId(null);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const minDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const maxDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#2F241E]/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${monthName} ${year} Vase`}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#FFFCF7] border-t sm:border border-[#E6DACB] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-bloom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[#F6EFE5]">
          <span className="w-10 h-1 rounded-full bg-[#D6C7B4]" />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-[#F6EFE5] border-b border-[#E8DDD0] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-[family-name:var(--font-serif)] text-xl sm:text-2xl font-semibold text-[#3F322B]">
                {monthName} {year}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E4EDE4] text-[#4C6B50] whitespace-nowrap shrink-0">
                <Flower2 className="w-3.5 h-3.5" />
                {memories.length} {memories.length === 1 ? "flower" : "flowers"}
              </span>
            </div>
            <p className="text-xs text-[#7D6B60] mt-0.5 truncate">
              {memories.length === 0
                ? "This vase is waiting for its first bloom."
                : "Every memory here adds a flower to this month's bouquet."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full text-[#7D6B60] hover:text-[#3F322B] hover:bg-[#EAE0D2] transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modern Segmented Pill Tabs */}
        <div className="px-5 sm:px-7 py-3 bg-[#FBF7F1] border-b border-[#EDE3D6]">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#EFE6D8]/80">
            <button
              type="button"
              onClick={() => setActiveTab("gallery")}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "gallery"
                  ? "bg-[#FFFCF7] text-[#3F322B] shadow-xs"
                  : "text-[#7A685D] hover:text-[#3F322B]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-[#D98A8C] shrink-0" />
              <span className="truncate">Memories ({memories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("plant")}
              className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "plant"
                  ? "bg-[#FFFCF7] text-[#3F322B] shadow-xs"
                  : "text-[#7A685D] hover:text-[#3F322B]"
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#C87A65] shrink-0" />
              <span className="truncate">Plant New Memory</span>
            </button>
          </div>
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
                  Upload favorite photos and a sweet note to grow the first
                  flowers in this vase.
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
              <div className="space-y-6">
                {plantHealth === "withered" && (
                  <div className="rounded-2xl bg-[#EFECE7] border border-[#D8D1C7] px-4 py-3 text-xs text-[#5E574E] text-center">
                    Your plants withered after 3+ days without water, so photos
                    are in grayscale. Water the garden to bring back their
                    colors!
                  </div>
                )}
                {memories.map((memory) => {
                  const isLocked = Boolean(
                    memory.unlock_date && memory.unlock_date > todayIso
                  );
                  const moodMeta =
                    MOOD_OPTIONS.find((m) => m.value === memory.mood) ??
                    MOOD_OPTIONS[3];
                  const isConfirming = confirmDeleteId === memory.id;
                  const isDeleting = deletingId === memory.id;
                  const replies = memory.replies ?? [];
                  const draft = replyDrafts[memory.id] ?? "";

                  return (
                    <article
                      key={memory.id}
                      className="rounded-2xl bg-[#FAF6F0] border border-[#E7DDD0] overflow-hidden shadow-sm"
                    >
                      {isLocked ? (
                        <div className="px-6 py-10 bg-gradient-to-br from-[#F4ECE1] to-[#ECE2D3] text-center">
                          <div className="w-12 h-12 rounded-full bg-[#FFFCF7] border border-[#DFD2C1] flex items-center justify-center mx-auto mb-3 text-[#C87A65]">
                            <Lock className="w-5 h-5" />
                          </div>
                          <p className="font-[family-name:var(--font-serif)] text-lg font-semibold text-[#3F322B]">
                            Sealed Time Capsule Bud
                          </p>
                          <p className="text-xs text-[#736156] mt-1">
                            This flower will bloom on{" "}
                            <span className="font-semibold text-[#3F322B]">
                              {formatDisplayDate(memory.unlock_date!)}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <MemoryPhotoCarousel
                          fileIds={
                            memory.drive_file_ids?.length
                              ? memory.drive_file_ids
                              : memory.drive_file_id
                                ? [memory.drive_file_id]
                                : []
                          }
                          alt={memory.note.slice(0, 80)}
                          isGrayscale={plantHealth === "withered"}
                        />
                      )}

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
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${moodMeta.badgeClass}`}
                            >
                              <span>{moodMeta.emoji}</span>
                              <span>{moodMeta.label}</span>
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

                        {!isLocked && (
                          <>
                            <p className="text-[#3F322B] text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                              {memory.note}
                            </p>

                            {/* Love Notes & Reactions Thread */}
                            <div className="mt-4 pt-3.5 border-t border-[#E8DDD0] space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A685D]">
                                  <MessageCircleHeart className="w-3.5 h-3.5 text-[#D98A8C]" />
                                  Love Notes ({replies.length})
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {(["❤️", "🥺", "😂"] as const).map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      disabled={sendingReplyId === memory.id}
                                      onClick={() =>
                                        handleSendReply(memory.id, {
                                          reaction: emoji,
                                        })
                                      }
                                      className="px-2 py-0.5 rounded-full bg-[#FFFCF7] border border-[#E4D9CB] hover:border-[#C87A65] hover:scale-105 text-xs transition cursor-pointer"
                                      title={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {replies.length > 0 && (
                                <div className="space-y-1.5">
                                  {replies.map((reply) => (
                                    <div
                                      key={reply.id}
                                      className="flex items-start gap-2 text-xs bg-[#FFFCF7] border border-[#ECE2D4] rounded-xl px-3 py-2"
                                    >
                                      <span className="font-semibold text-[#5B7A5F] shrink-0">
                                        {reply.author}:
                                      </span>
                                      <span className="text-[#3F322B] break-words">
                                        {reply.reaction && (
                                          <span className="mr-1">
                                            {reply.reaction}
                                          </span>
                                        )}
                                        {reply.message}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={draft}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [memory.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && draft.trim()) {
                                      e.preventDefault();
                                      handleSendReply(memory.id, {
                                        message: draft.trim(),
                                      });
                                    }
                                  }}
                                  placeholder="Leave a sweet reply..."
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFFCF7] border border-[#E4D9CB] text-xs text-[#3F322B] placeholder:text-[#A9988C] focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/35"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    !draft.trim() || sendingReplyId === memory.id
                                  }
                                  onClick={() =>
                                    handleSendReply(memory.id, {
                                      message: draft.trim(),
                                    })
                                  }
                                  aria-label="Send love note"
                                  className="px-3 py-1.5 rounded-xl bg-[#6D8C70] hover:bg-[#5B7A5F] disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
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

              {/* Mood / Flower Species Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2">
                  Mood / Flower Species
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_OPTIONS.map((opt) => {
                    const isSelected = mood === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMood(opt.value)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-[#E4EDE4] border-[#6D8C70] text-[#3F322B] shadow-xs"
                            : "bg-[#FAF6F0] border-[#E4D9CB] text-[#6E5C51] hover:border-[#C8B9A6]"
                        }`}
                      >
                        <span className="text-lg leading-none">{opt.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-[#7D6B60]">
                            Blooms as {opt.flower}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Upload + Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D]">
                    Photos{" "}
                    {selectedPhotos.length > 0 &&
                      `(${selectedPhotos.length} selected)`}
                  </label>
                  {selectedPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSelectedPhotos}
                      className="text-xs font-medium text-[#A94E43] hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {selectedPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {selectedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-[#E4D9CB] bg-[#F2E9DC]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt="Selected memory preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeSelectedPhoto(photo.id)}
                          aria-label="Remove photo"
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#3F322B]/75 hover:bg-[#3F322B] text-white backdrop-blur-sm transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <label className="aspect-square rounded-2xl border-2 border-dashed border-[#D8CBB9] bg-[#FAF6F0] hover:bg-[#F5EFE6] hover:border-[#C87A65] transition cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center p-2">
                      <Plus className="w-5 h-5 text-[#C87A65]" />
                      <span className="text-xs font-medium text-[#5C4C42]">
                        Add more
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2.5 py-9 px-4 rounded-2xl border-2 border-dashed border-[#D8CBB9] bg-[#FAF6F0] hover:bg-[#F5EFE6] hover:border-[#C87A65] transition cursor-pointer text-center">
                    <div className="w-11 h-11 rounded-full bg-[#EFE5D7] flex items-center justify-center text-[#C87A65]">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#3F322B]">
                        Click to choose one or more photos
                      </p>
                      <p className="text-xs text-[#8D7B6F] mt-0.5">
                        JPG, PNG, HEIC, or WebP
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
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
                  rows={3}
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

              {/* Time Capsule Option */}
              <div className="rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] p-3.5 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-[#C87A65]" />
                    <div>
                      <p className="text-xs font-semibold text-[#3F322B]">
                        Time Capsule (Locked Flower Bud)
                      </p>
                      <p className="text-[11px] text-[#7D6B60]">
                        Stay sealed as a bud until a special future date
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isTimeCapsule}
                    onChange={(e) => setIsTimeCapsule(e.target.checked)}
                    className="w-4 h-4 accent-[#6D8C70] cursor-pointer"
                  />
                </label>

                {isTimeCapsule && (
                  <div>
                    <label
                      htmlFor="unlock-date"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-[#7A685D] mb-1.5"
                    >
                      Open on Date
                    </label>
                    <input
                      id="unlock-date"
                      type="date"
                      value={unlockDate}
                      min={getTomorrowIsoDate()}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FFFCF7] border border-[#E4D9CB] text-[#3F322B] text-xs focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/40"
                      required
                    />
                  </div>
                )}
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
                    <span>
                      {uploadProgress && uploadProgress.total > 1
                        ? `Uploading photo ${uploadProgress.current} of ${uploadProgress.total}...`
                        : "Planting memory..."}
                    </span>
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
