"use client";

import { useState } from "react";

export function PartnershipContactForm({ defaultInterest }: { defaultInterest: "Team" | "Organization" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          organization,
          message: `[Interested in: ${defaultInterest}]\n${message}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-text-2">
        Got it — someone from MENTA will follow up at {email}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left max-w-sm mx-auto">
      <input
        className="field-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="field-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="field-input"
        placeholder={defaultInterest === "Team" ? "Team name" : "School / organization name"}
        value={organization}
        onChange={(e) => setOrganization(e.target.value)}
        required
      />
      <textarea
        className="field-input"
        placeholder="Anything else we should know? (optional)"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="btn-primary w-full justify-center" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Contact MENTA →"}
      </button>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </form>
  );
}
