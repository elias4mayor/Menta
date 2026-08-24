import "server-only";
import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = ["SCHEDULED", "FOLLOW_UP"];

/**
 * Expands a provider's recurring weekly ProviderAvailability windows into
 * concrete, bookable slots over the next `days` days, excluding whatever
 * overlaps an already-booked CareRequest for that provider. Times are
 * plain server-local clock time (same simplification CalendarEvent's
 * DateTime fields already use — see the schema doc comment); a real
 * per-user timezone model is a separate, larger change this pass doesn't
 * make.
 */
export async function computeAvailableSlots(
  providerId: string,
  teamId: string,
  days: number
): Promise<{ start: Date; end: Date }[]> {
  const windows = await prisma.providerAvailability.findMany({
    where: { providerId, teamId },
  });
  if (windows.length === 0) return [];

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  const booked = await prisma.careRequest.findMany({
    where: {
      providerId,
      status: { in: ACTIVE_STATUSES },
      scheduledStart: { not: null, lt: horizon },
    },
    select: { scheduledStart: true, scheduledEnd: true },
  });

  const slots: { start: Date; end: Date }[] = [];

  for (let dayOffset = 0; dayOffset <= days; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    const dayOfWeek = day.getDay();

    for (const w of windows.filter((win) => win.dayOfWeek === dayOfWeek)) {
      for (let minute = w.startMinute; minute + w.slotMinutes <= w.endMinute; minute += w.slotMinutes) {
        const start = new Date(day);
        start.setMinutes(minute);
        const end = new Date(start);
        end.setMinutes(start.getMinutes() + w.slotMinutes);

        if (start <= now) continue;

        const overlaps = booked.some(
          (b) => b.scheduledStart && b.scheduledEnd && start < b.scheduledEnd && end > b.scheduledStart
        );
        if (!overlaps) slots.push({ start, end });
      }
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** True if [start, end) would overlap any of this provider's already-booked care requests (optionally excluding one request, for reschedules). */
export async function hasSchedulingConflict(
  providerId: string,
  start: Date,
  end: Date,
  excludeRequestId?: string
): Promise<boolean> {
  const conflict = await prisma.careRequest.findFirst({
    where: {
      providerId,
      status: { in: ACTIVE_STATUSES },
      id: excludeRequestId ? { not: excludeRequestId } : undefined,
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
    },
    select: { id: true },
  });
  return Boolean(conflict);
}
