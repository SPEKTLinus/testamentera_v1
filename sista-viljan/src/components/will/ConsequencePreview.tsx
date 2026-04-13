import type { Circumstances } from "@/lib/types";
import { getConsequences } from "@/lib/consequences";

interface ConsequencePreviewProps {
  circumstances: Circumstances;
}

export function ConsequencePreview({ circumstances }: ConsequencePreviewProps) {
  const consequences = getConsequences(circumstances);

  return (
    <div className="bg-[#f9f9f9] border border-[#e5e5e5] p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-[#6b7280] mb-5">
        Så här ser det ut för dig
      </p>

      <div className="space-y-5">
        {consequences.map((c, i) => (
          <div key={i} className="animate-fade-in-up">
            <p className="text-sm font-medium text-ink mb-3">{c.title}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#e5e5e5] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] mb-1.5 font-medium">
                  Utan testamente
                </p>
                <p className="text-xs text-[#4a5568] leading-relaxed">{c.current}</p>
              </div>
              <div className="border border-[#1a2e4a] bg-white p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#1a2e4a] mb-1.5 font-medium">
                  Med testamente
                </p>
                <p className="text-xs text-[#0e0e0e] leading-relaxed">{c.withWill}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
