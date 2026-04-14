/**
 * Will-chat före köp: begränsar långa sessioner (Anthropic input+output tokens) utan tekniska fel.
 * Efter betalning räknas inte sessionen upp.
 *
 * OBS: Gränsen följer API-tokens (faktisk kostnad), inte Unicode-"tecken" i chatten.
 */

const DEFAULT_MAX_SESSION_TOKENS = 100_000;
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

/** Fast, vänlig text om vi inte anropar AI längre (obetald sessionsgräns nådd). */
export function willChatSessionHardCapUserMessage(): string {
  return [
    "Du har nått **maxlängden** för det kostnadsfria testamentssamtalet (teknisk gräns innan köp).",
    "",
    "Det betyder **inte** att du skrev något fel — bara att varje obetald session har ett tak så att vi kan hålla tjänsten hållbar.",
    "",
    "Allt som redan sparats i ditt underlag (synligt i utkastet) finns kvar. Om ditt **senaste svar** inte hann registreras: skriv en **kort** radigen efter du gått vidare och betalat, eller komplettera på dokumentsteget.",
    "",
    "Vid **långa juridiska** frågor som kräver helhetsbedömning kan en jurist vara rätt — se https://www.advokatsamfundet.se/hitta-advokat",
    "",
    "Använd **Gå vidare** nedan när du vill betala och få dina dokument.",
  ].join("\n");
}
