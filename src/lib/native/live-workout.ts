"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Live workout session shared by the in-app workout mode and the iOS
 * Lock Screen / Dynamic Island Live Activity (native/ios/*).
 *
 * The same state machine exists in Swift (native/ios/Shared/MentaWorkoutAttributes.swift)
 * so Lock Screen buttons work while the app is in the background. Keep the
 * two `nextState` implementations identical.
 *
 * Privacy: only workout names, set counts and rep labels go to the Lock Screen.
 * Never pass wellness, mindset, academic or recruiting data here — a Lock
 * Screen is visible to anyone holding the phone.
 */

export type LiveExercise = { name: string; sets: number; reps: string };
export type LiveAction = "completeSet" | "skip" | "addRest";
export type LivePhase = "work" | "rest" | "done";
export type LiveState = {
  exerciseIndex: number;
  setNumber: number; // 1-based
  restEndsAt: number | null; // epoch ms
  phase: LivePhase;
};
export type LiveSession = {
  workoutName: string;
  startedAt: number; // epoch ms
  restSeconds: number;
  exercises: LiveExercise[];
  state: LiveState;
};

export const DEFAULT_REST_SECONDS = 90;
const ADD_REST_SECONDS = 30;

export function initialState(): LiveState {
  return { exerciseIndex: 0, setNumber: 1, restEndsAt: null, phase: "work" };
}

export function nextState(
  s: LiveState,
  exercises: LiveExercise[],
  restSeconds: number,
  action: LiveAction,
  now: number = Date.now()
): LiveState {
  if (s.phase === "done" || exercises.length === 0) return s;
  const ex = exercises[s.exerciseIndex];
  const isLastExercise = s.exerciseIndex >= exercises.length - 1;
  switch (action) {
    case "completeSet": {
      if (s.setNumber < ex.sets) {
        return { ...s, setNumber: s.setNumber + 1, restEndsAt: now + restSeconds * 1000, phase: "rest" };
      }
      if (isLastExercise) return { ...s, restEndsAt: null, phase: "done" };
      return { exerciseIndex: s.exerciseIndex + 1, setNumber: 1, restEndsAt: now + restSeconds * 1000, phase: "rest" };
    }
    case "skip": {
      if (isLastExercise) return { ...s, restEndsAt: null, phase: "done" };
      return { exerciseIndex: s.exerciseIndex + 1, setNumber: 1, restEndsAt: null, phase: "work" };
    }
    case "addRest": {
      const base = s.restEndsAt && s.restEndsAt > now ? s.restEndsAt : now;
      return { ...s, restEndsAt: base + ADD_REST_SECONDS * 1000, phase: "rest" };
    }
  }
}

/** "4" → 4, "3 rounds" → 3, "max" / missing → 1. Capped so a typo can't create 400 sets. */
export function parseSetCount(raw?: string): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 1;
}

type NativePlugin = {
  isSupported(): Promise<{ supported: boolean }>;
  start(options: {
    workoutName: string;
    restSeconds: number;
    exercises: LiveExercise[];
  }): Promise<{ session: LiveSession }>;
  apply(options: { action: LiveAction }): Promise<{ session: LiveSession | null }>;
  getSession(): Promise<{ session: LiveSession | null }>;
  end(): Promise<void>;
  addListener(
    eventName: "sessionChange",
    cb: (data: { session: LiveSession | null }) => void
  ): Promise<PluginListenerHandle>;
};

const Native = registerPlugin<NativePlugin>("MentaLiveWorkout");

/** True only inside the MENTA iOS app on a device that allows Live Activities. */
export async function nativeLiveSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
  try {
    return (await Native.isSupported()).supported;
  } catch {
    return false;
  }
}

export const nativeLive = Native;
