import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardRange } from "@/lib/analytics/server";
import { requireAdmin } from "@/lib/admin";
import { comparisonNote, resolveDashboardRange } from "@/lib/dashboard-range";
import { cn } from "cn";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { ReadUnavailable } from "@/components/admin/read-unavailable";
import { AdminNotice } from "@/components/admin/admin-notice";
import { getDashboardActivation, type DashboardActivation, type JourneySnapshot } from "@/lib/analytics/dashboard-activation";
import { dashboardRangeDays } from "@/lib/dashboard-range";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const [data, previous, activation] = await Promise.all([
    getDashboardRange(range.from, range.toExclusive),
    getDashboardRange(range.previousFrom, range.previousToExclusive),
    dashboardRangeDays(range) <= 366 ? getDashboardActivation(range.from, range.toExclusive) : Promise.resolve(null),
  ]);
  if (!data || !previous) return <ReadUnavailable title="analityki" />;
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary dark:text-sidebar-primary">{range.label}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Co naprawdę działa?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Własne pomiary wejść, pozyskania i kliknięć Poza Nutą. Sesje i przeglądarki poniżej wymagają zgody na analitykę; wejścia /r bez zgody są pokazane osobno w jednostkach dystrybucji. Rankingi pozyskania przypisują każdą sesję dokładnie raz. Bez surowych adresów IP i odcisku urządzenia.</p>
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
        <StatCard label="Przeglądarki za zgodą" value={data.visitors} note={`${data.newVisitors} nowe · ${data.returningVisitors} powracające${data.visitors >= 20 ? ` (${data.returningVisitorRate.toFixed(1)}%)` : ""}`} />
        <StatCard label="Sesje z wyjściem" value={data.outboundSessions} note={comparisonNote(data.outboundSessions, previous.outboundSessions)} />
        <StatCard label="Współczynnik wyjścia" value={displayRate(data.outboundSessionRate, data.sessions)} note={`${data.outboundSessions} z ${data.sessions} sesji${data.sessions >= 20 && previous.sessions >= 20 ? ` · ${comparisonNote(data.outboundSessionRate, previous.outboundSessionRate, "points")}` : ` · ${sampleNote(data.sessions)}`}`} />
        <StatCard label="Wejścia /r ze zgodą" value={data.trackingEntries} note={comparisonNote(data.trackingEntries, previous.trackingEntries)} />
        <StatCard label="Kliknięcia wychodzące" value={data.outboundClicks} note={data.outboundSessions >= 20 ? `${data.clicksPerOutboundSession.toFixed(2)} na ${data.outboundSessions} sesji z wyjściem` : `${data.outboundClicks} kliknięć w ${data.outboundSessions} sesjach z wyjściem · ${sampleNote(data.outboundSessions)}`} />
        <StatCard label="Wiele destynacji" value={displayRate(data.multiDestinationSessionRate, data.outboundSessions)} note={`${data.multiDestinationSessions} z ${data.outboundSessions} sesji z wyjściem · ${sampleNote(data.outboundSessions)}`} />
        <StatCard label="Powrót po wyjściu" value={displayRate(data.returnToHubRate, data.outboundSessions)} note={`${data.returnToHubSessions} z ${data.outboundSessions} sesji z wyjściem · ${sampleNote(data.outboundSessions)}`} />
        <StatCard label="Zainteresowanie kontaktem" value={displayRate(data.contactInterestRate, data.sessions)} note={`${data.contactInterestSessions} z ${data.sessions} sesji · ${sampleNote(data.sessions)}`} />
      </section>

      {dashboardRangeDays(range) > 366 ? <AdminNotice tone="info" title="Ścieżki V3 wymagają krótszego zakresu">Wybierz maksymalnie 366 dni, aby odczytać ścieżki i jednostki dystrybucji. Pozostałe metryki dotyczą wybranego zakresu.</AdminNotice> : activation ?
        <MarketingDecisions activation={activation} /> :
        <AdminNotice tone="error" title="Dane ścieżek V3 są niedostępne">Nie pokazujemy zer zamiast nieudanego odczytu. Pozostałe metryki dashboardu są dostępne.</AdminNotice>}

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

const number = new Intl.NumberFormat("pl-PL");
function displayRate(rate: number, base: number) { return base >= 20 ? `${rate.toFixed(1)}%` : "—"; }
function sampleNote(base: number) { return base === 0 ? "brak bazy" : base < 20 ? "mała próba" : "udział w okresie"; }
const channelLabels: Record<string, string> = {
  direct: "Bezpośredni", offline: "Offline / własny link", ai_referral: "AI referral",
  organic_search: "Wyszukiwanie organiczne", organic_social: "Social organiczny",
  referral: "Referral", email: "E-mail", paid_social: "Social płatny",
  paid_search: "Wyszukiwanie płatne", other: "Inne",
};

function MarketingDecisions({ activation }: { activation: DashboardActivation }) {
  const { participant, venue, acquisition } = activation;
  return <section aria-labelledby="marketing-decisions" className="space-y-4">
    <div className="space-y-1"><h2 id="marketing-decisions" className="text-xl font-bold">Ścieżki marketingowe</h2>
      <p className="text-sm text-muted-foreground">Kolejne kroki w tej samej sesji ze zgodą, tylko ruch produkcyjny zewnętrzny. Pierwszy krok to kliknięcie CTA; wcześniejsza odsłona strony głównej mogła być bez zgody.</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <JourneyCard title="Uczestnik" report={participant} labels={["CTA karaoke na głównej", "Widok /karaoke", "CTA aktualnych informacji", "Widok /linki"]}
        routeLabel="Wszystkie sesje z widokiem /karaoke" proofLabel="Ekspozycje wyjaśnienia udziału" />
      <JourneyCard title="Lokal / organizator" report={venue} labels={["CTA dla lokali na głównej", "Widok /dla-lokali", "CTA kontaktu", "Widok /kontakt", "Kliknięcie kontaktu"]}
        routeLabel="Wszystkie sesje z widokiem /dla-lokali" proofLabel="Ekspozycje realizacji na głównej" venueProofLabel="Ekspozycje realizacji na /dla-lokali" />
    </div>
    <div className="grid gap-5 xl:grid-cols-3">
      <DecisionRanking title="Kanały pozyskania" rows={acquisition.channels.map((row) => ({ label: channelLabels[row.key] || row.key, value: row.sessions }))}
        unit="Sesje" empty="Brak sesji ze zgodą w ruchu biznesowym. Brak AI referral oznacza brak rozpoznanych wejść, nie brak obecności w odpowiedziach AI."
        note="Jedna kategoria na sesję ze zgodą, według kanonicznego session_acquisition. Brak referrera nie jest ruchem AI." />
      <DecisionRanking title="Jednostki dystrybucji" rows={acquisition.distributionUnits.map((row) => ({ label: row.label, value: row.entries }))}
        unit="Wejścia /r" empty="Brak wejść przez linki z przypisaną jednostką dystrybucji."
        note="Zdarzenia wejścia przez link, także bez zgody. Skopiowany adres liczy się tak samo; liczba nie potwierdza skanów QR." />
      <DecisionRanking title="Uczestnicy poleceń" rows={acquisition.referralParticipants.map((row) => ({ label: row.label, value: row.entries }))}
        unit="Wejścia /r" empty="Brak wejść przez linki przypisane uczestnikom poleceń."
        note="Zdarzenia wejścia przez link, także bez zgody; bez łączenia w osoby lub sesje." />
    </div>
    <p className="text-xs text-muted-foreground">W wybranym okresie: {number.format(acquisition.consentedSessions)} sesji ze zgodą i {number.format(acquisition.trackingEntryEvents)} wejść przez /r. To różne populacje, których nie należy dodawać ani dzielić przez siebie.</p>
  </section>;
}

function JourneyCard({ title, report, labels, routeLabel, proofLabel, venueProofLabel }: {
  title: string; report: JourneySnapshot; labels: string[]; routeLabel: string; proofLabel: string; venueProofLabel?: string;
}) {
  const entrants = report.steps[0].sessions;
  const completed = report.steps.at(-1)?.sessions ?? 0;
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4">
    <ol className="divide-y border-y text-sm">{report.steps.map((step, index) => <li key={step.key} className="flex justify-between gap-4 py-2.5"><span>{labels[index]}</span><strong className="shrink-0 tabular-nums">{number.format(step.sessions)}</strong></li>)}</ol>
    <p className="text-sm font-semibold">Ukończenie: {number.format(completed)} z {number.format(entrants)} sesji{entrants >= 20 ? ` (${number.format(Math.round(completed / entrants * 100))}%)` : entrants === 0 ? " · brak bazy" : " · bez procentu przy małej próbie"}</p>
    <dl className="space-y-1 text-xs text-muted-foreground"><div className="flex justify-between gap-4"><dt>{routeLabel}</dt><dd className="tabular-nums">{number.format(report.routeViewSessions)}</dd></div>
      <div className="flex justify-between gap-4"><dt>{proofLabel}</dt><dd className="tabular-nums">{number.format(report.proofExposures)}</dd></div>
      {venueProofLabel ? <div className="flex justify-between gap-4"><dt>{venueProofLabel}</dt><dd className="tabular-nums">{number.format(report.venueProofExposures)}</dd></div> : null}</dl>
    <p className="text-xs text-muted-foreground">Widok strony jest zasięgiem trasy poza lejkiem; ekspozycja nie potwierdza przeczytania. Kliknięcie kontaktu oznacza intencję, nie pozyskany lead.</p>
  </CardContent></Card>;
}

function DecisionRanking({ title, rows, unit, empty, note }: { title: string; rows: Array<{ label: string; value: number }>; unit: string; empty: string; note: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">
    {rows.length ? <Table><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead className="text-right">{unit}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={`${row.label}-${index}`}><TableCell className="break-words font-semibold">{row.label}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.value)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">{empty}</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
  </CardContent></Card>;
}

function Ranking({ title, rows, metricLabel, empty }: { title:string; rows:Array<{label:string;value:number}>; metricLabel:string; empty:string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{rows.length ? <Table><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead className="text-right">{metricLabel}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index)=><TableRow key={`${row.label}-${index}`}><TableCell className="font-bold">{row.label}</TableCell><TableCell className="text-right tabular-nums">{row.value}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}
