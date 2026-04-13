"use client";

import { useState } from "react";
import type { Circumstances, WillType, FamilyStatus, ChildrenStatus, Asset, OutsideFamily } from "@/lib/types";
import { VoiceButton } from "../VoiceButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface Props {
  circumstances: Circumstances;
  onUpdate: (c: Partial<Circumstances>, sub: number, total: number) => void;
  onComplete: () => void;
}

type QuestionStep = "willType" | "familyStatus" | "children" | "assets" | "outside";

const QUESTION_ORDER: QuestionStep[] = ["willType", "familyStatus", "children", "assets", "outside"];

export function Step1Circumstances({ circumstances, onUpdate, onComplete }: Props) {
  const [currentQ, setCurrentQ] = useState<QuestionStep>(() => {
    if (!circumstances.willType) return "willType";
    if (!circumstances.familyStatus) return "familyStatus";
    if (!circumstances.childrenStatus) return "children";
    if (!circumstances.assets) return "assets";
    return "outside";
  });
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>(circumstances.assets || []);

  const stepIndex = QUESTION_ORDER.indexOf(currentQ);

  const goNext = (q: QuestionStep) => {
    const nextIndex = QUESTION_ORDER.indexOf(q) + 1;
    if (nextIndex >= QUESTION_ORDER.length) {
      onComplete();
    } else {
      const next = QUESTION_ORDER[nextIndex];
      setCurrentQ(next);
      onUpdate({}, nextIndex, QUESTION_ORDER.length);
    }
  };

  const selectWillType = (type: WillType) => {
    onUpdate({ willType: type }, 1, QUESTION_ORDER.length);
    goNext("willType");
  };

  const selectFamilyStatus = (status: FamilyStatus) => {
    onUpdate({ familyStatus: status }, 2, QUESTION_ORDER.length);
    goNext("familyStatus");
  };

  const selectChildren = (status: ChildrenStatus) => {
    onUpdate({ childrenStatus: status }, 3, QUESTION_ORDER.length);
    goNext("children");
  };

  const toggleAsset = (asset: Asset) => {
    const updated = selectedAssets.includes(asset)
      ? selectedAssets.filter((a) => a !== asset)
      : asset === "none"
      ? ["none" as Asset]
      : selectedAssets.filter((a) => a !== "none").concat(asset);
    setSelectedAssets(updated);
  };

  const confirmAssets = () => {
    onUpdate({ assets: selectedAssets.length ? selectedAssets : ["none"] }, 4, QUESTION_ORDER.length);
    goNext("assets");
  };

  const selectOutside = (val: OutsideFamily) => {
    onUpdate({ outsideFamily: val }, 5, QUESTION_ORDER.length);
    goNext("outside");
  };

  return (
    <div>
      {/* Intro */}
      <div className="mb-10">
        <p className="label-overline mb-3">Steg 1 av 4 — Din situation</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Innan vi börjar
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Berätta lite om din situation så att vi kan anpassa allt för just dig. En fråga i taget.
        </p>
      </div>

      {/* Question: willType */}
      {currentQ === "willType" && (
        <QuestionBlock
          key="willType"
          question="Skriver du testamentet själv eller tillsammans med en partner?"
        >
          <OptionGrid>
            <OptionButton onClick={() => selectWillType("own")}>
              <span className="font-heading text-lg mb-1">Eget testamente</span>
              <span className="text-xs text-[#6b7280]">Jag skriver för mig själv</span>
            </OptionButton>
            <OptionButton onClick={() => selectWillType("joint")}>
              <span className="font-heading text-lg mb-1">Inbördes testamente</span>
              <span className="text-xs text-[#6b7280]">Vi skriver tillsammans med min partner</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* Question: familyStatus */}
      {currentQ === "familyStatus" && (
        <QuestionBlock
          key="familyStatus"
          question="Vad är din familjesituation?"
        >
          <OptionGrid cols={3}>
            {(
              [
                { value: "married", label: "Gift" },
                { value: "sambo", label: "Sambo" },
                { value: "single", label: "Singel" },
                { value: "divorced", label: "Skild" },
                { value: "widowed", label: "Änka/Änkling" },
              ] as { value: FamilyStatus; label: string }[]
            ).map((opt) => (
              <OptionButton key={opt.value} onClick={() => selectFamilyStatus(opt.value)}>
                <span className="font-heading text-base">{opt.label}</span>
              </OptionButton>
            ))}
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* Question: children */}
      {currentQ === "children" && (
        <QuestionBlock key="children" question="Har du barn?">
          <OptionGrid>
            <OptionButton onClick={() => selectChildren("none")}>
              <span className="font-heading text-base mb-1">Inga barn</span>
            </OptionButton>
            <OptionButton onClick={() => selectChildren("joint")}>
              <span className="font-heading text-base mb-1">Ja, gemensamma barn</span>
              <span className="text-xs text-[#6b7280]">Med min nuvarande partner</span>
            </OptionButton>
            <OptionButton onClick={() => selectChildren("from_previous")}>
              <span className="font-heading text-base mb-1">Ja, särkullbarn</span>
              <span className="text-xs text-[#6b7280]">Barn från en tidigare relation</span>
            </OptionButton>
            <OptionButton onClick={() => selectChildren("both")}>
              <span className="font-heading text-base mb-1">Både och</span>
              <span className="text-xs text-[#6b7280]">Gemensamma barn och särkullbarn</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* Question: assets */}
      {currentQ === "assets" && (
        <QuestionBlock
          key="assets"
          question="Äger du något av följande?"
          hint="Du kan välja flera alternativ."
        >
          <OptionGrid cols={2}>
            {(
              [
                { value: "residence", label: "Bostad", hint: "Villa, bostadsrätt, etc." },
                { value: "vacation_home", label: "Fritidshus", hint: "Sommarstuga, fjällstuga, etc." },
                { value: "business", label: "Företag", hint: "Eget företag eller andelar" },
                { value: "securities", label: "Värdepapper", hint: "Aktier, fonder, sparande" },
                { value: "none", label: "Inget särskilt", hint: "" },
              ] as { value: Asset; label: string; hint: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleAsset(opt.value)}
                className={`w-full p-4 border text-left transition-all ${
                  selectedAssets.includes(opt.value)
                    ? "border-[#1a2e4a] bg-[#f0f4f8]"
                    : "border-[#e5e5e5] bg-white hover:border-[#9ca3af]"
                }`}
                style={{ borderRadius: "3px" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-4 h-4 border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedAssets.includes(opt.value)
                        ? "border-[#1a2e4a] bg-[#1a2e4a]"
                        : "border-[#e5e5e5]"
                    }`}
                    style={{ borderRadius: "2px" }}
                  >
                    {selectedAssets.includes(opt.value) && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{opt.label}</p>
                    {opt.hint && <p className="text-xs text-[#6b7280] mt-0.5">{opt.hint}</p>}
                  </div>
                </div>
              </button>
            ))}
          </OptionGrid>

          <button
            onClick={confirmAssets}
            disabled={selectedAssets.length === 0}
            className="btn-primary mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Fortsätt
          </button>
        </QuestionBlock>
      )}

      {/* Question: outside family */}
      {currentQ === "outside" && (
        <QuestionBlock
          key="outside"
          question="Finns det någon utanför din närmaste familj du vill ska få något?"
        >
          <OptionGrid>
            <OptionButton onClick={() => selectOutside("person")}>
              <span className="font-heading text-base mb-1">Ja — vän eller annan släkt</span>
              <span className="text-xs text-[#6b7280]">Kompis, syskon, kusin, etc.</span>
            </OptionButton>
            <OptionButton onClick={() => selectOutside("charity")}>
              <span className="font-heading text-base mb-1">Ja — en organisation</span>
              <span className="text-xs text-[#6b7280]">Välgörenhet, förening, kyrka, etc.</span>
            </OptionButton>
            <OptionButton onClick={() => selectOutside("none")}>
              <span className="font-heading text-base mb-1">Nej</span>
              <span className="text-xs text-[#6b7280]">Arvet stannar i närmaste familj</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* Breadcrumb */}
      <div className="mt-8 flex gap-1.5">
        {QUESTION_ORDER.map((q, i) => (
          <div
            key={q}
            className={`h-0.5 flex-1 ${i <= stepIndex ? "bg-[#1a2e4a]" : "bg-[#e5e5e5]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionBlock({
  question,
  hint,
  children,
}: {
  question: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in-up">
      <h2 className="font-heading text-2xl font-semibold text-ink mb-2 leading-snug">
        {question}
      </h2>
      {hint && <p className="text-sm text-[#6b7280] mb-5">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </div>
  );
}

function OptionGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div
      className={`grid gap-3 ${cols === 2 ? "grid-cols-1 sm:grid-cols-2" : cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}

function OptionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 border border-[#e5e5e5] bg-white hover:border-[#1a2e4a] hover:bg-[#f7f9fc] text-left flex flex-col transition-all duration-150"
      style={{ borderRadius: "3px" }}
    >
      {children}
    </button>
  );
}

// Export VoiceInput usage example (used in later steps)
export { QuestionBlock, OptionGrid, OptionButton };
