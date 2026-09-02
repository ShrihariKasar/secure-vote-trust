import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader } from "@/components/app/surfaces";
import { FaceVerificationPanel } from "@/components/app/face-verification-panel";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/voter/elections/$id/verify")({
  head: () => ({
    meta: [
      { title: "Biometric Authentication — SecureVote Trust" },
      { name: "description", content: "Authorize ballot using face liveness biometric match." },
    ],
  }),
  component: BiometricVerifyPage,
});

function BiometricVerifyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();

  const handleVerified = () => {
    // Proceed to processing screen after 1.2s delay for seamless UX transition
    setTimeout(() => {
      navigate({ to: `/voter/elections/${id}/processing` as any });
    }, 1200);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: `/voter/elections/${id}/review` as any })} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to Ballot Review</span>
        </Button>

        <PageHeader
          title="Step 2 of 3: Biometric Ballot Authorization"
          description="Face biometric authentication seals your zero-knowledge ballot and verifies liveness before ledger broadcast."
        />

        <FaceVerificationPanel
          userId={session.user?.id || "usr-voter-01"}
          onVerified={handleVerified}
          title="Biometric Face Signature Gate"
          description="Center your face in the sensor frame below."
        />
      </div>
    </AppLayout>
  );
}
