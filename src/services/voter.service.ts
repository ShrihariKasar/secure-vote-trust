import type { VoterService } from "./types";
import type { Voter } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const voterService: VoterService = {
  async list(): Promise<Voter[]> {
    return await apiClient.get<Voter[]>("/admin/voters");
  },

  async get(id: string): Promise<Voter | undefined> {
    try {
      return await apiClient.get<Voter>(`/voters/${id}`);
    } catch {
      return undefined;
    }
  },

  async setApproval(id: string, approval: Voter["approval"]): Promise<Voter> {
    return await apiClient.patch<Voter>(`/admin/voters/${id}/approve`, { approval });
  },

  async batchApprove(): Promise<{ success: boolean; approvedCount: number }> {
    return await apiClient.post<{ success: boolean; approvedCount: number }>("/admin/voters/batch-approve", { approveAllPending: true });
  },

  async sendAadhaarOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string; maskedAadhaar: string; demoOtp: string }> {
    return await apiClient.post<{ success: boolean; message: string; maskedAadhaar: string; demoOtp: string }>("/voters/aadhaar/send-otp", { aadhaarNumber });
  },

  async verifyAadhaarOtp(aadhaarNumber: string, otp: string): Promise<{
    verified: boolean;
    ekycReference: string;
    maskedAadhaar: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    voterId?: string;
  }> {
    return await apiClient.post<{
      verified: boolean;
      ekycReference: string;
      maskedAadhaar: string;
      fullName?: string;
      email?: string;
      mobile?: string;
      voterId?: string;
    }>("/voters/aadhaar/verify-otp", { aadhaarNumber, otp });
  },
};
