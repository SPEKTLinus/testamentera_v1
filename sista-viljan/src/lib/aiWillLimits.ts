import type { WillDraft } from "./types";

/** Max kumulativa tokens per testamente (alla AI-anrop: chatt + generering). */
export const WILL_AI_MAX_INPUT_TOKENS = 50_000;
export const WILL_AI_MAX_OUTPUT_TOKENS = 50_000;

export type WillAiTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export function getWillAiUsage(draft: WillDraft): WillAiTokenUsage {
  return {
    inputTokens: draft.aiTokenUsage?.inputTokens ?? 0,
    outputTokens: draft.aiTokenUsage?.outputTokens ?? 0,
  };
}

export function checkWillAiBudget(draft: WillDraft): { ok: true } | { ok: false; message: string } {
  const u = getWillAiUsage(draft);
  if (u.inputTokens >= WILL_AI_MAX_INPUT_TOKENS) {
    return {
      ok: false,
      message:
        "Gränsen för AI-användning är nådd för det här testamentet (max antal inmatningstokens). Kontakta oss om du behöver hjälp.",
    };
  }
  if (u.outputTokens >= WILL_AI_MAX_OUTPUT_TOKENS) {
    return {
      ok: false,
      message:
        "Gränsen för AI-användning är nådd för det här testamentet (max antal svarstokens). Kontakta oss om du behöver hjälp.",
    };
  }
  return { ok: true };
}

/** max_tokens för nästa anrop — lämna utrymme inom output-taket (0 = inget utrymme). */
export function capOutputBudget(draft: WillDraft, preferredMax: number): number {
  const used = getWillAiUsage(draft).outputTokens;
  const remaining = WILL_AI_MAX_OUTPUT_TOKENS - used;
  if (remaining <= 0) return 0;
  return Math.min(preferredMax, remaining);
}
