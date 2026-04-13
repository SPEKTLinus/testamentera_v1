/** Swish amounts in SEK (incl. moms) */
export const PAYMENT_PRICES = {
  will: 9,
  update: 299,
  storage: 999,
} as const;

export type PaymentProductKey = keyof typeof PAYMENT_PRICES;
