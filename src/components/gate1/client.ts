export type Task = { assignmentId: string; roleView: string; title: string; customCue: string; status: string; version: number; dueAt: string; counterpartyName: string; teamName: string; reasonLabel: string; latestSubmissionId?: string };
export type Assignment = { id: string; athleteId: string; teamId: string; baselineEvidenceId: string; observationId: string; protocolVersionId: string; successCriterion: string };
export type Evidence = { id: string; filmId: string; title: string; protocol: { instructions: string; cameraSetupNotes: string; successRubric: string } };
export type Submission = { evidenceId: string; review?: { feedbackNote: string; comparabilityNotes: string } | null };
export const panel = 'rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white space-y-4';
export const input = 'mt-2 w-full rounded-xl border border-neutral-700 bg-black p-3 text-base text-white focus:outline-2 focus:outline-white disabled:opacity-50';
export const button = 'min-h-11 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';
export class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
const messages: Record<string, string> = { NOT_FOUND: 'This item is unavailable or no longer shared with you.', CONFLICT: 'This task changed. Refresh before taking another action.', UNAUTHENTICATED: 'Your session expired. Sign in again.', INVALID_VIDEO: 'This clip could not be inspected. Try another MOV or MP4 file.', VIDEO_INSPECTION_UNAVAILABLE: 'Video processing is unavailable. Your clip has not been submitted.', UPLOAD_TOO_LARGE: 'This clip exceeds the upload limit. Choose a smaller clip.', STORAGE_UNAVAILABLE: 'Video storage is unavailable. Please try again later.', RETEST_NOT_NEW: 'Use a new recording made after the baseline.', COMPARABLE_RETEST_REQUIRED: 'Closure requires comparable conditions and review notes.' };
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/gate1/${path}`, { ...init, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new RequestError(response.status, messages[data?.error] ?? (response.status === 413 ? messages.UPLOAD_TOO_LARGE : `Request could not be completed (${response.status}). Please retry or refresh.`));
  return data as T;
}
export const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export function errorMessage(e: unknown) { return e instanceof Error ? e.message : 'Connection interrupted. Please retry.'; }
// Persist only a payload fingerprint and key, never clips, notes or playback URLs.
// The same payload after an ambiguous network failure must reuse the key.
export async function operationKey(actorId: string, action: string, payload: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  const slot = `menta-gate1:${actorId}:${action}:${hash}`;
  const previous = sessionStorage.getItem(slot);
  if (previous) return previous;
  const key = crypto.randomUUID(); sessionStorage.setItem(slot, key); return key;
}
