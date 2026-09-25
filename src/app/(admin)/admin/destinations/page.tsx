import { Eye, EyeOff } from "lucide-react";
import { DestinationForm } from "@/components/admin/destination-form";
import { ReadUnavailable } from "@/components/admin/read-unavailable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateAdmin, requireAdminAccess } from "@/lib/admin";
import { adminRows } from "@/lib/admin-read";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleDestinationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const { role } = await requireAdminAccess();
  const canMutate = canMutateAdmin(role);
  const admin = createAdminClient();
  const result = admin
    ? await admin.from("destinations").select("id,slug,label,description,url,icon,sort_order,active").order("sort_order")
    : null;
  const data = adminRows(result);
  if (!data) return <ReadUnavailable title="destynacji" />;
  return <div className="space-y-7">
    <header><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Publiczny hub</p><h1 className="mt-2 text-3xl font-black tracking-tight">Destynacje</h1><p className="mt-2 text-sm text-muted-foreground">Każdy publiczny przycisk przechodzi przez `/go/...`, więc kliknięcie zostaje policzone przed wyjściem.</p></header>
    {canMutate ? <Card><CardHeader><CardTitle>Dodaj lub zaktualizuj</CardTitle><CardDescription>Obsługujemy wyłącznie oficjalne kanały Poza Nutą: instagram, tiktok, facebook, youtube lub website.</CardDescription></CardHeader><CardContent><DestinationForm /></CardContent></Card> : <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">Tryb tylko do odczytu. Rola viewer nie może zmieniać destynacji.</p>}
    <Card><CardHeader><CardTitle>Linki publiczne</CardTitle></CardHeader><CardContent>{data.length ? <Table><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead>Slug</TableHead><TableHead>URL</TableHead><TableHead>Status</TableHead>{canMutate ? <TableHead className="text-right">Akcja</TableHead> : null}</TableRow></TableHeader><TableBody>{data.map((row) => <TableRow key={row.id}><TableCell className="font-bold">{row.label}</TableCell><TableCell className="font-mono text-xs">{row.slug}</TableCell><TableCell className="max-w-64 truncate text-xs text-muted-foreground">{row.url}</TableCell><TableCell>{row.active ? "Widoczna" : "Ukryta"}</TableCell>{canMutate ? <TableCell className="text-right"><form action={toggleDestinationAction}><Input type="hidden" name="id" value={row.id}/><Input type="hidden" name="active" value={String(row.active)}/><Button variant="ghost" size="sm" type="submit">{row.active ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}{row.active ? "Ukryj" : "Pokaż"}</Button></form></TableCell> : null}</TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Brak destynacji.</p>}</CardContent></Card>
  </div>;
}
