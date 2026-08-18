"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * Full-bleed, full-viewport-height video moment shown when you land on
 * MENTA after logging in — a huge centered logo floating over autoplay
 * video, restrained type underneath. Deliberately minimal (no card
 * chrome, no badges) so it reads as a cinematic entrance rather than
 * another dashboard widget. Respects prefers-reduced-motion by pausing
 * playback instead of ignoring the setting.
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
