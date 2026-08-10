import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { logVisitor } from "@/lib/visitor-tracker";

/** Logs a session once per tab plus a page view on every navigation. */
export function VisitorTrackerBoot() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    try {
      if (!window.sessionStorage.getItem("tf_session_logged")) {
        window.sessionStorage.setItem("tf_session_logged", "1");
        logVisitor({ type: "session", page: path, city: window.localStorage.getItem("tf_city") ?? undefined });
      }
    } catch { /* ignore */ }
    logVisitor({ type: "visit", page: path });
  }, [path]);
  return null;
}
