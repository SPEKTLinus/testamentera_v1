import type { WillDraft } from "./types";

export interface WillSection {
  number: number;
  title: string;
  intro?: string;      // optional paragraph before a bullet list
  lines: string[];
  isBulletList?: boolean;
}

/** Build the numbered sections for the will based on draft data. */
export function buildWillSections(draft: WillDraft): WillSection[] {
  const w = draft.wishes || {};
  const c = draft.circumstances || {};
  const sections: WillSection[] = [];
  let num = 1;

  // 1. Fördelning av kvarlåtenskap — alltid med
  sections.push({
    number: num++,
    title: "Fördelning av kvarlåtenskap",
    lines: [
      w.mainHeir
        ? `Det är min yttersta vilja att ${w.mainHeir} erhåller min kvarlåtenskap. ` +
          `Fördelningen ska ske med iakttagande av bröstarvingarnas rätt till laglott ` +
          `enligt Ärvdabalken 7 kap. Saknas föreskriven arvinge träder dennes avkomlingar i dennes ställe.`
        : `Min kvarlåtenskap ska fördelas i enlighet med Ärvdabalkens bestämmelser, ` +
          `med iakttagande av bröstarvingarnas rätt till laglott.`,
    ],
  });

  // 2. Enskild egendom — om valt
  if (w.heirIsPrivateProperty) {
    sections.push({
      number: num++,
      title: "Enskild egendom",
      lines: [
        `Vad arvinge erhåller genom detta testamente ska utgöra dennes enskilda egendom ` +
        `och ska inte ingå i bodelning vid äktenskapsskillnad eller upplösning av ` +
        `samboförhållande. Avkastning av den enskilda egendomen ska likaså vara enskild egendom.`,
      ],
    });
  }

  // 3. Nyttjanderätt — om partnern ska kunna bo kvar
  if (w.partnerCanStay) {
    sections.push({
      number: num++,
      title: "Nyttjanderätt till gemensam bostad",
      lines: [
        `Jag förordnar att min efterlevande make/sambo ska äga rätt att under sin livstid ` +
        `nyttja vår gemensamma permanentbostad utan kostnad, oavsett vem som innehar ` +
        `äganderätten. Denna nyttjanderätt ska bestå även om bröstarvinge begär utfående ` +
        `av laglott. Nyttjanderätten upphör om min efterlevande make/sambo ingår nytt ` +
        `äktenskap eller varaktigt sammanbor med ny partner.`,
      ],
    });
  }

  // 4. Särkullbarn — om barn från tidigare relation
  if (c.childrenStatus === "from_previous" || c.childrenStatus === "both") {
    sections.push({
      number: num++,
      title: "Särkullbarn",
      lines: [
        `Mina särkullbarn äger rätt att omedelbart vid mitt frånfälle utfå sin laglott ur ` +
        `kvarlåtenskapen enligt Ärvdabalken 7 kap 1 §. Jag önskar att de, i den mån ` +
        `omständigheterna medger det, visar hänsyn till min efterlevande makes/sambos ` +
        `möjlighet att bo kvar i vår gemensamma bostad. Laglottens storlek ska beräknas ` +
        `på nettovärdet av kvarlåtenskapen efter avdrag för skulder.`,
      ],
    });
  }

  // 5. Legat — specifika gåvor
  const bullets: string[] = [];
  if (w.specificItems) {
    w.specificItems
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => bullets.push(s));
  }
  if (w.charityName) {
    bullets.push(
      `${w.charityAmount ? w.charityAmount : "Ett belopp"} tillfaller ${w.charityName}, ` +
      `att utbetalas ur den fria kvoten av kvarlåtenskapen inom sex månader från mitt frånfälle.`
    );
  }
  if (bullets.length > 0) {
    sections.push({
      number: num++,
      title: "Legat",
      intro:
        `Utöver ovanstående förordnar jag om följande specifika legat, vilka ska utgå ur ` +
        `kvarlåtenskapen innan slutlig fördelning äger rum:`,
      lines: bullets,
      isBulletList: true,
    });
  }

  // 6. Förvaltning av arv — om testamentsexekutor utsetts
  if (w.executor) {
    sections.push({
      number: num++,
      title: "Förvaltning av arv och testamentsexekutor",
      lines: [
        `Jag förordnar ${w.executor} som testamentsexekutor med uppdrag att förvalta boet ` +
        `och tillse att detta testamentes föreskrifter behörigen fullgörs. ` +
        `Testamentsexekutorn äger rätt att vidta samtliga åtgärder som erfordras för boutredningen. ` +
        `Arv som tillfaller arvinge som vid mitt frånfälle ej uppnått 25 års ålder ska förvaltas ` +
        `av testamentsexekutorn tills arvingen uppnår nämnda ålder, varefter arvet utbetalas jämte upplupen avkastning.`,
      ],
    });
  }

  // 7. Ersättningsregler — alltid med
  sections.push({
    number: num++,
    title: "Ersättningsregler",
    lines: [
      `Skulle arvinge som omnämns i detta testamente ha förverkat sin rätt till arv, ` +
      `förutleva mig eller av annan anledning ej kunna mottaga sin lott, ska dennes andel ` +
      `tillfalla dennes avkomlingar i lika delar per stirpes. Saknas avkomlingar ska andelen ` +
      `tillfalla övriga arvingar i enlighet med detta testamentes fördelningsgrunder.`,
    ],
  });

  // 8. Övriga villkor — alltid med
  sections.push({
    number: num++,
    title: "Övriga villkor",
    lines: [
      `Detta testamente upprättas i ett original. Samtliga tidigare av mig upprättade testamenten ` +
      `är härmed återkallade och ogiltigförklarade. Tolkning av detta testamente ska ske i ` +
      `enlighet med min yttersta vilja såsom den framgår av handlingens helhet.`,
    ],
  });

  return sections;
}
