import type {
  ChildEntry,
  Circumstances,
  FuneralWishes,
  InheritanceDistribution,
  NonChildBeneficiary,
  WillDraft,
} from "./types";
import {
  collectIntakeGaps,
  getIntakeProgressApprox,
  isIntakeCompleteByTree,
  needsInheritanceDistributionQuestion,
} from "./intakeDecisionTree";

/** Migration: tidigare ingick brev i samma köp om wantsPersonalLetter var true. */
export function migrateWillDraft(draft: WillDraft): WillDraft {
  let next: WillDraft = { ...draft };
  if (next.paid && next.wantsPersonalLetter === true && !next.paidLetter) {
    next = { ...next, paidLetter: true };
  }

  const legacyShapeComplete =
    !!next.testatorName?.trim() &&
    !!next.testatorAddress?.trim() &&
    !!next.circumstances.willType &&
    !next.circumstances.willForm &&
    !!next.circumstances.familyStatus &&
    !!next.circumstances.childrenStatus &&
    Array.isArray(next.circumstances.assets) &&
    next.circumstances.assets.length > 0 &&
    !!next.circumstances.outsideFamily &&
    !!next.wishes.mainHeir?.trim() &&
    typeof next.wishes.heirIsPrivateProperty === "boolean" &&
    !!next.wishes.executor?.trim() &&
    !!next.funeralWishes.burialForm &&
    !!next.funeralWishes.ceremony;

  if (legacyShapeComplete) {
    if (typeof next.previousWillsExist !== "boolean") {
      next = { ...next, previousWillsExist: false };
    }
    if (typeof next.minorBeneficiaries !== "boolean") {
      next = { ...next, minorBeneficiaries: false };
    }
    if (needsInheritanceDistributionQuestion(next) && !next.inheritanceDistribution) {
      next = { ...next, inheritanceDistribution: "equal" };
    }
  }

  return next;
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

export function isIntakeComplete(draft: WillDraft): boolean {
  return isIntakeCompleteByTree(draft);
}

/** Korta svenska rubriker för det som saknas (betalningsgrind). */
export function getIntakeIncompleteSummaries(draft: WillDraft): string[] {
  return collectIntakeGaps(draft);
}

export function getIntakeProgressPercent(draft: WillDraft): number {
  return getIntakeProgressApprox(draft);
}

/** Visa primär CTA (betalning/dokument): alla fält OK eller Will markerat insamling klar. */
export function shouldShowIntakeContinueCta(draft: WillDraft): boolean {
  return isIntakeComplete(draft) || draft.intakeMarkedComplete === true;
}

/** Del 1 = du & familj, 2 = arv, 3 = begravning */
export function getIntakeStage(draft: WillDraft): 1 | 2 | 3 {
  const c = draft.circumstances;
  if (
    !draft.testatorName?.trim() ||
    !draft.testatorAddress?.trim() ||
    !(c.willForm || c.willType) ||
    typeof draft.previousWillsExist !== "boolean" ||
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
function isWillFormVariant(v: unknown): v is NonNullable<Circumstances["willForm"]> {
  return v === "individual" || v === "joint_cohabitants" || v === "joint_spouses";
}
function coerceInheritanceDistribution(v: unknown): InheritanceDistribution | undefined {
  if (v === "equal" || v === "least_to_one" || v === "most_to_one") return v;
  if (typeof v !== "string") return undefined;
  const t = v.toLowerCase();
  if (t.includes("likadel") || t === "equal") return "equal";
  if (t.includes("minst")) return "least_to_one";
  if (t.includes("mest")) return "most_to_one";
  return undefined;
}
function parseChildEntries(raw: unknown): ChildEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ChildEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.name !== "string" || !o.name.trim()) continue;
    out.push({
      name: o.name.trim(),
      isSarkullbarn:
        o.isSarkullbarn === true ||
        o.isSarkullbarn === "true" ||
        o.fromPrevious === true ||
        o.sarkullbarn === true,
    });
  }
  return out.length ? out : undefined;
}
function parseBeneficiaries(raw: unknown): NonChildBeneficiary[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: NonChildBeneficiary[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (o.type !== "person" && o.type !== "organisation") continue;
    if (typeof o.name !== "string" || !o.name.trim()) continue;
    let ifp = o.ifPredeceased;
    if (ifp === "their_heirs") ifp = "their_legal_heirs";
    if (ifp === "my_heirs") ifp = "my_legal_heirs";
    if (ifp !== "their_legal_heirs" && ifp !== "my_legal_heirs") continue;
    out.push({ type: o.type, name: o.name.trim(), ifPredeceased: ifp });
  }
  return out.length ? out : undefined;
}
function syncWillTypeFromForm(c: Circumstances): Circumstances {
  const next = { ...c };
  if (next.willForm === "individual") next.willType = "own";
  if (next.willForm === "joint_cohabitants" || next.willForm === "joint_spouses") {
    next.willType = "joint";
  }
  return next;
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

/** Mappar modellens fria strängar / synonymer till enum (många svar är på svenska). */
function coerceBurialForm(v: unknown): FuneralWishes["burialForm"] | undefined {
  if (v === "burial" || v === "cremation" || v === "no_preference") return v;
  if (typeof v !== "string") return undefined;
  const t = v.toLowerCase().trim();
  if (t.includes("krem") || t.includes("aska") || t.includes("stoft") || t.includes("cremat")) {
    return "cremation";
  }
  if (
    t.includes("ingen åsikt") ||
    t.includes("inget särskilt") ||
    t.includes("spelar ingen roll") ||
    t.includes("no_preference")
  ) {
    return "no_preference";
  }
  if (
    t.includes("jordbegravning") ||
    t.includes("kista") ||
    t.includes("gravsättning") ||
    t.includes("kyrkogård") ||
    (t.includes("begravning") && !t.includes("borgerlig")) ||
    t === "burial"
  ) {
    return "burial";
  }
  return undefined;
}

function coerceCeremony(v: unknown): FuneralWishes["ceremony"] | undefined {
  if (v === "religious" || v === "civil" || v === "own") return v;
  if (typeof v !== "string") return undefined;
  const t = v.toLowerCase().trim();
  if (
    t === "religious" ||
    t.includes("religiös") ||
    t.includes("religios") ||
    t.includes("kyrklig") ||
    t.includes("kyrkan") ||
    t.includes(" i kyrk") ||
    t.includes("präst") ||
    t.includes("pastor") ||
    t.includes("gudstjänst") ||
    t.includes("kyrkobegravning") ||
    (t.includes("traditionell") && t.includes("kyrk"))
  ) {
    return "religious";
  }
  if (t.includes("borgerlig") || t === "civil" || t.includes("civil ceremoni")) {
    return "civil";
  }
  if (
    t === "own" ||
    t.includes("egen ceremoni") ||
    (t.includes("egen") && t.includes("ceremoni")) ||
    (t.includes("personlig") && t.includes("ceremoni"))
  ) {
    return "own";
  }
  return undefined;
}

function inferFuneralEnumsFromFreeText(fw: FuneralWishes): FuneralWishes {
  const hint = [fw.location, fw.personalMessage].filter(Boolean).join(" ");
  const out = { ...fw };
  if (!out.ceremony) {
    const inf = coerceCeremony(hint);
    if (inf) out.ceremony = inf;
  }
  if (!out.burialForm) {
    const inf = coerceBurialForm(hint);
    if (inf) out.burialForm = inf;
  }
  return out;
}

/** Efter laddning från localStorage: fyll ceremony/burialForm om plats/meddelande redan innehåller ledtrådar. */
export function backfillFuneralWishesFromDraftText(draft: WillDraft): WillDraft {
  const fw = inferFuneralEnumsFromFreeText(draft.funeralWishes);
  if (
    fw.ceremony === draft.funeralWishes.ceremony &&
    fw.burialForm === draft.funeralWishes.burialForm
  ) {
    return draft;
  }
  return { ...draft, funeralWishes: fw };
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
    if (isWillFormVariant(o.willForm)) next.circumstances.willForm = o.willForm;
    if (isWillType(o.willType)) next.circumstances.willType = o.willType;
    if (isFamilyStatus(o.familyStatus)) next.circumstances.familyStatus = o.familyStatus;
    if (isChildrenStatus(o.childrenStatus)) next.circumstances.childrenStatus = o.childrenStatus;
    if (Array.isArray(o.assets) && o.assets.every(isAsset)) {
      next.circumstances.assets = o.assets;
    }
    if (isOutsideFamily(o.outsideFamily)) next.circumstances.outsideFamily = o.outsideFamily;
    const nestedChildren = parseChildEntries(o.children);
    if (nestedChildren) next.children = nestedChildren;
    const nestedBen = parseBeneficiaries(o.beneficiariesIfNoChildren ?? o.beneficiaries);
    if (nestedBen) next.beneficiariesIfNoChildren = nestedBen;
    const idist = coerceInheritanceDistribution(o.inheritanceDistribution);
    if (idist) next.inheritanceDistribution = idist;
    if (typeof o.distributionFocusChildName === "string" && o.distributionFocusChildName.trim()) {
      next.distributionFocusChildName = o.distributionFocusChildName.trim();
    }
    if (typeof o.distributionChild === "string" && o.distributionChild.trim()) {
      next.distributionFocusChildName = o.distributionChild.trim();
    }
  }

  const topWillForm = raw.willForm;
  if (isWillFormVariant(topWillForm)) next.circumstances.willForm = topWillForm;

  if (raw.previousWillsExist === true || raw.previousWillsExist === false) {
    next.previousWillsExist = raw.previousWillsExist;
  }
  if (raw.previous_wills === true || raw.previous_wills === false) {
    next.previousWillsExist = raw.previous_wills;
  }

  const topChildren = parseChildEntries(raw.children);
  if (topChildren) next.children = topChildren;
  const topBen = parseBeneficiaries(raw.beneficiariesIfNoChildren ?? raw.beneficiaries);
  if (topBen) next.beneficiariesIfNoChildren = topBen;

  const topId = coerceInheritanceDistribution(raw.inheritanceDistribution ?? raw.inheritance_distribution);
  if (topId) next.inheritanceDistribution = topId;
  if (typeof raw.distributionFocusChildName === "string" && raw.distributionFocusChildName.trim()) {
    next.distributionFocusChildName = raw.distributionFocusChildName.trim();
  }
  if (typeof raw.distributionChild === "string" && raw.distributionChild.trim()) {
    next.distributionFocusChildName = raw.distributionChild.trim();
  }

  if (raw.minorBeneficiaries === true || raw.minorBeneficiaries === false) {
    next.minorBeneficiaries = raw.minorBeneficiaries;
  }
  if (raw.minor_beneficiaries === true || raw.minor_beneficiaries === false) {
    next.minorBeneficiaries = raw.minor_beneficiaries;
  }
  if (raw.specialTrusteeWanted === true || raw.specialTrusteeWanted === false) {
    next.specialTrusteeWanted = raw.specialTrusteeWanted;
  }
  if (raw.special_trustee_wanted === true || raw.special_trustee_wanted === false) {
    next.specialTrusteeWanted = raw.special_trustee_wanted;
  }
  if (typeof raw.specialTrusteeName === "string" && raw.specialTrusteeName.trim()) {
    next.specialTrusteeName = raw.specialTrusteeName.trim();
  }
  if (typeof raw.special_trustee_name === "string" && raw.special_trustee_name.trim()) {
    next.specialTrusteeName = raw.special_trustee_name.trim();
  }

  next.circumstances = syncWillTypeFromForm(next.circumstances);

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

  const topBurial = coerceBurialForm(raw.burialForm);
  if (topBurial) next.funeralWishes.burialForm = topBurial;
  const topCeremony = coerceCeremony(raw.ceremony);
  if (topCeremony) next.funeralWishes.ceremony = topCeremony;

  const f = raw.funeralWishes;
  if (f && typeof f === "object" && !Array.isArray(f)) {
    const o = f as Record<string, unknown>;
    const burial = coerceBurialForm(o.burialForm);
    if (burial) next.funeralWishes.burialForm = burial;
    const ceremony = coerceCeremony(o.ceremony);
    if (ceremony) next.funeralWishes.ceremony = ceremony;
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

  next.funeralWishes = inferFuneralEnumsFromFreeText(next.funeralWishes);

  if (!next.wishes.mainHeir?.trim()) {
    if (next.children?.length && next.children.every((ch) => ch.name?.trim())) {
      next.wishes.mainHeir = next.children.map((ch) => ch.name.trim()).join(", ");
    } else if (next.beneficiariesIfNoChildren?.length) {
      next.wishes.mainHeir = next.beneficiariesIfNoChildren
        .map((b) => b.name.trim())
        .filter(Boolean)
        .join(", ");
    }
  }

  if (raw.intakeComplete === true || raw.intakeComplete === "true") {
    next.intakeMarkedComplete = true;
  }

  return next;
}
