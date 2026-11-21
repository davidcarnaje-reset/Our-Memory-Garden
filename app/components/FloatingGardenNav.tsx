"use client";

import React, { useRef, useState } from "react";
import { Camera, LayoutGrid, Shuffle, Store, Trees } from "lucide-react";

export type NavDestination = "shelf" | "garden" | "daily" | "boutique" | "random";

interface FloatingGardenNavProps {
  activeView: "shelf" | "garden" | "daily" | "boutique";
  isSpotlightOpen: boolean;
  dailyCount: number;
  isNight: boolean;
  onSelect: (dest: NavDestination) => void;
}

const NAV_ITEMS: {
  id: NavDestination;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeTextLight: string;
  activeTextDark: string;
}[] = [
  {
    id: "shelf",
    label: "Shelf",
    icon: LayoutGrid,
    activeTextLight: "text-[#B85850]",
    activeTextDark: "text-[#F2A69F]",
  },
  {
    id: "garden",
    label: "Garden",
    icon: Trees,
    activeTextLight: "text-[#456B4A]",
    activeTextDark: "text-[#9ED1A5]",
  },
  {
    id: "daily",
    label: "Daily",
    icon: Camera,
    activeTextLight: "text-[#2F6E82]",
    activeTextDark: "text-[#8ED6EC]",
  },
  {
    id: "boutique",
    label: "Boutique",
    icon: Store,
    activeTextLight: "text-[#6B4B9E]",
    activeTextDark: "text-[#CBB5F2]",
  },
  {
    id: "random",
    label: "Surprise",
    icon: Shuffle,
    activeTextLight: "text-[#9E6A22]",
    activeTextDark: "text-[#F5CB7D]",
  },
];

export default function FloatingGardenNav({
  activeView,
  isSpotlightOpen,
  dailyCount,
  isNight,
  onSelect,
}: FloatingGardenNavProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    startX: number;
    moved: boolean;
    pillIndexFloat: number;
  } | null>(null);

  const activeId: NavDestination = isSpotlightOpen ? "random" : activeView;
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeId)
  );

  const displayedIndexFloat = dragState ? dragState.pillIndexFloat : activeIndex;
  const hoveredIndex = Math.max(
    0,
    Math.min(NAV_ITEMS.length - 1, Math.round(displayedIndexFloat))
  );

  function computeIndexFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return activeIndex;
    const itemWidth = rect.width / NAV_ITEMS.length;
    const raw = (clientX - rect.left - itemWidth / 2) / itemWidth;
    return Math.max(0, Math.min(NAV_ITEMS.length - 1, raw));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      startX: e.clientX,
      moved: false,
      pillIndexFloat: activeIndex,
    });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const dx = Math.abs(e.clientX - dragState.startX);
    const moved = dragState.moved || dx > 6;
    if (!moved) return;

    setDragState({
      startX: dragState.startX,
      moved: true,
      pillIndexFloat: computeIndexFromClientX(e.clientX),
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const wasDrag = dragState.moved;
    const targetIdx = wasDrag
      ? Math.round(dragState.pillIndexFloat)
      : Math.round(computeIndexFromClientX(e.clientX));
    setDragState(null);

    const targetItem = NAV_ITEMS[targetIdx];
    if (targetItem) {
      onSelect(targetItem.id);
    }
  }

  return (
    <>
      {/* Mobile: Draggable Liquid Glass Floating Bottom Bar */}
      <nav
        aria-label="Garden navigation"
        className={`md:hidden fixed z-40 bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[360px] p-1.5 rounded-[2rem] border backdrop-blur-2xl transition-colors duration-300 touch-none select-none ${
          isNight
            ? "bg-[#1A221E]/65 border-white/15 shadow-[0_18px_46px_-10px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.18)]"
            : "bg-white/60 border-white/80 shadow-[0_18px_46px_-10px_rgba(63,50,43,0.25),inset_0_1px_2px_rgba(255,255,255,0.95)]"
        }`}
      >
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDragState(null)}
          className="relative grid grid-cols-5 items-center cursor-grab active:cursor-grabbing"
        >
          {/* Liquid Glass Pill (follows finger live when dragging, glides smoothly on tap) */}
          <span
            aria-hidden="true"
            style={{
              transform: `translateX(${displayedIndexFloat * 100}%) scale(${
                dragState?.moved ? 1.06 : 1
              })`,
            }}
            className={`absolute inset-y-0 left-0 w-1/5 rounded-[1.5rem] pointer-events-none ${
              dragState?.moved
                ? "transition-none"
                : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            } ${
              isNight
                ? "bg-gradient-to-b from-white/25 to-white/10 border border-white/25 shadow-[0_6px_18px_-4px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)]"
                : "bg-gradient-to-b from-white/95 to-white/70 border border-white shadow-[0_6px_18px_-4px_rgba(63,50,43,0.18),inset_0_1px_2px_rgba(255,255,255,1)]"
            }`}
          />

          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const active = idx === hoveredIndex;
            const isCenterCamera = item.id === "daily";

            return (
              <div
                key={item.id}
                role="button"
                aria-label={item.label}
                className={`relative z-10 flex flex-col items-center justify-center gap-0.5 py-2 rounded-[1.5rem] transition-colors duration-150 ${
                  active
                    ? isNight
                      ? item.activeTextDark
                      : item.activeTextLight
                    : isNight
                      ? "text-[#B5ACA0]"
                      : "text-[#6E5C51]"
                }`}
              >
                <div className="relative">
                  <Icon className="w-[18px] h-[18px]" />
                  {isCenterCamera && dailyCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-[#4E89B5] text-white text-[9px] font-bold flex items-center justify-center">
                      {dailyCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none tracking-tight">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Desktop / Larger Screens: Docked Liquid Glass Side Rail */}
      <nav
        aria-label="Garden navigation"
        className={`hidden md:flex fixed z-40 left-0 top-1/2 -translate-y-1/2 flex-col items-center gap-3.5 py-7 px-3.5 rounded-r-[2.25rem] border border-l-0 backdrop-blur-2xl transition-colors duration-300 ${
          isNight
            ? "bg-[#1D2B22]/75 border-white/15 shadow-[12px_16px_40px_-8px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.18)]"
            : "bg-[#5B7A5F]/80 border-white/40 shadow-[12px_16px_40px_-8px_rgba(63,50,43,0.28),inset_0_1px_2px_rgba(255,255,255,0.45)]"
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          const isCenterCamera = item.id === "daily";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`relative flex items-center justify-center p-3.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                active
                  ? "bg-gradient-to-b from-white/95 to-white/80 text-[#3F6344] border border-white shadow-[0_8px_20px_-4px_rgba(30,45,32,0.3),inset_0_1px_2px_rgba(255,255,255,1)]"
                  : isCenterCamera
                    ? "bg-white/20 text-white border border-white/25 hover:bg-white/30"
                    : "text-white/85 hover:text-white hover:bg-white/15"
              }`}
            >
              <Icon className="w-6 h-6 shrink-0" />
              {isCenterCamera && dailyCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#C87A65] text-white text-[10px] font-bold flex items-center justify-center">
                  {dailyCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
