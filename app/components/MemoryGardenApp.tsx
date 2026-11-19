"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flower2,
  Heart,
  LayoutGrid,
  Loader2,
  LogOut,
  Moon,
  Shuffle,
  Sparkles,
  Sun,
  Trees,
  User,
  X,
} from "lucide-react";
import type {
  GardenPlacement,
  Memory,
  MemoryReply,
  WateringLog,
} from "@/src/lib/db";
import GardenPlace from "./GardenPlace";
import MemoryPhotoCarousel from "./MemoryPhotoCarousel";
import PasscodeGate from "./PasscodeGate";
import VaseIllustration from "./VaseIllustration";
import VaseModal, { MOOD_OPTIONS } from "./VaseModal";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const FIREFLIES = [
  { top: "14%", left: "12%", delay: "0s" },
  { top: "24%", left: "78%", delay: "1.2s" },
  { top: "38%", left: "34%", delay: "2.5s" },
  { top: "52%", left: "88%", delay: "0.8s" },
  { top: "68%", left: "18%", delay: "3.1s" },
  { top: "76%", left: "62%", delay: "1.9s" },
  { top: "19%", left: "52%", delay: "4.0s" },
  { top: "84%", left: "40%", delay: "2.2s" },
];

type AmbienceMode = "auto" | "day" | "night";

function isNightHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}

function formatWateredTime(timestampStr: string): string {
  const normalized = timestampStr.includes("T")
    ? timestampStr
    : timestampStr.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return timestampStr;

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSpotlightDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface MemoryGardenAppProps {
  partnerOptions: readonly string[];
  defaultYear?: number;
}

export default function MemoryGardenApp({
  partnerOptions,
  defaultYear = 2026,
}: MemoryGardenAppProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadedBy, setUploadedBy] = useState<string>(
    partnerOptions[0] ?? "David"
  );

  const [year, setYear] = useState<number>(defaultYear);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(
    null
  );

  // Watering state
  const [wateringLog, setWateringLog] = useState<WateringLog | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [waterSparkleActive, setWaterSparkleActive] = useState(false);

  // Day / Night Ambience
  const [ambienceMode, setAmbienceMode] = useState<AmbienceMode>("auto");
  const [autoIsNight, setAutoIsNight] = useState(false);

  useEffect(() => {
    const syncHour = () => setAutoIsNight(isNightHour());
    syncHour();
    const timer = setInterval(syncHour, 60_000);
    return () => clearInterval(timer);
  }, []);

  const isNight = ambienceMode === "auto" ? autoIsNight : ambienceMode === "night";

  // View Mode: Monthly Shelf vs Garden Place
  const [viewMode, setViewMode] = useState<"shelf" | "garden">("shelf");
  const [placements, setPlacements] = useState<GardenPlacement[]>([]);

  // Random Memory Spotlight
  const [spotlightMemory, setSpotlightMemory] = useState<Memory | null>(null);
  const [isPickingRandom, setIsPickingRandom] = useState(false);
  const [spotlightEmpty, setSpotlightEmpty] = useState(false);

  // Check HTTP-only session cookie on initial load
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const res = await fetch("/api/auth", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.authenticated) {
          setIsAuthenticated(true);
          const storedPartner =
            typeof window !== "undefined"
              ? localStorage.getItem("memory_garden_partner")
              : null;
          setUploadedBy(
            data.uploadedBy || storedPartner || partnerOptions[0] || "David"
          );
        }
      } catch {
        // Stay at passcode gate
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [partnerOptions]);

  const fetchMemories = useCallback(async (targetYear: number) => {
    setIsLoadingMemories(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/memories?year=${targetYear}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Unable to load memories.");
        return;
      }
      setMemories(Array.isArray(data.memories) ? data.memories : []);
    } catch {
      setLoadError("Could not connect to the garden database.");
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function load() {
      try {
        const [memRes, waterRes, gardenRes] = await Promise.all([
          fetch(`/api/memories?year=${year}`, { cache: "no-store" }),
          fetch("/api/water", { cache: "no-store" }),
          fetch(`/api/garden?year=${year}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (memRes.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const memData = await memRes.json();
        if (!memRes.ok) {
          setLoadError(memData.error ?? "Unable to load memories.");
        } else {
          setMemories(Array.isArray(memData.memories) ? memData.memories : []);
          setLoadError(null);
        }

        if (waterRes.ok) {
          const waterData = await waterRes.json();
          if (waterData.latest) {
            setWateringLog(waterData.latest);
          }
        }

        if (gardenRes.ok) {
          const gardenData = await gardenRes.json();
          if (Array.isArray(gardenData.placements)) {
            setPlacements(gardenData.placements);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not connect to the garden database.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMemories(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, year]);

  const memoriesByMonth = useMemo(() => {
    const grouped: Record<string, Memory[]> = {};
    for (const mem of memories) {
      if (!grouped[mem.month_key]) {
        grouped[mem.month_key] = [];
      }
      grouped[mem.month_key].push(mem);
    }
    return grouped;
  }, [memories]);

  async function handleWaterGarden() {
    if (isWatering) return;
    setIsWatering(true);
    setWaterSparkleActive(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wateredBy: uploadedBy }),
      });
      const data = await res.json();
      if (res.ok && data.latest) {
        setWateringLog(data.latest);
      }
    } finally {
      setIsWatering(false);
      setTimeout(() => setWaterSparkleActive(false), 2600);
    }
  }

  async function handlePickRandomFlower() {
    if (isPickingRandom) return;
    setIsPickingRandom(true);
    setSpotlightEmpty(false);
    try {
      const res = await fetch("/api/memories/random", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.memory) {
        setSpotlightMemory(data.memory);
      } else {
        setSpotlightEmpty(true);
        setTimeout(() => setSpotlightEmpty(false), 2500);
      }
    } finally {
      setIsPickingRandom(false);
    }
  }

  function cycleAmbience() {
    setAmbienceMode((prev) =>
      prev === "auto" ? "day" : prev === "day" ? "night" : "auto"
    );
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      localStorage.removeItem("memory_garden_partner");
    } catch {
      // Ignore
    }
    setIsAuthenticated(false);
    setMemories([]);
    setSelectedMonthIndex(null);
    setSpotlightMemory(null);
  }

  function handleMemoryCreated(newMemory: Memory) {
    setMemories((prev) =>
      [...prev, newMemory].sort((a, b) =>
        a.memory_date.localeCompare(b.memory_date)
      )
    );
  }

  function handleMemoryDeleted(memoryId: number) {
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }

  function handleReplyAdded(memoryId: number, reply: MemoryReply) {
    setMemories((prev) =>
      prev.map((mem) =>
        mem.id === memoryId
          ? { ...mem, replies: [...(mem.replies ?? []), reply] }
          : mem
      )
    );
  }

  async function handleSavePlacement(
    monthKey: string,
    xPercent: number,
    yPercent: number,
    scale: number
  ) {
    // Optimistic update
    setPlacements((prev) => {
      const next: GardenPlacement = {
        month_key: monthKey,
        x_percent: xPercent,
        y_percent: yPercent,
        scale,
        updated_by: uploadedBy,
        updated_at: new Date().toISOString(),
      };
      const exists = prev.some((p) => p.month_key === monthKey);
      return exists
        ? prev.map((p) => (p.month_key === monthKey ? next : p))
        : [...prev, next];
    });

    try {
      const res = await fetch("/api/garden", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_key: monthKey,
          x_percent: xPercent,
          y_percent: yPercent,
          scale,
        }),
      });
      const data = await res.json();
      if (res.ok && data.placement) {
        setPlacements((prev) =>
          prev.map((p) =>
            p.month_key === monthKey ? data.placement : p
          )
        );
      }
    } catch {
      // Keep optimistic state
    }
  }

  async function handleRemovePlacement(monthKey: string) {
    setPlacements((prev) => prev.filter((p) => p.month_key !== monthKey));
    try {
      await fetch(`/api/garden?month_key=${encodeURIComponent(monthKey)}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-[#7A685D]">
        <Loader2 className="w-6 h-6 animate-spin text-[#6D8C70]" />
        <p className="text-sm font-medium">Opening the garden gate...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PasscodeGate
        partnerOptions={partnerOptions}
        onSuccess={(partner) => {
          setUploadedBy(partner);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const totalFlowers = memories.length;

  return (
    <div
      className={`min-h-screen flex flex-col relative transition-colors duration-700 ${
        isNight
          ? "bg-[#1A201D] text-[#F2ECE3]"
          : "bg-transparent text-[#3F322B]"
      }`}
    >
      {/* Night Ambience: Fairy Lights & Drifting Fireflies */}
      {isNight && (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <div className="absolute -top-20 left-1/4 w-96 h-96 rounded-full bg-[#F2C96B]/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/5 w-80 h-80 rounded-full bg-[#7CA682]/10 blur-3xl" />
          {FIREFLIES.map((ff, idx) => (
            <span
              key={idx}
              className="absolute w-2 h-2 rounded-full bg-[#F7DF86] shadow-[0_0_12px_3px_rgba(247,223,134,0.65)] animate-firefly"
              style={{
                top: ff.top,
                left: ff.left,
                animationDelay: ff.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Top Botanical Header */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors duration-500 ${
          isNight
            ? "bg-[#1A201D]/85 border-[#2E3833]"
            : "bg-[#FAF6F0]/85 border-[#E8DDD0]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                isNight
                  ? "bg-[#26322B] border-[#394A40] text-[#9BC09E]"
                  : "bg-[#E4EDE4] border-[#C9DBC9] text-[#5B7A5F]"
              }`}
            >
              <Flower2 className="w-5 h-5" />
            </div>
            <div>
              <h1
                className={`font-[family-name:var(--font-serif)] text-xl sm:text-2xl font-semibold leading-tight ${
                  isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
                }`}
              >
                Our Memory Garden
              </h1>
              <p
                className={`text-xs flex items-center gap-1.5 ${
                  isNight ? "text-[#B5ACA0]" : "text-[#7D6B60]"
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#C87A65]" />
                <span>
                  {totalFlowers}{" "}
                  {totalFlowers === 1 ? "flower bloomed" : "flowers bloomed"} in{" "}
                  {year}
                </span>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Year Switcher */}
            <div
              className={`inline-flex items-center border rounded-2xl p-1 shadow-xs ${
                isNight
                  ? "bg-[#232B27] border-[#35403A]"
                  : "bg-[#FFFCF7] border-[#E4D9CB]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsLoadingMemories(true);
                  setYear((y) => y - 1);
                }}
                aria-label="Previous year"
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isNight
                    ? "text-[#C5BCB0] hover:bg-[#313C36] hover:text-white"
                    : "text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B]"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                className={`px-3 text-sm font-semibold tabular-nums ${
                  isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
                }`}
              >
                {year}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLoadingMemories(true);
                  setYear((y) => y + 1);
                }}
                aria-label="Next year"
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isNight
                    ? "text-[#C5BCB0] hover:bg-[#313C36] hover:text-white"
                    : "text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B]"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day / Night Ambience Toggle */}
            <button
              type="button"
              onClick={cycleAmbience}
              title={`Ambience: ${ambienceMode} (click to switch)`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-medium transition cursor-pointer ${
                isNight
                  ? "bg-[#232B27] border-[#35403A] text-[#F7DF86] hover:bg-[#2C3631]"
                  : "bg-[#FFFCF7] border-[#E4D9CB] text-[#6E5C51] hover:bg-[#F2E9DC]"
              }`}
            >
              {isNight ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#D89A3C]" />
              )}
              <span className="hidden sm:inline capitalize">{ambienceMode}</span>
            </button>

            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium ${
                isNight
                  ? "bg-[#26322B] text-[#DCE6DD]"
                  : "bg-[#F2E9DC] text-[#5C4C42]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-[#D98A8C] fill-[#D98A8C]" />
              <span>{uploadedBy}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Lock garden"
              aria-label="Lock garden"
              className={`p-2 rounded-2xl border transition cursor-pointer ${
                isNight
                  ? "bg-[#232B27] border-[#35403A] text-[#B5ACA0] hover:text-white hover:bg-[#2E3833]"
                  : "bg-[#FFFCF7] border-[#E4D9CB] text-[#7A685D] hover:text-[#3F322B] hover:bg-[#F2E9DC]"
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Garden Action Bar: View Toggle, Watering Can & Random Flower */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Monthly Shelf / Garden Place Toggle */}
          <div
            className={`inline-flex items-center p-1 rounded-2xl border ${
              isNight
                ? "bg-[#232B27] border-[#35403A]"
                : "bg-[#FFFCF7] border-[#E4D9CB]"
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode("shelf")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === "shelf"
                  ? "bg-[#6D8C70] text-white shadow-xs"
                  : isNight
                    ? "text-[#B5ACA0] hover:text-white"
                    : "text-[#6E5C51] hover:text-[#3F322B]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Monthly Shelf</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("garden")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === "garden"
                  ? "bg-[#6D8C70] text-white shadow-xs"
                  : isNight
                    ? "text-[#B5ACA0] hover:text-white"
                    : "text-[#6E5C51] hover:text-[#3F322B]"
              }`}
            >
              <Trees className="w-3.5 h-3.5" />
              <span>Garden Place</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleWaterGarden}
            disabled={isWatering}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium border shadow-xs transition cursor-pointer ${
              waterSparkleActive
                ? "bg-[#659EC7] border-[#538AB2] text-white"
                : isNight
                  ? "bg-[#232B27] border-[#35403A] text-[#B8D9EE] hover:bg-[#2C3732]"
                  : "bg-[#FFFCF7] border-[#D9E5EC] text-[#3F6885] hover:bg-[#EEF6FB]"
            }`}
          >
            <Droplets
              className={`w-4 h-4 ${waterSparkleActive ? "animate-bounce" : ""}`}
            />
            <span>
              {waterSparkleActive ? "Garden Watered!" : "Water the Garden"}
            </span>
          </button>

          {wateringLog && (
            <span
              className={`text-xs px-3 py-1.5 rounded-full ${
                isNight
                  ? "bg-[#232B27]/90 text-[#B5ACA0]"
                  : "bg-[#EFE7DA]/80 text-[#6F5E53]"
              }`}
            >
              Last watered by{" "}
              <strong className={isNight ? "text-[#E6DFD5]" : "text-[#3F322B]"}>
                {wateringLog.watered_by}
              </strong>{" "}
              • {formatWateredTime(wateringLog.watered_at)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handlePickRandomFlower}
          disabled={isPickingRandom}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium border shadow-xs transition cursor-pointer ${
            isNight
              ? "bg-[#2B2523] border-[#453A36] text-[#F2B5A5] hover:bg-[#362E2B]"
              : "bg-[#FFFCF7] border-[#EAD9D2] text-[#A85D4A] hover:bg-[#FDF2EE]"
          }`}
        >
          {isPickingRandom ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shuffle className="w-4 h-4" />
          )}
          <span>
            {spotlightEmpty ? "No unlocked flowers yet!" : "Pick a Random Flower"}
          </span>
        </button>
      </div>

      {/* Main Garden Shelf Grid */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loadError && (
          <div className="mb-6 rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-3 text-sm text-[#A94E43] flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => fetchMemories(year)}
              className="px-3 py-1 rounded-xl bg-white border border-[#F0C8C2] text-xs font-semibold hover:bg-[#FAF6F0] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {isLoadingMemories ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {MONTHS.map((month) => (
              <div
                key={month}
                className={`h-64 rounded-3xl border animate-pulse ${
                  isNight
                    ? "bg-[#232B27]/70 border-[#35403A]"
                    : "bg-[#FFFCF7]/70 border-[#E9DFD2]"
                }`}
              />
            ))}
          </div>
        ) : viewMode === "garden" ? (
          <GardenPlace
            year={year}
            memoriesByMonth={memoriesByMonth}
            placements={placements}
            isNight={isNight}
            isWatered={waterSparkleActive}
            onSavePlacement={handleSavePlacement}
            onRemovePlacement={handleRemovePlacement}
            onOpenMonth={(idx) => setSelectedMonthIndex(idx)}
          />
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {MONTHS.map((monthName, monthIndex) => {
              const monthKey = `${year}-${String(monthIndex + 1).padStart(
                2,
                "0"
              )}`;
              const monthMemories = memoriesByMonth[monthKey] ?? [];
              const count = monthMemories.length;

              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setSelectedMonthIndex(monthIndex)}
                  className={`group relative flex flex-col items-center justify-between rounded-3xl border p-4 sm:p-5 hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center ${
                    isNight
                      ? "bg-[#232B27]/90 border-[#35403A] hover:border-[#56695E] shadow-[0_12px_30px_-14px_rgba(0,0,0,0.6)]"
                      : "bg-[#FFFCF7] border-[#E7DDD0] hover:border-[#C8B8A4] shadow-[0_8px_24px_-12px_rgba(74,59,50,0.12)] hover:shadow-[0_18px_36px_-14px_rgba(74,59,50,0.2)]"
                  }`}
                >
                  {/* Vase SVG Stage */}
                  <div className="w-full max-w-[148px] mx-auto pt-1 transition-transform duration-300 group-hover:scale-[1.03]">
                    <VaseIllustration
                      flowers={monthMemories}
                      monthIndex={monthIndex}
                      isWatered={waterSparkleActive}
                    />
                  </div>

                  {/* Warm wooden shelf ledge */}
                  <div
                    className={`w-full h-2 rounded-full opacity-75 -mt-1 mb-3 ${
                      isNight
                        ? "bg-gradient-to-b from-[#54463B] to-[#3B3028]"
                        : "bg-gradient-to-b from-[#DFCEB9] to-[#CCB69B]"
                    }`}
                  />

                  {/* Month Name & Flower Count Badge */}
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <h2
                      className={`font-[family-name:var(--font-serif)] text-lg font-semibold transition-colors ${
                        isNight
                          ? "text-[#F2ECE3] group-hover:text-[#E8A594]"
                          : "text-[#3F322B] group-hover:text-[#C87A65]"
                      }`}
                    >
                      {monthName}
                    </h2>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        count === 0
                          ? isNight
                            ? "bg-[#2D3631] text-[#9A9287]"
                            : "bg-[#F3ECE1] text-[#8D7B6F]"
                          : isNight
                            ? "bg-[#2B3D30] text-[#9EC7A2]"
                            : "bg-[#E4EDE4] text-[#4C6B50]"
                      }`}
                    >
                      <Flower2 className="w-3 h-3" />
                      {count} {count === 1 ? "flower" : "flowers"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Cozy Footer */}
      <footer
        className={`relative z-10 py-6 text-center text-xs ${
          isNight ? "text-[#9A9287]" : "text-[#8D7B6F]"
        }`}
      >
        Tap any vase to revisit a memory or plant a new flower together.
      </footer>

      {/* Vase Inspection & Upload Modal */}
      {selectedMonthIndex !== null && (
        <VaseModal
          key={`${year}-${selectedMonthIndex}`}
          isOpen={selectedMonthIndex !== null}
          year={year}
          monthIndex={selectedMonthIndex}
          monthName={MONTHS[selectedMonthIndex]}
          memories={
            memoriesByMonth[
              `${year}-${String(selectedMonthIndex + 1).padStart(2, "0")}`
            ] ?? []
          }
          uploadedBy={uploadedBy}
          onClose={() => setSelectedMonthIndex(null)}
          onMemoryCreated={handleMemoryCreated}
          onMemoryDeleted={handleMemoryDeleted}
          onReplyAdded={handleReplyAdded}
        />
      )}

      {/* Random Memory Spotlight Modal */}
      {spotlightMemory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2F241E]/55 backdrop-blur-sm"
          onClick={() => setSpotlightMemory(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Random Memory Spotlight"
        >
          <div
            className="w-full max-w-md bg-[#FFFCF7] border border-[#E6DACB] rounded-3xl shadow-2xl overflow-hidden animate-bloom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#F6EFE5] border-b border-[#E8DDD0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C87A65]" />
                <h3 className="font-[family-name:var(--font-serif)] text-lg font-semibold text-[#3F322B]">
                  Memory Spotlight
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSpotlightMemory(null)}
                aria-label="Close spotlight"
                className="p-1.5 rounded-full text-[#7D6B60] hover:bg-[#EAE0D2] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <MemoryPhotoCarousel
              key={spotlightMemory.id}
              fileIds={
                spotlightMemory.drive_file_ids?.length
                  ? spotlightMemory.drive_file_ids
                  : spotlightMemory.drive_file_id
                    ? [spotlightMemory.drive_file_id]
                    : []
              }
              alt={spotlightMemory.note.slice(0, 80)}
              maxHeightClass="max-h-80"
            />

            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFE6D8] text-[#736156] font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#C87A65]" />
                  {formatSpotlightDate(spotlightMemory.memory_date)}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E4EDE4] text-[#4C6B50] font-medium">
                  <User className="w-3.5 h-3.5" />
                  {spotlightMemory.uploaded_by}
                </span>
                {(() => {
                  const m =
                    MOOD_OPTIONS.find((x) => x.value === spotlightMemory.mood) ??
                    MOOD_OPTIONS[3];
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${m.badgeClass}`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </span>
                  );
                })()}
              </div>

              <p className="text-sm text-[#3F322B] leading-relaxed whitespace-pre-wrap">
                {spotlightMemory.note}
              </p>

              <button
                type="button"
                onClick={handlePickRandomFlower}
                disabled={isPickingRandom}
                className="w-full py-2.5 rounded-2xl bg-[#F2E9DC] hover:bg-[#E7DAC8] text-[#5C4C42] text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Pick Another Random Flower</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
