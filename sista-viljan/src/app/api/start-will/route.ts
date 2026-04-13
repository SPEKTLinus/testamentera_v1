import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { toE164Digits } from "@/lib/phone";
import { getRequestIp } from "@/lib/requestIp";
import { takeRateSlot, RATE_START_WILL } from "@/lib/apiRateLimit";
import { mintWillAccessToken } from "@/lib/willAccessToken";

function maxStarts(): number {
  const raw = process.env.MAX_WILLS_PER_PHONE;
  const n = raw ? parseInt(raw, 10) : 10;
  return Number.isFinite(n) && n >= 1 ? n : 10;
}

function okPayload(e164: string) {
  const accessToken = mintWillAccessToken(e164);
  return NextResponse.json({
    ok: true,
    normalized: e164,
    ...(accessToken ? { accessToken } : {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const refreshOnly = body.refreshToken === true;
    const e164 = toE164Digits(rawPhone);

    if (!e164) {
      return NextResponse.json(
        { ok: false, error: "Ange ett giltigt svenskt mobilnummer (07X-XXXXXXX)." },
        { status: 400 }
      );
    }

    const ip = getRequestIp(req);
    const bucket = refreshOnly ? `refresh-will:${ip}` : `start-will:${ip}`;
    if (!takeRateSlot(bucket, RATE_START_WILL.max, RATE_START_WILL.windowMs)) {
      return NextResponse.json(
        { ok: false, error: "För många försök. Vänta en liten stund och försök igen." },
        { status: 429 }
      );
    }

    const admin = getSupabaseAdmin();
    const limit = maxStarts();

    if (refreshOnly) {
      if (!admin) {
        return okPayload(e164);
      }
      const { data: row, error } = await admin
        .from("phone_will_access")
        .select("will_starts")
        .eq("phone_normalized", e164)
        .maybeSingle();

      if (error) {
        console.error("refresh-will token:", error);
        return NextResponse.json(
          { ok: false, error: "Kunde inte verifiera numret. Försök igen." },
          { status: 503 }
        );
      }
      const starts = row?.will_starts ?? 0;
      if (starts < 1) {
        return NextResponse.json(
          { ok: false, error: "Numret måste först bekräftas via startsidan." },
          { status: 403 }
        );
      }
      return okPayload(e164);
    }

    if (!admin) {
      console.warn("start-will: SUPABASE_SERVICE_ROLE_KEY not set — skipping DB limit (dev only)");
      const accessToken = mintWillAccessToken(e164);
      return NextResponse.json({
        ok: true,
        normalized: e164,
        dev: true,
        ...(accessToken ? { accessToken } : {}),
      });
    }

    const { data, error } = await admin.rpc("reserve_will_start", {
      p_phone: e164,
      p_max: limit,
    });

    if (error) {
      console.error("reserve_will_start:", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kunde inte kontrollera antal starter. Kontrollera att databasen är uppdaterad (migration reserve_will_start).",
        },
        { status: 503 }
      );
    }

    const row = data as { ok?: boolean; error?: string; max?: number } | null;
    if (!row?.ok) {
      const max = typeof row?.max === "number" ? row.max : limit;
      return NextResponse.json(
        {
          ok: false,
          error: `Det här numret har redan använts för att påbörja testamente för många gånger (max ${max}). Kontakta oss om du behöver hjälp.`,
        },
        { status: 429 }
      );
    }

    return okPayload(e164);
  } catch (e) {
    console.error("start-will:", e);
    return NextResponse.json({ ok: false, error: "Serverfel." }, { status: 500 });
  }
}
