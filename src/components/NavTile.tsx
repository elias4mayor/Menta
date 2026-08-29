import Link from "next/link";
import { NavIcon } from "@/components/NavIcons";

/**
 * The one reusable "destination card" for real navigation — replaces a
 * plain underlined <Link> anywhere it was standing in for actual
 * navigation (as opposed to an inline, in-sentence prose link, which
 * stays a normal underlined link on purpose). Built from .nav-tile in
 * globals.css, which is itself built entirely from existing tokens.
 */
export function NavTile({
  href,
  icon,
  label,
  description,
  compact = false,
}: {
  href: string;
  icon: string;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className={`nav-tile${compact ? " nav-tile-compact" : ""}`}>
      <span className="nav-tile-icon">
        <NavIcon name={icon} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-semibold truncate ${compact ? "text-xs" : "text-sm"}`}>{label}</span>
        {description && !compact && <span className="block text-text-3 text-xs mt-0.5 truncate">{description}</span>}
      </span>
      <svg width={compact ? "14" : "16"} height={compact ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-3 shrink-0" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
