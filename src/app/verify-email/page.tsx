import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SplitAuthShell } from "@/components/SplitAuthShell";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage() {
  const sessionUser = await requireUser("/verify-email");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, emailVerified: true },
  });
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/dashboard");

  return (
    <SplitAuthShell eyebrow="One more step" title="Verify your email">
      <VerifyEmailForm email={user.email} />
    </SplitAuthShell>
  );
}
