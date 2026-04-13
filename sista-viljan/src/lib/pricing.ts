import type { WillDraft } from "./types";

/** Swish amounts in SEK (incl. moms) */
export const PAYMENT_PRICES = {
  will: 499,
  letter: 499,
} as const;

/**
 * Max antal lyckade /api/letter-chat-svar per köpt brev (inkl. första hälsningen utan användartext).
 * Sänk t.ex. till 8 om du vill ~5–6 egna uppföljningar + marginal; höj vid behov.
 */
export const LETTER_CHAT_MAX_AI_TURNS = 52;

/** Kvarvarande AI-svar i brev-paketet (för copy i UI). */
export function letterChatTurnsRemaining(draft: WillDraft): number {
  const used = draft.letterChatAssistantRounds ?? 0;
  return Math.max(0, LETTER_CHAT_MAX_AI_TURNS - used);
}

/**
 * Månader mellan e-postpåminnelser om att se över / uppdatera testamentet.
 * Efter varje utskick schemaläggs nästa datum (löpande, ingår i köpet).
 */
export const REMINDER_RECURRING_INTERVAL_MONTHS = 12;

export type PaymentProductKey = keyof typeof PAYMENT_PRICES;
