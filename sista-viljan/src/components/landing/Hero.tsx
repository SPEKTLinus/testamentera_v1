import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-40 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="label-overline mb-6">Tydlighet när du inte längre kan förklara</p>

        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-semibold text-ink leading-[1.08] tracking-tight mb-8">
          Din familj förtjänar<br />
          ett svar.<br />
          <span className="italic font-normal">Inte gissningar.</span>
        </h1>

        <div className="text-lg text-[#4a5568] max-w-xl leading-relaxed mb-12 space-y-4">
          <p>
            Många skjuter upp att skriva testamente – inte för att det är oviktigt, utan för att det sällan blir av i
            vardagen. Men ett testamente gör stor skillnad: det tydliggör dina önskemål och hjälper dina närstående att
            fokusera på varandra i stället för att hamna i osäkerhet eller konflikt.
          </p>
          <p>
            Hos Sista Viljan kan du enkelt få det på plats, tydligt och utan krångel. Och eftersom livet förändras, får
            du löpande påminnelser om att se över och uppdatera testamentet när det behövs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start mb-20">
          <Link href="/app" className="btn-primary">
            Skriv ditt testamente nu
          </Link>
          <Link href="#hur-det-fungerar" className="btn-secondary">
            Se hur det fungerar
          </Link>
        </div>

        <div className="border-t border-[#e5e5e5] pt-10">
          <p className="label-overline mb-4">Utan tydliga besked</p>
          <p className="text-sm text-[#4a5568] leading-relaxed max-w-2xl mb-8">
            Då bestämmer lagen — inte du. Olika nära kan dra olika slutsatser om vad du &ldquo;borde&rdquo; ha velat, och
            tvivel och osämja växer lätt när sorgen redan är tung. Nedan ser du några vanliga situationer där otydlighet
            blir extra känslig.
          </p>
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
