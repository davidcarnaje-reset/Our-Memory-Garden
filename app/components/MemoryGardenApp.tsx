"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  BellRing,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Flame,
  Flower2,
  Gem,
  Heart,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Shuffle,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import type {
  DailyWaterEntry,
  GardenPlacement,
  GardenStats,
  Memory,
  MemoryReply,
  WateringLog,
} from "@/src/lib/db";
import { STARTER_VASE } from "@/src/lib/vaseCatalog";
import type { DailyWaterResult } from "./DailyWaterModal";
import FloatingGardenNav, { type NavDestination } from "./FloatingGardenNav";
import type { GardenTheme } from "./GardenPlace";
import MemoryPhotoCarousel from "./MemoryPhotoCarousel";
import PasscodeGate from "./PasscodeGate";
import PwaInstallButton from "./PwaInstallButton";
import VaseIllustration, { type PlantHealth } from "./VaseIllustration";
import { MOOD_OPTIONS } from "./VaseModal";

// Lazy-load secondary tabs and modals to keep initial page load fast
const DailyGardenTab = dynamic(() => import("./DailyGardenTab"));
const DailyWaterModal = dynamic(() => import("./DailyWaterModal"));
const GardenPlace = dynamic(() => import("./GardenPlace"));
const MonthVasePickerModal = dynamic(() => import("./MonthVasePickerModal"));
const VaseBoutiqueView = dynamic(() => import("./VaseBoutiqueView"));
const VaseModal = dynamic(() => import("./VaseModal"));

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

const BUTTERFLIES = [
  { top: "16%", left: "14%", delay: "0s", color: "#F2A6B8" },
  { top: "28%", left: "76%", delay: "2.4s", color: "#F4C977" },
  { top: "48%", left: "22%", delay: "4.8s", color: "#B8A3DE" },
  { top: "64%", left: "80%", delay: "1.5s", color: "#9CCCE0" },
  { top: "78%", left: "45%", delay: "3.6s", color: "#F2B59B" },
];

type AmbienceMode = "auto" | "day" | "night";

function isNightHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
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

function parseWateredMs(wateredAt: string | undefined): number | null {
  if (!wateredAt) return null;
  const normalized = wateredAt.includes("T")
    ? wateredAt
    : wateredAt.replace(" ", "T") + "Z";
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function getManilaCycleKey(ms: number): string {
  // Garden day resets at 6:00 PM Asia/Manila
  const shifted = new Date(ms - 18 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

function getMsUntilNext6PmPht(nowMs: number): number {
  const phtOffsetMs = 8 * 60 * 60 * 1000;
  const phtNow = new Date(nowMs + phtOffsetMs);
  const target = new Date(phtNow.getTime());
  target.setUTCHours(18, 0, 0, 0);
  if (phtNow.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return Math.max(0, target.getTime() - phtNow.getTime());
}

function formatCountdown(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function isWateredInCurrentCycle(
  wateredAt: string | undefined,
  nowMs: number
): boolean {
  const ms = parseWateredMs(wateredAt);
  if (ms === null) return false;
  return getManilaCycleKey(ms) === getManilaCycleKey(nowMs);
}

function cycleIndexFromKey(cycleKey: string): number {
  const [y, m, d] = cycleKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
}

function computeSharedPlantHealth(
  latestByPartner: Record<string, string>,
  partnerOptions: readonly string[],
  nowMs: number
): PlantHealth {
  const timestamps = partnerOptions
    .map((name) => parseWateredMs(latestByPartner[name]))
    .filter((ms): ms is number => ms !== null);

  if (timestamps.length === 0) return "fresh";

  const currentCycleIdx = cycleIndexFromKey(getManilaCycleKey(nowMs));
  const oldestCycleIdx = Math.min(
    ...timestamps.map((ms) => cycleIndexFromKey(getManilaCycleKey(ms)))
  );
  const missedCycles = Math.max(0, currentCycleIdx - oldestCycleIdx);

  if (missedCycles >= 3) return "withered";
  if (missedCycles >= 2) return "wilting";
  if (missedCycles >= 1) return "thirsty";
  return "fresh";
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
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(
    null
  );

  // Watering state
  const [wateringLog, setWateringLog] = useState<WateringLog | null>(null);
  const [latestByPartner, setLatestByPartner] = useState<
    Record<string, string>
  >({});
  const [waterSparkleActive, setWaterSparkleActive] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

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

  // View Mode: Monthly Shelf vs Garden Place vs Daily Garden vs Vase Boutique
  const [viewMode, setViewMode] = useState<
    "shelf" | "garden" | "daily" | "boutique"
  >("shelf");
  const [placements, setPlacements] = useState<GardenPlacement[]>([]);
  const [dailyCycleKey, setDailyCycleKey] = useState<string>("");
  const [dailyEntries, setDailyEntries] = useState<DailyWaterEntry[]>([]);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);

  // Gamified Streak & Vase Boutique State
  const [gardenStats, setGardenStats] = useState<GardenStats>({
    id: 1,
    current_streak: 0,
    longest_streak: 0,
    last_watered_date: null,
    last_watered_by: null,
    partner_watered_today: false,
    vase_shards: 0,
  });
  const [unlockedVases, setUnlockedVases] = useState<string[]>([]);
  const [unlockedSceneries, setUnlockedSceneries] = useState<string[]>([]);
  const [equippedVases, setEquippedVases] = useState<Record<string, string>>(
    {}
  );
  const [customizingMonthIndex, setCustomizingMonthIndex] = useState<
    number | null
  >(null);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        "Notification" in window &&
        Notification.permission === "granted" &&
        localStorage.getItem("memory_garden_notif") === "on"
      );
    } catch {
      return false;
    }
  });
  const [dismissedReminderCycle, setDismissedReminderCycle] = useState<
    string | null
  >(null);
  const [gardenToast, setGardenToast] = useState<{
    title: string;
    subtitle: string;
    isMilestone?: boolean;
  } | null>(null);
  const [gardenTheme, setGardenTheme] = useState<GardenTheme>(() => {
    if (typeof window === "undefined") return "peaceful";
    try {
      const saved = localStorage.getItem("memory_garden_theme");
      if (
        saved === "peaceful" ||
        saved === "fantasy" ||
        saved === "wonderful" ||
        saved === "cherry_blossom" ||
        saved === "starry_tent" ||
        saved === "paris_eiffel" ||
        saved === "lantern_lake"
      ) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return "peaceful";
  });
  const [plantHealth, setPlantHealth] = useState<PlantHealth>("fresh");

  const hasPartnerWateredToday = useCallback(
    (partner: string): boolean => {
      if (
        dailyEntries.some(
          (e) => e.uploaded_by.toLowerCase() === partner.toLowerCase()
        )
      ) {
        return true;
      }
      if (nowMs > 0) {
        const currentCycle = getManilaCycleKey(nowMs);
        if (
          gardenStats.last_watered_date === currentCycle &&
          gardenStats.last_watered_by?.toLowerCase() === partner.toLowerCase()
        ) {
          return true;
        }
        return isWateredInCurrentCycle(latestByPartner[partner], nowMs);
      }
      return false;
    },
    [dailyEntries, gardenStats, latestByPartner, nowMs]
  );

  useEffect(() => {
    const updateHealth = () => {
      const current = Date.now();
      setNowMs(current);
      setPlantHealth(
        computeSharedPlantHealth(latestByPartner, partnerOptions, current)
      );
    };
    updateHealth();
    const interval = setInterval(updateHealth, 60_000);
    return () => clearInterval(interval);
  }, [latestByPartner, partnerOptions]);

  // Browser & PWA Notification Helper (uses ServiceWorkerRegistration on Android PWA)
  const showGardenNotification = useCallback(
    async (title: string, body: string) => {
      try {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && typeof registration.showNotification === "function") {
            await registration.showNotification(title, {
              body,
              icon: "/pwa-icon/192",
              badge: "/pwa-icon/192",
            });
            return;
          }
        }

        new Notification(title, {
          body,
          icon: "/pwa-icon/192",
        });
      } catch {
        // Never crash the app if a browser blocks direct Notification construction
      }
    },
    []
  );

  // Browser notification at 6:00 PM PHT reset & when current cycle still needs watering
  useEffect(() => {
    if (!isAuthenticated || !notifEnabled || nowMs === 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const currentCycle = getManilaCycleKey(nowMs);
    const userWatered = hasPartnerWateredToday(uploadedBy);

    if (!userWatered) {
      const lastNotifiedCycle = localStorage.getItem(
        "memory_garden_last_notif_cycle"
      );
      if (lastNotifiedCycle !== currentCycle) {
        void showGardenNotification(
          "Our Memory Garden needs water! 🚿",
          `Hi ${uploadedBy}! Water your plants today before 6:00 PM PHT so they stay blooming.`
        );
        localStorage.setItem("memory_garden_last_notif_cycle", currentCycle);
      }
    }

    const msToReset = getMsUntilNext6PmPht(nowMs);
    const resetTimer = setTimeout(() => {
      const nextCycle = getManilaCycleKey(Date.now() + 2000);
      void showGardenNotification(
        "6:00 PM PHT — Garden Watering Reset! 🌸",
        `It's 6:00 PM! Time for ${uploadedBy} to water Our Memory Garden.`
      );
      localStorage.setItem("memory_garden_last_notif_cycle", nextCycle);
      setNowMs(Date.now());
    }, msToReset + 1500);

    return () => clearTimeout(resetTimer);
  }, [
    isAuthenticated,
    notifEnabled,
    nowMs,
    hasPartnerWateredToday,
    uploadedBy,
    showGardenNotification,
  ]);

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
        const res = await fetch(`/api/garden/bootstrap?year=${year}`, {
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
        } else {
          setMemories(Array.isArray(data.memories) ? data.memories : []);
          if (data.latest) setWateringLog(data.latest);
          if (data.latestByPartner) setLatestByPartner(data.latestByPartner);
          if (Array.isArray(data.placements)) setPlacements(data.placements);
          if (data.stats) setGardenStats(data.stats);
          if (Array.isArray(data.unlockedVases)) {
            setUnlockedVases(data.unlockedVases);
          }
          if (Array.isArray(data.unlockedSceneries)) {
            setUnlockedSceneries(data.unlockedSceneries);
          }
          if (data.equippedVases) setEquippedVases(data.equippedVases);
          if (data.dailyCycleKey) setDailyCycleKey(data.dailyCycleKey);
          if (Array.isArray(data.dailyEntries)) {
            setDailyEntries(data.dailyEntries);
          }
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not connect to the garden database.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMemories(false);
          setHasLoadedInitialData(true);
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

  function handleFloatingNavSelect(dest: NavDestination) {
    if (dest === "shelf") {
      setSpotlightMemory(null);
      setViewMode("shelf");
    } else if (dest === "garden") {
      setSpotlightMemory(null);
      setViewMode("garden");
    } else if (dest === "daily") {
      setSpotlightMemory(null);
      if (viewMode === "daily") {
        setIsWaterModalOpen(true);
      } else {
        setViewMode("daily");
      }
    } else if (dest === "boutique") {
      setSpotlightMemory(null);
      setViewMode("boutique");
    } else if (dest === "random") {
      handlePickRandomFlower();
    }
  }

  function handleWaterGarden() {
    setIsWaterModalOpen(true);
  }

  function handleDailyWaterSuccess(data: DailyWaterResult) {
    setWaterSparkleActive(true);
    setTimeout(() => setWaterSparkleActive(false), 2600);

    if (data.latest) setWateringLog(data.latest);
    if (data.latestByPartner) setLatestByPartner(data.latestByPartner);
    if (data.stats) setGardenStats(data.stats);
    if (data.dailyEntry) {
      setDailyEntries((prev) => [...prev, data.dailyEntry!]);
    }

    if (data.milestoneReached && data.stats) {
      setGardenToast({
        title: `${data.stats.current_streak}-Day Streak! +5 Vase Shards earned!`,
        subtitle: "Celebrate in the Vase Boutique to unlock a special vase!",
        isMilestone: true,
      });
      setTimeout(() => setGardenToast(null), 5500);
    } else if (data.coopBonusAwarded) {
      setGardenToast({
        title: "Co-op Bonus! +1 Vase Shard earned!",
        subtitle: "You both watered the garden together today.",
      });
      setTimeout(() => setGardenToast(null), 4000);
    } else if (data.alreadyWatered) {
      setGardenToast({
        title: "Daily photo shared & saved!",
        subtitle: "Your photo is blooming in today's Daily Garden vase.",
      });
      setTimeout(() => setGardenToast(null), 3500);
    }
  }

  async function handleToggleNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setGardenToast({
        title: "Notifications not supported",
        subtitle: "Your current browser does not support desktop notifications.",
      });
      setTimeout(() => setGardenToast(null), 3500);
      return;
    }

    if (notifEnabled) {
      setNotifEnabled(false);
      localStorage.setItem("memory_garden_notif", "off");
      return;
    }

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission === "granted") {
        setNotifEnabled(true);
        localStorage.setItem("memory_garden_notif", "on");
        setGardenToast({
          title: "6:00 PM PHT Reminders Enabled! 🔔",
          subtitle: "We'll notify you when your garden needs watering.",
        });
        setTimeout(() => setGardenToast(null), 3500);
      } else {
        setGardenToast({
          title: "Notification permission blocked",
          subtitle:
            "Allow notifications in your browser settings to get 6 PM reminders.",
        });
        setTimeout(() => setGardenToast(null), 4000);
      }
    } catch {
      setGardenToast({
        title: "Could not enable notifications",
        subtitle: "Please check your browser or device notification settings.",
      });
      setTimeout(() => setGardenToast(null), 4000);
    }
  }

  async function handleUnlockVase(vaseCode: string) {
    const res = await fetch("/api/garden/unlock-vase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vase_code: vaseCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to unlock vase.");
    }
    if (data.stats) setGardenStats(data.stats);
    if (data.unlockedCode) {
      setUnlockedVases((prev) =>
        prev.includes(data.unlockedCode) ? prev : [...prev, data.unlockedCode]
      );
    }
  }

  async function handleUnlockScenery(sceneryCode: string) {
    const res = await fetch("/api/garden/unlock-scenery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenery_code: sceneryCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to unlock scenery.");
    }
    if (data.stats) setGardenStats(data.stats);
    if (data.unlockedScenery) {
      setUnlockedSceneries((prev) =>
        prev.includes(data.unlockedScenery)
          ? prev
          : [...prev, data.unlockedScenery]
      );
    }
  }

  async function handleEquipVase(monthKey: string, vaseCode: string) {
    const res = await fetch("/api/garden/equip-vase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month_key: monthKey, vase_code: vaseCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to equip vase.");
    }
    if (data.equipped) {
      setEquippedVases((prev) => ({
        ...prev,
        [data.equipped.month_key]: data.equipped.vase_code,
      }));
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
    setHasLoadedInitialData(false);
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

  function handleChangeTheme(nextTheme: GardenTheme) {
    setGardenTheme(nextTheme);
    try {
      localStorage.setItem("memory_garden_theme", nextTheme);
    } catch {
      // Ignore
    }
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
          setHasLoadedInitialData(false);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  if (!hasLoadedInitialData) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-3 px-4 transition-colors ${
          isNight
            ? "bg-[#1A201D] text-[#D8D0C5]"
            : "bg-[#FAF6F0] text-[#7A685D]"
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#E4EDE4] border border-[#C9DBC9] flex items-center justify-center text-[#5B7A5F] animate-pulse">
          <Flower2 className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#6D8C70]" />
          <span>Gathering your memories &amp; garden...</span>
        </div>
      </div>
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
      {/* Night Ambience: Fairy Lights & Drifting Fireflies | Day Ambience: Fluttering Butterflies */}
      {isNight ? (
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
      ) : (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          {BUTTERFLIES.map((bf, idx) => (
            <div
              key={idx}
              className="absolute w-7 h-7 opacity-75 animate-butterfly"
              style={{
                top: bf.top,
                left: bf.left,
                animationDelay: bf.delay,
              }}
            >
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <g className="animate-wing">
                  <ellipse cx="10" cy="13" rx="6" ry="5" fill={bf.color} />
                  <ellipse cx="22" cy="13" rx="6" ry="5" fill={bf.color} />
                  <ellipse
                    cx="11"
                    cy="20"
                    rx="4.2"
                    ry="4"
                    fill={bf.color}
                    opacity="0.85"
                  />
                  <ellipse
                    cx="21"
                    cy="20"
                    rx="4.2"
                    ry="4"
                    fill={bf.color}
                    opacity="0.85"
                  />
                </g>
                <rect
                  x="15"
                  y="10"
                  width="2"
                  height="13"
                  rx="1"
                  fill="#5C4A3E"
                />
              </svg>
            </div>
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
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                isNight
                  ? "bg-[#26322B] border-[#394A40] text-[#9BC09E]"
                  : "bg-[#E4EDE4] border-[#C9DBC9] text-[#5B7A5F]"
              }`}
            >
              <Flower2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1
                className={`font-[family-name:var(--font-serif)] text-lg sm:text-2xl font-semibold leading-tight truncate ${
                  isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
                }`}
              >
                Our Memory Garden
              </h1>
              <p
                className={`text-[11px] sm:text-xs flex items-center gap-1 truncate ${
                  isNight ? "text-[#B5ACA0]" : "text-[#7D6B60]"
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#C87A65] shrink-0" />
                <span>
                  {totalFlowers}{" "}
                  {totalFlowers === 1 ? "flower" : "flowers"} in {year}
                </span>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Year Switcher */}
            <div
              className={`inline-flex items-center border rounded-2xl p-0.5 sm:p-1 shadow-xs ${
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
                className={`p-1 sm:p-1.5 rounded-xl transition cursor-pointer ${
                  isNight
                    ? "text-[#C5BCB0] hover:bg-[#313C36] hover:text-white"
                    : "text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B]"
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <span
                className={`px-1.5 sm:px-3 text-xs sm:text-sm font-semibold tabular-nums ${
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
                className={`p-1 sm:p-1.5 rounded-xl transition cursor-pointer ${
                  isNight
                    ? "text-[#C5BCB0] hover:bg-[#313C36] hover:text-white"
                    : "text-[#6E5C51] hover:bg-[#F2E9DC] hover:text-[#3F322B]"
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Day / Night Ambience Toggle */}
            <button
              type="button"
              onClick={cycleAmbience}
              title={`Ambience: ${ambienceMode} (click to switch)`}
              className={`inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-2xl border text-xs font-medium transition cursor-pointer ${
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

      {/* Garden Action Bar: Streak HUD, Reminders & Watering Status */}
      <div className="relative z-10 max-w-6xl w-full mx-auto px-3.5 sm:px-6 md:pl-24 pt-4 sm:pt-6 flex flex-col gap-3">
        {/* Streak, Shards & Reminders Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold ${
                isNight
                  ? "bg-[#2B2520] border-[#4A3B2E] text-[#F9C67C]"
                  : "bg-[#FFF7EA] border-[#F0D9B5] text-[#9C5D18]"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#E57A3C] fill-[#E57A3C]" />
              <span>
                {gardenStats.current_streak}{" "}
                {gardenStats.current_streak === 1 ? "Day" : "Days"} Streak
              </span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold ${
                isNight
                  ? "bg-[#1F2C36] border-[#334A5C] text-[#9FD2F5]"
                  : "bg-[#EEF6FB] border-[#C9E0F0] text-[#2F5E82]"
              }`}
            >
              <Gem className="w-3.5 h-3.5 text-[#4EA0D8]" />
              <span>
                {gardenStats.vase_shards}{" "}
                {gardenStats.vase_shards === 1 ? "Shard" : "Shards"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PwaInstallButton isNight={isNight} />
            <button
              type="button"
              onClick={handleToggleNotifications}
            title={
              notifEnabled
                ? "6:00 PM PHT reminders enabled (click to turn off)"
                : "Enable 6:00 PM PHT watering reminders"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
              notifEnabled
                ? isNight
                  ? "bg-[#26382B] border-[#3A5942] text-[#A4D4AC]"
                  : "bg-[#E4EDE4] border-[#C6DBC7] text-[#426346]"
                : isNight
                  ? "bg-[#232B27] border-[#35403A] text-[#B5ACA0] hover:text-white"
                  : "bg-[#FFFCF7] border-[#E4D9CB] text-[#6E5C51] hover:bg-[#F2E9DC]"
            }`}
          >
            {notifEnabled ? (
              <BellRing className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>{notifEnabled ? "Reminders On" : "Notify Me"}</span>
          </button>
          </div>
        </div>

        {/* In-App Daily Watering Reminder Banner */}
        {nowMs > 0 &&
          !hasPartnerWateredToday(uploadedBy) &&
          dismissedReminderCycle !== getManilaCycleKey(nowMs) && (
            <div
              className={`rounded-2xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                plantHealth === "withered"
                  ? "bg-[#FDF0EE] border-[#F0C8C2] text-[#9E3E33]"
                  : isNight
                    ? "bg-[#243028] border-[#36493C] text-[#D7E8DA]"
                    : "bg-[#EEF6FB] border-[#CBE0EE] text-[#2F5E82]"
              }`}
            >
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 shrink-0" />
                <span>
                  {plantHealth === "withered" ? (
                    <>
                      <strong>Your plants withered!</strong> Water now to bring
                      back their colors.
                    </>
                  ) : (
                    <>
                      Hi <strong>{uploadedBy}</strong>, your garden still needs
                      watering today (resets at <strong>6:00 PM PHT</strong>).
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleWaterGarden}
                  className="px-3 py-1 rounded-xl bg-[#4E89B5] hover:bg-[#3F78A3] text-white font-semibold transition cursor-pointer"
                >
                  Water Now 💧
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedReminderCycle(getManilaCycleKey(nowMs))
                  }
                  aria-label="Dismiss watering reminder"
                  className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleWaterGarden}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium border shadow-xs transition cursor-pointer ${
                waterSparkleActive
                  ? "bg-[#659EC7] border-[#538AB2] text-white"
                  : plantHealth === "withered"
                    ? "bg-[#B85042] border-[#9E4034] text-white animate-pulse"
                    : plantHealth === "wilting"
                      ? "bg-[#DF9A4E] border-[#C9853B] text-white"
                      : isNight
                        ? "bg-[#232B27] border-[#35403A] text-[#B8D9EE] hover:bg-[#2C3732]"
                        : "bg-[#FFFCF7] border-[#D9E5EC] text-[#3F6885] hover:bg-[#EEF6FB]"
              }`}
            >
              <Droplets
                className={`w-4 h-4 ${waterSparkleActive ? "animate-bounce" : ""}`}
              />
              <span>
                {waterSparkleActive
                  ? "Watered!"
                  : plantHealth === "withered"
                    ? "Revive Garden!"
                    : hasPartnerWateredToday(uploadedBy)
                      ? "Watered Today ✓"
                      : "Water Garden"}
              </span>
            </button>

            {/* Both-Partner Daily Watering Checklist & 6 PM PHT Reset Countdown */}
            <div className="flex flex-wrap items-center gap-1.5">
              {partnerOptions.map((partner) => {
                const wateredToday = hasPartnerWateredToday(partner);
                return (
                  <span
                    key={partner}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      wateredToday
                        ? isNight
                          ? "bg-[#26382B] border-[#3A5942] text-[#A4D4AC]"
                          : "bg-[#E4EDE4] border-[#C6DBC7] text-[#426346]"
                        : isNight
                          ? "bg-[#232B27] border-[#35403A] text-[#B5ACA0]"
                          : "bg-[#F6EFE5] border-[#E4D9CB] text-[#7A685D]"
                    }`}
                  >
                    <span>{wateredToday ? "💧" : "⏳"}</span>
                    <span>{partner}</span>
                  </span>
                );
              })}

              {nowMs > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full ${
                    isNight
                      ? "bg-[#232B27]/90 text-[#B5ACA0]"
                      : "bg-[#F2E9DC]/80 text-[#7A685D]"
                  }`}
                  title="Daily watering resets every 6:00 PM Philippine Time"
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    6 PM PHT reset in{" "}
                    {formatCountdown(getMsUntilNext6PmPht(nowMs))}
                  </span>
                </span>
              )}

              {wateringLog && plantHealth !== "fresh" && (
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                    plantHealth === "withered"
                      ? "bg-[#FDF0EE] text-[#A94E43]"
                      : plantHealth === "wilting"
                        ? "bg-[#FDF4E7] text-[#9A601E]"
                        : "bg-[#FBF6E8] text-[#8A6D29]"
                  }`}
                >
                  {plantHealth === "withered"
                    ? "Withered (3+ days)"
                    : plantHealth === "wilting"
                      ? "Wilting (2 days)"
                      : "Thirsty (1 day)"}
                </span>
              )}
            </div>
          </div>

          {spotlightEmpty && (
            <span className="text-xs text-[#C87A65] font-medium">
              No unlocked flowers yet!
            </span>
          )}
        </div>
      </div>

      {/* Main Garden Content with Smooth Page Transition */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 md:pl-24 py-5 sm:py-8">
        <div key={viewMode} className="animate-page-in">
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
        ) : viewMode === "boutique" ? (
          <VaseBoutiqueView
            vaseShards={gardenStats.vase_shards}
            unlockedVases={unlockedVases}
            isNight={isNight}
            onUnlockVase={handleUnlockVase}
          />
        ) : viewMode === "daily" ? (
          <DailyGardenTab
            cycleKey={
              dailyCycleKey ||
              (nowMs > 0 ? getManilaCycleKey(nowMs) : "today")
            }
            entries={dailyEntries}
            isNight={isNight}
            isWatered={waterSparkleActive}
            plantHealth={plantHealth}
            countdownLabel={
              nowMs > 0
                ? formatCountdown(getMsUntilNext6PmPht(nowMs))
                : "6:00 PM PHT"
            }
            onOpenWaterModal={() => setIsWaterModalOpen(true)}
          />
        ) : viewMode === "garden" ? (
          <GardenPlace
            year={year}
            memoriesByMonth={memoriesByMonth}
            placements={placements}
            equippedVases={equippedVases}
            isNight={isNight}
            isWatered={waterSparkleActive}
            plantHealth={plantHealth}
            theme={gardenTheme}
            unlockedSceneries={unlockedSceneries}
            vaseShards={gardenStats.vase_shards}
            onChangeTheme={handleChangeTheme}
            onUnlockScenery={handleUnlockScenery}
            onSavePlacement={handleSavePlacement}
            onRemovePlacement={handleRemovePlacement}
            onOpenMonth={(idx) => setSelectedMonthIndex(idx)}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {MONTHS.map((monthName, monthIndex) => {
              const monthKey = `${year}-${String(monthIndex + 1).padStart(
                2,
                "0"
              )}`;
              const monthMemories = memoriesByMonth[monthKey] ?? [];
              const count = monthMemories.length;

              return (
                <div
                  key={monthKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMonthIndex(monthIndex)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedMonthIndex(monthIndex);
                    }
                  }}
                  className={`group relative flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl border p-3 sm:p-5 hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center ${
                    isNight
                      ? "bg-[#232B27]/90 border-[#35403A] hover:border-[#56695E] shadow-[0_12px_30px_-14px_rgba(0,0,0,0.6)]"
                      : "bg-[#FFFCF7] border-[#E7DDD0] hover:border-[#C8B8A4] shadow-[0_8px_24px_-12px_rgba(74,59,50,0.12)] hover:shadow-[0_18px_36px_-14px_rgba(74,59,50,0.2)]"
                  }`}
                >
                  {/* Upper-right Customize Vase Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomizingMonthIndex(monthIndex);
                    }}
                    title={`Customize ${monthName} vase`}
                    aria-label={`Customize ${monthName} vase`}
                    className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 rounded-full border transition cursor-pointer ${
                      isNight
                        ? "bg-[#1D2420]/80 border-[#39453E] text-[#C5BCB0] hover:text-white hover:border-[#6D8C70]"
                        : "bg-[#FAF6F0]/90 border-[#E4D9CB] text-[#7A685D] hover:text-[#C87A65] hover:border-[#C87A65]"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>

                  {/* Vase SVG Stage */}
                  <div className="w-full max-w-[148px] mx-auto pt-1 transition-transform duration-300 group-hover:scale-[1.03]">
                    <VaseIllustration
                      flowers={monthMemories}
                      monthIndex={monthIndex}
                      vaseCode={equippedVases[monthKey]}
                      isWatered={waterSparkleActive}
                      plantHealth={plantHealth}
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
                </div>
              );
            })}
          </div>
        )}
        </div>
      </main>

      {/* Cozy Footer (padded for bottom mobile nav) */}
      <footer
        className={`relative z-10 pt-4 pb-24 md:py-6 md:pl-20 text-center text-xs ${
          isNight ? "text-[#9A9287]" : "text-[#8D7B6F]"
        }`}
      >
        Tap any vase to revisit a memory or plant a new flower together.
      </footer>

      {/* Floating Expanding Pill Nav (Bottom on Mobile, Docked Left Side Rail on Desktop) */}
      <FloatingGardenNav
        activeView={viewMode}
        isSpotlightOpen={Boolean(spotlightMemory)}
        dailyCount={dailyEntries.length}
        isNight={isNight}
        onSelect={handleFloatingNavSelect}
      />

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
          plantHealth={plantHealth}
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
              maxHeightClass="h-72 sm:h-80"
              isGrayscale={plantHealth === "withered"}
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

      {/* Per-Month Unlocked Vase Picker Modal */}
      {customizingMonthIndex !== null && (
        <MonthVasePickerModal
          isOpen={customizingMonthIndex !== null}
          monthName={MONTHS[customizingMonthIndex]}
          year={year}
          monthIndex={customizingMonthIndex}
          monthKey={`${year}-${String(customizingMonthIndex + 1).padStart(2, "0")}`}
          currentVaseCode={
            equippedVases[
              `${year}-${String(customizingMonthIndex + 1).padStart(2, "0")}`
            ] ?? STARTER_VASE.code
          }
          unlockedVases={unlockedVases}
          onClose={() => setCustomizingMonthIndex(null)}
          onEquipVase={handleEquipVase}
          onOpenBoutique={() => setViewMode("boutique")}
        />
      )}

      {/* Daily Photo-to-Water Modal */}
      <DailyWaterModal
        isOpen={isWaterModalOpen}
        uploadedBy={uploadedBy}
        cycleKey={
          dailyCycleKey || (nowMs > 0 ? getManilaCycleKey(nowMs) : "today")
        }
        onClose={() => setIsWaterModalOpen(false)}
        onSuccess={handleDailyWaterSuccess}
      />

      {/* Streak Milestone & Co-op Toast */}
      {gardenToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-bloom-in">
          <div
            className={`rounded-2xl border px-4 py-3.5 shadow-xl flex items-start justify-between gap-3 ${
              gardenToast.isMilestone
                ? "bg-gradient-to-r from-[#FFF6E0] via-[#FFFCF2] to-[#FCEBF0] border-[#E8C57B] text-[#4A3525]"
                : "bg-[#FFFCF7] border-[#D9E5EC] text-[#3F322B]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <Sparkles
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  gardenToast.isMilestone ? "text-[#D99A26]" : "text-[#4EA0D8]"
                }`}
              />
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  {gardenToast.title}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {gardenToast.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGardenToast(null)}
              aria-label="Dismiss notification"
              className="p-1 rounded-full hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
