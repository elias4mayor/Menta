"use client";

import { useEffect, useRef } from "react";

/**
 * Single looping video background for the auth shell (signup/login/
 * forgot-password) — reuses the exact .live-gallery.hero-bg/.lg-slide/
 * .lg-video treatment LiveGallery/DashboardHero already apply (dimming
 * overlay, object-fit: cover), just one continuous clip instead of
 * crossfading photos or videos. Respects prefers-reduced-motion by
 * pausing on the first frame instead of autoplaying, matching
 * DashboardHero's existing convention for video backgrounds.
 */
export function AuthVideoBackground({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, []);

  return (
    <div className="live-gallery hero-bg" role="img" aria-label="MENTA athletes training">
      <video
        ref={videoRef}
        className="lg-slide lg-video active"
        src={src}
        muted
        loop
        playsInline
        aria-hidden="true"
      />
    </div>
  );
}
