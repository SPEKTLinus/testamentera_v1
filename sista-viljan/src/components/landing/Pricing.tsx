import Link from "next/link";
import { PAYMENT_PRICES, REMINDER_RECURRING_INTERVAL_MONTHS } from "@/lib/pricing";

const included = [
  "Juridiskt giltigt testamente enligt Ärvdabalken",
  "Anpassat för din exakta familjesituation",
  "Konsekvensanalys i realtid under processen",
  "Signeringsguide steg för steg",
  `E-postuppdateringar löpande — påminnelse var ${REMINDER_RECURRING_INTERVAL_MONTHS}:e månad att se över och uppdatera ditt testamente`,
];

export function Pricing() {
  return (
    <section id="pris" className="py-24 px-6 border-t border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <p className="label-overline mb-4">Pris</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-6">
              Ett pris.<br />Inga överraskningar.
            </h2>
            <p className="text-[#4a5568] text-sm leading-relaxed mb-8">
              En jurist kostar 3 000–8 000 kr för samma tjänst. Vi tar {PAYMENT_PRICES.will} kr — en gång. Inga
              prenumerationer. Du får löpande e-post med påminnelse ungefär var {REMINDER_RECURRING_INTERVAL_MONTHS}:e
              månad om att se över testamentet när livet förändras.
            </p>

            <div className="mb-10">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-heading text-5xl font-semibold text-ink">{PAYMENT_PRICES.will}</span>
                <span className="text-[#4a5568] text-lg">kr</span>
                <span className="text-xs text-[#6b7280] uppercase tracking-wide">engångsbetalning</span>
              </div>
              <p className="text-xs text-[#6b7280]">inkl. moms</p>
            </div>

            <Link href="/app" className="btn-primary inline-block mb-4">
              Skriv ditt testamente — {PAYMENT_PRICES.will} kr
            </Link>
            <p className="text-xs text-[#6b7280]">
              Du betalar inte förrän du är redo att ladda ner ditt dokument.
            </p>
          </div>

          <div>
            <p className="label-overline mb-6">Ingår i priset</p>
            <ul className="space-y-0 divide-y divide-[#e5e5e5]">
              {included.map((item, i) => (
                <li key={i} className="py-4 flex items-start gap-4">
                  <span className="w-4 h-4 border border-[#1a2e4a] flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4L3 6L7 2" stroke="#1a2e4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-sm text-ink">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 p-6 border border-[#e5e5e5]">
              <p className="text-sm text-[#4a5568] leading-relaxed">
                <span className="font-medium text-ink">Inbördes testamente med partner?</span><br />
                Samma pris täcker er båda om ni skriver testamente tillsammans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
