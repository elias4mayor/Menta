import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
import { isRecruitingIntelligenceConnected } from "@/lib/recruiting/provider-status";

export default async function CoachFinderPage() {
  const user = await requireUser();
  const connected = isRecruitingIntelligenceConnected();

  const contacts = await prisma.recruitingContact.findMany({
    where: { userId: user.id },
    include: { school: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Recruiting</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">Find the right person.</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-8 max-w-xl">
        Every contact here is one you added yourself — MENTA doesn&rsquo;t generate or look up coach information.
      </p>

      <section className="mb-8">
        <div className="mono text-text-3 mb-3">Your saved contacts ({contacts.length})</div>
        {contacts.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-text-2 text-sm mb-3">You haven&rsquo;t added any coach contacts yet.</p>
            <Link href="/recruit#schools" className="btn-secondary">Add a contact</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.name}</span>
                  {c.title && <span className="text-text-3 text-xs">{c.title}</span>}
                </div>
                <p className="text-text-2 text-xs mt-1">{c.school.name}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link href="/recruit#schools" className="text-xs text-text-2 hover:text-text-1">
            Manage contacts →
          </Link>
        </div>
      </section>

      <section>
        <div className="mono text-text-3 mb-3">External coach directory</div>
        {connected ? null : (
          <div className="card p-6">
            <p className="text-text-2 text-sm mb-1">Recruiting intelligence is being connected.</p>
            <p className="text-text-3 text-xs">
              MENTA never invents coach names, emails, or phone numbers. A searchable coach directory with
              public, verified contact information will appear here once a licensed recruiting data source
              is connected.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
