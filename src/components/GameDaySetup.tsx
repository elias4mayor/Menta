"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type TeamChoice = { id: string; name: string; members: { id: string; name: string }[] };
export function GameDaySetup({ teams }: { teams: TeamChoice[] }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const team = teams.find((item) => item.id === teamId);
  if (!team) return null;
  return <details className="border border-border rounded-xl p-5"><summary className="font-semibold cursor-pointer min-h-11">Schedule a game day</summary><form className="space-y-5 mt-5" onSubmit={async (event) => {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/gameday", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        teamId, homeName: text("homeName"), opponentName: text("opponentName"), startsAt: new Date(text("startsAt")).toISOString(),
        venue: text("venue"), visitorInfo: text("visitorInfo"), homeLogo: text("homeLogo") || null, awayLogo: text("awayLogo") || null,
        watchUrl: text("watchUrl") || null, ticketUrl: text("ticketUrl") || null, scorerId: text("scorerId") || null, published: values.get("published") === "on",
      }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not create game.");
      router.push(`/gameday/${result.game.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create game."); }
    finally { setBusy(false); }
  }}>
    <label className="block">Your team<select className="field-input mt-2" value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label className="block">Home school name<input key={teamId} className="field-input mt-2" name="homeName" defaultValue={team.name} required maxLength={100} /></label>
    <label className="block">Visiting school name<input className="field-input mt-2" name="opponentName" required maxLength={100} /></label>
    <label className="block">Kickoff in your current time zone<input className="field-input mt-2" name="startsAt" type="datetime-local" required /></label>
    <label className="block">Venue<input className="field-input mt-2" name="venue" required maxLength={200} /></label>
    <label className="block">Visitor guide<textarea className="field-input mt-2" name="visitorInfo" maxLength={2000} placeholder="Parking, entry gates, accessibility information…" /></label>
    <div className="grid sm:grid-cols-2 gap-4">{[{ name: "homeLogo", label: "Home logo URL" }, { name: "awayLogo", label: "Visitor logo URL" }, { name: "watchUrl", label: "Official broadcast URL" }, { name: "ticketUrl", label: "Official ticket URL" }].map((field) => <label className="block" key={field.name}>{field.label}<input className="field-input mt-2" type="url" name={field.name} placeholder="https://" maxLength={2000} /></label>)}</div>
    <p className="text-sm text-text-2">Use school-approved HTTPS links and logos. Missing logos display initials. Watch and ticket links open the selected provider.</p>
    <label className="block">Appointed scorekeeper<select key={`scorer-${teamId}`} className="field-input mt-2" name="scorerId"><option value="">Coaches and team admins only</option>{team.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
    <label className="flex items-center gap-3 min-h-11"><input name="published" type="checkbox" />Publish a public fan page</label>
    <p className="text-sm text-text-2">Publishing makes the matchup, venue, visitor guide, links and score updates public. Private team plans remain in the team workspace.</p>
    {error && <p role="alert">{error}</p>}
    <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Create game day"}</button>
  </form></details>;
}

