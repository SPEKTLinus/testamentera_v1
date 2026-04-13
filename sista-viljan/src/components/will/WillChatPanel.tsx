"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { WillDraft, WillAiTokenUsage } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceButton } from "./VoiceButton";
import {
  mergeWillChatExtraction,
  isIntakeComplete,
  shouldShowIntakeContinueCta,
  getIntakeIncompleteSummaries,
} from "@/lib/willChatIntake";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

interface Props {
  draft: WillDraft;
  onDraftMerged: (merged: WillDraft) => void;
  onContinueFromIntake: () => void;
}

export function WillChatPanel({ draft, onDraftMerged, onContinueFromIntake }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);

  /** Synka före paint så första will-chat-anropet inte skickar utkast utan verifiedPhone (race med useEffect). */
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const intakeDone = isIntakeComplete(draft);
  const showContinueCta = shouldShowIntakeContinueCta(draft);
  const missingForPayment = getIntakeIncompleteSummaries(draft);
  const canProceedToPayment = intakeDone;

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
        const res = await fetch("/api/will-chat", {
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
          extractedData?: Record<string, unknown> | null;
          aiTokenUsage?: WillAiTokenUsage;
          error?: string;
        };
        if (!res.ok) {
          setError(
            payload.error ||
              `Kunde inte nå Will (HTTP ${res.status}). Kontrollera att ANTHROPIC_API_KEY finns i Vercel och deploya om.`
          );
          return null;
        }
        const mergedBase = mergeWillChatExtraction(
          draftRef.current,
          payload.extractedData ?? null
        );
        const merged: WillDraft =
          payload.aiTokenUsage != null
            ? { ...mergedBase, aiTokenUsage: payload.aiTokenUsage }
            : mergedBase;
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
    if (!draft.verifiedPhone?.trim()) return;

    let cancelled = false;
    (async () => {
      const text = await runApi([]);
      if (cancelled || !text) return;
      setMessages((prev) => (prev.length > 0 ? prev : [{ role: "assistant", content: text }]));
    })();
    return () => {
      cancelled = true;
    };
  }, [runApi, draft.verifiedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, intakeDone, showContinueCta]);

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

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-4 flex-shrink-0">
        <p className="label-overline mb-2">Ditt samtal</p>
        <h1 className="font-heading text-2xl font-semibold text-ink leading-tight md:text-3xl">
          Skriv ditt testamente tillsammans med Will
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border border-[#e5e5e5] bg-[#fafafa]"
        style={{ borderRadius: "3px" }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} />
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

        {showContinueCta && (
          <div
            className="flex-shrink-0 border-t border-[#1a2e4a] bg-[#f4f6fb] px-4 py-4"
            style={{ boxShadow: "0 -4px 12px rgba(15, 23, 42, 0.06)" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {intakeDone || draft.paid ? "Klart att gå vidare" : "Nästan klart"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#4a5568]">
                  {draft.paid
                    ? "Nästa steg är dina dokument och nedladdning."
                    : canProceedToPayment
                      ? "Nästa steg är betalning — därefter genereras ditt testamente. Du kan fortfarande skriva i chatten om du vill ändra något."
                      : "Alla uppgifter måste vara ifyllda enligt checklistan innan du kan betala. Skriv gärna mer i chatten eller komplettera i sidopanelen."}
                  {!intakeDone && draft.intakeMarkedComplete && (
                    <span className="mt-1 block text-xs text-[#6b7280]">
                      Will markerade samtalet som klart, men några fält saknas fortfarande i utkastet — se listan nedan.
                    </span>
                  )}
                </p>
                {!draft.paid && !canProceedToPayment && missingForPayment.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-[#4a5568]">
                    {missingForPayment.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={onContinueFromIntake}
                disabled={!draft.paid && !canProceedToPayment}
                className="btn-primary shrink-0 px-6 py-3 text-sm whitespace-nowrap disabled:pointer-events-none disabled:opacity-45"
              >
                {draft.paid ? "Öppna dokument" : "Gå vidare till betalning"}
              </button>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 border-t border-[#e5e5e5] bg-white px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ditt svar här…"
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

function ChatBubble({ role, content }: { role: Role; content: string }) {
  if (role === "assistant") {
    return (
      <div className="flex animate-fade-in-up justify-start">
        <div className="max-w-[95%]">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-[#6b7280]">Will</p>
          <div
            className="border border-[#e5e5e5] bg-white px-4 py-3 text-sm leading-relaxed text-[#374151] shadow-sm whitespace-pre-wrap"
            style={{ borderRadius: "3px" }}
          >
            {content}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex animate-fade-in-up justify-end">
      <div
        className="max-w-[85%] bg-[#1a2e4a] px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap"
        style={{ borderRadius: "3px" }}
      >
        {content}
      </div>
    </div>
  );
}
