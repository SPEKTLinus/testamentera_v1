"use client";

import { useState } from "react";

const faqs = [
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
    answer:
      "Livet förändras — och då kan testamentet behöva skrivas om. Ett nytt testamente som följer formkraven ersätter det gamla och ska undertecknas med två vittnen. Vi skickar påminnelser under de första 12 månaderna efter köpet så du får en chans att tänka till. Vid större ändringar kan det vara bra att rådgöra med jurist.",
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
];

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
          </div>

          <div className="divide-y divide-[#e5e5e5]">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
