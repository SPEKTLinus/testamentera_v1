import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { toE164Digits } from "@/lib/phone";

function maxStarts(): number {
  const raw = process.env.MAX_WILLS_PER_PHONE;
  const n = raw ? parseInt(raw, 10) : 10;
  return Number.isFinite(n) && n >= 1 ? n : 10;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const e164 = toE164Digits(rawPhone);

    if (!e164) {
      return NextResponse.json(
        { ok: false, error: "Ange ett giltigt svenskt mobilnummer (07X-XXXXXXX)." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const limit = maxStarts();

    if (!admin) {
      console.warn("start-will: SUPABASE_SERVICE_ROLE_KEY not set — skipping DB limit (dev only)");
      return NextResponse.json({
        ok: true,
        normalized: e164,
        dev: true,
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

    return NextResponse.json({ ok: true, normalized: e164 });
  } catch (e) {
    console.error("start-will:", e);
    return NextResponse.json({ ok: false, error: "Serverfel." }, { status: 500 });
  }
}
