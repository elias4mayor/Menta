import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";
export default async function AnnouncementsPage() {
  const user = await requireUser();
  const memberships = await prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: { include: { announcements: { orderBy: [{ important: "desc" }, { createdAt: "desc" }], take: 50, include: { author: { select: { name: true } } } } } } } });
  return <main className="max-w-2xl mx-auto space-y-8 py-8">
    <h1 className="text-3xl font-semibold">Announcements</h1>
    {!memberships.length && <p>Join a team to see its announcements. <Link href="/team">Open your teams</Link></p>}
    {memberships.map(({ teamRole, team }) => <section key={team.id} className="space-y-5">
      <h2 className="text-2xl font-semibold">{team.name}</h2>
      {["COACH", "ADMIN"].includes(teamRole) && <details><summary className="cursor-pointer py-3">Post an announcement</summary><AnnouncementComposer teamId={team.id} /></details>}
      {!team.announcements.length && <p className="text-text-2">Team updates will appear here when your coaches post them.</p>}
      {team.announcements.map((post) => <article key={post.id} className="border-t border-[var(--border-soft)] py-5 space-y-3">
        {post.important && <p className="text-sm">Important</p>}<h3 className="text-xl font-semibold">{post.title}</h3><p className="text-sm text-text-2">{post.author.name} · {post.createdAt.toLocaleDateString("en-US", { timeZone: "UTC" })}</p><p className="whitespace-pre-wrap">{post.body}</p>
      </article>)}
    </section>)}
  </main>;
}
