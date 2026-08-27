"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

type FilmItem = {
  id: string;
  title: string;
  category: string;
  opponent: string | null;
  season: string | null;
  visibility: string;
  teamName: string | null;
  positionGroupName?: string | null;
  uploadedByName: string;
  isMine: boolean;
  clipCount: number;
  createdAt: string;
};

type PositionGroupOption = { id: string; name: string; teamId: string };

const CATEGORIES = ["GAME", "PRACTICE", "TRAINING", "HIGHLIGHT"];

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private — only me" },
  { value: "COACH_STAFF", label: "Coaching staff" },
  { value: "POSITION_GROUP", label: "One position group" },
  { value: "TEAM", label: "Whole team" },
  { value: "SELECTED_ATHLETES", label: "Selected athletes" },
  { value: "RECRUITING", label: "Recruiting" },
  { value: "PUBLIC", label: "Public" },
];

export function FilmLibrary({
  initialFilms,
  teams,
  positionGroups = [],
}: {
  initialFilms: FilmItem[];
  teams: { id: string; name: string }[];
  positionGroups?: PositionGroupOption[];
}) {
  const router = useRouter();
  const [films, setFilms] = useState(initialFilms);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? films.filter((f) => f.category === filter) : films;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter(null)} className="badge" style={{ cursor: "pointer", opacity: filter === null ? 1 : 0.5 }}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className="badge" style={{ cursor: "pointer", opacity: filter === c ? 1 : 0.5 }}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Link href="/highlights" className="btn-secondary">Highlight reels</Link>
          <Link href="/playlists" className="btn-secondary">Playlists</Link>
          <Link href="/assignments" className="btn-secondary">Assignments</Link>
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Upload film"}
          </button>
        </div>
      </div>

      {showForm && (
        <UploadForm
          teams={teams}
          positionGroups={positionGroups}
          onUploaded={(film) => {
            setFilms((fs) => [film, ...fs]);
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card">
          {films.length === 0 ? (
            <EmptyState title="No film yet" description="Use Upload film above to start building your library." />
          ) : (
            <EmptyState title="Nothing in this category" description="Try a different category, or upload film tagged for it." />
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((f) => (
            <Link key={f.id} href={`/film/${f.id}`} className="card p-5 block hover:border-[var(--border-strong)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge">{f.category}</span>
                {f.teamName && <span className="badge">{f.teamName}</span>}
                {f.positionGroupName && <span className="badge">{f.positionGroupName}</span>}
                {!f.isMine && <span className="badge">{f.uploadedByName}</span>}
              </div>
              <div className="font-medium mb-1">{f.title}</div>
              {(f.opponent || f.season) && (
                <p className="text-text-2 text-sm mb-2">
                  {[f.opponent, f.season].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="mono text-text-3">
                {f.clipCount} clip{f.clipCount === 1 ? "" : "s"} · {new Date(f.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {films.length > 0 && (
        <div className="mt-8 card p-5">
          <div className="mono text-text-3 mb-2">AI Film Analysis</div>
          <span className="badge badge-demo mb-3">Not yet implemented</span>
          <p className="text-text-2 text-sm">
            Automated play detection, tendencies, and film reports need a real video-analysis
            model connected server-side. Until then, use clips and notes to tag film manually —
            nothing here claims to have analyzed footage it hasn&rsquo;t.
          </p>
        </div>
      )}
    </div>
  );
}

function UploadForm({
  teams,
  positionGroups,
  onUploaded,
}: {
  teams: { id: string; name: string }[];
  positionGroups: PositionGroupOption[];
  onUploaded: (film: FilmItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [opponent, setOpponent] = useState("");
  const [season, setSeason] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [teamId, setTeamId] = useState("");
  const [positionGroupId, setPositionGroupId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<"idle" | "uploading">("idle");

  const groupsForTeam = positionGroups.filter((g) => g.teamId === teamId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a video file.");
      return;
    }
    if (visibility === "POSITION_GROUP" && !positionGroupId) {
      setError("Choose a position group for this visibility.");
      return;
    }
    setError(null);
    setProgress("uploading");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title);
      form.set("category", category);
      if (opponent) form.set("opponent", opponent);
      if (season) form.set("season", season);
      form.set("visibility", visibility);
      if (teamId) form.set("teamId", teamId);
      if (visibility === "POSITION_GROUP" && positionGroupId) form.set("positionGroupId", positionGroupId);

      const res = await fetch("/api/films", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onUploaded({
        id: data.film.id,
        title: data.film.title,
        category,
        opponent: opponent || null,
        season: season || null,
        visibility,
        teamName: teams.find((t) => t.id === teamId)?.name ?? null,
        positionGroupName: groupsForTeam.find((g) => g.id === positionGroupId)?.name ?? null,
        uploadedByName: "You",
        isMine: true,
        clipCount: 0,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setError("Network error during upload.");
    } finally {
      setProgress("idle");
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3 mb-6">
      <input className="field-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="field-select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          {VISIBILITY_OPTIONS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="field-input" placeholder="Opponent (optional)" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        <input className="field-input" placeholder="Season (optional)" value={season} onChange={(e) => setSeason(e.target.value)} />
      </div>
      {teams.length > 0 && (
        <select
          className="field-select"
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setPositionGroupId("");
          }}
        >
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}
      {visibility === "POSITION_GROUP" && (
        <select className="field-select" value={positionGroupId} onChange={(e) => setPositionGroupId(e.target.value)}>
          <option value="">Choose position group…</option>
          {groupsForTeam.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}
      <div>
        <label className="field-label" htmlFor="file">Video file (mp4, mov, webm, mkv — max 300MB)</label>
        <input
          id="file"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-m4v"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field-input"
          required
        />
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <button type="submit" disabled={progress === "uploading"} className="btn-primary">
        {progress === "uploading" ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
