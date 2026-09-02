import type { BlockchainService } from "./types";
import type { Block, VoteTransaction } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { blocks, sampleTransaction } from "@/mocks/data";
import { simulateLatency } from "./latency";

export const blockchainService: BlockchainService = {
  async listBlocks(): Promise<Block[]> {
    try {
      return await apiClient.get<Block[]>("/blockchain/blocks");
    } catch {
      await simulateLatency();
      return blocks;
    }
  },

  async stats() {
    try {
      return await apiClient.get<{ total: number; verified: number; latest: number; integrity: "verified" | "compromised" }>("/blockchain/stats");
    } catch {
      await simulateLatency();
      return { total: blocks.length, verified: blocks.length, latest: 7, integrity: "verified" as const };
    }
  },

  async getTransaction(id: string): Promise<VoteTransaction | null> {
    try {
      return await apiClient.get<VoteTransaction>(`/blockchain/transactions/${id}`);
    } catch {
      await simulateLatency();
      return sampleTransaction.transactionId === id ? sampleTransaction : null;
    }
  },

  async verifyTransaction(id: string) {
    try {
      return await apiClient.get<{ verified: boolean; signatureValid: boolean }>(`/blockchain/verify/${id}`);
    } catch {
      await simulateLatency();
      return { verified: true, signatureValid: true };
    }
  },
};

