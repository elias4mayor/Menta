import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await prisma.athleteProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="max-w-2xl">
      <div className="mono text-text-3 mb-2">Profile</div>
      <h1 className="text-3xl font-semibold mb-8">{user.name}</h1>
      <ProfileForm
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
  );
}
