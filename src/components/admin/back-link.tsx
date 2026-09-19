import { useRouter } from "@tanstack/react-router";
import { dark } from "@/components/admin/ui";

type Props = {
  label?: string;
  /** Fallback destination when there is no history to go back to. */
  fallbackPanel?: string;
  className?: string;
  muted?: boolean;
};

/**
 * Steps back through browser history so deep admin pages return to the
 * screen the admin actually came from, instead of jumping to the dashboard.
 */
export function AdminBackLink({ label = "← Back", fallbackPanel, className, muted }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void router.navigate({
      to: "/admin",
      search: fallbackPanel ? { p: fallbackPanel } : {},
    });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={className ?? "text-[12px]"}
      style={{ color: muted ? dark.mute : dark.accent }}
    >
      {label}
    </button>
  );
}
