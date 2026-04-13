"use client";

import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  text: string;
  extractedData: Record<string, unknown> | null;
}

export function useClaudeConversation(context?: Record<string, unknown>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userText: string): Promise<ClaudeResponse | null> => {
      setIsLoading(true);
      setError(null);

      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: userText },
      ];
      setMessages(newMessages);

      try {
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, context }),
        });

        if (!res.ok) throw new Error("API error");

        const data: ClaudeResponse = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text },
        ]);
        return data;
      } catch {
        setError("Kunde inte ansluta till AI-assistenten. Försök igen.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, context]
  );

  const sendSystemPrompt = useCallback(
    async (prompt: string): Promise<ClaudeResponse | null> => {
      setIsLoading(true);
      setError(null);

      // Send as a user message that requests Claude to formulate the question
      const bootstrapMessages: Message[] = [
        { role: "user", content: prompt },
      ];

      try {
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: bootstrapMessages, context }),
        });

        if (!res.ok) throw new Error("API error");

        const data: ClaudeResponse = await res.json();
        setMessages([
          { role: "user", content: prompt },
          { role: "assistant", content: data.text },
        ]);
        return data;
      } catch {
        setError("Kunde inte ansluta till AI-assistenten. Försök igen.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [context]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendSystemPrompt,
    reset,
  };
}
