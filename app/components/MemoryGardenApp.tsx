"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flower2,
  Heart,
  Loader2,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { Memory } from "@/src/lib/db";
import PasscodeGate from "./PasscodeGate";
import VaseIllustration from "./VaseIllustration";
import VaseModal from "./VaseModal";

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
    partnerOptions[0] ?? "Me"
  );

  const [year, setYear] = useState<number>(defaultYear);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(
    null
  );

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
            data.uploadedBy || storedPartner || partnerOptions[0] || "Me"
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
        const res = await fetch(`/api/memories?year=${year}`, {
          cache: "no-store",
        });
        if (cancelled) return;
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
        setLoadError(null);
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
    <div className="min-h-screen flex flex-col">
      {/* Top Botanical Header */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/85 backdrop-blur-md border-b border-[#E8DDD0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E4EDE4] border border-[#C9DBC9] flex items-center justify-center text-[#5B7A5F]">
              <Flower2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-serif)] text-xl sm:text-2xl font-semibold text-[#3F322B] leading-tight">
                Our Memory Garden
              </h1>
              <p className="text-xs text-[#7D6B60] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#C87A65]" />
                <span>
                  {totalFlowers}{" "}
                  {totalFlowers === 1 ? "flower bloomed" : "flowers bloomed"} in{" "}
                  {year}
                </span>
              </p>
            </div>
          </div>

          {/* Year Switcher & User Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center bg-[#FFFCF7] border border-[#E4D9CB] rounded-2xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setIsLoadingMemories(true);
                  setYear((y) => y - 1);
                }}
                aria-label="Previous year"
                className="p-1.5 rounded-xl text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold text-[#3F322B] tabular-nums">
                {year}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLoadingMemories(true);
                  setYear((y) => y + 1);
                }}
                aria-label="Next year"
                className="p-1.5 rounded-xl text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F2E9DC] text-[#5C4C42] text-xs font-medium">
              <Heart className="w-3.5 h-3.5 text-[#D98A8C] fill-[#D98A8C]" />
              <span>{uploadedBy}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Lock garden"
              aria-label="Lock garden"
              className="p-2 rounded-2xl bg-[#FFFCF7] border border-[#E4D9CB] text-[#7A685D] hover:text-[#3F322B] hover:bg-[#F2E9DC] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Garden Shelf Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {MONTHS.map((month) => (
              <div
                key={month}
                className="h-64 rounded-3xl bg-[#FFFCF7]/70 border border-[#E9DFD2] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
                  className="group relative flex flex-col items-center justify-between rounded-3xl bg-[#FFFCF7] border border-[#E7DDD0] hover:border-[#C8B8A4] p-4 sm:p-5 shadow-[0_8px_24px_-12px_rgba(74,59,50,0.12)] hover:shadow-[0_18px_36px_-14px_rgba(74,59,50,0.2)] hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center"
                >
                  {/* Vase SVG Stage */}
                  <div className="w-full max-w-[148px] mx-auto pt-1 transition-transform duration-300 group-hover:scale-[1.03]">
                    <VaseIllustration count={count} monthIndex={monthIndex} />
                  </div>

                  {/* Warm wooden shelf ledge */}
                  <div className="w-full h-2 rounded-full bg-gradient-to-b from-[#DFCEB9] to-[#CCB69B] opacity-75 -mt-1 mb-3" />

                  {/* Month Name & Flower Count Badge */}
                  <div className="w-full flex flex-col items-center gap-1.5">
                    <h2 className="font-[family-name:var(--font-serif)] text-lg font-semibold text-[#3F322B] group-hover:text-[#C87A65] transition-colors">
                      {monthName}
                    </h2>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        count === 0
                          ? "bg-[#F3ECE1] text-[#8D7B6F]"
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
      <footer className="py-6 text-center text-xs text-[#8D7B6F]">
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
        />
      )}
    </div>
  );
}
