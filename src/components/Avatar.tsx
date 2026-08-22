"use client";

import { useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Deterministic color from the name, so the same person always gets the same fallback color. */
function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 38%, 32%)`;
}

/**
 * Circular avatar — a real uploaded photo when one exists, otherwise a
 * computed initials avatar (never a stock photo). The <img> just points
 * at /api/users/[id]/avatar and falls back to initials on load error
 * (404 when the user has no avatarKey), so this component never needs to
 * know ahead of time whether a photo exists.
 */
export function Avatar({
  userId,
  name,
  size = 36,
}: {
  userId: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (failed) {
    return (
      <div
        style={{
          ...style,
          background: colorFor(name || userId),
          color: "#fff",
          fontSize: Math.max(11, size * 0.38),
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
        aria-label={name}
      >
        {initials(name || "?")}
      </div>
    );
  }

  return (
    <div style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- avatar source is dynamic/authorized, not a static asset next/image can optimize */}
      <img
        src={`/api/users/${userId}/avatar`}
        alt={name}
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
