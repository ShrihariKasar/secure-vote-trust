import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, User, Mail, Phone, Lock, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader } from "@/components/app/surfaces";
import { FaceVerificationPanel } from "@/components/app/face-verification-panel";
import { AppHeader } from "@/components/app/app-header";
import { authService } from "@/services";
import { sessionStore } from "@/lib/session";
import type { RegistrationReceipt } from "@/services/types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Voter Registration — SecureVote Trust" },
      { name: "description", content: "Register a zero-trust biometric voter identity." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    fullName: "",
    voterId: "",
    email: "",
    mobile: "",
    password: "",
  });
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<RegistrationReceipt | null>(null);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) return;
    setStep(2);
  };

  const handleFaceEnrolled = () => {
    setFaceEnrolled(true);
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName || "Demo Voter",
        voterId: formData.voterId || `VTR-${Math.floor(10000 + Math.random() * 90000)}`,
        email: formData.email || "voter@example.edu",
        mobile: formData.mobile || "+1 (555) 234-5678",
        password: formData.password || "password",
        faceEnrolled: true,
      };

      const res = await authService.register(payload);
      setReceipt(res);
      sessionStore.set({ pendingVoterId: res.voterId });
    } catch (err) {
      console.error("Registration failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-integrity text-integrity-foreground shadow-sm">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Voter Identity Enrollment</h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Complete multi-factor enrollment to issue your Zero-Knowledge electoral voting credentials.
            </p>
          </div>

          {/* Progress Step Bar */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className={`p-2.5 rounded-lg border ${step >= 1 ? "border-integrity bg-integrity-soft text-integrity" : "border-border text-muted-foreground"}`}>
              1. Personal Info
            </div>
            <div className={`p-2.5 rounded-lg border ${step >= 2 ? "border-integrity bg-integrity-soft text-integrity" : "border-border text-muted-foreground"}`}>
              2. Face Biometrics
            </div>
            <div className={`p-2.5 rounded-lg border ${step >= 3 ? "border-integrity bg-integrity-soft text-integrity" : "border-border text-muted-foreground"}`}>
              3. Verification Receipt
            </div>
          </div>

          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <Panel className="p-6">
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Full Legal Name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Dr. Aris Thorne"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="voterId" className="text-xs">National Voter ID / Student No.</Label>
                    <Input
                      id="voterId"
                      placeholder="e.g. VTR-99201"
                      value={formData.voterId}
                      onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="aris.thorne@university.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs">Mobile Phone (2FA)</Label>
                    <Input
                      id="mobile"
                      placeholder="+1 (555) 019-2834"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pass" className="text-xs">Account Password</Label>
                    <Input
                      id="pass"
                      type="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" className="gap-2">
                    <span>Proceed to Biometric Enrollment</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </form>
            </Panel>
          )}

          {/* STEP 2: Face Enrollment */}
          {step === 2 && (
            <div className="space-y-4">
              <FaceVerificationPanel
                mode="enroll"
                title="Biometric Face Enrollment"
                description="Position your face inside the circle. The system extracts a cryptographic 256-bit ZK vector hash."
                onVerified={() => handleFaceEnrolled()}
              />

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5 text-xs">
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Personal Details</span>
                </Button>
                <Button onClick={() => handleFaceEnrolled()} className="gap-1.5 text-xs">
                  <span>Skip / Auto-Enroll Demo Sample</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submission */}
          {step === 3 && (
            <Panel className="p-6 space-y-6">
              {!receipt ? (
                <div className="space-y-6">
                  <PanelHeader
                    title="Review & Confirm Registration"
                    description="Verify your enrollment payload before submitting to the election committee approval queue."
                  />

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-lg border p-3">
                      <dt className="text-muted-foreground uppercase text-[10px]">Full Name</dt>
                      <dd className="font-semibold text-foreground mt-0.5">{formData.fullName || "Dr. Aris Thorne"}</dd>
                    </div>
                    <div className="rounded-lg border p-3">
                      <dt className="text-muted-foreground uppercase text-[10px]">Voter ID</dt>
                      <dd className="font-semibold text-foreground mt-0.5">{formData.voterId || "VTR-99201"}</dd>
                    </div>
                    <div className="rounded-lg border p-3">
                      <dt className="text-muted-foreground uppercase text-[10px]">Email</dt>
                      <dd className="font-semibold text-foreground mt-0.5">{formData.email || "aris.thorne@university.edu"}</dd>
                    </div>
                    <div className="rounded-lg border p-3">
                      <dt className="text-muted-foreground uppercase text-[10px]">Face Biometrics</dt>
                      <dd className="font-semibold text-success mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        <span>Enrolled & Hashed</span>
                      </dd>
                    </div>
                  </dl>

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 text-xs">
                      <ArrowLeft className="size-3.5" />
                      <span>Back to Face Verification</span>
                    </Button>
                    <Button onClick={handleFinalSubmit} disabled={loading} className="gap-2 shadow-raised">
                      {loading ? "Submitting Application..." : "Submit Registration Payload"}
                      <CheckCircle2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Registration Receipt */
                <div className="text-center py-6 space-y-4">
                  <div className="inline-flex size-14 items-center justify-center rounded-full border-2 border-warning/30 bg-warning-soft text-warning">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Application Submitted Successfully</h2>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Your voter registration payload has been logged to the election committee queue under reference{" "}
                    <code className="hash text-foreground">{receipt.reference}</code>.
                  </p>

                  <div className="rounded-lg border border-border bg-muted/30 p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Voter Reference:</span>
                      <span className="font-semibold">{receipt.voterId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approval Status:</span>
                      <span className="font-semibold text-warning">Pending Review</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="font-mono">{new Date(receipt.submittedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center gap-3">
                    <Button onClick={() => navigate({ to: "/pending-approval" })} className="gap-1.5 text-xs">
                      <span>Check Approval Status</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}
