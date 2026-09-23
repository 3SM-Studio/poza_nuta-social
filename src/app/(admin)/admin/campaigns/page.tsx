import { Archive } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateAdmin, requireAdminAccess } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveCampaignAction, createCampaignAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const { role } = await requireAdminAccess();
  const canMutate = canMutateAdmin(role);
  const admin = createAdminClient();
  const result = admin
    ? await admin.from("campaigns").select("id,name,slug,status,starts_on,ends_on,created_at").order("created_at", { ascending: false })
    : { data: [] };
  const data = result.data ?? [];
  return (
    <div className="space-y-7">
      <header><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Atrybucja</p><h1 className="mt-2 text-3xl font-black tracking-tight">Kampanie</h1><p className="mt-2 text-sm text-muted-foreground">Grupuj plakaty, ulotki, reklamy i inne wejścia pod jednym wydarzeniem lub akcją.</p></header>
      {canMutate ? <Card>
        <CardHeader><CardTitle>Nowa kampania</CardTitle><CardDescription>Slug jest technicznym identyfikatorem w analityce.</CardDescription></CardHeader>
        <CardContent>
          <form action={createCampaignAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nazwa" name="name" placeholder="Loch · 20.09.2026" required />
            <Field label="Slug (opcjonalny)" name="slug" placeholder="loch-2026-09-20" />
            <Field label="Start" name="startsOn" type="date" />
            <Field label="Koniec" name="endsOn" type="date" />
            <div className="md:col-span-2 xl:col-span-4"><SubmitButton idle="Utwórz kampanię" pending="Tworzę…" /></div>
          </form>
        </CardContent>
      </Card> : <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">Tryb tylko do odczytu. Rola viewer nie może zmieniać kampanii.</p>}
      <Card>
        <CardHeader><CardTitle>Wszystkie kampanie</CardTitle></CardHeader>
        <CardContent>
          {data.length ? <Table><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead>{canMutate ? <TableHead className="text-right">Akcja</TableHead> : null}</TableRow></TableHeader><TableBody>{data.map((row) => <TableRow key={row.id}><TableCell className="font-bold">{row.name}</TableCell><TableCell className="font-mono text-xs">{row.slug}</TableCell><TableCell>{row.status}</TableCell>{canMutate ? <TableCell className="text-right">{row.status !== "archived" ? <form action={archiveCampaignAction}><Input type="hidden" name="id" value={row.id} /><Button variant="ghost" size="sm" type="submit"><Archive aria-hidden="true" />Archiwizuj</Button></form> : null}</TableCell> : null}</TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Nie ma jeszcze kampanii.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}
