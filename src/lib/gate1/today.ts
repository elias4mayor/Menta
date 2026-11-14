import type { AssignmentStatus } from '@prisma/client';
export function urgency(status: AssignmentStatus, dueAt: Date, now: Date, timeZone: string, coach = false, submittedAt?: Date) {
  const overdue = dueAt < now;
  if (coach) {
    if (status === 'SUBMITTED') return { priorityScore: submittedAt && now.getTime() - submittedAt.getTime() >= 86400000 ? 115 : 100, urgencyReason: 'SUBMISSION_AWAITING_REVIEW', reasonLabel: 'Retest ready for review' };
    return overdue ? { priorityScore: 60, urgencyReason: 'OVERDUE', reasonLabel: 'Athlete overdue — follow up' } : null;
  }
  if (status === 'NEEDS_REVISION') return { priorityScore: overdue ? 120 : 105, urgencyReason: 'REVISION_REQUESTED', reasonLabel: overdue ? 'Revision overdue' : 'Coach requested revision' };
  if (overdue) return { priorityScore: 90, urgencyReason: 'OVERDUE', reasonLabel: 'Past due date' };
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  if (day.format(dueAt) === day.format(now)) return { priorityScore: status === 'ASSIGNED' ? 75 : 70, urgencyReason: 'DUE_TODAY', reasonLabel: 'Due today' };
  return status === 'ASSIGNED' ? { priorityScore: 50, urgencyReason: 'NEEDS_ACCEPTANCE', reasonLabel: 'Review and accept' } : { priorityScore: 30, urgencyReason: 'UPCOMING_DUE', reasonLabel: 'In progress' };
}
export function compareToday(a: { priorityScore: number; dueAt: Date; assignmentId: string }, b: { priorityScore: number; dueAt: Date; assignmentId: string }) {
  return b.priorityScore - a.priorityScore || a.dueAt.getTime() - b.dueAt.getTime() || (a.assignmentId < b.assignmentId ? -1 : a.assignmentId > b.assignmentId ? 1 : 0);
}
