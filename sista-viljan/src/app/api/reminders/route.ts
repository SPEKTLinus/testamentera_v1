import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { REMINDER_INCLUDED_MONTHS } from "@/lib/pricing";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM_EMAIL = "Sista Viljan <hej@sistaviljan.se>";

/** En påminnelse per användare när next_reminder_date passeras (sätts t.ex. vid köp + 12 månader). */
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

      // En påminnelse ingår i köpet; efter utskick stängs schemaläggning (sätt nytt datum vid nytt köp).
      await supabase
        .from("profiles")
        .update({
          last_reminder_sent: new Date().toISOString(),
          next_reminder_date: null,
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

  return {
    subject: "Påminnelse om ditt testamente",
    text: `Hej ${name},

Det här är en påminnelse från Sista Viljan — en tjänst som ingår i ditt köp under de första ${REMINDER_INCLUDED_MONTHS} månaderna.

Mycket kan hända på kort tid: ny familj, bostad eller relation. Det kan vara värt att läsa igenom ditt testamente och fundera på om något bör justeras. Ett nytt testamente som följer formkraven ersätter det tidigare.

Om ingenting har förändrats behöver du inte göra något — ditt nuvarande testamente gäller.

Öppna Sista Viljan: ${appUrl}/app

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
  };
}
