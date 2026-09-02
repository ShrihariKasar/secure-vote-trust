import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, UserCheck, Building2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/app/surfaces";
import { AppHeader } from "@/components/app/app-header";
import { authService } from "@/services";
import { sessionStore } from "@/lib/session";
import type { Role } from "@/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — SecureVote Trust" },
      { name: "description", content: "Sign in to the SecureVote Trust electoral portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("voter");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await authService.signIn({ identifier, password }, role);
      sessionStore.set({ user });
      if (user.role === "admin") {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/voter/dashboard" });
      }
    } catch (err) {
      setError("Invalid credentials or role mismatch. Please verify your Voter ID or email.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoRole: Role) => {
    setLoading(true);
    try {
      const user = await authService.signInDemo(demoRole);
      sessionStore.set({ user });
      if (demoRole === "admin") {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: "/voter/dashboard" });
      }
    } catch (err) {
      setError("Demo authentication failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to SecureVote</h1>
            <p className="text-xs text-muted-foreground">
              Select your portal persona to access zero-trust election services.
            </p>
          </div>

          <Panel className="p-6">
            <Tabs defaultValue="voter" onValueChange={(val) => setRole(val as Role)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="voter" className="gap-1.5 text-xs">
                  <UserCheck className="size-3.5" />
                  <span>Voter Portal</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="gap-1.5 text-xs">
                  <Building2 className="size-3.5" />
                  <span>Admin Console</span>
                </TabsTrigger>
              </TabsList>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <TabsContent value="voter">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="voter-id" className="text-xs">Voter ID / Registered Email</Label>
                    <Input
                      id="voter-id"
                      placeholder="e.g. VTR-99201 or aris.thorne@university.edu"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="voter-pass" className="text-xs">Password</Label>
                    <Input
                      id="voter-pass"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2 shadow-raised" disabled={loading}>
                    {loading ? "Authenticating..." : "Sign In to Voter Dashboard"}
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-id" className="text-xs">Admin Username / Email</Label>
                    <Input
                      id="admin-id"
                      placeholder="e.g. admin@securevote.org"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-pass" className="text-xs">Admin Security Token</Label>
                    <Input
                      id="admin-pass"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2 shadow-raised" disabled={loading}>
                    {loading ? "Authenticating Admin..." : "Access Admin Console"}
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Quick Demo Access Bar */}
            <div className="mt-6 pt-5 border-t border-border space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase text-center">
                Instant Demo Access (One-Click)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoFill("voter")}
                  disabled={loading}
                  className="text-xs gap-1"
                >
                  <UserCheck className="size-3 text-integrity" />
                  <span>Demo Voter</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoFill("admin")}
                  disabled={loading}
                  className="text-xs gap-1"
                >
                  <Building2 className="size-3 text-primary" />
                  <span>Demo Admin</span>
                </Button>
              </div>
            </div>
          </Panel>

          <p className="text-center text-xs text-muted-foreground">
            Don't have a registered voter identity?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
