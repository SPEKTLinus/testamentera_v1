"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhoneDisplayFromE164 } from "@/lib/phone";
import { normalizeEmail, isValidEmail } from "@/lib/email";

const SESSION_PHONE_KEY = "sv_will_phone_normalized";
const SESSION_DISPLAY_KEY = "sv_will_phone_display";
export const SESSION_ACCESS_TOKEN_KEY = "sv_will_access_token";
export const SESSION_EMAIL_KEY = "sv_will_contact_email";

export function readSessionWillAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
}

export function readSessionContactEmail(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_EMAIL_KEY);
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

type Props = {
  onVerified: (e164: string, accessToken: string | undefined, email: string) => void;
};

export function StartWillGate({ onVerified }: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const emailNorm = normalizeEmail(email);
  const emailOk = isValidEmail(emailNorm);
  const canSubmit = phoneOk && emailOk;

  const handleSubmit = async () => {
    setError("");
    if (!canSubmit) {
      setError(!phoneOk ? "Kontrollera mobilnumret." : "Kontrollera e-postadressen.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/start-will", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email: emailNorm }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(typeof data.error === "string" ? data.error : "Något gick fel. Försök igen.");
        return;
      }

      const normalized: string = data.normalized;
      const display = formatPhoneDisplayFromE164(normalized);
      sessionStorage.setItem(SESSION_PHONE_KEY, normalized);
      sessionStorage.setItem(SESSION_DISPLAY_KEY, display);
      sessionStorage.setItem(SESSION_EMAIL_KEY, emailNorm);
      const token = typeof data.accessToken === "string" ? data.accessToken : undefined;
      if (token) {
        sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
      }
      onVerified(normalized, token, emailNorm);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-fade-in-up">
        <p className="label-overline mb-4">Innan du börjar</p>
        <h1 className="font-heading text-2xl font-semibold mb-3 leading-tight">
          Mobilnummer och e-post
        </h1>
        <p className="text-sm text-[#4a5568] leading-relaxed mb-6">
          Vi använder numret för att begränsa missbruk av samtalet (kostnader för AI) och förifylla Swish. Vi skickar
          kvitto och köpbekräftelse till din e-post via Resend. På en delad dator: utkastet knyts till numret du anger —
          någon annan med annat nummer ser inte dina uppgifter.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Mobilnummer</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="070-123 45 67"
              maxLength={13}
              className="w-full border border-[#e5e5e5] px-4 py-3 text-base text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors"
              style={{ borderRadius: "3px" }}
              autoFocus
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && !loading && canSubmit && handleSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@example.com"
              autoComplete="email"
              className="w-full border border-[#e5e5e5] px-4 py-3 text-base text-ink focus:outline-none focus:border-[#1a2e4a] transition-colors"
              style={{ borderRadius: "3px" }}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && !loading && canSubmit && handleSubmit()}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Kontrollerar…" : "Fortsätt till testamentet"}
          </button>
        </div>

        <div className="border-t border-[#e5e5e5] pt-6 space-y-3 text-center text-sm text-[#4a5568]">
          <p>
            <Link href="/account" className="text-ink font-medium underline underline-offset-2">
              Logga in
            </Link>
            {" · "}
            <Link href="/account" className="text-ink font-medium underline underline-offset-2">
              Skapa konto
            </Link>
          </p>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Konto används bland annat för kontaktpersoner och översikt. För nya testamenten anger du mobilnummer och
            e-post här.
          </p>
        </div>
      </div>
    </div>
  );
}

export function readSessionPhone(): { normalized: string; display: string } | null {
  if (typeof window === "undefined") return null;
  const normalized = sessionStorage.getItem(SESSION_PHONE_KEY);
  const display = sessionStorage.getItem(SESSION_DISPLAY_KEY);
  if (!normalized || !display) return null;
  return { normalized, display };
}
