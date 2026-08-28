"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const HERO_VIDEOS = [
  { src: "/media/dashboard-hero-1.mp4", caption: "Training" },
  { src: "/media/dashboard-hero-2.mp4", caption: "Focus" },
];

/**
 * Contained entrance card at the top of the dashboard — two athlete training
 * videos crossfading into each other (same opacity-transition pattern as
 * LiveGallery's photo crossfade), with a centered floating logo over them.
 * Only the active video plays; the next one starts and the previous one
 * pauses right as the crossfade begins, so there's no jump when it becomes
 * visible. Respects prefers-reduced-motion by pausing on the first video's
 * first frame instead of ignoring the setting, matching this app's existing
 * convention (see LiveGallery).
 */
export function DashboardHero({ greeting }: { greeting: string }) {
  const [active, setActive] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = videoRefs.current[0];
    if (reduceMotionRef.current) {
      first?.pause();
    } else {
      first?.play().catch(() => {});
    }
  }, []);

  function handleEnded(i: number) {
    if (reduceMotionRef.current || i !== active || HERO_VIDEOS.length <= 1) return;
    const next = (i + 1) % HERO_VIDEOS.length;
    const nextVideo = videoRefs.current[next];
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }
    videoRefs.current[i]?.pause();
    setActive(next);
  }

  return (
    <div className="dashboard-hero">
      <div className="live-gallery hero-bg" role="img" aria-label="Athlete training video">
        {HERO_VIDEOS.map((video, i) => (
          <video
            key={video.src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            className={`lg-slide lg-video${i === active ? " active" : ""}`}
            src={video.src}
            muted
            playsInline
            onEnded={() => handleEnded(i)}
            aria-hidden="true"
          />
        ))}
      </div>
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
