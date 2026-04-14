"use client";

import { useState, useEffect, useCallback } from "react";
import type { WillDraft, GeneratedWill, WillAiTokenUsage } from "@/lib/types";
import { PAYMENT_PRICES } from "@/lib/pricing";
import { buildWillSections } from "@/lib/willTemplate";

interface Props {
  draft: WillDraft;
  onComplete: () => void;
  /** Går tillbaka till testsaments-samtalet för att lägga till fakta */
  onBackToWillChat: () => void;
  /** Köp brev eller öppna brev-chatt om redan betalt */
  onOpenLetterFlow: () => void;
  /** Avsluta brev-samtal permanent (ingen mer AI) */
  onLockPersonalLetter: () => void;
  onWillGenerated?: (generatedWill: GeneratedWill, aiTokenUsage?: WillAiTokenUsage) => void;
}

function templateSectionsToAiShape(draft: WillDraft): Array<{ title: string; text: string }> {
  return buildWillSections(draft).map((s) => {
    const parts: string[] = [];
    if (s.intro) parts.push(s.intro);
    if (s.isBulletList) {
      parts.push(s.lines.map((l) => `• ${l}`).join("\n"));
    } else {
      parts.push(s.lines.join("\n\n"));
    }
    return { title: s.title, text: parts.filter(Boolean).join("\n\n").trim() };
  });
}

function getSectionsForEditing(draft: WillDraft): Array<{ title: string; text: string }> {
  if (draft.generatedWill?.sections?.length) {
    return draft.generatedWill.sections.map((x) => ({ title: x.title, text: x.text }));
  }
  return templateSectionsToAiShape(draft);
}

export function Step3Documents({
  draft,
  onComplete,
  onBackToWillChat,
  onOpenLetterFlow,
  onLockPersonalLetter,
  onWillGenerated,
}: Props) {
  const [letterExpanded, setLetterExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "error">(
    draft.generatedWill ? "idle" : "loading"
  );
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateWill = useCallback(async () => {
    setGenerationState("loading");
    setGenerationError(null);
    try {
      const token = draft.willAccessToken?.trim();
      const res = await fetch("/api/generate-will", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Okänt fel");
      }
      const { aiTokenUsage, sections, generatedAt } = data as GeneratedWill & {
        aiTokenUsage?: WillAiTokenUsage;
      };
      const generatedWill: GeneratedWill = { sections, generatedAt };
      onWillGenerated?.(generatedWill, aiTokenUsage);
      setGenerationState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Något gick fel";
      setGenerationError(msg);
      setGenerationState("error");
    }
  }, [draft, onWillGenerated]);

  useEffect(() => {
    if (!draft.generatedWill) {
      generateWill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const letterBody = draft.personalLetter?.body?.trim() ?? "";
  const hasPaidLetter = !!draft.paidLetter;
  const letterChatLocked = !!draft.personalLetterChatLocked;

  return (
    <div>
      <div className="mb-8">
        <p className="label-overline mb-3">Steg 4 av 4 — Dina dokument</p>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold text-ink leading-tight mb-4">
          Klart att ladda ner.
        </h1>
        <p className="text-[#4a5568] text-base leading-relaxed max-w-lg">
          Nedan ser du dina dokument. Ladda ner testamente som PDF och underteckna med vittnen enligt instruktionerna.
        </p>
      </div>

      <p className="text-xs font-medium uppercase tracking-widest text-[#4a5568] mb-4">
        Dokument 1 — Testamente
      </p>

      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between mb-3 gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#1a2e4a]">
            Förhandsgranskning
          </p>
          {generationState === "idle" && (
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={generateWill}
                className="text-xs text-[#6b7280] underline underline-offset-2 hover:text-[#1a2e4a] hover:no-underline"
              >
                Regenerera
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-xs text-[#1a2e4a] underline underline-offset-2 hover:no-underline"
              >
                Justera testamente
              </button>
            </div>
          )}
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
              type="button"
              onClick={generateWill}
              className="text-sm text-[#1a2e4a] underline underline-offset-2 hover:no-underline"
            >
              Försök igen
            </button>
          </div>
        )}

        {generationState === "idle" && (
          <div className="border border-[#e5e5e5] bg-white shadow-sm">
            <WillHtmlPreview draft={draft} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-10">
        <LegalPDFButton draft={draft} />
        <button
          type="button"
          onClick={onBackToWillChat}
          className="text-sm py-2.5 px-5 border border-[#e5e5e5] text-[#4a5568] hover:border-[#9ca3af] transition-colors"
          style={{ borderRadius: "3px" }}
        >
          Lägg till mer i samtalet
        </button>
      </div>

      {/* Dokument 2 — separat produkt och chatt */}
      <div className="border border-[#e5e5e5] mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-[#4a5568] px-5 pt-5 mb-1">
          Dokument 2 — Personligt brev
        </p>
        {!hasPaidLetter ? (
          <div className="p-5 pt-2">
            <p className="text-sm text-[#4a5568] leading-relaxed mb-4">
              Ett separat samtal med Will hjälper dig skriva ett personligt brev till dina nära — om livet, minnen och
              det du vill förmedla. Det är inte juridiskt bindande. Tilläggstjänst ({PAYMENT_PRICES.letter} kr).
            </p>
            <button type="button" onClick={onOpenLetterFlow} className="btn-primary text-sm py-2.5 px-5">
              Köp personligt brev ({PAYMENT_PRICES.letter} kr) →
            </button>
          </div>
        ) : !letterBody ? (
          <div className="p-5 pt-2">
            <p className="text-sm text-[#4a5568] leading-relaxed mb-4">
              Du har tillgång till brev-samtalet. Öppna det för att börja skriva tillsammans med Will.
            </p>
            <button
              type="button"
              onClick={onOpenLetterFlow}
              disabled={letterChatLocked}
              className="btn-primary text-sm py-2.5 px-5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Öppna brev-samtal
            </button>
          </div>
        ) : letterChatLocked ? (
          <>
            <p className="text-sm text-[#4a5568] px-5 mb-4 leading-relaxed">
              Du har avslutat brev-samtalet. Texten finns kvar — ladda ner PDF vid behov. Du kan inte längre chatta med
              Will om brevet.
            </p>
            <button
              type="button"
              onClick={() => setLetterExpanded(!letterExpanded)}
              className="w-full p-5 pt-0 flex items-start justify-between gap-4 text-left hover:bg-[#f9f9f9] transition-colors"
            >
              <div>
                <span className="text-xs text-[#6b7280] border border-[#e5e5e5] px-2 py-0.5">Förhandsgranskning</span>
                <p className="font-heading text-lg font-semibold mt-2">Brev till mina nära</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
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
            <div className="border-t border-[#e5e5e5] p-4 bg-[#f9f9f9] flex flex-wrap gap-3">
              <PersonalPDFButton draft={draft} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[#4a5568] px-5 mb-4 leading-relaxed">
              Här är ditt brev från brev-samtalet. Ladda ner PDF, fortsätt redigera i chatten, eller avsluta när du är
              färdig — då stängs chattfunktionen.
            </p>
            <button
              type="button"
              onClick={() => setLetterExpanded(!letterExpanded)}
              className="w-full p-5 pt-0 flex items-start justify-between gap-4 text-left hover:bg-[#f9f9f9] transition-colors"
            >
              <div>
                <span className="text-xs text-[#6b7280] border border-[#e5e5e5] px-2 py-0.5">Förhandsgranskning</span>
                <p className="font-heading text-lg font-semibold mt-2">Brev till mina nära</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
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
            <div className="border-t border-[#e5e5e5] p-4 bg-[#f9f9f9] flex flex-wrap gap-3 items-center">
              <PersonalPDFButton draft={draft} />
              <button type="button" onClick={onOpenLetterFlow} className="btn-secondary text-sm py-2.5 px-5">
                Fortsätt i brev-samtal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(
                      "Avsluta brev-samtal? Du kan inte längre skicka meddelanden till Will om brevet. PDF och text sparas."
                    )
                  ) {
                    return;
                  }
                  onLockPersonalLetter();
                }}
                className="text-sm py-2.5 px-5 border border-[#e5e5e5] text-[#4a5568] hover:border-[#9ca3af] transition-colors"
                style={{ borderRadius: "3px" }}
              >
                Jag är färdig — lås brevet
              </button>
            </div>
          </>
        )}
      </div>

      <div className="border border-amber-300 bg-amber-50 p-4 mb-8 flex gap-3">
        <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Detta är en digital kopia — inte ett juridiskt giltigt testamente
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Enligt Ärvdabalken (10 kap 1 §) måste ett testamente{" "}
            <strong>skrivas ut på papper, undertecknas av dig och bevittnas av två oberoende vittnen</strong> som är
            närvarande samtidigt. PDF-versionen är en kopia — den gäller inte som testamente förrän originalet är korrekt
            underskrivet.
          </p>
        </div>
      </div>

      <p className="text-xs text-[#9ca3af] leading-relaxed border-t border-[#e5e5e5] pt-5 mb-8">
        <strong className="text-[#6b7280]">Viktigt att känna till:</strong> Sista Viljan är ett hjälpmedel för att
        sammanställa dina önskemål. Vi är inte jurister och detta utgör inte juridisk rådgivning. Dokumentet lagras
        digitalt som kopia — det juridiska originalet måste förvaras fysiskt med underskrifter. Kontakta en jurist om din
        situation är komplex.
      </p>

      <button type="button" onClick={onComplete} className="btn-primary">
        Gå vidare till signeringsguide →
      </button>

      {editOpen && (
        <WillSectionsEditModal
          draft={draft}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={(sections) => {
            const generatedAt = draft.generatedWill?.generatedAt ?? new Date().toISOString();
            onWillGenerated?.({ sections, generatedAt });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

function WillSectionsEditModal({
  draft,
  open,
  onClose,
  onSave,
}: {
  draft: WillDraft;
  open: boolean;
  onClose: () => void;
  onSave: (sections: Array<{ title: string; text: string }>) => void;
}) {
  const [rows, setRows] = useState(() => getSectionsForEditing(draft));

  useEffect(() => {
    if (open) setRows(getSectionsForEditing(draft));
  }, [open, draft]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-white border border-[#e5e5e5] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg"
        style={{ borderRadius: "3px" }}
      >
        <div className="p-5 border-b border-[#e5e5e5] flex items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold text-ink">Justera testamente</p>
            <p className="text-xs text-[#6b7280] mt-1">
              Redigera texten direkt. Detta ersätter nuvarande förhandsgranskning tills du regenererar.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[#6b7280] hover:text-ink">
            Stäng
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                Rubrik {i + 1}
              </label>
              <input
                type="text"
                value={row.title}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i], title: e.target.value };
                  setRows(next);
                }}
                className="w-full border border-[#e5e5e5] px-3 py-2 text-sm"
                style={{ borderRadius: "3px" }}
              />
              <label className="block text-xs font-medium uppercase tracking-wide text-[#6b7280]">Text</label>
              <textarea
                value={row.text}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i], text: e.target.value };
                  setRows(next);
                }}
                rows={5}
                className="w-full border border-[#e5e5e5] px-3 py-2 text-sm resize-y min-h-[100px]"
                style={{ borderRadius: "3px" }}
              />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-[#e5e5e5] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Avbryt
          </button>
          <button type="button" onClick={() => onSave(rows)} className="btn-primary text-sm">
            Spara ändringar
          </button>
        </div>
      </div>
    </div>
  );
}

function WillHtmlPreview({ draft }: { draft: WillDraft }) {
  const today = new Date().toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const aiSections = draft.generatedWill?.sections;
  const fallbackSections = buildWillSections(draft);

  return (
    <div className="px-8 py-10 font-body text-sm text-ink leading-relaxed max-w-none">
      <div className="text-center mb-8">
        <p className="font-heading text-xl font-semibold tracking-[0.2em] mb-2">TESTAMENTE</p>
        <p className="text-xs text-[#9ca3af]">{today}</p>
      </div>

      <p className="mb-6 text-[0.85rem]">
        Jag,{" "}
        <strong>{draft.testatorName || <span className="text-amber-600">[Namn]</span>}</strong>
        {draft.testatorPersonalNumber?.trim() ? (
          <>
            {" "}
            personnummer <strong>{draft.testatorPersonalNumber.trim()}</strong>
          </>
        ) : null}
        , bosatt på{" "}
        <strong>{draft.testatorAddress || <span className="text-amber-600">[adress]</span>}</strong>, förordnar härmed
        följande:
      </p>

      <div className="space-y-5 mb-8">
        {aiSections ? (
          aiSections.map((s, i) => (
            <div key={i} className="flex gap-4">
              <span className="font-semibold text-[0.85rem] flex-shrink-0 w-5">{i + 1}.</span>
              <div className="flex-1">
                <p className="font-semibold text-[0.85rem] mb-1">{s.title}</p>
                <p className="text-[0.82rem] text-[#374151] whitespace-pre-wrap">{s.text}</p>
              </div>
            </div>
          ))
        ) : (
          fallbackSections.map((s) => (
            <div key={s.number} className="flex gap-4">
              <span className="font-semibold text-[0.85rem] flex-shrink-0 w-5">{s.number}.</span>
              <div className="flex-1">
                <p className="font-semibold text-[0.85rem] mb-1">{s.title}</p>
                {s.intro && <p className="text-[0.82rem] text-[#374151] mb-2">{s.intro}</p>}
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
                    <p key={idx} className="text-[0.82rem] text-[#374151]">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[#e5e5e5] mb-6" />

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

function PersonalLetterPreview({ draft }: { draft: WillDraft }) {
  const body = draft.personalLetter?.body?.trim();
  const name = draft.testatorName || "Avsändaren";

  if (body) {
    return (
      <div className="font-body text-sm text-ink leading-relaxed max-h-96 overflow-y-auto pr-2 space-y-3">
        <div className="pb-3 border-b border-[#e5e5e5]">
          <p className="font-heading text-base font-semibold">Ett brev från {name}</p>
          <p className="text-xs text-[#6b7280] mt-1 italic">
            Detta är inte ett juridiskt dokument — det är en gåva till dem jag älskar.
          </p>
        </div>
        <p className="text-[#374151] whitespace-pre-wrap">{body}</p>
      </div>
    );
  }

  const f = draft.funeralWishes || {};
  const hasFuneral =
    (f.burialForm && f.burialForm !== "no_preference") ||
    f.music ||
    f.clothing ||
    f.speakers ||
    f.location ||
    f.personalMessage;

  if (!hasFuneral) {
    return (
      <p className="text-sm text-[#9ca3af] italic">
        Inget brev är sparat ännu. Fortsätt i brev-samtalet.
      </p>
    );
  }

  return (
    <div className="font-body text-sm text-ink leading-relaxed space-y-4 max-h-80 overflow-y-auto pr-2">
      <div className="pb-3 border-b border-[#e5e5e5]">
        <p className="font-heading text-base font-semibold">Ett brev från {name}</p>
        <p className="text-xs text-[#6b7280] mt-1 italic">Utkast från begravningsönskemål i testsamtalet.</p>
      </div>
      {f.burialForm && f.burialForm !== "no_preference" && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Begravning</p>
          <p>
            Jag önskar {f.burialForm === "burial" ? "jordbegravning" : "kremering"}
            {f.ceremony
              ? ` med ${f.ceremony === "religious" ? "en religiös" : f.ceremony === "civil" ? "en borgerlig" : "en personlig"} ceremoni`
              : ""}
            .
          </p>
        </div>
      )}
      {f.music && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Musik</p>
          <p>{f.music}</p>
        </div>
      )}
      {f.clothing && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Klädsel</p>
          <p>{f.clothing}</p>
        </div>
      )}
      {f.speakers && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Tal</p>
          <p>{f.speakers}</p>
        </div>
      )}
      {f.location && (
        <div>
          <p className="font-medium text-xs uppercase tracking-wide text-[#6b7280] mb-1">Plats</p>
          <p>{f.location}</p>
        </div>
      )}
      {f.personalMessage && (
        <div className="pt-3 border-t border-[#e5e5e5]">
          <p className="font-medium mb-2">Till er jag lämnar efter mig</p>
          <p className="text-[#4a5568] whitespace-pre-wrap">{f.personalMessage}</p>
        </div>
      )}
    </div>
  );
}

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
      type="button"
      onClick={handleDownload}
      disabled={state === "generating"}
      className="btn-primary text-sm py-2.5 px-5 disabled:opacity-60"
    >
      {state === "generating" && "Genererar PDF…"}
      {state === "error" && "Fel — försök igen"}
      {state === "idle" && "⬇️ Ladda ner testamente (PDF)"}
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
      type="button"
      onClick={handleDownload}
      disabled={state === "generating"}
      className="btn-secondary text-sm py-2.5 px-5 disabled:opacity-60"
    >
      {state === "generating" ? "Genererar…" : "⬇️ Ladda ner personligt brev (PDF)"}
    </button>
  );
}
