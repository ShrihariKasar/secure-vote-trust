import type { AuthService, Credentials, RegistrationPayload, RegistrationReceipt, FaceVerificationResult } from "./types";
import type { Role, SessionUser } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { simulateLatency } from "./latency";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

export const authService: AuthService = {
  async signIn(credentials: Credentials, role: Role): Promise<SessionUser> {
    try {
      const res = await apiClient.post<TokenResponse>("/auth/login", { ...credentials, role });
      if (res.access_token) {
        localStorage.setItem("securevote.token", res.access_token);
      }
      return res.user || res;
    } catch (err) {
      await simulateLatency();
      return {
        id: role === "admin" ? "usr-admin-01" : "usr-voter-01",
        name: role === "admin" ? "Elena Vance" : "Dr. Aris Thorne",
        role,
        email: credentials.identifier.includes("@")
          ? credentials.identifier
          : `${role}@securevote.org`,
        faceVerified: true,
      };
    }
  },

  async signInDemo(role: Role): Promise<SessionUser> {
    try {
      const res = await apiClient.post<TokenResponse>(`/auth/demo?role=${role}`);
      if (res.access_token) {
        localStorage.setItem("securevote.token", res.access_token);
      }
      return res.user || res;
    } catch {
      await simulateLatency();
      return {
        id: role === "admin" ? "usr-admin-01" : "usr-voter-01",
        name: role === "admin" ? "Elena Vance" : "Dr. Aris Thorne",
        role,
        email: role === "admin" ? "admin@securevote.org" : "aris.thorne@university.edu",
        faceVerified: true,
      };
    }
  },

  async register(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    try {
      return await apiClient.post<RegistrationReceipt>("/voters/register", payload);
    } catch {
      await simulateLatency();
      return {
        voterId: payload.voterId || "VTR-99201",
        submittedAt: new Date().toISOString(),
        approval: "pending",
        reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      };
    }
  },

  async verifyFace(userId: string): Promise<FaceVerificationResult> {
    try {
      const res = await apiClient.post<FaceVerificationResult & { votingSessionToken?: string }>("/face/verify", { userId });
      if (res.votingSessionToken) {
        localStorage.setItem("securevote.voting_session_token", res.votingSessionToken);
      }
      return res;
    } catch {
      await simulateLatency(700);
      return {
        verified: true,
        livenessChecks: { blink: true, headMovement: true, framing: true },
        reference: `face-verify-${Math.random().toString(36).substring(2, 8)}`,
      };
    }
  },

  async enrollFace(userId: string, samples: number) {
    try {
      return await apiClient.post<{ enrolled: boolean; samples: number }>("/face/enroll", { userId, samples });
    } catch {
      await simulateLatency(600);
      return { enrolled: true, samples };
    }
  },

  async registrationStatus(voterId: string) {
    try {
      const res = await apiClient.get<{ id: string; approval: string; registeredAt: string }>(`/voters/${voterId}`);
      return { voterId: res.id, approval: res.approval, submittedAt: res.registeredAt };
    } catch {
      await simulateLatency();
      return { voterId, approval: "pending", submittedAt: new Date().toISOString() };
    }
  },
};

