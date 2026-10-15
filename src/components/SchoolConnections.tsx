"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SCHOOL_PLATFORMS } from "@/lib/school/catalog";
import type { SchoolSnapshot } from "@/lib/school/catalog";
type School = { id: string; name: string; provider: string; connection: { status: string; lastSyncedAt: string | null; snapshot: SchoolSnapshot | null } | null };
export function SchoolConnections({ schools, notice }: { schools: School[]; notice?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function action(id: string, command: "sync" | "disconnect") {
    setBusy(id); setError("");
    try {
      const r = await fetch(`/api/integrations/school/${encodeURIComponent(id)}/${command}`, { method: "POST" });
      if (!r.ok) { const data = await r.json(); throw new Error(data.error || "Request failed."); }
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(null); }
  }
  return <section className="card p-5 sm:p-6 mb-8" aria-labelledby="school-connections-title">
    <h2 id="school-connections-title" className="text-lg font-semibold mb-2">School connections</h2>
    <p className="text-sm text-text-2 mb-4">Connect an approved school account to view your courses, due dates, and released scores. Google Classroom stays separate below.</p>
    {notice ? <p className="text-sm mb-4" role="status">{notice === "connected" ? "Your school is connected." : "Connection was not completed. Try again or contact your school administrator."}</p> : null}
    {error ? <p role="alert" className="text-sm mb-4">{error}</p> : null}
    {!schools.length ? <p className="text-sm text-text-2 mb-4">No Blackboard or Canvas school has been approved for this MENTA environment yet. You can continue using manual tracking and Google Classroom.</p> : null}
    {schools.map((school) => <div key={school.id} className="mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex flex-wrap gap-3 items-center justify-between"><div><h3 className="font-medium">{school.name}</h3><p className="text-xs text-text-2">{school.provider === "canvas" ? "Canvas" : "Blackboard Learn"} · {school.connection?.status === "CONNECTED" ? "Connected" : school.connection ? "Needs attention" : "Not connected"}</p></div>
      <div className="flex gap-2 flex-wrap">{!school.connection || school.connection.status === "REAUTH_REQUIRED" ? <a className="btn-secondary" href={`/api/integrations/school/${school.id}/connect`}>{school.connection ? "Reconnect" : "Connect"}</a> : null}
      {school.connection ? <><button className="btn-secondary" disabled={busy !== null} onClick={() => action(school.id, "sync")}>{busy === school.id ? "Working…" : "Sync now"}</button><button className="btn-secondary" disabled={busy !== null} onClick={() => action(school.id, "disconnect")}>Disconnect</button></> : null}</div></div>
      {school.connection?.lastSyncedAt ? <p className="text-xs text-text-3 mt-3">Last synced: {new Date(school.connection.lastSyncedAt).toLocaleString()}. Scores can change in your school system.</p> : null}
      {school.connection?.snapshot?.courses.map((course) => <details key={course.id} className="mt-3"><summary className="text-sm cursor-pointer">{course.name} · {course.items.length} items</summary><ul className="mt-3 space-y-3">{course.items.map((item) => <li key={item.id} className="text-sm"><strong className="font-medium">{item.title}</strong><div className="text-xs text-text-2">{item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString()} · ` : ""}{item.score === null ? "No released score" : `${item.score}${item.possible !== null ? ` / ${item.possible}` : ""}`}</div></li>)}</ul></details>)}
    </div>)}
    <details><summary className="text-sm cursor-pointer">Other school platforms and access requirements</summary><div className="mt-4 grid sm:grid-cols-2 gap-3">{SCHOOL_PLATFORMS.map((p) => <div key={p.id} className="rounded-xl p-3" style={{ border: "1px solid var(--border)" }}><h3 className="text-sm font-medium">{p.name}</h3><p className="text-xs text-text-2 mt-1">{p.status === "adapter" ? "Adapter implemented · School setup required" : "Planned · Not connected"}</p><p className="text-xs text-text-2 mt-2">{p.access}. {p.data}.</p><a href={p.docs} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-2 inline-block">Platform documentation ↗</a></div>)}</div></details>
    <p className="text-xs text-text-3 mt-4">Read-only gradebook data, not an official transcript or an eligibility determination. MENTA does not collect your school password. Disconnect removes the saved tokens and synced data from MENTA; revoke application consent in your school account to revoke provider access.</p>
  </section>;
}
