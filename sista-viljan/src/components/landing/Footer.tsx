import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#e5e5e5] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div>
            <p className="font-heading text-lg font-semibold mb-3">Sista Viljan</p>
            <p className="text-sm text-[#6b7280] leading-relaxed max-w-xs">
              Vi hjälper dig sätta ord på vad du vill — så dina nära slipper gissa och bråka när du inte längre kan förklara
              själv.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#6b7280] mb-4">Tjänst</p>
            <ul className="space-y-2">
              {["Hur det fungerar", "Pris", "Vanliga frågor"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#4a5568] hover:text-ink transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#6b7280] mb-4">Juridiskt</p>
            <ul className="space-y-2">
              {["Integritetspolicy", "Användarvillkor", "Cookie-policy"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-[#4a5568] hover:text-ink transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#e5e5e5] pt-8 space-y-3">
          <p className="text-xs text-[#9ca3af] leading-relaxed max-w-3xl">
            Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning. Vid komplicerade situationer rekommenderar vi kontakt med jurist.
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-xs text-[#9ca3af]">
              &copy; 2025 Sista Viljan AB. Org.nr 559XXX-XXXX. Storgatan 1, 111 23 Stockholm.
            </p>
            <Link href="/account" className="text-xs text-[#9ca3af] hover:text-ink transition-colors">
              Mitt konto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
