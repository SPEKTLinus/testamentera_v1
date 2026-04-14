import type { PaymentProduct } from "./types";

/** Swish payeePaymentReference max length is tight; we use W/L + 32 hex (UUID utan bindestreck). */
export function encodeSwishPayeeReference(
  product: PaymentProduct,
  draftId: string | undefined,
  paymentId: string
): string {
  const raw = (draftId || paymentId).replace(/-/g, "").toLowerCase();
  const core = raw.slice(0, 32).padEnd(32, "0");
  const prefix = product === "letter" ? "L" : "W";
  return `${prefix}${core}`;
}

export function parseSwishPayeeReference(ref: string): {
  draftId: string;
  product: PaymentProduct;
} | null {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (trimmed.length === 33 && /^W[0-9a-f]{32}$/i.test(trimmed)) {
    return { product: "will", draftId: uuidFrom32Hex(trimmed.slice(1)) };
  }
  if (trimmed.length === 33 && /^L[0-9a-f]{32}$/i.test(trimmed)) {
    return { product: "letter", draftId: uuidFrom32Hex(trimmed.slice(1)) };
  }
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  ) {
    return { draftId: trimmed, product: "will" };
  }
  return null;
}

function uuidFrom32Hex(h32: string): string {
  const h = h32.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
