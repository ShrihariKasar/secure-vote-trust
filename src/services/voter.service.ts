import { voters as seed } from "@/mocks/data";
import type { Voter } from "@/types";
import { clone, delay } from "./latency";
import type { VoterService } from "./types";

let store: Voter[] = clone(seed);

export const voterService: VoterService = {
  async list() {
    return delay(clone(store));
  },
  async get(id) {
    return delay(clone(store.find((v) => v.id === id)));
  },
  async setApproval(id, approval) {
    store = store.map((v) => (v.id === id ? { ...v, approval } : v));
    const updated = store.find((v) => v.id === id)!;
    return delay(clone(updated), 400);
  },
};
