"use client";

import React, { useRef, useState } from "react";
import {
  Eye,
  Flower2,
  Gem,
  Loader2,
  Lock,
  Move,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { GardenPlacement, Memory } from "@/src/lib/db";
import VaseIllustration, { type PlantHealth } from "./VaseIllustration";

export type GardenTheme =
  | "peaceful"
  | "fantasy"
  | "wonderful"
  | "cherry_blossom"
  | "starry_tent"
  | "paris_eiffel"
  | "lantern_lake";

const SCENERY_SHARD_COST = 10;

const THEME_OPTIONS: {
  value: GardenTheme;
  label: string;
  emoji: string;
  cost: number;
}[] = [
  { value: "peaceful", label: "Peaceful", emoji: "🌿", cost: 0 },
  { value: "fantasy", label: "Fantasy", emoji: "✨", cost: 0 },
  { value: "wonderful", label: "Wonderful", emoji: "🌈", cost: 0 },
  { value: "cherry_blossom", label: "Cherry Blossom", emoji: "🌸", cost: 10 },
  { value: "starry_tent", label: "Starry Night Tent", emoji: "⛺", cost: 10 },
  { value: "paris_eiffel", label: "Paris Eiffel", emoji: "🗼", cost: 10 },
  { value: "lantern_lake", label: "Lantern Lake", emoji: "🏮", cost: 10 },
];

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

interface GardenPlaceProps {
  year: number;
  memoriesByMonth: Record<string, Memory[]>;
  placements: GardenPlacement[];
  equippedVases?: Record<string, string>;
  isNight: boolean;
  isWatered: boolean;
  plantHealth: PlantHealth;
  theme: GardenTheme;
  unlockedSceneries: string[];
  vaseShards: number;
  onChangeTheme: (theme: GardenTheme) => void;
  onUnlockScenery: (sceneryCode: string) => Promise<void>;
  onSavePlacement: (
    monthKey: string,
    xPercent: number,
    yPercent: number,
    scale: number
  ) => void;
  onRemovePlacement: (monthKey: string) => void;
  onOpenMonth: (monthIndex: number) => void;
}

export default function GardenPlace({
  year,
  memoriesByMonth,
  placements,
  equippedVases = {},
  isNight,
  isWatered,
  plantHealth,
  theme,
  unlockedSceneries,
  vaseShards,
  onChangeTheme,
  onUnlockScenery,
  onSavePlacement,
  onRemovePlacement,
  onOpenMonth,
}: GardenPlaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [pendingUnlockTheme, setPendingUnlockTheme] = useState<{
    value: GardenTheme;
    label: string;
    emoji: string;
  } | null>(null);
  const [isUnlockingScenery, setIsUnlockingScenery] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [draggingState, setDraggingState] = useState<{
    monthKey: string;
    x: number;
    y: number;
    scale: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const bloomingMonths = MONTHS.map((name, idx) => {
    const key = `${year}-${String(idx + 1).padStart(2, "0")}`;
    const mems = memoriesByMonth[key] ?? [];
    return { name, idx, key, memories: mems };
  }).filter((m) => m.memories.length > 0);

  const placementMap = new Map(placements.map((p) => [p.month_key, p]));

  // Only render placed vases that actually have blooming memories
  const visiblePlacements = placements
    .filter((p) => (memoriesByMonth[p.month_key]?.length ?? 0) > 0)
    .map((p) => {
      if (draggingState && draggingState.monthKey === p.month_key) {
        return {
          ...p,
          x_percent: draggingState.x,
          y_percent: draggingState.y,
        };
      }
      return p;
    })
    .sort((a, b) => a.y_percent - b.y_percent);

  function handlePlaceVase(monthKey: string, slotIndex: number) {
    // Spread newly placed vases nicely across the lawn
    const presetSpots = [
      { x: 24, y: 68 },
      { x: 50, y: 74 },
      { x: 76, y: 66 },
      { x: 35, y: 58 },
      { x: 65, y: 60 },
      { x: 20, y: 80 },
      { x: 80, y: 79 },
      { x: 50, y: 56 },
    ];
    const spot = presetSpots[slotIndex % presetSpots.length];
    setSelectedMonthKey(monthKey);
    onSavePlacement(monthKey, spot.x, spot.y, 1);
  }

  function handlePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    placement: GardenPlacement
  ) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedMonthKey(placement.month_key);
    setDraggingState({
      monthKey: placement.month_key,
      x: placement.x_percent,
      y: placement.y_percent,
      scale: placement.scale,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = Math.abs(e.clientX - draggingState.startX);
    const dy = Math.abs(e.clientY - draggingState.startY);
    const moved = draggingState.moved || dx > 5 || dy > 5;

    const nextX = Math.max(
      8,
      Math.min(92, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const nextY = Math.max(
      32,
      Math.min(89, ((e.clientY - rect.top) / rect.height) * 100)
    );

    setDraggingState((prev) =>
      prev ? { ...prev, x: nextX, y: nextY, moved } : null
    );
  }

  function handlePointerUp() {
    if (!draggingState) return;
    const finished = draggingState;
    setDraggingState(null);

    if (finished.moved) {
      onSavePlacement(
        finished.monthKey,
        Math.round(finished.x * 10) / 10,
        Math.round(finished.y * 10) / 10,
        finished.scale
      );
    }
  }

  const unlockedScenerySet = new Set(unlockedSceneries);

  async function handleConfirmUnlock() {
    if (!pendingUnlockTheme) return;
    setIsUnlockingScenery(true);
    setUnlockError(null);
    try {
      await onUnlockScenery(pendingUnlockTheme.value);
      onChangeTheme(pendingUnlockTheme.value);
      setPendingUnlockTheme(null);
    } catch (err) {
      setUnlockError(
        err instanceof Error ? err.message : "Could not unlock scenery."
      );
    } finally {
      setIsUnlockingScenery(false);
    }
  }

  const canvasBgClass =
    theme === "cherry_blossom"
      ? isNight
        ? "border-[#4A3548] bg-gradient-to-b from-[#23192B] via-[#3A2842] to-[#2C3A32]"
        : "border-[#F0CFD9] bg-gradient-to-b from-[#FCE6EE] via-[#FDF2F6] to-[#BBD4AE]"
      : theme === "starry_tent"
        ? "border-[#2B3759] bg-gradient-to-b from-[#0E1838] via-[#1B2D5C] to-[#1A2D28]"
        : theme === "paris_eiffel"
          ? isNight
            ? "border-[#453952] bg-gradient-to-b from-[#1B1830] via-[#372B4D] to-[#24322B]"
            : "border-[#ECD5CE] bg-gradient-to-b from-[#FAD9CE] via-[#F9ECE4] to-[#B0C9A4]"
          : theme === "lantern_lake"
            ? "border-[#384159] bg-gradient-to-b from-[#151D33] via-[#26324E] to-[#1D2D3B]"
            : theme === "fantasy"
              ? isNight
                ? "border-[#3D3552] bg-gradient-to-b from-[#1A1630] via-[#282246] to-[#24323A]"
                : "border-[#D6CBE8] bg-gradient-to-b from-[#E3D8F5] via-[#DCE7F2] to-[#B7D5C4]"
              : theme === "wonderful"
                ? isNight
                  ? "border-[#4A3A47] bg-gradient-to-b from-[#23192D] via-[#3A273D] to-[#2A3B34]"
                  : "border-[#E9D3B8] bg-gradient-to-b from-[#FCE6C9] via-[#F7ECDA] to-[#B9D4A7]"
                : isNight
                  ? "border-[#35403A] bg-gradient-to-b from-[#172026] via-[#21302B] to-[#273B2D]"
                  : "border-[#DFD2C1] bg-gradient-to-b from-[#DCEEF4] via-[#E9F2E4] to-[#BBD1AE]";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top hint & theme selector bar */}
      <div
        className={`rounded-2xl px-4 py-3 border flex flex-col gap-2.5 text-xs ${
          isNight
            ? "bg-[#232B27]/90 border-[#35403A] text-[#C8C0B4]"
            : "bg-[#FFFCF7] border-[#E7DDD0] text-[#6E5C51]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-[#C87A65] shrink-0" />
            <span>
              Drag any vase to arrange your garden ({visiblePlacements.length}{" "}
              placed in {year}).
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F5E82]">
            <Gem className="w-3.5 h-3.5 text-[#4EA0D8]" />
            {vaseShards} Shards
          </span>
        </div>

        {/* Garden Background Choices (Free + 10-Shard Unlockables) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {THEME_OPTIONS.map((opt) => {
            const isUnlocked = opt.cost === 0 || unlockedScenerySet.has(opt.value);
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    setPendingUnlockTheme(null);
                    setUnlockError(null);
                    onChangeTheme(opt.value);
                  } else {
                    setUnlockError(null);
                    setPendingUnlockTheme(opt);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? "bg-[#6D8C70] border-[#5B7A5F] text-white shadow-xs"
                    : !isUnlocked
                      ? isNight
                        ? "bg-[#1D2420] border-[#35403A] text-[#9E968B] hover:border-[#C87A65]"
                        : "bg-[#F5EFE6] border-[#E4D9CB] text-[#7D6B60] hover:border-[#C87A65]"
                      : isNight
                        ? "bg-[#2B342F] border-[#3C4841] text-[#C8C0B4] hover:border-[#6D8C70]"
                        : "bg-[#FAF6F0] border-[#E4D9CB] text-[#5C4C42] hover:border-[#C87A65]"
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                {!isUnlocked && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#DCEAF5] text-[#2F5E82] text-[10px]">
                    <Lock className="w-2.5 h-2.5" />
                    {opt.cost}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Unlock Scenery Prompt */}
        {pendingUnlockTheme && (
          <div className="rounded-xl bg-[#EEF6FB] border border-[#CBE0EE] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[#2E485C]">
            <div>
              <p className="font-semibold">
                Unlock {pendingUnlockTheme.emoji} {pendingUnlockTheme.label} for{" "}
                {SCENERY_SHARD_COST} Shards?
              </p>
              {unlockError && (
                <p className="text-[11px] text-[#A94E43] mt-0.5">{unlockError}</p>
              )}
              {!unlockError && vaseShards < SCENERY_SHARD_COST && (
                <p className="text-[11px] text-[#7A685D] mt-0.5">
                  You currently have {vaseShards} Shards — earn more from co-op
                  watering &amp; 7-day streaks!
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isUnlockingScenery || vaseShards < SCENERY_SHARD_COST}
                onClick={handleConfirmUnlock}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#4E89B5] hover:bg-[#3F78A3] disabled:opacity-50 text-white font-semibold cursor-pointer"
              >
                {isUnlockingScenery ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Gem className="w-3.5 h-3.5" />
                )}
                <span>Unlock (10 Shards)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingUnlockTheme(null);
                  setUnlockError(null);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-[#5C4C42] font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Garden Canvas */}
      <div
        ref={containerRef}
        onClick={() => setSelectedMonthKey(null)}
        className={`relative w-full h-[340px] sm:h-[500px] rounded-[1.5rem] sm:rounded-[2rem] border overflow-hidden select-none shadow-lg transition-colors duration-700 ${canvasBgClass}`}
      >
        {/* Illustrated Garden Backdrop SVG */}
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Sky: Sun or Crescent Moon & Stars */}
          {isNight || theme === "starry_tent" || theme === "lantern_lake" ? (
            <>
              <circle cx="1020" cy="92" r="32" fill="#F8E7A1" opacity="0.95" />
              <circle
                cx="1034"
                cy="84"
                r="28"
                fill={
                  theme === "starry_tent"
                    ? "#0E1838"
                    : theme === "lantern_lake"
                      ? "#151D33"
                      : theme === "fantasy"
                        ? "#1A1630"
                        : theme === "wonderful"
                          ? "#23192D"
                          : "#172026"
                }
              />
              {[
                [140, 65],
                [260, 42],
                [410, 88],
                [580, 50],
                [740, 76],
                [880, 48],
                [1120, 120],
              ].map(([sx, sy], i) => (
                <circle
                  key={i}
                  cx={sx}
                  cy={sy}
                  r={i % 2 === 0 ? 2.4 : 1.6}
                  fill="#FFF7D6"
                  opacity="0.85"
                />
              ))}
            </>
          ) : (
            <>
              <circle cx="1030" cy="95" r="46" fill="#FCE59B" opacity="0.85" />
              <circle cx="1030" cy="95" r="78" fill="#FCE59B" opacity="0.28" />
            </>
          )}

          {/* Starry Night Van Gogh Swirls */}
          {theme === "starry_tent" && (
            <g fill="none" stroke="#6E94DB" strokeLinecap="round" opacity="0.35">
              <path d="M 160,115 C 210,75 280,145 330,105" strokeWidth="10" />
              <path d="M 480,90 C 540,50 610,130 670,85" strokeWidth="12" />
              <circle cx="240" cy="110" r="26" strokeWidth="6" strokeDasharray="18 10" />
              <circle cx="580" cy="88" r="32" strokeWidth="7" strokeDasharray="22 12" />
            </g>
          )}

          {/* Cherry Blossom Drifting Petals */}
          {theme === "cherry_blossom" && (
            <g fill="#F6AEC4" opacity="0.85">
              {[
                [190, 140],
                [320, 180],
                [480, 120],
                [670, 165],
                [820, 130],
                [970, 175],
              ].map(([px, py], idx) => (
                <ellipse
                  key={idx}
                  cx={px}
                  cy={py}
                  rx="6"
                  ry="3.5"
                  transform={`rotate(${idx * 35} ${px} ${py})`}
                />
              ))}
            </g>
          )}

          {/* Lantern Lake Floating Sky Lanterns */}
          {theme === "lantern_lake" && (
            <g>
              {[
                [210, 125, 0.9],
                [380, 90, 0.75],
                [560, 140, 1.05],
                [760, 105, 0.85],
                [900, 150, 0.7],
              ].map(([lx, ly, sc], idx) => (
                <g key={idx} transform={`translate(${lx}, ${ly}) scale(${sc})`}>
                  <circle cx="12" cy="14" r="24" fill="#F9B85C" opacity="0.22" />
                  <rect x="3" y="0" width="18" height="24" rx="5" fill="#F59E42" />
                  <rect x="6" y="4" width="12" height="16" rx="3" fill="#FFE699" />
                </g>
              ))}
            </g>
          )}

          {/* Theme-specific sky accents */}
          {theme === "wonderful" && (
            <g opacity={isNight ? 0.25 : 0.45}>
              <path
                d="M 120,250 Q 480,30 880,240"
                fill="none"
                stroke="#F29F9D"
                strokeWidth="12"
              />
              <path
                d="M 132,254 Q 480,44 868,244"
                fill="none"
                stroke="#F7D58B"
                strokeWidth="10"
              />
              <path
                d="M 144,258 Q 480,58 856,248"
                fill="none"
                stroke="#9EC8D9"
                strokeWidth="10"
              />
            </g>
          )}

          {theme === "fantasy" && (
            <g>
              {/* Floating magic orbs */}
              {[
                [210, 130, 7, "#E8B7F5"],
                [460, 110, 5, "#9BE7E3"],
                [770, 145, 8, "#F8D78D"],
                [900, 115, 5, "#D1B5F7"],
              ].map(([cx, cy, r, fill], idx) => (
                <g key={idx}>
                  <circle
                    cx={cx as number}
                    cy={cy as number}
                    r={(r as number) * 2.5}
                    fill={fill as string}
                    opacity="0.2"
                  />
                  <circle
                    cx={cx as number}
                    cy={cy as number}
                    r={r as number}
                    fill={fill as string}
                    opacity="0.85"
                  />
                </g>
              ))}
            </g>
          )}

          {/* Distant Rolling Hills */}
          <path
            d="M0,250 Q280,170 600,235 T1200,220 L1200,600 L0,600 Z"
            fill={
              theme === "fantasy"
                ? isNight
                  ? "#2B2848"
                  : "#9DBAA9"
                : theme === "wonderful"
                  ? isNight
                    ? "#342E3E"
                    : "#B6C99B"
                  : isNight
                    ? "#223328"
                    : "#A9C59B"
            }
          />
          <path
            d="M0,290 Q360,235 720,285 T1200,270 L1200,600 L0,600 Z"
            fill={
              theme === "fantasy"
                ? isNight
                  ? "#273A3B"
                  : "#8DB5A2"
                : theme === "wonderful"
                  ? isNight
                    ? "#2C3B32"
                    : "#9EC08C"
                  : isNight
                    ? "#2A3F30"
                    : "#96B787"
            }
          />

          {/* Cozy Stone Pathway */}
          <path
            d="M520,600 Q545,450 580,350 Q605,295 625,270 L665,270 Q655,315 650,360 Q645,465 695,600 Z"
            fill={
              theme === "fantasy"
                ? isNight
                  ? "#4F496B"
                  : "#DFD7EB"
                : isNight
                  ? "#4A524D"
                  : "#E3D6C3"
            }
            opacity="0.72"
          />

          {/* Theme-specific scenery */}
          {theme === "cherry_blossom" ? (
            <>
              {/* Sakura Tree Left & Right + Curved Bridge */}
              <g transform="translate(70, 125)">
                <path d="M55,180 Q65,120 48,70" stroke="#6E4E3D" strokeWidth="14" fill="none" strokeLinecap="round" />
                <circle cx="38" cy="65" r="44" fill="#F8BBD0" />
                <circle cx="72" cy="58" r="38" fill="#F48FB1" opacity="0.85" />
                <circle cx="52" cy="38" r="34" fill="#FCE4EC" opacity="0.9" />
              </g>
              <g transform="translate(950, 140)">
                <path d="M60,170 Q50,115 65,65" stroke="#6E4E3D" strokeWidth="12" fill="none" strokeLinecap="round" />
                <circle cx="62" cy="60" r="42" fill="#F8BBD0" />
                <circle cx="36" cy="70" r="32" fill="#F48FB1" opacity="0.85" />
              </g>
              <path d="M460,315 Q600,275 740,315" fill="none" stroke="#9C6B4E" strokeWidth="12" strokeLinecap="round" />
            </>
          ) : theme === "starry_tent" ? (
            <>
              {/* Cozy Illuminated Camping Tent & Campfire */}
              <g transform="translate(150, 215)">
                <polygon points="0,95 75,15 150,95" fill="#D98348" />
                <polygon points="75,15 150,95 110,95" fill="#B5622C" />
                <polygon points="52,95 75,45 98,95" fill="#FCE38A" />
              </g>
              <g transform="translate(330, 285)">
                <circle cx="16" cy="14" r="24" fill="#F79D42" opacity="0.25" />
                <path d="M16,2 C24,12 24,24 16,24 C8,24 8,12 16,2 Z" fill="#F79D42" />
                <path d="M16,9 C20,15 20,22 16,22 C12,22 12,15 16,9 Z" fill="#FFE680" />
                <rect x="4" y="23" width="24" height="5" rx="2" fill="#5C3E2B" />
              </g>
              {/* Pine tree silhouettes */}
              <g fill="#162922" opacity="0.9">
                <polygon points="980,295 1015,200 1050,295" />
                <polygon points="1040,305 1070,225 1100,305" />
              </g>
            </>
          ) : theme === "paris_eiffel" ? (
            <>
              {/* Eiffel Tower Silhouette */}
              <g transform="translate(515, 72)" opacity={isNight ? 0.92 : 0.88}>
                <path
                  d="M85,0 L88,45 L104,135 L138,215 L112,215 Q85,175 58,215 L32,215 L66,135 L82,45 Z"
                  fill={isNight ? "#5C4D6B" : "#7A6A72"}
                />
                <rect x="64" y="132" width="42" height="7" rx="2" fill="#D8AE5E" />
                <rect x="74" y="82" width="22" height="5" rx="2" fill="#D8AE5E" />
                {isNight && (
                  <circle cx="85" cy="12" r="14" fill="#FFE88A" opacity="0.55" />
                )}
              </g>
              {/* Parisian Park Lamppost */}
              <g transform="translate(185, 200)">
                <rect x="12" y="25" width="6" height="82" fill="#363238" />
                <circle cx="15" cy="20" r="10" fill="#FFE89E" opacity="0.9" />
              </g>
            </>
          ) : theme === "lantern_lake" ? (
            <>
              {/* Shimmering Twilight Lake */}
              <ellipse cx="600" cy="340" rx="460" ry="42" fill="#2A445E" opacity="0.82" />
              <ellipse cx="260" cy="342" rx="18" ry="5" fill="#F9B85C" opacity="0.55" />
              <ellipse cx="890" cy="336" rx="22" ry="6" fill="#F9B85C" opacity="0.55" />
            </>
          ) : theme === "fantasy" ? (
            <>
              {/* Glowing Crystal Mushrooms */}
              <g transform="translate(170, 265)">
                <rect x="14" y="20" width="10" height="24" rx="4" fill="#EAE0F2" />
                <path d="M0,22 Q19,-4 38,22 Z" fill="#B68AE0" />
                <circle cx="14" cy="14" r="3" fill="#FFF3FF" opacity="0.8" />
                <circle cx="25" cy="17" r="2" fill="#FFF3FF" opacity="0.8" />
              </g>
              <g transform="translate(940, 250)">
                <path
                  d="M0,55 Q45,-10 90,55"
                  fill="none"
                  stroke="#9C8BB8"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <circle cx="45" cy="24" r="6" fill="#F8E192" opacity="0.9" />
              </g>
            </>
          ) : theme === "wonderful" ? (
            <>
              {/* Shimmering Pond & Romantic Gazebo */}
              <ellipse
                cx="220"
                cy="335"
                rx="115"
                ry="28"
                fill={isNight ? "#4A6C82" : "#9FD3E6"}
                opacity="0.7"
              />
              <g transform="translate(910, 200)" opacity="0.9">
                <path d="M0,40 L55,5 L110,40 Z" fill="#C87A65" />
                <rect x="12" y="40" width="8" height="58" fill="#EFE4D6" />
                <rect x="90" y="40" width="8" height="58" fill="#EFE4D6" />
                <rect x="6" y="95" width="98" height="8" rx="3" fill="#D4C2AD" />
              </g>
            </>
          ) : (
            <>
              {/* Peaceful Wooden Garden Bench & Lantern */}
              <g transform="translate(150, 245)" opacity={isNight ? 0.85 : 0.95}>
                <rect x="0" y="18" width="130" height="10" rx="4" fill="#8C6247" />
                <rect x="0" y="34" width="130" height="10" rx="4" fill="#7C543B" />
                <rect x="-4" y="52" width="138" height="12" rx="4" fill="#9A6E52" />
                <rect x="12" y="14" width="10" height="62" rx="3" fill="#5D3E2B" />
                <rect x="108" y="14" width="10" height="62" rx="3" fill="#5D3E2B" />
              </g>
              <g transform="translate(960, 225)">
                <rect x="16" y="35" width="8" height="68" rx="3" fill="#5C4A3E" />
                <path d="M4,35 L36,35 L28,15 L12,15 Z" fill="#46372E" />
                <rect
                  x="12"
                  y="35"
                  width="16"
                  height="18"
                  rx="3"
                  fill={isNight ? "#F9DF7B" : "#FFF3C4"}
                  opacity={isNight ? 0.95 : 0.7}
                />
                {isNight && (
                  <circle cx="20" cy="44" r="28" fill="#F9DF7B" opacity="0.22" />
                )}
              </g>
            </>
          )}

          {/* Soft foreground grass tufts */}
          <g fill={isNight ? "#334C3A" : "#7FA270"} opacity="0.65">
            <ellipse cx="140" cy="540" rx="55" ry="12" />
            <ellipse cx="1020" cy="530" rx="68" ry="14" />
            <ellipse cx="420" cy="430" rx="42" ry="9" />
            <ellipse cx="830" cy="400" rx="46" ry="10" />
          </g>
        </svg>

        {/* Empty Garden State */}
        {visiblePlacements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div
              className={`max-w-sm text-center rounded-3xl px-6 py-5 border backdrop-blur-md ${
                isNight
                  ? "bg-[#1D2521]/80 border-[#35403A] text-[#E6DFD5]"
                  : "bg-[#FFFCF7]/85 border-[#E7DDD0] text-[#3F322B]"
              }`}
            >
              <Sparkles className="w-6 h-6 text-[#C87A65] mx-auto mb-2" />
              <p className="font-[family-name:var(--font-serif)] text-lg font-semibold">
                Your Garden Place is Ready
              </p>
              <p className="text-xs opacity-80 mt-1">
                {bloomingMonths.length > 0
                  ? "Pick a blooming vase from the tray below to place and decorate your garden!"
                  : "Plant a memory in any month first, then place its blooming vase here."}
              </p>
            </div>
          </div>
        )}

        {/* Placed Draggable Vases */}
        {visiblePlacements.map((placement) => {
          const monthIdx = Number(placement.month_key.slice(5, 7)) - 1;
          const monthName = MONTHS[monthIdx] ?? placement.month_key;
          const monthMemories = memoriesByMonth[placement.month_key] ?? [];
          const isSelected = selectedMonthKey === placement.month_key;
          const isDragging = draggingState?.monthKey === placement.month_key;
          const baseWidth = `clamp(68px, 17vw, 112px)`;

          return (
            <div
              key={placement.month_key}
              onPointerDown={(e) => handlePointerDown(e, placement)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${placement.x_percent}%`,
                top: `${placement.y_percent}%`,
                width: `calc(${baseWidth} * ${placement.scale})`,
                transform: "translate(-50%, -82%)",
                zIndex: isDragging ? 40 : Math.round(placement.y_percent),
              }}
              className={`absolute touch-none cursor-grab active:cursor-grabbing group transition-shadow ${
                isSelected
                  ? "drop-shadow-[0_12px_18px_rgba(200,122,101,0.45)]"
                  : "drop-shadow-[0_8px_12px_rgba(40,30,20,0.22)]"
              }`}
            >
              {/* Floating Controls when Selected */}
              {isSelected && !isDragging && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFFCF7] border border-[#E4D9CB] shadow-lg whitespace-nowrap"
                >
                  {([0.85, 1, 1.25] as const).map((sz, i) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() =>
                        onSavePlacement(
                          placement.month_key,
                          placement.x_percent,
                          placement.y_percent,
                          sz
                        )
                      }
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        Math.abs(placement.scale - sz) < 0.08
                          ? "bg-[#6D8C70] text-white"
                          : "text-[#6E5C51] hover:bg-[#F2E9DC]"
                      }`}
                      title="Resize vase"
                    >
                      {["S", "M", "L"][i]}
                    </button>
                  ))}
                  <span className="w-px h-3.5 bg-[#E4D9CB] mx-0.5" />
                  <button
                    type="button"
                    onClick={() => onOpenMonth(monthIdx)}
                    title={`Open ${monthName}`}
                    className="p-1 rounded-full text-[#5B7A5F] hover:bg-[#E4EDE4] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemovePlacement(placement.month_key);
                      setSelectedMonthKey(null);
                    }}
                    title="Remove from garden"
                    className="p-1 rounded-full text-[#A94E43] hover:bg-[#FDF0EE] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <VaseIllustration
                flowers={monthMemories}
                monthIndex={monthIdx}
                vaseCode={equippedVases[placement.month_key]}
                isWatered={isWatered}
                plantHealth={plantHealth}
              />

              {/* Subtle month label tag */}
              <div className="text-center -mt-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                    isSelected
                      ? "bg-[#C87A65] text-white"
                      : isNight
                        ? "bg-[#1A201D]/75 text-[#E8E0D5]"
                        : "bg-[#FFFCF7]/80 text-[#3F322B]"
                  }`}
                >
                  {monthName}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Blooming Vase Tray */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 ${
          isNight
            ? "bg-[#232B27]/90 border-[#35403A]"
            : "bg-[#FFFCF7] border-[#E7DDD0]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3
            className={`font-[family-name:var(--font-serif)] text-base font-semibold flex items-center gap-2 ${
              isNight ? "text-[#F2ECE3]" : "text-[#3F322B]"
            }`}
          >
            <Flower2 className="w-4 h-4 text-[#6D8C70]" />
            <span>Your Blooming Vases ({year})</span>
          </h3>
          <span
            className={`text-xs ${
              isNight ? "text-[#9A9287]" : "text-[#7D6B60]"
            }`}
          >
            Tap to place or focus in garden
          </span>
        </div>

        {bloomingMonths.length === 0 ? (
          <p
            className={`text-xs py-4 text-center ${
              isNight ? "text-[#9A9287]" : "text-[#8D7B6F]"
            }`}
          >
            No blooming vases in {year} yet. Switch to Monthly Shelf to plant
            your first flower!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {bloomingMonths.map((m, i) => {
              const isPlaced = placementMap.has(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    if (isPlaced) {
                      setSelectedMonthKey(m.key);
                    } else {
                      handlePlaceVase(m.key, i);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                    isPlaced
                      ? isNight
                        ? "bg-[#2B3D30] border-[#45634D] text-[#B5DDB9]"
                        : "bg-[#E4EDE4] border-[#BBD1BD] text-[#3F5E43]"
                      : isNight
                        ? "bg-[#2C3530] border-[#3E4B44] text-[#E6DFD5] hover:border-[#6D8C70]"
                        : "bg-[#FAF6F0] border-[#E4D9CB] text-[#3F322B] hover:border-[#C87A65]"
                  }`}
                >
                  {isPlaced ? (
                    <Sparkles className="w-3.5 h-3.5 text-[#6D8C70]" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[#C87A65]" />
                  )}
                  <span>{m.name}</span>
                  <span className="opacity-70">({m.memories.length})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
