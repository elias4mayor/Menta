"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecruitingSchoolItem } from "@/components/RecruitingSchools";

export type RecruitingActivityItem = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  isDraft: boolean;
  createdAt: string;
  school: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
};

export function RecruitingOutreachPanel({
  schools,
  initialActivities,
  aiConfigured,
  aiEnvVar,
}: {
  schools: RecruitingSchoolItem[];
  initialActivities: RecruitingActivityItem[];
  aiConfigured: boolean;
  aiEnvVar: string;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [showForm, setShowForm] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [contactId, setContactId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestDraft, setLatestDraft] = useState<string | null>(null);

  const selectedSchool = schools.find((s) => s.id === schoolId);
  const contactsForSchool = selectedSchool?.contacts ?? [];

  async function generateDraft(e: React.FormEvent) {
    e.preventDefault();
    setDrafting(true);
    setError(null);
    setLatestDraft(null);
    try {
      const res = await fetch("/api/recruiting/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, contactId: contactId || undefined, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate a draft.");
        return;
      }
      if (data.configured === false) {
        setError(data.error);
        return;
      }
      setLatestDraft(data.draft);
      if (data.activity) setActivities((a) => [data.activity, ...a]);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  async function removeActivity(id: string) {
    setActivities((a) => a.filter((act) => act.id !== id));
    await fetch(`/api/recruiting/activities/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">MENTA AI outreach assistant</div>
          <span className={aiConfigured ? "badge badge-live" : "badge badge-demo"}>
            {aiConfigured ? "Connected" : "Not connected"}
          </span>
        </div>

        {!aiConfigured && (
          <p className="text-text-2 text-sm mb-3">
            Set {aiEnvVar} on the server to turn on draft generation. Until then this won&rsquo;t
            produce a real draft.
          </p>
        )}

        {schools.length === 0 ? (
          <p className="text-text-2 text-sm">Add a target school first to draft outreach to it.</p>
        ) : !showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-secondary">
            Draft outreach
          </button>
        ) : (
          <form onSubmit={generateDraft} className="card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="outreach-school">School</label>
                <select
                  id="outreach-school"
                  className="field-select"
                  value={schoolId}
                  onChange={(e) => {
                    setSchoolId(e.target.value);
                    setContactId("");
                  }}
                  required
                >
                  <option value="">Select a school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="outreach-contact">Coach / contact (optional)</label>
                <select
                  id="outreach-contact"
                  className="field-select"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  disabled={!schoolId}
                >
                  <option value="">No specific contact — address generally</option>
                  {contactsForSchool.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.title ? ` (${c.title})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="outreach-purpose">Purpose of this message</label>
              <input
                id="outreach-purpose"
                className="field-input"
                placeholder="e.g. Introduce myself and share interest in the program"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={drafting || !schoolId || !purpose.trim()} className="btn-primary">
                {drafting ? "Drafting…" : "Generate draft"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-text-2 hover:text-text-1">
                Cancel
              </button>
            </div>
          </form>
        )}

        {latestDraft && (
          <div className="card p-4 mt-3">
            <div className="badge badge-demo mb-3">Draft — review before sending</div>
            <p className="text-sm whitespace-pre-wrap">{latestDraft}</p>
            <p className="text-text-3 text-xs mt-3">
              This is a starting point, not a finished message. Read it over, make it your own, and send it
              yourself from your own email — MENTA doesn&rsquo;t send anything on your behalf, and doesn&rsquo;t
              guarantee a response, offer, or roster spot.
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="mono text-text-3 mb-3">Recent outreach & activity</div>
        {activities.length === 0 ? (
          <p className="text-text-2 text-sm">
            Nothing logged yet. Drafts you generate and notes you add will show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.isDraft && <span className="badge badge-demo">Draft</span>}
                      <span className="text-sm font-medium truncate">{a.subject ?? statusForType(a.type)}</span>
                    </div>
                    <p className="text-text-3 text-xs">
                      {[a.school?.name, a.contact?.name].filter(Boolean).join(" · ")}
                      {" · "}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                    {a.body && <p className="text-text-2 text-sm mt-2 whitespace-pre-wrap line-clamp-4">{a.body}</p>}
                  </div>
                  <button onClick={() => removeActivity(a.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusForType(type: string): string {
  const labels: Record<string, string> = {
    NOTE: "Note",
    EMAIL_DRAFT: "Email draft",
    CALL: "Call",
    VISIT: "Visit",
    OTHER: "Activity",
  };
  return labels[type] ?? type;
}
