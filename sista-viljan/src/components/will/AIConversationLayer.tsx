"use client";

import { useState, useEffect, useRef } from "react";
import { useClaudeConversation } from "@/hooks/useClaudeConversation";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceButton } from "./VoiceButton";
import type { WillDraft } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIConversationLayerProps {
  draft: WillDraft;
  questionPrompt: string; // Instruction to Claude on what question to ask
  onExtractedData: (data: Record<string, unknown>) => void;
  onConfirmed: () => void; // Called when Claude confirms understanding and user is ready to proceed
  children?: React.ReactNode; // Fallback UI (original step component) shown alongside
}

export function AIConversationLayer({
  draft,
  questionPrompt,
  onExtractedData,
  onConfirmed,
}: AIConversationLayerProps) {
  const [input, setInput] = useState("");
  const [initiated, setInitiated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const context = {
    willType: draft.circumstances.willType,
    familyStatus: draft.circumstances.familyStatus,
    childrenStatus: draft.circumstances.childrenStatus,
    assets: draft.circumstances.assets,
  };

  const { messages, isLoading, error, sendMessage, sendSystemPrompt } =
    useClaudeConversation(context);

  const { isListening, isSupported, interimTranscript, toggleListening } =
    useVoiceInput({
      onTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
      continuous: true,
    });

  // Kick off with Claude formulating the question
  useEffect(() => {
    if (!initiated) {
      setInitiated(true);
      sendSystemPrompt(questionPrompt);
    }
  }, [initiated, questionPrompt, sendSystemPrompt]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");

    const response = await sendMessage(text);
    if (response?.extractedData) {
      onExtractedData(response.extractedData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirmed();
  };

  // Check if the last assistant message contains a confirmation prompt
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const looksLikeConfirmation =
    lastAssistant &&
    (lastAssistant.content.includes("Stämmer det?") ||
      lastAssistant.content.includes("Har jag förstått rätt?") ||
      lastAssistant.content.includes("Är det rätt?") ||
      lastAssistant.content.includes("Stämmer?"));

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#6b7280] text-sm">
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3" style={{ borderRadius: "3px" }}>
            {error}
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation button if Claude is confirming understanding */}
      {looksLikeConfirmation && !confirmed && !isLoading && (
        <div className="flex gap-3 mb-4 animate-fade-in-up">
          <button onClick={handleConfirm} className="btn-primary text-sm py-2.5 px-5">
            Ja, fortsätt
          </button>
          <button
            onClick={() => sendMessage("Nej, det stämmer inte riktigt.")}
            className="btn-secondary text-sm py-2.5 px-5"
          >
            Nej, rätta till
          </button>
        </div>
      )}

      {/* Input area */}
      {!confirmed && (
        <div className="border-t border-[#e5e5e5] pt-4">
          {isListening && interimTranscript && (
            <p className="text-xs text-[#6b7280] italic mb-2">{interimTranscript}</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv ditt svar..."
              disabled={isLoading}
              className="flex-1 border border-[#e5e5e5] px-4 py-3 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors disabled:opacity-50"
              style={{ borderRadius: "3px" }}
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary text-sm py-3 px-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Skicka
            </button>
          </div>
          <div className="mt-3">
            <VoiceButton
              isListening={isListening}
              isSupported={isSupported}
              onToggle={toggleListening}
              interimTranscript=""
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === "assistant") {
    return (
      <div className="animate-fade-in-up">
        <p className="text-sm text-[#4a5568] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-end animate-fade-in-up">
      <div
        className="bg-[#f9f9f9] border border-[#e5e5e5] px-4 py-3 text-sm text-ink max-w-xs"
        style={{ borderRadius: "3px" }}
      >
        {message.content}
      </div>
    </div>
  );
}
