import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OtpInput } from "@/components/otp-input";
import { useAuth } from "@/lib/auth/auth-context";
import { COL, fsSet } from "@/lib/db/firestore";

type Props = {
  phone: string;
  verified: boolean;
  onVerified: (phone: string) => void;
};

function normalise(p: string) {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return p.startsWith("+") ? p : `+${digits}`;
}

/** Mandatory phone OTP gate (Firebase phone auth) before an order can be placed. */
export function PhoneVerify({ phone, verified, onVerified }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<"idle" | "sending" | "code" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const confirmationRef = useRef<{ confirm: (c: string) => Promise<unknown> } | null>(null);
  const verifierRef = useRef<{ clear: () => void } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => () => { verifierRef.current?.clear?.(); }, []);

  const sendCode = async () => {
    const e164 = normalise(phone);
    if (!/^\+\d{11,15}$/.test(e164)) {
      toast.error("Enter a valid 10-digit mobile number first");
      return;
    }
    setStage("sending");
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase");
      const { RecaptchaVerifier, signInWithPhoneNumber, linkWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      verifierRef.current?.clear?.();
      const verifier = new RecaptchaVerifier(auth, "tf-recaptcha", { size: "invisible" });
      verifierRef.current = verifier as unknown as { clear: () => void };
      // Link the number to the SIGNED-IN account. Using signInWithPhoneNumber here
      // would swap the session for a brand-new phone-only user and duplicate the customer.
      const current = auth.currentUser;
      const confirmation = current
        ? await linkWithPhoneNumber(current, e164, verifier)
        : await signInWithPhoneNumber(auth, e164, verifier);
      confirmationRef.current = confirmation as unknown as { confirm: (c: string) => Promise<unknown> };
      setStage("code");
      setCode("");
      setSecondsLeft(45);
      toast.success(`OTP sent to ${e164}`);
    } catch (err) {
      console.error(err);
      setStage("idle");
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/provider-already-linked") {
        // Already verified on this account — nothing more to do.
        await markVerified();
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not send OTP");
    }
  };

  const markVerified = async () => {
    const e164 = normalise(phone);
    if (user?.uid) {
      await fsSet(COL.profiles, user.uid, {
        phone: e164,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      }).catch(() => {});
    }
    toast.success("Phone number verified");
    onVerified(e164);
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || !confirmationRef.current) return;
    setStage("verifying");
    setError(false);
    try {
      await confirmationRef.current.confirm(value);
      await markVerified();
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/credential-already-in-use" || code === "auth/provider-already-linked") {
        // The number already belongs to this customer — treat as verified.
        await markVerified();
        return;
      }
      setError(true);
      setStage("code");
      toast.error("Incorrect or expired OTP. Try again.");
    }
  };

  if (verified) {
    return <VerifiedBadge label="Mobile verified" />;
  }

  return (
    <div className="mt-2 animate-fade-up">
      {stage !== "code" && stage !== "verifying" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Not verified
          </span>
          <button
            type="button"
            onClick={sendCode}
            disabled={stage === "sending"}
            className="px-3 py-1.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
          >
            {stage === "sending" ? "Sending…" : "Send OTP"}
          </button>
          <span className="text-[10px] text-[color:var(--brand-dark)]/50">OTP is required to place an order</span>
        </div>
      ) : (
        <div className="animate-fade-up">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50 mb-1.5">
            Code sent to {normalise(phone)}
          </p>
          <OtpInput
            compact
            value={code}
            onChange={(v) => { setCode(v); setError(false); }}
            onComplete={verify}
            disabled={stage === "verifying"}
            error={error}
          />
          {error && <p className="text-[11px] text-red-600 mt-1.5">Incorrect or expired code — try again.</p>}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => verify(code)}
              disabled={code.length !== 6 || stage === "verifying"}
              className="px-3 py-1.5 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-50"
            >
              {stage === "verifying" ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              disabled={secondsLeft > 0 || stage === "verifying"}
              onClick={sendCode}
              className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)] disabled:opacity-40"
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      )}
      <div id="tf-recaptcha" />
    </div>
  );
}

/** Small green "verified" pill shown next to a phone or email field. */
export function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-[tf-pulse-ring_2s_ease-out_infinite]" />
        <span className="relative inline-flex rounded-full size-2 bg-emerald-600" />
      </span>
      {label}
    </span>
  );
}

/** Small amber "unverified" pill shown next to a phone or email field. */
export function UnverifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1">
      <span className="size-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}
