import { NextRequest, NextResponse } from "next/server";
import { PAYMENT_PRICES } from "@/lib/pricing";
import type { PaymentProduct } from "@/lib/types";
import { normalizeEmail, isValidEmail } from "@/lib/email";
import { sendTransactionalEmail } from "@/lib/resendMail";
import { getRequestIp } from "@/lib/requestIp";
import { takeRateSlot } from "@/lib/apiRateLimit";

const PRODUCT_LABEL: Record<PaymentProduct, string> = {
  will: "Testamente (Sista Viljan)",
  letter: "Personligt brev (Sista Viljan)",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  if (!takeRateSlot(`receipt:${ip}`, 30, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Ogiltig e-postadress." }, { status: 400 });
    }

    const product = body.product as PaymentProduct;
    if (product !== "will" && product !== "letter") {
      return NextResponse.json({ ok: false, error: "Ogiltig produkt." }, { status: 400 });
    }

    const expected = PAYMENT_PRICES[product];
    const amount = typeof body.amount === "number" ? body.amount : parseInt(String(body.amount), 10);
    if (!Number.isFinite(amount) || amount !== expected) {
      return NextResponse.json({ ok: false, error: "Ogiltigt belopp." }, { status: 400 });
    }

    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistaviljan.se";

    const subject = `Kvitto — ${PRODUCT_LABEL[product]}`;
    const lines = [
      "Hej,",
      "",
      "Tack för ditt köp hos Sista Viljan.",
      "",
      `Produkt: ${PRODUCT_LABEL[product]}`,
      `Belopp: ${amount} kr (inkl. moms)`,
      "Betalning: Swish",
      ...(paymentId ? [`Referens: ${paymentId}`] : []),
      "",
      `Öppna tjänsten: ${appUrl}/app`,
      "",
      "Det här mejlet fungerar som enkel köp- och betalningsbekräftelse. Spara det om du behöver för din bokföring.",
      "",
      "— Sista Viljan",
      "",
      "Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.",
    ];

    await sendTransactionalEmail({
      to: email,
      subject,
      text: lines.join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-purchase-receipt:", e);
    return NextResponse.json({ ok: true });
  }
}
