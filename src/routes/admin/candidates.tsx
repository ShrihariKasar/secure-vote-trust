import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Users, Plus, Trash2, UserPlus, FileText, Vote, Upload, Image as ImageIcon, Sparkles, Laptop, X, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { LoadingState, EmptyState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CandidatePartySymbol } from "@/components/app/candidate-party-symbol";
import { CandidateWorkHistoryDialog } from "@/components/app/candidate-work-history-dialog";
import { candidateService, electionService } from "@/services";
import type { Candidate, Election } from "@/types";

// Official Election Commission of India (ECI) Recognized Party Symbols
export const INDIAN_PARTY_SYMBOLS = [
  { icon: "🪷", label: "Lotus (कमल)", party: "BJP / भारतीय जनता पार्टी" },
  { icon: "✋", label: "Hand (हाथ)", party: "INC / भारतीय राष्ट्रीय कांग्रेस" },
  { icon: "🌾", label: "Corn & Sickle (हंसिया-बाली)", party: "CPI / कम्युनिस्ट पार्टी" },
  { icon: "🐘", label: "Elephant (हाथी)", party: "BSP / बहुजन समाज पार्टी" },
  { icon: "🚲", label: "Bicycle (साइकिल)", party: "SP / समाजवादी पार्टी" },
  { icon: "🏹", label: "Bow & Arrow (धनुष-बाण)", party: "Shiv Sena / शिवसेना" },
  { icon: "🕰️", label: "Clock (घड़ी)", party: "NCP / राष्ट्रवादी कांग्रेस" },
  { icon: "🚜", label: "Tractor (किसान)", party: "RLD / राष्ट्रीय लोक दल" },
  { icon: "⚖️", label: "Scales of Justice (तराजू)", party: "SAD / शिरोमणि अकाली दल" },
  { icon: "🦁", label: "Lion Crest (सिंह प्रतीक)", party: "Forward Bloc / फॉरवर्ड ब्लॉक" },
  { icon: "🚗", label: "Car (कार)", party: "BRS / भारत राष्ट्र समिति" },
  { icon: "🪔", label: "Earthen Diya (दीपक)", party: "Traditional / अखंड ज्योति" },
  { icon: "🏏", label: "Cricket Bat (बल्ला)", party: "ECI Free Allotment" },
  { icon: "🫖", label: "Kettle (केतली)", party: "ECI Free Symbol" },
  { icon: "🪁", label: "Kite (पतंग)", party: "AIMIM / पतंग" },
  { icon: "🚂", label: "Rail Engine (रेल इंजन)", party: "ECI Free Symbol" },
  { icon: "🔦", label: "Torch / Mashaal (मशाल)", party: "Shiv Sena UBT / मशाल" },
  { icon: "🦚", label: "Peacock (मोर)", party: "National Bird / राष्ट्रीय प्रतीक" },
];

export const Route = createFileRoute("/admin/candidates")({
  head: () => ({
    meta: [
      { title: "Manage Candidates — SecureVote Trust" },
      { name: "description", content: "Indian election candidate roster, official party signs, and manifesto management." },
    ],
  }),
  component: AdminCandidatesPage,
});

function AdminCandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Symbol mode: 'preset' = ECI Indian symbols, 'device' = upload from computer
  const [symbolMode, setSymbolMode] = useState<"preset" | "device">("preset");
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [historyCandidate, setHistoryCandidate] = useState<Candidate | null>(null);

  // Form for new candidate
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    position: "Lok Sabha Member of Parliament",
    symbol: "🪷 Lotus (कमल / BJP)",
    symbolImage: "",
    manifesto: "",
    workHistory: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const elecList = await electionService.list();
      setElections(elecList);
      const activeId = selectedElectionId || (elecList.length > 0 ? elecList[0]?.id || "" : "");
      if (activeId !== selectedElectionId) {
        setSelectedElectionId(activeId);
      }
      if (activeId) {
        const candList = await candidateService.listByElection(activeId);
        setCandidates(candList);
      } else {
        setCandidates([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load candidate data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedElectionId]);

  // Handle uploading party icon / symbol image directly from device
  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const rawDataUrl = uploadEvent.target?.result as string;
      if (!rawDataUrl) return;

      // Scale to max 256x256 using an offscreen canvas for crispness & light footprint
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedUrl = canvas.toDataURL("image/png", 0.9);
          setUploadedImagePreview(optimizedUrl);
          setUploadedFileName(file.name);
          setNewCandidate((prev) => ({
            ...prev,
            symbol: `🖼️ ${file.name.replace(/\.[^/.]+$/, "")} (Custom Logo)`,
            symbolImage: optimizedUrl,
          }));
        } else {
          setUploadedImagePreview(rawDataUrl);
          setUploadedFileName(file.name);
          setNewCandidate((prev) => ({
            ...prev,
            symbol: `🖼️ ${file.name.replace(/\.[^/.]+$/, "")} (Custom Logo)`,
            symbolImage: rawDataUrl,
          }));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearUploadedImage = () => {
    setUploadedImagePreview(null);
    setUploadedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setNewCandidate((prev) => ({
      ...prev,
      symbol: "🪷 Lotus (कमल / BJP)",
      symbolImage: "",
    }));
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.manifesto) return;
    setError(null);

    try {
      const payload: Omit<Candidate, "initials" | "status"> = {
        id: `cand-${Math.floor(10 + Math.random() * 90)}`,
        electionId: selectedElectionId,
        name: newCandidate.name,
        position: newCandidate.position,
        symbol: newCandidate.symbol || "🪷 Lotus (कमल / BJP)",
        manifesto: newCandidate.manifesto,
      };
      if (newCandidate.symbolImage) {
        payload.symbolImage = newCandidate.symbolImage;
      }
      if (newCandidate.workHistory) {
        payload.workHistory = newCandidate.workHistory;
      }
      await candidateService.create(payload);
      setDialogOpen(false);
      setNewCandidate({
        name: "",
        position: "Lok Sabha Member of Parliament",
        symbol: "🪷 Lotus (कमल / BJP)",
        symbolImage: "",
        manifesto: "",
        workHistory: "",
      });
      setUploadedImagePreview(null);
      setUploadedFileName("");
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to add candidate.");
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    try {
      await candidateService.remove(id);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to remove candidate.");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Candidate Roster Management"
        description="Register Indian candidate profiles, allot recognized party signs, upload custom party logos from your device, and manage policy manifestos."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-raised">
                <UserPlus className="size-4" />
                <span>Add New Candidate</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Vote className="size-4 text-primary" />
                  <span>Add Candidate Profile & Party Symbol</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCandidate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cname" className="text-xs">Candidate Full Name</Label>
                  <Input
                    id="cname"
                    placeholder="e.g. Dr. Rajeshwar Sharma"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pos" className="text-xs">Contested Position</Label>
                  <Input
                    id="pos"
                    placeholder="e.g. Lok Sabha Member of Parliament / Council Representative"
                    value={newCandidate.position}
                    onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                    required
                  />
                </div>

                {/* Party Sign & Symbol Selector Section */}
                <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Candidate Party Icon / Election Symbol
                    </Label>
                    <div className="flex items-center gap-1 bg-surface rounded-md p-0.5 border border-border text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSymbolMode("preset")}
                        className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                          symbolMode === "preset"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        <span>🇮🇳 ECI Presets</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSymbolMode("device")}
                        className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                          symbolMode === "device"
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Laptop className="size-3" />
                        <span>📁 Select from Device</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Official Indian Party Presets */}
                  {symbolMode === "preset" && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-md border bg-surface">
                        {INDIAN_PARTY_SYMBOLS.map((s) => {
                          const fullSym = `${s.icon} ${s.label}`;
                          const isSel = newCandidate.symbol === fullSym && !newCandidate.symbolImage;
                          return (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => {
                                setNewCandidate({
                                  ...newCandidate,
                                  symbol: fullSym,
                                  symbolImage: "",
                                });
                                setUploadedImagePreview(null);
                                setUploadedFileName("");
                              }}
                              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-all ${
                                isSel
                                  ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary"
                                  : "hover:bg-muted bg-surface text-foreground border border-border/50"
                              }`}
                            >
                              <span className="text-base shrink-0">{s.icon}</span>
                              <div className="truncate">
                                <div className="truncate font-medium text-[11px] leading-tight">{s.label}</div>
                                <div className={`truncate text-[9px] ${isSel ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  {s.party}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <Input
                        id="csymbol"
                        placeholder="Custom sign label (e.g. 🪷 Lotus (कमल / BJP))..."
                        value={newCandidate.symbol}
                        onChange={(e) => setNewCandidate({ ...newCandidate, symbol: e.target.value })}
                        required
                        className="text-xs h-8"
                      />
                    </div>
                  )}

                  {/* Mode 2: Select / Upload from Local Device */}
                  {symbolMode === "device" && (
                    <div className="space-y-2.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleDeviceFileSelect}
                        className="hidden"
                        id="candidate-device-symbol-upload"
                      />

                      {uploadedImagePreview ? (
                        <div className="flex items-center justify-between p-2.5 rounded-md border border-primary/40 bg-primary-soft/30">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-md border border-primary/50 bg-white/20 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              <img
                                src={uploadedImagePreview}
                                alt="Device Upload Preview"
                                className="size-full object-contain"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <ImageIcon className="size-3 text-primary" />
                                <span className="truncate max-w-[180px]">{uploadedFileName || "Device Image"}</span>
                              </span>
                              <p className="text-[10px] text-integrity font-medium">
                                ✓ Uploaded from device and optimized for ballot
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[11px] h-7 px-2"
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleClearUploadedImage}
                              className="size-7 text-destructive hover:bg-destructive-soft hover:text-destructive"
                              title="Remove uploaded image"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary-soft/10 rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                        >
                          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Upload className="size-4" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            Click to select party icon from your device
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Supports PNG, JPG, SVG, WebP (Official party logos, emblems, seals)
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label htmlFor="custom-sym-name" className="text-[11px] text-muted-foreground">
                          Party Symbol Description / Label
                        </Label>
                        <Input
                          id="custom-sym-name"
                          placeholder="e.g. Rashtriya Vikas Party Emblem"
                          value={newCandidate.symbol}
                          onChange={(e) => setNewCandidate({ ...newCandidate, symbol: e.target.value })}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Preview Pill */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground">Current Ballot Badge:</span>
                    <CandidatePartySymbol
                      symbol={newCandidate.symbol}
                      symbolImage={newCandidate.symbolImage}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="man" className="text-xs">Policy Manifesto Summary</Label>
                  <Textarea
                    id="man"
                    rows={2}
                    placeholder="Summary of core policy commitments across development, education, and public infrastructure..."
                    value={newCandidate.manifesto}
                    onChange={(e) => setNewCandidate({ ...newCandidate, manifesto: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cwork" className="text-xs">Past Work History & Governance Track Record</Label>
                    <span className="text-[10px] text-muted-foreground">Optional (separate with semicolons)</span>
                  </div>
                  <Textarea
                    id="cwork"
                    rows={2}
                    placeholder="e.g. Spearheaded public audit saving ₹42 Cr; commissioned 15MW solar power in schools; built 8 digital health clinics..."
                    value={newCandidate.workHistory}
                    onChange={(e) => setNewCandidate({ ...newCandidate, workHistory: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Candidate</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Candidate Profiles"
          actions={
            <Select value={selectedElectionId} onValueChange={setSelectedElectionId}>
              <SelectTrigger className="w-56 text-xs h-8">
                <SelectValue placeholder="Select Election" />
              </SelectTrigger>
              <SelectContent>
                {elections.map((el) => (
                  <SelectItem key={el.id} value={el.id}>
                    {el.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {loading ? (
          <LoadingState label="Loading candidate roster" />
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Candidates Found"
            description="There are no registered candidates for this election."
          />
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {candidates.map((cand) => (
              <Panel key={cand.id} className="p-5 flex flex-col justify-between space-y-4 border hover:border-border-strong transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0 mt-0.5">
                      {cand.initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm leading-tight">{cand.name}</h4>
                      <p className="text-xs text-muted-foreground">{cand.position}</p>

                      {/* Candidate Sign / Election Symbol Badge (Preset or Device Upload) */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <CandidatePartySymbol
                          symbol={cand.symbol}
                          symbolImage={cand.symbolImage}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(cand.id)}
                    className="size-8 text-destructive hover:bg-destructive-soft hover:text-destructive shrink-0"
                    title="Remove Candidate"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3 text-integrity" />
                      <span>Manifesto</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryCandidate(cand)}
                      className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary-soft/60"
                    >
                      <Briefcase className="size-3" />
                      <span>Past Work History</span>
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/90 italic">"{cand.manifesto}"</p>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </Panel>

      <CandidateWorkHistoryDialog
        candidate={historyCandidate}
        open={Boolean(historyCandidate)}
        onOpenChange={(o) => !o && setHistoryCandidate(null)}
      />
    </AppLayout>
  );
}
