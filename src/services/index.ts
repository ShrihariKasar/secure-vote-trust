/**
 * Authoritative Service Layer.
 *
 * All screens interact with the backend API via these strongly-typed HTTP service adapters.
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
