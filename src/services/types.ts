import type {
  AdminOverview,
  ApprovalStatus,
  AuditEntry,
  AuditChainVerification,
  Block,
  Candidate,
  Election,
  ElectionResult,
  Role,
  SessionUser,
  Voter,
  VoteTransaction,
  ConsensusSummary,
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
  aadhaarNumber?: string | undefined;
  aadhaarVerified?: boolean | undefined;
  imageData?: string | undefined;
}

export interface RegistrationReceipt {
  voterId: string;
  submittedAt: string;
  approval: ApprovalStatus;
  reference: string;
  aadhaarVerified?: boolean | undefined;
  message?: string | undefined;
}

export interface FaceVerificationResult {
  verified: boolean;
  similarity?: number | undefined;
  detail?: string | undefined;
  livenessChecks: { blink: boolean; headMovement: boolean; framing: boolean };
  reference: string;
  votingSessionToken?: string | undefined;
  expiresAt?: string | undefined;
  imageData?: string | undefined;
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
  batchApprove(): Promise<{ success: boolean; approvedCount: number }>;
  sendAadhaarOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string; maskedAadhaar: string; demoOtp: string }>;
  verifyAadhaarOtp(aadhaarNumber: string, otp: string): Promise<{
    verified: boolean;
    ekycReference: string;
    maskedAadhaar: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    voterId?: string;
  }>;
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
  castVote(input: { electionId: string; candidateId: string; voterId: string; votingSessionToken?: string }): Promise<VoteTransaction>;
  myVote(voterId?: string, electionId?: string): Promise<VoteTransaction | null>;
  hasVoted(voterId?: string, electionId?: string): Promise<boolean>;
  verifyReceipt(receiptOrTxId: string): Promise<any>;
}

export interface BlockchainService {
  listBlocks(): Promise<Block[]>;
  stats(): Promise<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>;
  getTransaction(id: string): Promise<VoteTransaction | null>;
  verifyTransaction(id: string): Promise<{ verified: boolean; signatureValid: boolean }>;
  getConsensus(): Promise<ConsensusSummary>;
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
  verifyChain(): Promise<AuditChainVerification>;
  exportCsv(entries: AuditEntry[]): string;
}

export interface ResultService {
  get(electionId: string): Promise<ElectionResult | null>;
  available(): Promise<Array<{ id: string; name: string }>>;
}
