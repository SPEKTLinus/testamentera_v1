import type { ReactNode } from "react";

/**
 * Will's systemprompt tillåter **fetstil** i markdown. Chatten visar annars asterisker rakt av.
 * Vi tolkar endast omslutande **…** till <strong> (ingen rå HTML från modellen).
 */
export function renderAssistantMarkdown(text: string): ReactNode {
  if (!text.includes("**")) return text;

  const out: ReactNode[] = [];
  const re = /\*\*([\s\S]*?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <strong key={k++} className="font-semibold text-[#1a2433]">
        {m[1]}
      </strong>
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : <>{out}</>;
}
