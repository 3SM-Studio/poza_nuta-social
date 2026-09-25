import Link from "next/link";
import { AdminNotice } from "@/components/admin/admin-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDataQualityReport, type DataQualityReport, type QualityReason } from "@/lib/analytics/data-quality";
import { requireAdmin } from "@/lib/admin";
import { resolveDashboardRange } from "@/lib/dashboard-range";
import { cn } from "cn";

export const dynamic = "force-dynamic";

const reasonLabels: Record<QualityReason, string> = {
  invalid_json: "Niepoprawny JSON",
  payload_too_large: "Przekroczony limit żądania",
  forbidden_field: "Niedozwolone pole",
  invalid_event: "Nieznana nazwa zdarzenia",
  invalid_payload: "Niepoprawne właściwości zdarzenia",
  invalid_event_id: "Niepoprawne ID zdarzenia",
  invalid_path: "Niepoprawna ścieżka",
  idempotent_retry: "Ponowiona próba",
  unsupported_mode: "Zdarzenie niedostępne w tym trybie",
};

export default async function DataQualityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const range = resolveDashboardRange(await searchParams);
  const report = await getDataQualityReport(range.from, range.toExclusive);

  return <div className="space-y-7">
    <header className="space-y-3">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Data Quality</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">Jakość zapisu analityki Poza Nutą: zdarzenia zapisane, odrzucone próby i ponowienia. Liczymy zdarzenia, a nie sesje ani osoby.</p>
      <p className="text-sm font-medium">Zakres: {range.from} – {range.toInclusive} · strefa Europe/Warsaw · wszystkie środowiska i klasy ruchu</p>
      <nav className="flex flex-wrap gap-2" aria-label="Zakres Data Quality">
        {[{key:"today",label:"Dziś"},{key:"7",label:"7 dni"},{key:"30",label:"30 dni"},{key:"90",label:"90 dni"}].map((item) =>
          <Link key={item.key} href={`/admin/data-quality?range=${item.key}`} aria-current={range.key === item.key ? "page" : undefined} className={cn(buttonVariants({ variant: range.key === item.key ? "accent" : "outline", size: "sm" }))}>{item.label}</Link>
        )}
      </nav>
      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input type="hidden" name="range" value="custom" />
        <div className="space-y-2"><Label htmlFor="quality-from">Od</Label><Input id="quality-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : ""} required /></div>
        <div className="space-y-2"><Label htmlFor="quality-to">Do</Label><Input id="quality-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : ""} required /></div>
        <Button variant="outline" type="submit">Pokaż zakres</Button>
      </form>
    </header>

    {!report ? <AdminNotice tone="error" title="Raport niedostępny">Nie udało się odczytać danych jakości. Spróbuj ponownie później. Nie oznacza to zera zdarzeń ani braku awarii.</AdminNotice> : <Report report={report} />}
  </div>;
}

function Report({ report }: { report: DataQualityReport }) {
  const noObservations = report.persistedTotal === 0 && report.rejected === 0 && report.duplicates === 0 && report.filtered === 0 && report.contractDrift === 0;
  const findings = [
    report.contractDrift > 0 ? `${report.contractDrift} zapisanych zdarzeń z niespójnym kontraktem lub kontekstem projektu` : null,
    report.rejected > 0 ? report.rejected === 1 ? "1 odrzucona próba" : `${report.rejected} odrzuconych prób` : null,
  ].filter(Boolean);
  return <>
    <Card>
      <CardHeader><h2 className="text-lg font-bold tracking-tight">Stan obserwowanych danych</h2></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-semibold">{findings.length ? "Wymaga sprawdzenia" : noObservations ? "Brak danych do oceny" : "Brak wykrytych problemów w obserwowanym zakresie"}</p>
        {findings.length ? <ul className="list-disc space-y-1 pl-5">{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul> : <p className="text-muted-foreground">{noObservations ? "W tym okresie nie ma zapisanych zdarzeń ani wyjątków." : "Nie odnotowano odrzuceń ani wykrywalnego driftu kontraktu."}</p>}
        {report.duplicates > 0 && <p className="text-muted-foreground">{report.duplicates} ponowionych prób rozpoznano jako duplikaty; nie zwiększają liczby zapisanych zdarzeń.</p>}
      </CardContent>
    </Card>

    <section aria-label="Podsumowanie Data Quality" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <h2 className="sr-only">Podsumowanie liczb</h2>
      <Metric label="Zapisane zdarzenia" value={report.persistedTotal} definition="Suma poprawnych zdarzeń z obu trybów w wybranym okresie." />
      <Metric label="Cookieless" value={report.persistedCookieless} definition="Zapisane bez identyfikatora przeglądarki i sesji." />
      <Metric label="Consented" value={report.persistedConsented} definition="Zapisane po potwierdzeniu zgody na analitykę." />
      <Metric label="Odrzucone próby" value={report.rejected} definition="Próby z zapisanym powodem odrzucenia. Nie obejmują awarii, których baza nie mogła zarejestrować." />
      <Metric label="Duplikaty" value={report.duplicates} definition="Rozpoznane ponowienia tego samego zdarzenia, bez drugiego zapisu." />
      <Metric label="Odfiltrowane" value={report.filtered} definition="Zdarzenia świadomie pominięte przez kontrakt danego trybu." />
      <Metric label="Drift kontraktu" value={report.contractDrift} definition="Wykrywalne odstępstwa nazwy, ścieżki lub przypisania do projektu." />
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><h2 className="text-lg font-bold tracking-tight">Powody odrzucenia</h2></CardHeader><CardContent>
        {report.rejectionReasons.length ? <Table><TableHeader><TableRow><TableHead>Powód</TableHead><TableHead className="text-right">Próby</TableHead></TableRow></TableHeader><TableBody>{report.rejectionReasons.map(({ reason, count }) => <TableRow key={reason}><TableCell className="break-words">{reasonLabels[reason] ?? reason}</TableCell><TableCell className="text-right tabular-nums">{count}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Brak zapisanych odrzuceń w tym okresie.</p>}
      </CardContent></Card>
      <Card><CardHeader><h2 className="text-lg font-bold tracking-tight">Zapisane według zdarzenia</h2></CardHeader><CardContent>
        {report.eventNames.length ? <Table><TableHeader><TableRow><TableHead>Zdarzenie</TableHead><TableHead className="text-right">Wiersze</TableHead></TableRow></TableHeader><TableBody>{report.eventNames.map(({ eventName, count }) => <TableRow key={eventName}><TableCell className="break-all">{eventName}</TableCell><TableCell className="text-right tabular-nums">{count}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Brak zapisanych zdarzeń w tym okresie.</p>}
      </CardContent></Card>
    </div>

    <Card><CardHeader><h2 className="text-lg font-bold tracking-tight">Granice pomiaru</h2></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground">
      <p>Wyjątki są zapisywane w tej samej bazie. Pełnej niedostępności bazy, nieudanych zapisów wyjątków oraz prób, które nie dotarły do aplikacji, ten raport nie mierzy wiarygodnie.</p>
      <p>Boty są oznaczane klasą ruchu przy zapisie zdarzenia, a nie odfiltrowywane. Duplikaty widoczne są tylko wtedy, gdy zapis wyjątku się powiódł. Starsze zdarzenia po zgodzie należą do tego jednego projektu na mocy architektury aplikacji.</p>
      <p>Nieznana ścieżka widoku strony po zgodzie jest normalizowana do strony głównej. Pierwotnej wartości nie zapisujemy, więc raport nie policzy takich prób jako driftu.</p>
    </CardContent></Card>
  </>;
}

function Metric({ label, value, definition }: { label: string; value: number; definition: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold tabular-nums">{value.toLocaleString("pl-PL")}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{definition}</p></CardContent></Card>;
}
