"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function HideGamePage({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div><button className="btn-secondary" disabled={busy} onClick={async () => {
    if (!window.confirm("Hide this game from fans? Team members keep access and score history is retained.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/gameday/${gameId}`, { method: "DELETE" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Could not hide page."); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not hide page."); }
    finally { setBusy(false); }
  }}>{busy ? "Hiding…" : "Hide public page"}</button>{error && <p role="alert">{error}</p>}</div>;
}
