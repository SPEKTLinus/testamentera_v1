export type WillType = "own" | "joint";

/** Motsvarar "enskilt / gemensamt sambo / gemensamt makar" — synkas med willType (individual→own, övriga→joint). */
export type WillFormVariant = "individual" | "joint_cohabitants" | "joint_spouses";

export type InheritanceDistribution = "equal" | "least_to_one" | "most_to_one";

export interface ChildEntry {
  name: string;
  /** Sant om barnet är från tidigare förhållande (särkullbarn) */
  isSarkullbarn?: boolean;
}

export interface NonChildBeneficiary {
  type: "person" | "organisation";
  name: string;
  ifPredeceased: "their_legal_heirs" | "my_legal_heirs";
}

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
  /** Om satt: mer precis än bara joint — styr vilka frågor som är relevanta */
  willForm?: WillFormVariant;
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
  /** E-post från startgrinden — kvitto via Resend, påminnelser m.m. */
  contactEmail?: string;
  /** Bearer-token från /api/start-will när WILL_ACCESS_SECRET är satt (skyddar AI-routes). */
  willAccessToken?: string;
  /** Räknas upp server-side; tak i aiWillLimits per testamente */
  aiTokenUsage?: WillAiTokenUsage;
  /** Satt av Will i extraktion (intakeComplete) — UI kan visa gå-vidare-knapp även om validering släpat efter */
  intakeMarkedComplete?: boolean;
  /** Will-chat: kumulativ input+output (tokens) före köp — styr mjuk sessionsvägledning; uppdateras inte efter betalning */
  willChatSessionTokens?: number;
  step: number;
  circumstances: Circumstances;
  wishes: Wishes;
  funeralWishes: FuneralWishes;
  testatorName?: string;
  testatorPersonalNumber?: string;
  testatorAddress?: string;
  partnerName?: string;
  /** Finns sedan tidigare upprättade testamenten? (ersätts av det nya) */
  previousWillsExist?: boolean;
  /** Namn (och ev. särkullbarn) — när användaren har barn */
  children?: ChildEntry[];
  /** När inga barn: en–få testamentstagare */
  beneficiariesIfNoChildren?: NonChildBeneficiary[];
  /** Endast när minst två barn: lika / minst till ett / mest till ett */
  inheritanceDistribution?: InheritanceDistribution;
  /** Barnets namn när fördelning är least_to_one eller most_to_one */
  distributionFocusChildName?: string;
  /** Finns testamentstagare under 18? */
  minorBeneficiaries?: boolean;
  /** Om minderåriga: ska särskild förvaltare utses? */
  specialTrusteeWanted?: boolean;
  specialTrusteeName?: string;
  /** Tidigare flöde: om personen velat brev (används vid migration till paidLetter) */
  wantsPersonalLetter?: boolean;
  /** Betald tilläggstjänst: personligt brev med egen chatt */
  paidLetter?: boolean;
  /** Räknas upp av server vid varje lyckat letter-chat-svar; tak LETTER_CHAT_MAX_AI_TURNS */
  letterChatAssistantRounds?: number;
  /** När true: brev-samtal stängt (ingen mer AI); PDF och utkast finns kvar */
  personalLetterChatLocked?: boolean;
  personalLetterChatLockedAt?: string;
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
