"use client";

import { useEffect, useRef, useState } from "react";

type Shape =
  | { type: "path"; color: string; points: [number, number][] }
  | { type: "line" | "arrow"; color: string; from: [number, number]; to: [number, number] }
  | { type: "circle"; color: string; center: [number, number]; radius: number };

export type FilmAnnotationItem = {
  id: string;
  clipId: string | null;
  timestampSec: number;
  data: string;
  visibility: string;
};

const COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ffffff"];
const TOOLS = ["pen", "line", "arrow", "circle"] as const;
type Tool = (typeof TOOLS)[number];

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  if (shape.type === "path") {
    ctx.beginPath();
    shape.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  } else if (shape.type === "line" || shape.type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(...shape.from);
    ctx.lineTo(...shape.to);
    ctx.stroke();
    if (shape.type === "arrow") {
      const angle = Math.atan2(shape.to[1] - shape.from[1], shape.to[0] - shape.from[0]);
      const size = 10;
      ctx.beginPath();
      ctx.moveTo(...shape.to);
      ctx.lineTo(shape.to[0] - size * Math.cos(angle - Math.PI / 6), shape.to[1] - size * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(...shape.to);
      ctx.lineTo(shape.to[0] - size * Math.cos(angle + Math.PI / 6), shape.to[1] - size * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  } else if (shape.type === "circle") {
    ctx.beginPath();
    ctx.arc(shape.center[0], shape.center[1], shape.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Telestration overlay for one video element — a real freehand/line/arrow/circle drawing tool tied to the paused-frame timestamp, MENTA's own implementation (not a Hudl clone) of the "draw on the film" workflow coaches expect. */
export function FilmAnnotator({
  filmId,
  videoRef,
  canAnnotate,
  initialAnnotations,
  onSaved,
}: {
  filmId: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canAnnotate: boolean;
  initialAnnotations: FilmAnnotationItem[];
  onSaved?: (a: FilmAnnotationItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const drawingRef = useRef<{ points: [number, number][] } | null>(null);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function syncCanvasSize() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
  }

  useEffect(() => {
    if (!active) return;
    syncCanvasSize();
    const onResize = () => syncCanvasSize();
    window.addEventListener("resize", onResize);
    videoRef.current?.pause();
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => drawShape(ctx, s));
  }

  useEffect(redraw, [shapes]);

  function pos(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const p = pos(e);
    if (tool === "pen") {
      drawingRef.current = { points: [p] };
    } else {
      drawingRef.current = { points: [p, p] };
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const p = pos(e);
    if (tool === "pen") {
      drawingRef.current.points.push(p);
      redraw();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawShape(ctx, { type: "path", color, points: drawingRef.current.points });
    } else {
      drawingRef.current.points[1] = p;
      redraw();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const [from, to] = drawingRef.current.points;
      if (tool === "circle") {
        const radius = Math.hypot(to[0] - from[0], to[1] - from[1]);
        drawShape(ctx, { type: "circle", color, center: from, radius });
      } else {
        drawShape(ctx, { type: tool as "line" | "arrow", color, from, to });
      }
    }
  }

  function onMouseUp() {
    if (!drawingRef.current) return;
    const points = drawingRef.current.points;
    drawingRef.current = null;
    if (tool === "pen") {
      setShapes((s) => [...s, { type: "path", color, points }]);
    } else if (tool === "circle") {
      const [from, to] = points;
      setShapes((s) => [...s, { type: "circle", color, center: from, radius: Math.hypot(to[0] - from[0], to[1] - from[1]) }]);
    } else {
      const [from, to] = points;
      setShapes((s) => [...s, { type: tool as "line" | "arrow", color, from, to }]);
    }
  }

  async function save() {
    if (shapes.length === 0) {
      setActive(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/films/${filmId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestampSec: videoRef.current?.currentTime ?? 0, shapes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save drawing.");
        return;
      }
      setAnnotations((a) => [...a, data.annotation]);
      onSaved?.(data.annotation);
      setShapes([]);
      setActive(false);
    } finally {
      setSaving(false);
    }
  }

  function viewAnnotation(a: FilmAnnotationItem) {
    if (videoRef.current) {
      videoRef.current.currentTime = a.timestampSec;
      videoRef.current.pause();
    }
    setActive(true);
    setTimeout(() => {
      syncCanvasSize();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const parsed = JSON.parse(a.data) as Shape[];
        setShapes(parsed);
      }
    }, 50);
  }

  async function removeAnnotation(id: string) {
    setAnnotations((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/films/${filmId}/annotations/${id}`, { method: "DELETE" });
  }

  return (
    <section className="card p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="mono text-text-3">Drawings ({annotations.length})</div>
        {canAnnotate && !active && (
          <button type="button" className="btn-secondary" onClick={() => { setShapes([]); setActive(true); }}>
            Draw on this frame
          </button>
        )}
      </div>

      {active && (
        <div className="mb-4">
          <div className="relative inline-block max-w-full">
            <canvas
              ref={canvasRef}
              className="border rounded-lg"
              style={{ borderColor: "var(--border)", cursor: "crosshair", touchAction: "none", maxWidth: "100%" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex gap-1">
              {TOOLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="badge"
                  style={{ cursor: "pointer", opacity: tool === t ? 1 : 0.5 }}
                  onClick={() => setTool(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full"
                  style={{ background: c, border: color === c ? "2px solid var(--text-1)" : "1px solid var(--border)" }}
                />
              ))}
            </div>
            <button type="button" className="text-xs text-text-3 hover:text-text-1" onClick={() => setShapes([])}>
              Clear
            </button>
            <div className="ml-auto flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setActive(false); setShapes([]); }}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save drawing"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
        </div>
      )}

      {annotations.length === 0 ? (
        <p className="text-text-2 text-sm">No drawings yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {annotations.map((a) => (
            <li key={a.id} className="badge flex items-center gap-2">
              <button type="button" onClick={() => viewAnnotation(a)}>
                @ {Math.floor(a.timestampSec / 60)}:{Math.floor(a.timestampSec % 60).toString().padStart(2, "0")}
              </button>
              <button type="button" className="text-text-3 hover:text-text-1" onClick={() => removeAnnotation(a.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
