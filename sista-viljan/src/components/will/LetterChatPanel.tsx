"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WillDraft, WillAiTokenUsage } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceButton } from "./VoiceButton";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

interface Props {
  draft: WillDraft;
  onDraftMerged: (merged: WillDraft) => void;
  onBackToDocuments: () => void;
}

function mergeLetterIntoDraft(
  draft: WillDraft,
  letterBody: string | null | undefined,
  aiTokenUsage?: WillAiTokenUsage
): WillDraft {
  const next: WillDraft = {
    ...draft,
    personalLetter: { ...draft.personalLetter },
  };
  if (letterBody != null && letterBody.trim()) {
    next.personalLetter = {
      ...next.personalLetter,
      body: letterBody.trim(),
      updatedAt: new Date().toISOString(),
    };
  }
  if (aiTokenUsage != null) {
    next.aiTokenUsage = aiTokenUsage;
  }
  return next;
}

export function LetterChatPanel({ draft, onDraftMerged, onBackToDocuments }: Props) {
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
        const res = await fetch("/api/letter-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: uiMessages,
            draft: draftRef.current,
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          text?: string;
          letterBody?: string | null;
          aiTokenUsage?: WillAiTokenUsage;
          error?: string;
        };
        if (!res.ok) {
          setError(payload.error || `Kunde inte nå Will (HTTP ${res.status}).`);
          return null;
        }
        const merged = mergeLetterIntoDraft(draftRef.current, payload.letterBody ?? null, payload.aiTokenUsage);
        draftRef.current = merged;
        onDraftMerged(merged);
        return payload.text ?? null;
      } catch {
        setError("Nätverksfel. Kontrollera anslutningen och försök igen.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onDraftMerged]
  );

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

  const handleSaveAndLeave = () => {
    onBackToDocuments();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-4 flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="label-overline mb-2">Personligt brev</p>
          <h1 className="font-heading text-2xl font-semibold text-ink leading-tight md:text-3xl">
            Skriv ditt brev till de du håller kär
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4a5568]">
            Det här är inte juridik — bara dina ord. Will hjälper dig formulera.
          </p>
        </div>
        <button type="button" onClick={handleSaveAndLeave} className="btn-secondary shrink-0 text-sm py-2.5 px-4">
          Tillbaka till dokument
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col border border-[#e5e5e5] bg-[#fafafa]"
        style={{ borderRadius: "3px" }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex animate-fade-in-up ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              {msg.role === "assistant" ? (
                <div className="max-w-[95%]">
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-[#6b7280]">Will</p>
                  <div
                    className="border border-[#e5e5e5] bg-white px-4 py-3 text-sm leading-relaxed text-[#374151] shadow-sm whitespace-pre-wrap"
                    style={{ borderRadius: "3px" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  className="max-w-[85%] bg-[#1a2e4a] px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap"
                  style={{ borderRadius: "3px" }}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 px-1 text-sm text-[#6b7280]">
                           <span className="inline-flex gap-1">
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9ca3af]"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9ca3af]"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9ca3af]"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              <span>Will tänker…</span>
            </div>
          )}
          {error && (
            <p
              className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
              style={{ borderRadius: "3px" }}
            >
              {error}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-[#e5e5e5] bg-white px-4 py-3">
          {isListening && interimTranscript && (
            <p className="mb-2 text-xs italic text-[#6b7280]">{interimTranscript}</p>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleSaveAndLeave} className="text-xs text-[#1a2e4a] underline underline-offset-2">
              Spara och gå tillbaka till dokument
            </button>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv här…"
              disabled={isLoading}
              rows={2}
              className="min-h-[42px] flex-1 resize-none border border-[#e5e5e5] px-3 py-2.5 text-sm text-ink transition-colors focus:border-[#1a2e4a] focus:outline-none disabled:opacity-50"
              style={{ borderRadius: "3px" }}
            />
            <VoiceButton
              iconOnly
              isListening={isListening}
              isSupported={isSupported}
              onToggle={toggleListening}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary h-[42px] shrink-0 px-4 py-0 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Skicka
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
