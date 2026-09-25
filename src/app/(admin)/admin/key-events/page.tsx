import Link from "next/link";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/admin";
import { type DashboardRange } from "@/lib/dashboard-range";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { EVENT_SEMANTICS, OUTCOME_METRICS, type OutcomeReport } from "@/lib/analytics/outcome-contract";
import { getOutcomeReport } from "@/lib/analytics/outcomes";
import { REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const number = new Intl.NumberFormat("pl-PL");

export default async function KeyEventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const request = resolveAnalyticsReportRequest(params);
  const { range, scope } = request;
  const invalidCustom = request.status === "invalid";
  const { invalidFrom, invalidTo, reversed } = request.custom;
  const report = request.status === "valid" ? await getOutcomeReport(range.from, range.toExclusive, scope) : null;

  return <div className="min-w-0 space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Key Events / Outcomes</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Istotne działania zapisane w przyjętej analityce. Każde zdarzenie liczymy osobno, również gdy jedna sesja wykona je kilka razy.</p>
    </header>

    {invalidCustom ? <AdminNotice tone="error" title="Nieprawidłowy zakres dat">Podaj poprawne daty w kolejności od wcześniejszej do późniejszej. Raport nie został przeliczony.</AdminNotice> : request.status === "too_long" ?
      <AdminNotice tone="error">Zakres jest dłuższy niż 366 dni. Wybierz krótszy okres.</AdminNotice> : !report ?
      <AdminNotice tone="error" title="Odczyt Key Events niedostępny"><p>Brak odczytu nie oznacza zerowej aktywności.</p><Link href={`/admin/key-events?${analyticsReportQuery(range, scope)}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Ponów odczyt</Link></AdminNotice> :
      <OutcomeResults report={report} range={range} scope={scope} />}

    <section id="outcome-settings" aria-label="Ustawienia raportu" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Okres zdarzeń</h2>
        <p className="text-xs text-muted-foreground">{invalidCustom ? "Popraw zakres własny poniżej." : `Aktywny zakres: ${range.from}–${range.toInclusive}`}</p>
        <nav aria-label="Okres Key Events" className="flex flex-wrap gap-2">
          {([ ["today","Dziś"], ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([key,label]) =>
            <Link key={key} href={`/admin/key-events?${analyticsReportQuery(range, scope, { rangeKey: key })}`}
              aria-current={range.key === key ? "page" : undefined}
              className={cn(buttonVariants({ variant: range.key === key ? "accent" : "outline" }), "min-h-11")}>{label}</Link>)}
        </nav>
        <form method="get" action="/admin/key-events" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="range" value="custom" />
          {scope === "diagnostic" ? <Input type="hidden" name="scope" value={scope} /> : null}
          <div className="space-y-2"><Label htmlFor="outcome-from">Od</Label><Input id="outcome-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom ? request.custom.from : ""} aria-invalid={invalidFrom || reversed || undefined} aria-describedby={invalidCustom ? "outcome-date-error" : undefined} required /></div>
          <div className="space-y-2"><Label htmlFor="outcome-to">Do</Label><Input id="outcome-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom ? request.custom.to : ""} aria-invalid={invalidTo || reversed || undefined} aria-describedby={invalidCustom ? "outcome-date-error" : undefined} required /></div>
          <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
        </form>
        {invalidCustom ? <p id="outcome-date-error" className="text-sm text-destructive">Sprawdź daty „Od” i „Do”: obie muszą być poprawne, a początek nie może być późniejszy niż koniec.</p> : null}
        <p className="text-xs text-muted-foreground">Dni według Europe/Warsaw; początek dnia włącznie, początek następnego dnia wyłącznie. Maksymalnie 366 dni.</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Zakres ruchu</h2>
        <nav aria-label="Zakres ruchu Key Events" className="flex flex-wrap gap-2">
          {REPORTING_SCOPES.map((value) => <Link key={value} href={`/admin/key-events?${analyticsReportQuery(range, value)}`}
            aria-current={scope === value ? "page" : undefined}
            className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline" }), "h-auto min-h-11 max-w-full whitespace-normal text-left")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">Business: production/external. Diagnostic: wszystkie przyjęte zdarzenia, również preview, test, internal i bot. Filtr działa przed zliczaniem.</p>
      </div>
    </section>

    <Card><CardHeader><CardTitle>Jak czytać wyniki</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed">
      <p><strong>{OUTCOME_METRICS.acceptedEvents.label}</strong> liczą każde wystąpienie, także powtórzenia. To nie jest liczba osób ani sesji.</p>
      <p><strong>{OUTCOME_METRICS.consentedSessionsWithEvent.label}</strong> liczą odrębne sesje z co najmniej jednym takim zdarzeniem. Cookieless nie ma sesji.</p>
      <p>Suma cookieless i consented daje łączną liczbę zdarzeń. Key Event może nie mieć kontekstu kampanii; nie oznacza przypisania kampanii ani współczynnika konwersji.</p>
    </CardContent></Card>
  </div>;
}

function OutcomeResults({ report, range, scope }: { report: OutcomeReport; range: DashboardRange; scope: ReportingScope }) {
  const total = report.outcomes.reduce((sum, row) => sum + row.acceptedEvents, 0);
  return <section aria-labelledby="outcome-results" className="space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="outcome-results" className="text-lg font-bold">Wyniki: {number.format(total)} zdarzeń</h2>
      <p className="text-xs text-muted-foreground">{range.from}–{range.toInclusive} · {REPORTING_SCOPE_LABELS[scope]} · <a href="#outcome-settings" className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Zmień zakres</a></p>
    </div>
    {total === 0 ? <AdminEmpty title="Brak Key Events w tym zakresie." description="Zmień daty lub zakres ruchu. Pusty Business może współistnieć z danymi Diagnostic." /> : null}
    <div className="grid gap-4 lg:grid-cols-2">
      {report.outcomes.map((row) => {
        const definition = EVENT_SEMANTICS[row.eventName];
        return <Card key={row.eventName} className="min-w-0">
          <CardHeader className="space-y-2"><CardTitle className="break-words text-lg">{definition.label}</CardTitle><p className="text-sm leading-relaxed text-muted-foreground">{definition.meaning}</p><p className="text-xs text-muted-foreground"><code>{row.eventName}</code></p></CardHeader>
          <CardContent>
            <p className="text-3xl font-black tabular-nums">{number.format(row.acceptedEvents)}</p><p className="text-sm text-muted-foreground">przyjętych zdarzeń · nie osób</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Cookieless</dt><dd className="mt-1 font-bold tabular-nums">{number.format(row.cookielessEvents)}</dd></div>
              <div><dt className="text-muted-foreground">Consented</dt><dd className="mt-1 font-bold tabular-nums">{number.format(row.consentedEvents)}</dd></div>
              <div className="col-span-2 sm:col-span-1"><dt className="text-muted-foreground">Sesje consented ze zdarzeniem</dt><dd className="mt-1 font-bold tabular-nums">{number.format(row.consentedSessionsWithEvent)}</dd></div>
            </dl>
          </CardContent>
        </Card>;
      })}
    </div>
  </section>;
}
