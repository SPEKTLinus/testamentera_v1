"use client";

import { useState } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceButton } from "../VoiceButton";

interface Props {
  initial: { name?: string; address?: string };
  onComplete: (data: { name: string; address: string }) => void;
}

type Q = "name" | "address";
const QUESTIONS: Q[] = ["name", "address"];

export function StepTestatorInfo({ initial, onComplete }: Props) {
  const [currentQ, setCurrentQ] = useState<Q>("name");
  const [values, setValues] = useState({
    name: initial.name || "",
    address: initial.address || "",
  });

  const stepIndex = QUESTIONS.indexOf(currentQ);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      onComplete({
        name: values.name.trim(),
        address: values.address.trim(),
      });
    } else {
      setCurrentQ(QUESTIONS[nextIndex]);
    }
  };

  const meta: Record<Q, { question: string; hint: string; placeholder: string; pattern?: string }> = {
    name: {
      question: "Vad heter du?",
      hint: "Ditt fullständiga namn som det står i passet eller på ID-handlingen.",
      placeholder: "Förnamn Efternamn",
    },
    address: {
      question: "Var bor du?",
      hint: "Din folkbokföringsadress — gata, postnummer och ort.",
      placeholder: "Storgatan 1, 113 51 Stockholm",
    },
  };

  const current = meta[currentQ];

  return (
    <div>
      <div className="mb-10">
        <p className="label-overline mb-3">Steg 2 av 4 — Dina uppgifter</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Lite om dig
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Vi behöver dina uppgifter för att testamentet ska vara juridiskt giltigt.
        </p>
      </div>

      <div key={currentQ} className="animate-fade-in-up">
        <h2 className="font-heading text-2xl font-semibold text-ink mb-2 leading-snug">
          {current.question}
        </h2>
        <p className="text-sm text-[#6b7280] mb-5">{current.hint}</p>

        <FieldInput
          value={values[currentQ]}
          onChange={(v) => setValues({ ...values, [currentQ]: v })}
          onSubmit={goNext}
          placeholder={current.placeholder}
          pattern={current.pattern}
        />
      </div>

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

function FieldInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  pattern,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  pattern?: string;
}) {
  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onTranscript: (text) => onChange(text),
  });

  const [invalid, setInvalid] = useState(false);

  const handleSubmit = () => {
    if (pattern && !new RegExp(pattern).test(value.trim())) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit();
  };

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setInvalid(false); }}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder={placeholder}
        className={`w-full border px-4 py-3 text-sm text-ink focus:outline-none transition-colors ${
          invalid ? "border-red-400" : "border-[#e5e5e5] focus:border-[#1a2e4a]"
        }`}
        style={{ borderRadius: "3px" }}
        autoFocus
      />
      {invalid && (
        <p className="text-xs text-red-500 mt-1">Kontrollera formatet och försök igen.</p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="btn-primary text-sm py-2.5 px-5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Fortsätt
        </button>
        <VoiceButton isListening={isListening} isSupported={isSupported} onToggle={toggleListening} />
      </div>
    </div>
  );
}
