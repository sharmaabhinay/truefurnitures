import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-function middleware: verifies the caller's Firebase ID token
 * (sent as `Authorization: Bearer <idToken>`) and puts the uid on context.
 */
export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Unauthorized: missing bearer token");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw new Error("Unauthorized: missing bearer token");

    const { verifyIdToken } = await import("@/lib/firebase-admin.server");
    const user = await verifyIdToken(token).catch((err) => {
      console.error("[auth] verifyIdToken failed:", err);
      return null;
    });
    if (!user) throw new Error("Unauthorized: invalid session");

    return next({
      context: { userId: user.uid, email: user.email ?? null, role: user.role ?? "user" },
    });
  },
);