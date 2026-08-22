import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { AvatarUpload } from "@/components/AvatarUpload";
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
        <h1 className="text-3xl font-semibold mb-6 text-center">{user.name}</h1>
        <div className="flex justify-center mb-8">
          <AvatarUpload userId={user.id} name={user.name} />
        </div>
        {user.role === "ATHLETE" ? (
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
        ) : (
          <p className="text-text-3 text-sm text-center">
            A dedicated {user.role.toLowerCase()} profile editor isn&rsquo;t built yet — your account details are
            what you entered during onboarding. This page currently manages your photo.
          </p>
        )}
      </div>
    </div>
  );
}
