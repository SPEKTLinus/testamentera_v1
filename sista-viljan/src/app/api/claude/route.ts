import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du är en varm och kunnig assistent som hjälper svenska användare skriva sitt testamente. Svara alltid på svenska. Var direkt och mänsklig — aldrig juridisk eller formell. Förklara alltid konsekvenser i klartext. Bekräfta alltid vad du förstått innan du går vidare. Extrahera strukturerad JSON från varje svar men visa aldrig rå JSON för användaren. Håll svaren korta — det här är ett samtal, inte en uppsats.

När du extraherar strukturerad data från ett svar, inkludera det i slutet av ditt svar i ett speciellt block med exakt detta format:
<extracted_data>
{"key": "value"}
</extracted_data>

Användaren ser aldrig detta block — det används bara internt.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const systemWithContext = context
      ? `${SYSTEM_PROMPT}\n\nAnvändarens nuvarande situation:\n${JSON.stringify(context, null, 2)}`
      : SYSTEM_PROMPT;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemWithContext,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    // Extract structured data if present, strip it from displayed text
    const extractedMatch = content.text.match(/<extracted_data>\s*([\s\S]*?)\s*<\/extracted_data>/);
    let extractedData = null;
    let displayText = content.text;

    if (extractedMatch) {
      try {
        extractedData = JSON.parse(extractedMatch[1]);
      } catch {
        // Ignore parse errors
      }
      displayText = content.text.replace(/<extracted_data>[\s\S]*?<\/extracted_data>/, "").trim();
    }

    return NextResponse.json({
      text: displayText,
      extractedData,
    });
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json({ error: "AI-tjänsten är inte tillgänglig just nu." }, { status: 500 });
  }
}
