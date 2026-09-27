import Image from "next/image";
import Link from "next/link";
import { Download, Eye, EyeOff } from "lucide-react";
import { TrackingLinkForm } from "@/components/admin/tracking-link-form";
import { CopyButton } from "@/components/admin/copy-button";
import { ReadUnavailable } from "@/components/admin/read-unavailable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateAdmin, requireAdminAccess } from "@/lib/admin";
import { adminRows } from "@/lib/admin-read";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleTrackingLinkAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const { role } = await requireAdminAccess();
  const canMutate = canMutateAdmin(role);
  const admin = createAdminClient();
  const [campaignResult, linksResult] = admin ? await Promise.all([
    admin.from("campaigns").select("id,name,status").neq("status", "archived").order("created_at", { ascending: false }),
    admin.from("tracking_links").select("id,code,label,channel_group,source,medium,asset,placement,distribution_unit,landing_path,active,campaign_id,campaigns(name)").order("created_at", { ascending: false }),
  ]) : [null, null];
  const campaigns = adminRows(campaignResult);
  const links = adminRows(linksResult);
  if (!campaigns || !links) return <ReadUnavailable title="linków i kampanii" />;
  const siteUrl = getSiteUrl();

  return <div className="space-y-7">
    <header><p className="text-xs font-black uppercase tracking-[0.16em] text-primary dark:text-sidebar-primary">Owned attribution</p><h1 className="mt-2 text-3xl font-black tracking-tight">Linki i QR</h1><p className="mt-2 text-sm text-muted-foreground">Każdy mierzony egzemplarz może dostać stabilny kod i oznaczenie jednostki dystrybucji.</p></header>
    {canMutate ? <Card><CardHeader><CardTitle>Nowy link śledzący</CardTitle><CardDescription>QR zostanie wygenerowany automatycznie jako SVG.</CardDescription></CardHeader><CardContent><TrackingLinkForm campaigns={campaigns} /></CardContent></Card> : <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">Tryb tylko do odczytu. Rola viewer nie może tworzyć ani przełączać linków.</p>}
    <Card><CardHeader><CardTitle>Aktywne i historyczne linki</CardTitle></CardHeader><CardContent>{links.length ? <div className="space-y-6">{links.map((row, index) => { const url = `${siteUrl}/r/${row.code}`; const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns; return <div key={row.id} className="grid gap-5 border-b pb-6 last:border-b-0 last:pb-0 lg:grid-cols-[160px_minmax(0,1fr)]"><div className="rounded-lg bg-white p-3"><Image src={`/admin/links/${row.id}/qr`} width={136} height={136} alt={`Kod QR ${row.label}`} loading={index === 0 ? "eager" : "lazy"} unoptimized /></div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{row.label}</h2><p className="mt-1 text-xs text-muted-foreground">{campaign?.name || "Bez kampanii"} · {row.source}/{row.medium}</p></div>{canMutate ? <form action={toggleTrackingLinkAction}><Input type="hidden" name="id" value={row.id}/><Input type="hidden" name="active" value={String(row.active)}/><Button variant="ghost" size="sm" type="submit">{row.active ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}{row.active ? "Wyłącz" : "Włącz"}</Button></form> : null}</div><div className="mt-4 flex flex-wrap items-center gap-2"><code className="max-w-full overflow-x-auto rounded-sm bg-secondary px-3 py-2 text-xs">{url}</code><CopyButton value={url}/><Link href={`/admin/links/${row.id}/qr?download=1`} className={buttonVariants({ variant: "outline", size: "sm" })}><Download aria-hidden="true"/>SVG</Link></div><Table className="mt-4"><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Placement</TableHead><TableHead>Jednostka</TableHead><TableHead>Kod</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>{row.asset || "—"}</TableCell><TableCell>{row.placement || "—"}</TableCell><TableCell>{row.distribution_unit || "—"}</TableCell><TableCell className="font-mono">{row.code}</TableCell><TableCell>{row.active ? "Aktywny" : "Wyłączony"}</TableCell></TableRow></TableBody></Table></div></div>; })}</div> : <p className="text-sm text-muted-foreground">Nie ma jeszcze linków.</p>}</CardContent></Card>
  </div>;
}
