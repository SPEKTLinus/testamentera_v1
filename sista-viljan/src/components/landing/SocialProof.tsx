const testimonials = [
  {
    quote:
      "Jag hade skjutit upp det i tre år. Gjorde det på lunchen. Tog 20 minuter och jag kände mig oerhört lättad efteråt.",
    author: "Karin S.",
    detail: "Sambo, två barn",
  },
  {
    quote:
      "Vi var gifta men hade särkullbarn från mina tidigare relationer. Det hade kunnat bli väldigt komplicerat. Nu är allt klart.",
    author: "Anders M.",
    detail: "Gift, tre barn varav ett särkullbarn",
  },
  {
    quote:
      "Jag visste inte ens att min sambo inte hade arvsrätt. Det var en chock. Nu har vi ordnat det.",
    author: "Sofia L.",
    detail: "Sambo sedan åtta år",
  },
];

export function SocialProof() {
  return (
    <section className="py-24 px-6 bg-[#f9f9f9] border-t border-[#e5e5e5]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
          <div>
            <p className="label-overline mb-4">Från våra användare</p>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-ink">
              De som redan gjort det.
            </h2>
          </div>
          <div className="mt-6 md:mt-0 text-sm text-[#6b7280]">
            Baserat på 2 400+ testamenten skrivna via Sista Viljan
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#e5e5e5]">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white p-8">
              <blockquote className="font-heading text-lg italic text-ink leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div>
                <p className="text-sm font-medium text-ink">{t.author}</p>
                <p className="text-xs text-[#6b7280] mt-1">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-px bg-[#e5e5e5]">
          {[
            { number: "97%", label: "upplever processen som enkel" },
            { number: "15 min", label: "genomsnittlig tid att slutföra" },
            { number: "100%", label: "juridiskt giltigt i Sverige" },
          ].map((stat, i) => (
            <div key={i} className="bg-white py-8 px-6 text-center">
              <div className="font-heading text-3xl font-semibold text-ink mb-2">
                {stat.number}
              </div>
              <p className="text-xs text-[#6b7280] uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
