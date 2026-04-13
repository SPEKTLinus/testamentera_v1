"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { WillDraft, GeneratedWill } from "@/lib/types";
import { buildWillSections } from "@/lib/willTemplate";

interface Props {
  draft: WillDraft;
  elapsedMinutes: number;
  onComplete: () => void;
  onEdit: () => void;
  onWillGenerated?: (generatedWill: GeneratedWill) => void;
}

export function Step3Documents({ draft, onComplete, onEdit, onWillGenerated }: Props) {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [letterExpanded, setLetterExpanded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "error">(
    draft.generatedWill ? "idle" : "loading"
  );
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateWill = useCallback(async () => {
    setGenerationState("loading");
    setGenerationError(null);
    try {
      const res = await fetch("/api/generate-will", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Okänt fel");
      }
      const generatedWill: GeneratedWill = await res.json();
      onWillGenerated?.(generatedWill);
      setGenerationState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Något gick fel";
      setGenerationError(msg);
      setGenerationState("error");
    }
  }, [draft, onWillGenerated]);

  // Trigger generation on mount if no will has been generated yet
  useEffect(() => {
    if (!draft.generatedWill) {
      generateWill();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFileName(file.name);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="label-overline mb-3">Steg 4 av 4 — Dina dokument</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Klart att ladda ner.
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Nedan ser du ditt fullständiga testamente. Ladda ner som PDF, skriv ut och underteckna med vittnen.
        </p>
      </div>

      {/* ⚠️ Digital copy disclaimer — prominent */}
      <div className="border border-amber-300 bg-amber-50 p-4 mb-8 flex gap-3">
        <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Detta är en digital kopia — inte ett juridiskt giltigt testamente
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Enligt Ärvdabalken (10 kap 1 §) måste ett testamente{" "}
            <strong>skrivas ut på papper, undertecknas av dig och bevittnas av två oberoende vittnen</strong>{" "}
            som är närvarande samtidigt. Den digitala versionen kan förvaras här som kopia men gäller
            inte som testamente förrän det är korrekt underskrivet.
          </p>
        </div>
      </div>

      {/* Will preview — rendered as document in the browser */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[#1a2e4a]">
            Förhandsgranskning
          </p>
          <div className="flex items-center gap-4">
            {generationState === "idle" && (
              <button
                onClick={generateWill}
                className="text-xs text-[#6b7280] underline underline-offset-2 hover:text-[#1a2e4a] hover:no-underline"
              >
                Regenerera
              </button>
            )}
            <button
              onClick={onEdit}
              className="text-xs text-[#1a2e4a] underline underline-offset-2 hover:no-underline"
            >
              Justera innehåll
            </button>
          </div>
        </div>

        {generationState === "loading" && (
          <div className="border border-[#e5e5e5] bg-white shadow-sm p-12 flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#1a2e4a] opacity-60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-[#6b7280]">Formulerar ditt testamente&hellip;</p>
          </div>
        )}

        {generationState === "error" && (
          <div className="border border-red-200 bg-red-50 p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-red-700 text-center">{generationError}</p>
            <button
              onClick={generateWill}
              className="text-sm text-[#1a2e4a] underline underline-offset-2 hover:no-underline"
            >
              Försök igen
            </button>
          </div>
        )}

        {generationState === "idle" && (
          <div
            ref={printRef}
            className="border border-[#e5e5e5] bg-white shadow-sm print:shadow-none print:border-0"
          >
            <WillHtmlPreview draft={draft} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-10">
        <LegalPDFButton draft={draft} />
        <button
          onClick={handlePrint}
          className="btn-secondary text-sm py-2.5 px-5"
        >
          Skriv ut
        </button>
        <button
          onClick={onEdit}
          className="text-sm py-2.5 px-5 border border-[#e5e5e5] text-[#4a5568] hover:border-[#9ca3af] transition-colors"
          style={{ borderRadius: "3px" }}
        >
          ✏️ Justera testamente
        </button>
      </div>

      {/* Upload signed copy */}
      <div className="border border-[#e5e5e5] p-5 mb-8">
        <p className="font-heading text-base font-semibold mb-1">
          Ladda upp undertecknat testamente
        </p>
        <p className="text-sm text-[#4a5568] mb-4 leading-relaxed">
          När du har skrivit ut och undertecknat testamentet med vittnen kan du ladda upp en
          inskannad kopia här för säker digital förvaring.
        </p>

        {uploadedFileName ? (
          <div className="flex items-center gap-3 p-3 bg-[#f9f9f9] border border-[#e5e5e5]">
            <span className="text-green-600 text-sm">✓</span>
            <span className="text-sm text-ink flex-1 truncate">{uploadedFileName}</span>
            <button
              onClick={() => setUploadedFileName(null)}
              className="text-xs text-[#6b7280] hover:text-ink"
            >
              Ta bort
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="border border-dashed border-[#9ca3af] group-hover:border-[#1a2e4a] transition-colors p-4 flex-1 text-center">
              <p className="text-sm text-[#4a5568]">
                Klicka för att välja fil{" "}
                <span className="text-[#9ca3af]">(PDF, JPG, PNG)</span>
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleUpload}
              className="sr-only"
            />
          </label>
        )}

        <p className="text-xs text-[#9ca3af] mt-2">
          Filen lagras lokalt på din enhet och laddas inte upp till någon server.
        </p>
      </div>

      {/* Personal letter — collapsible */}
      <div className="border border-[#e5e5e5] mb-10">
        <button
          onClick={() => setLetterExpanded(!letterExpanded)}
          className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-[#f9f9f9] transition-colors"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-medium uppercase tracking-widest text-[#4a5568]">
                Dokument 2
              </span>
              <span className="text-xs text-[#6b7280] border border-[#e5e5e5] px-2 py-0.5">
                Personligt
              </span>
            </div>
            <p className="font-heading text-lg font-semibold">Brev till mina nära</p>
            <p className="text-sm text-[#6b7280] mt-1">
              Dina begravningsönskemål och personliga ord. Inte juridiskt — men kanske viktigast.
            </p>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`flex-shrink-0 mt-1 transition-transform ${letterExpanded ? "rotate-180" : ""}`}
          >
            <path d="M3 6L8 11L13 6" stroke="#0e0e0e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {letterExpanded && (
          <div className="border-t border-[#e5e5e5] p-5">
            <PersonalLetterPreview draft={draft} />
          </div>
        )}

        <div className="border-t border-[#e5e5e5] p-4 bg-[#f9f9f9]">
          <PersonalPDFButton draft={draft} />
        </div>
      </div>

      {/* Disclaimer footer */}
      <p className="text-xs text-[#9ca3af] leading-relaxed border-t border-[#e5e5e5] pt-5 mb-8">
        <strong className="text-[#6b7280]">Viktigt att känna till:</strong> Sista Viljan är ett
        hjälpmedel för att sammanställa dina önskemål. Vi är inte jurister och detta utgör inte
        juridisk rådgivning. Dokumentet lagras digitalt som kopia — det juridiska originalet måste
        förvaras fysiskt med underskrifter. Kontakta en jurist om din situation är komplex.
      </p>

      {/* Next step */}
      <button onClick={onComplete} className="btn-primary">
        Gå vidare till signeringsguide →
      </button>
    </div>
  );
}

/* ─── Inline HTML will preview ─────────────────────────────────────── */

function WillHtmlPreview({ draft }: { draft: WillDraft }) {
  const today = new Date().toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Use AI-generated sections if available, otherwise fall back to template
  const aiSections = draft.generatedWill?.sections;
  const fallbackSections = buildWillSections(draft);

  return (
    <div className="px-8 py-10 font-body text-sm text-ink leading-relaxed max-w-none">
      {/* Title */}
      <div className="text-center mb-8">
        <p className="font-heading text-xl font-semibold tracking-[0.2em] mb-2">TESTAMENTE</p>
        <p className="text-xs text-[#9ca3af]">{today}</p>
      </div>

      {/* Preamble */}
      <p className="mb-6 text-[0.85rem]">
        Jag,{" "}
        <strong>{draft.testatorName || <span className="text-amber-600">[Namn]</span>}</strong>{" "}
        personnummer{" "}
        <strong>
          {draft.testatorPersonalNumber || <span className="text-amber-600">[personnummer]</span>}
        </strong>
        , bosatt på{" "}
        <strong>
          {draft.testatorAddress || <span className="text-amber-600">[adress]</span>}
        </strong>
        , förordnar härmed följande:
      </p>

      {/* Numbered sections — AI-generated preferred, template fallback */}
      <div className="space-y-5 mb-8">
        {aiSections ? (
          aiSections.map((s, i) => (
            <div key={i} className="flex gap-4">
              <span className="font-semibold text-[0.85rem] flex-shrink-0 w-5">{i + 1}.</span>
              <div className="flex-1">
                <p className="font-semibold text-[0.85rem] mb-1">{s.title}</p>
                <p className="text-[0.82rem] text-[#374151]">{s.text}</p>
              </div>
            </div>
          ))
        ) : (
          fallbackSections.map((s) => (
            <div key={s.number} className="flex gap-4">
              <span className="font-semibold text-[0.85rem] flex-shrink-0 w-5">{s.number}.</span>
              <div className="flex-1">
                <p className="font-semibold text-[0.85rem] mb-1">{s.title}</p>
                {s.intro && (
                  <p className="text-[0.82rem] text-[#374151] mb-2">{s.intro}</p>
                )}
                {s.isBulletList ? (
                  <ul className="space-y-0.5 ml-1">
                    {s.lines.map((line, idx) => (
                      <li key={idx} className="flex gap-2 text-[0.82rem] text-[#374151]">
                        <span className="flex-shrink-0 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  s.lines.map((line, idx) => (
                    <p key={idx} className="text-[0.82rem] text-[#374151]">{line}</p>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>


      <div className="border-t border-[#e5e5e5] mb-6" />

      {/* Digital disclaimer inside document */}
      <div className="bg-amber-50 border border-amber-200 px-4 py-2 mb-6 text-[0.7rem] text-amber-800 text-center">
        Digital kopia för förvaring — juridiskt giltigt först efter utskrift och underskrift av testatorn samt två vittnen (ÄB 10:1)
      </div>

      {/* Signature blocks */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <div className="border-b border-[#0e0e0e] mb-1 pb-5" />
          <p className="text-xs text-[#6b7280]">
            {draft.testatorName ? draft.testatorName : "Testators namnteckning"}
          </p>
        </div>
        <div>
          <div className="border-b border-[#0e0e0e] mb-1 pb-5" />
          <p className="text-xs text-[#6b7280]">Ort och datum</p>
        </div>
      </div>

      {/* Witnesses */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-4">
        Vittnen
      </p>
      <div className="grid grid-cols-2 gap-8">
        {[1, 2].map((n) => (
          <div key={n} className="space-y-3">
            <p className="text-xs font-medium text-ink">Vittne {n}</p>
            {["Namnteckning", "Namnförtydligande och personnummer", "Bostadsadress"].map((lbl) => (
              <div key={lbl}>
                <div className="border-b border-[#d1d5db] pb-4 mb-1" />
                <p className="text-[0.65rem] text-[#9ca3af]">{lbl}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Personal letter preview ───────────────────────────────────────── */

function PersonalLetterPreview({ draft }: { draft: WillDraft }) {
  const f = draft.funeralWishes || {};
  const name = draft.testatorName || "Avsändaren";

  const hasContent =
    (f.burialForm && f.burialForm !== "no_preference") ||
    f.music || f.clothing || f.speakers || f.location || f.personalMessage;

  if (!hasContent) {
    return (
      <p className="text-sm text-[#9ca3af] italic">
        Inga begravningsönskemål eller personligt meddelande har lagts till ännu.
      </p>
    );
  }

  return (
    <div className="font-body text-sm text-ink leading-relaxed space-y-4 max-h-80 overflow-y-auto pr-2">
      <div className="pb-3 border-b border-[#e5e5e5]">
        <p className="font-heading text-base font-semibold">Ett brev från {name}</p>
        <p className="text-xs text-[#6b7280] mt-1 italic">
          Detta är inte ett juridiskt dokument — det är en gåva till dem jag älskar.
        </p>
      </div>
      {f.burialForm && f.burialForm !== "no_preference" && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Begravning</p>
          <p>
            Jag önskar {f.burialForm === "burial" ? "jordbegravning" : "kremering"}
            {f.ceremony ? ` med ${f.ceremony === "religious" ? "en religiös" : f.ceremony === "civil" ? "en borgerlig" : "en personlig"} ceremoni` : ""}.
          </p>
        </div>
      )}
      {f.music && <div><p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Musik</p><p>{f.music}</p></div>}
      {f.clothing && <div><p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Klädsel</p><p>{f.clothing}</p></div>}
      {f.speakers && <div><p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Tal</p><p>{f.speakers}</p></div>}
      {f.location && <div><p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Plats</p><p>{f.location}</p></div>}
      {f.personalMessage && (
        <div className="pt-3 border-t border-[#e5e5e5]">
          <p className="font-medium mb-2">Till er jag lämnar efter mig</p>
          <p className="text-[#4a5568] whitespace-pre-wrap">{f.personalMessage}</p>
        </div>
      )}
    </div>
  );
}

/* ─── PDF download buttons ──────────────────────────────────────────── */

function LegalPDFButton({ draft }: { draft: WillDraft }) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");

  const handleDownload = async () => {
    setState("generating");
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { LegalWillDocument } = await import("@/components/pdf/LegalWillDocument");
      const { default: React } = await import("react");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(LegalWillDocument, { draft }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "testamente.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={state === "generating"}
      className="btn-primary text-sm py-2.5 px-5 disabled:opacity-60"
    >
      {state === "generating" && "Genererar PDF…"}
      {state === "error" && "Fel — försök igen"}
      {state === "idle" && "⬇ Ladda ner testamente (PDF)"}
    </button>
  );
}

function PersonalPDFButton({ draft }: { draft: WillDraft }) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");

  const handleDownload = async () => {
    setState("generating");
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { PersonalLetterDocument } = await import("@/components/pdf/PersonalLetterDocument");
      const { default: React } = await import("react");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(PersonalLetterDocument, { draft }) as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "brev-till-mina-nara.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={state === "generating"}
      className="btn-secondary text-sm py-2.5 px-5 disabled:opacity-60"
    >
      {state === "generating" ? "Genererar…" : "⬇ Ladda ner personligt brev (PDF)"}
    </button>
  );
}
