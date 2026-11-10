"use client";

import { AI_COACH_NAMES, DEFAULT_AI_COACH_NAME } from "@/lib/ai/coach-names";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I focus on today?",
  "What's live in MENTA right now?",
  "Help me set a goal for this season.",
];

export function AiChat({
  initialCoachName,
  configured,
  envVar,
  initialConversationId,
  initialMessages,
}: {
  initialCoachName: string | null;
  configured: boolean;
  envVar: string;
  initialConversationId: string | null;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [savedName, setSavedName] = useState(initialCoachName ?? "");
  const [selectedName, setSelectedName] = useState(savedName);
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState("");
  const coachName = savedName || DEFAULT_AI_COACH_NAME;
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function saveName() {
    setSavingName(true);
    setNameStatus("");
    try {
      const response = await fetch("/api/ai/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedName || null }),
      });
      if (!response.ok) throw new Error("Save failed");
      const { aiCoachName } = await response.json();
      setSavedName(aiCoachName ?? "");
      setNameStatus("Name saved.");
      router.refresh();
    } catch {
      setNameStatus("Couldn't save your name. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: body }]);

    try {
      const res = await fetch("/api/ai", {
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
    <>
      <header className="mb-4">
        <div className="mono text-text-3 mb-1">AI COACH</div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold">{coachName}</h1>
          <span className={configured ? "badge badge-live" : "badge badge-demo"}>
            {configured ? "Connected" : "Not connected"}
          </span>
        </div>
        <details>
          <summary className="text-sm text-text-2 cursor-pointer">Choose your assistant name</summary>
          <form onSubmit={(event) => { event.preventDefault(); void saveName(); }} className="mt-2">
            <label htmlFor="ai-coach-name" className="sr-only">Assistant name</label>
            <div className="flex gap-2">
              <select
                id="ai-coach-name"
                className="field-input"
                value={selectedName}
                disabled={savingName}
                onChange={(event) => {
                  setSelectedName(event.target.value);
                  setNameStatus("");
                }}
              >
                <option value="">{DEFAULT_AI_COACH_NAME}</option>
                {AI_COACH_NAMES.map((name) => <option key={name}>{name}</option>)}
              </select>
              <button className="btn-primary shrink-0" disabled={savingName || selectedName === savedName}>
                {savingName ? "Saving…" : "Save name"}
              </button>
            </div>
            <p role="status" className="mt-1 text-sm text-text-2">{nameStatus}</p>
          </form>
        </details>
      </header>
      <div className="card flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-text-2 text-sm">
                {configured
                  ? "Ask about training, recovery, recruiting, academics, or what to do today."
                  : `MENTA AI isn't connected yet. An administrator needs to set ${envVar} on the server before this becomes a real assistant.`}
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
          {sending && <div className="mono text-text-3">{coachName} is thinking…</div>}
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
            placeholder={`Ask ${coachName}…`}
            aria-label={`Ask ${coachName}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-primary shrink-0">
            Send
          </button>
        </form>
      </div>
    </>
  );
}
