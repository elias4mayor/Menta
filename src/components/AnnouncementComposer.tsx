"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AnnouncementComposer({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(undefined);
    try {
      const response = await fetch(`/api/teams/${teamId}/announcements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, important }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not publish."); return; }
      setTitle(""); setBody(""); setImportant(false); router.refresh();
    } catch { setError("Connection lost. Try again."); } finally { setBusy(false); }
  }}>
    <label className="field-label" htmlFor={`announcement-title-${teamId}`}>Title</label><input id={`announcement-title-${teamId}`} className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
    <label className="field-label" htmlFor={`announcement-body-${teamId}`}>Announcement</label><textarea id={`announcement-body-${teamId}`} className="field-input" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={4} required />
    <label className="flex gap-3"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />Pin as important</label>
    {error && <p role="alert">{error}</p>}<button className="btn-primary" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Publishing…" : "Publish to team"}</button>
  </form>;
}
