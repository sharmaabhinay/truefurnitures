import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { getFirebaseAuth } from "@/lib/firebase";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Attaches the current Firebase user's ID token to server function requests
// so protected serverFns can verify the caller on the server side.
const attachFirebaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const currentUser = getFirebaseAuth().currentUser;
  const token = currentUser ? await currentUser.getIdToken() : null;
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
  functionMiddleware: [attachSupabaseAuth, attachFirebaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
