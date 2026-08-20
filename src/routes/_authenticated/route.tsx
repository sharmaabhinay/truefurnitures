import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[color:var(--brand-cream)] flex flex-col items-center justify-center gap-4">
        <div className="size-8 border-2 border-[color:var(--brand-dark)]/20 border-t-[color:var(--brand-dark)] rounded-full animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--brand-dark)]/50">
          {loading ? "Loading your account…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  return <Outlet />;
}
