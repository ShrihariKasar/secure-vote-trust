import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Vote,
  History,
  FileCheck2,
  Users,
  ShieldAlert,
  Blocks,
  BarChart3,
  Settings,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export function AppSidebar({ onItemClick }: { onItemClick?: () => void }) {
  const session = useSession();
  const location = useLocation();
  const role = session.user?.role;

  const voterNav: NavItem[] = [
    { title: "Voter Dashboard", href: "/voter/dashboard", icon: LayoutDashboard },
    { title: "My Vote History", href: "/voter/my-vote", icon: History },
  ];

  const adminNav: NavItem[] = [
    { title: "Admin Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Elections", href: "/admin/elections", icon: Vote },
    { title: "Create Election", href: "/admin/elections/new", icon: PlusCircle },
    { title: "Candidates", href: "/admin/candidates", icon: Users },
    { title: "Voter Queue", href: "/admin/voters", icon: UserCheck, badge: "Pending" },
    { title: "Audit Trail", href: "/admin/audit", icon: ShieldAlert },
    { title: "Blockchain Ledger", href: "/admin/blockchain", icon: Blocks },
    { title: "Election Results", href: "/admin/results", icon: BarChart3 },
    { title: "System Settings", href: "/admin/settings", icon: Settings },
  ];

  const activeNav = role === "admin" ? adminNav : voterNav;

  return (
    <aside className="flex h-full flex-col justify-between bg-surface p-4">
      <div className="space-y-6">
        {/* Role Banner */}
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Current Portal
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                role === "admin"
                  ? "bg-primary-soft text-primary"
                  : "bg-integrity-soft text-integrity",
              )}
            >
              {role ?? "Guest"}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-foreground">
            {role === "admin"
              ? "Administrator Management Portal"
              : role === "voter"
                ? "Secure Voter Portal"
                : "Public Portal"}
          </p>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <p className="px-2 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </p>
          {activeNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href) && item.href !== "/admin/elections" && item.href !== "/admin/results");

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onItemClick}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-border pt-4">
        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FileCheck2 className="size-3 text-integrity" />
            <span>SHA-256 Block Engine v2.4</span>
          </div>
          <p>Zero-Knowledge Ballot Sealing</p>
        </div>
      </div>
    </aside>
  );
}
