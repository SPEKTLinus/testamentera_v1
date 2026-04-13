import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

// Lazy-initialize to avoid build-time error when env var is not set
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM_EMAIL = "Sista Viljan <hej@sistaviljan.se>";

// This endpoint is called by the Supabase Edge Function (or a cron job).
// It processes users whose next_reminder_date is today and sends the correct email.
export async function POST(req: NextRequest) {
  // Protect with a shared secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REMINDER_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch users due for a reminder
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
      const email = buildEmail(user);
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: email.subject,
        text: email.text,
      });

      // Update next_reminder_date to today + 12 months
      const nextReminder = new Date();
      nextReminder.setFullYear(nextReminder.getFullYear() + 1);
      await supabase
        .from("profiles")
        .update({
          last_reminder_sent: new Date().toISOString(),
          next_reminder_date: nextReminder.toISOString().split("T")[0],
          storage_reminder_sent_90: user.scenario === "C",
        })
        .eq("id", user.id);

      sent++;
    } catch (err) {
      errors.push(`${user.email}: ${err}`);
    }
  }

  return NextResponse.json({ sent, errors });
}

type ReminderScenario = "A" | "B" | "C" | "D";

interface UserRow {
  id: string;
  email: string;
  name: string;
  storage_active: boolean;
  storage_expires_at: string | null;
  scenario: ReminderScenario;
}

function buildEmail(user: UserRow): { subject: string; text: string } {
  const name = user.name || "Hej";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sistaviljan.se";
  const expiryFormatted = user.storage_expires_at
    ? new Date(user.storage_expires_at).toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  switch (user.scenario) {
    case "A": // Has will, no storage
      return {
        subject: "Dags att se över ditt testamente?",
        text: `Hej ${name},

Det har gått ett år sedan du skrev ditt testamente.

Mycket kan hända på ett år — ny familjesituation, ny bostad, förändrade relationer. Om något har förändrats kan det vara värt en genomläsning.

Om ingenting har förändrats behöver du inte göra något. Ditt testamente gäller.

Se över mitt testamente: ${appUrl}/app

Uppdatering kostar 299 kr och tar ungefär tio minuter.

Visste du att du kan förvara ditt testamente säkert hos oss i 5 år? Dina nära vet alltid var de hittar det.

Läs mer om förvaring: ${appUrl}/account

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
      };

    case "B": // Has will + active storage
      return {
        subject: "Dags att se över ditt testamente?",
        text: `Hej ${name},

Det har gått ett år sedan du skrev ditt testamente.

Ditt testamente är säkert förvarat hos oss och dina kontaktpersoner har tillgång till det när det behövs.

Om något har förändrats det senaste året kan det vara värt en genomläsning.

Se över mitt testamente: ${appUrl}/app

Uppdatering kostar 299 kr och tar ungefär tio minuter.

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
      };

    case "C": // Storage expiring within 90 days
      return {
        subject: "Din förvaring hos Sista Viljan går snart ut",
        text: `Hej ${name},

Din förvaring hos oss går ut ${expiryFormatted}.

Efter det datum lagras ditt testamente inte längre hos oss och dina kontaktpersoner förlorar sin åtkomst.

Förnya för 999 kr så tar vi hand om det i ytterligare 5 år.

Förnya förvaring: ${appUrl}/account

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
      };

    case "D": // Storage expired
      return {
        subject: "Din förvaring har gått ut",
        text: `Hej ${name},

Din förvaring hos Sista Viljan gick ut ${expiryFormatted}.

Ditt testamente finns kvar i ditt konto men lagras inte längre säkert hos oss och dina kontaktpersoner har inte längre åtkomst.

Aktivera förvaring: ${appUrl}/account

— Sista Viljan

Sista Viljan är ett verktyg för att upprätta testamente. Vi tillhandahåller inte juridisk rådgivning.`,
      };
  }
}
