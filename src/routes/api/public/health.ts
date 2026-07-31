import { createFileRoute } from "@tanstack/react-router";

type Check = { service: string; configured: boolean; detail: string };

function present(name: string) {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

// Lightweight configuration health check for integrations.
// Only reports whether a value exists — never the value itself.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Check[] = [
          {
            service: "database",
            configured: present("SUPABASE_URL") && present("SUPABASE_SERVICE_ROLE_KEY"),
            detail: "Database URL + service key",
          },
          {
            service: "razorpay",
            configured: present("RAZORPAY_KEY_ID") && present("RAZORPAY_KEY_SECRET"),
            detail: "Payment key id + secret",
          },
          {
            service: "razorpay_webhook",
            configured: present("RAZORPAY_WEBHOOK_SECRET"),
            detail: "Webhook signing secret",
          },
          {
            service: "resend",
            configured: present("RESEND_API_KEY"),
            detail: "Transactional email API key",
          },
          {
            service: "firebase_phone_auth",
            configured: true,
            detail: "Firebase Web SDK config bundled client-side",
          },
        ];

        let databaseReachable: boolean | null = null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("sofas").select("id").limit(1);
          databaseReachable = !error;
        } catch {
          databaseReachable = false;
        }

        const ok = checks.every((c) => c.configured) && databaseReachable === true;
        return Response.json(
          { ok, timestamp: new Date().toISOString(), databaseReachable, checks },
          { status: ok ? 200 : 503 },
        );
      },
    },
  },
});