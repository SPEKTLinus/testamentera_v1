import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { WillDraft } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BOOTSTRAP_USER =
  "[Internt: Samtalet startar nu. Svara som assistent med en kort, varm hälsning (1–2 meningar) och ställ sedan din första fråga. Följ datainsamlingsordningen i systemprompten — börja med det som fortfarande saknas högst upp i listan.]";

const WILL_CHAT_SYSTEM = `Du leder ett strukturerat men mänskligt samtal på svenska för att samla in all information som behövs för att skriva ett testamente och ett personligt avsnitt om begravningsönskemål.

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draft = body.draft as WillDraft | undefined;
    const uiMessages = (body.messages || []) as ChatMessage[];

    if (!draft) {
      return NextResponse.json({ error: "Saknar utkast" }, { status: 400 });
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

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages: toAnthropicMessages(uiMessages) as Anthropic.MessageCreateParams["messages"],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    const { display, data } = stripExtracted(content.text);

    return NextResponse.json({
      text: display,
      extractedData: data,
    });
  } catch (error) {
    console.error("will-chat error:", error);
    return NextResponse.json({ error: "AI-tjänsten är inte tillgänglig just nu." }, { status: 500 });
  }
}
