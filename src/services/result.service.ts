import { candidates, elections, resultTally } from "@/mocks/data";
import type { ElectionResult } from "@/types";
import { delay } from "./latency";
import type { ResultService } from "./types";

const build = (electionId: string): ElectionResult | null => {
  const election = elections.find((e) => e.id === electionId);
  if (!election) return null;
  const tally = resultTally[electionId];
  if (!tally) return null;
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const rows = Object.entries(tally)
    .map(([candidateId, votes]) => {
      const candidate = candidates.find((c) => c.id === candidateId);
      return {
        candidateId,
        name: candidate?.name ?? candidateId,
        position: candidate?.position ?? "—",
        votes,
        percentage: Math.round((votes / total) * 1000) / 10,
        rank: 0,
      };
    })
    .sort((a, b) => b.votes - a.votes)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return {
    electionId,
    electionName: election.name,
    status: election.status,
    registered: election.registeredVoters,
    votesCast: total,
    turnout: Math.round((total / election.registeredVoters) * 1000) / 10,
    results: rows,
    chainVerified: true,
  };
};

export const resultService: ResultService = {
  async get(electionId) {
    return delay(build(electionId));
  },
  async available() {
    return delay(
      elections
        .filter((e) => resultTally[e.id] && (e.status === "results_published" || e.status === "voting_closed"))
        .map((e) => ({ id: e.id, name: e.name })),
    );
  },
};
