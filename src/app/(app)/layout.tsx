import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <AppShell user={{ id: user.id, name: user.name, role: user.role }} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
