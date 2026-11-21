"use client";

import React, { useState } from "react";
import { Check, Gem, Loader2, Lock, Sparkles } from "lucide-react";
import {
  getVaseShardCost,
  SPECIAL_VASES,
  STARTER_VASE,
  VASE_THEMES,
  type VaseCatalogItem,
  type VaseRarity,
  type VaseTheme,
} from "@/src/lib/vaseCatalog";
import VaseIllustration from "./VaseIllustration";

const RARITY_BADGE: Record<VaseRarity, string> = {
  Starter: "bg-[#EFE6D8] text-[#6E5C51]",
  Common: "bg-[#E4EDE4] text-[#4C6B50]",
  Uncommon: "bg-[#DCEAF5] text-[#3B6A8E]",
  Rare: "bg-[#EDE6F7] text-[#684C94]",
  Epic: "bg-[#FAE6EC] text-[#A14262]",
  Mythic: "bg-[#FDF0D5] text-[#9A6518]",
};

interface VaseBoutiqueViewProps {
  vaseShards: number;
  unlockedVases: string[];
  isNight: boolean;
  onUnlockVase: (vaseCode: string) => Promise<void>;
}

export default function VaseBoutiqueView({
  vaseShards,
  unlockedVases,
  isNight,
  onUnlockVase,
}: VaseBoutiqueViewProps) {
  const [selectedTheme, setSelectedTheme] = useState<
    "All" | "Unlocked" | Exclude<VaseTheme, "Starter">
  >("All");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlockedSet = new Set([STARTER_VASE.code, ...unlockedVases]);
  const allCatalog: VaseCatalogItem[] = [STARTER_VASE, ...SPECIAL_VASES];

  const filteredVases = allCatalog.filter((v) => {
    if (selectedTheme === "All") return true;
    if (selectedTheme === "Unlocked") return unlockedSet.has(v.code);
    return v.theme === selectedTheme;
  });

  async function handleUnlock(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      await onUnlockVase(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock vase.");
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header Card */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 ${
          isNight
            ? "bg-[#232B27]/90 border-[#35403A]"
            : "bg-[#FFFCF7] border-[#E7DDD0] shadow-xs"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                className={`font-[family-name:var(--font-serif)] text-2xl sm:text-3xl font-semibold ${
                  isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
                }`}
              >
                Vase Boutique
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E4EDE4] text-[#4C6B50]">
                <Sparkles className="w-3.5 h-3.5" />
                {unlockedVases.length} / {SPECIAL_VASES.length} Unlocked
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCEAF5] text-[#2F5E82]">
                <Gem className="w-3.5 h-3.5" />
                {vaseShards} {vaseShards === 1 ? "Shard" : "Shards"}
              </span>
            </div>
            <p
              className={`text-xs sm:text-sm mt-1.5 ${
                isNight ? "text-[#B5ACA0]" : "text-[#7D6B60]"
              }`}
            >
              Earn Vase Shards from co-op watering (+1) and 7-day streaks (+5).
              Common = 2, Uncommon = 3, Rare = 4, Epic/Mythic = 5 Shards.
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 pt-4 border-t border-[#E8DDD0]/60 flex flex-wrap items-center gap-2">
          {(["All", "Unlocked", ...VASE_THEMES] as const).map((theme) => {
            const active = selectedTheme === theme;
            return (
              <button
                key={theme}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  active
                    ? "bg-[#6D8C70] text-white shadow-xs"
                    : isNight
                      ? "bg-[#2C3530] text-[#C8C0B4] hover:bg-[#35403A]"
                      : "bg-[#EFE6D8] text-[#6E5C51] hover:bg-[#E5D8C5]"
                }`}
              >
                {theme}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-2.5 text-xs text-[#A94E43] font-medium">
          {error}
        </div>
      )}

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVases.map((vase, idx) => {
          const isUnlocked = unlockedSet.has(vase.code);
          const isBusy = busyCode === vase.code;
          const cost = getVaseShardCost(vase.rarity);
          const canAfford = vaseShards >= cost;

          return (
            <div
              key={vase.code}
              className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between transition ${
                isUnlocked
                  ? isNight
                    ? "bg-[#232B27] border-[#39453E]"
                    : "bg-[#FFFCF7] border-[#E4D9CB] shadow-xs"
                  : isNight
                    ? "bg-[#1D2320]/85 border-[#2E3833]"
                    : "bg-[#F6F1EA]/90 border-[#E8E0D5]"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3
                      className={`font-[family-name:var(--font-serif)] text-base font-semibold ${
                        isNight ? "text-[#F5EFE6]" : "text-[#3F322B]"
                      }`}
                    >
                      {vase.name}
                    </h3>
                    <p
                      className={`text-[11px] ${
                        isNight ? "text-[#9A9287]" : "text-[#8D7B6F]"
                      }`}
                    >
                      {vase.theme}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${RARITY_BADGE[vase.rarity]}`}
                  >
                    {vase.rarity}
                  </span>
                </div>

                {/* Vase SVG Preview */}
                <div className="relative w-28 mx-auto my-2">
                  <div
                    className={
                      isUnlocked
                        ? ""
                        : "opacity-55 grayscale-[65%] transition"
                    }
                  >
                    <VaseIllustration
                      count={1}
                      monthIndex={idx % 12}
                      vaseCode={vase.code}
                    />
                  </div>
                  {!isUnlocked && (
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#3F322B]/75 text-white flex items-center justify-center shadow">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <p
                  className={`text-xs leading-relaxed text-center mb-3 ${
                    isNight ? "text-[#B5ACA0]" : "text-[#6E5C51]"
                  }`}
                >
                  {vase.description}
                </p>
              </div>

              {/* Action Footer */}
              {isUnlocked ? (
                <div className="pt-2.5 border-t border-[#E8DDD0]/60 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4EDE4] text-[#4C6B50] text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Unlocked</span>
                  </span>
                </div>
              ) : (
                <div className="pt-2.5 border-t border-[#E8DDD0]/60">
                  <button
                    type="button"
                    disabled={!canAfford || isBusy}
                    onClick={() => handleUnlock(vase.code)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      canAfford
                        ? "bg-[#C87A65] hover:bg-[#B86B56] text-white cursor-pointer"
                        : "bg-[#EAE2D6] text-[#9C8B7E] cursor-not-allowed"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Gem className="w-3.5 h-3.5" />
                    )}
                    <span>Unlock ({cost} Shards)</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
