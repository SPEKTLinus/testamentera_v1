import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { WillDraft } from "@/lib/types";
import {
  checkWillAiBudget,
  capOutputBudget,
  finalizeUsageAfterAnthropicTurn,
  getWillAiUsage,
} from "@/lib/aiWillLimits";
import { assertAnthropicAccess } from "@/lib/assertAnthropicAccess";
import {
  buildWillChatSessionGuidanceAppendix,
  getWillChatSessionHardCap,
  nextWillChatSessionTotal,
  willChatSessionHardCapUserMessage,
} from "@/lib/willChatSessionBudget";
import { clipWillChatUiMessages } from "@/lib/willChatMessages";

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

/** Första mötet — neutral, premium välkomst; inget val av "läge" i synlig text. */
const BOOTSTRAP_OPENING = `[Internt: Första mötet. Du är Will. Leverera en **utmärkt** välkomsthälsning på svenska som känns mänsklig och värdig — inte säljigt, inte robotaktigt.

Krav på öppningen:
- **3–5 meningar** med lugn värme och tyngd; visa att du förstår att detta är stort för personen.
- **Neutral ingång:** be dem INTE välja mellan "lägen", metoder eller tekniska alternativ. Nämn inte friform vs steg-för-steg.
- Bjud in till att börja **där det känns naturligt**: en tanke, en oro, en önskan, eller en längre berättelse om de föredrar det — allt är okej.
- **Max en** mjuk ingång i slutet (t.ex. vad som känns viktigast att få sagt först) — **ingen** lång punktlista med många frågor, ingen interrogation.
- Om utkast-JSON redan innehåller ifyllda fält: erkänn det kort ("jag ser att en del redan finns här") och bjud in att bygga vidare — fortfarande neutralt.
- Synlig text ska kunna stå ensam som en riktigt bra första kontakt.

extracted_data i detta första svar: bara om något går att utläsa från tom start — annars tom objekt {}.]`;

const BOOTSTRAP_RESUME_GUIDED = `[Internt: Användaren är tillbaka med utkast som redan innehåller uppgifter. Hälsa varmt men **kort** (2–3 meningar). Bekräfta i naturlig språk att du ser vad som redan står i underlaget. Ställ **en** tydlig, konkret fråga om nästa saknade punkt enligt beslutsträdet och utkast-JSON — ingen ny lång generisk välkomstceremoni.]`;

const BOOTSTRAP_FREEFORM_CONTINUE = `[Internt: Läget är friform. Användaren har precis valt / klassificerats till att berätta mer samlat. Om detta är första svaret efter klassificering: bekräfta kort, fyll extracted_data maximalt från hela användartexten, håll synlig uppföljning till **helst en** samlad fråga för luckor.]`;

const CONTINUE_PRIMER =
  "[Internt: Du är Will. Fortsätt samtalet utifrån historiken ovan och utkast-JSON. Följ instruktionerna — upprepa inte välkomst- eller öppningsinstruktioner.]";

const WILL_CHAT_SYSTEM = `Du heter Will och leder ett strukturerat men mänskligt samtal på svenska för att samla in all information som behövs för att skriva ett testamente samt begravningsönskemål (dessa används som underlag i tjänsten). Ett separat personligt brev till anhöriga är en egen tilläggstjänst — nämn det inte som del av detta samtal. Presentera dig inte som "AI" eller "assistent" om det inte behövs — du är Will.

STIL — SUBSTANS, INTE "SÅ KORT SOM MÖJLIGT"
- Användaren köper en seriös tjänst kring testamente och sista önskemål. De ska känna att de får **riktig vägledning**: tydlighet, omsorg och tempo — inte att svaren är avkortade för att spara ord.
- Var varm, lugn och **tydligt genomarbetad**. Det är okej med **flera korta stycken** när det hjälper: sammanfatta vad du hört, förklara kort vad ett val kan betyda i praktiken, sedan frågan. Undvik telegrafisk "chatbot-knapphet" som känns billig.
- Behåll struktur: oftast **en tydlig huvudfråga** per svar (ev. en kort, naturlig följdfråga om något är oklart). Du får **inte** fylla med tomma fraser — varje mening ska antingen förtydliga, lugna eller föra insamlingen framåt.
- När du introducerar ett nytt ämne eller ett juridiskt begrepp: ge **1–3 meningar** som sätter det i vardaglig kontext innan du frågar. När svaret är enkelt kan du svara lite kortare men fortfarande mänskligt och komplett.
- Bekräfta gärna kort vad som nu står klart i större drag ("då har vi …") så användaren ser att samtalet bygger något — inte bara en frågelista.
- Anpassa dig efter vad användaren redan sagt: om de nämner flera saker, bekräfta och plocka ut det som hör till nuvarande ämne.
- **Smart underlag:** När användaren har värdepapper (aktier/fonder) eller företag bland tillgångarna, ställ **konkreta följdfrågor** som behövs för ett tydligt utkast — t.ex. ungefärlig omfattning, bolag/fondnamn, om de menar hela innehavet eller något särskilt — utan att ge investerings- eller skatteråd. Vid tvekan: säg att en jurist bör granska detaljerna.
- Du **ersätter inte jurist**. Vid långa allmänna juridiska utläggningar: var kort, ärlig, och led tillbaka till insamling av fakta eller rekommendera jurist för helheten.
- Förklara aldrig JSON eller tekniska detaljer. Visa inte råa fältnamn.

MARKDOWN (synlig text till användaren)
- Använd **fetstil** bara för korta begrepp du förklarar (t.ex. **enskild egendom**), inte hela stycken.
- Var konsekvent: samma skrivning varje gång (enskild egendom / gemensam egendom — undvik att blanda versaler och små bokstäver godtyckligt).
- Vid uppräkning: antingen korta rader med **term** – förklaring, eller numrerade punkter; blanda inte stilar i samma svar.

JURIDISK TYDLIGHET — ARV, SÄRBOENDE OCH "DELNING"
- Arv träder i kraft när testatorn är **död**. Formulera dig därefter: skriv aldrig att arvtagaren vid separation skulle "dela arvet med dig (testatorn)" eller att du som avliden skulle vara part i en bodelning — det är feltänkt och förvirrar.
- När du jämför **enskild egendom** och **gemensam egendom** för en levande arvtagare: förklara att skillnaden handlar om hur tillgången kan påverkas **senare i arvtagarens liv** — t.ex. vid sambo/giftermål med **en ny** partner eller vid bodelning — inte om relationen med testatorn efter dennes död.
- Inled gärna med tidslinje: "När du har gått bort och [namn] har fått arvet …" innan du beskriver framtida scenarier.
- Om du märker att du uttryckt dig otydligt: rätta kort och tydligt utan att överösa medursäkter.

BESLUTSTRÄD (dynamiskt — fråga ALDRIG om något som redan finns i utkastet; hoppa över grenar som inte hör till personens situation)
A) **Testamentesform:** circumstances.willForm (sätts tillsammans med willType):
   - "individual" = testamente för en person → willType "own"
   - "joint_cohabitants" = gemensamt för sambor → willType "joint"
   - "joint_spouses" = gemensamt för makar → willType "joint"
B) **Tidigare testamenten:** previousWillsExist boolean. Om ja: förklara kort i chatten att detta testamente ersätter tidigare i sin helhet (ingen juridisk rådgivning).
C) **Barn:** circumstances.childrenStatus som idag. Om barn finns: samla **children** som array { "name": "...", "isSarkullbarn": true/false } för varje barn du kan identifiera. Fråga inte "vilket barn" om bara ett barn. Vid flera barn: förtydliga särkullbarn om relevant.
D) **Inga barn:** beneficiariesIfNoChildren: [ { "type": "person"|"organisation", "name": "...", "ifPredeceased": "their_legal_heirs"|"my_legal_heirs" } ] (en till några). Förklara vad som händer om testamentstagaren avlider före testatorn.
E) **Minst två barn:** inheritanceDistribution: "equal" | "least_to_one" | "most_to_one". Om "least_to_one" eller "most_to_one": distributionFocusChildName = aktuellt barns namn. Förklara **laglott** i enkel svenska (minst = barnet begränsas till laglott; mest = barnet får så mycket som möjligt inom laglottsreglerna).
F) **Enskild egendom:** wishes.heirIsPrivateProperty — samma sak som konkurrentens val; förklara innan ja/nej.
G) **Minderåriga arvingar:** minorBeneficiaries boolean. Om ja: förklara förmyndare vs särskild förvaltare; specialTrusteeWanted boolean; om true → specialTrusteeName.
H) **Begravning + övrigt** som tidigare (tillgångar, outsideFamily, executor, charity, funeralWishes).

Om användaren föreslår något som strider mot **laglott** eller är omöjligt: förklara kort och erbjud närmaste lagliga alternativ (t.ex. "minst möjligt" i stället för att utestå ett barn helt).

DATABAS (exakta enum-värden — använd dessa i JSON)
circumstances.willForm: "individual" | "joint_cohabitants" | "joint_spouses" (ange alltid tillsammans med rätt willType enligt A)
circumstances.willType: "own" | "joint" (måste stämma med willForm)
circumstances.familyStatus: "married" | "sambo" | "single" | "divorced" | "widowed"
circumstances.childrenStatus: "none" | "joint" | "from_previous" | "both"
circumstances.assets: array av "residence" | "vacation_home" | "business" | "securities" | "none" (välj alla som passar; "none" ensamt om inget av det andra stämmer)
circumstances.outsideFamily: "person" | "charity" | "none"
children: array av { "name": string, "isSarkullbarn": boolean } (endast när barn finns)
beneficiariesIfNoChildren: array när childrenStatus "none"
inheritanceDistribution / distributionFocusChildName: när minst två barn
previousWillsExist: boolean
minorBeneficiaries, specialTrusteeWanted, specialTrusteeName: enligt grenarna ovan

wishes.heirIsPrivateProperty: boolean (om huvudarvtagaren ska få som enskild egendom)
wishes.partnerCanStay: boolean — bara relevant om användaren är gift/sambo OCH har särkullbarn eller både gemensamma och tidigare barn. Fråga annars inte.
wishes.charityName / wishes.charityAmount: om outsideFamily är "charity"

funeralWishes.burialForm: "burial" | "cremation" | "no_preference"
funeralWishes.ceremony: "religious" | "civil" | "own"
 — religious om användaren vill ha kyrklig/traditionell gudstjänst, präst, eller uttryckligen begravning i kyrkan
 — civil vid borgerlig ceremoni
 — own vid tydligt personlig/egen ceremoni utan kyrklig eller borgerlig ordning
Vid fraser som "traditionell begravning i kyrkan": sätt minst ceremony till "religious"; burialForm oftast "burial" om det handlar om kista/jordbegravning (inte kremering).

Ordning att fylla i (hoppa över det som redan finns i "Nuvarande utkast"):
1) testatorName, testatorAddress — **fråga inte** efter personnummer; om användaren själv nämner det får du spara testatorPersonalNumber i YYYYMMDD-XXXX-format
2) willForm, previousWillsExist, circumstances (inkl. barngren / testamentstagare / fördelning / minderåriga enligt beslutsträdet)
3) wishes: mainHeir (kan härledas från children eller beneficiaries), heirIsPrivateProperty, specificItems (valfritt), partnerCanStay om relevant, charity om relevant, executor
4) funeralWishes: burialForm, ceremony, sedan övriga valfria (music, clothing, flowersOrCharity, charityName, speakers, location, personalMessage)

EXTRAHERING
Efter varje användarsvar: lägg ALLTID till ett block sist i svaret (användaren ska inte märka det mer än att du är smart):
<extracted_data>
{ "testatorName": "...", "circumstances": { ... }, "wishes": { ... }, "funeralWishes": { ... } }
</extracted_data>
Inkludera ENDAST fält du faktiskt kan fylla i från senaste svaret (partiell uppdatering). Använd exakta enum-strängar för alla kodade fält (bl.a. funeralWishes.burialForm och funeralWishes.ceremony — aldrig svenska ord där).
**Begravning / ceremoni:** Om användaren nämner musik, låtar, artister, tal, talare, blommor, välgörenhet, plats eller liknande — spara det **alltid** i lämpligt fält under funeralWishes (music, speakers, flowersOrCharity, charityName, location, personalMessage m.m.), även om tonen är lättsam eller skämtsam. Verkliga önskemål och skämt kan samexistera: få med användarens ord i fritextfälten så inget "glöms" i underlaget.
Om inget nytt går att utläsa: <extracted_data>{}</extracted_data>

När utkastet **ännu saknar** intakeStyle och användaren precis skrivit sitt **första** svar: du **måste** i samma svar sätta exakt en av:
  "intakeStyle": "freeform"  eller  "intakeStyle": "guided"
enligt tillägget KLASSIFICERING (det skickas med av servern när det behövs). Utan detta kan inte tjänsten anpassa sig.

När ALLT enligt listan är komplett i utkastet (efter din tolkning av senaste svaret), sätt i JSON: "intakeComplete": true (booleansk) tillsammans med sista fälten.
Om du i synlig text säger att insamlingen är klar / ni är färdiga: du MÅSTE i samma svar sätta "intakeComplete": true i <extracted_data>, annars kan användaren inte gå vidare.

LÄGE — FRIFORM (endast när utkastets intakeStyle är freeform)
- När användaren gett en samlad berättelse: tolka **hela** texten med utkast-JSON; fyll **extracted_data** med så mycket som möjligt i **ett** svar.
- I synlig text: kort bekräftelse (2–5 meningar), sedan **helst en samlad** uppföljningsfråga för luckor — undvik långa punktlistor direkt efter första långa inlägget.
- I senare varv: som vanligt enligt beslutsträdet.`;

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

type IntakePhase = "opening" | "auto" | "guided" | "freeform";

function countUserMessages(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

function hasDraftProgress(d: WillDraft): boolean {
  return !!(
    d.testatorName?.trim() ||
    d.testatorAddress?.trim() ||
    d.circumstances.willForm ||
    d.circumstances.willType ||
    d.wishes.mainHeir?.trim()
  );
}

function resolveIntakePhase(draft: WillDraft, clippedUi: ChatMessage[]): IntakePhase {
  if (draft.intakeStyle === "freeform") return "freeform";
  if (draft.intakeStyle === "guided") return "guided";
  if (countUserMessages(clippedUi) === 0) return "opening";
  return "auto";
}

function bootstrapUserMessageForEmptyThread(phase: IntakePhase, draft: WillDraft): string {
  if (phase === "opening") return BOOTSTRAP_OPENING;
  if (phase === "freeform") return BOOTSTRAP_FREEFORM_CONTINUE;
  if (phase === "guided" && hasDraftProgress(draft)) return BOOTSTRAP_RESUME_GUIDED;
  return BOOTSTRAP_OPENING;
}

function toAnthropicMessages(
  uiMessages: ChatMessage[],
  phase: IntakePhase,
  draft: WillDraft
): ChatMessage[] {
  if (uiMessages.length === 0) {
    return [{ role: "user", content: bootstrapUserMessageForEmptyThread(phase, draft) }];
  }
  const first = uiMessages[0];
  if (first.role === "assistant") {
    return [{ role: "user", content: CONTINUE_PRIMER }, ...uiMessages];
  }
  return uiMessages;
}

function buildPhaseSystemAppendix(phase: IntakePhase): string {
  const parts: string[] = [];
  if (phase === "opening") {
    parts.push(`
**Aktiv fas: ÖPPNING** — följ endast öppningsinstruktionen i det dolda användarmeddelandet. Ingen klassificering ännu.`);
  }
  if (phase === "auto") {
    parts.push(`
**KLASSIFICERING (internt)** — Utkastets intakeStyle saknas ännu. Användaren har skrivit sitt **första** svar. Tolka detta svar:
- Sätt **"intakeStyle": "freeform"** om de skriver utförligt, många detaljer, flera ämnesområden (arv, familj, begravning) i ett svep, längre berättande, eller uttryckligen vill få ur sig allt i en text.
- Sätt **"intakeStyle": "guided"** om svaret är kort, allmänt, vagt ("vet inte", "var börjar man"), bara hälsning, eller de uttryckligen vill ha ledning fråga för fråga.

Du **måste** inkludera exakt en av dessa strängar i <extracted_data>.

Därefter i **samma** svar:
- Om **freeform**: fyll övriga fält i extracted_data maximalt från **hela** användartexten; synlig text kort (2–5 meningar) + **helst en** samlad uppföljningsfråga för luckor (se LÄGE — FRIFORM).
- Om **guided**: extrahera vad som går från svaret; ställ **en** tydlig nästa fråga enligt beslutsträdet (första saknade punkt i ordningen).`);
  }
  if (phase === "freeform") {
    parts.push(`
**Aktivt läge:** FRIFORM — följ LÄGE — FRIFORM i instruktionerna ovan.`);
  }
  return parts.join("");
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

    const denied = assertAnthropicAccess(req, draft);
    if (denied) return denied;

    const budget = checkWillAiBudget(draft);
    if (!budget.ok) {
      return NextResponse.json({ error: budget.message, code: "TOKEN_LIMIT" }, { status: 429 });
    }

    const contextPayload = {
      testatorName: draft.testatorName,
      testatorPersonalNumber: draft.testatorPersonalNumber,
      testatorAddress: draft.testatorAddress,
      previousWillsExist: draft.previousWillsExist,
      circumstances: draft.circumstances,
      children: draft.children,
      beneficiariesIfNoChildren: draft.beneficiariesIfNoChildren,
      inheritanceDistribution: draft.inheritanceDistribution,
      distributionFocusChildName: draft.distributionFocusChildName,
      minorBeneficiaries: draft.minorBeneficiaries,
      specialTrusteeWanted: draft.specialTrusteeWanted,
      specialTrusteeName: draft.specialTrusteeName,
      wishes: draft.wishes,
      funeralWishes: draft.funeralWishes,
      intakeStyle: draft.intakeStyle ?? null,
      intakeStyleHint:
        draft.intakeStyle == null
          ? "Saknas tills första användarsvaret har klassificerats (guided = fråga för fråga; freeform = samla berättelse och fylla luckor effektivt)."
          : undefined,
      intakeMarkedComplete: draft.intakeMarkedComplete,
      intakeCompleteHint: draft.intakeMarkedComplete === true ? "Användaren har markerat insamling klar." : undefined,
    };

    const { clipped: clippedUi, didClip } = clipWillChatUiMessages(uiMessages);
    const phase = resolveIntakePhase(draft, clippedUi);

    let contextBlock = `Nuvarande utkast (JSON — använd detta för att se vad som redan är ifyllt och vad som saknas; det är sanningen om underlaget, inte chatthistoriken):\n${JSON.stringify(
      contextPayload,
      null,
      2
    )}`;
    if (didClip) {
      contextBlock += `\n\n(Internt: äldre chattmeddelanden skickas inte med i detta anrop för att spara utrymme — all redan registrerad fakta ska finnas i JSON ovan. Förlita dig på utkastet; fokusera på senaste användarsvaren i tråden.)`;
    }

    const unpaid = !draft.paid;
    const sessionBefore = draft.willChatSessionTokens ?? 0;
    const sessionGuidance = buildWillChatSessionGuidanceAppendix(sessionBefore, unpaid);
    const hardCap = getWillChatSessionHardCap();

    if (unpaid && sessionBefore >= hardCap) {
      return NextResponse.json({
        text: willChatSessionHardCapUserMessage(),
        extractedData: null,
        aiTokenUsage: getWillAiUsage(draft),
        willChatSessionTokens: sessionBefore,
        sessionCapReached: true,
      });
    }

    const system = `${WILL_CHAT_SYSTEM}${buildPhaseSystemAppendix(phase)}\n\n${contextBlock}${sessionGuidance}`;

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
      messages: toAnthropicMessages(clippedUi, phase, draft) as Anthropic.MessageCreateParams["messages"],
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
    const willChatSessionTokens = nextWillChatSessionTotal(draft, inTok, outTok);

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Oväntat svar från AI" }, { status: 500 });
    }

    const { display, data } = stripExtracted(content.text);

    let extractedData = data;
    if (
      phase === "auto" &&
      extractedData &&
      draft.intakeStyle == null &&
      extractedData.intakeStyle == null
    ) {
      const lastUser = [...clippedUi].reverse().find((m) => m.role === "user");
      const t = typeof lastUser?.content === "string" ? lastUser.content.trim() : "";
      const sentences = t.split(/[.!?]+\s+/).filter((s) => s.length > 0).length;
      const style: "freeform" | "guided" =
        t.length > 400 || sentences >= 4 ? "freeform" : "guided";
      extractedData = { ...extractedData, intakeStyle: style };
    }

    return NextResponse.json({
      text: display,
      extractedData,
      aiTokenUsage: newUsage,
      willChatSessionTokens,
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
