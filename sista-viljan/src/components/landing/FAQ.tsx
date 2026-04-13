"use client";

import { useState } from "react";
import { REMINDER_RECURRING_INTERVAL_MONTHS } from "@/lib/pricing";

type FaqItem = { question: string; answer: string };

type FaqGroup = { heading: string; intro?: string; items: FaqItem[] };

const faqGroups: FaqGroup[] = [
  {
    heading: "Sambo, barn och arv",
    intro:
      "Många tror att partner och barn “ärver som man tänker sig”. I verket är lagreglerna strikta — därför är det vanligt med frågor om sambo, barn utanför äktenskapet och nya familjekonstellationer.",
    items: [
      {
        question: "Arver min sambo mig automatiskt?",
        answer:
          "Nej. I Sverige ärver inte sambor varandra enligt lag på samma sätt som makar. Utan testamente går ditt arv till dina barn — eller, om du inte har barn, i första hand till dina föräldrar och i vissa fall vidare till syskon m.m. Din sambo står alltså inte i turordningen som make/maka gör. Vill du att din partner ska få en del av kvarlåtenskapen (bostad, sparpengar, lösöre) måste det stå i ett testamente. Många sambopar skriver dessutom ett inbördes testamente så att bådas önskemål blir tydliga och skriftliga.",
      },
      {
        question: "Jag har inga barn — behöver jag ändå testamente?",
        answer:
          "Ofta ja, särskilt om du vill styra vem som får vad. Utan barn ärver närmast dina föräldrar enligt lag; är de borta kan arvet gå till syskon eller andra släktingar i en bestämd ordning. Som sambo ärver inte din partner dig automatiskt. I ett testamente kan du i stället tydligt ange till exempel partner, vänner eller välgörenhet — och minska risken att någon nära står utanför det du egentligen ville.",
      },
      {
        question: "Jag lever utan partner — spelar testamente roll?",
        answer:
          "Ja. Lagen pekar ut en arvsordning bland släktingar. Vill du fördela annorlunda mellan syskon, ge till någon som inte står i tur, eller undvika att arvet bara “rullar vidare” på ett sätt du inte hade valt, behöver det framgå av testamente. Det gör också läget enklare för efterlevande: färre tolkningsfrågor och mindre risk för osämja när allt redan står på pränt.",
      },
      {
        question: "Jag har barn med någon annan och ny partner — vad ska jag tänka på?",
        answer:
          "Barn du inte har gemensamt med din nuvarande partner (så kallade särkullbarn) har enligt lag rätt till laglott — en skyddad del av arvet — och i vissa situationer kan utbetalning av arv påverka hur den efterlevande partnern kan bo kvar eller disponera tillgångar. Utan tydlig plan blir det lätt känsligt: partner och barn kan uppleva olika “sanningar” om vad som är rimligt. Ett testamente kan inom lagens ramar tydliggöra fördelning, skydd och vilja, så att både barn och partner inte behöver gissa vad du menade.",
      },
    ],
  },
  {
    heading: "Om testamentet och tjänsten",
    items: [
      {
        question: "Är testamentet juridiskt giltigt?",
        answer:
          "Ja. Testamentet uppfyller alla formkrav i Ärvdabalken 10 kap. Det enda du behöver göra är att skriva under i närvaro av två vittnen — vilket vi guidar dig igenom. Dokumentet är lika giltigt som ett skrivet av en jurist.",
      },
      {
        question: "Måste jag anlita en jurist?",
        answer:
          "Nej. Svenska testamenten kräver inte att en jurist är inblandad. Det enda formkravet är att du skriver under dokumentet i närvaro av två vittnen som inte är närstående och inte ärver något i testamentet. Det är allt.",
      },
      {
        question: "Vad är vittnen och hur hittar jag dem?",
        answer:
          "Vittnen är personer som bekräftar att du undertecknat testamentet av fri vilja. De behöver vara minst 15 år gamla, inte vara närstående till dig (make, sambo, barn, föräldrar, syskon) och inte ärva något i testamentet. Grannar, kollegor eller vänner fungerar utmärkt. De behöver inte läsa testamentet — bara närvara när du skriver under.",
      },
      {
        question: "Vad händer om jag vill ändra testamentet senare?",
        answer: `Livet förändras — och då kan testamentet behöva skrivas om. Ett nytt testamente som följer formkraven ersätter det gamla och ska undertecknas med två vittnen. Som en del av köpet skickar vi löpande e-post med ungefär ${REMINDER_RECURRING_INTERVAL_MONTHS} månaders mellanrum, så du får en påminnelse om att se över om något har ändrats. Vid större ändringar kan det vara bra att rådgöra med jurist.`,
      },
      {
        question: "Vad är skillnaden mellan ett eget testamente och ett inbördes testamente?",
        answer:
          "Ett eget testamente är ditt personliga dokument med dina önskemål. Ett inbördes testamente skriver ni tillsammans som par och reglerar vad som händer när en av er går bort — vanligtvis att den kvarlevande ärver allt. Båda är juridiskt giltiga och kostar samma hos oss.",
      },
      {
        question: "Vad är laglott och kan jag testamentera bort den?",
        answer:
          "Laglott är den del av arvet som dina bröstarvingar (barn) alltid har rätt till — det är hälften av deras arvslott. Du kan aldrig testamentera bort laglotten. Vad du kan göra är att bestämma hur resten — den fria kvoten — ska fördelas, och under vilka villkor.",
      },
      {
        question: "Är mina uppgifter säkra?",
        answer:
          "Ja. Alla uppgifter lagras krypterat. Vi säljer aldrig personuppgifter till tredje part. Du kan när som helst begära att ditt konto och alla dina data raderas.",
      },
      {
        question: "Kan jag börja och fortsätta senare?",
        answer:
          "Absolut. Vi sparar automatiskt efter varje svar. Du kan stänga webbläsaren och fortsätta exakt där du slutade — från vilken enhet som helst.",
      },
    ],
  },
];

function flatIndex(groups: FaqGroup[], groupIndex: number, itemIndex: number): number {
  let n = 0;
  for (let g = 0; g < groupIndex; g++) n += groups[g].items.length;
  return n + itemIndex;
}

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="fragor" className="py-24 px-6 border-t border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16 lg:gap-24">
          <div>
            <p className="label-overline mb-4">Vanliga frågor</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight">
              Svar på det du<br />undrar över.
            </h2>
            <p className="text-[#4a5568] text-sm leading-relaxed mt-6">
              Tydliga besked om sambo, barn och arv — och om hur testamentet fungerar hos oss.
            </p>
          </div>

          <div>
            {faqGroups.map((group, groupIndex) => (
              <div key={group.heading} className={groupIndex > 0 ? "mt-16 pt-16 border-t border-[#e5e5e5]" : ""}>
                <h3 className="font-heading text-xl font-semibold text-ink mb-2">{group.heading}</h3>
                {group.intro && (
                  <p className="text-sm text-[#4a5568] leading-relaxed mb-6 max-w-2xl">{group.intro}</p>
                )}
                <div className="divide-y divide-[#e5e5e5]">
                  {group.items.map((faq, itemIndex) => {
                    const i = flatIndex(faqGroups, groupIndex, itemIndex);
                    return (
                      <div key={faq.question}>
                        <button
                          type="button"
                          onClick={() => setOpen(open === i ? null : i)}
                          className="w-full py-6 flex items-start justify-between gap-6 text-left"
                        >
                          <span className="font-heading text-lg font-medium text-ink leading-snug">
                            {faq.question}
                          </span>
                          <span className="flex-shrink-0 mt-1">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              className={`transition-transform duration-200 ${open === i ? "rotate-45" : ""}`}
                            >
                              <path
                                d="M8 3V13M3 8H13"
                                stroke="#0e0e0e"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        </button>
                        {open === i && (
                          <div className="pb-6 animate-fade-in-up">
                            <p className="text-sm text-[#4a5568] leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
