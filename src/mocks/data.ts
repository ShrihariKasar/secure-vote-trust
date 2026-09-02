import type {
  AuditEntry,
  Block,
  Candidate,
  Election,
  Voter,
  VoteTransaction,
} from "@/types";

/**
 * Deterministic mock dataset.
 * Replaced later by the FastAPI service layer — no component imports this file
 * directly; access goes through src/services/*.
 */

export const elections: Election[] = [
  {
    id: "ELEC-2026-001",
    name: "Student Council Election 2026",
    description:
      "Annual election for the student council executive committee. Eligible voters are enrolled students with an approved voter record for the 2026 academic year.",
    status: "voting_open",
    startAt: "2026-09-28T09:00:00+05:30",
    endAt: "2026-09-30T17:00:00+05:30",
    candidateIds: ["CAND-001", "CAND-002", "CAND-003"],
    registeredVoters: 1240,
    votesCast: 812,
  },
  {
    id: "ELEC-2026-002",
    name: "Department Representative Election",
    description:
      "Election of departmental representatives for the Computer Engineering department for the 2026-27 term.",
    status: "scheduled",
    startAt: "2026-10-12T09:00:00+05:30",
    endAt: "2026-10-13T17:00:00+05:30",
    candidateIds: ["CAND-004", "CAND-005"],
    registeredVoters: 318,
    votesCast: 0,
  },
  {
    id: "ELEC-2026-003",
    name: "Library Committee Election",
    description:
      "Selection of student members for the central library advisory committee.",
    status: "draft",
    startAt: "2026-11-04T10:00:00+05:30",
    endAt: "2026-11-04T16:00:00+05:30",
    candidateIds: [],
    registeredVoters: 0,
    votesCast: 0,
  },
  {
    id: "ELEC-2025-014",
    name: "Sports Secretary Election 2025",
    description:
      "Election of the sports secretary and two assistant secretaries for the 2025-26 term.",
    status: "results_published",
    startAt: "2025-11-18T09:00:00+05:30",
    endAt: "2025-11-19T17:00:00+05:30",
    candidateIds: ["CAND-006", "CAND-007", "CAND-008"],
    registeredVoters: 1102,
    votesCast: 1000,
  },
  {
    id: "ELEC-2025-011",
    name: "Cultural Committee Election 2025",
    description:
      "Election of the cultural committee convenor. Voting has closed and results are being tallied and verified against the ledger.",
    status: "voting_closed",
    startAt: "2025-08-02T09:00:00+05:30",
    endAt: "2025-08-03T17:00:00+05:30",
    candidateIds: ["CAND-009", "CAND-010"],
    registeredVoters: 940,
    votesCast: 604,
  },
];

export const candidates: Candidate[] = [
  {
    id: "CAND-001",
    electionId: "ELEC-2026-001",
    name: "Aarav Kulkarni",
    position: "President",
    manifesto:
      "Extend library hours during examination weeks, publish a monthly council budget statement, and set up a shared workshop space for project teams.",
    initials: "AK",
    status: "active",
  },
  {
    id: "CAND-002",
    electionId: "ELEC-2026-001",
    name: "Meera Patil",
    position: "President",
    manifesto:
      "Introduce a structured mentorship programme between senior and first-year students, and improve the grievance response timeline to five working days.",
    initials: "MP",
    status: "active",
  },
  {
    id: "CAND-003",
    electionId: "ELEC-2026-001",
    name: "Rohan Deshmukh",
    position: "President",
    manifesto:
      "Expand campus accessibility audits, digitise hostel maintenance requests, and hold open council sessions every fortnight.",
    initials: "RD",
    status: "active",
  },
  {
    id: "CAND-004",
    electionId: "ELEC-2026-002",
    name: "Sana Qureshi",
    position: "Department Representative",
    manifesto:
      "Coordinate lab slot allocation with faculty and publish a shared departmental calendar.",
    initials: "SQ",
    status: "active",
  },
  {
    id: "CAND-005",
    electionId: "ELEC-2026-002",
    name: "Nikhil Rane",
    position: "Department Representative",
    manifesto:
      "Set up a peer review circle for final-year projects and a departmental resource archive.",
    initials: "NR",
    status: "active",
  },
  {
    id: "CAND-006",
    electionId: "ELEC-2025-014",
    name: "Ishita Bhosale",
    position: "Sports Secretary",
    manifesto: "Formalise inter-department league scheduling and equipment tracking.",
    initials: "IB",
    status: "active",
  },
  {
    id: "CAND-007",
    electionId: "ELEC-2025-014",
    name: "Vikram Salunkhe",
    position: "Sports Secretary",
    manifesto: "Increase ground availability slots and introduce a fitness orientation week.",
    initials: "VS",
    status: "active",
  },
  {
    id: "CAND-008",
    electionId: "ELEC-2025-014",
    name: "Priya Naik",
    position: "Sports Secretary",
    manifesto: "Expand women's team participation and publish a transparent selection policy.",
    initials: "PN",
    status: "active",
  },
  {
    id: "CAND-009",
    electionId: "ELEC-2025-011",
    name: "Kabir Joshi",
    position: "Convenor",
    manifesto: "Rotate event ownership across years and publish post-event accounts.",
    initials: "KJ",
    status: "active",
  },
  {
    id: "CAND-010",
    electionId: "ELEC-2025-011",
    name: "Ananya Shetty",
    position: "Convenor",
    manifesto: "Introduce an open call for event proposals and a fixed rehearsal calendar.",
    initials: "AS",
    status: "active",
  },
];

const voterSeed: Array<[string, string, string, string, boolean, Voter["approval"], Voter["voting"]]> = [
  ["VTR-1042", "Aditi Sharma", "aditi.sharma@campus.edu", "+91 98200 41042", true, "approved", "vote_recorded"],
  ["VTR-1043", "Harsh Vardhan", "harsh.vardhan@campus.edu", "+91 98200 41043", true, "approved", "not_voted"],
  ["VTR-1044", "Neha Kulkarni", "neha.kulkarni@campus.edu", "+91 98200 41044", true, "pending", "not_voted"],
  ["VTR-1045", "Devansh Mehta", "devansh.mehta@campus.edu", "+91 98200 41045", false, "pending", "not_voted"],
  ["VTR-1046", "Tanvi Iyer", "tanvi.iyer@campus.edu", "+91 98200 41046", true, "approved", "vote_recorded"],
  ["VTR-1047", "Omkar Jadhav", "omkar.jadhav@campus.edu", "+91 98200 41047", true, "approved", "vote_recorded"],
  ["VTR-1048", "Fatima Ansari", "fatima.ansari@campus.edu", "+91 98200 41048", true, "rejected", "not_voted"],
  ["VTR-1049", "Siddharth Rao", "siddharth.rao@campus.edu", "+91 98200 41049", true, "approved", "not_voted"],
  ["VTR-1050", "Kavya Menon", "kavya.menon@campus.edu", "+91 98200 41050", true, "approved", "vote_recorded"],
  ["VTR-1051", "Yash Gokhale", "yash.gokhale@campus.edu", "+91 98200 41051", false, "pending", "not_voted"],
  ["VTR-1052", "Riya Chatterjee", "riya.chatterjee@campus.edu", "+91 98200 41052", true, "approved", "not_voted"],
  ["VTR-1053", "Arjun Pawar", "arjun.pawar@campus.edu", "+91 98200 41053", true, "suspended", "not_voted"],
  ["VTR-1054", "Sneha Nair", "sneha.nair@campus.edu", "+91 98200 41054", true, "approved", "vote_recorded"],
  ["VTR-1055", "Imran Shaikh", "imran.shaikh@campus.edu", "+91 98200 41055", true, "approved", "vote_recorded"],
  ["VTR-1056", "Pooja Bansode", "pooja.bansode@campus.edu", "+91 98200 41056", true, "approved", "not_voted"],
  ["VTR-1057", "Rahul Kadam", "rahul.kadam@campus.edu", "+91 98200 41057", true, "pending", "not_voted"],
  ["VTR-1058", "Ira Deshpande", "ira.deshpande@campus.edu", "+91 98200 41058", true, "approved", "vote_recorded"],
  ["VTR-1059", "Manav Trivedi", "manav.trivedi@campus.edu", "+91 98200 41059", false, "pending", "not_voted"],
  ["VTR-1060", "Zoya Khan", "zoya.khan@campus.edu", "+91 98200 41060", true, "approved", "not_voted"],
  ["VTR-1061", "Suraj More", "suraj.more@campus.edu", "+91 98200 41061", true, "approved", "vote_recorded"],
];

export const voters: Voter[] = voterSeed.map(
  ([id, name, email, mobile, faceEnrolled, approval, voting], i) => ({
    id,
    name,
    email,
    mobile,
    faceEnrolled,
    approval,
    voting,
    registeredAt: `2026-08-${String(4 + (i % 20)).padStart(2, "0")}T${String(9 + (i % 8)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00+05:30`,
    lastLoginAt:
      approval === "approved"
        ? `2026-09-0${1 + (i % 2)}T1${i % 8}:${String((i * 13) % 60).padStart(2, "0")}:00+05:30`
        : null,
  }),
);

const auditSeed: Array<[string, string, AuditEntry["role"], string, string, AuditEntry["status"], string]> = [
  ["2026-09-02T10:42:00+05:30", "ADM-001", "admin", "Election created", "ELEC-2026-001", "success", "REF-40121"],
  ["2026-09-02T10:44:12+05:30", "ADM-001", "admin", "Candidate added", "CAND-001", "success", "REF-40122"],
  ["2026-09-02T10:44:51+05:30", "ADM-001", "admin", "Candidate added", "CAND-002", "success", "REF-40123"],
  ["2026-09-02T10:45:30+05:30", "ADM-001", "admin", "Candidate added", "CAND-003", "success", "REF-40124"],
  ["2026-09-02T10:46:02+05:30", "VTR-1042", "voter", "Face verification", "AUTH-9282", "success", "REF-40125"],
  ["2026-09-02T10:47:19+05:30", "VTR-1042", "voter", "Session started", "SESS-2281", "success", "REF-40126"],
  ["2026-09-02T10:51:08+05:30", "VTR-1042", "voter", "Vote submitted", "TX-83F91", "success", "REF-40127"],
  ["2026-09-02T10:51:09+05:30", "system", "system", "Block committed", "BLOCK-0004", "success", "REF-40128"],
  ["2026-09-02T10:53:44+05:30", "VTR-1045", "voter", "Face verification", "AUTH-9283", "failure", "REF-40129"],
  ["2026-09-02T10:54:31+05:30", "VTR-1045", "voter", "Face verification", "AUTH-9284", "warning", "REF-40130"],
  ["2026-09-02T10:56:12+05:30", "VTR-1046", "voter", "Face verification", "AUTH-9285", "success", "REF-40131"],
  ["2026-09-02T10:58:40+05:30", "VTR-1046", "voter", "Vote submitted", "TX-83F92", "success", "REF-40132"],
  ["2026-09-02T11:02:07+05:30", "ADM-001", "admin", "Voter approved", "VTR-1049", "success", "REF-40133"],
  ["2026-09-02T11:02:55+05:30", "ADM-001", "admin", "Voter approved", "VTR-1050", "success", "REF-40134"],
  ["2026-09-02T11:05:22+05:30", "ADM-001", "admin", "Voter rejected", "VTR-1048", "warning", "REF-40135"],
  ["2026-09-02T11:09:03+05:30", "VTR-1047", "voter", "Registration submitted", "VTR-1047", "success", "REF-40136"],
  ["2026-09-02T11:12:48+05:30", "VTR-1051", "voter", "Face enrollment", "ENR-5521", "failure", "REF-40137"],
  ["2026-09-02T11:15:30+05:30", "system", "system", "Chain integrity check", "CHAIN", "success", "REF-40138"],
  ["2026-09-02T11:20:11+05:30", "VTR-1050", "voter", "Vote submitted", "TX-83F93", "success", "REF-40139"],
  ["2026-09-02T11:20:12+05:30", "system", "system", "Block committed", "BLOCK-0005", "success", "REF-40140"],
  ["2026-09-02T11:24:59+05:30", "ADM-002", "admin", "Sign-in", "SESS-2284", "success", "REF-40141"],
  ["2026-09-02T11:26:14+05:30", "ADM-002", "admin", "Audit log exported", "AUDIT", "success", "REF-40142"],
  ["2026-09-02T11:31:02+05:30", "VTR-1053", "voter", "Sign-in", "SESS-2285", "failure", "REF-40143"],
  ["2026-09-02T11:31:40+05:30", "system", "system", "Rate limit applied", "VTR-1053", "warning", "REF-40144"],
  ["2026-09-02T11:38:27+05:30", "VTR-1054", "voter", "Face verification", "AUTH-9288", "success", "REF-40145"],
  ["2026-09-02T11:40:04+05:30", "VTR-1054", "voter", "Vote submitted", "TX-83F94", "success", "REF-40146"],
  ["2026-09-02T11:44:35+05:30", "ADM-001", "admin", "Schedule updated", "ELEC-2026-002", "success", "REF-40147"],
  ["2026-09-02T11:49:18+05:30", "VTR-1055", "voter", "Vote submitted", "TX-83F95", "success", "REF-40148"],
  ["2026-09-02T11:52:44+05:30", "system", "system", "Block committed", "BLOCK-0006", "success", "REF-40149"],
  ["2026-09-02T11:58:09+05:30", "VTR-1058", "voter", "Face verification", "AUTH-9290", "success", "REF-40150"],
  ["2026-09-02T12:03:26+05:30", "VTR-1058", "voter", "Vote submitted", "TX-83F96", "success", "REF-40151"],
  ["2026-09-02T12:07:51+05:30", "ADM-001", "admin", "Voter approved", "VTR-1056", "success", "REF-40152"],
  ["2026-09-02T12:12:33+05:30", "VTR-1061", "voter", "Vote submitted", "TX-83F97", "success", "REF-40153"],
  ["2026-09-02T12:18:47+05:30", "system", "system", "Signature verification", "TX-83F97", "success", "REF-40154"],
  ["2026-09-02T12:24:10+05:30", "ADM-002", "admin", "Results tally started", "ELEC-2025-011", "success", "REF-40155"],
  ["2026-09-02T12:29:56+05:30", "system", "system", "Duplicate vote blocked", "VTR-1042", "warning", "REF-40156"],
  ["2026-09-02T12:35:22+05:30", "VTR-1057", "voter", "Registration submitted", "VTR-1057", "success", "REF-40157"],
  ["2026-09-02T12:41:08+05:30", "ADM-001", "admin", "Settings updated", "AUTH-POLICY", "success", "REF-40158"],
  ["2026-09-02T12:47:39+05:30", "system", "system", "Chain integrity check", "CHAIN", "success", "REF-40159"],
  ["2026-09-02T12:55:04+05:30", "ADM-001", "admin", "Sign-out", "SESS-2281", "success", "REF-40160"],
];

export const auditEntries: AuditEntry[] = auditSeed.map(
  ([timestamp, actor, role, action, entity, status, reference], i) => ({
    id: `AUD-${9000 + i}`,
    timestamp,
    actor,
    role,
    action,
    entity,
    status,
    source: role === "system" ? "internal-service" : `10.24.${8 + (i % 4)}.${20 + (i % 60)}`,
    reference,
  }),
);

const hashes = [
  "0000000000000000000000000000000000000000000000000000000000000000",
  "7b9c41f0a2d84e37bc15aa9d0e5f2c8134ab77e0912d4c6b8f03ea77c491e4a1",
  "31ac6d2e9b40f18c7ad5390ee2b16f4489cc012ad7e6b95f3a284d1c77bd8f22",
  "c4e07a91bb3d52f6108ea7d4c9350fb27ae61d8093f452ac7bd10e69f38a4c05",
  "9f2b58d3ac71e604bd93f01a6c8e27354fd0a91bc6e73d582af14b90e2c65d38",
  "5d81c07fae62b93401df7ac5e28b64903cf1de74ab205c96f83e410d7b29a6f4",
  "a30f6b19dc48e2750bf3ad91c67e04582df9b1a6c350e78f24bd016ea95c3f7b",
];

export const blocks: Block[] = hashes.slice(0, 7).map((hash, i) => ({
  index: i,
  hash,
  previousHash: i === 0 ? "0".repeat(64) : (hashes[i - 1] ?? "0".repeat(64)),
  timestamp: `2026-09-02T${String(9 + i).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}:00+05:30`,
  transactionCount: i === 0 ? 0 : ([4, 9, 6, 11, 7, 5][i - 1] ?? 0),
  verified: true,
  merkleRoot: hashes[(i + 3) % hashes.length] ?? "0".repeat(64),
  nonce: 10240 + i * 733,
}));

export const genesisNote =
  "Block 0 is the genesis block created when the ledger was initialised. It holds no vote transactions.";

export const sampleTransaction: VoteTransaction = {
  transactionId: "TX-83F91",
  electionId: "ELEC-2026-001",
  blockIndex: 4,
  blockHash: hashes[4] ?? "0".repeat(64),
  previousHash: hashes[3] ?? "0".repeat(64),
  timestamp: "2026-09-02T10:51:08+05:30",
  signatureValid: true,
  verified: true,
};


export const resultTally: Record<string, Record<string, number>> = {
  "ELEC-2025-014": { "CAND-006": 482, "CAND-007": 371, "CAND-008": 147 },
  "ELEC-2025-011": { "CAND-009": 341, "CAND-010": 263 },
};

export const turnoutSeries = [
  { label: "Day 1 09:00", votes: 62 },
  { label: "Day 1 12:00", votes: 148 },
  { label: "Day 1 15:00", votes: 231 },
  { label: "Day 1 18:00", votes: 344 },
  { label: "Day 2 09:00", votes: 468 },
  { label: "Day 2 12:00", votes: 615 },
  { label: "Day 2 15:00", votes: 742 },
  { label: "Day 2 17:00", votes: 812 },
];
