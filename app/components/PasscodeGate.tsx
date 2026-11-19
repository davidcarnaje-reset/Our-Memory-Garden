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
    partnerOptions[0] ?? "Me"
  );
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter our shared passcode.");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#FFFCF7] border border-[#E7DDD0] rounded-3xl shadow-[0_20px_60px_-20px_rgba(74,59,50,0.16)] p-7 sm:p-9 animate-bloom-in">
        {/* Decorative mini bouquet */}
        <div className="w-28 mx-auto -mt-2 mb-2">
          <VaseIllustration count={3} monthIndex={3} />
        </div>

        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2E9DC] text-[#7D6352] text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C87A65]" />
            <span>Private Keepsake</span>
          </div>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#3F322B] tracking-tight">
            Our Memory Garden
          </h1>
          <p className="text-sm text-[#7A685D] mt-2 leading-relaxed">
            Every photo and love note we plant blooms into a flower in our
            monthly vases.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Who is logging in */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2">
              Who is visiting today?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {partnerOptions.map((name) => {
                const isSelected = selectedPartner === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedPartner(name)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#6D8C70] text-white border-[#5B7A5F] shadow-sm"
                        : "bg-[#FAF6F0] text-[#5C4C42] border-[#E4D9CB] hover:border-[#C8B9A6]"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isSelected ? "fill-white/90 text-white" : "text-[#D98A8C]"
                      }`}
                    />
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passcode input */}
          <div>
            <label
              htmlFor="garden-passcode"
              className="block text-xs font-semibold uppercase tracking-wider text-[#7A685D] mb-2"
            >
              Garden Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#9C897C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="garden-passcode"
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter our secret passcode..."
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#FAF6F0] border border-[#E4D9CB] text-[#3F322B] placeholder:text-[#A9988C] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8C70]/40 focus:border-[#6D8C70] transition"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8D7B6F] hover:text-[#3F322B] cursor-pointer"
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
            className="w-full py-3 px-5 rounded-2xl bg-[#C87A65] hover:bg-[#B86B56] disabled:opacity-65 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
