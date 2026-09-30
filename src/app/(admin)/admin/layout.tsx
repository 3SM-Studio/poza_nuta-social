import type { Metadata } from "next";
import { cookies } from "next/headers";
import { adminFont } from "@/app/admin-font";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAdminAccess } from "@/lib/admin";
import { resolveServerEnvironment } from "@/lib/runtime-environment";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdminAccess();
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen} className={`admin-theme dark ${adminFont.variable}`}>
        <AdminSidebar email={user.email || "konto"} role={role} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 supports-backdrop-filter:backdrop-blur-sm sm:px-6">
            <SidebarTrigger />
            <span className="font-black tracking-tight md:hidden">POZA NUTĄ <span className="text-primary dark:text-sidebar-primary">/ PANEL</span></span>
          </header>
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-7 lg:py-8">
            {resolveServerEnvironment() === "preview" && <p role="status" className="mb-5 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold">Preview — tryb tylko do odczytu. Zmiany w panelu są zablokowane.</p>}
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
