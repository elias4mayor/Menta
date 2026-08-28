"use client";

import { useState } from "react";

type Template = { id: string; name: string; sport: string | null; categories: { id: string; label: string }[] };
type Opponent = { id: string; name: string; sport: string | null; filmCount: number; reportCount: number };
type Report = { id: string; title: string; reportType: string; summary: string | null; createdAt: string };
type ShareGrant = { id: string; filmTitle: string | null; teamName: string };

export function FilmIntelligenceManager({
  teamId,
  canManageTemplates,
  canManageScouting,
  canGenerateReports,
  canShareFilm,
  initialTemplates,
  initialOpponents,
  initialReports,
  initialSharesSent,
  initialSharesReceived,
}: {
  teamId: string;
  canManageTemplates: boolean;
  canManageScouting: boolean;
  canGenerateReports: boolean;
  canShareFilm: boolean;
  initialTemplates: Template[];
  initialOpponents: Opponent[];
  initialReports: Report[];
  initialSharesSent: ShareGrant[];
  initialSharesReceived: ShareGrant[];
}) {
  return (
    <div className="space-y-8">
      <AnalysisTemplatesSection teamId={teamId} canManage={canManageTemplates} initialTemplates={initialTemplates} />
      <ReportsSection teamId={teamId} canGenerate={canGenerateReports} initialReports={initialReports} />
      <OpponentsSection teamId={teamId} canManage={canManageScouting} initialOpponents={initialOpponents} />
      <FilmShareSection
        teamId={teamId}
        canShare={canShareFilm}
        initialSent={initialSharesSent}
        initialReceived={initialSharesReceived}
      />
    </div>
  );
}

function AnalysisTemplatesSection({
  teamId,
  canManage,
  initialTemplates,
}: {
  teamId: string;
  canManage: boolean;
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [name, setName] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const categories = categoriesText.split(",").map((c) => c.trim()).filter(Boolean);
    if (!name.trim() || categories.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/analysis-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), categories }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create template.");
        return;
      }
      setTemplates((t) => [...t, { id: data.template.id, name: data.template.name, sport: data.template.sport, categories: data.template.categories }]);
      setName("");
      setCategoriesText("");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setTemplates((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/analysis-templates/${id}`, { method: "DELETE" });
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mono text-text-3 mb-4">Analysis templates</div>
      <p className="text-text-2 text-sm mb-4">Custom grading rubrics — build your own categories, sport-agnostic.</p>

      {templates.length === 0 ? (
        <p className="text-text-2 text-sm mb-4">No templates yet.</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span>
                {t.name} <span className="text-text-3">— {t.categories.map((c) => c.label).join(", ")}</span>
              </span>
              {canManage && (
                <button className="text-xs text-text-3 hover:text-text-1" onClick={() => remove(t.id)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={create} className="space-y-2 max-w-md">
          <input className="field-input" placeholder="Template name (e.g. QB Evaluation)" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className="field-input"
            placeholder="Categories, comma separated (e.g. Footwork, Reads, Accuracy)"
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
          />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" className="btn-secondary" disabled={saving}>
            Create template
          </button>
        </form>
      )}
    </section>
  );
}

function ReportsSection({
  teamId,
  canGenerate,
  initialReports,
}: {
  teamId: string;
  canGenerate: boolean;
  initialReports: Report[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("TEAM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), reportType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate report.");
        return;
      }
      setReports((r) => [{ id: data.report.id, title: data.report.title, reportType: data.report.reportType, summary: data.report.summary, createdAt: data.report.createdAt }, ...r]);
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mono text-text-3 mb-4">Reports</div>
      <p className="text-text-2 text-sm mb-4">Generated from real analysis-template grades and tagged moments already in MENTA — never fabricated.</p>

      {reports.length === 0 ? (
        <p className="text-text-2 text-sm mb-4">No reports yet.</p>
      ) : (
        <ul className="space-y-3 mb-5">
          {reports.map((r) => {
            const summary = r.summary ? JSON.parse(r.summary) : null;
            return (
              <li key={r.id} className="text-sm">
                <div className="font-medium">{r.title} <span className="badge">{r.reportType}</span></div>
                {summary && (
                  <p className="text-text-3 text-xs mt-1">
                    {summary.analysisEntryCount} graded entries
                    {Object.keys(summary.tagCounts ?? {}).length > 0 && ` · ${Object.entries(summary.tagCounts as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(", ")}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canGenerate && (
        <form onSubmit={generate} className="flex flex-wrap gap-2 items-center">
          <input className="field-input" placeholder="Report title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="field-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {["TEAM", "ATHLETE", "POSITION", "GAME", "SEASON", "OPPONENT"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary" disabled={saving}>
            {saving ? "Generating…" : "Generate report"}
          </button>
          {error && <p className="text-sm w-full" style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
      )}
    </section>
  );
}

function OpponentsSection({
  teamId,
  canManage,
  initialOpponents,
}: {
  teamId: string;
  canManage: boolean;
  initialOpponents: Opponent[];
}) {
  const [opponents, setOpponents] = useState(initialOpponents);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/opponents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpponents((o) => [...o, { id: data.opponent.id, name: data.opponent.name, sport: data.opponent.sport, filmCount: 0, reportCount: 0 }]);
        setName("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mono text-text-3 mb-4">Opponents & scouting</div>

      {opponents.length === 0 ? (
        <p className="text-text-2 text-sm mb-4">No opponents tracked yet.</p>
      ) : (
        <ul className="space-y-1.5 mb-5 text-sm">
          {opponents.map((o) => (
            <li key={o.id}>
              {o.name} <span className="text-text-3">— {o.filmCount} film, {o.reportCount} scout report{o.reportCount === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={add} className="flex gap-2 max-w-sm">
          <input className="field-input" placeholder="Opponent name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn-secondary shrink-0" disabled={saving}>
            Add opponent
          </button>
        </form>
      )}
    </section>
  );
}

function FilmShareSection({
  teamId,
  canShare,
  initialSent,
  initialReceived,
}: {
  teamId: string;
  canShare: boolean;
  initialSent: ShareGrant[];
  initialReceived: ShareGrant[];
}) {
  const [sent, setSent] = useState(initialSent);
  const [received] = useState(initialReceived);
  const [filmId, setFilmId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function share(e: React.FormEvent) {
    e.preventDefault();
    if (!filmId.trim() || !inviteCode.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/film-shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: filmId.trim(), toInviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't share that film.");
        return;
      }
      setSent((s) => [{ id: data.grant.id, filmTitle: null, teamName: data.grant.toTeamName }, ...s]);
      setFilmId("");
      setInviteCode("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mono text-text-3 mb-4">Film exchange</div>
      <p className="text-text-2 text-sm mb-4">Share one specific film with another team using their invite code — never your wider library.</p>

      {received.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-text-3 mb-1">Shared with you</div>
          <ul className="text-sm space-y-1">
            {received.map((g) => (
              <li key={g.id}>{g.filmTitle ?? "Film"} — from {g.teamName}</li>
            ))}
          </ul>
        </div>
      )}

      {sent.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-text-3 mb-1">You shared</div>
          <ul className="text-sm space-y-1">
            {sent.map((g) => (
              <li key={g.id}>{g.filmTitle ?? "Film"} — to {g.teamName}</li>
            ))}
          </ul>
        </div>
      )}

      {canShare && (
        <form onSubmit={share} className="flex flex-wrap gap-2 items-center">
          <input className="field-input" placeholder="Film ID" value={filmId} onChange={(e) => setFilmId(e.target.value)} />
          <input className="field-input" placeholder="Receiving team's invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <button type="submit" className="btn-secondary" disabled={saving}>
            Share
          </button>
          {error && <p className="text-sm w-full" style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
      )}
    </section>
  );
}
