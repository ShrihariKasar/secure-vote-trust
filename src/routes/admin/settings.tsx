import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, ShieldCheck, Cpu, RefreshCw, CheckCircle2, Lock } from "lucide-react";
import { AppLayout } from "@/components/app/app-layout";
import { PageHeader, Panel, PanelHeader } from "@/components/app/surfaces";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sessionStore } from "@/lib/session";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — SecureVote Trust" },
      { name: "description", content: "Configure zero-trust cryptographic voting node parameters." },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [zkValidation, setZkValidation] = useState(true);
  const [autoBlockCommit, setAutoBlockCommit] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetSession = () => {
    sessionStore.clear();
    localStorage.removeItem("securevote.token");
    localStorage.removeItem("securevote.voting_session_token");
    window.location.reload();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Electoral Node Settings"
        description="Configure cryptographic consensus parameters, zero-knowledge proof verification policies, and node synchronization."
      />

      <div className="space-y-6 max-w-3xl">
        <Panel className="p-6 space-y-6">
          <PanelHeader
            title="Consensus & Blockchain Node Settings"
            description="Control how block consensus is formed across distributed electoral nodes."
          />

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-semibold text-foreground">Zero-Knowledge Ballot Sealing (ZK-SNARK)</p>
                <p className="text-muted-foreground">Encrypt candidate choice with 256-bit ZK vector proof before node broadcast.</p>
              </div>
              <Switch checked={zkValidation} onCheckedChange={setZkValidation} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-semibold text-foreground">Auto-Commit Block Consensus</p>
                <p className="text-muted-foreground">Automatically mine and seal new blocks upon verified vote transactions.</p>
              </div>
              <Switch checked={autoBlockCommit} onCheckedChange={setAutoBlockCommit} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-semibold text-foreground">Authoritative Audit Trail Logging</p>
                <p className="text-muted-foreground">Record cryptographic hash chain audit logs on every system transaction.</p>
              </div>
              <Switch checked={auditLogging} onCheckedChange={setAuditLogging} />
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            {savedNotice ? (
              <span className="text-xs font-semibold text-success flex items-center gap-1">
                <CheckCircle2 className="size-4" />
                Settings saved successfully!
              </span>
            ) : <div />}
            <Button onClick={handleSave} className="gap-2 text-xs shadow-raised">
              <span>Save Node Parameters</span>
            </Button>
          </div>
        </Panel>

        <Panel className="p-6 space-y-4 border-destructive/30 bg-destructive-soft/10">
          <PanelHeader
            title="Active Session Reset"
            description="Clear cached client session tokens and stored voter authentication credentials."
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Clears localStorage access tokens and resets client session state.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetSession} className="text-xs text-destructive border-destructive/30">
              Clear Client Session
            </Button>
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}
