"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WillDraft } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceButton } from "./VoiceButton";
import { mergeWillChatExtraction, isIntakeComplete } from "@/lib/willChatIntake";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

interface Props {
  draft: WillDraft;
  onDraftMerged: (merged: WillDraft) => void;
  onIntakeComplete: () => void;
  /** 1–3 för sidhuvud */
  intakeStage: 1 | 2 | 3;
  intakePercent: number;
}

export function WillChatPanel({
  draft,
  onDraftMerged,
  onIntakeComplete,
  intakeStage,
  intakePercent,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const { isListening, isSupported, interimTranscript, toggleListening } = useVoiceInput({
    onTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
    continuous: true,
  });

  const runApi = useCallback(
    async (uiMessages: ChatMessage[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/will-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: uiMessages,
            draft: draftRef.current,
          }),
        });
        if (!res.ok) throw new Error("api");
        const data = (await res.json()) as { text: string; extractedData: Record<string, unknown> | null };
        const merged = mergeWillChatExtraction(draftRef.current, data.extractedData);
        draftRef.current = merged;
        onDraftMerged(merged);
        if (isIntakeComplete(merged)) {
          onIntakeComplete();
        }
        return data.text;
      } catch {
        setError("Kunde inte ansluta till assistenten. Försök igen.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onDraftMerged, onIntakeComplete]
  );

  // Opening turn — avbruten effekt i Strict Mode ska inte fylla tråden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await runApi([]);
      if (cancelled || !text) return;
      setMessages((prev) => (prev.length > 0 ? prev : [{ role: "assistant", content: text }]));
    })();
    return () => {
      cancelled = true;
    };
  }, [runApi]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);

    const reply = await runApi(nextThread);
    if (reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stageLabel =
    intakeStage === 1
      ? "Vi lär känna dig och din familj"
      : intakeStage === 2
        ? "Dina önskemål för arvet"
        : "Begravning och minnen";

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px-6rem)] max-w-2xl">
      <div className="mb-6">
        <p className="label-overline mb-2">Ditt samtal</p>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold text-ink leading-tight mb-2">
          Skriv ditt testamente tillsammans med assistenten
        </h1>
        <p className="text-sm text-[#6b7280]">
          Steg {intakeStage} av 3 i samtalet — {stageLabel} ({intakePercent}% klart)
        </p>
      </div>

      <div
        className="flex-1 flex flex-col border border-[#e5e5e5] bg-[#fafafa] min-h-[420px] max-h-[min(560px,calc(100vh-280px))]"
        style={{ borderRadius: "3px" }}
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-[#6b7280] text-sm px-1">
              <span className="inline-flex gap-1">
                <span                  className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              <span>Assistenten tänker…</span>
            </div>
          )}
          {error && (
            <p
              className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2"
              style={{ borderRadius: "3px" }}
            >
              {error}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#e5e5e5] bg-white px-4 py-3">
          {isListening && interimTranscript && (
            <p className="text-xs text-[#6b7280] italic mb-2">{interimTranscript}</p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ditt svar här…"
              disabled={isLoading}
              rows={2}
              className="flex-1 border border-[#e5e5e5] px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors disabled:opacity-50 resize-none"
              style={{ borderRadius: "3px" }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary text-sm py-2.5 px-4 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Skicka
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <VoiceButton
              isListening={isListening}
              isSupported={isSupported}
              onToggle={toggleListening}
              interimTranscript=""
            />
            <span className="text-xs text-[#6b7280]">Du kan prata eller skriva — svara som det känns naturligt.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }: { role: Role; content: string }) {
  if (role === "assistant") {
    return (
      <div className="flex justify-start animate-fade-in-up">
        <div
          className="max-w-[95%] border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#374151] leading-relaxed whitespace-pre-wrap shadow-sm"
          style={{ borderRadius: "3px" }}
        >
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end animate-fade-in-up">
      <div
        className="max-w-[85%] bg-[#1a2e4a] text-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ borderRadius: "3px" }}
      >
        {content}
      </div>
    </div>
  );
}
