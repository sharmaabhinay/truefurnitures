import type React from "react";

/** Shared dark-theme primitives for the admin panels. */
export const dark = {
  bg: "#0F0F13",
  card: "#1E1E28",
  field: "#16161D",
  border: "#2A2A38",
  text: "#E8E8F0",
  mute: "#888899",
  accent: "#C8A86B",
  danger: "#E05050",
  good: "#4CAF82",
};

export function ACard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 ${className}`} style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
      {children}
    </div>
  );
}

export function AInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full rounded-md px-3 py-2 text-[13px] outline-none ${className}`}
      style={{ background: dark.field, border: `1px solid ${dark.border}`, color: dark.text, ...style }}
    />
  );
}

export function ATextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-md px-3 py-2 text-[13px] outline-none ${className}`}
      style={{ background: dark.field, border: `1px solid ${dark.border}`, color: dark.text, ...style }}
    />
  );
}

export function ASelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full rounded-md px-3 py-2 text-[13px] outline-none ${className}`}
      style={{ background: dark.field, border: `1px solid ${dark.border}`, color: dark.text, ...style }}
    />
  );
}

export function ALabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: dark.mute }}>{children}</span>
      {hint && <span className="text-[10px]" style={{ color: "#5f5f70" }}>{hint}</span>}
    </div>
  );
}

export function AField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <ALabel hint={hint}>{label}</ALabel>
      {children}
    </div>
  );
}

export function AButton({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: dark.accent, color: "#1a1a1a", border: "1px solid transparent" },
    ghost: { background: "rgba(255,255,255,0.04)", color: dark.text, border: `1px solid ${dark.border}` },
    danger: { background: "transparent", color: dark.danger, border: `1px solid rgba(224,80,80,0.4)` },
  };
  const { className = "", style, ...props } = rest;
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-[12px] font-semibold transition-opacity disabled:opacity-50 ${className}`}
      style={{ ...styles[variant], ...style }}
    >
      {children}
    </button>
  );
}

export function AToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-[12px]"
      style={{ color: dark.text }}
    >
      <span
        className="relative inline-block h-5 w-9 rounded-full transition-colors"
        style={{ background: checked ? dark.accent : "#33333F" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
      {label}
    </button>
  );
}

/** Centered dialog with a scrollable body. */
export function AModal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-2xl my-4 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
        style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: dark.border }}>
          <div>
            <div className="text-[15px] font-semibold">{title}</div>
            {subtitle && <div className="text-[11px] mt-0.5" style={{ color: dark.mute }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-lg leading-none px-2" style={{ color: dark.mute }} aria-label="Close">×</button>
        </div>
        <div className="px-5 py-5 space-y-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: dark.border }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AEmpty({ icon = "📭", text }: { icon?: string; text: string }) {
  return (
    <div className="py-12 text-center" style={{ color: dark.mute }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-[13px]">{text}</div>
    </div>
  );
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
