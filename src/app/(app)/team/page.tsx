import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { TeamActions } from "@/components/TeamActions";
import { MessageButton } from "@/components/MessageButton";
import { GlowWaveText } from "@/components/GlowWaveText";
import { EmptyState } from "@/components/EmptyState";
import { VerifyProviderButton } from "@/components/VerifyProviderButton";
import { NavTile } from "@/components/NavTile";
import { PROVIDER_TEAM_ROLES, hasTeamPermission, isTeamFilmStaff } from "@/lib/permissions";

export default async function TeamPage() {
  const user = await requireUser();

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
        },
      },
    },
  });

  const canManageGroupsByTeam = new Map(
    await Promise.all(
      memberships.map(async (m) => [m.teamId, await hasTeamPermission(user.id, m.teamId, "MANAGE_POSITION_GROUPS")] as const)
    )
  );
  const canAssignByTeam = new Map(
    await Promise.all(
      memberships.map(async (m) => [m.teamId, await hasTeamPermission(user.id, m.teamId, "CREATE_ASSIGNMENT")] as const)
    )
  );
  const isFilmStaffByTeam = new Map(
    await Promise.all(memberships.map(async (m) => [m.teamId, await isTeamFilmStaff(user.id, m.teamId)] as const))
  );
  const canManageNotesByTeam = new Map(
    await Promise.all(
      memberships.map(async (m) => [m.teamId, await hasTeamPermission(user.id, m.teamId, "MANAGE_COACH_NOTES")] as const)
    )
  );

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Team</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Your teams</GlowWaveText></h1>

      {memberships.length === 0 ? (
        <div className="card mb-8">
          <EmptyState title="You’re not on a team yet" description="Create one, or join with an invite code from your coach.">
            <TeamActions />
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="space-y-6 mb-8">
            {memberships.map((m) => {
              const isCoachOrAdmin = m.teamRole === "COACH" || m.teamRole === "ADMIN";
              return (
                <div key={m.id} className="card p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-semibold">{m.team.name}</h2>
                    <span className="badge">{m.teamRole}</span>
                  </div>
                  {m.team.sport && <p className="text-text-2 text-sm mb-4">{m.team.sport}</p>}
                  {isCoachOrAdmin && (
                    <p className="mono text-text-3 mb-4">
                      Invite code: <span className="text-text-1">{m.team.inviteCode}</span>
                    </p>
                  )}

                  {isCoachOrAdmin && (
                    <div className="mb-5">
                      <div className="mono text-text-3 mb-2">Quick actions</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <NavTile
                          href={`/team/${m.team.id}/programs`}
                          icon="train"
                          label="Training programs"
                          description="Build and run this team's programs"
                        />
                        {isFilmStaffByTeam.get(m.teamId) ? (
                          <NavTile
                            href={`/team/${m.team.id}/film-intelligence`}
                            icon="spark"
                            label="Film intelligence"
                            description="Templates, scouting, and reports"
                          />
                        ) : (
                          canAssignByTeam.get(m.teamId) && (
                            <NavTile
                              href={`/team/${m.team.id}/assignments`}
                              icon="film"
                              label="Film assignments"
                              description="Assign film for review"
                            />
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="mono text-text-3 mb-2">Team tools</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {canManageGroupsByTeam.get(m.teamId) && (
                        <NavTile href={`/team/${m.team.id}/groups`} icon="team" label="Position groups" description="Groups & permissions" />
                      )}
                      {canAssignByTeam.get(m.teamId) && (
                        <NavTile href={`/team/${m.team.id}/assignments`} icon="film" label="Film assignments" />
                      )}
                      {isFilmStaffByTeam.get(m.teamId) && (
                        <NavTile href={`/team/${m.team.id}/review-requests`} icon="messages" label="Film questions" />
                      )}
                      {isFilmStaffByTeam.get(m.teamId) && (
                        <NavTile href={`/team/${m.team.id}/film-intelligence`} icon="spark" label="Film intelligence" />
                      )}
                      <NavTile href={`/team/${m.team.id}/programs`} icon="train" label="Training programs" />
                    </div>
                  </div>

                  <div className="mono text-text-3 mb-2">Roster ({m.team.memberships.length})</div>
                  <ul className="space-y-1.5 text-sm">
                    {m.team.memberships.map((tm) => {
                      const isProvider = PROVIDER_TEAM_ROLES.includes(tm.teamRole as "TRAINER" | "DOCTOR");
                      return (
                        <li key={tm.id} className="flex items-center justify-between">
                          <span>{tm.user.name}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-text-3">
                              {tm.teamRole}
                              {isProvider && !tm.verifiedAt && " · pending"}
                            </span>
                            {isCoachOrAdmin && isProvider && !tm.verifiedAt && (
                              <VerifyProviderButton membershipId={tm.id} />
                            )}
                            {canManageNotesByTeam.get(m.teamId) && tm.teamRole === "ATHLETE" && (
                              <Link href={`/team/${m.team.id}/athletes/${tm.userId}/notes`} className="text-xs text-text-3 hover:text-text-1 underline">
                                Notes
                              </Link>
                            )}
                            {tm.userId !== user.id && <MessageButton userId={tm.userId} />}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="card p-6">
            <div className="mono text-text-3 mb-3">Join another team</div>
            <TeamActions compact />
          </div>
        </>
      )}
    </div>
  );
}
