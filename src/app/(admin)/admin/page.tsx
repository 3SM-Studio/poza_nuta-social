import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardRange } from "@/lib/analytics";
import { requireAdmin } from "@/lib/admin";
import { comparisonNote, resolveDashboardRange } from "@/lib/dashboard-range";
import { cn } from "cn";
import { AnalyticsChart } from "@/components/admin/analytics-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const [data, previous] = await Promise.all([
    getDashboardRange(range.from, range.toExclusive),
    getDashboardRange(range.previousFrom, range.previousToExclusive),
  ]);
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{range.label}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Co naprawdę działa?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Własne pomiary wejść, pozyskania i kliknięć Poza Nutą. Rankingi pozyskania przypisują każdą sesję dokładnie raz. Bez surowych adresów IP i odcisku urządzenia.</p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Zakres analityki">
          {[{key:"today",label:"Dziś"},{key:"7",label:"7 dni"},{key:"30",label:"30 dni"},{key:"90",label:"90 dni"}].map((item) => (
            <Link key={item.key} href={`/admin?range=${item.key}`} className={cn(buttonVariants({variant: range.key === item.key ? "accent" : "outline", size:"sm"}))}>{item.label}</Link>
          ))}
        </nav>
        <form method="get" className="mt-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="range" value="custom" />
          <div className="space-y-2"><Label htmlFor="from">Od</Label><Input id="from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : ""} required /></div>
          <div className="space-y-2"><Label htmlFor="to">Do</Label><Input id="to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : ""} required /></div>
          <Button variant="outline" type="submit">Pokaż zakres</Button>
        </form>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sesje" value={data.sessions} note={comparisonNote(data.sessions, previous.sessions)} />
        <StatCard label="Przeglądarki za zgodą" value={data.visitors} note={`${data.newVisitors} nowe · ${data.returningVisitors} powracające (${data.returningVisitorRate.toFixed(1)}%)`} />
        <StatCard label="Sesje z wyjściem" value={data.outboundSessions} note={comparisonNote(data.outboundSessions, previous.outboundSessions)} />
        <StatCard label="Współczynnik wyjścia" value={`${data.outboundSessionRate.toFixed(1)}%`} note={comparisonNote(data.outboundSessionRate, previous.outboundSessionRate, "points")} />
        <StatCard label="Wejścia śledzące" value={data.trackingEntries} note={comparisonNote(data.trackingEntries, previous.trackingEntries)} />
        <StatCard label="Kliknięcia wychodzące" value={data.outboundClicks} note={`${data.clicksPerOutboundSession.toFixed(2)} / sesję z wyjściem`} />
        <StatCard label="Wiele destynacji" value={`${data.multiDestinationSessionRate.toFixed(1)}%`} note={`${data.multiDestinationSessions} sesji`} />
        <StatCard label="Powrót po wyjściu" value={`${data.returnToHubRate.toFixed(1)}%`} note={`${data.returnToHubSessions} sesji z wyjściem`} />
        <StatCard label="Zainteresowanie kontaktem" value={`${data.contactInterestRate.toFixed(1)}%`} note={`${data.contactInterestSessions} sesji · kliknięcie po widoku ${data.contactClickRate.toFixed(1)}%`} />
      </section>

      <Card>
        <CardHeader><CardTitle>Ruch w czasie</CardTitle></CardHeader>
        <CardContent>
          {data.timeSeries.length ? <AnalyticsChart data={data.timeSeries} /> : <p className="text-sm text-muted-foreground">Brak zewnętrznych danych produkcyjnych dla tego zakresu.</p>}
        </CardContent>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Ranking title="Źródła pozyskania" rows={data.topSources} metricLabel="Sesje" empty="Brak danych o źródłach pozyskania." />
        <Ranking title="Kampanie pozyskania" rows={data.topCampaigns} metricLabel="Sesje" empty="Brak danych o kampaniach pozyskania." />
        <Ranking title="Materiały pozyskania" rows={data.topAssets} metricLabel="Sesje" empty="Brak danych o materiałach pozyskania." />
        <Ranking title="Umiejscowienia pozyskania" rows={data.topPlacements} metricLabel="Sesje" empty="Brak danych o umiejscowieniach pozyskania." />
        <Ranking title="Destynacje" rows={data.topDestinations} metricLabel="Kliknięcia" empty="Jeszcze nikt nie kliknął dalej." />
        <Ranking title="Linki pozyskania" rows={data.topTrackingLinks} metricLabel="Sesje" empty="Brak wejść przez linki kampanii." />
        <Ranking title="Klasy ruchu" rows={data.trafficBreakdown} metricLabel="Sesje" empty="Brak sklasyfikowanego ruchu." />
      </section>
    </div>
  );
}

function Ranking({ title, rows, metricLabel, empty }: { title:string; rows:Array<{label:string;value:number}>; metricLabel:string; empty:string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{rows.length ? <Table><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead className="text-right">{metricLabel}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index)=><TableRow key={`${row.label}-${index}`}><TableCell className="font-bold">{row.label}</TableCell><TableCell className="text-right tabular-nums">{row.value}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}
