import { useEffect, useRef, useState } from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
};

/** Fancy animated OTP entry — auto-advance, paste support, shake on error. */
export function OtpInput({ length = 6, value, onChange, onComplete, disabled, error }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState<number | null>(null);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setAt = (i: number, char: string) => {
    const next = value.split("");
    next[i] = char;
    const joined = next.join("").slice(0, length).replace(/\D/g, "");
    onChange(joined);
  };

  return (
    <div className={`flex gap-2 sm:gap-3 ${error ? "animate-[tf-shake_0.4s_ease-in-out]" : ""}`}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? "";
        const active = focused === i || (focused === null && value.length === i);
        return (
          <div key={i} className="relative flex-1">
            <input
              ref={(el) => { refs.current[i] = el; }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              disabled={disabled}
              value={char}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              onPaste={(e) => {
                e.preventDefault();
                const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
                if (digits) {
                  onChange(digits);
                  refs.current[Math.min(digits.length, length - 1)]?.focus();
                }
              }}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "");
                if (!d) { setAt(i, ""); return; }
                if (d.length > 1) {
                  onChange((value.slice(0, i) + d).slice(0, length));
                  refs.current[Math.min(i + d.length, length - 1)]?.focus();
                  return;
                }
                setAt(i, d);
                if (i < length - 1) refs.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !char && i > 0) {
                  refs.current[i - 1]?.focus();
                  setAt(i - 1, "");
                  e.preventDefault();
                }
                if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
              }}
              className={[
                "w-full aspect-square text-center font-display text-2xl bg-white outline-none transition-all duration-300",
                "border",
                error
                  ? "border-red-500 text-red-600"
                  : char
                    ? "border-[color:var(--brand-dark)] scale-[1.04]"
                    : "border-[color:var(--brand-dark)]/15",
                active && !error ? "ring-2 ring-[color:var(--brand-accent)]/40 border-[color:var(--brand-accent)]" : "",
                disabled ? "opacity-60" : "",
              ].join(" ")}
            />
            <span
              className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 h-[2px] bg-[color:var(--brand-accent)] transition-all duration-300 ${char ? "w-6 opacity-100" : "w-0 opacity-0"}`}
            />
          </div>
        );
      })}
    </div>
  );
}