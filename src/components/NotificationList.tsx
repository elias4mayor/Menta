"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications/read-all", { method: "POST" });
    router.refresh();
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  const hasUnread = items.some((n) => !n.read);

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end mb-4">
          <button onClick={markAllRead} className="text-xs text-text-2 hover:text-text-1">
            Mark all read
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">You&rsquo;re all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const content = (
              <div className="card p-4 flex items-start justify-between gap-4" style={{ opacity: n.read ? 0.6 : 1 }}>
                <div>
                  <div className="text-sm">{n.title}</div>
                  {n.body && <div className="text-text-3 text-xs mt-1">{n.body}</div>}
                  <div className="mono text-text-3 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && <span className="rounded-full shrink-0" style={{ width: 8, height: 8, background: "var(--grad-signal)", marginTop: 6 }} />}
              </div>
            );
            return (
              <li key={n.id} onClick={() => !n.read && markRead(n.id)}>
                {n.link ? <Link href={n.link}>{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
