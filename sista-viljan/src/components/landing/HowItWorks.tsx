import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Berätta om din situation",
    description:
      "Vi ställer enkla frågor om din familj, dina tillgångar och dina önskemål. Svaren anpassar testamentet efter dig och gör din bild tydlig för dem som stannar kvar. Det tar ungefär fem minuter.",
  },
  {
    number: "02",
    title: "Bestäm vem som får vad",
    description:
      "Du väljer vem som ärver, om arvet ska skyddas vid skilsmässa, och om något särskilt ska till en viss person. Tydliga besked minskar risken att någon känner sig överkörd eller utanför. Vi förklarar konsekvenserna löpande.",
  },
  {
    number: "03",
    title: "Ladda ner och skriv under",
    description:
      "Du får ett juridiskt giltigt testamente — klart att skriva ut. Vi guidar dig genom signeringen med vittnen. När det är gjort finns ditt besked på pränt, så ingen behöver gissa vad du menade.",
  },
];

export function HowItWorks() {
  return (
    <section id="hur-det-fungerar" className="py-24 px-6 border-t border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-16 lg:gap-24">
          <div>
            <p className="label-overline mb-4">Process</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-6">
              Tre steg.<br />Femton minuter.
            </h2>
            <p className="text-[#4a5568] text-sm leading-relaxed mb-8">
              Du gör dina önskemål skriftliga och juridiskt giltiga — så de du lämnar efter dig slipper tvista om vad du
              ville.
            </p>
            <Link href="/app" className="btn-primary text-sm">
              Kom igång nu
            </Link>
          </div>

          <div className="space-y-0 divide-y divide-[#e5e5e5]">
            {steps.map((step) => (
              <div key={step.number} className="py-8 grid grid-cols-[64px_1fr] gap-6">
                <div className="font-heading text-3xl font-normal text-[#e5e5e5] leading-none pt-1">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-[#4a5568] leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
