"use client";

import { useState } from "react";
import type { Circumstances, Wishes } from "@/lib/types";
import { VoiceButton } from "../VoiceButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { QuestionBlock, OptionButton, OptionGrid } from "./Step1Circumstances";

interface Props {
  circumstances: Circumstances;
  wishes: Wishes;
  onUpdate: (w: Partial<Wishes>, sub: number, total: number) => void;
  onComplete: () => void;
}

type Q =
  | "mainHeir"
  | "privateProperty"
  | "specificItems"
  | "partnerCanStay"
  | "charity"
  | "executor";

function getQuestions(c: Circumstances): Q[] {
  const qs: Q[] = ["mainHeir", "privateProperty", "specificItems"];
  if (
    (c.familyStatus === "married" || c.familyStatus === "sambo") &&
    (c.childrenStatus === "from_previous" || c.childrenStatus === "both")
  ) {
    qs.push("partnerCanStay");
  }
  if (c.outsideFamily === "charity") {
    qs.push("charity");
  }
  qs.push("executor");
  return qs;
}

export function Step2Wishes({ circumstances, wishes, onUpdate, onComplete }: Props) {
  const questions = getQuestions(circumstances);
  const [currentQ, setCurrentQ] = useState<Q>(questions[0]);
  const [values, setValues] = useState({
    mainHeir: wishes.mainHeir || "",
    specificItems: wishes.specificItems || "",
    charityName: wishes.charityName || "",
    charityAmount: wishes.charityAmount || "",
    executor: wishes.executor || "",
  });

  const stepIndex = questions.indexOf(currentQ);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete();
    } else {
      setCurrentQ(questions[nextIndex]);
      onUpdate({}, nextIndex, questions.length);
    }
  };

  const handleTextSubmit = (field: keyof typeof values) => {
    const update: Partial<Wishes> = { [field]: values[field] };
    onUpdate(update, stepIndex + 1, questions.length);
    goNext();
  };

  const handleBooleanSelect = (field: keyof Wishes, value: boolean) => {
    onUpdate({ [field]: value }, stepIndex + 1, questions.length);
    goNext();
  };

  const isSamboOrMarried =
    circumstances.familyStatus === "sambo" ||
    circumstances.familyStatus === "married";

  return (
    <div>
      <div className="mb-10">
        <p className="label-overline mb-3">Steg 2 av 4 — Dina önskemål</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Nu bestämmer du.
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Vem ska få vad? Vi visar konsekvenserna av varje val löpande.
        </p>
      </div>

      {/* mainHeir */}
      {currentQ === "mainHeir" && (
        <QuestionBlock
          key="mainHeir"
          question="Vem ska ärva huvuddelen av det du lämnar efter dig?"
          hint="Skriv ett namn, eller beskriv (t.ex. 'min make', 'mina barn lika')"
        >
          <TextInput
            value={values.mainHeir}
            onChange={(v) => setValues({ ...values, mainHeir: v })}
            onSubmit={() => handleTextSubmit("mainHeir")}
            placeholder={isSamboOrMarried ? "Min partner / mina barn lika" : "Mina barn lika"}
          />
        </QuestionBlock>
      )}

      {/* privateProperty */}
      {currentQ === "privateProperty" && (
        <QuestionBlock
          key="privateProperty"
          question="Vill du att arvet ska vara mottagarens enskilda egendom?"
        >
          <p className="text-sm text-[#6b7280] bg-[#f9f9f9] border border-[#e5e5e5] p-4 mb-5 leading-relaxed">
            <strong className="font-medium text-ink">Vad betyder det?</strong> Det innebär att arvet är skyddat om mottagaren skiljer sig. Pengarna behöver inte delas med en eventuell framtida ex-partner.
          </p>
          <OptionGrid>
            <OptionButton onClick={() => handleBooleanSelect("heirIsPrivateProperty", true)}>
              <span className="font-heading text-base mb-1">Ja, skyddat arv</span>
              <span className="text-xs text-[#6b7280]">Arvet är mottagarens enskilda egendom</span>
            </OptionButton>
            <OptionButton onClick={() => handleBooleanSelect("heirIsPrivateProperty", false)}>
              <span className="font-heading text-base mb-1">Nej, vanligt arv</span>
              <span className="text-xs text-[#6b7280]">Arvet ingår i eventuell bodelning</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* specificItems */}
      {currentQ === "specificItems" && (
        <QuestionBlock
          key="specificItems"
          question="Finns det specifika saker som ska gå till en särskild person?"
          hint="Ett hus, ett smycke, ett föremål med känslomässigt värde. Lämna blankt om inget specifikt."
        >
          <TextInput
            value={values.specificItems}
            onChange={(v) => setValues({ ...values, specificItems: v })}
            onSubmit={() => handleTextSubmit("specificItems")}
            placeholder="T.ex. 'min mors ring till min dotter Anna' eller hoppa över..."
            multiline
            optional
          />
        </QuestionBlock>
      )}

      {/* partnerCanStay */}
      {currentQ === "partnerCanStay" && (
        <QuestionBlock
          key="partnerCanStay"
          question="Vill du att din partner ska kunna bo kvar i hemmet?"
        >
          <p className="text-sm text-[#6b7280] bg-[#f9f9f9] border border-[#e5e5e5] p-4 mb-5 leading-relaxed">
            <strong className="font-medium text-ink">Varför frågar vi?</strong> Dina särkullbarn har rätt att kräva sin laglott direkt när du går bort. Utan testamente kan det betyda att din partner tvingas sälja bostaden. Du kan testamentera din partner nyttjanderätten till hemmet.
          </p>
          <OptionGrid>
            <OptionButton onClick={() => handleBooleanSelect("partnerCanStay", true)}>
              <span className="font-heading text-base mb-1">Ja, min partner ska kunna bo kvar</span>
              <span className="text-xs text-[#6b7280]">Nyttjanderätt till bostaden</span>
            </OptionButton>
            <OptionButton onClick={() => handleBooleanSelect("partnerCanStay", false)}>
              <span className="font-heading text-base mb-1">Nej, inga särskilda villkor</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {/* charity */}
      {currentQ === "charity" && (
        <QuestionBlock
          key="charity"
          question="Vilken organisation vill du testamentera till?"
        >
          <TextInput
            value={values.charityName}
            onChange={(v) => setValues({ ...values, charityName: v })}
            onSubmit={() => {
              onUpdate({ charityName: values.charityName }, stepIndex + 1, questions.length);
              goNext();
            }}
            placeholder="T.ex. Rädda Barnen, Läkare utan gränser..."
          />
          <div className="mt-3">
            <label className="text-sm text-[#4a5568] mb-1 block">Belopp eller andel (valfritt)</label>
            <input
              type="text"
              value={values.charityAmount}
              onChange={(e) => setValues({ ...values, charityAmount: e.target.value })}
              placeholder="T.ex. 50 000 kr eller 10% av kvarlåtenskapen"
              className="w-full border border-[#e5e5e5] px-4 py-3 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors"
              style={{ borderRadius: "3px" }}
            />
          </div>
        </QuestionBlock>
      )}

      {/* executor */}
      {currentQ === "executor" && (
        <QuestionBlock
          key="executor"
          question="Vill du utse en testamentsexekutor?"
          hint="En person du litar på att se till att dina önskemål verkligen följs. Helt frivilligt."
        >
          <p className="text-sm text-[#6b7280] bg-[#f9f9f9] border border-[#e5e5e5] p-4 mb-5 leading-relaxed">
            En testamentsexekutor (på legalsvenska) är helt enkelt en pålitlig person — en vän, ett vuxet barn, en advokat — som ser till att allt sker korrekt. Om du inte anger någon hanteras det av dödsboet.
          </p>
          <TextInput
            value={values.executor}
            onChange={(v) => setValues({ ...values, executor: v })}
            onSubmit={() => {
              onUpdate({ executor: values.executor }, questions.length, questions.length);
              onComplete();
            }}
            placeholder="Namn och relation, eller hoppa över..."
            optional
            submitLabel="Gå vidare"
          />
        </QuestionBlock>
      )}

      {/* Progress dots */}
      <div className="mt-8 flex gap-1.5">
        {questions.map((q, i) => (
          <div
            key={q}
            className={`h-0.5 flex-1 ${i <= stepIndex ? "bg-[#1a2e4a]" : "bg-[#e5e5e5]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  multiline,
  optional,
  submitLabel = "Fortsätt",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  multiline?: boolean;
  optional?: boolean;
  submitLabel?: string;
}) {
  const { isListening, isSupported, interimTranscript, toggleListening } = useVoiceInput({
    onTranscript: (text) => onChange(value ? `${value} ${text}` : text),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full border border-[#e5e5e5] px-4 py-3 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors resize-none"
          style={{ borderRadius: "3px" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full border border-[#e5e5e5] px-4 py-3 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors"
          style={{ borderRadius: "3px" }}
          autoFocus
        />
      )}
      {isListening && interimTranscript && (
        <p className="text-xs text-[#6b7280] italic mt-1">{interimTranscript}</p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button onClick={onSubmit} className="btn-primary text-sm py-2.5 px-5">
          {optional && !value ? "Hoppa över" : submitLabel}
        </button>
        <VoiceButton
          isListening={isListening}
          isSupported={isSupported}
          onToggle={toggleListening}
          interimTranscript=""
        />
      </div>
    </div>
  );
}
