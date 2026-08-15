"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type TeamOption = { id: string; name: string; canManage: boolean };

export type TeamProtocolItem = {
  id: string;
  teamId: string;
  title: string;
  venue: string | null;
  content: string;
  team: { id: string; name: string };
};

export type TeamChecklistItemData = {
  id: string;
  teamId: string;
  category: string;
  title: string;
  status: string;
  team: { id: string; name: string };
};

const CATEGORIES = [
  { value: "MEDICAL_INFO", label: "Medical information" },
  { value: "EMERGENCY_CONTACTS", label: "Emergency contacts" },
  { value: "VENUE_AWARENESS", label: "Venue awareness" },
  { value: "COMMUNICATION_PLAN", label: "Communication plan" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "OTHER", label: "Other" },
];
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
function statusLabel(s: string) {
  return s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

export function TeamSafety({
  teams,
  initialProtocols,
  initialChecklistItems,
}: {
  teams: TeamOption[];
  initialProtocols: TeamProtocolItem[];
  initialChecklistItems: TeamChecklistItemData[];
}) {
  const router = useRouter();
  const [protocols, setProtocols] = useState(initialProtocols);
  const [items, setItems] = useState(initialChecklistItems);
  const manageableTeams = teams.filter((t) => t.canManage);

  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [protocolTeamId, setProtocolTeamId] = useState(manageableTeams[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [content, setContent] = useState("");
  const [savingProtocol, setSavingProtocol] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemTeamId, setItemTeamId] = useState(manageableTeams[0]?.id ?? "");
  const [category, setCategory] = useState("VENUE_AWARENESS");
  const [itemTitle, setItemTitle] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  async function addProtocol(e: React.FormEvent) {
    e.preventDefault();
    setSavingProtocol(true);
    try {
      const res = await fetch("/api/safety/team-protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: protocolTeamId, title, venue: venue || undefined, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setProtocols((p) => [data.protocol, ...p]);
        setTitle("");
        setVenue("");
        setContent("");
        setShowProtocolForm(false);
        router.refresh();
      }
    } finally {
      setSavingProtocol(false);
    }
  }

  async function removeProtocol(id: string) {
    setProtocols((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/safety/team-protocols/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSavingItem(true);
    try {
      const res = await fetch("/api/safety/team-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: itemTeamId, category, title: itemTitle }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((i) => [...i, data.item]);
        setItemTitle("");
        setShowItemForm(false);
        router.refresh();
      }
    } finally {
      setSavingItem(false);
    }
  }

  async function updateItemStatus(id: string, status: string) {
    setItems((i) => i.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch(`/api/safety/team-checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeItem(id: string) {
    setItems((i) => i.filter((x) => x.id !== id));
    await fetch(`/api/safety/team-checklist/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (teams.length === 0) {
    return (
      <p className="text-text-2 text-sm">
        You&rsquo;re not on a team yet. Join a team to see (or, as a coach, create) team emergency plans and
        checklists.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Team emergency plans</div>
          {manageableTeams.length > 0 && (
            <button onClick={() => setShowProtocolForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
              {showProtocolForm ? "Cancel" : "+ Add plan"}
            </button>
          )}
        </div>

        {showProtocolForm && (
          <form onSubmit={addProtocol} className="card p-4 space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="field-select" value={protocolTeamId} onChange={(e) => setProtocolTeamId(e.target.value)}>
                {manageableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input className="field-input sm:col-span-2" placeholder="Title (e.g. Home field EAP)" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <input className="field-input sm:col-span-3" placeholder="Venue (optional)" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <textarea className="field-textarea" rows={4} placeholder="Emergency contacts, nearest hospital, AED location, key instructions…" value={content} onChange={(e) => setContent(e.target.value)} required />
            <button type="submit" disabled={savingProtocol || !title.trim() || !content.trim()} className="btn-primary">
              {savingProtocol ? "Saving…" : "Save plan"}
            </button>
          </form>
        )}

        {protocols.length === 0 ? (
          <p className="text-text-2 text-sm">No team emergency plans posted yet.</p>
        ) : (
          <ul className="space-y-3">
            {protocols.map((p) => {
              const canManage = teams.find((t) => t.id === p.teamId)?.canManage;
              return (
                <li key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{p.title}</span>
                        <span className="badge">{p.team.name}</span>
                      </div>
                      {p.venue && <p className="text-text-3 text-xs mt-1">{p.venue}</p>}
                      <p className="text-text-2 text-sm mt-2 whitespace-pre-wrap">{p.content}</p>
                    </div>
                    {canManage && (
                      <button onClick={() => removeProtocol(p.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">Team safety checklist</div>
          {manageableTeams.length > 0 && (
            <button onClick={() => setShowItemForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
              {showItemForm ? "Cancel" : "+ Add item"}
            </button>
          )}
        </div>

        {showItemForm && (
          <form onSubmit={addItem} className="card p-4 space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="field-select" value={itemTeamId} onChange={(e) => setItemTeamId(e.target.value)}>
                {manageableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input className="field-input" placeholder="e.g. AED location confirmed" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} required />
            </div>
            <button type="submit" disabled={savingItem || !itemTitle.trim()} className="btn-primary">
              {savingItem ? "Adding…" : "Add item"}
            </button>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-text-2 text-sm">No team checklist items yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const canManage = teams.find((t) => t.id === item.teamId)?.canManage;
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {item.title} <span className="text-text-3 text-xs">({item.team.name})</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {canManage ? (
                      <select
                        className="field-select"
                        style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                        value={item.status}
                        onChange={(e) => updateItemStatus(item.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge">{statusLabel(item.status)}</span>
                    )}
                    {canManage && (
                      <button onClick={() => removeItem(item.id)} className="text-text-3 hover:text-text-1 text-xs">
                        Remove
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
