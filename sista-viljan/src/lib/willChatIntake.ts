import type { Circumstances, FuneralWishes, WillDraft } from "./types";

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

const INTAKE_CHECK_DEFS: ReadonlyArray<{ label: string; ok: (d: WillDraft) => boolean }> = [
  { label: "Ditt namn", ok: (d) => !!d.testatorName?.trim() },
  {
    label: "Personnummer (ååååmmdd-xxxx)",
    ok: (d) => !!d.testatorPersonalNumber?.trim() && PN_REGEX.test(d.testatorPersonalNumber.trim()),
  },
  { label: "Adress", ok: (d) => !!d.testatorAddress?.trim() },
  { label: "Testamentestyp (eget eller gemensamt)", ok: (d) => !!d.circumstances.willType },
  { label: "Familjesituation", ok: (d) => !!d.circumstances.familyStatus },
  { label: "Barn / särkullbarn", ok: (d) => !!d.circumstances.childrenStatus },
  { label: "Tillgångar (minst ett val)", ok: (d) => Array.isArray(d.circumstances.assets) && (d.circumstances.assets?.length ?? 0) > 0 },
  { label: "Arv utanför familjen", ok: (d) => !!d.circumstances.outsideFamily },
  { label: "Huvudarvinge", ok: (d) => !!d.wishes.mainHeir?.trim() },
  {
    label: "Om bostaden är särskild egendom (ja/nej)",
    ok: (d) => typeof d.wishes.heirIsPrivateProperty === "boolean",
  },
  {
    label: "Sambo får bo kvar (ja/nej)",
    ok: (d) => (needsPartnerStayQuestion(d) ? typeof d.wishes.partnerCanStay === "boolean" : true),
  },
  {
    label: "Välgörenhetsorganisation",
    ok: (d) => (needsCharityWishes(d) ? !!d.wishes.charityName?.trim() : true),
  },
  { label: "Bouppteckningsförrättare / testamentsexekutor", ok: (d) => !!d.wishes.executor?.trim() },
  { label: "Begravningsform", ok: (d) => !!d.funeralWishes.burialForm },
  { label: "Ceremoni", ok: (d) => !!d.funeralWishes.ceremony },
];

export function isIntakeComplete(draft: WillDraft): boolean {
  return INTAKE_CHECK_DEFS.every((x) => x.ok(draft));
}

/** Korta svenska rubriker för det som saknas (betalningsgrind). */
export function getIntakeIncompleteSummaries(draft: WillDraft): string[] {
  return INTAKE_CHECK_DEFS.filter((x) => !x.ok(draft)).map((x) => x.label);
}

export function getIntakeProgressPercent(draft: WillDraft): number {
  const done = INTAKE_CHECK_DEFS.filter((x) => x.ok(draft)).length;
  if (done === INTAKE_CHECK_DEFS.length) return 100;
  return Math.min(95, Math.round((done / INTAKE_CHECK_DEFS.length) * 95));
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

  if (raw.intakeComplete === true || raw.intakeComplete === "true") {
    next.intakeMarkedComplete = true;
  }

  return next;
}
