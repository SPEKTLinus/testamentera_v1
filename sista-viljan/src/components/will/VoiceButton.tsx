"use client";

function MicIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className={className}>
      <rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7" y1="12" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  interimTranscript?: string;
  /** Endast mikrofonikon — för kompakt rad bredvid Skicka */
  iconOnly?: boolean;
}

export function VoiceButton({
  isListening,
  isSupported,
  onToggle,
  interimTranscript,
  iconOnly = false,
}: VoiceButtonProps) {
  if (!isSupported) return null;

  if (iconOnly) {
    return (
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
    );
  }

  return (
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
        {isListening ? "Lyssnar..." : "Diktera svar"}
      </button>
      {isListening && interimTranscript && (
        <span className="text-xs text-[#6b7280] italic truncate max-w-xs">{interimTranscript}</span>
      )}
    </div>
  );
}
