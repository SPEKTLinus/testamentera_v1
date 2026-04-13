"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WillDraft, WillAiTokenUsage } from "@/lib/types";
import { LETTER_CHAT_MAX_AI_TURNS, letterChatTurnsRemaining } from "@/lib/pricing";
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
  /** Avsluta brev-samtal (samma som dokument-sidan) */
  onFinishLetterChat?: () => void;
}

function mergeLetterIntoDraft(
  draft: WillDraft,
  letterBody: string | null | undefined,
  aiTokenUsage?: WillAiTokenUsage,
  letterChatAssistantRounds?: number
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
  if (letterChatAssistantRounds !== undefined) {
    next.letterChatAssistantRounds = letterChatAssistantRounds;
  }
  return next;
}

export function LetterChatPanel({ draft, onDraftMerged, onFinishLetterChat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const letterBootstrapStarted = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
    continuous: true,
  });

  const runApi = useCallback(
    async (uiMessages: ChatMessage[]) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = draftRef.current.willAccessToken?.trim();
        const res = await fetch("/api/letter-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: uiMessages,
            draft: draftRef.current,
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          text?: string;
          letterBody?: string | null;
          aiTokenUsage?: WillAiTokenUsage;
          letterChatAssistantRounds?: number;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          setError(payload.error || `Kunde inte nå Will (HTTP ${res.status}).`);
          return null;
        }
        const merged = mergeLetterIntoDraft(
          draftRef.current,
          payload.letterBody ?? null,
          payload.aiTokenUsage,
          payload.letterChatAssistantRounds
        );
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
    if (letterBootstrapStarted.current) return;
    letterBootstrapStarted.current = true;
    let cancelled = false;
    (async () => {
      if (draftRef.current.personalLetterChatLocked) {
        setError("Brev-samtalet är avslutat.");
        return;
      }
      if (letterChatTurnsRemaining(draftRef.current) <= 0) {
        setError(
          "Du har använt alla svar som ingår i brev-köpet. Kontakta oss om du behöver fortsätta."
        );
        return;
      }
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

  const letterRemaining = letterChatTurnsRemaining(draft);
  const letterLocked = !!draft.personalLetterChatLocked;
  const atLetterLimit = letterRemaining <= 0;
  const letterHasBody = !!(draft.personalLetter?.body?.trim() ?? "");

  const handleSend = async () => {
    if (!input.trim() || isLoading || atLetterLimit || letterLocked) return;
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-4 flex-shrink-0">
        <p className="label-overline mb-2">Personligt brev</p>
        <h1 className="font-heading text-2xl font-semibold text-ink leading-tight md:text-3xl">
          Skriv ditt brev till de du håller kär
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#4a5568]">
          Det här är inte juridik. Will lyssnar och gör bara lätta språkjusteringar — din röst och dina ord ska synas.
        </p>
        <p className="mt-2 text-xs text-[#6b7280]">
          {letterLocked ? (
            <span className="text-amber-800">Brev-samtalet är avslutat.</span>
          ) : atLetterLimit ? (
            <span className="text-amber-800">
              Du har använt alla {LETTER_CHAT_MAX_AI_TURNS} svar som ingår i brev-köpet. Kontakta oss om du behöver mer.
            </span>
          ) : (
            <>
              Brev-paketet: <strong>{letterRemaining}</strong> svar från Will kvar (max {LETTER_CHAT_MAX_AI_TURNS} per köp,
              inkl. första hälsningen).
            </>
          )}
        </p>
        {letterHasBody && onFinishLetterChat && !letterLocked && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    "Avsluta brev-samtal? Du kan inte längre skicka meddelanden till Will. Texten och PDF sparas på dokument-sidan."
                  )
                ) {
                  return;
                }
                onFinishLetterChat();
              }}
              className="text-sm text-[#4a5568] underline underline-offset-2 hover:text-ink"
            >
              Jag är färdig — lås brevet och gå till dokumenten
            </button>
          </div>
        )}
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
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
                           placeholder={
                letterLocked
                  ? "Brev-samtalet är avslutat."
                  : atLetterLimit
                    ? "Gräns nådd — kontakta oss vid behov."
                    : "Skriv här…"
              }
              disabled={isLoading || atLetterLimit || letterLocked}
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
              disabled={!input.trim() || isLoading || atLetterLimit || letterLocked}
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
