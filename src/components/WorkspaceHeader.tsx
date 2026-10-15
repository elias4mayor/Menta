import type { ReactNode } from "react";
import { NavIcon } from "@/components/NavIcons";

/** Shared page identity; data, permissions, and actions stay in each page. */
export function WorkspaceHeader({ title, section, description, icon, children }: {
  title: string;
  section: string;
  description: string;
  icon: string;
  children?: ReactNode;
}) {
  return (
    <header className="workspace-heading">
      <div className="workspace-heading-main">
        <div className="workspace-eyebrow"><span className="workspace-heading-icon"><NavIcon name={icon} /></span>{section}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children ? <div className="workspace-heading-aside">{children}</div> : null}
    </header>
  );
}
