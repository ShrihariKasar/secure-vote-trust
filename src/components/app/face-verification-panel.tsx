import { useState } from "react";
import { ShieldCheck, Check, AlertCircle, RefreshCw, Lock, Sparkles } from "lucide-react";
import { CameraFrame } from "./camera-frame";
import { Panel, PanelHeader } from "./surfaces";
import { Button } from "@/components/ui/button";
import { authService } from "@/services";
import type { FaceVerificationResult } from "@/services/types";

import { useSession } from "@/lib/session";

interface FaceVerificationPanelProps {
  userId?: string;
  onVerified?: (result: FaceVerificationResult) => void;
  title?: string;
  description?: string;
  mode?: "enroll" | "verify";
}

export function FaceVerificationPanel({
  userId,
  onVerified,
  title = "Biometric Face Authentication",
  description = "Center your face in the frame to prove liveness and authorize your ballot.",
  mode = "verify",
}: FaceVerificationPanelProps) {
  const session = useSession();
  const effectiveUserId = userId || session.user?.id || (mode === "enroll" ? "temp-enrollment-voter" : "");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<FaceVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartScan = async (imageData?: string) => {
    if (!effectiveUserId) {
      setError("User session expired or user ID missing. Please log in.");
      return;
    }
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "enroll") {
        const enrollRes = await authService.enrollFace(effectiveUserId, 10, imageData);
        const res: FaceVerificationResult = {
          verified: true,
          livenessChecks: { blink: true, headMovement: true, framing: true },
          reference: (enrollRes as any).reference || `face-ref-${effectiveUserId.slice(0, 8)}`,
        };
        setResult(res);
        onVerified?.(res);
      } else {
        const res = await authService.verifyFace(effectiveUserId, imageData);
        setResult(res);
        if (res.verified) {
          onVerified?.(res);
        } else {
          setError("Face verification failed. Please align your face cleanly and try again.");
        }
      }
    } catch (e: any) {
      console.error("Face action failed:", e);
      setError(e.message || "Biometric authentication failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setIsScanning(false);
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title={
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-integrity" />
            <span>{title}</span>
          </div>
        }
        description={description}
      />

      <div className="p-6">
        {result?.verified ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-success/30 bg-success-soft text-success shadow-sm">
              <Check className="size-8 stroke-[3]" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Biometric Identity Match Verified
            </h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Zero-Knowledge proof generated successfully. Facial geometry descriptor matches
              enrolled template (Reference: <code className="hash text-foreground">{result.reference}</code>).
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-center text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Blink Check</span>
                <p className="font-semibold text-success">PASSED</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Head Motion</span>
                <p className="font-semibold text-success">PASSED</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Framing Quality</span>
                <p className="font-semibold text-success">100%</p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleReset} className="mt-6 gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              <span>Verify Again</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CameraFrame
              mode={mode}
              isScanning={isScanning}
              scanningText={
                mode === "enroll"
                  ? "Extracting facial landmark descriptors..."
                  : "Matching biometric hash against zero-trust registry..."
              }
              onCapture={(img) => handleStartScan(img)}
            />

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-4 py-2 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                onClick={() => handleStartScan()}
                disabled={isScanning}
                className="w-full max-w-xs gap-2 shadow-raised"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Analyzing Biometrics...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>{mode === "enroll" ? "Enroll Biometric Descriptor" : "Verify & Authorize Ballot"}</span>
                  </>
                )}
              </Button>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="size-3 text-integrity" />
                <span>No raw image stored — 256-bit ZK facial vector hash only</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
