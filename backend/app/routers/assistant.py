"""
SecureVote Intelligent Role-Based System Assistant Router.
Provides an adaptable, tone-aware conversational answering engine with strict
Role-Based Access Control (RBAC) boundaries:
- Voters and Guests cannot access or learn about administrative logins, credentials, or admin dashboard controls.
- Administrators cannot access or decrypt secret voter ballot choices (strictly enforcing Zero-Knowledge Secret Ballot).
- Tailors operational walkthroughs, suggested queries, and referenced modules according to the authenticated user's role.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Election, BlockchainBlock, AuditLog, Candidate, User
from app.core.security import get_optional_user
import re

router = APIRouter(prefix="/assistant", tags=["System Assistant"])

class ChatRequest(BaseModel):
    query: str
    conversationHistory: Optional[List[Dict[str, str]]] = []
    userRole: Optional[str] = "guest"
    currentPage: Optional[str] = "/"

class ChatResponse(BaseModel):
    answer: str
    tone: str  # "technical" | "simple" | "security" | "procedural" | "bilingual" | "restricted"
    suggestedQuestions: List[str]
    referencedModules: List[str]
    userRole: str

def detect_query_tone(q: str) -> str:
    lower = q.lower()
    
    # Check for technical / cryptographic deep-dive FIRST
    if any(k in lower for k in ["algorithm", "cipher", "sha-256", "aes", "rsa", "verhoeff", "math", "merkle", "pragmas", "wal", "byzantine", "pbft", "hash pointer"]):
        return "technical"

    # Check for Hinglish / Hindi keywords using exact word boundaries
    if re.search(r"\b(kya|kaise|hoga|batao|hai|karna|surakshit|chunav|chinha|matdan)\b", lower):
        return "bilingual"
    
    # Check for simple / ELI5 request
    if any(k in lower for k in ["explain simply", "simple words", "eli5", "like i'm 5", "easy", "in brief", "layman"]):
        return "simple"
        
    # Check for security / threat model concerns
    if any(k in lower for k in ["rig", "hack", "tamper", "safe", "cheat", "steal", "manipulate", "fake", "trust"]):
        return "security"
        
    # Check for procedural how-to
    if any(k in lower for k in ["how do i", "how to", "steps", "guide", "where do i", "start", "register"]):
        return "procedural"
        
    return "balanced"

def generate_role_based_response(query: str, tone: str, role: str, db: Session, current_user: Optional[User] = None) -> ChatResponse:
    q = query.lower().strip()
    is_admin = (role == "admin")
    is_voter = (role == "voter")
    
    # Live database context
    block_count = db.query(BlockchainBlock).count()
    log_count = db.query(AuditLog).count()
    active_elections = db.query(Election).filter(Election.status == "voting_open").count()

    # =========================================================================
    # 0. STRICT SECURITY FIREWALL: CREDENTIALS NEVER DISCLOSED TO ANYONE
    # =========================================================================
    if any(k in q for k in ["admin password", "user password", "database password", "secret key", "jwt secret", "private key"]):
        return ChatResponse(
            answer=(
                "### 🔒 Zero-Trust Policy: Sensitive Credentials Are Never Disclosed\n\n"
                "In accordance with ISO/IEC 27001 zero-trust cryptographic invariants, system passwords, private encryption keys, root tokens, and session secrets are **strictly confidential and never revealed** by the Aegis AI assistant.\n\n"
                "- If you require administrative credential recovery, follow the official Election Commission out-of-band identity verification protocol.\n"
                "- Passwords in the database are protected with salted multi-round PBKDF2/Argon2 hashing."
            ),
            tone="security",
            suggestedQuestions=[
                "How does the cryptographic audit chain work?",
                "How does Observer consensus operate?",
                "How is my ballot encrypted?"
            ],
            referencedModules=["Zero-Trust Architecture", "Security Policy"],
            userRole=role
        )

    # =========================================================================
    # 1. STRICT SECURITY FIREWALL: VOTER TRYING TO ACCESS ADMIN KNOWLEDGE
    # =========================================================================
    admin_sensitive_keywords = [
        "admin login", "admin credentials", "login as admin", "admin url", "admin route",
        "become admin", "admin dashboard", "create election", "approve voter", "admin signin",
        "batch approve", "admin access", "admin page", "how to be admin", "admin portal",
        "admin secret", "admin panel", "administrator portal", "delete election", "admin account",
        "admin user", "admin username", "admin email"
    ]
    if not is_admin and any(k in q for k in admin_sensitive_keywords):
        return ChatResponse(
            answer=(
                "### 🚫 Access Restricted: Administrative Boundary\n\n"
                "Information regarding administrative logins, credentials, election configuration, voter approval registries, and governance portals is **strictly restricted to authorized Election Commission personnel**.\n\n"
                "As an authorized voter, you have full access to your personal voting capabilities:\n\n"
                "- **👤 My Voter Data:** View your registration status, Aadhaar e-KYC record, and voting participation.\n"
                "- **🗳️ Cast Ballot:** Select candidates and cast encrypted votes during open elections.\n"
                "- **🆔 Aadhaar e-KYC:** Instant digital identity verification with Verhoeff mathematical checksum.\n"
                "- **👤 Facial Liveness:** Biometric verification to generate a 15-minute voting authorization session.\n"
                "- **📜 VVPAT Receipts:** Inspect your cryptographic tracking code and verify inclusion on the ledger.\n"
                "- **⚖️ Candidate Signs:** Explore candidate profiles and official election symbols."
            ),
            tone="restricted",
            suggestedQuestions=[
                "What is my voter status and data?",
                "How do I vote step by step?",
                "How does Aadhaar e-KYC work?",
                "How do I verify my ballot on the ledger?",
                "Can an administrator see who I voted for?"
            ],
            referencedModules=["Voter Dashboard", "Voter Profile", "Aadhaar e-KYC", "VVPAT Receipts"],
            userRole=role
        )

    # =========================================================================
    # 2. STRICT SECURITY FIREWALL: ADMIN TRYING TO REVEAL VOTER SECRET CHOICES
    # =========================================================================
    voter_privacy_keywords = [
        "who voted for", "who did", "voter choice", "show vote of", "show ballot of",
        "reveal voter", "see voter ballot", "decrypt voter choice", "decrypt ballot",
        "voter selection", "which candidate did", "view secret vote", "voter private key",
        "show cleartext aadhaar"
    ]
    if is_admin and any(k in q for k in voter_privacy_keywords):
        return ChatResponse(
            answer=(
                "### 🔒 Confidential Ballot Secrecy Enforced (Zero-Knowledge Invariant)\n\n"
                "In strict accordance with Constitutional Secret Ballot mandates and zero-knowledge cryptographic invariants:\n\n"
                "- **Client-Side AES-256-GCM Encryption:** Every ballot choice is encrypted in the voter's browser before broadcast.\n"
                "- **Zero Admin Visibility:** Neither system administrators, database superusers, nor government observers hold the keys to link an individual voter identity to their candidate choice.\n"
                "- **Authorized Admin Visibility:** Administrators are granted access only to anonymized tally counts (`ElectionResult`), voter participation state (`voted` vs `not_voted`), and cryptographic block digests."
            ),
            tone="security",
            suggestedQuestions=[
                "How does the Audit Chain verify integrity?",
                "How do I publish election results?",
                "How does Observer Notary Consensus work?",
                "How to batch approve pending voters?"
            ],
            referencedModules=["Zero-Knowledge Ballot", "Constitutional Secrecy", "Admin Privacy Policy"],
            userRole=role
        )

    # =========================================================================
    # 3. VOTER PERSONAL DATA ACCESS (ACCESSIBLE TO AUTHENTICATED VOTERS)
    # =========================================================================
    user_data_keywords = [
        "my data", "my profile", "my status", "voter status", "am i approved",
        "am i registered", "my registration", "my aadhaar", "have i voted",
        "my vote", "my account", "my details", "mera status", "mera data",
        "meri profile", "what is my status", "show my data", "check my status"
    ]
    if any(k in q for k in user_data_keywords):
        if is_admin:
            return ChatResponse(
                answer=(
                    "### ⚙️ Administrator Account Context\n\n"
                    f"- **Admin Name:** {current_user.name if current_user else 'Electoral Officer'}\n"
                    f"- **Admin Email:** {current_user.email if current_user else 'admin@eci.gov.in'}\n"
                    "- **Role:** `System Administrator / Electoral Commissioner`\n"
                    f"- **Ledger Oversight:** Managing #{block_count} blocks and {log_count} audit logs.\n\n"
                    "*As an administrator, you have oversight over aggregate system statistics, but individual secret ballots remain cryptographically sealed.*"
                ),
                tone="procedural",
                suggestedQuestions=[
                    "How to batch approve pending voters?",
                    "How do I manage elections and status transitions?",
                    "How does Observer Notary Consensus work?"
                ],
                referencedModules=["Admin Overview", "Voter Registry", "System Health"],
                userRole=role
            )
        elif current_user:
            # Query voter record for current authenticated user
            from app.db.models import Voter, VoterElectionState
            voter = db.query(Voter).filter((Voter.user_id == current_user.id) | (Voter.email == current_user.email)).first()
            if voter:
                voted_records = db.query(VoterElectionState).filter(VoterElectionState.voter_id == voter.id).all()
                participated_count = len(voted_records)
                approval_icon = "✅ Approved" if voter.approval == "approved" else f"⏳ {voter.approval.capitalize()}"
                aadhaar_info = f"XXXX-XXXX-{voter.aadhaar_last4} (Verified ✅)" if voter.aadhaar_last4 else "Not Linked / Pending ⏳"
                biometric_info = "Enrolled & Ready ✅" if voter.face_enrolled else "Pending Enrollment ⏳"
                voting_info = "Vote Recorded in Ledger ✅" if (voter.voting == "vote_recorded" or participated_count > 0) else "Eligible to Vote 🗳️"
                
                return ChatResponse(
                    answer=(
                        f"### 👤 Your Voter Profile & Official Records\n\n"
                        f"Here is your verified voter data retrieved from the electoral registry:\n\n"
                        f"- **Full Name:** `{voter.name}`\n"
                        f"- **Voter Identifier:** `{voter.id}`\n"
                        f"- **Registered Email:** `{voter.email}`\n"
                        f"- **Registered Mobile:** `{voter.mobile or 'Not registered'}`\n"
                        f"- **Registration Approval Status:** **{approval_icon}**\n"
                        f"- **Aadhaar e-KYC:** `{aadhaar_info}`\n"
                        f"- **Facial Biometrics:** `{biometric_info}`\n"
                        f"- **Participation History:** Cast ballots in **{participated_count}** election(s)\n"
                        f"- **Current Ballot State:** **{voting_info}**\n\n"
                        "> [!NOTE]\n"
                        "> Your identity details are protected under zero-knowledge privacy invariants. Your candidate selections are never linked to your voter ID on the public ledger."
                    ),
                    tone="procedural",
                    suggestedQuestions=[
                        "How do I vote step by step?",
                        "How does Aadhaar e-KYC work?",
                        "What is a VVPAT receipt?",
                        "Can an administrator see who I voted for?"
                    ],
                    referencedModules=["Voter Profile", "Voter Registry", "Aadhaar e-KYC", "Ballot State"],
                    userRole=role
                )
            else:
                return ChatResponse(
                    answer=(
                        f"### 👤 Your User Account\n\n"
                        f"- **Name:** `{current_user.name}`\n"
                        f"- **Email:** `{current_user.email}`\n"
                        f"- **Role:** `Voter`\n\n"
                        "Your voter profile is currently being initialized in the electoral registry. You can link your Aadhaar number via e-KYC to activate instant approval."
                    ),
                    tone="simple",
                    suggestedQuestions=["How does Aadhaar e-KYC work?", "How to register as a voter?"],
                    referencedModules=["Voter Dashboard", "Aadhaar e-KYC"],
                    userRole=role
                )
        else:
            return ChatResponse(
                answer=(
                    "### 👤 Voter Data Access Notice\n\n"
                    "To view your personal voter registration records, Aadhaar e-KYC status, and voting history, **please sign in to your voter account**.\n\n"
                    "Once signed in, you will be able to inspect your approval status, biometric readiness, and cryptographic VVPAT receipts anytime directly through this assistant!"
                ),
                tone="simple",
                suggestedQuestions=["How do I register as a voter?", "How does Aadhaar OTP work?", "Is voting secure?"],
                referencedModules=["Authentication", "Voter Registration"],
                userRole=role
            )

    # =========================================================================
    # 3. HINGLISH / BILINGUAL RESPONSES (ADAPTIVE TONE)
    # =========================================================================
    if tone == "bilingual":
        if is_admin:
            return ChatResponse(
                answer=(
                    "**SecureVote Admin Dashboard Guidelines:**\n\n"
                    "1. **Election Management (`/admin/elections`):** Naye elections banayein, start/end dates set karein, aur candidates ko nomination signs allot karein.\n"
                    "2. **Voter Approvals (`/admin/voters`):** Pending voter applications check karein ya 'Batch Approve All' par click karein.\n"
                    "3. **Blockchain Observer Consensus (`/admin/blockchain`):** 4 Constitutional Observer nodes (ECI, Judiciary, Alliance, CERT-In) ka live quorum inspect karein.\n"
                    "4. **Audit Trail Verification (`/admin/audit`):** 'Verify Chain Now' par click karke real-time SHA-256 hash chaining check karein."
                ),
                tone="bilingual",
                suggestedQuestions=["Election kaise create karein?", "Observer nodes kaise kaam karte hain?", "Audit chain kaise verify karein?"],
                referencedModules=["Admin Overview", "Election Manager", "Audit Trail"],
                userRole=role
            )
        else:
            return ChatResponse(
                answer=(
                    "**SecureVote me Vote dalna bilkul aasan aur 100% surakshit hai!**\n\n"
                    "1. **Register karein:** Apna 12-digit Aadhaar number daalkar OTP verify karein (instant approval milta hai).\n"
                    "2. **Face Biometric:** Camera ke saamne blink karein taaki facial liveness verify ho sake.\n"
                    "3. **Ballot Select karein:** Apne pasandida candidate aur unke Chunav Chinha (Sign) par tap karein.\n"
                    "4. **Blockchain Sealing:** Vote **AES-256 encryption** se lock hokar blockchain ledger me jud jata hai.\n"
                    "5. **VVPAT Receipt:** Aapko ek secret digital receipt milti hai jisse aap verify kar sakte hain ki aapka vote sahi gina gaya!"
                ),
                tone="bilingual",
                suggestedQuestions=["Kya admin vote badal sakta hai?", "Aadhaar OTP kaise kaam karta hai?", "VVPAT receipt kaise dekhein?"],
                referencedModules=["Aadhaar e-KYC", "Face Biometrics", "Blockchain Ledger", "VVPAT Receipt"],
                userRole=role
            )

    # =========================================================================
    # 4. ADMIN-SPECIFIC INQUIRIES (ONLY ACCESSIBLE TO ADMIN)
    # =========================================================================
    if is_admin and any(k in q for k in ["admin", "dashboard", "create election", "batch approve", "observer", "publish result"]):
        return ChatResponse(
            answer=(
                "### ⚙️ Administrator Operations & Electoral Governance\n\n"
                f"You are authenticated as an **Electoral Commission Administrator**. Current ledger height: **#{block_count} blocks**, with **{log_count} chained audit events**.\n\n"
                "1. **Election Lifecycle Management (`/admin/elections`)**:\n"
                "   - Create new elections with scheduled start/end timestamps.\n"
                "   - Transition election status: `draft` $\\rightarrow$ `scheduled` $\\rightarrow$ `voting_open` $\\rightarrow$ `voting_closed` $\\rightarrow$ `results_published`.\n\n"
                "2. **Candidate Nomination & Sign Allocation (`/admin/candidates`)**:\n"
                "   - Nominate candidates, allot recognized Indian Election Commission signs (e.g. 🪷 Lotus, ✋ Hand, 🌾 Corn & Sickle, 🐘 Elephant, 🚲 Bicycle) or select/upload official party icons from your device.\n\n"
                "3. **Voter Registry & Batch Approval (`/admin/voters`)**:\n"
                "   - Inspect registered voters and Aadhaar e-KYC status.\n"
                "   - Execute **'Batch Approve All'** to immediately clear pending manual registrations.\n\n"
                "4. **Multi-Party Observer Notary Quorum (`/admin/blockchain`)**:\n"
                "   - Monitor live consensus from the 4 external observer nodes (ECI, Supreme Court Judiciary, All-Party Alliance, CERT-In).\n\n"
                "5. **Audit Trail Verification (`/admin/audit`)**:\n"
                "   - Execute **'Verify Chain Now'** to cryptographically validate the continuous SHA-256 hash chains across all historical events."
            ),
            tone="procedural",
            suggestedQuestions=[
                "How does 'Verify Chain Now' detect tampering?",
                "How do Observer nodes reach consensus?",
                "How are election results computed and published?"
            ],
            referencedModules=["Admin Overview", "Election Manager", "Blockchain Explorer", "Audit Console"],
            userRole=role
        )

    # =========================================================================
    # 5. AADHAAR E-KYC & VERHOEFF ALGORITHM
    # =========================================================================
    if any(k in q for k in ["aadhaar", "uidai", "otp", "kyc", "verhoeff"]):
        if tone == "technical":
            return ChatResponse(
                answer=(
                    "### 🆔 UIDAI Aadhaar e-KYC & Mathematical Validation Engine\n\n"
                    "The Aadhaar sub-system eliminates administrative bottlenecks through instantaneous e-KYC verification:\n\n"
                    "1. **Verhoeff Dihedral Checksum Validation ($D_5$)**:\n"
                    "   - Validates the 12th check digit using dihedral group multiplication ($d$), permutation ($p$), and inverse ($inv$) matrices:\n"
                    "     $$c = \\sum_{i=0}^{n-1} d(c, p(i \\pmod 8, \\text{digit})) = 0$$\n"
                    "   - Mathematically detects **100% of single-digit transcription errors** and adjacent transpositions.\n\n"
                    "2. **Dynamic Cryptographic OTP Engine**:\n"
                    "   - Generated via CSPRNG `secrets.randbelow(900000) + 100000` with **300-second (5 min) TTL**.\n"
                    "   - Tracks attempt rate-limiting; locks session after 4 failed attempts.\n"
                    "   - Demo bypass code `123456` is enabled strictly for automated sandbox QA fixtures.\n\n"
                    "3. **Zero-Wait Auto-Approval**:\n"
                    "   - Verified Aadhaar numbers set `Voter.approval = 'approved'` instantly without manual admin intervention."
                ),
                tone="technical",
                suggestedQuestions=["How does Facial Liveness verification work?", "Where is Aadhaar number stored?", "Show audit logs for KYC"],
                referencedModules=["Verhoeff Algorithm", "FastAPI Voters Router", "Audit Trail"],
                userRole=role
            )
        else:
            return ChatResponse(
                answer=(
                    "### 🆔 How Aadhaar e-KYC Works in SecureVote\n\n"
                    "Traditionally, voter registration takes days because an admin must manually check documents. SecureVote makes it instant:\n\n"
                    "1. **Enter Aadhaar:** Enter your 12-digit number during registration.\n"
                    "2. **Instant OTP:** A secure 6-digit one-time passcode is generated and sent.\n"
                    "3. **Automatic Approval:** As soon as you enter the OTP, the system verifies your identity and **instantly approves** your profile so you can vote right away!\n"
                    "4. **Privacy:** Your full Aadhaar number is never stored in cleartext — only the masked suffix `XXXX-XXXX-1234` is kept."
                ),
                tone="simple",
                suggestedQuestions=["What if I mistype my Aadhaar number?", "How does face verification work?", "Can admin reject my vote?"],
                referencedModules=["Aadhaar e-KYC", "Instant Approval"],
                userRole=role
            )

    # =========================================================================
    # 6. FACIAL BIOMETRICS & LIVENESS DETECTION
    # =========================================================================
    if any(k in q for k in ["face", "biometric", "camera", "liveness", "spoof", "photo"]):
        if tone == "technical":
            return ChatResponse(
                answer=(
                    "### 👤 Facial Biometric Authentication & Liveness Detection\n\n"
                    "SecureVote protects against identity fraud and spoofing using dual-stage biometric verification:\n\n"
                    "1. **Client-Side Landmark Normalization**:\n"
                    "   - 468 3D facial landmarks are tracked in real-time via WebGL/MediaPipe.\n"
                    "   - Liveness heuristics evaluate: **Eye Blink Delta** (EAR < 0.2), **Head Yaw/Pitch Movement** ($> 15^\\circ$), and **Framing Proximity**.\n\n"
                    "2. **Zero-Knowledge Embedding Storage**:\n"
                    "   - Raw video frames are **never stored permanently**. Landmark vectors are hashed into a deterministic SHA-256 digest (`vector_hash`).\n\n"
                    "3. **Time-Limited Voting Authorization Session**:\n"
                    "   - A successful match issues a single-use JWT session token (`VOTE-SESS-{uuid4}`) valid for 15 minutes.\n"
                    "   - Once cast, the token is marked `is_spent = True` and immediately invalidated to prevent replay attacks."
                ),
                tone="technical",
                suggestedQuestions=["How is the ballot encrypted?", "What prevents double voting?", "Can an admin see my face photo?"],
                referencedModules=["MediaPipe Vision", "Face Router", "Voting Session Vault"],
                userRole=role
            )
        else:
            return ChatResponse(
                answer=(
                    "### 👤 How Face Biometrics Protect Your Vote\n\n"
                    "- **Prevents Impersonation:** Nobody else can vote in your name, even if they have your password.\n"
                    "- **Live Human Check:** The camera checks that you are a real living person in front of the screen (by asking you to blink or turn slightly) — static photos or screen replays are rejected.\n"
                    "- **Privacy First:** We don't store your raw video or photo. Only a secure mathematical fingerprint is kept.\n"
                    "- **Voting Token:** Passing face verification gives you a 15-minute secure pass to cast your confidential ballot."
                ),
                tone="simple",
                suggestedQuestions=["How do I cast my vote?", "Can someone vote twice?", "What is VVPAT receipt?"],
                referencedModules=["Face Biometrics", "Voting Session"],
                userRole=role
            )

    # =========================================================================
    # 7. BLOCKCHAIN LEDGER & OBSERVER CONSENSUS
    # =========================================================================
    if any(k in q for k in ["blockchain", "merkle", "block", "height", "ledger", "mining", "consensus", "observer"]):
        if tone == "technical":
            return ChatResponse(
                answer=(
                    f"### 🔗 SHA-256 Blockchain Ledger Architecture\n\n"
                    f"The immutable ledger currently contains **{block_count} mined blocks**:\n\n"
                    "1. **Block Header Structure**:\n"
                    "   $$\\text{Block Hash} = \\text{SHA-256}(\\text{Index} \\parallel \\text{PrevHash} \\parallel \\text{MerkleRoot} \\parallel \\text{Timestamp} \\parallel \\text{Nonce})$$\n\n"
                    "2. **Merkle Tree Inclusion Proofs**:\n"
                    "   - Transaction hashes are paired and recursively hashed in a binary tree:\n"
                    "     $$H_{parent} = \\text{SHA-256}(H_{left} + H_{right})$$\n"
                    "   - Produces a single 32-byte `merkle_root` anchoring all transactions in the block.\n\n"
                    "3. **Observer Multi-Notarization**:\n"
                    "   - Each block is cosigned using **RSA-4096-PSS** by 4 constitutional authorities: Election Commission (ECI), Supreme Court Judicial Council, All-Party Alliance, and CERT-In."
                ),
                tone="technical",
                suggestedQuestions=["How does the Audit Trail differ from Blockchain?", "What is VVPAT receipt?", "Can blocks be altered?"],
                referencedModules=["Blockchain Service", "Merkle Tree", "Observer Quorum"],
                userRole=role
            )
        else:
            return ChatResponse(
                answer=(
                    f"### 🔗 What is the Blockchain in SecureVote?\n\n"
                    f"Think of the blockchain as a **digital ledger carved into stone** (currently holding **{block_count} blocks**):\n\n"
                    "- **No Erasing:** Once a vote transaction is added to a block, nobody can delete or edit it.\n"
                    "- **Chained Links:** Each block contains a digital fingerprint of the previous block. If anyone touches an old vote, the whole chain breaks immediately and sets off alarms.\n"
                    "- **4 Independent Observers:** 4 separate watchdogs (including the Election Commission and Judiciary) certify every block before it is finalized."
                ),
                tone="simple",
                suggestedQuestions=["Can admin change my vote?", "How do I check my vote receipt?", "What is Merkle root?"],
                referencedModules=["Blockchain Explorer", "Observer Notary"],
                userRole=role
            )

    # =========================================================================
    # 8. CRYPTOGRAPHIC AUDIT TRAIL & TAMPER DETECTION
    # =========================================================================
    if any(k in q for k in ["audit", "chain", "tamper", "log", "trail", "integrity"]):
        return ChatResponse(
            answer=(
                f"### 🛡️ Continuous SHA-256 Hash-Chained Audit Trail\n\n"
                f"Every action across all 8 routers is recorded in the immutable audit log (currently **{log_count} records**):\n\n"
                "1. **Cryptographic Linkage**:\n"
                "   $$\\text{current\\_hash} = \\text{SHA-256}(\\text{prev\\_hash} \\parallel \\text{timestamp} \\parallel \\text{actor} \\parallel \\text{role} \\parallel \\text{action} \\parallel \\text{entity} \\parallel \\text{status} \\parallel \\text{ref})$$\n\n"
                "2. **Deterministic Monotonic Ordering**:\n"
                "   - Timestamps are strictly monotonic down to microseconds.\n"
                "   - Prevents race conditions during batch database operations.\n\n"
                "3. **Real-Time Verification (`/api/audit-logs/verify-chain`)**:\n"
                "   - Validates all forward hash pointers. Any alteration to SQLite database tables immediately triggers `integrity: 'compromised'`."
            ),
            tone="balanced",
            suggestedQuestions=["How does Observer Consensus work?", "What is AES-256 encryption?", "How does VVPAT receipt work?"],
            referencedModules=["Audit Core Engine", "SHA-256 Chaining", "Tamper Detection"],
            userRole=role
        )

    # =========================================================================
    # 9. VVPAT & BALLOT RECEIPTS
    # =========================================================================
    if any(k in q for k in ["vvpat", "receipt", "verify my vote", "proof", "tracking"]):
        return ChatResponse(
            answer=(
                "### 📜 Voter Verifiable Paper Audit Trail (VVPAT) & Receipt Verification\n\n"
                "When you cast a ballot, SecureVote issues an official **VVPAT Tracking Code** (e.g. `VVPAT-4F8A9B2C1D0E3F5A`):\n\n"
                "- **Cast-as-Intended Proof:** You can verify your vote on the public ledger anytime using your tracking code.\n"
                "- **Zero-Knowledge Secrecy:** The receipt proves inclusion on the blockchain, but **never reveals who you voted for**.\n"
                "- **Printable Audit Slip:** You can download a `.txt` receipt confirming your block height, transaction hash, and observer notary consensus."
            ),
            tone="balanced",
            suggestedQuestions=["How do I view my past votes?", "Can someone vote twice?", "How does blockchain work?"],
            referencedModules=["VVPAT Engine", "Public Ledger Verifier", "Votes Router"],
            userRole=role
        )

    # =========================================================================
    # 10. CANDIDATE SIGNS / ELECTION SYMBOLS
    # =========================================================================
    if any(k in q for k in ["symbol", "sign", "chinha", "candidate", "scales", "pillar"]):
        return ChatResponse(
            answer=(
                "### 🇮🇳 Candidate Election Symbols & Indian Party Icons\n\n"
                "- **Recognized Indian Party Symbols:** Candidates can be allotted official Election Commission signs such as 🪷 Lotus (कमल / BJP), ✋ Hand (हाथ / INC), 🌾 Corn & Sickle (हंसिया और गेहूं की बाली / CPI), 🐘 Elephant (हाथी / BSP), 🚲 Bicycle (साइकिल / SP), 🏹 Bow & Arrow (धनुष-बाण / Shiv Sena), 🕰️ Clock (घड़ी / NCP), 🚜 Tractor (ट्रैक्टर चलाता किसान), and 🦁 Lion Crest (सिंह).\n"
                "- **📁 Select from Device:** Administrators can also directly upload high-resolution party logos, seals, or emblems from their computer (PNG, JPG, SVG, WebP).\n"
                "- **Clear Identification:** Symbols and uploaded party badges are prominently displayed on Candidate Cards, the Ballot Screen, the Review Dialog, and Election Results."
            ),
            tone="balanced",
            suggestedQuestions=["How does ballot review work?", "How to vote step by step?", "How are results calculated?"],
            referencedModules=["Candidate Registry", "Ballot Cards", "Results Breakdown"],
            userRole=role
        )

    # =========================================================================
    # 11. STEP-BY-STEP VOTER GUIDE (FOR VOTERS / GUESTS)
    # =========================================================================
    if any(k in q for k in ["how to vote", "how voting works", "vote step", "steps to vote", "voting process", "guide", "voting works"]):
        guide_tone = tone if tone in ["simple", "security"] else "procedural"
        return ChatResponse(
            answer=(
                "### 🗳️ Step-by-Step Guide for Voters\n\n"
                "1. **Sign In:** Sign in with your registered email and password.\n"
                "2. **Select Election:** Navigate to active elections from your Voter Dashboard.\n"
                "3. **Choose Candidate:** Tap on your preferred candidate and their election symbol.\n"
                "4. **Review Selection:** Confirm your selection on the ballot review screen.\n"
                "5. **Facial Liveness Check:** Complete a quick facial verification (look into the camera and blink) to issue a secure 15-minute voting token.\n"
                "6. **Seal Ballot:** Your ballot is encrypted client-side with AES-256-GCM and written to the blockchain.\n"
                "7. **Receive VVPAT:** Download your cryptographic receipt or verify it on the public ledger!"
            ),
            tone=guide_tone,
            suggestedQuestions=["How does Aadhaar e-KYC work?", "Can an administrator see who I voted for?", "What is a VVPAT receipt?"],
            referencedModules=["Voter Dashboard", "Ballot Review", "Processing Screen", "VVPAT Success"],
            userRole=role
        )

    # =========================================================================
    # 12. DEFAULT WELCOME / OVERVIEW (ROLE-CUSTOMIZED)
    # =========================================================================
    if is_admin:
        return ChatResponse(
            answer=(
                "### ⚙️ SecureVote Trust — Administrator Governance AI\n\n"
                f"Welcome, Administrator. Currently monitoring **{active_elections} active elections**, **#{block_count} blocks**, and **{log_count} chained audit events**.\n\n"
                "- **Election Management:** Configure new elections and manage status transitions.\n"
                "- **Voter Approvals:** Review registries or execute batch approvals.\n"
                "- **Blockchain Explorer:** Inspect block heights, Merkle root digests, and Observer quorum.\n"
                "- **Audit Trail:** Execute continuous SHA-256 chain verification and export CSV audit logs."
            ),
            tone=tone if tone != "balanced" else "balanced",
            suggestedQuestions=[
                "How do I manage elections and status transitions?",
                "How to batch approve pending voters?",
                "How does 'Verify Chain Now' work on audit logs?",
                "How does Observer Notary Consensus work?"
            ],
            referencedModules=["Admin Overview", "Election Manager", "Blockchain Explorer", "Audit Console"],
            userRole=role
        )
    else:
        return ChatResponse(
            answer=(
                "### 🛡️ Welcome to SecureVote Trust — Zero-Trust Voting Assistant\n\n"
                "I am **Aegis AI**, here to assist you with everything related to your voting experience:\n\n"
                "- **🆔 Instant Registration:** Complete Aadhaar e-KYC in seconds with 6-digit OTP.\n"
                "- **👤 Biometric Face Liveness:** Verify identity live without storing raw photos.\n"
                "- **🔒 Secret Ballot:** Your vote is encrypted client-side with AES-256-GCM (Zero-Knowledge).\n"
                "- **📜 VVPAT Tracking:** Get a cryptographic receipt to verify your vote was included in the block.\n"
                "- **⚖️ Election Symbols:** Identify candidates by their official signs."
            ),
            tone=tone if tone != "balanced" else "balanced",
            suggestedQuestions=[
                "How do I vote step by step?",
                "How does Aadhaar e-KYC work?",
                "Can an administrator rig the election?",
                "How does the VVPAT receipt protect me?"
            ],
            referencedModules=["Voter Dashboard", "Aadhaar e-KYC", "Ballot Casting", "VVPAT Receipts"],
            userRole=role
        )

@router.post("/chat", response_model=ChatResponse)
def chat_with_system_assistant(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Intelligent role-aware conversational assistant endpoint.
    Strictly firewalls administrative login/controls from voters,
    and firewalls confidential voter ballots from administrators.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    # Determine authoritative role: JWT token takes precedence over client payload
    effective_role = current_user.role if current_user else (request.userRole or "guest").lower()
    if effective_role not in ["admin", "voter"]:
        effective_role = "guest"

    detected_tone = detect_query_tone(request.query)
    response = generate_role_based_response(request.query, detected_tone, effective_role, db, current_user)
    return response
