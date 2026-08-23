"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_CATEGORIES } from "@/lib/validation";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/documents";
import { EmptyState } from "@/components/EmptyState";

type DocItem = {
  id: string;
  name: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  status: "CURRENT" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";
  notes: string | null;
  ownerName: string | null;
  teamName: string | null;
  isMine: boolean;
  canManage: boolean;
};

type RequestItem = {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  status: string;
  requestedByName: string;
};

const STATUS_LABEL: Record<DocItem["status"], string> = {
  CURRENT: "Current",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
  NO_EXPIRATION: "No Expiration",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsView({
  initialDocuments,
  initialRequests,
  canRequestDocuments,
  teamOptions,
}: {
  initialDocuments: DocItem[];
  initialRequests: RequestItem[];
  canRequestDocuments: boolean;
  teamOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [requests, setRequests] = useState(initialRequests);
  const [showUpload, setShowUpload] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const expiringSoon = documents.filter((d) => d.status === "EXPIRING_SOON").length;
  const expired = documents.filter((d) => d.status === "EXPIRED").length;

  const statusOrder: Record<DocItem["status"], number> = { EXPIRED: 0, EXPIRING_SOON: 1, CURRENT: 2, NO_EXPIRATION: 3 };
  const sorted = [...documents].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      router.refresh();
    }
  }

  async function handleRequestAction(id: string, status: "FULFILLED" | "DISMISSED") {
    const res = await fetch(`/api/documents/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((reqs) => reqs.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  return (
    <div>
      <div className="card p-0 mb-8 overflow-hidden">
        <div className="grid grid-cols-3">
          {[
            { label: "Documents", value: documents.length },
            { label: "Expiring soon", value: expiringSoon },
            { label: "Expired", value: expired },
          ].map((stat, i) => (
            <div key={stat.label} className="p-5" style={{ borderRight: i < 2 ? "1px solid var(--border-soft)" : undefined }}>
              <div className="text-3xl font-heading font-semibold mb-1">{stat.value}</div>
              <div className="mono text-text-3">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {requests.filter((r) => r.status === "PENDING").length > 0 && (
        <div className="card p-5 mb-8">
          <div className="mono text-text-3 mb-3">Requested from you</div>
          <ul className="space-y-3">
            {requests.filter((r) => r.status === "PENDING").map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-text-3 text-xs">
                    {r.requestedByName} requested · {DOCUMENT_CATEGORY_LABELS[r.category] ?? r.category}
                    {r.notes ? ` — ${r.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-secondary" onClick={() => { setShowUpload(true); }}>
                    Upload
                  </button>
                  <button className="text-xs text-text-3 hover:text-text-1" onClick={() => handleRequestAction(r.id, "DISMISSED")}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button className="btn-primary" onClick={() => setShowUpload((s) => !s)}>
          {showUpload ? "Cancel" : "+ Add Document"}
        </button>
        {canRequestDocuments && (
          <button className="btn-secondary" onClick={() => setShowRequestForm((s) => !s)}>
            {showRequestForm ? "Cancel" : "Request a document"}
          </button>
        )}
      </div>

      {showUpload && (
        <UploadForm
          teamOptions={teamOptions}
          onUploaded={(doc) => {
            setDocuments((docs) => [doc, ...docs]);
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}

      {showRequestForm && (
        <RequestForm
          onRequested={() => {
            setShowRequestForm(false);
          }}
        />
      )}

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No documents yet"
            description="Use + Add Document above to keep a physical, insurance card, or anything else worth having on hand."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((d) => (
            <li key={d.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                      {d.name}
                    </a>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="text-text-3 text-xs mt-1">
                    {DOCUMENT_CATEGORY_LABELS[d.category] ?? d.category}
                    {d.teamName ? ` · ${d.teamName}` : d.ownerName ? ` · ${d.ownerName}` : ""}
                    {" · "}
                    {formatBytes(d.sizeBytes)}
                    {d.expiresAt ? ` · Expires ${new Date(d.expiresAt).toLocaleDateString()}` : ""}
                  </div>
                  {d.notes && <p className="text-text-2 text-sm mt-2">{d.notes}</p>}
                </div>
                {d.canManage && (
                  <button onClick={() => handleDelete(d.id)} className="text-xs text-text-3 hover:text-text-1 shrink-0">
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DocItem["status"] }) {
  if (status === "NO_EXPIRATION") return null;
  const color = status === "EXPIRED" ? "var(--danger)" : status === "EXPIRING_SOON" ? "var(--warning)" : "var(--success)";
  return (
    <span className="badge" style={{ borderColor: color, color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function UploadForm({
  teamOptions,
  onUploaded,
}: {
  teamOptions: { id: string; name: string }[];
  onUploaded: (doc: DocItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof DOCUMENT_CATEGORIES)[number]>("OTHER");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [teamId, setTeamId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("name", name);
      form.set("category", category);
      if (expiresAt) form.set("expiresAt", expiresAt);
      if (notes) form.set("notes", notes);
      if (teamId) form.set("teamId", teamId);

      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't upload document.");
        return;
      }
      onUploaded({
        id: data.document.id,
        name: data.document.name,
        category: data.document.category,
        originalFilename: data.document.originalFilename,
        mimeType: data.document.mimeType,
        sizeBytes: data.document.sizeBytes,
        expiresAt: data.document.expiresAt,
        status: data.document.status,
        notes: data.document.notes,
        ownerName: null,
        teamName: teamOptions.find((t) => t.id === teamId)?.name ?? null,
        isMine: true,
        canManage: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
      <input className="field-input" placeholder="Document name (e.g. 2026 Physical)" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c] ?? c}</option>
          ))}
        </select>
        <input type="date" className="field-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="Expiration (optional)" />
      </div>
      {teamOptions.length > 0 && (
        <select className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">Personal document</option>
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name} (team document)</option>
          ))}
        </select>
      )}
      <textarea className="field-textarea" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="field-input"
        required
      />
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Uploading…" : "Upload document"}
      </button>
    </form>
  );
}

function RequestForm({ onRequested }: { onRequested: () => void }) {
  const [athleteEmail, setAthleteEmail] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof DOCUMENT_CATEGORIES)[number]>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const createRes = await fetch("/api/documents/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteEmail, title, category }),
      });
      const data = await createRes.json();
      if (!createRes.ok) {
        setError(data.error ?? "Couldn't send request.");
        return;
      }
      setAthleteEmail("");
      setTitle("");
      onRequested();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
      <input className="field-input" placeholder="Athlete's email" value={athleteEmail} onChange={(e) => setAthleteEmail(e.target.value)} required />
      <input className="field-input" placeholder="What do you need? (e.g. 2026 Physical)" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
        {DOCUMENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c] ?? c}</option>
        ))}
      </select>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
