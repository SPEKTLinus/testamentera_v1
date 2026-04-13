export type WillType = "own" | "joint";

export type FamilyStatus =
  | "married"
  | "sambo"
  | "single"
  | "divorced"
  | "widowed";

export type ChildrenStatus =
  | "none"
  | "joint"
  | "from_previous"
  | "both";

export type Asset =
  | "residence"
  | "vacation_home"
  | "business"
  | "securities"
  | "none";

export type OutsideFamily =
  | "person"
  | "charity"
  | "none";

// Step 1: Circumstances
export interface Circumstances {
  willType?: WillType;
  familyStatus?: FamilyStatus;
  childrenStatus?: ChildrenStatus;
  assets?: Asset[];
  outsideFamily?: OutsideFamily;
}

// Step 2: Wishes
export interface Wishes {
  mainHeir?: string;
  heirIsPrivateProperty?: boolean;
  specificItems?: string;
  partnerCanStay?: boolean;
  charityName?: string;
  charityAmount?: string;
  executor?: string;
}

// Step 2b: Funeral
export interface FuneralWishes {
  burialForm?: "burial" | "cremation" | "no_preference";
  ceremony?: "religious" | "civil" | "own";
  music?: string;
  clothing?: string;
  flowersOrCharity?: "flowers" | "charity" | "charity_name";
  charityName?: string;
  speakers?: string;
  location?: string;
  personalMessage?: string;
}

export interface GeneratedWill {
  sections: Array<{ title: string; text: string }>;
  generatedAt: string;
}

/** Personligt brev (dokument 2) — egen betalning och brev-chatt */
export interface PersonalLetter {
  body?: string;
  updatedAt?: string;
}

/** Kumulativ AI-tokenanvändning (will-chat + generate-will) per testamente */
export interface WillAiTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface WillDraft {
  id?: string;
  userId?: string;
  /** E.164 digits (no +), set after start gate — used for Swish prefills and abuse limits */
  verifiedPhone?: string;
  /** Räknas upp server-side; tak50k in / 50k ut per testamente */
  aiTokenUsage?: WillAiTokenUsage;
  step: number;
  circumstances: Circumstances;
  wishes: Wishes;
  funeralWishes: FuneralWishes;
  testatorName?: string;
  testatorPersonalNumber?: string;
  testatorAddress?: string;
  partnerName?: string;
  /** Tidigare flöde: om personen velat brev (används vid migration till paidLetter) */
  wantsPersonalLetter?: boolean;
  /** Betald tilläggstjänst: personligt brev med egen chatt */
  paidLetter?: boolean;
  personalLetter?: PersonalLetter;
  completedAt?: string;
  paid?: boolean;
  createdAt?: string;
  updatedAt?: string;
  generatedWill?: GeneratedWill;
}

export interface ConsequenceInfo {
  title: string;
  current: string;
  withWill: string;
}

// Payment types
export type PaymentProduct = "will" | "letter";
export type PaymentStatus = "idle" | "pending" | "polling" | "paid" | "declined" | "error";

export interface SwishPaymentRequest {
  phoneNumber: string;
  amount: number;
  product: PaymentProduct;
  draftId?: string;
  userId?: string;
}

export interface SwishPaymentResponse {
  paymentId: string;
  status: PaymentStatus;
}

// Storage / account types
export interface ContactPerson {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name?: string;
  storageActive: boolean;
  storageExpiresAt?: string;
  nextReminderDate?: string;
  contactPersons: ContactPerson[];
}
