import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAdminAccess } from "@/lib/admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdminAccess();
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar email={user.email || "konto"} role={role} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 supports-backdrop-filter:backdrop-blur-sm sm:px-6">
            <SidebarTrigger />
            <span className="font-black tracking-tight md:hidden">POZA NUTĄ <span className="text-accent">/ PANEL</span></span>
          </header>
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-7 lg:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
