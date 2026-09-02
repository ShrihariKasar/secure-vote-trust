import { candidates as seed } from "@/mocks/data";
import type { Candidate } from "@/types";
import { clone, delay } from "./latency";
import type { CandidateService } from "./types";

let store: Candidate[] = clone(seed);

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export const candidateService: CandidateService = {
  async listByElection(electionId) {
    return delay(clone(store.filter((c) => c.electionId === electionId)));
  },
  async create(input) {
    const candidate: Candidate = { ...input, initials: initialsOf(input.name), status: "active" };
    store = [...store, candidate];
    return delay(clone(candidate), 450);
  },
  async remove(id) {
    store = store.filter((c) => c.id !== id);
    return delay(undefined, 300);
  },
};
