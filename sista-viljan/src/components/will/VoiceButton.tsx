"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function MicIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className={className}>
      <rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7" y1="12" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ListeningToast() {
  return (
    <div
      className="pointer-events-none fixed bottom-20 left-1/2 z-[200] flex -translate-x-1/2 justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex max-w-md items-center gap-3 border border-white/15 bg-[#1a2e4a] px-4 py-3 text-white shadow-lg"
        style={{ borderRadius: "3px" }}
      >
        <span className="inline-flex gap-1" aria-hidden>
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-white/90"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-white/90"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-white/90"
            style={{ animationDelay: "300ms" }}
          />
        </span>
        <div className="text-sm leading-snug">
          <p className="font-medium">Lyssnar…</p>
          <p className="text-xs text-white/80">Texten läggs in i fältet när du pausar.</p>
        </div>
      </div>
    </div>
  );
}

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  /** Endast mikrofonikon — för kompakt rad bredvid Skicka */
  iconOnly?: boolean;
}

export function VoiceButton({
  isListening,
  isSupported,
  onToggle,
  iconOnly = false,
}: VoiceButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = mounted && isListening ? createPortal(<ListeningToast />, document.body) : null;

  if (!isSupported) return null;

  if (iconOnly) {
    return (
      <>
        {toast}
        <button
          type="button"
          onClick={onToggle}
          title={isListening ? "Stoppa diktering" : "Diktera"}
          aria-label={isListening ? "Stoppa diktering" : "Diktera"}
          className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center transition-all duration-150 ${
            isListening
              ? "bg-[#1a2e4a] text-white"
              : "border border-[#e5e5e5] bg-white text-[#4a5568] hover:border-[#1a2e4a] hover:text-[#1a2e4a]"
          }`}
          style={{ borderRadius: "3px" }}
        >
          <MicIcon />
        </button>
      </>
    );
  }

  return (
    <>
      {toast}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-body font-medium transition-all duration-150 ${
            isListening
              ? "bg-[#1a2e4a] text-white animate-pulse-ring"
              : "bg-white border border-[#e5e5e5] text-[#4a5568] hover:border-[#1a2e4a] hover:text-[#1a2e4a]"
          }`}
          style={{ borderRadius: "3px" }}
        >
          <MicIcon className="h-[14px] w-[14px]" />
          {isListening ? "Lyssnar…" : "Diktera svar"}
        </button>
      </div>
    </>
  );
}
