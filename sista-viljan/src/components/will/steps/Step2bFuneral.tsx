"use client";

import { useState } from "react";
import type { FuneralWishes } from "@/lib/types";
import { VoiceButton } from "../VoiceButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { QuestionBlock, OptionGrid, OptionButton } from "./Step1Circumstances";

interface Props {
  funeralWishes: FuneralWishes;
  testatorName?: string;
  onUpdate: (f: Partial<FuneralWishes>, sub: number, total: number) => void;
  onComplete: () => void;
}

type Q =
  | "burialForm"
  | "ceremony"
  | "music"
  | "clothing"
  | "flowers"
  | "speakers"
  | "location"
  | "personalMessage";

const QUESTIONS: Q[] = [
  "burialForm",
  "ceremony",
  "music",
  "clothing",
  "flowers",
  "speakers",
  "location",
  "personalMessage",
];

export function Step2bFuneral({ funeralWishes, testatorName, onUpdate, onComplete }: Props) {
  const [currentQ, setCurrentQ] = useState<Q>("burialForm");
  const [values, setValues] = useState({
    music: funeralWishes.music || "",
    clothing: funeralWishes.clothing || "",
    charityName: funeralWishes.charityName || "",
    speakers: funeralWishes.speakers || "",
    location: funeralWishes.location || "",
    personalMessage: funeralWishes.personalMessage || "",
  });

  const stepIndex = QUESTIONS.indexOf(currentQ);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      onComplete();
    } else {
      setCurrentQ(QUESTIONS[nextIndex]);
      onUpdate({}, nextIndex, QUESTIONS.length);
    }
  };

  const handleSelect = (update: Partial<FuneralWishes>) => {
    onUpdate(update, stepIndex + 1, QUESTIONS.length);
    goNext();
  };

  return (
    <div>
      <div className="mb-10">
        <p className="label-overline mb-3">Steg 3 av 4 — Dina önskemål om begravningen</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Nu till det som verkligen<br />
          <span className="italic font-normal">betyder något.</span>
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Det juridiska är klart. Det här är din chans att berätta hur du vill bli ihågkommen — och spara dina nära från att behöva gissa.
        </p>
      </div>

      {currentQ === "burialForm" && (
        <QuestionBlock key="burialForm" question="Begravningsform">
          <OptionGrid cols={3}>
            <OptionButton onClick={() => handleSelect({ burialForm: "burial" })}>
              <span className="font-heading text-base">Jordbegravning</span>
            </OptionButton>
            <OptionButton onClick={() => handleSelect({ burialForm: "cremation" })}>
              <span className="font-heading text-base">Kremering</span>
            </OptionButton>
            <OptionButton onClick={() => handleSelect({ burialForm: "no_preference" })}>
              <span className="font-heading text-base">Ingen preferens</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {currentQ === "ceremony" && (
        <QuestionBlock key="ceremony" question="Ceremoni">
          <OptionGrid cols={3}>
            <OptionButton onClick={() => handleSelect({ ceremony: "religious" })}>
              <span className="font-heading text-base mb-1">Religiös</span>
              <span className="text-xs text-[#6b7280]">I kyrka eller annan trossamfund</span>
            </OptionButton>
            <OptionButton onClick={() => handleSelect({ ceremony: "civil" })}>
              <span className="font-heading text-base mb-1">Borgerlig</span>
              <span className="text-xs text-[#6b7280]">Utan religiösa inslag</span>
            </OptionButton>
            <OptionButton onClick={() => handleSelect({ ceremony: "own" })}>
              <span className="font-heading text-base mb-1">Eget</span>
              <span className="text-xs text-[#6b7280]">Jag beskriver nedan</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {currentQ === "music" && (
        <QuestionBlock
          key="music"
          question="Vad ska spelas när folk minns dig?"
          hint="Specifika låtar, artister, eller en genre. Röstinmatning rekommenderas."
        >
          <LargeTextInput
            value={values.music}
            onChange={(v) => setValues({ ...values, music: v })}
            onSubmit={() => {
              onUpdate({ music: values.music }, stepIndex + 1, QUESTIONS.length);
              goNext();
            }}
            placeholder="T.ex. 'Sinatras My Way' eller 'klassisk musik, inte för sorgetung'..."
            optional
          />
        </QuestionBlock>
      )}

      {currentQ === "clothing" && (
        <QuestionBlock
          key="clothing"
          question="Klädsel"
          hint="Formellt, ledigt, en specifik färg eller ett specifikt plagg?"
        >
          <LargeTextInput
            value={values.clothing}
            onChange={(v) => setValues({ ...values, clothing: v })}
            onSubmit={() => {
              onUpdate({ clothing: values.clothing }, stepIndex + 1, QUESTIONS.length);
              goNext();
            }}
            placeholder="T.ex. 'min blå kostym', 'ledigt och bekvämt', 'min favoritkofta'..."
            optional
          />
        </QuestionBlock>
      )}

      {currentQ === "flowers" && (
        <QuestionBlock key="flowers" question="Blommor eller insamling?">
          <OptionGrid cols={2}>
            <OptionButton onClick={() => handleSelect({ flowersOrCharity: "flowers" })}>
              <span className="font-heading text-base mb-1">Blommor</span>
              <span className="text-xs text-[#6b7280]">Traditionellt blomsterbud</span>
            </OptionButton>
            <OptionButton onClick={() => handleSelect({ flowersOrCharity: "charity" })}>
              <span className="font-heading text-base mb-1">Insamling istället</span>
              <span className="text-xs text-[#6b7280]">Pengarna går till välgörenhet</span>
            </OptionButton>
          </OptionGrid>
        </QuestionBlock>
      )}

      {currentQ === "speakers" && (
        <QuestionBlock
          key="speakers"
          question="Vem ska hålla tal?"
          hint="Namn, relation, och om du vill — vad du önskar att de säger."
        >
          <LargeTextInput
            value={values.speakers}
            onChange={(v) => setValues({ ...values, speakers: v })}
            onSubmit={() => {
              onUpdate({ speakers: values.speakers }, stepIndex + 1, QUESTIONS.length);
              goNext();
            }}
            placeholder="T.ex. 'min bror Erik, han vet vad han ska säga' eller 'ingen formell minnesteckning'..."
            optional
          />
        </QuestionBlock>
      )}

      {currentQ === "location" && (
        <QuestionBlock
          key="location"
          question="Har du önskemål om var ceremonin ska hållas?"
        >
          <LargeTextInput
            value={values.location}
            onChange={(v) => setValues({ ...values, location: v })}
            onSubmit={() => {
              onUpdate({ location: values.location }, stepIndex + 1, QUESTIONS.length);
              goNext();
            }}
            placeholder="T.ex. 'Katarina kyrka i Stockholm' eller 'nära havet, gärna utomhus'..."
            optional
          />
        </QuestionBlock>
      )}

      {currentQ === "personalMessage" && (
        <QuestionBlock
          key="personalMessage"
          question="Vad vill du att dina nära ska veta?"
        >
          <p className="text-[#4a5568] text-sm leading-relaxed bg-[#f9f9f9] border border-[#e5e5e5] p-4 mb-5">
            Det finns inga regler här. Kärlek, tacksamhet, ursäkter, historier. Det som är viktigt att de vet — men kanske aldrig frågat.
            <br /><br />
            <span className="italic text-[#6b7280]">Det här är din gåva till dem du lämnar efter dig.</span>
          </p>
          <PersonalMessageInput
            value={values.personalMessage}
            onChange={(v) => setValues({ ...values, personalMessage: v })}
            onSubmit={() => {
              onUpdate({ personalMessage: values.personalMessage }, QUESTIONS.length, QUESTIONS.length);
              onComplete();
            }}
            testatorName={testatorName}
          />
        </QuestionBlock>
      )}

      {/* Progress */}
      <div className="mt-8 flex gap-1.5">
        {QUESTIONS.map((q, i) => (
          <div
            key={q}
            className={`h-0.5 flex-1 ${i <= stepIndex ? "bg-[#1a2e4a]" : "bg-[#e5e5e5]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function LargeTextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  optional,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  optional?: boolean;
}) {
  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onTranscript: (text) => onChange(value ? `${value} ${text}` : text),
    continuous: true,
  });

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full border border-[#e5e5e5] px-4 py-3 text-sm text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors resize-none"
        style={{ borderRadius: "3px" }}
      />
      <div className="flex items-center gap-3 mt-3">
        <button onClick={onSubmit} className="btn-primary text-sm py-2.5 px-5">
          {optional && !value ? "Hoppa över" : "Fortsätt"}
        </button>
        <VoiceButton isListening={isListening} isSupported={isSupported} onToggle={toggleListening} />
      </div>
    </div>
  );
}

function PersonalMessageInput({
  value,
  onChange,
  onSubmit,
  testatorName,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  testatorName?: string;
}) {
  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onTranscript: (text) => onChange(value ? `${value} ${text}` : text),
    continuous: true,
  });

  return (
    <div>
      {isSupported && (
        <div className="mb-4 p-4 border border-[#e5e5e5] bg-[#f9f9f9] flex items-center justify-between">
          <span className="text-sm text-[#4a5568]">
            Prata direkt — det kan vara lättare än att skriva.
          </span>
          <VoiceButton isListening={isListening} isSupported={isSupported} onToggle={toggleListening} />
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Skriv fritt. Det finns ingen rätt eller fel längd."
        rows={10}
        className="w-full border border-[#e5e5e5] px-5 py-4 text-base text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors resize-none font-body leading-relaxed"
        style={{ borderRadius: "3px" }}
        autoFocus
      />
      <div className="flex items-center gap-3 mt-4">
        <button onClick={onSubmit} className="btn-primary py-3 px-6">
          {!value ? "Hoppa över" : "Jag är klar"}
        </button>
      </div>
    </div>
  );
}
