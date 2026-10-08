import {
  ShieldCheck,
  ChevronDown,
  Menu,
  LogOut,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSession, sessionStore } from "@/lib/session";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { VoterStatusDialog } from "@/components/app/voter-status-dialog";

export function AppHeader({ onToggleMobileNav }: { onToggleMobileNav?: () => void }) {
  const session = useSession();
  const navigate = useNavigate();

  const currentUser = session.user;

  const handleSignOut = () => {
    sessionStore.clear();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleMobileNav && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleMobileNav}
            aria-label="Toggle navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        )}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tracking-tight text-foreground">SecureVote</span>
              <span className="rounded bg-integrity-soft px-1.5 py-0.5 text-[10px] font-semibold text-integrity">
                TRUST
              </span>
            </div>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Zero-Trust Cryptographic Voting Engine
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* System Integrity Badge */}
        <div className="hidden items-center gap-1.5 rounded-full border border-integrity/30 bg-integrity-soft/60 px-3 py-1 text-xs font-medium text-integrity lg:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-integrity opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-integrity"></span>
          </span>
          <span>Ledger Integrity Verified</span>
        </div>

        {/* Account Menu */}
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-none text-foreground">{currentUser.name}</p>
                  <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">{currentUser.role}</p>
                </div>
                <ChevronDown className="size-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Badge variant={currentUser.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                      {currentUser.role}
                    </Badge>
                    {currentUser.faceVerified && (
                      <Badge variant="outline" className="border-integrity/40 text-[10px] text-integrity">
                        Face Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentUser.role === "voter" ? (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/voter/dashboard">Voter Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/voter/my-vote">My Vote History</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/dashboard">Admin Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/elections">Manage Elections</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin/audit">Audit Logs</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 size-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <VoterStatusDialog />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
