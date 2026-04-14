type ChatMessage = { role: "user" | "assistant"; content: string };

const DEFAULT_MAX = 32;

export function getWillChatUiMessageCap(): number {
  const raw = process.env.WILL_CHAT_UI_MESSAGE_MAX?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 4) return Math.min(n, 200);
  }
  return DEFAULT_MAX;
}

/**
 * Skicka bara de sista N meddelandena till Anthropic. Fakta som redan sparats ligger i utkast-JSON;
 * hela chatthistoriken varje gång driver input-tokens och gör att sessionsgränsen nås i onödan.
 */
export function clipWillChatUiMessages(messages: ChatMessage[]): {
  clipped: ChatMessage[];
  didClip: boolean;
} {
  const cap = getWillChatUiMessageCap();
  if (messages.length <= cap) {
    return { clipped: messages, didClip: false };
  }
  return { clipped: messages.slice(-cap), didClip: true };
}
