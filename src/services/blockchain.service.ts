import type { BlockchainService } from "./types";
import type { Block, VoteTransaction } from "@/types";
import { apiClient } from "@/lib/apiClient";

export const blockchainService: BlockchainService = {
  async listBlocks(): Promise<Block[]> {
    return await apiClient.get<Block[]>("/blockchain/blocks");
  },

  async stats() {
    return await apiClient.get<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>("/blockchain/stats");
  },

  async getTransaction(id: string): Promise<VoteTransaction | null> {
    try {
      return await apiClient.get<VoteTransaction>(`/blockchain/transactions/${id}`);
    } catch {
      return null;
    }
  },

  async verifyTransaction(id: string) {
    return await apiClient.get<{ verified: boolean; signatureValid: boolean }>(`/blockchain/verify/${id}`);
  },
};
