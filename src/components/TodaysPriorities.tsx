"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type PriorityGoal = {
  id: string;
  title: string;
  category: string | null;
  targetDate: string | null;
  overdue: boolean;
};

/**
 * Real, derived from actual goal data (active goals due today or overdue) —
 * not an invented "priorities" feed. "Mark done" calls the same goals API
 * GoalsPanel uses. Honest empty state when nothing's actually due.
 */
export function TodaysPriorities({ goals }: { goals: PriorityGoal[] }) {
  const router = useRouter();
  const [items, setItems] = useState(goals);
  const [completing, setCompleting] = useState<string | null>(null);

  async function markDone(id: string) {
    setCompleting(id);
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: 100, status: "ACHIEVED" }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((g) => g.id !== id));
        router.refresh();
      }
    } finally {
      setCompleting(null);
    }
  }

  return (
    <div>
      <div className="mono text-text-3 mb-3">Priorities</div>
      {items.length === 0 ? (
        <p className="text-text-2 text-sm">
          Nothing urgent today — good time to review last week&rsquo;s film.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <Link href="/dashboard#goals" className="hover:text-text-2 transition-colors">
                  {g.title}
                </Link>
                <span className="text-text-3 ml-2">
                  {g.category ?? "Goal"}
                  {g.overdue && (
                    <span className="ml-1" style={{ color: "var(--warning)" }}>
                      · overdue
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => markDone(g.id)}
                disabled={completing === g.id}
                className="text-xs text-text-2 hover:text-text-1 shrink-0"
              >
                {completing === g.id ? "…" : "Mark done"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
