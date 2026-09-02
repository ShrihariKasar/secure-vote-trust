import { blocks as seed, sampleTransaction } from "@/mocks/data";
import { clone, delay } from "./latency";
import type { BlockchainService } from "./types";

export const blockchainService: BlockchainService = {
  async listBlocks() {
    return delay(clone(seed));
  },
  async stats() {
    return delay({
      total: seed.length,
      verified: seed.filter((b) => b.verified).length,
      latest: seed[seed.length - 1].index,
      integrity: "verified" as const,
    });
  },
  async getTransaction(id) {
    if (id === sampleTransaction.transactionId) return delay(clone(sampleTransaction));
    return delay(null);
  },
  async verifyTransaction() {
    return delay({ verified: true, signatureValid: true }, 700);
  },
};
