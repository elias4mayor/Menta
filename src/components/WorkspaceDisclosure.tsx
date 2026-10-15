"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { NavIcon } from "@/components/NavIcons";

/** Native disclosure keeps controls keyboard accessible and mounted when closed. */
export function WorkspaceDisclosure({ id, title, summary, icon, children, open = false }: {
  id: string; title: string; summary: string; icon: string; children: ReactNode; open?: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function revealAnchor() {
      if (window.location.hash === `#${id}` && details.current) {
        details.current.open = true;
        details.current.scrollIntoView({ block: "nearest" });
      }
    }
    revealAnchor();
    window.addEventListener("hashchange", revealAnchor);
    return () => window.removeEventListener("hashchange", revealAnchor);
  }, [id]);
  return <details className="workspace-disclosure" id={id} ref={details} open={open}>
    <summary><span className="workspace-disclosure-icon"><NavIcon name={icon} /></span><span className="workspace-disclosure-label"><strong>{title}</strong><small>{summary}</small></span><span className="workspace-disclosure-plus" aria-hidden="true">+</span></summary>
    <div className="workspace-disclosure-content">{children}</div>
  </details>;
}
