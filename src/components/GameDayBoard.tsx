"use client";

import { useEffect, useState } from "react";

export function GameDayBoard({ gameId }: { gameId: string }) {
  const [data, setData] = useState<GameResponse>();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ScoreDraft>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/gameday/${gameId}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (response.status === 404) setData(undefined);
          throw new Error(response.status === 404 ? "This game is unavailable or no longer published." : "Live updates paused. The score may be out of date.");
        }
        setData(await response.json()); setError("");
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Live updates paused."); }
    }
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 15000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [gameId]);
  if (!data) return <p role="status" className="py-12 text-text-2">{error || "Loading game day…"}</p>;
  const { game, updates } = data;
  return <div className="space-y-8">
    <section className="rounded-2xl bg-surface p-6 sm:p-10 text-center" aria-label="Game scoreboard">
      <p className="text-text-2 mb-6">{game.status.replaceAll("_", " ")} · {game.period}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {[{ name: game.homeName, logo: game.homeLogo, score: game.homeScore }, { name: game.opponentName, logo: game.awayLogo, score: game.awayScore }].map((side, index) => <div key={index} className={index === 0 ? "col-start-1" : "col-start-3"}>
          <SchoolLogo key={`${side.name}-${side.logo}`} name={side.name} url={side.logo} />
          <h2 className="text-lg sm:text-2xl font-semibold break-words">{side.name}</h2>
          {game.status !== "SCHEDULED" && <p className="text-5xl sm:text-7xl font-bold tabular-nums mt-4">{side.score}</p>}
        </div>)}
        <span className="col-start-2 row-start-1 pt-6 text-text-2">VS</span>
      </div>
      <p className="mt-8">{new Date(game.startsAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}</p>
      <p className="text-text-2 mt-2">{game.venue}</p>
      {!game.published && <p className="mt-4">Team-only draft</p>}
    </section>
    <p className="text-sm text-text-2">Team-reported score · Updated {new Date(game.updatedAt).toLocaleString()} · Refreshes every 15 seconds while open</p>
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-4">
      {game.watchUrl ? <a className="btn-primary" href={game.watchUrl} target="_blank" rel="noopener noreferrer">Watch official broadcast ↗</a> : <p className="text-text-2">No broadcast link published yet.</p>}
      {game.ticketUrl && <a className="btn-secondary" href={game.ticketUrl} target="_blank" rel="noopener noreferrer">Get tickets ↗</a>}
    </div>
    {game.visitorInfo && <section><h2 className="text-xl font-semibold mb-3">Plan your visit</h2><p className="whitespace-pre-wrap max-w-prose">{game.visitorInfo}</p></section>}
    {data.canScore && !error && !draft && <button className="btn-primary" onClick={() => setDraft({ version: game.version, homeScore: game.homeScore, awayScore: game.awayScore, period: game.period, status: game.status, note: "" })}>Update or correct score</button>}
    {draft && <form className="space-y-4 border border-border rounded-xl p-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true);
      try {
        const response = await fetch(`/api/gameday/${gameId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not post update.");
        setDraft(undefined);
        const fresh = await fetch(`/api/gameday/${gameId}`, { cache: "no-store" });
        if (fresh.ok) { setData(await fresh.json()); setError(""); }
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not post update."); }
      finally { setBusy(false); }
    }}>
      <h2 className="text-xl font-semibold">Scorekeeper</h2>
      <div className="grid sm:grid-cols-2 gap-4">{(["homeScore", "awayScore"] as const).map((key) => <label key={key}>{key === "homeScore" ? game.homeName : game.opponentName}<input className="field-input mt-2" type="number" min="0" max="999" required value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} /></label>)}</div>
      <label className="block">Quarter / period<input className="field-input mt-2" required maxLength={40} value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.target.value })} /></label>
      <label className="block">Game status<select aria-label="Game status" className="field-input mt-2" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{["SCHEDULED", "LIVE", "DELAYED", "FINAL", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="block">Public update<textarea className="field-input mt-2" required maxLength={240} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
      <p className="text-sm text-text-2">Describe the scoring play or correction. Published games show this to fans. Every update is retained in history.</p>
      <div className="flex gap-4"><button className="btn-primary" disabled={busy}>{busy ? "Posting…" : "Publish update"}</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => setDraft(undefined)}>Cancel</button></div>
    </form>}
    <section><h2 className="text-xl font-semibold mb-4">Game updates</h2>{updates.length === 0 && <p className="text-text-2">Scoring plays and corrections will appear here.</p>}<ol className="divide-y divide-border">{updates.map((update) => <li key={update.id} className="py-4"><p className="font-semibold">{update.homeScore} – {update.awayScore} · {update.period} · {update.status}</p><p className="mt-2">{update.note}</p><time className="text-sm text-text-2" dateTime={update.createdAt}>{new Date(update.createdAt).toLocaleString()}</time></li>)}</ol></section>
  </div>;
}

function SchoolLogo({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div className="size-16 mx-auto mb-4 flex items-center justify-center text-2xl font-semibold" aria-hidden="true">{name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div>;
  // Approved external logos load on the visitor's device; no arbitrary server-side image fetch.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={64} height={64} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className="size-16 object-contain mx-auto mb-4" />;
}

interface ScoreDraft { version: number; homeScore: number; awayScore: number; period: string; status: string; note: string }
interface GameResponse {
  game: Omit<ScoreDraft, "note"> & { id: string; teamId: string; homeName: string; opponentName: string; homeLogo: string | null; awayLogo: string | null; startsAt: string; venue: string; visitorInfo: string; watchUrl: string | null; ticketUrl: string | null; updatedAt: string; published: boolean };
  updates: (ScoreDraft & { id: string; createdAt: string })[];
  canScore: boolean;
}

