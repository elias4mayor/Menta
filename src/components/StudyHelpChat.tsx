"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain this concept to me step by step",
  "Quiz me on this topic",
  "Help me make a study plan for this week",
  "Why is this answer wrong?",
];

export function StudyHelpChat({
  configured,
  envVar,
  initialConversationId,
  initialMessages,
}: {
  configured: boolean;
  envVar: string;
  initialConversationId: string | null;
  initialMessages: Msg[];
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: body }]);

    try {
      const res = await fetch("/api/academics/study-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? undefined, message: body }),
      });
      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.reply) {
        setMessages((m) => [...m, { id: `reply-${Date.now()}`, role: "assistant", content: data.reply }]);
      } else if (data.error) {
        setMessages((m) => [...m, { id: `err-${Date.now()}`, role: "assistant", content: data.error }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: "assistant", content: "Network error. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col" style={{ height: 420 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-text-2 text-sm">
              {configured
                ? "Ask MENTA AI to explain a concept, walk through examples, quiz you, or help plan your studying. It won't complete graded work for you."
                : `MENTA AI Study Help isn't connected yet. An administrator needs to set ${envVar} on the server before this becomes a real tutor.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="badge hover:text-text-1" style={{ cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-[var(--r-sm)] px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "var(--surface-2)" : "transparent",
                border: "1px solid var(--border)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <div className="mono text-text-3">MENTA AI is thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex gap-2 p-3 border-t border-[var(--border)]"
      >
        <input
          className="field-input"
          placeholder="Ask about a concept, assignment, or exam…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn-primary shrink-0">
          Send
        </button>
      </form>
    </div>
  );
}
