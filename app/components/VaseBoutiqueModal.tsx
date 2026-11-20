"use client";

import React, { useEffect, useState } from "react";
import { Check, Gem, Loader2, Lock, Sparkles, X } from "lucide-react";
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

interface VaseBoutiqueModalProps {
  isOpen: boolean;
  vaseShards: number;
  unlockedVases: string[];
  onClose: () => void;
  onUnlockVase: (vaseCode: string) => Promise<void>;
}

export default function VaseBoutiqueModal({
  isOpen,
  vaseShards,
  unlockedVases,
  onClose,
  onUnlockVase,
}: VaseBoutiqueModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<
    "All" | "Unlocked" | Exclude<VaseTheme, "Starter">
  >("All");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#2F241E]/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vase Boutique Collection"
    >
      <div
        className="w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[#FFFCF7] border-t sm:border border-[#E6DACB] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-bloom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-[#F6EFE5] border-b border-[#E8DDD0] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-[family-name:var(--font-serif)] text-xl sm:text-2xl font-semibold text-[#3F322B]">
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
            <p className="text-xs text-[#7D6B60] mt-1">
              Earn Vase Shards from co-op watering (+1) and 7-day streaks (+5).
              Common = 2, Uncommon = 3, Rare = 4, Epic/Mythic = 5 Shards.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Vase Boutique"
            className="p-2 rounded-full text-[#7D6B60] hover:text-[#3F322B] hover:bg-[#EAE0D2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Filter Bar */}
        <div className="px-5 sm:px-7 py-3 bg-[#FBF7F1] border-b border-[#EDE3D6] flex flex-wrap items-center gap-2 shrink-0">
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
                    : "bg-[#EFE6D8] text-[#6E5C51] hover:bg-[#E5D8C5]"
                }`}
              >
                {theme}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mx-5 sm:mx-7 mt-3 rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-2 text-xs text-[#A94E43] font-medium">
            {error}
          </div>
        )}

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVases.map((vase, idx) => {
              const isUnlocked = unlockedSet.has(vase.code);
              const isBusy = busyCode === vase.code;
              const cost = getVaseShardCost(vase.rarity);
              const canAfford = vaseShards >= cost;

              return (
                <div
                  key={vase.code}
                  className={`rounded-3xl border p-4 flex flex-col justify-between transition ${
                    isUnlocked
                      ? "bg-[#FAF6F0] border-[#E4D9CB]"
                      : "bg-[#F4EFE8]/75 border-[#E8E0D5]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-[family-name:var(--font-serif)] text-base font-semibold text-[#3F322B]">
                          {vase.name}
                        </h3>
                        <p className="text-[11px] text-[#8D7B6F]">{vase.theme}</p>
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

                    <p className="text-xs text-[#6E5C51] leading-relaxed text-center mb-3">
                      {vase.description}
                    </p>
                  </div>

                  {/* Action Footer */}
                  {isUnlocked ? (
                    <div className="pt-2 border-t border-[#E8DDD0] flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E4EDE4] text-[#4C6B50] text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#E8DDD0]">
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
      </div>
    </div>
  );
}
