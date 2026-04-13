"use client";

import { useState, useEffect, useCallback } from "react";
import type { WillDraft, Circumstances, Wishes, FuneralWishes, GeneratedWill } from "@/lib/types";
import { saveLocalDraft, loadLocalDraft } from "@/lib/supabase";
import { ProgressBar } from "./ProgressBar";
import { ConsequencePreview } from "./ConsequencePreview";
import { Step1Circumstances } from "./steps/Step1Circumstances";
import { StepTestatorInfo } from "./steps/StepTestatorInfo";
import { Step2Wishes } from "./steps/Step2Wishes";
import { Step2bFuneral } from "./steps/Step2bFuneral";
import { Step3Documents } from "./steps/Step3Documents";
import { Step4Signing } from "./steps/Step4Signing";
import { SwishPayment } from "./SwishPayment";
import { StorageUpsell } from "./StorageUpsell";
import { StartWillGate, readSessionPhone } from "./StartWillGate";
import { PAYMENT_PRICES } from "@/lib/pricing";

const TOTAL_STEPS = 5;

function getProgress(step: number, subStep: number, subTotal: number): number {
  const stepWeight = 100 / TOTAL_STEPS;
  const stepBase = (step - 1) * stepWeight;
  const subProgress = subTotal > 0 ? (subStep / subTotal) * stepWeight : 0;
  return Math.min(stepBase + subProgress, 99);
}

type OverlayState = "none" | "paywall" | "storage_upsell";
type GateMode = "loading" | "need_phone" | "ok";
// step 1 = circumstances, 1.5 = testator info, 2 = wishes, 3 = funeral, 4 = docs, 5 = signing
type SubPhase = "circumstances" | "testatorInfo" | "wishes" | "funeral" | "documents" | "signing";

export function ConversationFlow() {
  const [draft, setDraft] = useState<WillDraft>({
    step: 1,
    circumstances: {},
    wishes: {},
    funeralWishes: {},
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [subPhase, setSubPhase] = useState<SubPhase>("circumstances");
  const [subStep, setSubStep] = useState(0);
  const [subTotal, setSubTotal] = useState(5);
  const [startTime] = useState(Date.now());
  const [overlay, setOverlay] = useState<OverlayState>("none");
  const [gateMode, setGateMode] = useState<GateMode>("loading");

  useEffect(() => {
    const saved = loadLocalDraft();
    if (saved) {
      setDraft(saved);
      const step = saved.step || 1;
      setCurrentStep(step);
      // Restore subPhase from saved step
      if (step === 1) setSubPhase("circumstances");
      else if (step === 2) setSubPhase("wishes");
      else if (step === 3) setSubPhase("funeral");
      else if (step === 4) setSubPhase("documents");
      else if (step === 5) setSubPhase("signing");
    }

    const sess = readSessionPhone();
    const bypass = !!(saved?.paid || saved?.verifiedPhone || sess);

    if (bypass) {
      if (sess && saved && !saved.verifiedPhone) {
        const next = { ...saved, verifiedPhone: sess.normalized };
        saveLocalDraft(next);
        setDraft(next);
      } else if (sess && !saved) {
        setDraft((prev) => {
          const next = { ...prev, verifiedPhone: sess.normalized };
          saveLocalDraft(next);
          return next;
        });
      }
      setGateMode("ok");
    } else {
      setGateMode("need_phone");
    }
  }, []);

  // Use functional updates to avoid stale closure bugs when multiple updates
  // fire in the same render cycle (e.g. step components calling onUpdate twice).
  const saveDraft = useCallback((updates: Partial<WillDraft>) => {
    setDraft(prev => {
      const updated = { ...prev, ...updates };
      saveLocalDraft(updated);
      return updated;
    });
  }, []);

  const handleCircumstancesUpdate = useCallback(
    (circumstances: Partial<Circumstances>, sub: number, total: number) => {
      setDraft(prev => {
        const updated = { ...prev, circumstances: { ...prev.circumstances, ...circumstances } };
        saveLocalDraft(updated);
        return updated;
      });
      setSubStep(sub);
      setSubTotal(total);
    },
    []
  );

  const handleCircumstancesComplete = useCallback(() => {
    // Don't advance step number yet — go to testator info first
    setSubPhase("testatorInfo");
    setSubStep(5);
    setSubTotal(9);
  }, []);

  const handleTestatorComplete = useCallback(
    (data: { name: string; personalNumber: string; address: string }) => {
      saveDraft({
        step: 2,
        testatorName: data.name,
        testatorPersonalNumber: data.personalNumber,
        testatorAddress: data.address,
      });
      setCurrentStep(2);
      setSubPhase("wishes");
      setSubStep(0);
      setSubTotal(6);
    },
    [saveDraft]
  );

  const handleWishesUpdate = useCallback(
    (wishes: Partial<Wishes>, sub: number, total: number) => {
      setDraft(prev => {
        const updated = { ...prev, wishes: { ...prev.wishes, ...wishes } };
        saveLocalDraft(updated);
        return updated;
      });
      setSubStep(sub);
      setSubTotal(total);
    },
    []
  );

  const handleWishesComplete = useCallback(() => {
    saveDraft({ step: 3 });
    setCurrentStep(3);
    setSubPhase("funeral");
    setSubStep(0);
    setSubTotal(8);
  }, [saveDraft]);

  const handleFuneralUpdate = useCallback(
    (funeralWishes: Partial<FuneralWishes>, sub: number, total: number) => {
      setDraft(prev => {
        const updated = { ...prev, funeralWishes: { ...prev.funeralWishes, ...funeralWishes } };
        saveLocalDraft(updated);
        return updated;
      });
      setSubStep(sub);
      setSubTotal(total);
    },
    []
  );

  const handleFuneralComplete = useCallback(() => {
    // If already paid (editing after payment), skip paywall and go straight to documents
    setDraft(prev => {
      if (prev.paid) {
        setSubPhase("documents");
        return prev;
      }
      setOverlay("paywall");
      return prev;
    });
  }, []);

  const handlePaymentPaid = useCallback(() => {
    saveDraft({ step: 4, paid: true });
    setCurrentStep(4);
    setSubStep(0);
    setSubTotal(1);
    setOverlay("storage_upsell");
  }, [saveDraft]);

  const handleStorageUpsellDone = useCallback(() => {
    setOverlay("none");
    setSubPhase("documents");
  }, []);

  const handleDocumentsComplete = useCallback(() => {
    saveDraft({ step: 5 });
    setCurrentStep(5);
    setSubPhase("signing");
    setSubStep(0);
    setSubTotal(1);
  }, [saveDraft]);

  const handleWillGenerated = useCallback(
    (generatedWill: GeneratedWill) => {
      saveDraft({ generatedWill });
    },
    [saveDraft]
  );

  const handleGateVerified = useCallback(
    (e164: string) => {
      saveDraft({ verifiedPhone: e164 });
      setGateMode("ok");
    },
    [saveDraft]
  );

  // Allow editing wishes/funeral after payment without requiring re-payment
  const handleEditWill = useCallback(() => {
    setSubPhase("wishes");
    setCurrentStep(2);
    setSubStep(0);
    setSubTotal(6);
  }, []);

  const progress = getProgress(currentStep, subStep, subTotal);
  const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);

  if (gateMode === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-[#6b7280]">
        Laddar…
      </div>
    );
  }

  if (gateMode === "need_phone") {
    return <StartWillGate onVerified={handleGateVerified} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <a href="/" className="font-heading text-base font-semibold text-ink flex-shrink-0">
            Sista Viljan
          </a>
          <div className="flex-1 max-w-md">
            <ProgressBar percent={progress} />
          </div>
          <div className="flex-shrink-0 text-xs text-[#6b7280] hidden sm:block">
            {currentStep < 5 ? `Steg ${currentStep} av 4` : "Klart"}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="pt-14 min-h-screen">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 lg:gap-16 min-h-[calc(100vh-56px)]">
            {/* Left: conversation */}
            <div className="py-12 lg:py-16 lg:border-r border-[#e5e5e5] lg:pr-16">
              {subPhase === "circumstances" && (
                <Step1Circumstances
                  circumstances={draft.circumstances}
                  onUpdate={handleCircumstancesUpdate}
                  onComplete={handleCircumstancesComplete}
                />
              )}
              {subPhase === "testatorInfo" && (
                <StepTestatorInfo
                  initial={{
                    name: draft.testatorName,
                    personalNumber: draft.testatorPersonalNumber,
                    address: draft.testatorAddress,
                  }}
                  onComplete={handleTestatorComplete}
                />
              )}
              {subPhase === "wishes" && (
                <Step2Wishes
                  circumstances={draft.circumstances}
                  wishes={draft.wishes}
                  onUpdate={handleWishesUpdate}
                  onComplete={handleWishesComplete}
                />
              )}
              {subPhase === "funeral" && (
                <Step2bFuneral
                  funeralWishes={draft.funeralWishes}
                  testatorName={draft.testatorName}
                  onUpdate={handleFuneralUpdate}
                  onComplete={handleFuneralComplete}
                />
              )}
              {subPhase === "documents" && (
                <Step3Documents
                  draft={draft}
                  elapsedMinutes={elapsedMinutes}
                  onComplete={handleDocumentsComplete}
                  onEdit={handleEditWill}
                  onWillGenerated={handleWillGenerated}
                />
              )}
              {subPhase === "signing" && (
                <Step4Signing elapsedMinutes={elapsedMinutes} />
              )}
            </div>

            {/* Right: consequence preview */}
            {currentStep <= 3 && (
              <div className="hidden lg:block py-16">
                <div className="sticky top-20">
                  <ConsequencePreview circumstances={draft.circumstances} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paywall overlay — Swish */}
      {overlay === "paywall" && (
        <FullScreenOverlay>
          <div className="max-w-md w-full animate-fade-in-up">
            <p className="label-overline mb-4">Hämta dina dokument</p>
            <h2 className="font-heading text-2xl font-semibold mb-2 leading-tight">
              Ditt testamente är klart.
            </h2>
            <p className="text-sm text-[#4a5568] leading-relaxed mb-6">
              Betala {PAYMENT_PRICES.will} kr för att ladda ner ditt juridiska testamente och ditt personliga brev.
              Engångsbetalning — inga prenumerationer.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Juridiskt giltigt testamente",
                "Personligt brev till dina nära",
                "Signeringsguide steg för steg",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[#4a5568]">
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
            <SwishPayment
              product="will"
              draftId={draft.id}
              initialPhoneE164={draft.verifiedPhone}
              onPaid={handlePaymentPaid}
            />
          </div>
        </FullScreenOverlay>
      )}

      {/* Storage upsell — full screen, after payment */}
      {overlay === "storage_upsell" && (
        <FullScreenOverlay>
          <StorageUpsell
            draftId={draft.id}
            onAccepted={handleStorageUpsellDone}
            onDeclined={handleStorageUpsellDone}
          />
        </FullScreenOverlay>
      )}
    </div>
  );
}

function FullScreenOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto flex items-center justify-center p-6">
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="w-4 h-4 border border-[#1a2e4a] flex-shrink-0 flex items-center justify-center">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4L3 5.5L6.5 2" stroke="#1a2e4a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}
