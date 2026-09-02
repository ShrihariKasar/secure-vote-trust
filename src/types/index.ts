export type Role = "admin" | "voter";

export type ElectionStatus =
  | "draft"
  | "scheduled"
  | "voting_open"
  | "voting_closed"
  | "results_published";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type VotingStatus = "not_voted" | "vote_recorded";

export interface Election {
  id: string;
  name: string;
  description: string;
  status: ElectionStatus;
  startAt: string;
  endAt: string;
  candidateIds: string[];
  registeredVoters: number;
  votesCast: number;
}

export interface Candidate {
  id: string;
  electionId: string;
  name: string;
  position: string;
  manifesto: string;
  initials: string;
  status: "active" | "withdrawn";
}

export interface Voter {
  id: string;
  name: string;
  email: string;
  mobile: string;
  registeredAt: string;
  faceEnrolled: boolean;
  approval: ApprovalStatus;
  voting: VotingStatus;
  lastLoginAt: string | null;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: Role | "system";
  action: string;
  entity: string;
  status: "success" | "warning" | "failure";
  source: string;
  reference: string;
}

export interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: string;
  transactionCount: number;
  verified: boolean;
  merkleRoot: string;
  nonce: number;
}

export interface VoteTransaction {
  transactionId: string;
  electionId: string;
  blockIndex: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  signatureValid: boolean;
  verified: boolean;
}

export interface CandidateResult {
  candidateId: string;
  name: string;
  position: string;
  votes: number;
  percentage: number;
  rank: number;
}

export interface ElectionResult {
  electionId: string;
  electionName: string;
  status: ElectionStatus;
  registered: number;
  votesCast: number;
  turnout: number;
  results: CandidateResult[];
  chainVerified: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  faceVerified: boolean;
}

export interface AdminOverview {
  activeElections: number;
  registeredVoters: number;
  approvedVoters: number;
  pendingVoters: number;
  votesCast: number;
  turnout: number;
}
