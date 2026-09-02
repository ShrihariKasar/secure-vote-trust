import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, UserPlus, FileText } from "lucide-react";
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
import { candidateService, electionService } from "@/services";
import type { Candidate, Election } from "@/types";

export const Route = createFileRoute("/admin/candidates")({
  head: () => ({
    meta: [
      { title: "Manage Candidates — SecureVote Trust" },
      { name: "description", content: "Candidate roster and manifesto management." },
    ],
  }),
  component: AdminCandidatesPage,
});

function AdminCandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("el-01");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form for new candidate
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    position: "Presidential Nominee",
    manifesto: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const elecList = await electionService.list();
      setElections(elecList);
      if (elecList.length > 0 && !selectedElectionId) {
        setSelectedElectionId(elecList[0].id);
      }
      const candList = await candidateService.listByElection(selectedElectionId || "el-01");
      setCandidates(candList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedElectionId]);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.manifesto) return;

    try {
      await candidateService.create({
        id: `cand-${Math.floor(10 + Math.random() * 90)}`,
        electionId: selectedElectionId,
        name: newCandidate.name,
        position: newCandidate.position,
        manifesto: newCandidate.manifesto,
      });
      setDialogOpen(false);
      setNewCandidate({ name: "", position: "Presidential Nominee", manifesto: "" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await candidateService.remove(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Candidate Roster Management"
        description="Register candidate profiles, assign positions, upload official policy manifestos, and link to active elections."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-raised">
                <UserPlus className="size-4" />
                <span>Add New Candidate</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Add Candidate Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCandidate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cname" className="text-xs">Candidate Full Name</Label>
                  <Input
                    id="cname"
                    placeholder="e.g. Dr. Eleanor Vance"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pos" className="text-xs">Contested Position</Label>
                  <Input
                    id="pos"
                    placeholder="e.g. President of Academic Council"
                    value={newCandidate.position}
                    onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="man" className="text-xs">Policy Manifesto Summary</Label>
                  <Textarea
                    id="man"
                    rows={3}
                    placeholder="Summary of core policy commitments..."
                    value={newCandidate.manifesto}
                    onChange={(e) => setNewCandidate({ ...newCandidate, manifesto: e.target.value })}
                    required
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
              <Panel key={cand.id} className="p-5 flex flex-col justify-between space-y-4 border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {cand.initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm leading-tight">{cand.name}</h4>
                      <p className="text-xs text-muted-foreground">{cand.position}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(cand.id)}
                    className="size-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="pt-3 border-t border-border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <FileText className="size-3 text-integrity" />
                    <span>Manifesto</span>
                  </div>
                  <p className="text-xs text-foreground/90 italic">"{cand.manifesto}"</p>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
