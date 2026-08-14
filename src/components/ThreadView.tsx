"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  senderName: string;
};

export function ThreadView({
  conversationId,
  otherUserId,
}: {
  conversationId: string;
  otherUserId?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/messages/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load + poll for a lightweight chat thread, not derived render state
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) await load();
    } finally {
      setSending(false);
    }
  }

  async function block() {
    if (!otherUserId) return;
    if (!confirm("Block this person? They won't be able to message you.")) return;
    await fetch("/api/messages/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: otherUserId }),
    });
  }

  return (
    <div className="card flex flex-col flex-1 min-h-0">
      {otherUserId && (
        <div className="flex justify-end gap-3 px-4 py-2 border-b border-[var(--border)]">
          <button onClick={() => setShowReport(true)} className="text-xs text-text-3 hover:text-text-1">
            Report
          </button>
          <button onClick={block} className="text-xs text-text-3 hover:text-text-1">
            Block
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[75%] rounded-[var(--r-sm)] px-3 py-2 text-sm"
              style={{ background: m.mine ? "var(--surface-2)" : "transparent", border: "1px solid var(--border)" }}
            >
              {!m.mine && <div className="mono text-text-3 mb-1">{m.senderName}</div>}
              <div>{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-[var(--border)]">
        <input
          className="field-input"
          placeholder="Message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn-primary shrink-0">
          Send
        </button>
      </form>
      {showReport && (
        <ReportDialog
          targetUserId={otherUserId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function ReportDialog({
  targetUserId,
  onClose,
}: {
  targetUserId?: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState("HARASSMENT");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/messages/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, category, details }),
    });
    setSent(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <p className="text-sm">Thanks — this has been sent for review.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="mono text-text-3">Report</div>
            <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="HARASSMENT">Harassment</option>
              <option value="SPAM">Spam</option>
              <option value="SAFETY_CONCERN">Safety concern</option>
              <option value="IMPERSONATION">Impersonation</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea
              className="field-textarea"
              rows={3}
              placeholder="Details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Submit</button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
