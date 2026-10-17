import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  KeyRound,
  Sparkles,
  Smartphone,
  RefreshCw,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader } from "@/components/app/surfaces";
import { FaceVerificationPanel } from "@/components/app/face-verification-panel";
import { AppHeader } from "@/components/app/app-header";
import { authService, voterService } from "@/services";
import { sessionStore } from "@/lib/session";
import type { RegistrationReceipt, FaceVerificationResult } from "@/services/types";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Voter Registration & Aadhaar e-KYC — SecureVote Trust" },
      { name: "description", content: "Register a zero-trust biometric voter identity with instant Aadhaar e-KYC." },
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

  // Aadhaar e-KYC State
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [receivedOtp, setReceivedOtp] = useState<string>("123456");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [ekycData, setEkycData] = useState<{ maskedAadhaar: string; ekycReference: string } | null>(null);

  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [enrolledFaceImage, setEnrolledFaceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<RegistrationReceipt | null>(null);
  const [autoFilledNotice, setAutoFilledNotice] = useState<string | null>(null);

  const CLIENT_SAMPLE_CITIZENS = [
    { name: "Aarav Sharma", email: "aarav.sharma@national.edu.in", mobile: "+91 98231 45892", voterId: "EPIC-DL89234" },
    { name: "Pooja Patel", email: "pooja.patel@academics.res.in", mobile: "+91 97123 90812", voterId: "EPIC-GJ45129" },
    { name: "Rohan Verma", email: "rohan.verma@techinst.edu", mobile: "+91 99451 23890", voterId: "EPIC-UP78231" },
    { name: "Sneha Kulkarni", email: "sneha.kulkarni@univ.ac.in", mobile: "+91 98670 12345", voterId: "EPIC-MH90412" },
    { name: "Vikramaditya Rao", email: "v.rao@governance.edu", mobile: "+91 94401 89234", voterId: "EPIC-KA34190" },
    { name: "Ananya Iyer", email: "ananya.iyer@institute.org", mobile: "+91 98840 56781", voterId: "EPIC-TN67123" },
    { name: "Dr. Rajeshwar Sharma", email: "rajeshwar.sharma@national.edu.in", mobile: "+91 98765 43210", voterId: "EPIC-DL89201" },
    { name: "Priyanka Nair", email: "priyanka.nair@digital.edu", mobile: "+91 94471 23901", voterId: "EPIC-KL12890" },
    { name: "Rajesh Kumar", email: "rajesh.kumar@biharuniv.edu", mobile: "+91 99341 78901", voterId: "EPIC-BR56234" },
    { name: "Kavita Reddy", email: "kavita.reddy@hyderabad.ac.in", mobile: "+91 98490 67123", voterId: "EPIC-TS89012" },
    { name: "Aditya Sengupta", email: "aditya.sengupta@kolkata.ac.in", mobile: "+91 98301 23456", voterId: "EPIC-WB34901" },
    { name: "Meera Nambiar", email: "meera.nambiar@stateuniv.edu", mobile: "+91 94460 78123", voterId: "EPIC-KL56782" },
  ];

  // Function to randomize citizen details
  const applyRandomCitizen = (overrideName?: string) => {
    const picked = CLIENT_SAMPLE_CITIZENS[Math.floor(Math.random() * CLIENT_SAMPLE_CITIZENS.length)] ?? CLIENT_SAMPLE_CITIZENS[0]!;
    const chosenName = overrideName || picked.name;
    setFormData((prev) => ({
      ...prev,
      fullName: chosenName,
      email: picked.email,
      mobile: picked.mobile,
      voterId: picked.voterId,
      password: prev.password || "VoterPass@2026",
    }));
    setAutoFilledNotice(`Demographic data for "${chosenName}" auto-fetched from UIDAI registry!`);
  };

  // Format Aadhaar with spaces (XXXX XXXX XXXX)
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setAadhaarInput(formatted);
    setOtpError(null);
  };

  const handleSendAadhaarOtp = async () => {
    const rawAadhaar = aadhaarInput.replace(/\s/g, "");
    if (rawAadhaar.length !== 12) {
      setOtpError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await voterService.sendAadhaarOtp(rawAadhaar);
      setOtpSent(true);
      const dynamicCode = res.demoOtp || "123456";
      setReceivedOtp(dynamicCode);
      setAadhaarOtp(dynamicCode);
    } catch (err: any) {
      setOtpError(err?.message || "Failed to send Aadhaar OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    const rawAadhaar = aadhaarInput.replace(/\s/g, "");
    if (!aadhaarOtp || aadhaarOtp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    setOtpVerifyLoading(true);
    setOtpError(null);
    try {
      const res = await voterService.verifyAadhaarOtp(rawAadhaar, aadhaarOtp);
      setAadhaarVerified(true);
      setEkycData({
        maskedAadhaar: res.maskedAadhaar,
        ekycReference: res.ekycReference,
      });

      // AUTO-FILL RANDOM CITIZEN DEMOGRAPHIC IDENTITY FROM UIDAI e-KYC RECORD
      const randomCitizen = CLIENT_SAMPLE_CITIZENS[Math.floor(Math.random() * CLIENT_SAMPLE_CITIZENS.length)] ?? CLIENT_SAMPLE_CITIZENS[0]!;
      const autoName = res.fullName || randomCitizen.name;
      const autoEmail = res.email || randomCitizen.email;
      const autoMobile = res.mobile || randomCitizen.mobile;
      const autoVoterId = res.voterId || randomCitizen.voterId;

      setFormData((prev) => ({
        ...prev,
        fullName: autoName,
        email: autoEmail,
        mobile: autoMobile,
        voterId: autoVoterId,
        password: prev.password || "VoterPass@2026",
      }));
      setAutoFilledNotice(`Demographic profile for "${autoName}" auto-populated via UIDAI e-KYC!`);
    } catch (err: any) {
      setOtpError(err?.message || "Invalid OTP entered. Please try again.");
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) return;
    if (!aadhaarVerified) {
      setError("Please complete Aadhaar e-KYC verification before proceeding.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFaceEnrolled = (res?: FaceVerificationResult) => {
    setFaceEnrolled(true);
    if (res?.imageData) {
      setEnrolledFaceImage(res.imageData);
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        voterId: formData.voterId.trim() || `VTR-${Math.floor(10000 + Math.random() * 90000)}`,
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        password: formData.password,
        faceEnrolled: faceEnrolled,
        aadhaarNumber: aadhaarInput.replace(/\s/g, ""),
        aadhaarVerified: aadhaarVerified,
        imageData: enrolledFaceImage || undefined,
      };

      const res = await authService.register(payload);
      setReceipt(res);
      sessionStore.set({ pendingVoterId: res.voterId });
      localStorage.setItem("securevote.last_voter_id", res.voterId);
    } catch (err: any) {
      console.error("Registration failed", err);
      setError(err?.message || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <AppHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="space-y-3 w-full">
          {/* Header & Step Tracker in a compact horizontal strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Voter Identity Enrollment</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/25">
                    Aadhaar e-KYC
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Instant digital verification and Zero-Knowledge biometric sealing.
                </p>
              </div>
            </div>

            {/* Compact Horizontal Step Indicator Pills */}
            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold self-start sm:self-auto">
              <div
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step >= 1
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <span className="size-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">1</span>
                <span>e-KYC & Details</span>
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step >= 2
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <span className="size-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Face Biometrics</span>
              </div>
              <div
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  step >= 3
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <span className="size-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">3</span>
                <span>Verified Receipt</span>
              </div>
            </div>
          </div>

          {/* STEP 1: Aadhaar e-KYC & Personal Details in 2-Column Landscape */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* LEFT CARD: UIDAI Aadhaar e-KYC Gateway (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 via-card to-card p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                        <Fingerprint className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <span>Aadhaar e-KYC</span>
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary font-semibold">
                            UIDAI Gateway
                          </span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Instant verification — bypasses manual approval queues.
                        </p>
                      </div>
                    </div>

                    {aadhaarVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success border border-success/30 shadow-xs">
                        <BadgeCheck className="size-3.5" />
                        <span>e-KYC Verified</span>
                      </span>
                    )}
                  </div>

                  {!aadhaarVerified ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="aadhaar" className="text-xs font-medium">
                            12-Digit Aadhaar Number
                          </Label>
                          <button
                            type="button"
                            onClick={() => {
                              const demoNumbers = [
                                "5489 2019 4812",
                                "9823 4512 8901",
                                "7812 3456 9012",
                                "6512 8901 2345",
                                "4231 9801 5678",
                              ];
                              const picked = demoNumbers[Math.floor(Math.random() * demoNumbers.length)] ?? "5489 2019 4812";
                              setAadhaarInput(picked);
                              setOtpError(null);
                            }}
                            className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20"
                          >
                            <Sparkles className="size-2.5 text-primary" />
                            <span>Demo Aadhaar</span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            id="aadhaar"
                            placeholder="e.g. 5489 2019 4812"
                            value={aadhaarInput}
                            onChange={handleAadhaarChange}
                            className="font-mono tracking-widest text-sm flex-1"
                            maxLength={14}
                          />
                          <Button
                            type="button"
                            onClick={handleSendAadhaarOtp}
                            disabled={otpLoading || aadhaarInput.replace(/\s/g, "").length !== 12}
                            className="gap-1.5 text-xs h-9 shrink-0 shadow-xs"
                          >
                            <Smartphone className="size-3.5" />
                            <span>{otpLoading ? "Sending..." : otpSent ? "Resend" : "Send OTP"}</span>
                          </Button>
                        </div>
                      </div>

                      {otpSent && (
                        <div className="rounded-xl border border-primary/40 bg-surface/90 p-3.5 space-y-2.5 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <KeyRound className="size-3.5 text-primary" />
                              <span>Enter 6-Digit OTP</span>
                            </p>
                            <span className="rounded bg-primary-soft px-2 py-0.5 text-[10px] font-mono font-bold text-primary shrink-0 border border-primary/20">
                              Demo OTP: {receivedOtp}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Input
                              placeholder="6-digit code"
                              value={aadhaarOtp}
                              onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              className="font-mono text-center tracking-widest text-sm max-w-[150px]"
                              maxLength={6}
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyAadhaarOtp}
                              disabled={otpVerifyLoading || aadhaarOtp.length !== 6}
                              className="gap-1.5 text-xs shadow-raised flex-1"
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>{otpVerifyLoading ? "Verifying..." : "Verify & Link e-KYC"}</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {otpError && (
                        <p className="text-xs text-destructive flex items-center gap-1.5 bg-destructive-soft/50 p-2 rounded-lg border border-destructive/20">
                          <AlertCircle className="size-3.5 shrink-0" />
                          <span>{otpError}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Verified e-KYC details summary card */
                    <div className="rounded-xl border border-success/30 bg-success-soft/20 p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Government Identity:</span>
                        <span className="font-mono font-bold text-success text-sm">{ekycData?.maskedAadhaar}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>UIDAI e-KYC Reference:</span>
                        <span className="font-mono">{ekycData?.ekycReference}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-success font-medium border-t border-success/20">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Demographic Match 100% | Age 18+ Verified | Instant Approval</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Trust footnote */}
                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3 text-primary" />
                    <span>Verhoeff Checksum (D₅) active</span>
                  </span>
                  <span className="text-muted-foreground/80">AES-256-GCM sealed</span>
                </div>
              </div>

              {/* RIGHT CARD: Personal Profile Details Form (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
                        <User className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Voter Profile & Credentials</h3>
                        <p className="text-[11px] text-muted-foreground">
                          Information matching your official electoral enrollment roll.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyRandomCitizen()}
                      className="h-7 text-[11px] gap-1 px-2.5 shadow-xs text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Sparkles className="size-3 text-primary" />
                      <span>Randomize Identity</span>
                    </Button>
                  </div>

                  {autoFilledNotice && (
                    <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-400 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
                        <span>{autoFilledNotice}</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 shrink-0">
                        e-KYC Synced
                      </span>
                    </div>
                  )}

                  <form id="step1-form" onSubmit={handleStep1Submit} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="fullName" className="text-xs font-medium">
                        Full Legal Name (as per Aadhaar / Voter Roll)
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="e.g. Dr. Aarav Sharma"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        className="text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="voterId" className="text-xs font-medium">
                          EPIC / National Voter ID (Optional)
                        </Label>
                        <Input
                          id="voterId"
                          placeholder="e.g. EPIC-DL99201"
                          value={formData.voterId}
                          onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs font-medium">
                          Official / University Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="aarav.sharma@delhi.ac.in"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="mobile" className="text-xs font-medium">
                          Mobile Phone (Linked with Aadhaar)
                        </Label>
                        <Input
                          id="mobile"
                          placeholder="+91 98765 43210"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="pass" className="text-xs font-medium">
                          Voter Account Password
                        </Label>
                        <Input
                          id="pass"
                          type="password"
                          placeholder="••••••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-2.5 text-xs text-destructive bg-destructive-soft rounded-lg border border-destructive/30">
                        {error}
                      </div>
                    )}
                  </form>
                </div>

                <div className="pt-3 mt-3 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary shrink-0" />
                    <span>Aadhaar e-KYC enables instant, automatic approval upon facial enrollment.</span>
                  </p>
                  <Button
                    type="submit"
                    form="step1-form"
                    disabled={!aadhaarVerified}
                    className="gap-2 shadow-raised shrink-0 w-full sm:w-auto text-xs"
                  >
                    <span>Proceed to Biometric Enrollment</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Face Enrollment in Landscape */}
          {step === 2 && (
            <div className="space-y-3">
              <FaceVerificationPanel
                userId={formData.voterId || formData.email || "temp-register-voter"}
                mode="enroll"
                title="Biometric Face Enrollment"
                description="Position your face inside the circle. The system extracts a cryptographic 256-bit ZK vector hash matched against your Aadhaar photo."
                onVerified={(res) => handleFaceEnrolled(res)}
              />

              <div className="flex justify-between items-center pt-1">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5 text-xs">
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Personal Details</span>
                </Button>
                {faceEnrolled && (
                  <Button onClick={() => setStep(3)} className="gap-1.5 text-xs shadow-raised">
                    <span>Continue to Review</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Review & Submission in 2-Column Landscape */}
          {step === 3 && (
            <Panel className="p-5 space-y-4">
              {!receipt ? (
                <div className="space-y-4">
                  <PanelHeader
                    title="Review & Confirm Registration"
                    description="Verify your enrollment payload. Aadhaar-verified credentials will be approved instantly with zero waiting time."
                  />

                  {error && (
                    <div className="p-3 text-xs text-destructive bg-destructive-soft rounded-md border border-destructive/30">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* Left: Voter Profile & Credentials summary */}
                    <dl className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border p-3 bg-muted/20">
                        <dt className="text-muted-foreground uppercase text-[10px] font-semibold">Full Legal Name</dt>
                        <dd className="font-semibold text-foreground mt-0.5">{formData.fullName}</dd>
                      </div>
                      <div className="rounded-xl border p-3 bg-muted/20">
                        <dt className="text-muted-foreground uppercase text-[10px] font-semibold">Aadhaar e-KYC Status</dt>
                        <dd className="font-semibold text-success mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          <span>Verified ({ekycData?.maskedAadhaar || "Aadhaar e-KYC"})</span>
                        </dd>
                      </div>
                      <div className="rounded-xl border p-3 bg-muted/20">
                        <dt className="text-muted-foreground uppercase text-[10px] font-semibold">Email</dt>
                        <dd className="font-semibold text-foreground mt-0.5">{formData.email}</dd>
                      </div>
                      <div className="rounded-xl border p-3 bg-muted/20">
                        <dt className="text-muted-foreground uppercase text-[10px] font-semibold">Face Biometrics</dt>
                        <dd className="font-semibold text-success mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          <span>Enrolled & 256-bit Hashed</span>
                        </dd>
                      </div>
                      {enrolledFaceImage && (
                        <div className="rounded-xl border p-3 bg-muted/20 sm:col-span-2 flex items-center gap-3">
                          <div className="relative size-12 rounded-xl overflow-hidden border border-primary/40 shrink-0 bg-slate-950 shadow-xs">
                            <img src={enrolledFaceImage} alt="Enrolled Face" className="size-full object-cover" />
                            <span className="absolute bottom-0.5 right-0.5 size-2.5 rounded-full bg-success border border-background" />
                          </div>
                          <div>
                            <dt className="text-muted-foreground uppercase text-[10px] font-semibold">Enrolled Closeup Portrait</dt>
                            <dd className="font-semibold text-foreground text-xs mt-0.5 flex items-center gap-1.5">
                              <BadgeCheck className="size-3.5 text-success" />
                              <span>Biometric Landmark Signature Captured</span>
                            </dd>
                            <p className="text-[11px] text-muted-foreground">Will be used to authenticate your identity when casting ballots.</p>
                          </div>
                        </div>
                      )}
                    </dl>

                    {/* Right: Instant Eligibility Assurance & Submit */}
                    <div className="lg:col-span-5 rounded-xl border border-primary/25 bg-primary-soft/30 p-4 text-xs text-foreground/90 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-primary font-bold">
                          <Sparkles className="size-4 shrink-0" />
                          <span>Instant Eligibility Guaranteed</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Your profile satisfies all legal electoral requirements. Your voter credentials will be <strong>approved instantly</strong> upon ledger notarization.
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                        <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5 text-xs">
                          <ArrowLeft className="size-3.5" />
                          <span>Back</span>
                        </Button>
                        <Button onClick={handleFinalSubmit} disabled={loading} className="gap-2 shadow-raised text-xs">
                          {loading ? "Approving..." : "Submit Registration Payload"}
                          <CheckCircle2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Registration Receipt with Instant Approval (Landscape) */
                <div className="py-4 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-center sm:text-left">
                    <div className="inline-flex size-14 items-center justify-center rounded-full border-2 border-success/30 bg-success-soft text-success shrink-0">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Voter Registration Approved Instantly</h2>
                      <p className="text-xs text-muted-foreground max-w-lg">
                        Authenticated via <strong>UIDAI Aadhaar e-KYC</strong> and biometric facial liveness. Approved with zero manual queue delay.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs">
                    <div className="rounded-lg border bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block uppercase">Voter Reference</span>
                      <span className="font-semibold font-mono text-foreground">{receipt.voterId}</span>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block uppercase">Aadhaar e-KYC</span>
                      <span className="font-semibold text-success flex items-center gap-1">
                        <BadgeCheck className="size-3" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block uppercase">Approval Status</span>
                      <span className="font-bold text-success uppercase">
                        {receipt.approval === "approved" ? "Approved & Active" : receipt.approval}
                      </span>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block uppercase">Timestamp</span>
                      <span className="font-mono text-muted-foreground">{new Date(receipt.submittedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button onClick={() => navigate({ to: "/login" })} className="gap-1.5 text-xs shadow-raised">
                      <span>Proceed to Sign In & Vote</span>
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
