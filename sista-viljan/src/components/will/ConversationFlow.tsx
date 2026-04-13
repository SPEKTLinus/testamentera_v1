"use client";

import { useState, useEffect, useCallback } from "react";
import type { WillDraft, GeneratedWill, WillAiTokenUsage } from "@/lib/types";
import { saveLocalDraft, loadLocalDraft } from "@/lib/supabase";
import { ProgressBar } from "./ProgressBar";
import { ConsequencePreview } from "./ConsequencePreview";
import { Step3Documents } from "./steps/Step3Documents";
import { Step4Signing } from "./steps/Step4Signing";
import { SwishPayment } from "./SwishPayment";
import { StartWillGate, readSessionPhone } from "./StartWillGate";
import { PAYMENT_PRICES, REMINDER_INCLUDED_MONTHS } from "@/lib/pricing";
import { WillChatPanel } from "./WillChatPanel";
import { getIntakeProgressPercent, getIntakeStage } from "@/lib/willChatIntake";

const TOTAL_STEPS = 5;

function getProgress(step: number, subStep: number, subTotal: number): number {
  const stepWeight = 100 / TOTAL_STEPS;
  const stepBase = (step - 1) * stepWeight;
  const subProgress = subTotal > 0 ? (subStep / subTotal) * stepWeight : 0;
  return Math.min(stepBase + subProgress, 99);
}

type OverlayState = "none" | "paywall";
type GateMode = "loading" | "need_phone" | "ok";
type SubPhase = "chat" | "documents" | "signing";

export function ConversationFlow() {
  const [draft, setDraft] = useState<WillDraft>({
    step: 1,
    circumstances: {},
    wishes: {},
    funeralWishes: {},
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [subPhase, setSubPhase] = useState<SubPhase>("chat");
  const [subStep, setSubStep] = useState(0);
  const [subTotal, setSubTotal] = useState(1);
  const [startTime] = useState(Date.now());
  const [overlay, setOverlay] = useState<OverlayState>("none");
  const [gateMode, setGateMode] = useState<GateMode>("loading");

  useEffect(() => {
    const saved = loadLocalDraft();
    if (saved) {
      setDraft(saved);
      const step = saved.step || 1;
      setCurrentStep(step);
      if (step >= 4) {
        setSubPhase(step === 5 ? "signing" : "documents");
      } else {
        setSubPhase("chat");
      }
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

  const saveDraft = useCallback((updates: Partial<WillDraft>) => {
    setDraft((prev) => {
      const updated = { ...prev, ...updates };
      saveLocalDraft(updated);
      return updated;
    });
  }, []);

  const handleChatDraftMerged = useCallback((merged: WillDraft) => {
    saveLocalDraft(merged);
    setDraft(merged);
  }, []);

  const handleContinueFromIntake = useCallback(() => {
    setDraft((prev) => {
      if (prev.paid) {
        setSubPhase("documents");
      } else {
        setOverlay("paywall");
      }
      return prev;
    });
  }, []);

  const handlePaymentPaid = useCallback(() => {
    saveDraft({ step: 4, paid: true });
    setCurrentStep(4);
    setSubStep(0);
    setSubTotal(1);
    setOverlay("none");
    setSubPhase("documents");
  }, [saveDraft]);

  const handleDocumentsComplete = useCallback(() => {
    saveDraft({ step: 5 });
    setCurrentStep(5);
    setSubPhase("signing");
    setSubStep(0);
    setSubTotal(1);
  }, [saveDraft]);

  const handleWillGenerated = useCallback(
    (generatedWill: GeneratedWill, aiTokenUsage?: WillAiTokenUsage) => {
      saveDraft({
        generatedWill,
        ...(aiTokenUsage ? { aiTokenUsage } : {}),
      });
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

  const handleEditWill = useCallback(() => {
    setSubPhase("chat");
    setCurrentStep(1);
    setOverlay("none");
  }, []);

  const intakePercent = getIntakeProgressPercent(draft);
  const intakeStage = getIntakeStage(draft);

  const progress =
    subPhase === "chat"
      ? intakePercent
      : getProgress(currentStep, subStep, subTotal);

  const headerStepLabel =
    subPhase === "chat"
      ? `Samtal — del ${intakeStage} av 3`
      : currentStep < 5
        ? `Steg ${Math.min(4, currentStep)} av 4`
        : "Klart";

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <a href="/" className="font-heading text-base font-semibold text-ink flex-shrink-0">
            Sista Viljan
          </a>
          <div className="flex-1 max-w-md">
            <ProgressBar percent={progress} />
          </div>
          <div className="flex-shrink-0 text-xs text-[#6b7280] hidden sm:block">
            {headerStepLabel}
          </div>
        </div>
      </header>

      <div className="pt-14 min-h-screen">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 lg:gap-16 min-h-[calc(100vh-56px)]">
            <div className="py-12 lg:py-16 lg:border-r border-[#e5e5e5] lg:pr-16">
              {subPhase === "chat" && (
                               <WillChatPanel
                  draft={draft}
                  onDraftMerged={handleChatDraftMerged}
                  onContinueFromIntake={handleContinueFromIntake}
                  intakeStage={intakeStage}
                  intakePercent={intakePercent}
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
              {subPhase === "signing" && <Step4Signing elapsedMinutes={elapsedMinutes} />}
            </div>

            {subPhase === "chat" && (
              <div className="hidden lg:block py-16">
                <div className="sticky top-20">
                  <ConsequencePreview circumstances={draft.circumstances} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {overlay === "paywall" && (
        <FullScreenOverlay>
          <div className="max-w-md w-full animate-fade-in-up">
            <p className="label-overline mb-4">Hämta dina dokument</p>
            <h2 className="font-heading text-2xl font-semibold mb-2 leading-tight">
              Ditt testamente är klart.
            </h2>
            <p className="text-sm text-[#4a5568] leading-relaxed mb-6">
              Betala {PAYMENT_PRICES.will} kr för att ladda ner ditt juridiska testamente och ditt personliga brev.
              Engångsbetalning — inga prenumerationer. E-postpåminnelser ingår i {REMINDER_INCLUDED_MONTHS}{" "}
              månader efter köpet.
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
