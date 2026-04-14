import type { WillDraft } from "./types";

const PN_REGEX = /^\d{8}-\d{4}$/;

/** Minst två barn → kräv fördelningsval (likadelning / minst / mest). */
export function needsInheritanceDistributionQuestion(d: WillDraft): boolean {
  const n = d.children?.length ?? 0;
  if (n >= 2) return true;
  return d.circumstances.childrenStatus === "both";
}

/** Har användaren barn i utkastet? */
export function hasChildrenBranch(d: WillDraft): boolean {
  return d.circumstances.childrenStatus !== undefined && d.circumstances.childrenStatus !== "none";
}

/** Barn med namn insamlade, eller äldre utkast med bara huvudarvinge. */
export function childrenNamesSatisfied(d: WillDraft): boolean {
  if (!hasChildrenBranch(d)) return true;
  if (d.children?.length && d.children.every((c) => c.name?.trim())) return true;
  return !!d.wishes.mainHeir?.trim();
}

export function beneficiariesIfNoChildrenSatisfied(d: WillDraft): boolean {
  if (d.circumstances.childrenStatus !== "none") return true;
  const b = d.beneficiariesIfNoChildren;
  if (!Array.isArray(b) || b.length === 0) return false;
  return b.every(
    (x) =>
      (x.type === "person" || x.type === "organisation") &&
      !!x.name?.trim() &&
      (x.ifPredeceased === "their_legal_heirs" || x.ifPredeceased === "my_legal_heirs")
  );
}

export function inheritanceDistributionSatisfied(d: WillDraft): boolean {
  if (!needsInheritanceDistributionQuestion(d)) return true;
  if (!d.inheritanceDistribution) return false;
  if (d.inheritanceDistribution === "equal") return true;
  return !!d.distributionFocusChildName?.trim();
}

export function needsMinorBeneficiaryQuestion(d: WillDraft): boolean {
  return (
    hasChildrenBranch(d) ||
    (d.circumstances.childrenStatus === "none" &&
      Array.isArray(d.beneficiariesIfNoChildren) &&
      d.beneficiariesIfNoChildren.length > 0)
  );
}

export function minorTrusteeBranchSatisfied(d: WillDraft): boolean {
  if (!needsMinorBeneficiaryQuestion(d)) return true;
  if (typeof d.minorBeneficiaries !== "boolean") return false;
  if (d.minorBeneficiaries !== true) return true;
  if (typeof d.specialTrusteeWanted !== "boolean") return false;
  if (d.specialTrusteeWanted === true) return !!d.specialTrusteeName?.trim();
  return true;
}

export function willFormOrTypeSatisfied(d: WillDraft): boolean {
  return !!d.circumstances.willForm || !!d.circumstances.willType;
}

/** Alla saknade punkter som måste fyllas innan betalning (beslutsträd + begravning). */
export function collectIntakeGaps(d: WillDraft): string[] {
  const gaps: string[] = [];
  const c = d.circumstances;

  if (!d.testatorName?.trim()) gaps.push("Ditt namn");
  if (!d.testatorPersonalNumber?.trim() || !PN_REGEX.test(d.testatorPersonalNumber.trim())) {
    gaps.push("Personnummer (ååååmmdd-xxxx)");
  }
  if (!d.testatorAddress?.trim()) gaps.push("Adress");

  if (!willFormOrTypeSatisfied(d)) gaps.push("Testamentesform (enskilt eller gemensamt)");

  if (typeof d.previousWillsExist !== "boolean") {
    gaps.push("Om du har tidigare testamenten (ja/nej)");
  }

  if (!c.familyStatus) gaps.push("Familjesituation");
  if (!c.childrenStatus) gaps.push("Barn (inga / gemensamma / särkullbarn / båda)");
  if (!childrenNamesSatisfied(d)) gaps.push("Barnens namn (för varje barn)");

  if (c.childrenStatus === "none" && !beneficiariesIfNoChildrenSatisfied(d)) {
    gaps.push("Testamentstagare (person eller organisation, och arv om hen avlider före dig)");
  }

  if (!inheritanceDistributionSatisfied(d)) {
    gaps.push("Hur arvet ska fördelas mellan barnen (lika / minst till ett / mest till ett)");
  }
  if (needsInheritanceDistributionQuestion(d) && d.inheritanceDistribution && d.inheritanceDistribution !== "equal") {
    if (!d.distributionFocusChildName?.trim()) {
      gaps.push("Vilket barn avses vid minst/mest-fördelning");
    }
  }

  if (!minorTrusteeBranchSatisfied(d)) {
    if (needsMinorBeneficiaryQuestion(d) && typeof d.minorBeneficiaries !== "boolean") {
      gaps.push("Om någon arvinge är under 18 år");
    } else if (d.minorBeneficiaries === true && typeof d.specialTrusteeWanted !== "boolean") {
      gaps.push("Om särskild förvaltare ska utses");
    } else if (d.minorBeneficiaries === true && d.specialTrusteeWanted && !d.specialTrusteeName?.trim()) {
      gaps.push("Särskild förvaltares namn");
    }
  }

  if (!Array.isArray(c.assets) || (c.assets?.length ?? 0) === 0) {
    gaps.push("Tillgångar (minst ett val)");
  }
  if (!c.outsideFamily) gaps.push("Arv utanför familjen");

  const heirSummaryOk =
    !!d.wishes.mainHeir?.trim() ||
    (hasChildrenBranch(d) &&
      (d.children?.length ?? 0) > 0 &&
      d.children!.every((ch) => ch.name?.trim())) ||
    (c.childrenStatus === "none" &&
      Array.isArray(d.beneficiariesIfNoChildren) &&
      d.beneficiariesIfNoChildren.length > 0 &&
      d.beneficiariesIfNoChildren.every((b) => b.name?.trim()));

  if (!heirSummaryOk) {
    gaps.push("Vem som ärver huvuddelen (huvudarvinge, eller alla barn / testamentstagare namngivna)");
  }

  if (typeof d.wishes.heirIsPrivateProperty !== "boolean") {
    gaps.push("Om arvet ska vara enskild egendom (ja/nej)");
  }

  const needsPartner =
    (c.familyStatus === "married" || c.familyStatus === "sambo") &&
    (c.childrenStatus === "from_previous" || c.childrenStatus === "both");
  if (needsPartner && typeof d.wishes.partnerCanStay !== "boolean") {
    gaps.push("Sambo/make får bo kvar (ja/nej)");
  }

  if (c.outsideFamily === "charity" && !d.wishes.charityName?.trim()) {
    gaps.push("Välgörenhetsorganisation");
  }

  if (!d.wishes.executor?.trim()) gaps.push("Bouppteckningsförrättare / testamentsexekutor");
  if (!d.funeralWishes.burialForm) gaps.push("Begravningsform");
  if (!d.funeralWishes.ceremony) gaps.push("Ceremoni");

  return gaps;
}

export function isIntakeCompleteByTree(d: WillDraft): boolean {
  return collectIntakeGaps(d).length === 0;
}

/** Grov progress för progressbar (färre luckor ⇒ högre %). */
export function getIntakeProgressApprox(d: WillDraft): number {
  if (isIntakeCompleteByTree(d)) return 100;
  const n = collectIntakeGaps(d).length;
  return Math.max(8, Math.min(95, 96 - n * 4));
}
