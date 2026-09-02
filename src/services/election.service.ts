import { elections as seed, turnoutSeries, voters } from "@/mocks/data";
import type { Election } from "@/types";
import { clone, delay } from "./latency";
import type { ElectionService } from "./types";

let store: Election[] = clone(seed);

export const electionService: ElectionService = {
  async list(filters) {
    let result = clone(store);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
      );
    }
    if (filters?.status && filters.status !== "all") {
      result = result.filter((e) => e.status === filters.status);
    }
    return delay(result);
  },

  async get(id) {
    return delay(clone(store.find((e) => e.id === id)));
  },

  async active() {
    return delay(clone(store.find((e) => e.status === "voting_open")));
  },

  async create(draft) {
    const election: Election = {
      id: draft.id,
      name: draft.name,
      description: draft.description,
      status: draft.status,
      startAt: `${draft.startDate}T${draft.startTime}:00+05:30`,
      endAt: `${draft.endDate}T${draft.endTime}:00+05:30`,
      candidateIds: [],
      registeredVoters: 0,
      votesCast: 0,
    };
    store = [election, ...store];
    return delay(clone(election), 700);
  },

  async overview() {
    const approved = voters.filter((v) => v.approval === "approved").length;
    const votesCast = store.reduce((sum, e) => sum + e.votesCast, 0);
    const registered = store.reduce((sum, e) => sum + e.registeredVoters, 0);
    return delay({
      activeElections: store.filter((e) => e.status === "voting_open").length,
      registeredVoters: voters.length,
      approvedVoters: approved,
      pendingVoters: voters.filter((v) => v.approval === "pending").length,
      votesCast,
      turnout: registered ? Math.round((votesCast / registered) * 1000) / 10 : 0,
    });
  },

  async turnoutSeries() {
    return delay(clone(turnoutSeries));
  },
};
