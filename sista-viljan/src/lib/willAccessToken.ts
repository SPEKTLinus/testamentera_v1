import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type Payload = { p: string; exp: number; n: string };

function getSecret(): string | undefined {
  return process.env.WILL_ACCESS_SECRET?.trim() || undefined;
}

function ttlMs(): number {
  const raw = process.env.WILL_ACCESS_TTL_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 60_000) return n;
  return 7 * 24 * 60 * 60 * 1000;
}

/** Signed bearer token tying AI access to a normalized phone (E.164 digits). */
export function mintWillAccessToken(phoneE164: string): string | undefined {
  const secret = getSecret();
  if (!secret) return undefined;

  const payload: Payload = {
    p: phoneE164,
    exp: Date.now() + ttlMs(),
    n: randomBytes(8).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  const sigB64 = sig.toString("base64url");
  return `${payloadB64}.${sigB64}`;
}

export function parseWillAccessToken(token: string): { phone: string } | null {
  const secret = getSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let sig: Buffer;
  try {
    sig = Buffer.from(sigB64, "base64url");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payloadB64).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (typeof payload.p !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;
  return { phone: payload.p };
}
