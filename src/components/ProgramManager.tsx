"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

export type ProgramSummary = {
  id: string;
  title: string;
  description: string | null;
  sport: string | null;
  status: string;
  positionGroupName: string | null;
  blockCount: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = { DRAFT: "Draft", ACTIVE: "Active", ARCHIVED: "Archived" };

export function ProgramManager({
  teamId,
  canManage,
  initialPrograms,
}: {
  teamId: string;
  canManage: boolean;
  initialPrograms: ProgramSummary[];
}) {
  const router = useRouter();
  const programs = initialPrograms;
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = programs.filter((p) => p.status !== "ARCHIVED");

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), blocks: [] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create program.");
        return;
      }
      router.push(`/team/${teamId}/programs/${data.program.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {visible.length === 0 ? (
        <EmptyState
          title="No training programs yet"
          description="Build a program from blocks of exercises pulled straight from the MENTA exercise library."
        />
      ) : (
        <div className="card mb-6">
          <ul>
            {visible.map((p) => (
              <li key={p.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border-soft)" }}>
                <Link href={`/team/${teamId}/programs/${p.id}`} className="flex items-center gap-3 p-4">
                  <span className="flex-1 font-medium truncate">{p.title}</span>
                  {p.sport && <span className="badge shrink-0">{p.sport}</span>}
                  {p.positionGroupName && <span className="badge shrink-0">{p.positionGroupName}</span>}
                  <span className="badge shrink-0">{STATUS_LABELS[p.status] ?? p.status}</span>
                  <span className="mono text-text-3 text-xs shrink-0">
                    {p.blockCount} block{p.blockCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <form onSubmit={createProgram} className="card p-5 space-y-3 max-w-md">
          <input
            className="field-input"
            placeholder="New program name, e.g. Monday Lower Body"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" className="btn-primary text-xs" disabled={creating}>
            {creating ? "Creating…" : "Create program"}
          </button>
        </form>
      )}
    </div>
  );
}
