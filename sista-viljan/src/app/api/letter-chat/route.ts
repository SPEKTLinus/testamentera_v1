import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { WillDraft } from "@/lib/types";
import {
  WILL_AI_MAX_INPUT_TOKENS,
  WILL_AI_MAX_OUTPUT_TOKENS,
  checkWillAiBudget,
  capOutputBudget,
  getWillAiUsage,
  type WillAiTokenUsage,
} from "@/lib/aiWillLimits";

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
  "[Internt: Brev-samtalet startar. Hälsa kort och varmt, förklara att du hjälper till att formulera ett personligt brev till nära (inte juridiskt). Ställ en första öppen fråga, t.ex. vad de vill att mottagarna ska känna eller minnas.]";

const LETTER_CHAT_SYSTEM = `Du heter Will och hjälper användaren att skriva ett personligt brev till sina nära — om livet, minnen, tacksamhet, humor, vad de vill förmedla efter att de är borta. Detta är INTE ett juridiskt testamente och ska inte innehålla arvsfördelning eller juridiska föreskrifter.

STIL
- Varm, respektfull, tydlig svenska. Korta svar med en eller två uppföljningsfrågor i taget.
- Hjälp till att formulera och strukturera; föreslå formuleringar när användaren fastnar.
- Förklara aldrig JSON eller tekniska detaljer.

Efter varje ditt svar: lägg ALLTID sist (dolt för användaren i praktiken):
<extracted_letter>
{ "body": "hela brevutkastet hittills på svenska, som sammanhängande text" }
</extracted_letter>
Uppdatera "body" till den fullständiga brevtexten du föreslår efter samtalet hittills —ersätt tidigare utkast, skriv inte bara tillägg om det blir otydligt. Om inget brev kan formuleras än: {"body":""}.

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

function mergeUsage(prev: WillAiTokenUsage, inputDelta: number, outputDelta: number): WillAiTokenUsage {
  return {
    inputTokens: prev.inputTokens + inputDelta,
    outputTokens: prev.outputTokens + outputDelta,
  };
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

    const maxTokens = capOutputBudget(draft, 2048);
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
    const newUsage = mergeUsage(prevUsage, inTok, outTok);

    if (newUsage.inputTokens > WILL_AI_MAX_INPUT_TOKENS || newUsage.outputTokens > WILL_AI_MAX_OUTPUT_TOKENS) {
      return NextResponse.json(
        {
          error: "Det här AI-svaret skulle överskrida maxgränsen. Försök med ett kortare meddelande.",
          code: "TOKEN_LIMIT_EXCEEDED",
          aiTokenUsage: prevUsage,
        },
        { status: 429 }
      );
    }

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Oväntat svar från AI" }, { status: 500 });
    }

    const { display, letterBody } = stripLetterExtract(content.text);

    return NextResponse.json({
      text: display,
      letterBody,
      aiTokenUsage: newUsage,
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
