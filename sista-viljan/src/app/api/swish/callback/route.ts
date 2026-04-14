import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { WILL_FREE_SLOTS_PER_WILL_PURCHASE } from "@/lib/pricing";
import { parseSwishPayeeReference } from "@/lib/swishPayeeReference";

function freeSlotsPerWillPurchase(): number {
  const raw = process.env.WILL_FREE_SLOTS_PER_WILL_PURCHASE?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return WILL_FREE_SLOTS_PER_WILL_PURCHASE;
}

// Swish posts payment status updates here
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { status, payeePaymentReference: ref } = data;

    if (status !== "PAID" || ref == null || String(ref).trim() === "") {
      return NextResponse.json({ received: true });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      console.warn("swish/callback: SUPABASE_SERVICE_ROLE_KEY saknas — hoppar DB-uppdatering");
      return NextResponse.json({ received: true });
    }

    const parsed = parseSwishPayeeReference(String(ref));
    if (!parsed) {
      console.warn("swish/callback: okänd payeePaymentReference-form:", ref);
      return NextResponse.json({ received: true });
    }

    const { draftId, product } = parsed;

    if (product === "will") {
      const { data: updated, error: upErr } = await admin
        .from("will_drafts")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("id", draftId)
        .eq("paid", false)
        .select("id");

      if (upErr) {
        console.error("swish/callback: update will_drafts", upErr);
        return NextResponse.json({ received: true });
      }

      if (!updated?.length) {
        return NextResponse.json({ received: true });
      }

      const n = freeSlotsPerWillPurchase();
      const { error: grantErr } = await admin.rpc("grant_will_free_slots", { p_n: n });
      if (grantErr) {
        console.error("swish/callback: grant_will_free_slots", grantErr);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Swish callback error:", error);
    return NextResponse.json({ error: "Callback error" }, { status: 500 });
  }
}
