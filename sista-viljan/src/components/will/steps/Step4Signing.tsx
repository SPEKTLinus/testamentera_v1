"use client";

import { useState } from "react";
import type { WillDraft } from "@/lib/types";
import { PAYMENT_PRICES } from "@/lib/pricing";

interface Props {
  elapsedMinutes: number;
  draft: WillDraft;
  /** Köp / öppna personligt brev (499 kr tillägg) */
  onOpenLetterFlow: () => void;
  onBackToDocuments?: () => void;
}

const CHECKLIST = [
  {
    id: "paper",
    text: "Ha testamentet på papper för underskrift",
    detail: "Ladda ner PDF från föregående steg och skriv ut om du behöver ett fysiskt exemplar.",
  },
  {
    id: "witnesses_found",
    text: "Hitta två vittnen",
    detail:
      "Grannar, kollegor eller vänner fungerar utmärkt. De behöver inte känna dig väl.",
  },
  {
    id: "witness_rules",
    text: "Kontrollera att vittnena uppfyller kraven",
    detail:
      "Minst 15 år gamla. Inte make/maka, sambo, barn, föräldrar eller syskon. Ärver inget i testamentet.",
  },
  {
    id: "sign_yourself",
    text: "Skriv under medan båda vittnena är i rummet",
    detail: "Båda vittnena måste vara fysiskt närvarande när du undertecknar.",
  },
  {
    id: "witnesses_sign",
    text: "Vittnena skriver under efter dig",
    detail: "De bekräftar att du undertecknat av fri vilja. De behöver inte läsa testamentet.",
  },
  {
    id: "store",
    text: "Förvara originalet säkert",
    detail:
      "Berätta för någon du litar på var det finns. Hos en advokat, i ett bankfack, eller i ett brandskyddat kassaskåp.",
  },
];

export function Step4Signing({ elapsedMinutes, draft, onOpenLetterFlow, onBackToDocuments }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setChecked(next);
  };

  const allDone = checked.size === CHECKLIST.length;

  return (
    <div>
      <div className="mb-10">
        <p className="label-overline mb-3">Sista steget</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Det tar fem minuter.
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Ditt testamente är juridiskt giltigt när du undertecknat det i närvaro av två vittnen. Inget annat krävs.
        </p>
      </div>

      <div className="space-y-0 divide-y divide-[#e5e5e5] mb-10">
        {CHECKLIST.map((item) => {
          const isDone = checked.has(item.id);
          return (
            <div
              key={item.id}
              className={`py-5 flex items-start gap-4 cursor-pointer group transition-colors ${isDone ? "opacity-60" : ""}`}
              onClick={() => toggle(item.id)}
            >
              <div
                className={`w-5 h-5 border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  isDone
                    ? "border-[#1a2e4a] bg-[#1a2e4a]"
                    : "border-[#e5e5e5] group-hover:border-[#1a2e4a]"
                }`}
                style={{ borderRadius: "2px" }}
              >
                {isDone && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDone ? "line-through text-[#9ca3af]" : "text-ink"}`}>
                  {item.text}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="border border-[#1a2e4a] p-6 animate-fade-in-up">
          <p className="font-heading text-xl font-semibold text-ink mb-2">
            Du har precis tagit hand om din familj.
          </p>
          <p className="text-sm text-[#4a5568]">
            Det tog {elapsedMinutes > 0 ? `${elapsedMinutes} minuter` : "en kort stund"}.
          </p>
        </div>
      )}

      {!draft.paidLetter && (
        <div className="mt-10 border border-[#e5e5e5] bg-[#f9fafb] p-6">
          <p className="label-overline mb-2">Tillägg</p>
          <p className="font-heading text-lg font-semibold text-ink mb-2">
            Vill du lägga till ett personligt brev?
          </p>
          <p className="text-sm text-[#4a5568] leading-relaxed mb-4 max-w-xl">
            Ett eget samtal med Will för ett brev till dina nära — om minnen, tacksamhet och det du vill förmedla. Juridiskt
            testamente och brev är <strong>två skilda köp</strong>: brevet kostar {PAYMENT_PRICES.letter} kr till.
          </p>
          <button type="button" onClick={onOpenLetterFlow} className="btn-primary text-sm py-2.5 px-5">
            Köp personligt brev ({PAYMENT_PRICES.letter} kr) →
          </button>
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-[#e5e5e5]">
        <p className="text-xs text-[#6b7280] leading-relaxed max-w-lg">
          Om något större förändras — nytt barn, ny bostad, ny relation — kan det vara dags att skriva ett nytt
          testamente som ersätter det gamla (med nya vittnen). Påminnelser under det första året ingår i ditt köp.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {onBackToDocuments && (
          <button type="button" onClick={onBackToDocuments} className="btn-primary text-sm">
            Tillbaka till dokumenten
          </button>
        )}
        <a href="/" className="btn-secondary text-sm inline-flex items-center justify-center">
          Tillbaka till startsidan
        </a>
      </div>
    </div>
  );
}
