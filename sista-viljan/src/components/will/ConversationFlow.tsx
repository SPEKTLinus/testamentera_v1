"use client";

import { useState, useEffect, useCallback } from "react";
import type { WillDraft, GeneratedWill, WillAiTokenUsage } from "@/lib/types";
import { saveLocalDraft, loadLocalDraftForPhone } from "@/lib/supabase";
import { ProgressBar } from "./ProgressBar";
import { ConsequencePreview } from "./ConsequencePreview";
import { Step3Documents } from "./steps/Step3Documents";
import { Step4Signing } from "./steps/Step4Signing";
import { SwishPayment } from "./SwishPayment";
import {
  StartWillGate,
  readSessionPhone,
  readSessionWillAccessToken,
  readSessionContactEmail,
} from "./StartWillGate";
import { formatPhoneDisplayFromE164 } from "@/lib/phone";
import { PAYMENT_PRICES, REMINDER_RECURRING_INTERVAL_MONTHS } from "@/lib/pricing";
import { WillChatPanel } from "./WillChatPanel";
import { LetterChatPanel } from "./LetterChatPanel";
import {
  getIntakeProgressPercent,
  getIntakeStage,
  migrateWillDraft,
  isIntakeComplete,
  backfillFuneralWishesFromDraftText,
} from "@/lib/willChatIntake";

const MAIN_OFFSET = "3.5rem"; /* h-14 header */

const TOTAL_STEPS = 5;

function getProgress(step: number, subStep: number, subTotal: number): number {
  const stepWeight = 100 / TOTAL_STEPS;
  const stepBase = (step - 1) * stepWeight;
  const subProgress = subTotal > 0 ? (subStep / subTotal) * stepWeight : 0;
  return Math.min(stepBase + subProgress, 99);
}

type OverlayState = "none" | "paywall" | "letter_paywall";
type GateMode = "loading" | "need_phone" | "ok";
type SubPhase = "chat" | "documents" | "signing" | "letter_chat";

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

  const applyDraftToNavigationState = useCallback((saved: WillDraft) => {
    setDraft(saved);
    const step = saved.step || 1;
    setCurrentStep(step);
    if (step >= 4) {
      setSubPhase(step === 5 ? "signing" : "documents");
    } else {
      setSubPhase("chat");
    }
  }, []);

  useEffect(() => {
    const sess = readSessionPhone();
    const sessToken = readSessionWillAccessToken();

    if (!sess) {
      setDraft({ step: 1, circumstances: {}, wishes: {}, funeralWishes: {} });
      setGateMode("need_phone");
      return;
    }

    const saved = loadLocalDraftForPhone(sess.normalized);
    if (saved) {
      const migrated = migrateWillDraft(saved);
      let toShow = backfillFuneralWishesFromDraftText(migrated);
      if (migrated !== saved || toShow !== migrated) {
        saveLocalDraft(toShow);
      }
      if (sessToken && !toShow.willAccessToken && toShow.verifiedPhone === sess.normalized) {
        toShow = { ...toShow, willAccessToken: sessToken };
        saveLocalDraft(toShow);
      }
      const sessMail = readSessionContactEmail();
      if (sessMail && !toShow.contactEmail) {
        toShow = { ...toShow, contactEmail: sessMail };
        saveLocalDraft(toShow);
      }
      applyDraftToNavigationState(toShow);
    } else {
      const sessMail = readSessionContactEmail();
      const fresh: WillDraft = {
        step: 1,
        circumstances: {},
        wishes: {},
        funeralWishes: {},
        verifiedPhone: sess.normalized,
        ...(sessToken ? { willAccessToken: sessToken } : {}),
        ...(sessMail ? { contactEmail: sessMail } : {}),
      };
      applyDraftToNavigationState(fresh);
      saveLocalDraft(fresh);
    }

    setGateMode("ok");
  }, [applyDraftToNavigationState]);

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
        return prev;
      }
      if (!isIntakeComplete(prev)) {
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

  const handleBackToDocumentsFromSigning = useCallback(() => {
    saveDraft({ step: 4 });
    setCurrentStep(4);
    setSubPhase("documents");
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
    (e164: string, accessToken: string | undefined, email: string) => {
      const existing = loadLocalDraftForPhone(e164);
      const token =
        accessToken?.trim() ||
        existing?.willAccessToken?.trim() ||
        readSessionWillAccessToken()?.trim() ||
        undefined;
      const next: WillDraft = migrateWillDraft({
        ...(existing ?? {
          step: 1,
          circumstances: {},
          wishes: {},
          funeralWishes: {},
        }),
        verifiedPhone: e164,
        contactEmail: email,
        ...(token ? { willAccessToken: token } : {}),
      });
      applyDraftToNavigationState(next);
      saveLocalDraft(next);
      setGateMode("ok");
    },
    [applyDraftToNavigationState]
  );

  useEffect(() => {
    if (gateMode !== "ok") return;
    if (draft.paid || draft.paidLetter || draft.willAccessToken) return;
    const sess = readSessionPhone();
    if (!sess || draft.verifiedPhone !== sess.normalized) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/start-will", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: formatPhoneDisplayFromE164(sess.normalized),
            refreshToken: true,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          accessToken?: string;
        };
        if (cancelled || !res.ok || !data.ok || typeof data.accessToken !== "string") return;
        saveDraft({ willAccessToken: data.accessToken });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gateMode, draft.paid, draft.paidLetter, draft.willAccessToken, draft.verifiedPhone, saveDraft]);

  const handleBackToWillChat = useCallback(() => {
    setSubPhase("chat");
    setCurrentStep(1);
    setOverlay("none");
  }, []);

  const handleOpenLetterFlow = useCallback(() => {
    if (draft.personalLetterChatLocked) return;
    if (draft.paidLetter) {
      setSubPhase("letter_chat");
    } else {
      setOverlay("letter_paywall");
    }
  }, [draft.paidLetter, draft.personalLetterChatLocked]);

  const handleLockPersonalLetter = useCallback(() => {
    saveDraft({
      personalLetterChatLocked: true,
      personalLetterChatLockedAt: new Date().toISOString(),
    });
    setSubPhase("documents");
    setOverlay("none");
  }, [saveDraft]);

  const handleLetterPaymentPaid = useCallback(() => {
    saveDraft({ paidLetter: true });
    setOverlay("none");
    setSubPhase("letter_chat");
  }, [saveDraft]);

  const handleLetterChatMerged = useCallback((merged: WillDraft) => {
    saveLocalDraft(merged);
    setDraft(merged);
  }, []);

  const intakePercent = getIntakeProgressPercent(draft);
  const intakeStage = getIntakeStage(draft);

  const progress =
    subPhase === "chat"
      ? intakePercent
      : subPhase === "letter_chat"
        ? getProgress(4, 0, 1)
        : getProgress(currentStep, subStep, subTotal);

  const headerStepLabel =
    subPhase === "chat"
      ? `Samtal — del ${intakeStage} av 3`
      : subPhase === "letter_chat"
        ? "Personligt brev"
        : currentStep < 5
          ? `Steg ${Math.min(4, currentStep)} av 4`
          : "Klart";

  const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);

  useEffect(() => {
    if (subPhase === "letter_chat" && draft.personalLetterChatLocked) {
      setSubPhase("documents");
    }
  }, [subPhase, draft.personalLetterChatLocked]);

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

      <div className="min-h-screen pt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {subPhase === "chat" ? (
            <div
              className="grid grid-cols-1 items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-10"
              style={{ minHeight: `calc(100vh - ${MAIN_OFFSET})` }}
            >
              <div
                className="flex min-h-[calc(100vh-3.5rem)] flex-col border-[#e5e5e5] py-4 lg:min-h-0 lg:h-[calc(100vh-3.5rem)] lg:border-r lg:pr-8"
              >
                <WillChatPanel
                  draft={draft}
                  onDraftMerged={handleChatDraftMerged}
                  onContinueFromIntake={handleContinueFromIntake}
                />
              </div>
              <aside className="hidden min-h-0 flex-col overflow-hidden py-4 lg:flex lg:h-[calc(100vh-3.5rem)]">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <ConsequencePreview circumstances={draft.circumstances} />
                </div>
              </aside>
            </div>
          ) : subPhase === "letter_chat" ? (
            <div
              className="mx-auto max-w-4xl px-0 py-4 sm:py-8"
              style={{ minHeight: `calc(100vh - ${MAIN_OFFSET})` }}
            >
              <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:min-h-[calc(100vh-3.5rem)]">
                <LetterChatPanel
                  draft={draft}
                  onDraftMerged={handleLetterChatMerged}
                  onFinishLetterChat={handleLockPersonalLetter}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-0 py-10 sm:py-12">
              {subPhase === "documents" && (
                <Step3Documents
                  draft={draft}
                  onComplete={handleDocumentsComplete}
                  onBackToWillChat={handleBackToWillChat}
                  onOpenLetterFlow={handleOpenLetterFlow}
                  onLockPersonalLetter={handleLockPersonalLetter}
                  onWillGenerated={handleWillGenerated}
                />
              )}
              {subPhase === "signing" && (
                <Step4Signing
                  elapsedMinutes={elapsedMinutes}
                  draft={draft}
                  onOpenLetterFlow={handleOpenLetterFlow}
                  onBackToDocuments={handleBackToDocumentsFromSigning}
                />
              )}
            </div>
          )}
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
              Betala {PAYMENT_PRICES.will} kr för att ladda ner ditt juridiska testamente.
              Engångsbetalning — inga prenumerationer. Du får löpande e-post med påminnelse ungefär var{" "}
              {REMINDER_RECURRING_INTERVAL_MONTHS}:e månad att se över testamentet. Ett separat personligt brev kan du
              köpa till på dokument-sidan.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                "Juridiskt testamente (PDF)",
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
              initialEmail={draft.contactEmail}
              onPaid={handlePaymentPaid}
            />
          </div>
        </FullScreenOverlay>
      )}

      {overlay === "letter_paywall" && (
        <FullScreenOverlay>
          <div className="max-w-md w-full animate-fade-in-up">
            <p className="label-overline mb-4">Personligt brev</p>
            <h2 className="font-heading text-2xl font-semibold mb-2 leading-tight">
              Eget samtal för ditt brev
            </h2>
            <p className="text-sm text-[#4a5568] leading-relaxed mb-6">
              Betala {PAYMENT_PRICES.letter} kr för att öppna ett separat samtal med Will där du formulerar ett
              personligt brev till dina nära — minnen, tack och det du vill förmedla. Det är inte juridiskt bindande.
            </p>
            <SwishPayment
              product="letter"
              draftId={draft.id}
              initialPhoneE164={draft.verifiedPhone}
              initialEmail={draft.contactEmail}
              onPaid={handleLetterPaymentPaid}
              onCancel={() => setOverlay("none")}
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
