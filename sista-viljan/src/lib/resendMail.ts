import { Resend } from "resend";

export const DEFAULT_RESEND_FROM = "Sista Viljan <hej@sistaviljan.se>";

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function resendFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || DEFAULT_RESEND_FROM;
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    console.warn("sendTransactionalEmail: RESEND_API_KEY not set");
    return { ok: false, error: "no_provider" };
  }
  try {
    await client.emails.send({
      from: resendFromAddress(),
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return { ok: true };
  } catch (e) {
    console.error("Resend send error:", e);
    return { ok: false, error: String(e) };
  }
}
