import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-40 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="label-overline mb-6">Testamente online</p>

        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-semibold text-ink leading-[1.08] tracking-tight mb-8">
          Din familj förtjänar<br />
          ett svar.<br />
          <span className="italic font-normal">Inte gissningar.</span>
        </h1>

        <p className="text-lg text-[#4a5568] max-w-xl leading-relaxed mb-12">
          Varje år tvingas tusentals svenska familjer igenom ett arv som ingen ville ha.
          Inte för att de inte brydde sig — utan för att de aldrig hann skriva ner det.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-start mb-20">
          <Link href="/app" className="btn-primary">
            Skriv ditt testamente nu
          </Link>
          <Link href="#hur-det-fungerar" className="btn-secondary">
            Se hur det fungerar
          </Link>
        </div>

        <div className="border-t border-[#e5e5e5] pt-10">
          <p className="label-overline mb-6">Vad händer utan testamente?</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#e5e5e5]">
            <div className="py-6 md:py-0 md:pr-8">
              <div className="text-2xl font-heading font-semibold mb-2">Sambo?</div>
              <p className="text-sm text-[#4a5568] leading-relaxed">
                Din partner ärver ingenting. Arvet går till dina barn — eller dina föräldrar om ni inte har barn. Ingenting till den du lever med.
              </p>
            </div>
            <div className="py-6 md:py-0 md:px-8">
              <div className="text-2xl font-heading font-semibold mb-2">Särkullbarn?</div>
              <p className="text-sm text-[#4a5568] leading-relaxed">
                Dina barn från ett tidigare förhållande kan kräva ut sin laglott direkt. Din partner kan tvingas lämna hemmet.
              </p>
            </div>
            <div className="py-6 md:py-0 md:pl-8">
              <div className="text-2xl font-heading font-semibold mb-2">Inget barn?</div>
              <p className="text-sm text-[#4a5568] leading-relaxed">
                Utan barn ärver dina föräldrar. Är de borta går arvet till dina syskon. Dina egna önskemål saknar rättslig kraft.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
