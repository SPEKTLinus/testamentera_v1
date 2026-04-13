import { NextRequest, NextResponse } from "next/server";

const SWISH_API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests"
    : "https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
  }

  const merchantNumber = process.env.SWISH_MERCHANT_NUMBER;

  // Demo mode: simulate PAID after 5 seconds
  if (!merchantNumber) {
    const demo = searchParams.get("demo");
    if (demo === "true") {
      return NextResponse.json({ status: "PAID" });
    }
    return NextResponse.json({ status: "CREATED" });
  }

  try {
    const response = await fetch(`${SWISH_API_BASE}/${paymentId}`, {
      // In production, add mutual TLS agent here
    });

    if (!response.ok) {
      return NextResponse.json({ status: "ERROR" });
    }

    const data = await response.json();
    // Swish statuses: CREATED, PAID, DECLINED, ERROR, CANCELLED
    return NextResponse.json({ status: data.status });
  } catch (error) {
    console.error("Swish status error:", error);
    return NextResponse.json({ status: "ERROR" });
  }
}
