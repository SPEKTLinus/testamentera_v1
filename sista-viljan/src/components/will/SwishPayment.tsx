"use client";

import { useState, useEffect, useRef } from "react";
import type { PaymentProduct } from "@/lib/types";
import { PAYMENT_PRICES } from "@/lib/pricing";
import { formatPhoneDisplayFromE164 } from "@/lib/phone";

interface SwishPaymentProps {
  product: PaymentProduct;
  draftId?: string;
  /** E.164 digits without + — prefills Swish payer field; user can still edit */
  initialPhoneE164?: string;
  onPaid: () => void;
  onCancel?: () => void;
}

const PRICES: Record<PaymentProduct, number> = { ...PAYMENT_PRICES };

const PRODUCT_LABELS: Record<PaymentProduct, string> = {
  will: "Testamente",
};

type Stage = "phone" | "waiting" | "paid" | "declined" | "error";

export function SwishPayment({ product, draftId, initialPhoneE164, onPaid, onCancel }: SwishPaymentProps) {
  const [phone, setPhone] = useState(() =>
    initialPhoneE164 ? formatPhoneDisplayFromE164(initialPhoneE164) : ""
  );
  const [stage, setStage] = useState<Stage>("phone");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollCount = useRef(0);

  const price = PRICES[product];

  useEffect(() => {
    if (initialPhoneE164) {
      setPhone(formatPhoneDisplayFromE164(initialPhoneE164));
    }
  }, [initialPhoneE164]);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    const res = await fetch("/api/swish/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: phone.replace(/\D/g, ""),
        product,
        draftId,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error || "Något gick fel. Försök igen.");
      return;
    }

    setPaymentId(data.paymentId);
    setIsDemo(!!data.demo);
    setStage("waiting");
  };

  // Poll for payment status
  useEffect(() => {
    if (stage !== "waiting" || !paymentId) return;

    pollCount.current = 0;

    const poll = async () => {
      pollCount.current++;
      // Timeout after ~3 minutes (36 polls × 5s)
      if (pollCount.current > 36) {
        setStage("error");
        setErrorMsg("Betalningen tog för lång tid. Försök igen.");
        return;
      }

      const params = new URLSearchParams({ id: paymentId });
      if (isDemo) params.set("demo", "true");

      const res = await fetch(`/api/swish/status?${params}`);
      const data = await res.json();

      if (data.status === "PAID") {
        setStage("paid");
        if (pollRef.current) clearInterval(pollRef.current);
        // Small delay for UX
        setTimeout(onPaid, 1200);
      } else if (data.status === "DECLINED" || data.status === "CANCELLED") {
        setStage("declined");
        if (pollRef.current) clearInterval(pollRef.current);
      } else if (data.status === "ERROR") {
        setStage("error");
        setErrorMsg("Betalningen misslyckades. Försök igen.");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    pollRef.current = setInterval(poll, isDemo ? 3000 : 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stage, paymentId, isDemo, onPaid]);

  return (
    <div className="space-y-6">
      {/* Product summary */}
      <div className="border border-[#e5e5e5] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-1">Betalning</p>
            <p className="font-heading text-lg font-semibold">{PRODUCT_LABELS[product]}</p>
          </div>
          <div className="text-right">
            <span className="font-heading text-2xl font-semibold">{price}</span>
            <span className="text-[#4a5568] ml-1">kr</span>
            <p className="text-xs text-[#6b7280] mt-0.5">inkl. moms</p>
          </div>
        </div>
      </div>

      {/* Stage: phone entry */}
      {stage === "phone" && (
        <div className="animate-fade-in-up space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Ditt mobilnummer
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="070-123 45 67"
              maxLength={13}
              className="w-full border border-[#e5e5e5] px-4 py-3 text-base text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors"
              style={{ borderRadius: "3px" }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {errorMsg && (
              <p className="text-sm text-red-600 mt-2">{errorMsg}</p>
            )}
          </div>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Du får en betalningsbegäran i Swish-appen. Engångsbetalning — inga prenumerationer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={phone.replace(/\D/g, "").length < 10}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <SwishIcon />
              Betala med Swish
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary">
                Avbryt
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage: waiting for Swish confirmation */}
      {stage === "waiting" && (
        <div className="animate-fade-in-up text-center py-8 space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 border-2 border-[#e5e5e5] border-t-[#1a2e4a] rounded-full animate-spin" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold mb-2">
              Öppna Swish-appen
            </p>
            <p className="text-sm text-[#4a5568] leading-relaxed max-w-xs mx-auto">
              En betalningsbegäran på {price} kr har skickats till{" "}
              <strong>{phone}</strong>. Bekräfta i din Swish-app.
            </p>
          </div>
          <button
            onClick={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              setStage("phone");
              setPaymentId(null);
            }}
            className="text-xs text-[#6b7280] underline underline-offset-2"
          >
            Fel nummer? Börja om
          </button>
        </div>
      )}

      {/* Stage: paid */}
      {stage === "paid" && (
        <div className="animate-fade-in-up text-center py-8 space-y-3">
          <div className="w-12 h-12 bg-[#1a2e4a] mx-auto flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-heading text-lg font-semibold">Betalning godkänd</p>
          <p className="text-sm text-[#4a5568]">Tack. Hämtar dina dokument…</p>
        </div>
      )}

      {/* Stage: declined */}
      {stage === "declined" && (
        <div className="animate-fade-in-up space-y-4">
          <div className="border border-[#e5e5e5] p-4 text-center">
            <p className="font-medium text-ink mb-1">Betalningen avbröts</p>
            <p className="text-sm text-[#4a5568]">Du avbröt betalningen i Swish.</p>
          </div>
          <button onClick={() => setStage("phone")} className="btn-primary">
            Försök igen
          </button>
        </div>
      )}

      {/* Stage: error */}
      {stage === "error" && (
        <div className="animate-fade-in-up space-y-4">
          <div className="border border-[#e5e5e5] p-4 text-center">
            <p className="font-medium text-ink mb-1">Något gick fel</p>
            <p className="text-sm text-[#4a5568]">{errorMsg}</p>
          </div>
          <button onClick={() => { setStage("phone"); setErrorMsg(""); }} className="btn-primary">
            Försök igen
          </button>
        </div>
      )}
    </div>
  );
}

function SwishIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="18" height="18" rx="4" fill="white" fillOpacity="0.2"/>
      <text x="9" y="13" textAnchor="middle" fontSize="10" fill="white" fontFamily="sans-serif" fontWeight="bold">S</text>
    </svg>
  );
}
