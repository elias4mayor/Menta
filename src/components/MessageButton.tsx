"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MessageButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/messages/${data.conversation.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={start} disabled={loading} className="text-text-3 hover:text-text-1 text-xs">
      Message
    </button>
  );
}
