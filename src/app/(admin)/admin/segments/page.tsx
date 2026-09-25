import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/admin";
import { type DashboardRange } from "@/lib/dashboard-range";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { DEFAULT_SEGMENT_KEY, parseSegmentKey, SEGMENT_DEFINITIONS, shareOfBase, type SegmentKey, type SegmentReport } from "@/lib/analytics/segment-contract";
import { getSegmentReport } from "@/lib/analytics/segments";
import { REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const number = new Intl.NumberFormat("pl-PL");
const percent = new Intl.NumberFormat("pl-PL", { style: "percent", maximumFractionDigits: 1 });

function href(range: DashboardRange, scope: ReportingScope, segment: SegmentKey, rangeKey?: Exclude<DashboardRange["key"], "custom">) {
  return `/admin/segments?${analyticsReportQuery(range, scope, { rangeKey, extra: { segment } })}`;
}

function formatShare(sessions: number, base: number) {
  const value = shareOfBase(sessions, base);
  return value === null ? "Brak bazy" : percent.format(value);
}

export default async function SegmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const request = resolveAnalyticsReportRequest(params);
  const { range, scope } = request;
  const requestedSegment = params.segment;
  const parsedSegment = parseSegmentKey(requestedSegment);
  const selectedKey = parsedSegment ?? DEFAULT_SEGMENT_KEY;
  const invalidSegment = requestedSegment !== undefined && parsedSegment === null;
  const invalidCustom = request.status === "invalid";
  const report = request.status === "valid" ? await getSegmentReport(range.from, range.toExclusive, scope, selectedKey) : null;
  const selectedDefinition = SEGMENT_DEFINITIONS.find((definition) => definition.key === selectedKey)!;

  return <div className="min-w-0 space-y-7">
    <header className="max-w-3xl space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Segmenty sesji</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">Zdefiniowane przez system grupy sesji consented, zaobserwowanych w wybranym oknie raportowania. Jedna sesja może należeć do kilku segmentów.</p>
    </header>

    <section aria-label="Ustawienia segmentów" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Okres zdarzeń</h2>
        <p className="text-xs text-muted-foreground">{range.from}–{range.toInclusive} · dni według Europe/Warsaw, początek włącznie, następny dzień wyłącznie</p>
        <nav aria-label="Okres segmentów" className="flex flex-wrap gap-2">
          {([ ["today","Dziś"], ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([key,label]) =>
            <Link key={key} href={href(range,scope,selectedKey,key)} aria-current={range.key === key ? "page" : undefined} className={cn(buttonVariants({ variant: range.key === key ? "accent" : "outline" }), "min-h-11")}>{label}</Link>)}
        </nav>
        <form method="get" action="/admin/segments" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="range" value="custom" /><Input type="hidden" name="segment" value={selectedKey} />
          {scope === "diagnostic" ? <Input type="hidden" name="scope" value={scope} /> : null}
          <div className="space-y-2"><Label htmlFor="segments-from">Od</Label><Input id="segments-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom ? request.custom.from : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <div className="space-y-2"><Label htmlFor="segments-to">Do</Label><Input id="segments-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom ? request.custom.to : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
        </form>
        <p className="text-xs text-muted-foreground">Maksymalnie 366 dni.</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Zakres ruchu</h2>
        <nav aria-label="Zakres ruchu segmentów" className="flex flex-wrap gap-2">
          {REPORTING_SCOPES.map((value) => <Link key={value} href={href(range,value,selectedKey)} aria-current={scope === value ? "page" : undefined} className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline" }), "h-auto min-h-11 max-w-full whitespace-normal text-left")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">Business obejmuje tylko przyjęte zdarzenia production/external. Diagnostic obejmuje wszystkie przyjęte zdarzenia, również preview, test i internal. Filtr działa przed membership.</p>
      </div>
    </section>

    {invalidCustom ? <Card role="alert"><CardHeader><CardTitle>Nieprawidłowy zakres dat</CardTitle></CardHeader><CardContent>Podaj poprawne daty od wcześniejszej do późniejszej. Raport nie został przeliczony.</CardContent></Card> : request.status === "too_long" ?
      <Card role="alert"><CardContent className="pt-5">Wybierz zakres nie dłuższy niż 366 dni.</CardContent></Card> : !report ?
      <Card role="alert"><CardHeader><CardTitle>Odczyt segmentów niedostępny</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>Brak odczytu nie oznacza zerowej aktywności.</p><Link href={href(range,scope,selectedKey)} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Ponów odczyt</Link></CardContent></Card> : <>
        {invalidSegment ? <p role="status" className="text-sm text-muted-foreground">Nieznany segment. Pokazujemy domyślny preset.</p> : null}
        <section aria-labelledby="segments-population" className="space-y-3 border-b pb-5">
          <h2 id="segments-population" className="text-lg font-bold">Populacja bazowa</h2>
          <p className="text-4xl font-black tabular-nums">{number.format(report.baseSessions)}</p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Unikalne sesje consented z co najmniej jednym przyjętym zdarzeniem w tym okresie i zakresie ruchu. To baza każdego udziału poniżej, nie liczba wszystkich odwiedzających.</p>
          {report.baseSessions === 0 ? <p className="text-sm font-medium">Brak kwalifikujących sesji. Udziały nie mają bazy; Diagnostic może zawierać dane, gdy Business jest pusty.</p> : null}
        </section>
        <section aria-labelledby="segments-list" className="space-y-3">
          <h2 id="segments-list" className="text-lg font-bold">Presety systemowe</h2>
          <p className="text-sm text-muted-foreground">Segmenty mogą się nakładać. Suma liczebności i udziałów nie musi równać się populacji bazowej ani 100%.</p>
          <div className="divide-y rounded-xl border bg-card">
            {SEGMENT_DEFINITIONS.map((definition, index) => {
              const sessions = report.segments[index].sessions;
              return <div key={definition.key} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="min-w-0 space-y-1"><h3 className="font-bold">{definition.label}</h3><p className="text-sm text-muted-foreground">{definition.description}</p></div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="font-bold tabular-nums">{number.format(sessions)} sesji</p><p className="text-xs text-muted-foreground">{formatShare(sessions,report.baseSessions)} bazy</p></div><Link href={href(range,scope,definition.key)} aria-current={selectedKey === definition.key ? "page" : undefined} className={cn(buttonVariants({ variant: selectedKey === definition.key ? "accent" : "outline" }), "min-h-11")}>Zobacz</Link></div>
              </div>;
            })}
          </div>
        </section>
        <Snapshot report={report} label={selectedDefinition.label} membership={selectedDefinition.membership} requiredData={selectedDefinition.requiredData} limitation={selectedDefinition.limitation} />
      </>}

    <Card><CardHeader><CardTitle>Granice analizy</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed">
      <p><strong>Tylko sesje consented.</strong> Zdarzenia cookieless nie mają session_id, nie tworzą membership ani nie zwiększają populacji bazowej. Nie łączymy ich ze sobą ani z sesjami.</p>
      <p>Membership wynika wyłącznie ze zdarzeń w wybranym oknie i zakresie ruchu. Zdarzenie sprzed początku albo po końcu okresu nie kwalifikuje sesji. Powtórzenia zdarzenia nie zwiększają liczby sesji.</p>
      <p>Segmenty nie identyfikują osób ani odwiedzających między sesjami. Nie używamy visitor_id do łączenia sesji. Udział segmentu to odsetek tej samej bazowej populacji consented, a nie część rozłącznego podziału.</p>
    </CardContent></Card>
  </div>;
}

function Snapshot({ report, label, membership, requiredData, limitation }: { report: SegmentReport; label: string; membership: string; requiredData: string; limitation: string }) {
  const selected = report.selected;
  return <section aria-labelledby="segments-snapshot" className="space-y-4">
    <div className="space-y-1"><h2 id="segments-snapshot" className="text-lg font-bold">Wybrany segment: {label}</h2><p className="text-sm text-muted-foreground">Porównanie z wszystkimi kwalifikującymi sesjami consented w tym samym oknie.</p></div>
    <dl className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {([ ["Sesje",number.format(selected.sessions)], ["Udział w bazie",formatShare(selected.sessions,report.baseSessions)], ["Wyświetlenia stron",number.format(selected.pageViews)], ["Sesje z Key Event",number.format(selected.sessionsWithKeyEvent)] ] as const).map(([name,value]) => <div key={name} className="bg-card p-4"><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd></div>)}
    </dl>
    <Card><CardHeader><CardTitle className="text-base">Zdarzenia w wybranych sesjach</CardTitle></CardHeader><CardContent><dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">contact_click</dt><dd className="font-bold tabular-nums">{number.format(selected.contactClickEvents)}</dd></div><div><dt className="text-muted-foreground">outbound_click</dt><dd className="font-bold tabular-nums">{number.format(selected.outboundClickEvents)}</dd></div><div><dt className="text-muted-foreground">tracking_entry</dt><dd className="font-bold tabular-nums">{number.format(selected.trackingEntries)}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Tu liczymy wystąpienia zdarzeń; sesja może mieć ich kilka.</p></CardContent></Card>
    <div className="space-y-2 text-sm leading-relaxed"><h3 className="font-bold">Warunek membership</h3><p>{membership}</p><p className="text-muted-foreground">Wymagane dane: {requiredData}</p><p className="text-muted-foreground">Ograniczenie: {limitation}</p></div>
  </section>;
}
