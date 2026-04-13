"use client";

import { useState } from "react";
import { SwishPayment } from "./SwishPayment";

interface StorageUpsellProps {
  draftId?: string;
  onAccepted: () => void;
  onDeclined: () => void;
}

export function StorageUpsell({ draftId, onAccepted, onDeclined }: StorageUpsellProps) {
  const [showPayment, setShowPayment] = useState(false);

  if (showPayment) {
    return (
      <div className="max-w-md w-full animate-fade-in-up">
        <p className="label-overline mb-4">Säker förvaring</p>
        <h2 className="font-heading text-2xl font-semibold mb-6 leading-tight">
          Förvaring i 5 år — 999 kr
        </h2>
        <SwishPayment
          product="storage"
          draftId={draftId}
          onPaid={onAccepted}
          onCancel={() => setShowPayment(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full animate-fade-in-up">
      <p className="label-overline mb-6">Ditt testamente är klart.</p>

      <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
        Ett sista steg,<br />
        <span className="italic font-normal">om du vill.</span>
      </h1>

      <p className="text-base text-[#4a5568] leading-relaxed mb-8 max-w-md">
        Vill du att vi förvarar ditt testamente säkert i 5 år? Dina nära vet alltid var de hittar det när det behövs.
      </p>

      <div className="border border-[#e5e5e5] p-6 mb-8">
        <ul className="space-y-4">
          {[
            {
              title: "Säker förvaring i 5 år",
              detail: "Ditt testamente lagras krypterat och säkert.",
            },
            {
              title: "Flera kontaktpersoner med åtkomst",
              detail: "Upp till 3 namngivna personer kan hämta dokumentet när det behövs.",
            },
            {
              title: "Årlig påminnelse",
              detail: "Vi påminner dig varje år att se över att allt fortfarande stämmer.",
            },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-4">
              <span className="w-4 h-4 border border-[#1a2e4a] flex-shrink-0 mt-0.5 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="#1a2e4a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-[#e5e5e5] mt-5 pt-5 flex items-baseline gap-2">
          <span className="font-heading text-3xl font-semibold">999</span>
          <span className="text-[#4a5568]">kr</span>
          <span className="text-xs text-[#6b7280] uppercase tracking-wide">engångsbetalning</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowPayment(true)}
          className="btn-primary"
        >
          Ja, förvara mitt testamente — 999 kr
        </button>
        <button
          onClick={onDeclined}
          className="text-sm text-[#6b7280] hover:text-ink transition-colors py-2 px-4"
        >
          Nej tack
        </button>
      </div>

      <p className="text-xs text-[#6b7280] mt-4 leading-relaxed">
        Du kan alltid aktivera förvaring senare från ditt konto.
      </p>
    </div>
  );
}
