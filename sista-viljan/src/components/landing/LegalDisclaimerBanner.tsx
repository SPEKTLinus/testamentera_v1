/**
 * Tydlig juridisk information på startsidan — minskar missförstånd om att Sista Viljan skulle vara juridisk rådgivning.
 */
export function LegalDisclaimerBanner() {
  return (
    <aside
      className="border-y border-[#1a2e4a]/15 bg-[#f4f6fb]"
      aria-label="Viktigt om tjänsten"
    >
      <div className="mx-auto max-w-6xl px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a2e4a] mb-2">
          Viktigt att veta innan du börjar
        </p>
        <p className="text-sm leading-relaxed text-[#374151] max-w-4xl">
          <strong className="font-semibold text-ink">Sista Viljan är ett verktyg</strong> som hjälper dig strukturera
          uppgifter och ta fram dokument utifrån det du anger — vi är{" "}
          <strong className="font-semibold text-ink">inte en juristbyrå</strong> och tillhandahåller{" "}
          <strong className="font-semibold text-ink">inte juridisk rådgivning</strong>. Chattguiden ersätter inte en
          advokat. Har du en <strong className="font-semibold text-ink">komplex situation</strong> (t.ex. särkullbarn,
          företag, tillgångar utomlands, ovanlig fördelning eller osäkerhet kring laglott) bör du låta en jurist granska
          helheten — till exempel via{" "}
          <a
            href="https://www.advokatsamfundet.se/hitta-advokat"
            className="text-[#1a2e4a] underline underline-offset-2 hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Advokatsamfundet — Hitta advokat
          </a>
          .
        </p>
      </div>
    </aside>
  );
}
