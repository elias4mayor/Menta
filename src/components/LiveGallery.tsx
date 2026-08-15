"use client";

import { useEffect, useRef, useState } from "react";

export type GallerySlide = { src: string; caption: string };

/** Crossfading photo gallery — matches the reference site's `.live-gallery` behavior exactly. */
export function LiveGallery({
  slides,
  heroBg = false,
}: {
  slides: GallerySlide[];
  heroBg?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (timerRef.current) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3800);
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  return (
    <div
      className={`live-gallery${heroBg ? " hero-bg" : ""}`}
      onMouseEnter={stop}
      onMouseLeave={start}
      role="img"
      aria-label={slides[index]?.caption ?? "Athlete photo gallery"}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={`lg-slide${i === index ? " active" : ""}`}
          style={{ backgroundImage: `url(${slide.src})` }}
          aria-hidden="true"
        />
      ))}
      <div className="lg-meta">{slides[index]?.caption}</div>
      <div className="lg-dots">
        {slides.map((slide, i) => (
          <div key={slide.src} className={`lg-dot${i === index ? " active" : ""}`} />
        ))}
      </div>
    </div>
  );
}

export const GALLERY_SLIDES: GallerySlide[] = [
  { src: "/gallery/gallery-01.jpg", caption: "Football" },
  { src: "/gallery/gallery-02.jpg", caption: "Track & Field" },
  { src: "/gallery/gallery-03.jpg", caption: "Football" },
  { src: "/gallery/gallery-04.jpg", caption: "Track & Field" },
  { src: "/gallery/gallery-05.jpg", caption: "Football" },
  { src: "/gallery/gallery-06.jpg", caption: "Basketball" },
  { src: "/gallery/gallery-07.jpg", caption: "Track & Field" },
  { src: "/gallery/gallery-08.jpg", caption: "Football" },
  { src: "/gallery/gallery-09.jpg", caption: "Football" },
  { src: "/gallery/gallery-10.jpg", caption: "Football" },
  { src: "/gallery/gallery-11.jpg", caption: "Track & Field" },
  { src: "/gallery/gallery-12.jpg", caption: "Football" },
  { src: "/gallery/gallery-13.jpg", caption: "Football" },
  { src: "/gallery/gallery-14.jpg", caption: "Football" },
  { src: "/story/lake-travis-snap.jpg", caption: "Football" },
  { src: "/story/three-point-stance.jpg", caption: "Football" },
  { src: "/story/stauffacher-jersey.jpg", caption: "Football" },
  { src: "/story/relay-handoff.jpg", caption: "Track & Field" },
];
