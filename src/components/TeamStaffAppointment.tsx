"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function TeamStaffAppointment({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [teamRole, setRole] = useState("COACH"); const [busy, setBusy] = useState(false); const [status, setStatus] = useState<string>();
  return <details className="mb-5"><summary className="cursor-pointer py-3">Add approved team staff</summary><form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setStatus(undefined);
    try {
      const response = await fetch(`/api/teams/${teamId}/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, teamRole }) });
      const data = await response.json(); if (!response.ok) { setStatus(data.error ?? "Could not appoint staff."); return; }
      setStatus("Staff membership approved."); setEmail(""); router.refresh();
    } catch { setStatus("Connection lost. Try again."); } finally { setBusy(false); }
  }}>
    <p className="text-sm text-text-2">The recipient must already have a verified MENTA account with the matching role. Provider verification is a separate step.</p>
    <label className="field-label" htmlFor={`staff-email-${teamId}`}>Account email</label><input id={`staff-email-${teamId}`} className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <label className="field-label" htmlFor={`staff-role-${teamId}`}>Team role</label><select id={`staff-role-${teamId}`} className="field-select" value={teamRole} onChange={(e) => setRole(e.target.value)}>{["COACH", "TRAINER", "DOCTOR", "TEACHER", "STAFF"].map((role) => <option key={role} value={role}>{role.toLowerCase()}</option>)}</select>
    <button className="btn-primary" disabled={busy || !email.trim()}>{busy ? "Approving…" : "Approve staff membership"}</button>{status && <p role="status">{status}</p>}
  </form></details>;
}
