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

const readInitialState = (): SessionState => {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed && parsed.user) {
        return { ...empty, ...parsed };
      }
    }
  } catch {
    /* storage unavailable — fallback to empty */
  }
  return empty;
};

let state: SessionState = readInitialState();
let hydrated = true;
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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed && parsed.user) {
        state = { ...empty, ...parsed };
        emit();
      }
    }
  } catch {
    /* storage error */
  }
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
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem("securevote.token");
      localStorage.removeItem("securevote.voting_session_token");
    } catch {
      /* ignore */
    }
    emit();
  },
};

export function useSession() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.get,
    () => state,
  );
}
