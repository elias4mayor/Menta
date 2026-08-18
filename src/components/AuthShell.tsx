import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-bg">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center mb-10">
          <Image src="/logo.png" alt="MENTA" width={863} height={194} className="h-7 w-auto" priority />
        </Link>
        <div className="card p-8">
          <div className="mono text-text-3 mb-2">{eyebrow}</div>
          <h1 className="text-2xl font-semibold mb-1">{title}</h1>
          {subtitle && <p className="text-text-2 text-sm mb-6">{subtitle}</p>}
          <div className={subtitle ? "" : "mt-6"}>{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-text-2">{footer}</div>}
      </div>
    </div>
  );
}
