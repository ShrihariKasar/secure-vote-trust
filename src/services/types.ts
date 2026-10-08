import type {
  AdminOverview,
  AuditEntry,
  Block,
  Candidate,
  Election,
  ElectionResult,
  Role,
  SessionUser,
  Voter,
  VoteTransaction,
} from "@/types";

export interface Credentials {
  identifier: string;
  password: string;
}

export interface RegistrationPayload {
  fullName: string;
  voterId: string;
  email: string;
  mobile: string;
  password: string;
  faceEnrolled: boolean;
}

export interface RegistrationReceipt {
  voterId: string;
  submittedAt: string;
  approval: "pending";
  reference: string;
}

export interface FaceVerificationResult {
  verified: boolean;
  livenessChecks: { blink: boolean; headMovement: boolean; framing: boolean };
  reference: string;
}

export interface AuthService {
  signIn(credentials: Credentials, role: Role): Promise<SessionUser>;
  register(payload: RegistrationPayload): Promise<RegistrationReceipt>;
  verifyFace(userId: string, imageData?: string): Promise<FaceVerificationResult>;
  enrollFace(userId: string, samples: number, imageData?: string): Promise<{ enrolled: boolean; samples: number }>;
  registrationStatus(voterId: string): Promise<{ voterId: string; approval: string; submittedAt: string }>;
}

export interface VoterService {
  list(): Promise<Voter[]>;
  get(id: string): Promise<Voter | undefined>;
  setApproval(id: string, approval: Voter["approval"]): Promise<Voter>;
}

export interface ElectionListFilters {
  search?: string;
  status?: string;
}

export interface ElectionDraft {
  name: string;
  description: string;
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: Election["status"];
}

export interface ElectionService {
  list(filters?: ElectionListFilters): Promise<Election[]>;
  get(id: string): Promise<Election | undefined>;
  active(): Promise<Election | undefined>;
  create(draft: ElectionDraft): Promise<Election>;
  overview(): Promise<AdminOverview>;
  turnoutSeries(id: string): Promise<Array<{ label: string; votes: number }>>;
}

export interface CandidateService {
  listByElection(electionId: string): Promise<Candidate[]>;
  create(input: Omit<Candidate, "initials" | "status">): Promise<Candidate>;
  remove(id: string): Promise<void>;
}

export interface VotingService {
  castVote(input: { electionId: string; candidateId: string; voterId: string }): Promise<VoteTransaction>;
  myVote(voterId: string): Promise<VoteTransaction | null>;
  hasVoted(voterId: string): Promise<boolean>;
}

export interface BlockchainService {
  listBlocks(): Promise<Block[]>;
  stats(): Promise<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>;
  getTransaction(id: string): Promise<VoteTransaction | null>;
  verifyTransaction(id: string): Promise<{ verified: boolean; signatureValid: boolean }>;
}

export interface AuditQuery {
  search?: string;
  role?: string;
  status?: string;
  action?: string;
}

export interface AuditService {
  list(query?: AuditQuery): Promise<AuditEntry[]>;
  actions(): Promise<string[]>;
  exportCsv(entries: AuditEntry[]): string;
}

export interface ResultService {
  get(electionId: string): Promise<ElectionResult | null>;
  available(): Promise<Array<{ id: string; name: string }>>;
}
