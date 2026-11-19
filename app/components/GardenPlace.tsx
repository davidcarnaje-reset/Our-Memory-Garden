"use client";

import React, { useRef, useState } from "react";
import {
  Eye,
  Flower2,
  Move,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { GardenPlacement, Memory } from "@/src/lib/db";
import VaseIllustration, { type PlantHealth } from "./VaseIllustration";

export type GardenTheme = "peaceful" | "fantasy" | "wonderful";

const THEME_OPTIONS: {
  value: GardenTheme;
  label: string;
  emoji: string;
}[] = [
  { value: "peaceful", label: "Peaceful", emoji: "🌿" },
  { value: "fantasy", label: "Fantasy", emoji: "✨" },
  { value: "wonderful", label: "Wonderful", emoji: "🌈" },
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
  isNight: boolean;
  isWatered: boolean;
  plantHealth: PlantHealth;
  theme: GardenTheme;
  onChangeTheme: (theme: GardenTheme) => void;
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
  isNight,
  isWatered,
  plantHealth,
  theme,
  onChangeTheme,
  onSavePlacement,
  onRemovePlacement,
  onOpenMonth,
}: GardenPlaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
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

  const canvasBgClass =
    theme === "fantasy"
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
    <div className="space-y-6">
      {/* Top hint & theme selector bar */}
      <div
        className={`rounded-2xl px-4 py-3 border flex flex-wrap items-center justify-between gap-3 text-xs ${
          isNight
            ? "bg-[#232B27]/90 border-[#35403A] text-[#C8C0B4]"
            : "bg-[#FFFCF7] border-[#E7DDD0] text-[#6E5C51]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-[#C87A65] shrink-0" />
          <span>
            Drag any vase to arrange your garden ({visiblePlacements.length}{" "}
            placed in {year}).
          </span>
        </div>

        {/* 3 Garden Background Choices */}
        <div className="flex items-center gap-1.5">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeTheme(opt.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  active
                    ? "bg-[#6D8C70] border-[#5B7A5F] text-white shadow-xs"
                    : isNight
                      ? "bg-[#2B342F] border-[#3C4841] text-[#C8C0B4] hover:border-[#6D8C70]"
                      : "bg-[#FAF6F0] border-[#E4D9CB] text-[#5C4C42] hover:border-[#C87A65]"
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Garden Canvas */}
      <div
        ref={containerRef}
        onClick={() => setSelectedMonthKey(null)}
        className={`relative w-full h-[420px] sm:h-[500px] rounded-[2rem] border overflow-hidden select-none shadow-lg transition-colors duration-700 ${canvasBgClass}`}
      >
        {/* Illustrated Garden Backdrop SVG */}
        <svg
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Sky: Sun or Crescent Moon & Stars */}
          {isNight ? (
            <>
              <circle cx="1020" cy="92" r="32" fill="#F8E7A1" opacity="0.92" />
              <circle
                cx="1034"
                cy="84"
                r="28"
                fill={
                  theme === "fantasy"
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
                  r={i % 2 === 0 ? 2.2 : 1.5}
                  fill="#FFF7D6"
                  opacity="0.8"
                />
              ))}
            </>
          ) : (
            <>
              <circle cx="1030" cy="95" r="46" fill="#FCE59B" opacity="0.85" />
              <circle cx="1030" cy="95" r="78" fill="#FCE59B" opacity="0.28" />
            </>
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
          {theme === "fantasy" ? (
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
          const widthPx = Math.round(108 * placement.scale);

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
                width: `${widthPx}px`,
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
