import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { WillDraft } from "@/lib/types";
import { LETTER_CHAT_MAX_AI_TURNS } from "@/lib/pricing";
import {
  checkWillAiBudget,
  capOutputBudget,
  finalizeUsageAfterAnthropicTurn,
  getWillAiUsage,
} from "@/lib/aiWillLimits";
import { assertAnthropicAccess } from "@/lib/assertAnthropicAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) {
    throw new Error("MISSING_ANTHROPIC_KEY");
  }
  return new Anthropic({ apiKey: key });
}

const BOOTSTRAP_USER =
  "[Internt: Brev-samtalet startar. Hälsa varmt och med lite substans (2–4 meningar): att du finns med dem, att brevet är deras röst, att ni kan ta det lugnt. Förklara kort att det inte är juridik. Led in med en öppnande fråga om känsla eller minne — inte ja/nej.]";

const LETTER_CHAT_SYSTEM = `Du heter Will och hjälper användaren att skriva ett personligt brev till sina nära — om livet, minnen, tacksamhet, humor, vad de vill förmedla efter att de är borta. Detta är INTE ett juridiskt testamente och ska inte innehålla arvsfördelning eller juridiska föreskrifter.

ANVÄNDARENS RÖST (viktigast)
- Du är mer korrektur och stöd än medförfattare. Behåll användarens ordval, ton, humor och känsla så långt det går.
- Gör bara lätta språkjusteringar: stavning, interpunktion, uppenbara grammatikfel, små klumpsamheter i meningsbyggnad. Gör texten tydlig utan att göra om den till din egen stil.
- Lägg inte in nya stycken, budskap eller känslor som användaren inte uttryckt. Om du föreslår en formulering i chatten: kort, som valfritt alternativ — inte en lång omskrivning som ersätter deras röst.
- Brevet kan bli mycket långt; det är okej. Sammanfoga det användaren sagt till ett sammanhängande utkast med minimal redigering.

STIL I CHATTEN
- Varm, respektfull, tydlig svenska. De har betalat för stöd — svaren ska kännas **närvarande och genomtänkta**, inte avhuggna. Bekräfta det de delat med lite tyngd (inte utfyllnad), ställ en eller två uppföljningsfrågor; undvik enbart enradarsvar om de just öppnat sig.
- Förklara aldrig JSON eller tekniska detaljer.

HJÄLP DEM ATT ÖPPNA SIG (frågor i chatten — inte i brevtexten)
- Din roll är också att varsamt leda samtalet med frågor som gör det lättare att minnas, känna och formulera. Ställ öppna frågor (inte ja/nej), en i taget eller två korta som hör ihop.
- Utgå från det de redan sagt: spegla kort, sedan en uppföljning som går djupare eller bredare. Undvik känslan av förhör eller terapispråk — mer som en trygg vän som undrar.
- Exempel på riktningar du kan växla mellan (formulera alltid själv, på svenska, anpassat till dem): ett konkret minne ni delat; något de är tacksamma för; något de hoppas mottagaren ska minnas; en vardagsdetalj som säger något om kärlek; något de skrattat åt tillsammans; vad de vill att mottagaren ska känna när de läser; något de önskar de sagt tidigare; stolthet eller ursäkt om det passar tonen de satt.
- Om de verkar känslomässigt trötta eller korta i svaren: lätta på tempot, en enklare fråga, eller bara bekräfta utan ny fråga.
- Frågorna ska aldrig ersätta deras ord i brevet — de tillhör bara chatten. I <extracted_letter> ska bara det de faktiskt uttryckt (plus dina lätta språkjusteringar) finnas.

ÄR DU FÄRDIG?
- Brev kan bli tusentals ord. Då och då — ungefär varannan eller var tredje gång du svarar efter att användaren skickat nytt innehåll, eller när brevet tydligt vuxit — ställ en kort, varm check-in: om de vill lägga till mer eller om det känns färdigt för dem (formulera med egna ord). Var inte påträngande; hoppa över om de nyss sagt att de vill fortsätta eller är mitt i en känslosam rant.
- Om de säger att de är klara: bekräfta kort och varmt.

Efter varje ditt svar: lägg ALLTID sist (dolt för användaren i praktiken):
<extracted_letter>
{ "body": "hela brevutkastet hittills på svenska, som sammanhängande text" }
</extracted_letter>
Uppdatera "body" till hela brevtexten efter samtalet hittills — i huvudsak användarens egna formuleringar med dina lätta språkjusteringar. Ersätt tidigare utkast med den nya helheten; gör inte bara ofullständiga tillägg om det blir otydligt. Om inget brev kan formuleras än: {"body":""}.

Om användaren uttryckligen är nöjd och vill avsluta kan du avsluta med en kort bekräftelse i synlig text; samma regel för extracted_letter gäller.`;

function stripLetterExtract(text: string): { display: string; letterBody: string | null } {
  const m = text.match(/<extracted_letter>\s*([\s\S]*?)\s*<\/extracted_letter>/);
  if (!m) {
    return { display: text.trim(), letterBody: null };
  }
  let letterBody: string | null = null;
  try {
    const parsed = JSON.parse(m[1]) as { body?: string };
    if (typeof parsed.body === "string") letterBody = parsed.body;
  } catch {
    letterBody = null;
  }
  const display = text.replace(/<extracted_letter>[\s\S]*?<\/extracted_letter>/, "").trim();
  return { display, letterBody };
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function toAnthropicMessages(uiMessages: ChatMessage[]): ChatMessage[] {
  if (uiMessages.length === 0) {
    return [{ role: "user", content: BOOTSTRAP_USER }];
  }
  const first = uiMessages[0];
  if (first.role === "assistant") {
    return [{ role: "user", content: BOOTSTRAP_USER }, ...uiMessages];
  }
  return uiMessages;
}

export async function POST(req: NextRequest) {
  try {
    let client: Anthropic;
    try {
      client = getAnthropic();
    } catch {
      console.error("letter-chat: ANTHROPIC_API_KEY saknas");
      return NextResponse.json(
        {
          error:
            "Servern är inte konfigurerad för AI. Lägg till ANTHROPIC_API_KEY under Environment Variables i Vercel.",
          code: "MISSING_ANTHROPIC_KEY",
        },
        { status: 503 }
      );
    }

    const json = await req.json();
    const draft = json.draft as WillDraft | undefined;
    const uiMessages = (json.messages || []) as ChatMessage[];

    if (!draft) {
      return NextResponse.json({ error: "Saknar utkast" }, { status: 400 });
    }

    const denied = assertAnthropicAccess(req, draft);
    if (denied) return denied;

    if (!draft.paidLetter) {
      return NextResponse.json(
        { error: "Personligt brev kräver köp av tilläggstjänsten.", code: "LETTER_NOT_PAID" },
        { status: 403 }
      );
    }

    if (draft.personalLetterChatLocked) {
      return NextResponse.json(
        {
          error: "Brev-samtalet är avslutat. Du kan inte skicka fler meddelanden.",
          code: "LETTER_CHAT_LOCKED",
        },
        { status: 403 }
      );
    }

    const letterRounds = draft.letterChatAssistantRounds ?? 0;
    if (letterRounds >= LETTER_CHAT_MAX_AI_TURNS) {
      return NextResponse.json(
        {
          error: `Du har nått maxgränsen för brev-samtalet (${LETTER_CHAT_MAX_AI_TURNS} svar från Will) som ingår i köpet. Kontakta oss om du behöver fortsätta.`,
          code: "LETTER_CHAT_LIMIT",
          letterChatAssistantRounds: letterRounds,
        },
        { status: 429 }
      );
    }

    const budget = checkWillAiBudget(draft);
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: "TOKEN_LIMIT" }, { status: 429 });
    }

    const contextBlock = `Bakgrund (använd som inspiration, inte som citatkrav):\n${JSON.stringify(
      {
        testatorName: draft.testatorName,
        funeralWishes: draft.funeralWishes,
        nuvarandeBrevutkast: draft.personalLetter?.body ?? "",
      },
      null,
      2
    )}`;

    const system = `${LETTER_CHAT_SYSTEM}\n\n${contextBlock}`;

    const maxTokens = capOutputBudget(draft, 8192);
    if (maxTokens <= 0) {
      return NextResponse.json(
        { error: "Inget utrymme kvar för fler AI-svar inom taket.", code: "TOKEN_LIMIT" },
        { status: 429 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: toAnthropicMessages(uiMessages) as Anthropic.MessageCreateParams["messages"],
    });

    const inTok = response.usage?.input_tokens ?? 0;
    const outTok = response.usage?.output_tokens ?? 0;
    const prevUsage = getWillAiUsage(draft);
    const usageCheck = finalizeUsageAfterAnthropicTurn(prevUsage, inTok, outTok);
    if (!usageCheck.ok) {
      return NextResponse.json(
        {
          error: usageCheck.error,
          code: usageCheck.code,
          aiTokenUsage: usageCheck.aiTokenUsage,
        },
        { status: 429 }
      );
    }
    const newUsage = usageCheck.aiTokenUsage;

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Oväntat svar från AI" }, { status: 500 });
    }

    const { display, letterBody } = stripLetterExtract(content.text);

    return NextResponse.json({
      text: display,
      letterBody,
      aiTokenUsage: newUsage,
      letterChatAssistantRounds: letterRounds + 1,
    });
  } catch (error: unknown) {
    console.error("letter-chat error:", error);
    const err = error as { status?: number };
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json(
        { error: "AI-nyckeln är ogiltig. Kontrollera ANTHROPIC_API_KEY.", code: "AUTH" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "AI-tjänsten svarade inte. Försök igen." }, { status: 500 });
  }
}
