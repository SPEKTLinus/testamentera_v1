/**
 * Will-chat före köp: begränsar långa sessioner (Anthropic input+output tokens) utan tekniska fel.
 * Efter betalning räknas inte sessionen upp.
 *
 * OBS: Gränsen följer API-tokens (faktisk kostnad), inte Unicode-"tecken" i chatten.
 */

const DEFAULT_MAX_SESSION_TOKENS = 105_000;
const DEFAULT_SOFT_FRACTION = 0.85;
const DEFAULT_STRONG_GUIDANCE_FRACTION = 0.95;

export function getWillChatSessionMaxTokens(): number {
  const raw = process.env.WILL_CHAT_SESSION_MAX_TOKENS?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  const legacy = process.env.WILL_CHAT_SESSION_TOKEN_BUDGET?.trim();
  if (legacy) {
    const n = parseInt(legacy, 10);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  return DEFAULT_MAX_SESSION_TOKENS;
}

function getSoftFraction(): number {
  const raw = process.env.WILL_CHAT_SESSION_SOFT_FRACTION?.trim();
  if (raw) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0.5 && n < 1) return n;
  }
  return DEFAULT_SOFT_FRACTION;
}

function getStrongGuidanceFraction(): number {
  const raw = process.env.WILL_CHAT_SESSION_STRONG_GUIDANCE_FRACTION?.trim();
  if (raw) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > getSoftFraction() && n <= 1) return n;
  }
  return DEFAULT_STRONG_GUIDANCE_FRACTION;
}

/** Hård stopp: ingen ny AI-tur när kumulativ session når detta (obetalt utkast). */
export function getWillChatSessionHardCap(): number {
  return getWillChatSessionMaxTokens();
}

export function getWillChatSessionSoftThreshold(): number {
  return Math.floor(getWillChatSessionMaxTokens() * getSoftFraction());
}

export function getWillChatSessionStrongGuidanceThreshold(): number {
  return Math.floor(getWillChatSessionMaxTokens() * getStrongGuidanceFraction());
}

/** @deprecated Använd getWillChatSessionStrongGuidanceThreshold; finns för bakåtkompabilitet. */
export function getWillChatSessionTokenBudget(): number {
  return getWillChatSessionStrongGuidanceThreshold();
}

/** Summan input+output tokens i will-chat för obetalt utkast (uppdateras server-side). */
export function nextWillChatSessionTotal(
  draft: { paid?: boolean; willChatSessionTokens?: number },
  inputDelta: number,
  outputDelta: number
): number {
  const prev = draft.willChatSessionTokens ?? 0;
  if (draft.paid) return prev;
  return prev + inputDelta + outputDelta;
}

/**
 * Extra systemtext till Claude — aldrig "du har slut på tokens"; styrs mot slutförande + jurist.
 */
export function buildWillChatSessionGuidanceAppendix(
  sessionTokensBeforeTurn: number,
  unpaid: boolean
): string {
  if (!unpaid) return "";

  const max = getWillChatSessionMaxTokens();
  const soft = getWillChatSessionSoftThreshold();
  const strong = getWillChatSessionStrongGuidanceThreshold();

  if (sessionTokensBeforeTurn >= max) {
    return "";
  }

  if (sessionTokensBeforeTurn >= strong) {
    return `

SESSION — LÄNGD INNAN KÖP (internt, visa aldrig fältnamn eller "tokens" för användaren)
Samtalet har passerat den ordinarie längd vi erbjuder innan köp. Det betyder INTE att något är fel — men:
- Håll synlig text **kort och fokuserad** (högst två–tre korta stycken).
- Om användaren driver en längre allmän juridisk diskussion: ge **högst en** kärnmening om du kan, sedan säg tydligt att **löpande rådgivning** passar bäst hos en **jurist** — tips: https://www.advokatsamfundet.se/hitta-advokat
- **Prioritera** att ställa nästa saknade fråga för testamentet/begravningsönskemål så de kan **slutföra och gå vidare** i tjänsten.
- Formulera dig varmt, inte avvisande — du hjälper dem att landa i verktyget, inte att känna sig avstängda.`;
  }

  if (sessionTokensBeforeTurn >= soft) {
    return `

SESSION — NÄRMAR SIG ORDINARIEGRÄNS INNAN KÖP (internt)
Börja **korta** svaren något. Om användaren fördjupar sig i ren juridisk teori: erkänn kort, hänvisa till jurist för helheten, och **led tillbaka** till vad som saknas i utkastet.`;
  }

  return "";
}

/** Fast, vänlig text om vi inte anropar AI längre (extrem längd). */
export function willChatSessionHardCapUserMessage(): string {
  return [
    "Vi har gått igenom väldigt mycket tillsammans — det märks att du tar detta på allvar.",
    "",
    "Den här tjänsten är till för att **samla in dina val** och hjälpa dig få dem i ordning till ett testamente, inte för långa löpande juridiska samtal. För sådana frågor rekommenderar vi att du bokar en jurist som kan se helheten — till exempel via https://www.advokatsamfundet.se/hitta-advokat",
    "",
    "Det du redan fyllt i finns kvar. **Gå vidare** med knappen nedan när du vill betala och få dina dokument, eller skriv ett sista kort meddelande om något konkret saknas i underlaget.",
  ].join("\n");
}
