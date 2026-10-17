import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export const CHAT_STAFF_ROLES = ["COACH", "ADMIN", "TRAINER", "DOCTOR", "TEACHER", "STAFF"];
export function conversationReadWhere(userId: string): Prisma.ConversationWhereInput {
  return { participants: { some: { userId } }, OR: [
    { teamId: null, scopeTeamId: null },
    { team: { memberships: { some: { userId } } } },
    { scopeTeamId: { not: null }, staffOnly: false, groupTeam: { memberships: { some: { userId } } } },
    { staffOnly: true, groupTeam: { memberships: { some: { userId, teamRole: { in: CHAT_STAFF_ROLES } } } } },
  ] };
}
export async function canReadConversation(userId: string, id: string) {
  return Boolean(await prisma.conversation.findFirst({ where: { id, ...conversationReadWhere(userId) }, select: { id: true } }));
}
