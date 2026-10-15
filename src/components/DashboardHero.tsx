import Link from "next/link";

/** The home greeting stays lightweight; no background video on work pages. */
export function DashboardHero({ greeting }: { greeting: string }) {
  return (
    <section className="workspace-welcome" aria-label="My MENTA overview">
      <div>
        <div className="workspace-eyebrow"><span className="workspace-live-mark" />MY MENTA</div>
        <h1>{greeting}</h1>
        <p>Your work. Your progress. Your next move.</p>
      </div>
      <Link href="/ai-coach" className="workspace-welcome-action">Ask MENTA <span aria-hidden="true">↗</span></Link>
    </section>
  );
}
