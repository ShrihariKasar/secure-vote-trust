import { useState } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Global Header */}
      <AppHeader onToggleMobileNav={() => setMobileNavOpen(true)} />

      {/* Main Grid: Sidebar + Content */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden w-64 shrink-0 border-r border-border md:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <AppSidebar />
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Drawer</SheetTitle>
            <AppSidebar onItemClick={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
