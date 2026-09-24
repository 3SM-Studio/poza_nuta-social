import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUNNELS, DEFAULT_FUNNEL, parseFunnelKey, type FunnelKey, type FunnelReport } from "@/lib/analytics/funnel-contract";
import { getFunnelReport } from "@/lib/analytics/funnels";
import { DEFAULT_REPORTING_SCOPE, parseReportingScope, REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { requireAdmin } from "@/lib/admin";
import { resolveDashboardRange, type DashboardRange } from "@/lib/dashboard-range";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const number = new Intl.NumberFormat("pl-PL");

function query(key: FunnelKey, range: DashboardRange, scope: ReportingScope) {
  const params = new URLSearchParams({ funnel: key, range: range.key });
  if (range.key === "custom") { params.set("from", range.from); params.set("to", range.toInclusive); }
  if (scope === "diagnostic") params.set("scope", scope);
  return params.toString();
}

export default async function FunnelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const key = parseFunnelKey(typeof params.funnel === "string" ? params.funnel : null) ?? DEFAULT_FUNNEL;
  const scope = parseReportingScope(typeof params.scope === "string" ? params.scope : null) ?? DEFAULT_REPORTING_SCOPE;
  const range = resolveDashboardRange(params);
  const invalidCustom = params.range === "custom" && range.key !== "custom";
  const days = (Date.parse(`${range.toExclusive}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
  const report = !invalidCustom && days <= 366 ? await getFunnelReport(key, range.from, range.toExclusive, scope) : null;
  const definition = FUNNELS[key];

  return <div className="space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Analiza funnelu</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Sprawdź, ile sesji z potwierdzoną zgodą wykonało kolejne działania w ustalonej kolejności. Jedna sesja liczy się najwyżej raz na krok.</p>
    </header>

    <section aria-labelledby="funnel-presets" className="space-y-3">
      <h2 id="funnel-presets" className="text-lg font-bold">Wybierz ścieżkę</h2>
      <nav aria-label="Gotowe funnele" className="flex flex-wrap gap-2">
        {(Object.keys(FUNNELS) as FunnelKey[]).map((preset) => <Link key={preset} href={`/admin/funnels?${query(preset, range, scope)}`}
          aria-current={preset === key ? "page" : undefined}
          className={cn(buttonVariants({ variant: preset === key ? "accent" : "outline" }), "h-auto min-h-11 max-w-full whitespace-normal text-left")}>{FUNNELS[preset].label}</Link>)}
      </nav>
      <p className="max-w-3xl text-sm text-muted-foreground">{definition.description}</p>
    </section>

    {invalidCustom ? <Card role="alert"><CardHeader><CardTitle>Nieprawidłowy zakres dat</CardTitle></CardHeader><CardContent>Podaj poprawne daty w kolejności od wcześniejszej do późniejszej. Raport nie został przeliczony.</CardContent></Card> : days > 366 ?
      <Card role="alert"><CardContent className="pt-5">Zakres jest dłuższy niż 366 dni. Wybierz krótszy okres.</CardContent></Card> : !report ?
      <Card role="alert"><CardHeader><CardTitle>Odczyt funnelu niedostępny</CardTitle></CardHeader><CardContent className="space-y-3"><p>Brak odczytu nie oznacza zerowej aktywności.</p><Link href={`/admin/funnels?${query(key, range, scope)}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Ponów odczyt</Link></CardContent></Card> :
      <FunnelResults report={report} definition={definition} range={range} scope={scope} />}

    <section id="funnel-settings" aria-label="Ustawienia raportu" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Okres zdarzeń</h2>
        <p className="text-xs text-muted-foreground">{invalidCustom ? "Popraw zakres własny poniżej." : `Aktywny zakres: ${range.from}–${range.toInclusive}${range.key === "custom" ? " · zakres własny" : ""}`}</p>
        <nav aria-label="Okres analizy funnelu" className="flex flex-wrap gap-2">
          {([ ["today","Dziś"], ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([rangeKey,label]) =>
            <Link key={rangeKey} href={`/admin/funnels?${new URLSearchParams({ funnel: key, range: rangeKey, ...(scope === "diagnostic" ? { scope } : {}) })}`}
              aria-current={range.key === rangeKey ? "page" : undefined}
              className={cn(buttonVariants({ variant: range.key === rangeKey ? "accent" : "outline" }), "min-h-11")}>{label}</Link>)}
        </nav>
        <form method="get" action="/admin/funnels" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="funnel" value={key} /><Input type="hidden" name="range" value="custom" />
          {scope === "diagnostic" ? <Input type="hidden" name="scope" value={scope} /> : null}
          <div className="space-y-2"><Label htmlFor="funnel-from">Od</Label><Input id="funnel-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom && typeof params.from === "string" ? params.from : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <div className="space-y-2"><Label htmlFor="funnel-to">Do</Label><Input id="funnel-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom && typeof params.to === "string" ? params.to : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
        </form>
        <p className="text-xs text-muted-foreground">Maksymalnie 366 dni. Dni liczymy według Europe/Warsaw.</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Zakres ruchu</h2>
        <nav aria-label="Zakres ruchu funnelu" className="flex flex-wrap gap-2">
          {REPORTING_SCOPES.map((value) => <Link key={value} href={`/admin/funnels?${query(key, range, value)}`}
            aria-current={scope === value ? "page" : undefined}
            className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline" }), "h-auto min-h-11 max-w-full whitespace-normal text-left")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">Ruch biznesowy obejmuje sesje z przyjętymi zdarzeniami production/external. Diagnostyka obejmuje także ruch testowy, wewnętrzny i środowiska nieprodukcyjne, ale nadal tylko sesje consented.</p>
      </div>
    </section>

    <Card><CardHeader><CardTitle>Jak czytać funnel</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed">
      <p><strong>Populacja: wyłącznie sesje z potwierdzoną zgodą.</strong> Funnel nie analizuje zdarzeń cookieless, ponieważ nie mają one identyfikatora sesji pozwalającego bezpiecznie odtworzyć kolejność działań.</p>
      <p>Wejścia to unikalne sesje z pierwszym krokiem. Każdy następny krok liczy unikalne sesje, które wykonały wszystkie poprzednie kroki w kolejności. Inne zdarzenia między krokami są dozwolone; powtórzenia nie zwiększają liczby sesji.</p>
      <p>Konwersja kroku = sesje na kroku ÷ sesje na poprzednim kroku. Odpływ = sesje na poprzednim kroku − sesje na bieżącym kroku; jego procent ma tę samą bazę. Ukończenie = sesje na ostatnim kroku ÷ wejścia. Gdy baza wynosi zero, procentu nie wyznaczamy.</p>
      <p className="text-muted-foreground">{invalidCustom ? "Po poprawieniu zakresu" : `W zakresie ${range.from}–${range.toInclusive}`} wszystkie kroki muszą wystąpić przed początkiem następnego dnia według Europe/Warsaw. Późniejsze działania sesji poza zakresem nie kończą funnelu. Wyników nie uogólniamy na cały ruch.</p>
    </CardContent></Card>
  </div>;
}

function FunnelResults({ report, definition, range, scope }: { report: FunnelReport; definition: typeof FUNNELS[FunnelKey]; range: DashboardRange; scope: ReportingScope }) {
  return <section aria-labelledby="funnel-results" className="space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="funnel-results" className="text-lg font-bold">{definition.label}</h2>
      <p className="text-xs text-muted-foreground">{range.from}–{range.toInclusive} · {REPORTING_SCOPE_LABELS[scope]} · tylko sesje consented · <a href="#funnel-settings" className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Zmień zakres</a></p>
    </div>
    {report.eligibleSessions === 0 ? <Card><CardContent className="space-y-2 pt-5 text-sm"><p className="font-bold">Brak sesji consented w wybranym zakresie ruchu.</p><p className="text-muted-foreground">Zmień daty lub zakres ruchu. Zdarzenia cookieless nie tworzą sesji dla tej analizy.</p></CardContent></Card> : report.entrants === 0 ?
      <Card><CardContent className="space-y-2 pt-5 text-sm"><p className="font-bold">Żadna sesja nie rozpoczęła tej ścieżki.</p><p className="text-muted-foreground">W zakresie było {number.format(report.eligibleSessions)} sesji consented, lecz żadna nie wykonała pierwszego kroku. Współczynnik ukończenia nie ma bazy.</p></CardContent></Card> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Wejścia · sesje consented</p><p className="mt-1 text-3xl font-black tabular-nums">{number.format(report.entrants)}</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Ukończenie całej ścieżki</p><p className="mt-1 text-3xl font-black tabular-nums">{percentage(report.completionRate)}</p><p className="mt-1 text-xs text-muted-foreground">Ostatni krok ÷ wejścia</p></CardContent></Card>
    </div>
    <ol className="space-y-3" aria-label="Kolejne kroki funnelu">
      {report.steps.map((step, index) => <li key={step.key} className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">Krok {index + 1} z {report.steps.length}</p><h3 className="mt-1 text-base font-bold">{definition.steps[index].label}</h3></div>
          <p className="text-right"><span className="block text-2xl font-black tabular-nums">{number.format(step.sessions)}</span><span className="block text-xs text-muted-foreground">sesji consented</span></p>
        </div>
        {index > 0 ? <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div><dt className="text-muted-foreground">Konwersja z poprzedniego kroku</dt><dd className="mt-1 font-bold tabular-nums">{percentage(step.conversionRate)}</dd></div>
          <div><dt className="text-muted-foreground">Odpływ z poprzedniego kroku</dt><dd className="mt-1 font-bold tabular-nums">{number.format(step.dropOff ?? 0)} sesji{step.dropOffRate === null ? "" : ` · ${percentage(step.dropOffRate)}`}</dd></div>
        </dl> : null}
      </li>)}
    </ol>
  </section>;
}

function percentage(value: number | null) { return value === null ? "Brak bazy" : `${number.format(value)}%`; }
