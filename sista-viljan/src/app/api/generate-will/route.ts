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

const SYSTEM_PROMPT = `Du är en erfaren svensk jurist som specialiserar sig på familjerätt och arvsrätt. Din uppgift är att skriva formella testamentstexter på svenska baserat på information som användaren lämnat.

Skriv i ett formellt men läsbart juridiskt språk — inte stelt legalespråk, men korrekt och tydligt. Varje sektion ska vara ett sammanhållet stycke text som är juridiskt precist och täcker den relevanta informationen.

Du ska ENBART inkludera sektioner för information som faktiskt har angetts. Hitta inte på information som saknas.

Returnera ALLTID ett rent JSON-objekt utan markdown-formatering, kodblock eller förklarande text — bara JSON.`;

function buildUserPrompt(draft: WillDraft): string {
  const w = draft.wishes || {};
  const c = draft.circumstances || {};

  const familyStatusMap: Record<string, string> = {
    married: "gift",
    sambo: "sambo",
    single: "ogift och ensamstående",
    divorced: "skild",
    widowed: "änka/änkling",
  };

  const childrenStatusMap: Record<string, string> = {
    none: "inga barn",
    joint: "gemensamma barn med nuvarande partner",
    from_previous: "barn från tidigare relation (särkullbarn)",
    both: "både gemensamma barn och barn från tidigare relation",
  };

  const familyStatus = c.familyStatus ? familyStatusMap[c.familyStatus] ?? c.familyStatus : null;
  const childrenStatus = c.childrenStatus ? childrenStatusMap[c.childrenStatus] ?? c.childrenStatus : null;

  const lines: string[] = ["Skriv ett testamente på svenska baserat på följande information som personen lämnat:\n"];

  if (draft.testatorName || draft.testatorPersonalNumber || draft.testatorAddress) {
    const parts: string[] = [];
    if (draft.testatorName) parts.push(draft.testatorName);
    if (draft.testatorPersonalNumber) parts.push(`personnummer ${draft.testatorPersonalNumber}`);
    if (draft.testatorAddress) parts.push(draft.testatorAddress);
    lines.push(`Testator: ${parts.join(", ")}`);
  }

  if (familyStatus) lines.push(`Civilstånd: ${familyStatus}`);
  if (childrenStatus) lines.push(`Barn: ${childrenStatus}`);
  if (w.mainHeir) lines.push(`Arvinge: ${w.mainHeir}`);
  if (w.heirIsPrivateProperty !== undefined) lines.push(`Enskild egendom: ${w.heirIsPrivateProperty ? "ja" : "nej"}`);
  if (w.partnerCanStay !== undefined) lines.push(`Partner ska kunna bo kvar: ${w.partnerCanStay ? "ja" : "nej"}`);
  if (w.specificItems) lines.push(`Specifika gåvor: ${w.specificItems}`);
  if (w.charityName) {
    const charityLine = w.charityAmount
      ? `Välgörenhet: ${w.charityName}, belopp: ${w.charityAmount}`
      : `Välgörenhet: ${w.charityName}`;
    lines.push(charityLine);
  }
  if (w.executor) lines.push(`Testamentsexekutor: ${w.executor}`);

  lines.push(`
Returnera ENBART ett JSON-objekt i detta format (utan markdown):
{
  "sections": [
    { "title": "Fördelning av kvarlåtenskap", "text": "..." },
    { "title": "Enskild egendom", "text": "..." }
  ]
}

Inkludera bara sektioner för information som faktiskt angetts. Sektioner numreras automatiskt i renderingen. Använd alltid dessa titlar när relevant: "Fördelning av kvarlåtenskap", "Enskild egendom", "Nyttjanderätt till gemensam bostad", "Särkullbarn", "Legat", "Förvaltning av arv och testamentsexekutor", "Ersättningsregler", "Övriga villkor". Den sista sektionen ska alltid vara "Övriga villkor" med text om att detta testamente ersätter alla tidigare testamenten.`);

  return lines.join("\n");
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
      console.error("generate-will: ANTHROPIC_API_KEY saknas");
      return NextResponse.json(
        {
          error:
            "Servern är inte konfigurerad för AI. Lägg till ANTHROPIC_API_KEY i Vercel Environment Variables.",
          code: "MISSING_ANTHROPIC_KEY",
        },
        { status: 503 }
      );
    }

    const draft: WillDraft = await req.json();

    const budget = checkWillAiBudget(draft);
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: "TOKEN_LIMIT" }, { status: 429 });
    }

    const userPrompt = buildUserPrompt(draft);
    const maxTokens = capOutputBudget(draft, 4096);
    if (maxTokens <= 0) {
      return NextResponse.json(
        { error: "Inget utrymme kvar för testamentegenerering inom token-taket.", code: "TOKEN_LIMIT" },
        { status: 429 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const inTok = response.usage?.input_tokens ?? 0;
    const outTok = response.usage?.output_tokens ?? 0;
    const prevUsage = getWillAiUsage(draft);
    const newUsage = mergeUsage(prevUsage, inTok, outTok);

    if (newUsage.inputTokens > WILL_AI_MAX_INPUT_TOKENS || newUsage.outputTokens > WILL_AI_MAX_OUTPUT_TOKENS) {
      return NextResponse.json(
        {
          error: "Genereringen skulle överskrida maxgränsen för AI per testamente.",
          code: "TOKEN_LIMIT_EXCEEDED",
          aiTokenUsage: prevUsage,
        },
        { status: 429 }
      );
    }

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type from AI" }, { status: 500 });
    }

    const rawText = content.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let parsed: { sections: Array<{ title: string; text: string }> };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Claude response:", rawText);
      return NextResponse.json(
        { error: "AI returnerade ett ogiltigt svar. Försök igen.", aiTokenUsage: newUsage },
        { status: 422 }
      );
    }

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return NextResponse.json(
        { error: "AI-svaret saknade förväntad struktur. Försök igen.", aiTokenUsage: newUsage },
        { status: 422 }
      );
    }

    const generatedWill = {
      sections: parsed.sections,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ...generatedWill,
      aiTokenUsage: newUsage,
    });
  } catch (error: unknown) {
    console.error("generate-will API error:", error);
    const err = error as { status?: number };
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: "Ogiltig AI-nyckel.", code: "AUTH" }, { status: 503 });
    }
    return NextResponse.json(
      { error: "AI-tjänsten är inte tillgänglig just nu. Försök igen." },
      { status: 500 }
    );
  }
}
