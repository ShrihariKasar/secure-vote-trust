import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, PlusCircle, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { electionService } from "@/services";
import type { ElectionStatus } from "@/types";

export const Route = createFileRoute("/admin/elections/new")({
  head: () => ({
    meta: [
      { title: "Create Election — SecureVote Trust" },
      { name: "description", content: "Configure a new election." },
    ],
  }),
  component: CreateElectionPage,
});

function CreateElectionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    id: `el-${Math.floor(100 + Math.random() * 900)}`,
    description: "",
    startDate: "2026-11-03",
    startTime: "07:00",
    endDate: "2026-11-03",
    endTime: "20:00",
    status: "scheduled" as ElectionStatus,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await electionService.create(form);
      navigate({ to: "/admin/elections" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/elections" })} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to Elections Registry</span>
        </Button>

        <PageHeader
          title="Create New Institutional Election"
          description="Register electoral parameters, zero-knowledge ballot rules, and timeline boundaries."
        />

        <Panel className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name" className="text-xs">Election Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. 2026 National Presidential General Election"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="id" className="text-xs">System Identifier (Code)</Label>
                <Input
                  id="id"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  required
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Election Description & Purpose</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Institutional description of voters eligible, ballot scope, and constitutional mandate..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sdate" className="text-xs">Start Date</Label>
                <Input
                  id="sdate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stime" className="text-xs">Start Time (UTC)</Label>
                <Input
                  id="stime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edate" className="text-xs">End Date</Label>
                <Input
                  id="edate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="etime" className="text-xs">End Time (UTC)</Label>
                <Input
                  id="etime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs">Initial Lifecycle Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val as ElectionStatus })}>
                <SelectTrigger id="status" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Internal Setup)</SelectItem>
                  <SelectItem value="scheduled">Scheduled (Voters Pre-notified)</SelectItem>
                  <SelectItem value="voting_open">Voting Open (Live Ballot Cast)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/elections" })}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2 shadow-raised">
                <PlusCircle className="size-4" />
                <span>{loading ? "Registering..." : "Create Election Payload"}</span>
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </AppLayout>
  );
}
