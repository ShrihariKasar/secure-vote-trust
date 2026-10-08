import type { AuthService, Credentials, RegistrationPayload, RegistrationReceipt, FaceVerificationResult } from "./types";
import type { Role, SessionUser } from "@/types";
import { apiClient } from "@/lib/apiClient";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

export const authService: AuthService = {
  async signIn(credentials: Credentials, role: Role): Promise<SessionUser> {
    const res = await apiClient.post<TokenResponse>("/auth/login", { ...credentials, role });
    if (res.access_token) {
      localStorage.setItem("securevote.token", res.access_token);
    }
    return res.user;
  },

  async register(payload: RegistrationPayload): Promise<RegistrationReceipt> {
    return await apiClient.post<RegistrationReceipt>("/voters/register", payload);
  },

  async verifyFace(userId: string, imageData?: string): Promise<FaceVerificationResult> {
    const res = await apiClient.post<FaceVerificationResult & { votingSessionToken?: string }>("/face/verify", {
      userId,
      imageData,
    });
    if (res.votingSessionToken) {
      localStorage.setItem("securevote.voting_session_token", res.votingSessionToken);
    }
    return res;
  },

  async enrollFace(userId: string, samples: number, imageData?: string) {
    return await apiClient.post<{ enrolled: boolean; samples: number }>("/face/enroll", {
      userId,
      samples,
      imageData,
    });
  },

  async registrationStatus(voterId: string) {
    const res = await apiClient.get<{ id: string; approval: string; registeredAt: string }>(`/voters/${voterId}`);
    return { voterId: res.id, approval: res.approval, submittedAt: res.registeredAt };
  },
};
