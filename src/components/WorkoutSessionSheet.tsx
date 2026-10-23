"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { ActionSheet } from "./ActionSheet";
import { parseWorkoutDraft, workoutDraftKey, type WorkoutDraft } from "@/lib/workout-draft";
import styles from "./WorkoutSessionSheet.module.css";

export type SessionWorkout = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  exercises: { name: string; sets?: string; reps?: string; notes?: string }[];
};
export type CompletionSummary = { count: number; lastCompletedAt: string | null };

export function WorkoutSessionSheet({ workout, userId, initialDraft, initialError, onClose, onSaved }: {
  workout: SessionWorkout;
  userId: string;
  initialDraft: WorkoutDraft | null;
  initialError: string | null;
  onClose: () => void;
  onSaved: (summary: CompletionSummary) => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [storageError, setStorageError] = useState(initialError);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const formId = useId();
  const key = workoutDraftKey(userId, workout.id);
  const workoutSignature = JSON.stringify([workout.title, workout.description, workout.exercises]);
  const workoutChanged = !!draft && !draft.saved && !draft.submitted && draft.workoutSignature !== workoutSignature;

  function close() {
    if (storageError && draft && !draft.saved && !confirm("Recent progress could not be saved on this device. Close anyway?")) return;
    onClose();
  }

  function persist(next: WorkoutDraft) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(null);
      return true;
    } catch {
      setStorageError("Progress could not be saved on this device. Keep this panel open and retry, or allow browser storage.");
      return false;
    }
  }

  function start() {
    if (draft || storageError) return;
    // Re-read at the action boundary: another tab may already have started this workout.
    try {
      const existing = parseWorkoutDraft(localStorage.getItem(key));
      if (existing && !existing.saved) { setDraft(existing); return; }
      const next: WorkoutDraft = { version: 1, completionId: crypto.randomUUID(), startedAt: new Date().toISOString(), checked: [], effort: "", notes: "", saved: false, submitted: false, workoutSignature };
      if (persist(next)) setDraft(next);
    } catch {
      setStorageError("Saved progress could not be read. Retry before starting, or clear this workout's local progress.");
    }
  }

  function update(changes: Partial<WorkoutDraft>) {
    if (!draft || inFlight.current || draft.submitted || workoutChanged) return;
    const next = { ...draft, ...changes };
    setDraft(next);
    persist(next);
  }

  function retryStorage() {
    if (draft) { persist(draft); return; }
    try {
      setDraft(parseWorkoutDraft(localStorage.getItem(key)));
      setStorageError(null);
    } catch { setStorageError("Saved progress is still unavailable. Allow browser storage or clear this workout's local progress."); }
  }

  function clearProgress() {
    if (!confirm("Clear this workout's progress on this device? Saved completions will stay in your history.")) return;
    try {
      localStorage.removeItem(key);
      setDraft(null);
      setStorageError(null);
      setError(null);
    } catch { setStorageError("Browser storage is unavailable. Allow it to start and resume workouts on this device."); }
  }

  async function finish() {
    if (!draft || draft.saved || inFlight.current || workoutChanged) return;
    // Persist the retry key before sending any completion request.
    const submitted = { ...draft, submitted: true };
    if (!persist(submitted)) return;
    setDraft(submitted);
    inFlight.current = true;
    setSaving(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`/api/workouts/${workout.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId: draft.completionId, effort: draft.effort ? Number(draft.effort) : undefined, notes: draft.notes || undefined }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(response.status === 401 ? "Your session has expired. Sign in again, then reopen this workout to retry saving." : data.error ?? "Your workout could not be saved. Retry when you're connected.");
        return;
      }
      const next = { ...submitted, saved: true };
      setDraft(next);
      persist(next);
      onSaved(data.summary);
    } catch {
      setError("We couldn't confirm the save. Your progress is still here. Retry saving; it won't add a second completion.");
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <ActionSheet title={workout.title} busy={saving} onClose={close}>
      <div className={styles.content}>
        <p className={styles.meta}>{workout.category} · {workout.exercises.length} movements</p>
        {workout.description && <p className={styles.instructions}>{workout.description}</p>}
        {workoutChanged && <div className={styles.problem} role="alert">
          <p>This workout changed since you started. Review the updated instructions and clear local progress before starting it again.</p>
          <button type="button" className="btn-secondary" onClick={clearProgress}>Clear local progress</button>
        </div>}
        {storageError && <div className={styles.problem} role="alert">
          <p>{storageError}</p>
          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={retryStorage}>Retry device save</button>
            <button type="button" className="btn-secondary" onClick={clearProgress}>Clear local progress</button>
          </div>
        </div>}
        {draft?.saved ? <div className={styles.result} role="status">
          <span className={styles.check} aria-hidden="true">✓</span>
          <h3>Workout saved</h3>
          <p>Your completion is in your training history.</p>
          <button type="button" className="btn-primary" onClick={onClose}>Done</button>
          <button type="button" className="btn-secondary" disabled={!!storageError} onClick={() => { setDraft(null); setError(null); }}>Prepare another workout</button>
        </div> : <>
          {draft && <p className={styles.meta} role="status">In progress · Started {new Date(draft.startedAt).toLocaleString()}</p>}
          <ul className={styles.movements} aria-label="Workout movements">
            {workout.exercises.map((exercise, index) => <li key={index}>
              {draft ? <label className={styles.movement}>
                <input type="checkbox" disabled={saving || draft.submitted || workoutChanged} checked={!workoutChanged && draft.checked.includes(index)} onChange={(event) => update({ checked: event.target.checked ? [...draft.checked, index] : draft.checked.filter((i) => i !== index) })} />
                <Movement exercise={exercise} />
              </label> : <div className={styles.movement}><span className={styles.number}>{index + 1}</span><Movement exercise={exercise} /></div>}
            </li>)}
          </ul>
          {!draft ? <>
            <p className={styles.meta}>Progress stays on this device until you save your completion to MENTA.</p>
            <SwipeToStart disabled={!!storageError} onStart={start} />
            <button type="button" className={`btn-primary ${styles.primary}`} disabled={!!storageError} onClick={start}>Start workout</button>
          </> : <>
            <p className={styles.meta}>{draft.checked.filter((i) => i < workout.exercises.length).length} of {workout.exercises.length} movements checked. Check only what you completed.</p>
            <label className={styles.field} htmlFor={`${formId}-effort`}>Effort (optional)
              <select id={`${formId}-effort`} className="field-select" disabled={saving || draft.submitted || workoutChanged} value={draft.effort} onChange={(event) => update({ effort: event.target.value })}>
                <option value="">Choose effort</option>
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}{i === 0 ? " · Easy" : i === 9 ? " · Maximum" : ""}</option>)}
              </select>
            </label>
            <label className={styles.field} htmlFor={`${formId}-notes`}>Workout notes (optional)
              <textarea id={`${formId}-notes`} className="field-textarea" rows={3} maxLength={500} disabled={saving || draft.submitted || workoutChanged} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} />
            </label>
            {error && <p className={styles.problem} role="alert">{error}</p>}
            {draft.submitted && !saving && <p className={styles.meta}>Your completion details are held for a safe retry. Finish saving to confirm your history.</p>}
            <button type="button" className={`btn-primary ${styles.primary}`} disabled={saving || !!storageError || workoutChanged} onClick={finish}>{saving ? "Saving workout…" : error ? "Retry saving workout" : "Finish and save workout"}</button>
            <button type="button" className={`btn-secondary ${styles.primary}`} disabled={saving} onClick={close}>Continue later</button>
            <p className={styles.meta}>Closing keeps your progress on this browser. Resume from the workout library.</p>
          </>}
        </>}
      </div>
    </ActionSheet>
  );
}

function Movement({ exercise }: { exercise: SessionWorkout["exercises"][number] }) {
  return <span className={styles.movementText}><strong>{exercise.name}</strong>
    <span>{[exercise.sets && `${exercise.sets} sets`, exercise.reps && `${exercise.reps} reps`].filter(Boolean).join(" · ")}</span>
    {exercise.notes && <span>{exercise.notes}</span>}
  </span>;
}

function SwipeToStart({ disabled, onStart }: { disabled: boolean; onStart: () => void }) {
  const [distance, setDistance] = useState(0);
  const drag = useRef<{ x: number; max: number; pointerId: number } | null>(null);
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current || event.pointerId !== drag.current.pointerId) return;
    setDistance(Math.max(0, Math.min(drag.current.max, event.clientX - drag.current.x)));
  }
  return <div className={styles.swipe} aria-hidden="true">
    <span>Swipe to start workout</span>
    <button type="button" tabIndex={-1} disabled={disabled} data-dragging={distance > 0} className={styles.thumb} style={{ transform: `translateX(${distance}px)` }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        const max = event.currentTarget.parentElement!.clientWidth - 64;
        drag.current = { x: event.clientX, max, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        drag.current = null;
        setDistance(0);
        if (current && current.max > 0 && event.clientX - current.x >= current.max * .85) onStart();
      }}
      onPointerCancel={() => { drag.current = null; setDistance(0); }}
      onLostPointerCapture={() => { drag.current = null; setDistance(0); }}>→</button>
  </div>;
}
