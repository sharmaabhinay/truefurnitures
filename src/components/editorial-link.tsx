import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { safeHref } from "@/lib/page-layout";

export function EditorialLink({ href, children, className, ariaLabel, onClick }: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  const url = safeHref(href);
  if (!url) return <span className={className}>{children}</span>;
  if (url.startsWith("https://")) return <a href={url} target="_blank" rel="noreferrer" className={className} aria-label={ariaLabel} onClick={onClick}>{children}</a>;
  return <Link to={url as string} className={className} aria-label={ariaLabel} onClick={onClick}>{children}</Link>;
}
