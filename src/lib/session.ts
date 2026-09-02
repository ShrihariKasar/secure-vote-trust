import { useSyncExternalStore } from "react";
import type { SessionUser } from "@/types";

const KEY = "securevote.session";

interface SessionState {
  user: SessionUser | null;
  pendingVoterId: string | null;
  /** Candidate selected in the current voting flow (not yet submitted). */
  draftCandidateId: string | null;
}

const empty: SessionState = { user: null, pendingVoterId: null, draftCandidateId: null };

let state: SessionState = empty;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — session stays in memory */
  }
};

export const hydrateSession = () => {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...(JSON.parse(raw) as SessionState) };
  } catch {
    state = empty;
  }
  emit();
};

export const sessionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  set(patch: Partial<SessionState>) {
    state = { ...state, ...patch };
    persist();
    emit();
  },
  clear() {
    state = empty;
    persist();
    emit();
  },
};

export function useSession() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.get,
    () => empty,
  );
}
