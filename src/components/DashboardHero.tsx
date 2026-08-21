import Image from "next/image";
import { LiveGallery, GALLERY_SLIDES } from "@/components/LiveGallery";

/**
 * Contained entrance card at the top of the dashboard — the same live,
 * crossfading athlete-photo gallery used on login/signup, with a centered
 * floating logo over it, sized and placed like the rest of the dashboard
 * content instead of breaking out to full-bleed. LiveGallery itself
 * already respects prefers-reduced-motion (no rotation, first photo just
 * stays put) — nothing extra needed here for that.
 */
export function DashboardHero({ greeting }: { greeting: string }) {
  return (
    <div className="dashboard-hero">
      <LiveGallery slides={GALLERY_SLIDES} heroBg />
      <div className="dashboard-hero-scrim" />
      <div className="dashboard-hero-content">
        <Image
          src="/logo.png"
          alt="MENTA"
          width={863}
          height={194}
          className="dashboard-hero-logo"
          style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.75))" }}
          priority
        />
        <h1 className="dashboard-hero-title">{greeting}</h1>
      </div>
    </div>
  );
}
