import { createClient } from "@supabase/supabase-js";
import type { WillDraft } from "./types";
import { toE164Digits } from "./phone";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create client if URL is configured
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Legacy single-key storage (before phone-scoped drafts). */
const LEGACY_LOCAL_DRAFT_KEY = "will_draft";

export function localDraftStorageKey(e164: string): string {
  return `will_draft:${e164}`;
}

function readScopedRaw(e164: string): WillDraft | null {
  const scopedRaw = localStorage.getItem(localDraftStorageKey(e164));
  if (!scopedRaw) return null;
  try {
    return JSON.parse(scopedRaw) as WillDraft;
  } catch {
    return null;
  }
}

function saveLocalDraftToScoped(draft: WillDraft, e164: string): void {
  localStorage.setItem(localDraftStorageKey(e164), JSON.stringify(draft));
}

function maybeClearLegacyAfterScopedSave(phone: string): void {
  const legacyRaw = localStorage.getItem(LEGACY_LOCAL_DRAFT_KEY);
  if (!legacyRaw) return;
  try {
    const l = JSON.parse(legacyRaw) as WillDraft;
    const lp = l.verifiedPhone ? toE164Digits(l.verifiedPhone) : null;
    if (!lp || lp === phone) localStorage.removeItem(LEGACY_LOCAL_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Load draft for this normalized phone only. Legacy `will_draft` is migrated
 * if its verifiedPhone matches; otherwise it is ignored (another user on a shared device).
 */
export function loadLocalDraftForPhone(e164: string): WillDraft | null {
  if (typeof window === "undefined" || !e164?.trim()) return null;

  const scoped = readScopedRaw(e164);
  if (scoped) return scoped;

  const legacyRaw = localStorage.getItem(LEGACY_LOCAL_DRAFT_KEY);
  if (!legacyRaw) return null;

  let legacy: WillDraft;
  try {
    legacy = JSON.parse(legacyRaw) as WillDraft;
  } catch {
    return null;
  }

  const legacyPn = legacy.verifiedPhone ? toE164Digits(legacy.verifiedPhone) : null;
  if (legacyPn === e164) {
    saveLocalDraftToScoped(legacy, e164);
    localStorage.removeItem(LEGACY_LOCAL_DRAFT_KEY);
    return legacy;
  }

  if (legacyPn && legacyPn !== e164) {
    return null;
  }

  // Legacy without verifiedPhone: do not auto-bind to whoever verifies (shared PC risk).
  return null;
}

/** Persist draft under `will_draft:<phone>`. No-op if verifiedPhone is missing. */
export function saveLocalDraft(draft: WillDraft): void {
  if (typeof window === "undefined") return;
  const phone = draft.verifiedPhone ? toE164Digits(draft.verifiedPhone) : null;
  if (!phone) return;
  saveLocalDraftToScoped(draft, phone);
  maybeClearLegacyAfterScopedSave(phone);
}

/**
 * @deprecated Prefer loadLocalDraftForPhone(sessionPhone). Reads legacy key only.
 */
export function loadLocalDraft(): WillDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LEGACY_LOCAL_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WillDraft;
  } catch {
    return null;
  }
}

export async function saveWillDraft(draft: WillDraft): Promise<string | null> {
  if (!supabase) {
    const id = draft.id || crypto.randomUUID();
    const withId = { ...draft, id } as WillDraft;
    if (typeof window !== "undefined") {
      const phone = withId.verifiedPhone ? toE164Digits(withId.verifiedPhone) : null;
      if (phone) {
        saveLocalDraft(withId);
      } else {
        localStorage.setItem(LEGACY_LOCAL_DRAFT_KEY, JSON.stringify(withId));
      }
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
