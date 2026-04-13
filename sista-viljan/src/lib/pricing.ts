/** Swish amounts in SEK (incl. moms) */
export const PAYMENT_PRICES = {
  will: 499,
  letter: 499,
} as const;

/** Ingår i köpet: påminnelser under denna period (marknadsföring / copy) */
export const REMINDER_INCLUDED_MONTHS = 12;

export type PaymentProductKey = keyof typeof PAYMENT_PRICES;
