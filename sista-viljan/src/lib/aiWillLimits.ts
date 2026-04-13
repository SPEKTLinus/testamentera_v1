import type { WillDraft } from "./types";

/**
 * Kumulativa tokens per utkast (intake-chatt + testamentegenerering + personligt brev).
 * Brevchatten skickar hela historiken + hela brevutkastet varje gång — input växer snabbt.
 */
export const WILL_AI_MAX_INPUT_TOKENS = 200_000;
export const WILL_AI_MAX_OUTPUT_TOKENS = 150_000;

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

export function mergeWillAiUsage(
  prev: WillAiTokenUsage,
  inputDelta: number,
  outputDelta: number
): WillAiTokenUsage {
  return {
    inputTokens: prev.inputTokens + inputDelta,
    outputTokens: prev.outputTokens + outputDelta,
  };
}

export type UsageAfterAnthropicResult =
  | { ok: true; aiTokenUsage: WillAiTokenUsage }
  | {
      ok: false;
      error: string;
      code: "TOKEN_LIMIT_EXCEEDED_INPUT" | "TOKEN_LIMIT_EXCEEDED_OUTPUT";
      aiTokenUsage: WillAiTokenUsage;
    };

/** Efter ett Anthropic-anrop: uppdatera kumulativ usage eller avvisa om tak överskrids. */
export function finalizeUsageAfterAnthropicTurn(
  prev: WillAiTokenUsage,
  inputDelta: number,
  outputDelta: number
): UsageAfterAnthropicResult {
  const next = mergeWillAiUsage(prev, inputDelta, outputDelta);
  if (next.inputTokens > WILL_AI_MAX_INPUT_TOKENS) {
    return {
      ok: false,
      code: "TOKEN_LIMIT_EXCEEDED_INPUT",
      error:
        "Konversationen har blivit för lång för den här sessionen: all text som skickas med (samtal + brevutkast) har nått en teknisk gräns. Det handlar inte om att ditt senaste meddelande är för långt. Kontakta oss om du behöver fortsätta, eller kopiera brevet och spara det säkert.",
      aiTokenUsage: prev,
    };
  }
  if (next.outputTokens > WILL_AI_MAX_OUTPUT_TOKENS) {
    return {
      ok: false,
      code: "TOKEN_LIMIT_EXCEEDED_OUTPUT",
      error:
        "Den samlade AI-användningen för det här utkastet har nått gränsen (alla Wills svar räknas ihop). Kontakta oss om du behöver mer utrymme.",
      aiTokenUsage: prev,
    };
  }
  return { ok: true, aiTokenUsage: next };
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
