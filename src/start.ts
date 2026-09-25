import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { getFirebaseAuth, firebaseAuthReady } from "@/lib/firebase";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Server functions rely on TanStack's serialized error/Response handling.
    // Replacing a thrown Response with our HTML error page makes the client
    // report a generic deserialization failure instead of the real status.
    if (error instanceof Response) {
      throw error;
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Let server-function errors cross the RPC boundary in their native shape.
    // The branded HTML page is only appropriate for document requests.
    const request = typeof Request !== "undefined" ? undefined : undefined;
    void request;
    console.error(error);
    throw error;
  }
});

// Attaches the current Firebase user's ID token to server function requests
// so protected serverFns can verify the caller on the server side.
const attachFirebaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  if (typeof window === "undefined") return next();
  // Wait for the persisted session to be restored before reading currentUser,
  // otherwise a call made right after a reload ships no Authorization header.
  const currentUser = (await firebaseAuthReady()) ?? getFirebaseAuth().currentUser;
  let token: string | null = null;
  try {
    // Force a refresh: long-running flows (e.g. the Razorpay modal) can otherwise
    // ship a near-expired cached token, which the server rejects as invalid.
    token = currentUser ? await currentUser.getIdToken(true) : null;
  } catch {
    try {
      token = currentUser ? await currentUser.getIdToken() : null;
    } catch {
      token = null;
    }
  }
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});


// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  // Firebase is this app's auth provider; the Supabase attacher would overwrite
  // the Authorization header with a Supabase token and break serverFn auth.
  functionMiddleware: [attachFirebaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
