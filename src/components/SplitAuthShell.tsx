import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LiveGallery, GALLERY_SLIDES } from "@/components/LiveGallery";

/**
 * Split-panel login/signup layout: a full-bleed rotating athlete-photo
 * panel on one side, a clean black form panel on the other. On mobile the
 * photo panel collapses to an ambient full-bleed background behind the
 * form instead of a separate column (there's no room for both).
 */
export function SplitAuthShell({
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
    <div className="relative min-h-screen flex flex-col md:flex-row bg-bg overflow-hidden">
      <div className="absolute inset-0 md:relative md:inset-auto md:w-[46%] lg:w-1/2 overflow-hidden">
        <LiveGallery slides={GALLERY_SLIDES} heroBg />
        <div className="absolute inset-0 z-[1]" style={{ background: "rgba(8,8,10,0.5)" }} />
        <div className="hidden md:flex absolute inset-0 z-10 flex-col justify-between p-10 lg:p-14">
          <Link href="/" className="inline-flex w-fit">
            <Image
              src="/logo.png"
              alt="MENTA"
              width={863}
              height={194}
              className="h-6 w-auto"
              style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.7))" }}
              priority
            />
          </Link>
          <div>
            <div className="mono mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
              Athlete Operating System
            </div>
            <h2
              className="text-4xl lg:text-5xl font-semibold text-white leading-[1.05]"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}
            >
              Build the athlete.
              <br />
              Build the mind.
            </h2>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-16 md:py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center justify-center mb-10">
            <Image
              src="/logo.png"
              alt="MENTA"
              width={863}
              height={194}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <div className="mono text-text-3 mb-2">{eyebrow}</div>
          <h1 className="text-3xl font-semibold mb-1">{title}</h1>
          {subtitle && <p className="text-text-2 text-sm mb-8">{subtitle}</p>}
          <div className={subtitle ? "" : "mt-8"}>{children}</div>
          {footer && <div className="mt-8 text-sm text-text-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
