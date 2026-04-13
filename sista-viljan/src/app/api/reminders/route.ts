import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { REMINDER_RECURRING_INTERVAL_MONTHS } from "@/lib/pricing";

/** Nästa kalenderdatum (YYYY-MM-DD) ungefär `months` månader från idag. */
function nextReminderDateFromNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM_EMAIL = "Sista Viljan <hej@sistaviljan.se>";

/** Skickar påminnelse när next_reminder_date passeras; efter utskick schemalägs nästa +REMINDER_RECURRING_INTERVAL_MONTHS. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REMINDER_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: users, error } = await supabase
    .from("users_with_reminders")
    .select("*")
    .lte("next_reminder_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const user of users || []) {
    try {
      const email = buildReminderEmail(user);
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: email.subject,
        text: email.text,
      });

      const nextDate = nextReminderDateFromNow(REMINDER_RECURRING_INTERVAL_MONTHS);
      await supabase
        .from("profiles")
        .update({
          last_reminder_sent: new Date().toISOString(),
          next_reminder_date: nextDate,
        })
        .eq("id", user.id);

      sent++;
    } catch (err) {
      errors.push(`${user.email}: ${err}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

interface UserRow {
  id: string;
  email: string;
  name: string;
}

function buildReminderEmail(user: UserRow): { subject: string; text: string } {
  const name = user.name || "Hej";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistaviljan.se";
  const every = REMINDER_RECURRING_INTERVAL_MONTHS;

  return {
    subject: "Dags att se över ditt testamente?",
    text: `Hej ${name},

Det här är en återkommande påminnelse från Sista Viljan — den ingår i ditt köp. Vi skickar den ungefär var ${every}:e månad som en enkel påminnelse om att se över testamentet när livet förändras (barn, bostad, relation med mera).

Du behöver inte svara på det här mejlet. Nästa liknande påminnelse kommer om ungefär ${every} månader om inget annat ändras.

Om något har förändrats kan det vara läge att uppdatera testamentet. Ett nytt testamente som följer formkraven ersätter det tidigare. Om ingenting har förändrats behöver du inte göra något — ditt nuvarande testamente gäller.

Öppna Sista Viljan: ${appUrl}/app

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
  };
}
