import { voters } from "@/mocks/data";
import type { Role, SessionUser } from "@/types";
import { delay } from "./latency";
import type { AuthService } from "./types";

const DEMO_VOTER: SessionUser = {
  id: "VTR-1043",
  name: "Harsh Vardhan",
  role: "voter",
  email: "harsh.vardhan@campus.edu",
  faceVerified: false,
};

const DEMO_ADMIN: SessionUser = {
  id: "ADM-001",
  name: "Priyanka Rege",
  role: "admin",
  email: "priyanka.rege@campus.edu",
  faceVerified: true,
};

export const authService: AuthService = {
  async signIn({ identifier, password }, role) {
    if (password.length < 6) {
      throw new Error("The credentials entered do not match our records.");
    }
    if (role === "admin") {
      return delay({ ...DEMO_ADMIN, id: identifier.toUpperCase() || DEMO_ADMIN.id }, 600);
    }
    const match = voters.find((v) => v.id.toLowerCase() === identifier.trim().toLowerCase());
    if (!match) {
      return delay(DEMO_VOTER, 600);
    }
    if (match.approval !== "approved") {
      await delay(null, 500);
      throw new Error(`Voter record ${match.id} is ${match.approval}. Sign-in is not available yet.`);
    }
    return delay(
      { id: match.id, name: match.name, role: "voter" as Role, email: match.email, faceVerified: false },
      600,
    );
  },

  async signInDemo(role) {
    return delay(role === "admin" ? { ...DEMO_ADMIN } : { ...DEMO_VOTER }, 350);
  },

  async register(payload) {
    return delay(
      {
        voterId: payload.voterId,
        submittedAt: new Date().toISOString(),
        approval: "pending" as const,
        reference: `REG-${payload.voterId.replace(/\D/g, "").slice(-4) || "0000"}`,
      },
      700,
    );
  },

  async verifyFace(userId) {
    return delay(
      {
        verified: true,
        livenessChecks: { blink: true, headMovement: true, framing: true },
        reference: `AUTH-${9200 + (userId.length % 90)}`,
      },
      400,
    );
  },

  async enrollFace(_userId, samples) {
    return delay({ enrolled: true, samples }, 500);
  },

  async registrationStatus(voterId) {
    const match = voters.find((v) => v.id === voterId);
    return delay({
      voterId,
      approval: match?.approval ?? "pending",
      submittedAt: match?.registeredAt ?? new Date().toISOString(),
    });
  },
};
