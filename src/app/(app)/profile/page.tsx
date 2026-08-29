import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { CoachProfileForm } from "@/components/CoachProfileForm";
import { TrainerProfileForm } from "@/components/TrainerProfileForm";
import { ParentProfileForm } from "@/components/ParentProfileForm";
import { AvatarUpload } from "@/components/AvatarUpload";
import { YourSportsManager } from "@/components/YourSportsManager";
import { isMinor } from "@/lib/permissions";
import { getSelfAthleteProfile } from "@/lib/athlete-profile";
import { AthleteProfileView } from "@/components/AthleteProfileView";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function ProfilePage() {
  const user = await requireUser();

  if (user.role === "ATHLETE") {
    const profile = await getSelfAthleteProfile(user.id);
    return (
      <div className="w-full flex justify-center">
        <div className="w-full py-6">
          <AthleteProfileView profile={profile} mode="self" />
          <div className="max-w-2xl mx-auto mt-10 pt-10 border-t border-[var(--border-soft)]">
            <div className="flex justify-center mb-8">
              <AvatarUpload userId={user.id} name={user.name} />
            </div>
            <div className="mono text-text-3 mb-4 text-center">Edit your profile</div>
            <ProfileFormForRole role={user.role} userId={user.id} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl min-h-[70vh] flex flex-col justify-center py-6 dash-in dash-in-1">
        <div className="mono text-text-3 mb-2 text-center">Profile</div>
        <h1 className="text-3xl font-semibold mb-6 text-center">{user.name}</h1>
        <div className="flex justify-center mb-8">
          <AvatarUpload userId={user.id} name={user.name} />
        </div>
        <ProfileFormForRole role={user.role} userId={user.id} />
      </div>
    </div>
  );
}

async function ProfileFormForRole({ role, userId }: { role: string; userId: string }) {
  if (role === "COACH") {
    const profile = await prisma.coachProfile.findUnique({ where: { userId } });
    return (
      <CoachProfileForm
        initial={{
          phone: profile?.phone ?? "",
          sport: profile?.sport ?? "",
          coachingRole: profile?.coachingRole ?? "",
          yearsCoaching: profile?.yearsCoaching ?? undefined,
          organizationName: profile?.organizationName ?? "",
          schoolName: profile?.schoolName ?? "",
          country: profile?.country ?? "",
          focusAreas: parseJsonArray(profile?.focusAreas),
        }}
      />
    );
  }

  if (role === "TRAINER") {
    const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
    return (
      <TrainerProfileForm
        initial={{
          phone: profile?.phone ?? "",
          businessName: profile?.businessName ?? "",
          sport: profile?.sport ?? "",
          specialties: parseJsonArray(profile?.specialties),
          trainingLocation: profile?.trainingLocation ?? "",
          yearsExperience: profile?.yearsExperience ?? undefined,
          certifications: profile?.certifications ?? "",
          trainingPhilosophy: profile?.trainingPhilosophy ?? "",
          country: profile?.country ?? "",
          goals: parseJsonArray(profile?.goals),
        }}
      />
    );
  }

  if (role === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({ where: { userId } });
    return (
      <ParentProfileForm
        initial={{
          phone: profile?.phone ?? "",
          relationship: profile?.relationship ?? "",
          country: profile?.country ?? "",
          goals: parseJsonArray(profile?.goals),
        }}
      />
    );
  }

  const [profile, account] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } }),
  ]);

  return (
    <>
      <ProfileForm
        isMinor={isMinor(account?.dateOfBirth)}
        initial={{
          sport: profile?.sport ?? "",
          position: profile?.position ?? "",
          graduationYear: profile?.graduationYear ?? undefined,
          heightCm: profile?.heightCm ?? undefined,
          weightKg: profile?.weightKg ?? undefined,
          schoolName: profile?.schoolName ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          bio: profile?.bio ?? "",
          gpa: profile?.gpa ?? undefined,
          visibility: profile?.visibility ?? "PRIVATE",
        }}
      />
      <YourSportsManager />
    </>
  );
}
