"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FlaskConical,
  Link2,
  LogOut,
  Megaphone,
  MousePointerClick,
  ShieldCheck,
  Users,
  Waypoints,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { AdminRole } from "@/lib/admin";
import {
  disableAnalyticsTestModeAction,
  enableAnalyticsTestModeAction,
  excludeDeviceAction,
  logoutAction,
} from "@/app/(admin)/admin/actions";

const groups = [
  {
    label: "Analityka",
    items: [{ href: "/admin", label: "Dashboard", icon: BarChart3, exact: true }],
  },
  {
    label: "Pozyskanie",
    items: [
      { href: "/admin/campaigns", label: "Kampanie", icon: Megaphone },
      { href: "/admin/links", label: "Linki i QR", icon: Link2 },
      { href: "/admin/referrals", label: "Polecenia", icon: Waypoints },
    ],
  },
  {
    label: "Ustawienia",
    items: [
      { href: "/admin/destinations", label: "Destynacje", icon: MousePointerClick },
      { href: "/admin/team", label: "Zespół i dostęp", icon: Users },
    ],
  },
];

export function AdminSidebar({ email, role }: { email: string; role: AdminRole }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3 max-md:pr-14">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Poza Nutą · panel" render={<Link href="/admin" />}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent font-black text-accent-foreground">PN</span>
              <span className="min-w-0"><span className="block truncate font-black">Poza Nutą</span><span className="block truncate text-xs text-muted-foreground">Panel administracyjny</span></span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => <AdminSidebarLink key={item.href} {...item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <ActionItem action={excludeDeviceAction} label="Wyklucz to urządzenie" icon={ShieldCheck} />
          <ActionItem action={enableAnalyticsTestModeAction} label="Tryb testowy (2 h)" icon={FlaskConical} />
          <ActionItem action={disableAnalyticsTestModeAction} label="Wyłącz tryb testowy" icon={FlaskConical} />
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-h-12 items-center gap-2 overflow-hidden rounded-md p-2 text-sm text-sidebar-foreground group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0" title={`${email} · ${role}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-black uppercase">{email.slice(0, 2)}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-bold">{email}</span><span className="block text-xs text-muted-foreground">{role}</span></span>
            </div>
          </SidebarMenuItem>
          <ActionItem action={logoutAction} label="Wyloguj" icon={LogOut} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AdminSidebarLink({ href, label, icon: Icon, exact = false }: { href: string; label: string; icon: typeof BarChart3; exact?: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} tooltip={label} aria-current={active ? "page" : undefined} className="max-md:min-h-11" render={<Link href={href} onClick={() => setOpenMobile(false)} />}>
        <Icon aria-hidden="true" /><span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ActionItem({ action, label, icon: Icon }: { action: () => Promise<void>; label: string; icon: typeof BarChart3 }) {
  return (
    <SidebarMenuItem>
      <form action={action}>
        <SidebarMenuButton type="submit" tooltip={label} className="max-md:min-h-11"><Icon aria-hidden="true" /><span>{label}</span></SidebarMenuButton>
      </form>
    </SidebarMenuItem>
  );
}
