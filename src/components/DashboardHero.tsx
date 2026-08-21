"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Contained video entrance card shown at the top of the dashboard — a
 * centered logo floating over autoplay video inside a rounded card, sized
 * and placed like the rest of the dashboard content instead of breaking
 * out to full-bleed. Respects prefers-reduced-motion by pausing playback
 * instead of ignoring the setting.
 */
export function DashboardHero({ greeting }: { greeting: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      videoRef.current?.pause();
    }
  }, []);

  return (
    <div className="dashboard-hero">
      <video
        ref={videoRef}
        className="dashboard-hero-video"
        src="/media/dashboard-hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="dashboard-hero-scrim" />
      <div className="dashboard-hero-content">
        <Image
          src="/logo.png"
          alt="MENTA"
          width={863}
          height={194}
          className="dashboard-hero-logo"
          priority
        />
        <h1 className="dashboard-hero-title">{greeting}</h1>
      </div>
    </div>
  );
}
