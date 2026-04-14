import { NextRequest, NextResponse } from "next/server";
import { PAYMENT_PRICES } from "@/lib/pricing";
import { cleanPhoneDigits, isValidSwedishMobile } from "@/lib/phone";
import type { PaymentProduct } from "@/lib/types";
import { encodeSwishPayeeReference } from "@/lib/swishPayeeReference";

// Swish Handel API integration
// Docs: https://developer.swish.nu/api/swish-for-merchants/v2
//
// In production set these env vars:
//   SWISH_MERCHANT_NUMBER  — your 10-digit Swish merchant number (e.g. 1234567890)
//   SWISH_CERTIFICATE      — PEM certificate string (or base64-encoded)
//   SWISH_CERTIFICATE_KEY  — PEM private key string (or base64-encoded)
//
// In sandbox, Swish provides test certs at https://developer.swish.nu/documentation/environments

const PRICES: Record<string, number> = { ...PAYMENT_PRICES };

const SWISH_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests"
    : "https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests"; // Swish sandbox

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, product, draftId } = await req.json();

    if (product !== "will" && product !== "letter") {
      return NextResponse.json({ error: "Okänd produkt" }, { status: 400 });
    }
    const paymentProduct = product as PaymentProduct;

    const amount = PRICES[paymentProduct];
    if (!amount) {
      return NextResponse.json({ error: "Okänd produkt" }, { status: 400 });
    }

    const cleaned = cleanPhoneDigits(phoneNumber);
    if (!isValidSwedishMobile(cleaned)) {
      return NextResponse.json(
        { error: "Ange ett giltigt svenskt mobilnummer (07X-XXXXXXX)" },
        { status: 400 }
      );
    }

    const swishNumber = cleaned.startsWith("46") ? cleaned : `46${cleaned.slice(1)}`;

    const paymentId = crypto.randomUUID().replace(/-/g, "").toUpperCase();

    const merchantNumber = process.env.SWISH_MERCHANT_NUMBER;

    // In dev/demo mode without credentials — simulate payment
    if (!merchantNumber) {
      return NextResponse.json({
        paymentId,
        status: "pending",
        demo: true,
        message: `Demo: Swish-begäran skickad till ${phoneNumber}. Bekräfta i din Swish-app.`,
      });
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/swish/callback`;

    const body = {
      payeePaymentReference: encodeSwishPayeeReference(
        paymentProduct,
        typeof draftId === "string" ? draftId : undefined,
        paymentId
      ),
      callbackUrl,
      payeeAlias: merchantNumber,
      currency: "SEK",
      payerAlias: swishNumber,
      amount: amount.toString(),
      message: productLabel(paymentProduct),
    };

    // In production, this request must use mutual TLS with the Swish certificate.
    // Here we use fetch; in production swap for https.Agent with cert/key from env.
    const response = await fetch(SWISH_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, id: paymentId }),
    });

    if (response.status === 201) {
      return NextResponse.json({ paymentId, status: "pending" });
    }

    const errText = await response.text();
    console.error("Swish error:", errText);
    return NextResponse.json(
      { error: "Kunde inte initiera Swish-betalning. Försök igen." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Swish initiate error:", error);
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}

function productLabel(product: PaymentProduct): string {
  switch (product) {
    case "will":
      return "Sista Viljan - Testamente";
    case "letter":
      return "Sista Viljan - Personligt brev";
    default:
      return "Sista Viljan";
  }
}
