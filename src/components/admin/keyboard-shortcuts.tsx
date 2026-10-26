import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { INVOICE_SHORTCUT, SHORTCUTS_CHANGED, keyStroke, loadShortcuts, matchShortcut, type Shortcut } from "@/lib/admin-shortcuts";

export function AdminKeyboardShortcuts() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!user || !isStaff) return;
    let rows = loadShortcuts(user.uid);
    let sequence = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { sequence = ""; if (timer) clearTimeout(timer); };
    const refresh = () => { rows = loadShortcuts(user.uid); reset(); };
    const execute = (row: Shortcut) => {
      reset();
      if (row.action === "invoice") window.dispatchEvent(new Event(INVOICE_SHORTCUT));
      else void navigate({ to: "/admin", search: row.action === "dashboard" ? {} : { p: row.action } });
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.defaultPrevented || event.repeat || event.isComposing ||
        (target instanceof Element && target.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]')) ||
        document.querySelector('[role="dialog"],[role="alertdialog"],[data-admin-modal]')) { reset(); return; }
      if (event.key === "Escape") { reset(); return; }
      const stroke = keyStroke(event);
      if (!stroke) return;
      const orderDetails = /^\/admin\/orders\/[^/]+\/?$/.test(pathname);
      let next = sequence ? `${sequence} ${stroke}` : stroke;
      let match = matchShortcut(rows, next, orderDetails);
      if (!match.exact && !match.prefix) { next = stroke; match = matchShortcut(rows, next, orderDetails); }
      reset();
      if (!match.exact && !match.prefix) return;
      event.preventDefault();
      sequence = next;
      if (match.prefix) {
        const pending = match.exact;
        timer = setTimeout(() => { if (pending) execute(pending); else reset(); }, 750);
      } else if (match.exact) execute(match.exact);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(SHORTCUTS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { reset(); window.removeEventListener("keydown", onKey); window.removeEventListener(SHORTCUTS_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, [user, isStaff, pathname, navigate]);
  return null;
}