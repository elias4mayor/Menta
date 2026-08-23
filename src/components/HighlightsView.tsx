"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

type HighlightClip = {
  id: string;
  label: string;
  startSec: number;
  endSec: number | null;
  filmId: string;
  filmTitle: string;
};

type Highlight = {
  id: string;
  title: string;
  createdAt: string;
  clips: HighlightClip[];
};

export function HighlightsView({ initialHighlights }: { initialHighlights: Highlight[] }) {
  const router = useRouter();
  const [highlights, setHighlights] = useState(initialHighlights);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this highlight reel? (The underlying clips and film aren't affected.)")) return;
    setHighlights((hs) => hs.filter((h) => h.id !== id));
    await fetch(`/api/highlights/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (highlights.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="No highlight reels yet"
          description="Open a film, mark a few clips, select them, and create a reel."
          actionLabel="Go to film library"
          actionHref="/film"
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {highlights.map((h) => (
        <li key={h.id} className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <button className="font-medium text-left" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
              {h.title}
            </button>
            <button onClick={() => remove(h.id)} className="text-text-3 hover:text-text-1 text-xs">
              Delete
            </button>
          </div>
          <p className="mono text-text-3 mb-3">{h.clips.length} clips</p>
          {expanded === h.id && <ReelPlayer clips={h.clips} />}
        </li>
      ))}
    </ul>
  );
}

function ReelPlayer({ clips }: { clips: HighlightClip[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = clips[index];

  function advance() {
    if (index < clips.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setPlaying(false);
    }
  }

  function play() {
    setIndex(0);
    setPlaying(true);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;

    function onLoadedMetadata() {
      if (!video) return;
      video.currentTime = current.startSec;
      video.play();
    }
    function onTimeUpdate() {
      if (!video) return;
      if (current.endSec != null && video.currentTime >= current.endSec) {
        advance();
      }
    }
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playing]);

  return (
    <div>
      {playing ? (
        <>
          <div className="card overflow-hidden mb-2">
            <video key={current.filmId} ref={videoRef} src={`/api/films/${current.filmId}/video`} controls className="w-full bg-black" style={{ maxHeight: 400 }} />
          </div>
          <p className="text-sm mb-3">
            Clip {index + 1} of {clips.length}: {current.label}{" "}
            <span className="text-text-3">— {current.filmTitle}</span>
          </p>
          <p className="text-text-3 text-xs mb-3">
            Plays each clip in sequence from its source film. A single exportable video file
            isn&rsquo;t generated yet — that needs a video-processing pipeline.
          </p>
          <button className="btn-secondary" onClick={() => setPlaying(false)}>Stop</button>
        </>
      ) : (
        <button className="btn-primary" onClick={play}>Play reel</button>
      )}
    </div>
  );
}
