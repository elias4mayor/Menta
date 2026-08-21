import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { NotificationList } from "@/components/NotificationList";
import { GlowWaveText } from "@/components/GlowWaveText";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mono text-text-3 mb-2">Notifications</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Updates</GlowWaveText></h1>
      <NotificationList
        initial={notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          read: Boolean(n.readAt),
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
