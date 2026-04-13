import type { Circumstances, WillDraft } from "./types";

const PN_REGEX = /^\d{8}-\d{4}$/;

/** Migration: tidigare ingick brev i samma köp om wantsPersonalLetter var true. */
export function migrateWillDraft(draft: WillDraft): WillDraft {
  if (draft.paid && draft.wantsPersonalLetter === true && !draft.paidLetter) {
    return { ...draft, paidLetter: true };
  }
  return draft;
}

export function needsPartnerStayQuestion(draft: WillDraft): boolean {
  const c = draft.circumstances;
  return (
    (c.familyStatus === "married" || c.familyStatus === "sambo") &&
    (c.childrenStatus === "from_previous" || c.childrenStatus === "both")
  );
}

export function needsCharityWishes(draft: WillDraft): boolean {
  return draft.circumstances.outsideFamily === "charity";
}

const INTAKE_CHECKS: Array<(d: WillDraft) => boolean> = [
  (d) => !!d.testatorName?.trim(),
  (d) => !!d.testatorPersonalNumber?.trim() && PN_REGEX.test(d.testatorPersonalNumber.trim()),
  (d) => !!d.testatorAddress?.trim(),
  (d) => !!d.circumstances.willType,
  (d) => !!d.circumstances.familyStatus,
  (d) => !!d.circumstances.childrenStatus,
  (d) => Array.isArray(d.circumstances.assets) && (d.circumstances.assets?.length ?? 0) > 0,
  (d) => !!d.circumstances.outsideFamily,
  (d) => !!d.wishes.mainHeir?.trim(),
  (d) => typeof d.wishes.heirIsPrivateProperty === "boolean",
  (d) => (needsPartnerStayQuestion(d) ? typeof d.wishes.partnerCanStay === "boolean" : true),
  (d) => (needsCharityWishes(d) ? !!d.wishes.charityName?.trim() : true),
  (d) => !!d.wishes.executor?.trim(),
  (d) => !!d.funeralWishes.burialForm,
  (d) => !!d.funeralWishes.ceremony,
];

export function getIntakeProgressPercent(draft: WillDraft): number {
  const done = INTAKE_CHECKS.filter((f) => f(draft)).length;
  return Math.min(95, Math.round((done / INTAKE_CHECKS.length) * 95));
}

export function isIntakeComplete(draft: WillDraft): boolean {
  return INTAKE_CHECKS.every((f) => f(draft));
}

/** Del 1 = du & familj, 2 = arv, 3 = begravning */
export function getIntakeStage(draft: WillDraft): 1 | 2 | 3 {
  const c = draft.circumstances;
  if (
    !draft.testatorName?.trim() ||
    !draft.testatorPersonalNumber?.trim() ||
    !draft.testatorAddress?.trim()
  ) {
    return 1;
  }
  if (
    !c.willType ||
    !c.familyStatus ||
    !c.childrenStatus ||
    !c.assets?.length ||
    !c.outsideFamily
  ) {
    return 1;
  }
  if (
    !draft.wishes.mainHeir?.trim() ||
    typeof draft.wishes.heirIsPrivateProperty !== "boolean" ||
    !draft.wishes.executor?.trim()
  ) {
    return 2;
  }
  if (needsPartnerStayQuestion(draft) && typeof draft.wishes.partnerCanStay !== "boolean") {
    return 2;
  }
  if (needsCharityWishes(draft) && !draft.wishes.charityName?.trim()) {
    return 2;
  }
  return 3;
}

function isWillType(v: unknown): v is Circumstances["willType"] {
  return v === "own" || v === "joint";
}
function isFamilyStatus(v: unknown): v is Circumstances["familyStatus"] {
  return (
    v === "married" ||
    v === "sambo" ||
    v === "single" ||
    v === "divorced" ||
    v === "widowed"
  );
}
function isChildrenStatus(v: unknown): v is Circumstances["childrenStatus"] {
  return v === "none" || v === "joint" || v === "from_previous" || v === "both";
}
function isAsset(v: unknown): v is NonNullable<Circumstances["assets"]>[number] {
  return (
    v === "residence" ||
    v === "vacation_home" ||
    v === "business" ||
    v === "securities" ||
    v === "none"
  );
}
function isOutsideFamily(v: unknown): v is Circumstances["outsideFamily"] {
  return v === "person" || v === "charity" || v === "none";
}

/** Normalizes and merges one model extraction turn into the draft */
export function mergeWillChatExtraction(
  draft: WillDraft,
  raw: Record<string, unknown> | null
): WillDraft {
  if (!raw) return draft;

  const next: WillDraft = {
    ...draft,
    circumstances: { ...draft.circumstances },
    wishes: { ...draft.wishes },
    funeralWishes: { ...draft.funeralWishes },
  };

  if (typeof raw.testatorName === "string") next.testatorName = raw.testatorName;
  if (typeof raw.testatorPersonalNumber === "string") {
    next.testatorPersonalNumber = raw.testatorPersonalNumber.replace(/\s/g, "");
  }
  if (typeof raw.testatorAddress === "string") next.testatorAddress = raw.testatorAddress;

  const testator = raw.testator;
  if (testator && typeof testator === "object" && !Array.isArray(testator)) {
    const t = testator as Record<string, unknown>;
    if (typeof t.name === "string") next.testatorName = t.name;
    if (typeof t.personalNumber === "string") {
      next.testatorPersonalNumber = t.personalNumber.replace(/\s/g, "");
    }
    if (typeof t.address === "string") next.testatorAddress = t.address;
  }

  const c = raw.circumstances;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    const o = c as Record<string, unknown>;
    if (isWillType(o.willType)) next.circumstances.willType = o.willType;
    if (isFamilyStatus(o.familyStatus)) next.circumstances.familyStatus = o.familyStatus;
    if (isChildrenStatus(o.childrenStatus)) next.circumstances.childrenStatus = o.childrenStatus;
    if (Array.isArray(o.assets) && o.assets.every(isAsset)) {
      next.circumstances.assets = o.assets;
    }
    if (isOutsideFamily(o.outsideFamily)) next.circumstances.outsideFamily = o.outsideFamily;
  }

  const w = raw.wishes;
  if (w && typeof w === "object" && !Array.isArray(w)) {
    const o = w as Record<string, unknown>;
    if (typeof o.mainHeir === "string") next.wishes.mainHeir = o.mainHeir;
    if (typeof o.specificItems === "string") next.wishes.specificItems = o.specificItems;
    if (typeof o.charityName === "string") next.wishes.charityName = o.charityName;
    if (typeof o.charityAmount === "string") next.wishes.charityAmount = o.charityAmount;
    if (typeof o.executor === "string") next.wishes.executor = o.executor;
    if (typeof o.heirIsPrivateProperty === "boolean") {
      next.wishes.heirIsPrivateProperty = o.heirIsPrivateProperty;
    }
    if (typeof o.partnerCanStay === "boolean") {
      next.wishes.partnerCanStay = o.partnerCanStay;
    }
  }

  const f = raw.funeralWishes;
  if (f && typeof f === "object" && !Array.isArray(f)) {
    const o = f as Record<string, unknown>;
    if (o.burialForm === "burial" || o.burialForm === "cremation" || o.burialForm === "no_preference") {
      next.funeralWishes.burialForm = o.burialForm;
    }
    if (o.ceremony === "religious" || o.ceremony === "civil" || o.ceremony === "own") {
      next.funeralWishes.ceremony = o.ceremony;
    }
    if (typeof o.music === "string") next.funeralWishes.music = o.music;
    if (typeof o.clothing === "string") next.funeralWishes.clothing = o.clothing;
    if (o.flowersOrCharity === "flowers" || o.flowersOrCharity === "charity" || o.flowersOrCharity === "charity_name") {
      next.funeralWishes.flowersOrCharity = o.flowersOrCharity;
    }
    if (typeof o.charityName === "string") next.funeralWishes.charityName = o.charityName;
    if (typeof o.speakers === "string") next.funeralWishes.speakers = o.speakers;
    if (typeof o.location === "string") next.funeralWishes.location = o.location;
    if (typeof o.personalMessage === "string") next.funeralWishes.personalMessage = o.personalMessage;
  }

  return next;
}
