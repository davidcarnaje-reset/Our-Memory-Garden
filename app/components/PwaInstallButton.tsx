"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallButton({ isNight }: { isNight?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore registration failures in unsupported contexts
      });
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="Install Our Memory Garden App"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
        isNight
          ? "bg-[#26382B] border-[#3A5942] text-[#A4D4AC] hover:bg-[#2E4434]"
          : "bg-[#E4EDE4] border-[#C6DBC7] text-[#426346] hover:bg-[#D7E6D8]"
      }`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install App</span>
    </button>
  );
}
