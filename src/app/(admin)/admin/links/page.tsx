import Image from "next/image";
import Link from "next/link";
import { Download, Eye, EyeOff } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { CopyButton } from "@/components/admin/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateAdmin, requireAdminAccess } from "@/lib/admin";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTrackingLinkAction, toggleTrackingLinkAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const { role } = await requireAdminAccess();
  const canMutate = canMutateAdmin(role);
  const admin = createAdminClient();
  const [campaignResult, linksResult] = admin ? await Promise.all([
    admin.from("campaigns").select("id,name,status").neq("status", "archived").order("created_at", { ascending: false }),
    admin.from("tracking_links").select("id,code,label,channel_group,source,medium,asset,placement,landing_path,active,campaign_id,campaigns(name)").order("created_at", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  const campaigns = campaignResult.data ?? [];
  const links = linksResult.data ?? [];
  const siteUrl = getSiteUrl();

  return <div className="space-y-7">
    <header><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Owned attribution</p><h1 className="mt-2 text-3xl font-black tracking-tight">Linki i QR</h1><p className="mt-2 text-sm text-muted-foreground">Każdy wydruk dostaje stabilny kod. Możesz rozróżnić nawet wersję plakatu i miejsce, w którym wisiał.</p></header>
    {canMutate ? <Card><CardHeader><CardTitle>Nowy link śledzący</CardTitle><CardDescription>QR zostanie wygenerowany automatycznie jako SVG.</CardDescription></CardHeader><CardContent><form action={createTrackingLinkAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Nazwa" name="label" placeholder="Plakat V2 · wejście" required />
      <div className="space-y-2"><Label htmlFor="campaignId">Kampania</Label><NativeSelect id="campaignId" name="campaignId" defaultValue=""><NativeSelectOption value="">Bez kampanii</NativeSelectOption>{campaigns.map((c) => <NativeSelectOption value={c.id} key={c.id}>{c.name}</NativeSelectOption>)}</NativeSelect></div>
      <div className="space-y-2"><Label htmlFor="channelGroup">Kanał</Label><NativeSelect id="channelGroup" name="channelGroup" defaultValue="offline"><NativeSelectOption value="offline">Offline</NativeSelectOption><NativeSelectOption value="organic_social">Organic social</NativeSelectOption><NativeSelectOption value="ai_referral">AI referral</NativeSelectOption><NativeSelectOption value="referral">Referral</NativeSelectOption></NativeSelect></div>
      <Field label="Source" name="source" defaultValue="poster" required />
      <Field label="Medium" name="medium" defaultValue="qr" required />
      <Field label="Asset" name="asset" placeholder="pink-v2" />
      <Field label="Placement" name="placement" placeholder="entrance" />
      <div className="space-y-2"><Label htmlFor="landingPath">Landing</Label><NativeSelect id="landingPath" name="landingPath" defaultValue="/"><NativeSelectOption value="/">Strona główna</NativeSelectOption><NativeSelectOption value="/kontakt">Kontakt</NativeSelectOption></NativeSelect></div>
      <div className="md:col-span-2 xl:col-span-3"><SubmitButton idle="Wygeneruj link i QR" pending="Generuję…" /></div>
    </form></CardContent></Card> : <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">Tryb tylko do odczytu. Rola viewer nie może tworzyć ani przełączać linków.</p>}
    <Card><CardHeader><CardTitle>Aktywne i historyczne linki</CardTitle></CardHeader><CardContent>{links.length ? <div className="space-y-6">{links.map((row, index) => { const url = `${siteUrl}/r/${row.code}`; const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns; return <div key={row.id} className="grid gap-5 border-b pb-6 last:border-b-0 last:pb-0 lg:grid-cols-[160px_minmax(0,1fr)]"><div className="rounded-lg bg-white p-3"><Image src={`/admin/links/${row.id}/qr`} width={136} height={136} alt={`Kod QR ${row.label}`} loading={index === 0 ? "eager" : "lazy"} unoptimized /></div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{row.label}</h2><p className="mt-1 text-xs text-muted-foreground">{campaign?.name || "Bez kampanii"} · {row.source}/{row.medium}</p></div>{canMutate ? <form action={toggleTrackingLinkAction}><Input type="hidden" name="id" value={row.id}/><Input type="hidden" name="active" value={String(row.active)}/><Button variant="ghost" size="sm" type="submit">{row.active ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}{row.active ? "Wyłącz" : "Włącz"}</Button></form> : null}</div><div className="mt-4 flex flex-wrap items-center gap-2"><code className="max-w-full overflow-x-auto rounded-sm bg-secondary px-3 py-2 text-xs">{url}</code><CopyButton value={url}/><Link href={`/admin/links/${row.id}/qr?download=1`} className={buttonVariants({ variant: "outline", size: "sm" })}><Download aria-hidden="true"/>SVG</Link></div><Table className="mt-4"><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Placement</TableHead><TableHead>Kod</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>{row.asset || "—"}</TableCell><TableCell>{row.placement || "—"}</TableCell><TableCell className="font-mono">{row.code}</TableCell><TableCell>{row.active ? "Aktywny" : "Wyłączony"}</TableCell></TableRow></TableBody></Table></div></div>; })}</div> : <p className="text-sm text-muted-foreground">Nie ma jeszcze linków.</p>}</CardContent></Card>
  </div>;
}
function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props}/></div>; }
