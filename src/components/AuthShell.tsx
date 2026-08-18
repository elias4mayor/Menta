import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LiveGallery, GALLERY_SLIDES } from "@/components/LiveGallery";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  liveBackground = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Rotating athlete-photo background behind the card, like the homepage hero. */
  liveBackground?: boolean;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 bg-bg overflow-hidden">
      {liveBackground && <LiveGallery slides={GALLERY_SLIDES} heroBg />}
      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center mb-10">
          <Image
            src="/logo.png"
            alt="MENTA"
            width={863}
            height={194}
            className="h-7 w-auto"
            style={liveBackground ? { filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.7))" } : undefined}
            priority
          />
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
