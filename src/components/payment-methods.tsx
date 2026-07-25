type Props = { compact?: boolean };

const METHODS = [
  { key: "upi", label: "UPI", sub: "GPay · PhonePe · Paytm" },
  { key: "cards", label: "Cards", sub: "Visa · Mastercard · Rupay · Amex" },
  { key: "netbanking", label: "Netbanking", sub: "All major banks" },
  { key: "wallets", label: "Wallets", sub: "Paytm · Mobikwik · Freecharge" },
  { key: "emi", label: "EMI", sub: "No-cost EMI available" },
  { key: "cod", label: "Pay on Delivery", sub: "Balance 80% at doorstep" },
];

function Icon({ k }: { k: string }) {
  const common = "size-6 text-[color:var(--brand-dark)]";
  switch (k) {
    case "upi":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 4l6 8-6 8M12 4l6 8-6 8" />
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" />
        </svg>
      );
    case "netbanking":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 10l9-6 9 6M5 10v8M12 10v8M19 10v8M3 20h18" />
        </svg>
      );
    case "wallets":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7h15a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /><path d="M3 7l2-3h11l2 3" /><circle cx="17" cy="14" r="1.2" fill="currentColor" />
        </svg>
      );
    case "emi":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h4M7 14h10" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7h13l5 5v5H3z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
      );
  }
}

export function PaymentMethods({ compact }: Props) {
  return (
    <section className={`bg-white border border-[color:var(--brand-dark)]/10 ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-display text-lg">Accepted Payment Methods</h2>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>
          Secured by Razorpay
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {METHODS.map((m) => (
          <div key={m.key} className="flex items-center gap-3 p-3 border border-[color:var(--brand-dark)]/10 hover:border-[color:var(--brand-dark)]/30 transition-colors">
            <Icon k={m.key} />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest leading-tight">{m.label}</p>
              <p className="text-[10px] text-[color:var(--brand-dark)]/55 truncate">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[color:var(--brand-dark)]/55">
        <span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 10V7a6 6 0 1112 0v3"/><rect x="4" y="10" width="16" height="11" rx="2"/></svg>256-bit SSL</span>
        <span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>PCI DSS Compliant</span>
        <span className="inline-flex items-center gap-1"><svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Instant confirmation</span>
      </div>
    </section>
  );
}