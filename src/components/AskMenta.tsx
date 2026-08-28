"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Persistent floating "Ask MENTA" control, present on every authenticated
 * page (mounted once in AppShell). Deliberately does not build a second
 * chat UI: the compose box posts straight to the same /api/ai route
 * AiChat.tsx already uses (a `topic: null` AIConversation), then hands
 * off to /ai-coach — which reads that exact same conversation — to keep
 * going. One AI backend, one conversation, two entry points.
 */
export function AskMenta() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      setDraft("");
      router.push("/ai-coach");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="ask-menta-panel" role="dialog" aria-label="Ask MENTA">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Ask MENTA</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-text-3 hover:text-text-1 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={submit} className="space-y-2">
            <input
              autoFocus
              className="field-input w-full"
              placeholder="Ask anything about your MENTA…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary w-full justify-center">
              {sending ? "Asking…" : "Ask"}
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="ask-menta-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ask MENTA"
      >
        <span aria-hidden="true">✦</span> Ask MENTA
      </button>
    </>
  );
}
