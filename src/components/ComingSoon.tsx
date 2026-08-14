const PHASE_LABEL: Record<string, string> = {
  "2": "Phase 2 — Core athlete tools",
  "3": "Phase 3 — Depth",
};

export function ComingSoon({
  title,
  phase,
  description,
  requires,
}: {
  title: string;
  phase: "2" | "3";
  description: string;
  requires: string[];
}) {
  return (
    <div className="max-w-2xl">
      <div className="mono text-text-3 mb-2">{PHASE_LABEL[phase]}</div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <span className="badge badge-demo">Not yet built</span>
      </div>
      <p className="text-text-2 mb-6">{description}</p>
      <div className="card p-5">
        <div className="mono text-text-3 mb-3">What this needs before it&apos;s real</div>
        <ul className="space-y-2 text-sm">
          {requires.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-text-3">—</span>
              <span className="text-text-2">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
