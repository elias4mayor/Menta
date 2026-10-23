/** Device-only progress, scoped to the signed-in account. Never store auth tokens here. */
export type WorkoutDraft = {
  version: 1;
  completionId: string;
  startedAt: string;
  checked: number[];
  effort: string;
  notes: string;
  saved: boolean;
  submitted: boolean;
  workoutSignature: string;
};

export function workoutDraftKey(userId: string, workoutId: string) {
  return `menta:workout:v1:${userId}:${workoutId}`;
}

export function parseWorkoutDraft(raw: string | null): WorkoutDraft | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as WorkoutDraft;
  if (value?.version !== 1 || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value.completionId)
    || !Number.isFinite(Date.parse(value.startedAt)) || !Array.isArray(value.checked)
    || !value.checked.every((i) => Number.isInteger(i) && i >= 0)
    || !/^(?:[1-9]|10)?$/.test(value.effort) || typeof value.notes !== "string"
    || value.notes.length > 500 || typeof value.saved !== "boolean" || typeof value.submitted !== "boolean"
    || typeof value.workoutSignature !== "string") {
    throw new Error("Unreadable workout progress");
  }
  return value;
}
