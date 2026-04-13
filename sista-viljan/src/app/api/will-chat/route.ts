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
/** Höj vid behov på Vercel Pro (Hobby ~10 s kan ge timeout vid långsam AI). */
export const maxDuration = 60;

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key?.trim()) {
    throw new Error("MISSING_ANTHROPIC_KEY");
  }
  return new Anthropic({ apiKey: key });
}

const BOOTSTRAP_USER =
  "[Internt: Samtalet startar nu. Svara som assistent med en kort, varm hälsning (1–2 meningar) och ställ sedan din första fråga. Följ datainsamlingsordningen i systemprompten — börja med det som fortfarande saknas högst upp i listan.]";

const WILL_CHAT_SYSTEM = `Du heter Will och leder ett strukturerat men mänskligt samtal på svenska för att samla in all information som behövs för att skriva ett testamente och ett personligt avsnitt om begravningsönskemål. Presentera dig inte som "AI" eller "assistent" om det inte behövs — du är Will.

STIL
- Var varm, tydlig och kort. Ställ gärna en huvudfråga i taget; vid behov en kort följdfråga om svaret är oklart.
- Anpassa dig efter vad användaren redan sagt: om de nämner flera saker, bekräfta och plocka ut det som hör till nuvarande ämne.
- Förklara aldrig JSON eller tekniska detaljer. Visa inte råa fältnamn.

DATABAS (exakta enum-värden — använd dessa i JSON)
circumstances.willType: "own" | "joint"
circumstances.familyStatus: "married" | "sambo" | "single" | "divorced" | "widowed"
circumstances.childrenStatus: "none" | "joint" | "from_previous" | "both"
circumstances.assets: array av "residence" | "vacation_home" | "business" | "securities" | "none" (välj alla som passar; "none" ensamt om inget av det andra stämmer)
circumstances.outsideFamily: "person" | "charity" | "none"

wishes.heirIsPrivateProperty: boolean (om huvudarvtagaren ska få som enskild egendom)
wishes.partnerCanStay: boolean — bara relevant om användaren är gift/sambo OCH har särkullbarn eller både gemensamma och tidigare barn. Fråga annars inte.
wishes.charityName / wishes.charityAmount: om outsideFamily är "charity"

Personnummer ska normaliseras till formatet YYYYMMDD-XXXX när du sparar i JSON.

Ordning att fylla i (hoppa över det som redan finns i "Nuvarande utkast"):
1) testatorName, testatorPersonalNumber, testatorAddress
2) circumstances (alla fält)
3) wishes: mainHeir, heirIsPrivateProperty, specificItems (valfritt), partnerCanStay om relevant, charity om relevant, executor
4) funeralWishes: burialForm, ceremony, sedan övriga valfria (music, clothing, flowersOrCharity, charityName, speakers, location, personalMessage)

EXTRAHERING
Efter varje användarsvar: lägg ALLTID till ett block sist i svaret (användaren ska inte märka det mer än att du är smart):
<extracted_data>
{ "testatorName": "...", "circumstances": { ... }, "wishes": { ... }, "funeralWishes": { ... } }
</extracted_data>
Inkludera ENDAST fält du faktiskt kan fylla i från senaste svaret (partiell uppdatering). Använd exakta enum-strängar.
Om inget nytt går att utläsa: <extracted_data>{}</extracted_data>

När ALLT enligt listan är komplett i utkastet (efter din tolkning av senaste svaret), sätt i JSON: "intakeComplete": true (booleansk) tillsammans med sista fälten.`;

function stripExtracted(text: string): { display: string; data: Record<string, unknown> | null } {
  const extractedMatch = text.match(/<extracted_data>\s*([\s\S]*?)\s*<\/extracted_data>/);
  if (!extractedMatch) {
    return { display: text.trim(), data: null };
  }
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(extractedMatch[1]) as Record<string, unknown>;
  } catch {
    data = null;
  }
  const display = text.replace(/<extracted_data>[\s\S]*?<\/extracted_data>/, "").trim();
  return { display, data };
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
      console.error("will-chat: ANTHROPIC_API_KEY saknas");
      return NextResponse.json(
        {
          error:
            "Servern är inte konfigurerad för AI (saknar API-nyckel). Lägg till ANTHROPIC_API_KEY under Environment Variables i Vercel och deploya om.",
          code: "MISSING_ANTHROPIC_KEY",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const draft = body.draft as WillDraft | undefined;
    const uiMessages = (body.messages || []) as ChatMessage[];

    if (!draft) {
      return NextResponse.json({ error: "Saknar utkast" }, { status: 400 });
    }

    const budget = checkWillAiBudget(draft);
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: "TOKEN_LIMIT" }, { status: 429 });
    }

    const contextBlock = `Nuvarande utkast (JSON — använd detta för att se vad som redan är ifyllt och vad som saknas):\n${JSON.stringify(
      {
        testatorName: draft.testatorName,
        testatorPersonalNumber: draft.testatorPersonalNumber,
        testatorAddress: draft.testatorAddress,
        circumstances: draft.circumstances,
        wishes: draft.wishes,
        funeralWishes: draft.funeralWishes,
      },
      null,
      2
    )}`;

    const system = `${WILL_CHAT_SYSTEM}\n\n${contextBlock}`;

    const maxTokens = capOutputBudget(draft, 2048);
    if (maxTokens <= 0) {
      return NextResponse.json(
        {
          error: "Inget utrymme kvar för fler AI-svar inom taket för det här testamentet.",
          code: "TOKEN_LIMIT",
        },
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
          error: "Det här AI-svaret skulle överskrida maxgränsen för testamentet. Försök med ett kortare meddelande.",
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

    const { display, data } = stripExtracted(content.text);

    return NextResponse.json({
      text: display,
      extractedData: data,
      aiTokenUsage: newUsage,
    });
  } catch (error: unknown) {
    console.error("will-chat error:", error);
    const err = error as { status?: number; message?: string };
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json(
        { error: "AI-nyckeln är ogiltig eller saknar behörighet. Kontrollera ANTHROPIC_API_KEY.", code: "AUTH" },
        { status: 503 }
      );
    }
    if (err?.status === 429) {
      return NextResponse.json(
        { error: "AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund.", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error:
          "AI-tjänsten svarade inte som förväntat. Om felet kvarstår: kontrollera Vercel-loggar, ANTHROPIC_API_KEY och att projektet inte timeoutar (maxDuration).",
        code: "AI_ERROR",
      },
      { status: 500 }
    );
  }
}
