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
            configured:
              present("FIREBASE_PROJECT_ID") &&
              present("FIREBASE_CLIENT_EMAIL") &&
              present("FIREBASE_PRIVATE_KEY"),
            detail: "Firestore project + service account",
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
          {
            service: "cloudinary",
            configured: present("CLOUDINARY_CLOUD_NAME") && present("CLOUDINARY_API_KEY"),
            detail: "Media hosting for images + 3D models",
          },
        ];

        let databaseReachable: boolean | null = null;
        try {
          const { adminQuery } = await import("@/lib/firebase-admin.server");
          await adminQuery("sofas", [], { limit: 1 });
          databaseReachable = true;
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