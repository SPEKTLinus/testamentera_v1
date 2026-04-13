// Supabase Edge Function — called daily by pg_cron
// Triggers the Next.js reminder API endpoint
//
// Deploy: supabase functions deploy send-reminders
// Schedule: SELECT cron.schedule('send-reminders', '0 8 * * *', $$
//   SELECT net.http_post(
//     url := 'https://your-app.vercel.app/api/reminders',
//     headers := '{"Authorization": "Bearer YOUR_REMINDER_SECRET", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb
//   );
// $$);

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const secret = Deno.env.get("REMINDER_SECRET") ?? "";

  const res = await fetch(`${appUrl}/api/reminders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();
  console.log("Reminder result:", data);

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
