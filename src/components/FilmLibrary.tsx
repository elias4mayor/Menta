"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FilmItem = {
  id: string;
  title: string;
  category: string;
  opponent: string | null;
  season: string | null;
  visibility: string;
  teamName: string | null;
  uploadedByName: string;
  isMine: boolean;
  clipCount: number;
  createdAt: string;
};

const CATEGORIES = ["GAME", "PRACTICE", "TRAINING", "HIGHLIGHT"];

export function FilmLibrary({
  initialFilms,
  teams,
}: {
  initialFilms: FilmItem[];
  teams: { id: string; name: string }[];
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
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Upload film"}
          </button>
        </div>
      </div>

      {showForm && (
        <UploadForm
          teams={teams}
          onUploaded={(film) => {
            setFilms((fs) => [film, ...fs]);
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">
            {films.length === 0
              ? "No film yet. Upload your first clip to start building your library."
              : "Nothing in this category."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((f) => (
            <Link key={f.id} href={`/film/${f.id}`} className="card p-5 block hover:border-[var(--border-strong)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge">{f.category}</span>
                {f.teamName && <span className="badge">{f.teamName}</span>}
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
  onUploaded,
}: {
  teams: { id: string; name: string }[];
  onUploaded: (film: FilmItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [opponent, setOpponent] = useState("");
  const [season, setSeason] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [teamId, setTeamId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<"idle" | "uploading">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a video file.");
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
          <option value="PRIVATE">Private</option>
          <option value="TEAM">Team</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input className="field-input" placeholder="Opponent (optional)" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        <input className="field-input" placeholder="Season (optional)" value={season} onChange={(e) => setSeason(e.target.value)} />
      </div>
      {teams.length > 0 && (
        <select className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
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
