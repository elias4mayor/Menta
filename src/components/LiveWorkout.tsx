"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_REST_SECONDS,
  initialState,
  nativeLive,
  nativeLiveSupported,
  nextState,
  parseSetCount,
  type LiveAction,
  type LiveExercise,
  type LiveSession,
} from "@/lib/native/live-workout";

function fmt(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Focused workout mode. Works in any browser; inside the MENTA iOS app it
 * also mirrors to a Lock Screen / Dynamic Island Live Activity whose buttons
 * (Set done, +30s, Skip) drive the same session while the phone is locked.
 */
export function LiveWorkout({
  workoutName,
  exercises: rawExercises,
  onFinish,
  onClose,
}: {
  workoutName: string;
  exercises: { name: string; sets?: string; reps?: string }[];
  onFinish: () => Promise<void>;
  onClose: () => void;
}) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [native, setNative] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  // Start (or resume) the session once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const exercises: LiveExercise[] = rawExercises.map((e) => ({
      name: e.name,
      sets: parseSetCount(e.sets),
      reps: e.reps ?? "",
    }));
    (async () => {
      if (await nativeLiveSupported()) {
        setNative(true);
        const existing = (await nativeLive.getSession()).session;
        if (existing && existing.workoutName === workoutName && existing.state.phase !== "done") {
          setSession(existing);
          return;
        }
        if (existing) await nativeLive.end();
        try {
          const { session: s } = await nativeLive.start({ workoutName, restSeconds: DEFAULT_REST_SECONDS, exercises });
          setSession(s);
          return;
        } catch {
          setNative(false); // Live Activities turned off in Settings — fall back to in-app only.
        }
      }
      setSession({
        workoutName,
        startedAt: Date.now(),
        restSeconds: DEFAULT_REST_SECONDS,
        exercises,
        state: initialState(),
      });
    })();
  }, [rawExercises, workoutName]);

  // Lock Screen button presses arrive as events; also resync when the app returns to the foreground.
  useEffect(() => {
    if (!native) return;
    let handle: { remove: () => Promise<void> } | undefined;
    nativeLive.addListener("sessionChange", ({ session: s }) => s && setSession(s)).then((h) => (handle = h));
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        nativeLive.getSession().then(({ session: s }) => s && setSession(s));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      handle?.remove();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [native]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const act = useCallback(
    async (action: LiveAction) => {
      if (!session) return;
      if (native) {
        const { session: s } = await nativeLive.apply({ action });
        if (s) setSession(s);
        return;
      }
      setSession({ ...session, state: nextState(session.state, session.exercises, session.restSeconds, action) });
    },
    [native, session]
  );

  async function finish(save: boolean) {
    setSaving(true);
    try {
      if (save) await onFinish();
      if (native) await nativeLive.end();
    } finally {
      setSaving(false);
      onClose();
    }
  }

  if (!session) return null;
  const { state, exercises } = session;
  const ex = exercises[state.exerciseIndex];
  const restLeft = state.restEndsAt ? (state.restEndsAt - now) / 1000 : 0;
  const resting = state.phase === "rest" && restLeft > 0;
  const done = state.phase === "done";
  const next = exercises[state.exerciseIndex + 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" role="dialog" aria-modal="true" aria-label={`${workoutName} in progress`}>
      <div className="w-full sm:max-w-md bg-[#1c1c1e] text-white rounded-t-3xl sm:rounded-3xl p-5 pb-8">
        <div className="flex justify-between items-center text-xs text-[#8e8e93] mb-3">
          <span className="font-semibold tracking-widest text-white">MENTA</span>
          <span>
            {workoutName} · {fmt((now - session.startedAt) / 1000)}
            {native && " · on Lock Screen"}
          </span>
        </div>

        {done ? (
          <div className="py-4">
            <div className="text-2xl font-semibold mb-1">Workout done</div>
            <p className="text-sm text-[#aeaeb2] mb-5">Nice work. Save it to your training history?</p>
            <button type="button" disabled={saving} onClick={() => finish(true)} className="w-full rounded-xl bg-white text-black py-3 font-semibold">
              {saving ? "Saving…" : "Save workout"}
            </button>
            <button type="button" disabled={saving} onClick={() => finish(false)} className="w-full mt-2 py-2 text-sm text-[#8e8e93]">
              Discard
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-semibold">{ex.name}</div>
                <div className="text-sm text-[#aeaeb2]">
                  Set {state.setNumber} of {ex.sets}
                  {ex.reps && ` · ${ex.reps} reps`}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-semibold tabular-nums ${resting ? "text-[#30d158]" : "text-white"}`}>
                  {resting ? fmt(restLeft) : "Go"}
                </div>
                <div className="text-[10px] text-[#8e8e93]">{resting ? "Rest" : "Your set"}</div>
              </div>
            </div>

            <div className="flex gap-1 my-4" aria-label={`Exercise ${state.exerciseIndex + 1} of ${exercises.length}`}>
              {exercises.map((_, i) => (
                <i key={i} className={`flex-1 h-1 rounded ${i < state.exerciseIndex ? "bg-white" : i === state.exerciseIndex ? "bg-[#30d158]" : "bg-[#3a3a3c]"}`} />
              ))}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => act("completeSet")} className="flex-[2] rounded-xl bg-white text-black py-3 font-semibold">
                Set done
              </button>
              <button type="button" onClick={() => act("addRest")} className="flex-1 rounded-xl bg-[#2c2c2e] py-3 font-semibold">
                +30s
              </button>
              <button type="button" onClick={() => act("skip")} className="flex-1 rounded-xl bg-[#2c2c2e] py-3 font-semibold">
                Skip
              </button>
            </div>
            {next && <p className="text-xs text-[#8e8e93] mt-3">Up next: {next.name}</p>}
            <button type="button" onClick={() => finish(false)} className="w-full mt-4 py-2 text-sm text-[#8e8e93]">
              End workout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
