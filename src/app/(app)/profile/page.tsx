import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { isMinor } from "@/lib/permissions";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, account] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { dateOfBirth: true } }),
  ]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl min-h-[70vh] flex flex-col justify-center py-6">
        <div className="mono text-text-3 mb-2 text-center">Profile</div>
        <h1 className="text-3xl font-semibold mb-8 text-center">{user.name}</h1>
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
      </div>
    </div>
  );
}
