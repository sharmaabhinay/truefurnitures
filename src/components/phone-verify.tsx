import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OtpInput } from "@/components/otp-input";
import { supabase } from "@/integrations/supabase/client";

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
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
      const auth = getFirebaseAuth();
      verifierRef.current?.clear?.();
      const verifier = new RecaptchaVerifier(auth, "tf-recaptcha", { size: "invisible" });
      verifierRef.current = verifier as unknown as { clear: () => void };
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      confirmationRef.current = confirmation as unknown as { confirm: (c: string) => Promise<unknown> };
      setStage("code");
      setCode("");
      setSecondsLeft(45);
      toast.success(`OTP sent to ${e164}`);
    } catch (err) {
      console.error(err);
      setStage("idle");
      toast.error(err instanceof Error ? err.message : "Could not send OTP");
    }
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || !confirmationRef.current) return;
    setStage("verifying");
    setError(false);
    try {
      await confirmationRef.current.confirm(value);
      const e164 = normalise(phone);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await supabase
          .from("profiles")
          .update({ phone: e164, phone_verified: true, phone_verified_at: new Date().toISOString() })
          .eq("id", uid);
      }
      toast.success("Phone number verified");
      onVerified(e164);
    } catch (err) {
      console.error(err);
      setError(true);
      setStage("code");
      toast.error("Incorrect or expired OTP. Try again.");
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-[tf-pulse-ring_2s_ease-out_infinite]" />
          <span className="relative inline-flex rounded-full size-2.5 bg-emerald-600" />
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Mobile verified</p>
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--brand-accent)]/40 bg-[color:var(--brand-muted)]/40 p-4 sm:p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-accent)]">Required</p>
          <p className="font-display text-lg mt-1">Verify your mobile number</p>
          <p className="text-xs text-[color:var(--brand-dark)]/60 mt-1">
            We verify every order by OTP so your bespoke build never goes to the wrong doorstep.
          </p>
        </div>
        {stage !== "code" && stage !== "verifying" && (
          <button
            type="button"
            onClick={sendCode}
            disabled={stage === "sending"}
            className="shrink-0 px-4 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-60"
          >
            {stage === "sending" ? "Sending…" : "Send OTP"}
          </button>
        )}
      </div>

      {(stage === "code" || stage === "verifying") && (
        <div className="mt-5 animate-fade-up">
          <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--brand-dark)]/50 mb-2">
            Enter the 6-digit code sent to {normalise(phone)}
          </p>
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); setError(false); }}
            onComplete={verify}
            disabled={stage === "verifying"}
            error={error}
          />
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              disabled={secondsLeft > 0 || stage === "verifying"}
              onClick={sendCode}
              className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/60 hover:text-[color:var(--brand-accent)] disabled:opacity-40"
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend OTP"}
            </button>
            <button
              type="button"
              onClick={() => verify(code)}
              disabled={code.length !== 6 || stage === "verifying"}
              className="px-5 py-3 bg-[color:var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[color:var(--brand-accent)] transition-colors disabled:opacity-50"
            >
              {stage === "verifying" ? "Verifying…" : "Verify"}
            </button>
          </div>
        </div>
      )}
      <div id="tf-recaptcha" />
    </div>
  );
}