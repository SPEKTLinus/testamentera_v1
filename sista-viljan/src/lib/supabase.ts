import { createClient } from "@supabase/supabase-js";
import type { WillDraft } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create client if URL is configured
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function saveWillDraft(draft: WillDraft): Promise<string | null> {
  if (!supabase) {
    // Dev mode: store in localStorage
    const id = draft.id || crypto.randomUUID();
    if (typeof window !== "undefined") {
      localStorage.setItem("will_draft", JSON.stringify({ ...draft, id }));
    }
    return id;
  }

  const { data, error } = await supabase
    .from("will_drafts")
    .upsert({
      ...(draft.id ? { id: draft.id } : {}),
      step: draft.step,
      circumstances: draft.circumstances,
      wishes: draft.wishes,
      funeral_wishes: draft.funeralWishes,
      testator_name: draft.testatorName,
      testator_personal_number: draft.testatorPersonalNumber,
      testator_address: draft.testatorAddress,
      partner_name: draft.partnerName,
      paid: draft.paid || false,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving draft:", error);
    return null;
  }

  return data?.id || null;
}

export function loadLocalDraft(): WillDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("will_draft");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalDraft(draft: WillDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("will_draft", JSON.stringify(draft));
}
