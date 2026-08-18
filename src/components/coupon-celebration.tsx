import { useEffect, useState } from "react";
import { FiCheck } from "react-icons/fi";

const COLORS = ["var(--brand-accent)", "var(--brand-dark)", "#4CAF82", "#E0A050", "#C8A86B"];

/** Full-screen confetti burst + savings card shown when a coupon is applied. */
export function CouponCelebration({
  code,
  amount,
  onDone,
}: {
  code: string;
  amount: string;
  onDone: () => void;
}) {
  const [pieces] = useState(() =>
    Array.from({ length: 46 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 350,
      duration: 1400 + Math.random() * 900,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 7,
    })),
  );

  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="tf-celebrate-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.7,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-24 flex justify-center px-4">
        <div className="animate-pop bg-white border border-[color:var(--brand-dark)]/15 shadow-xl px-5 py-4 flex items-center gap-3">
          <span className="grid place-items-center size-9 rounded-full bg-emerald-600 text-white">
            <FiCheck size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
              Coupon {code} applied
            </p>
            <p className="font-display text-xl leading-tight">You saved {amount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
