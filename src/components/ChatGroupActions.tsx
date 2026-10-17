"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ChatGroupActions({ teams }: { teams: { id: string; name: string; canCreateStaff: boolean }[] }) {
  const router = useRouter();
  const [teamId, setTeam] = useState(teams[0]?.id ?? ""); const [title, setTitle] = useState(""); const [staffOnly, setStaff] = useState(false);
  const [joinCode, setCode] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  async function submit(path: string, body: object) {
    setBusy(true); setError(undefined);
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not open this group."); return; }
      router.push(`/messages/${data.conversation.id}`);
    } catch { setError("Connection lost. Try again."); } finally { setBusy(false); }
  }
  return <div className="space-y-5 my-6">
    <details><summary className="cursor-pointer py-3">Create a group chat</summary><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit("/api/messages/groups", { teamId, title, staffOnly }); }}>
      <label className="field-label" htmlFor="group-team">Team</label><select id="group-team" className="field-select" value={teamId} onChange={(e) => { setTeam(e.target.value); setStaff(false); }}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      <label className="field-label" htmlFor="group-title">Group name</label><input id="group-title" className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Coaches, offensive line, or your group" required />
      {teams.find((team) => team.id === teamId)?.canCreateStaff && <label className="flex gap-3"><input type="checkbox" checked={staffOnly} onChange={(e) => setStaff(e.target.checked)} />Staff only</label>}
      <button className="btn-primary" disabled={busy || !teamId || !title.trim()}>Create group</button>
    </form></details>
    <details><summary className="cursor-pointer py-3">Join a group with a code</summary><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit("/api/messages/groups/join", { joinCode }); }}>
      <label className="field-label" htmlFor="group-code">Group code</label><input id="group-code" className="field-input" value={joinCode} onChange={(e) => setCode(e.target.value)} maxLength={40} autoCapitalize="characters" required />
      <p className="text-sm text-text-2">Join the team roster first. A group code does not grant team or staff access.</p><button className="btn-primary" disabled={busy || !joinCode.trim()}>Join group</button>
    </form></details>{error && <p role="alert">{error}</p>}
  </div>;
}
