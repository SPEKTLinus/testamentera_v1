import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Swish posts payment status updates here
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { id: paymentId, status, payeePaymentReference: draftId } = data;

    if (status === "PAID" && supabase && draftId) {
      // Mark the draft as paid in Supabase
      await supabase
        .from("will_drafts")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("id", draftId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Swish callback error:", error);
    return NextResponse.json({ error: "Callback error" }, { status: 500 });
  }
}
