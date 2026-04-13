import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SocialProof } from "@/components/landing/SocialProof";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import Link from "next/link";
import { PAYMENT_PRICES } from "@/lib/pricing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <SocialProof />
        <Pricing />
        <FAQ />

        {/* Final CTA */}
        <section className="py-24 px-6 bg-[#0e0e0e]">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[#6b7280] mb-6">
              Du kan göra det idag
            </p>
            <h2 className="font-heading text-3xl md:text-5xl font-semibold text-white leading-tight mb-6">
              Det tar femton minuter.<br />
              <span className="italic font-normal text-[#9ca3af]">
                Det håller i generationer.
              </span>
            </h2>
            <p className="text-[#9ca3af] mb-10 max-w-lg mx-auto text-sm leading-relaxed">
              Du betalar ingenting förrän du är redo att ladda ner ditt testamente.
              Börja nu, fortsätt när du vill.
            </p>
            <Link
              href="/app"
              className="inline-block bg-white text-ink text-sm font-medium px-8 py-4 hover:bg-[#f9f9f9] transition-colors"
              style={{ borderRadius: "3px" }}
            >
              Skriv ditt testamente nu — {PAYMENT_PRICES.will} kr
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
