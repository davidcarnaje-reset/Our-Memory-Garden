"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Palette, Sparkles, X } from "lucide-react";
import {
  SPECIAL_VASES,
  STARTER_VASE,
  type VaseCatalogItem,
} from "@/src/lib/vaseCatalog";
import VaseIllustration from "./VaseIllustration";

interface MonthVasePickerModalProps {
  isOpen: boolean;
  monthName: string;
  year: number;
  monthIndex: number;
  monthKey: string;
  currentVaseCode: string;
  unlockedVases: string[];
  onClose: () => void;
  onEquipVase: (monthKey: string, vaseCode: string) => Promise<void>;
  onOpenBoutique: () => void;
}

export default function MonthVasePickerModal({
  isOpen,
  monthName,
  year,
  monthIndex,
  monthKey,
  currentVaseCode,
  unlockedVases,
  onClose,
  onEquipVase,
  onOpenBoutique,
}: MonthVasePickerModalProps) {
  const [equippingCode, setEquippingCode] = useState<string | null>(null);

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
  const availableVases: VaseCatalogItem[] = [
    STARTER_VASE,
    ...SPECIAL_VASES.filter((v) => unlockedSet.has(v.code)),
  ];

  async function handleSelect(vaseCode: string) {
    setEquippingCode(vaseCode);
    try {
      await onEquipVase(monthKey, vaseCode);
      onClose();
    } finally {
      setEquippingCode(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#2F241E]/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${monthName} ${year} Vase`}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[88vh] flex flex-col bg-[#FFFCF7] border-t sm:border border-[#E6DACB] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-bloom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 bg-[#F6EFE5] border-b border-[#E8DDD0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E4EDE4] text-[#4C6B50] flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-serif)] text-lg sm:text-xl font-semibold text-[#3F322B]">
                Customize {monthName} {year}
              </h2>
              <p className="text-xs text-[#7D6B60]">
                Pick any unlocked vase for {monthName} ({availableVases.length}{" "}
                available)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close vase picker"
            className="p-2 rounded-full text-[#7D6B60] hover:text-[#3F322B] hover:bg-[#EAE0D2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableVases.map((vase) => {
              const isEquipped = currentVaseCode === vase.code;
              const isBusy = equippingCode === vase.code;

              return (
                <button
                  key={vase.code}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSelect(vase.code)}
                  className={`relative rounded-2xl border p-3 text-center transition cursor-pointer flex flex-col items-center justify-between ${
                    isEquipped
                      ? "bg-[#E4EDE4]/70 border-[#6D8C70] ring-2 ring-[#6D8C70]/30"
                      : "bg-[#FAF6F0] border-[#E4D9CB] hover:border-[#C87A65] hover:bg-[#F5EFE6]"
                  }`}
                >
                  {isEquipped && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#6D8C70] text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}

                  <div className="w-24 mx-auto">
                    <VaseIllustration
                      count={1}
                      monthIndex={monthIndex}
                      vaseCode={vase.code}
                    />
                  </div>

                  <div className="mt-1">
                    <p className="font-[family-name:var(--font-serif)] text-xs sm:text-sm font-semibold text-[#3F322B] leading-tight">
                      {vase.name}
                    </p>
                    <p className="text-[10px] text-[#8D7B6F] mt-0.5">
                      {isBusy ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Equipping...
                        </span>
                      ) : isEquipped ? (
                        "Equipped"
                      ) : (
                        vase.rarity
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#FBF7F1] border-t border-[#EDE3D6] flex items-center justify-between gap-3">
          <span className="text-xs text-[#7D6B60]">
            Want more special vases?
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBoutique();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F6F0FC] border border-[#DFD2F0] text-[#5F438A] hover:bg-[#ECE2F7] text-xs font-semibold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Vase Boutique</span>
          </button>
        </div>
      </div>
    </div>
  );
}
