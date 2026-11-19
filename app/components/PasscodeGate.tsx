"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Heart, KeyRound, Loader2, Sparkles } from "lucide-react";
import VaseIllustration from "./VaseIllustration";

interface PasscodeGateProps {
  partnerOptions: readonly string[];
  onSuccess: (uploadedBy: string) => void;
}

export default function PasscodeGate({
  partnerOptions,
  onSuccess,
}: PasscodeGateProps) {
  const [selectedPartner, setSelectedPartner] = useState<string>(
    partnerOptions[0] ?? "David"
  );
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter your garden passcode.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: passcode.trim(),
          uploadedBy: selectedPartner,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect passcode. Please try again.");
        return;
      }

      const partnerName = data.uploadedBy ?? selectedPartner;
      try {
        localStorage.setItem("memory_garden_partner", partnerName);
      } catch {
        // Ignore storage restrictions
      }
      onSuccess(partnerName);
    } catch {
      setError("Could not connect to the garden. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Ambient botanical glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-[#D98A8C]/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-[#6D8C70]/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[#E8C468]/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[430px] bg-[#FFFCF7]/90 backdrop-blur-xl border border-[#E7DDD0]/90 rounded-[2rem] shadow-[0_24px_70px_-20px_rgba(63,50,43,0.18)] p-6 sm:p-9 animate-bloom-in">
        {/* Decorative mini bouquet */}
        <div className="w-24 sm:w-28 mx-auto -mt-2 mb-2">
          <VaseIllustration count={3} monthIndex={3} />
        </div>

        <div className="text-center mb-6 sm:mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EAE0] border border-[#E6D9CA] text-[#7D6352] text-[11px] font-semibold tracking-wide uppercase mb-3">
            <Sparkles className="w-3 h-3 text-[#C87A65]" />
            <span>Private Keepsake</span>
          </div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl sm:text-3xl font-semibold text-[#3F322B] tracking-tight">
            Our Memory Garden
          </h1>
          <p className="text-xs sm:text-sm text-[#7A685D] mt-2 leading-relaxed max-w-xs mx-auto">
            Every photo and love note we plant blooms into a flower in our
            monthly vases.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Who is logging in */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7A685D] mb-2.5">
              Who is visiting today?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {partnerOptions.map((name) => {
                const isSelected = selectedPartner === name;
                const initial = name.charAt(0).toUpperCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedPartner(name);
                      if (error) setError(null);
                    }}
                    className={`group flex items-center gap-2.5 py-2.5 px-3.5 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#6D8C70] text-white border-[#5B7A5F] shadow-[0_8px_20px_-8px_rgba(91,122,95,0.6)] scale-[1.01]"
                        : "bg-[#FAF6F0] text-[#5C4C42] border-[#E4D9CB] hover:border-[#C8B9A6] hover:bg-[#F5EFE6]"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[#EFE5D7] text-[#7D6352]"
                      }`}
                    >
                      {initial}
                    </span>
                    <span className="truncate">{name}</span>
                    <Heart
                      className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${
                        isSelected
                          ? "fill-white/90 text-white scale-110"
                          : "text-[#D98A8C] group-hover:scale-110"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passcode input */}
          <div>
            <label
              htmlFor="garden-passcode"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#7A685D] mb-2"
            >
              {selectedPartner}&apos;s Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#9C897C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="garden-passcode"
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`Enter ${selectedPartner}'s passcode...`}
                autoComplete="current-password"
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] text-[#3F322B] placeholder:text-[#A9988C] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/35 focus:border-[#6D8C70] transition"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-[#8D7B6F] hover:text-[#3F322B] hover:bg-[#EFE6D8] transition cursor-pointer"
              >
                {showPasscode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-[#FDF0EE] border border-[#F0C8C2] px-4 py-2.5 text-xs text-[#A94E43] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#C87A65] hover:bg-[#B86B56] active:scale-[0.99] disabled:opacity-65 text-white font-semibold text-sm shadow-[0_10px_24px_-10px_rgba(200,122,101,0.75)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Unlocking garden...</span>
              </>
            ) : (
              <span>Enter Our Garden</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
