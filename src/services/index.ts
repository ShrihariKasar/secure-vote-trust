/**
 * Service abstraction layer.
 *
 * Every screen talks to these interfaces only. The current implementations are
 * mock adapters backed by src/mocks/data.ts. When the FastAPI backend exists,
 * swap the exported implementations for HTTP adapters — no UI change required.
 */
export * from "./types";
export { authService } from "./auth.service";
export { voterService } from "./voter.service";
export { electionService } from "./election.service";
export { candidateService } from "./candidate.service";
export { voteService } from "./vote.service";
export { blockchainService } from "./blockchain.service";
export { auditService } from "./audit.service";
export { resultService } from "./result.service";
