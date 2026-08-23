import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared "nothing here yet" treatment for a page's primary content area —
 * title + a real explanation of what will appear and why, optionally a
 * single next action. Not used for small inline widget slots (a dashboard
 * card's "Nothing on the calendar yet" stays a plain sentence — using this
 * there would be heavier than the space it sits in); this is for the case
 * where an empty list *is* the page's main content.
 *
 * `actionLabel`/`actionHref` cover the common "go somewhere else to start"
 * case (e.g. Highlights → Film library). Where a create/upload control is
 * already visible elsewhere on the same page (Training, Performance,
 * Documents, Film all already have one above their list), no action is
 * passed here — a second button pointing at the same control would just
 * duplicate it. `children` covers the case where the real next step is an
 * embedded component (Team's join-or-create form), not a separate route.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-center py-10 px-6">
      <p className="text-text-1 text-base font-semibold mb-1.5">{title}</p>
      {description && <p className="text-text-2 text-sm max-w-sm mx-auto">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-secondary inline-flex mt-4">
          {actionLabel}
        </Link>
      )}
      {children && <div className="mt-5 text-left">{children}</div>}
    </div>
  );
}
