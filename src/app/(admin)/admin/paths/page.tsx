import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPathsReport } from "@/lib/analytics/paths";
import { parsePathNode, share, type PathCount, type PathsReport } from "@/lib/analytics/paths-contract";
import { REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { requireAdmin } from "@/lib/admin";
import { type DashboardRange } from "@/lib/dashboard-range";
import { publicPaths } from "@/lib/public-paths";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const number = new Intl.NumberFormat("pl-PL");

function href(range: DashboardRange, scope: ReportingScope, path: string | null, rangeKey?: Exclude<DashboardRange["key"], "custom">) {
  return `/admin/paths?${analyticsReportQuery(range, scope, { rangeKey, extra: path !== null ? { path } : undefined })}`;
}

export default async function PathsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const request = resolveAnalyticsReportRequest(params);
  const { range, scope } = request;
  const invalidCustom = request.status === "invalid";
  const rawPath = params.path;
  const path = parsePathNode(rawPath)?.path ?? null;
  const invalidPath = rawPath !== undefined && path === null;
  const report = request.status === "valid" ? await getPathsReport(range.from, range.toExclusive, scope, path) : null;

  return <div className="space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Ścieżki stron</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Kolejność odsłon publicznych stron w pojedynczych sesjach z potwierdzoną zgodą. Każda sesja ma własną sekwencję.</p>
      <p className="text-sm font-semibold">Tylko sesje consented · {range.from}–{range.toInclusive} · {REPORTING_SCOPE_LABELS[scope]}</p>
    </header>

    <section aria-label="Ustawienia analizy" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Okres zdarzeń</h2>
        <nav aria-label="Okres analizy ścieżek" className="flex flex-wrap gap-2">
          {([ ["today","Dziś"], ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([key,label]) =>
            <Link key={key} href={href(range,scope,path,key)} aria-current={range.key === key ? "page" : undefined}
              className={cn(buttonVariants({ variant: range.key === key ? "accent" : "outline" }), "min-h-11")}>{label}</Link>)}
        </nav>
        <form method="get" action="/admin/paths" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="range" value="custom" />
          {scope === "diagnostic" ? <Input type="hidden" name="scope" value={scope} /> : null}
          {path !== null ? <Input type="hidden" name="path" value={path} /> : null}
          <div className="space-y-2"><Label htmlFor="paths-from">Od</Label><Input id="paths-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom ? request.custom.from : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <div className="space-y-2"><Label htmlFor="paths-to">Do</Label><Input id="paths-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom ? request.custom.to : ""} aria-invalid={invalidCustom || undefined} required /></div>
          <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
        </form>
        <p className="text-xs text-muted-foreground">Maksymalnie 366 dni. Dni liczymy według Europe/Warsaw.</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Zakres ruchu</h2>
        <nav aria-label="Zakres ruchu ścieżek" className="flex flex-wrap gap-2">
          {REPORTING_SCOPES.map((value) => <Link key={value} href={href(range,value,path)} aria-current={scope === value ? "page" : undefined}
            className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline" }), "min-h-11 w-full max-w-full whitespace-normal text-center sm:w-auto")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">Business: przyjęte zdarzenia production/external. Diagnostic: także przyjęte zdarzenia testowe, wewnętrzne i z innych środowisk. Zakres jest stosowany przed ułożeniem kroków.</p>
      </div>
    </section>

    {invalidCustom ? <Notice title="Nieprawidłowy zakres dat" body="Podaj poprawne daty w kolejności od wcześniejszej do późniejszej." /> : request.status === "too_long" ?
      <Notice title="Zbyt długi zakres" body="Wybierz okres nie dłuższy niż 366 dni." /> : !report ?
      <Card role="alert"><CardHeader><CardTitle>Odczyt ścieżek niedostępny</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>Brak odczytu nie oznacza zerowej aktywności.</p><Link href={href(range,scope,path)} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Ponów odczyt</Link></CardContent></Card> : <>
      {invalidPath ? <Notice title="Nieprawidłowa strona" body="Wybrany path nie ma poprawnego formatu. Wybierz stronę z raportu." /> : null}
      <Results report={report} range={range} scope={scope} />
    </>}

    <Card><CardHeader><CardTitle>Jak czytać ścieżki</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed">
      <p><strong>Populacja: tylko przyjęte odsłony w sesjach consented.</strong> Cookieless nie ma session identity i nie uczestniczy w ścieżkach. Wyniku nie przenosimy na cały ruch.</p>
      <p>To okno zdarzeń, nie kohorta rozpoczętych sesji. „Pierwsza obserwowana strona” może mieć wcześniejsze kroki poza zakresem; „brak kolejnej strony w zakresie” nie dowodzi opuszczenia witryny.</p>
      <p>Jedna sesja daje jeden pierwszy krok i jeden prefiks do 3 odsłon. Dla wybranej strony bierzemy jej pierwsze wystąpienie w sesji; następna i poprzednia strona są bezpośrednimi sąsiadami wśród odsłon. Inne zdarzenia między nimi nie przerywają sekwencji. Powtórne odsłony zostają.</p>
      <p>Każdy wynik to liczba unikalnych sesji. Udział pierwszego kroku i krótkiej ścieżki ma bazę „sesje z odsłoną strony”. Udział następnego i poprzedniego kroku ma bazę „sesje z wybraną stroną”. Bez bazy nie pokazujemy procentu.</p>
      <p>Strona jest identyfikowana przez zapisany canonical path, bez query string i fragmentu. Historyczne ścieżki zachowują zapisane wartości. Tytuł strony i tekst widoczny w interfejsie nie zmieniają tożsamości węzła.</p>
    </CardContent></Card>
  </div>;
}

function Results({ report, range, scope }: { report: PathsReport; range: DashboardRange; scope: ReportingScope }) {
  const selected = report.selectedPath;
  return <div className="space-y-6">
    <section aria-labelledby="paths-overview" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="paths-overview" className="text-xl font-bold">Obserwowane ścieżki</h2><p className="text-sm text-muted-foreground">{number.format(report.pathSessions)} sesji z odsłoną strony</p></div>
      {report.pathSessions === 0 ? <p className="rounded-xl border bg-card p-5 text-sm">Brak sesji consented z odsłoną strony w tym zakresie ruchu. Zmień daty albo zakres; cookieless nie utworzy ścieżki.</p> :
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Pierwsza obserwowana strona w zakresie</CardTitle></CardHeader><CardContent><ol className="divide-y">{report.entries.map((entry) =>
            <li key={entry.path} className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><Link href={href(range,scope,entry.path)} className="min-w-0 break-all font-semibold underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{entry.path}</Link><Count sessions={entry.sessions} population={report.pathSessions} /></li>)}</ol></CardContent></Card>
          <Card><CardHeader><CardTitle>Najczęstsze krótkie ścieżki</CardTitle></CardHeader><CardContent><ol className="divide-y">{report.shortPaths.map((item) =>
            <li key={JSON.stringify(item.paths)} className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="min-w-0 break-all font-medium">{item.paths.join(" → ")}</span><Count sessions={item.sessions} population={report.pathSessions} /></li>)}</ol><p className="mt-4 text-xs text-muted-foreground">Jeden prefiks do 3 stron na sesję. Strzałki oznaczają kolejność odsłon.</p></CardContent></Card>
        </div>}
    </section>
    <section aria-labelledby="paths-detail" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="paths-detail" className="text-xl font-bold">Kroki wokół wybranej strony</h2>{selected !== null ? <Link href={href(range,scope,null)} className="text-sm underline underline-offset-4">Wyczyść wybór</Link> : null}</div>
      <nav aria-label="Wybierz stronę do analizy" className="flex flex-wrap gap-2">{publicPaths.map((pagePath) => <Link key={pagePath} href={href(range,scope,pagePath)} aria-current={selected === pagePath ? "page" : undefined} className={cn(buttonVariants({ variant: selected === pagePath ? "accent" : "outline" }), "min-h-11 max-w-full break-all")}>{pagePath}</Link>)}</nav>
      {selected === null ? <p className="rounded-xl border bg-card p-5 text-sm">Wybierz stronę powyżej lub z listy pierwszych obserwowanych kroków, aby zobaczyć jej sąsiadów.</p> : <>
        <p className="break-all text-sm">Wybrana strona: <strong>{selected}</strong> · {number.format(report.selectedSessions)} sesji</p>
        {report.selectedSessions === 0 ? <p className="rounded-xl border bg-card p-5 text-sm">Ta strona nie występuje w wybranym okresie i zakresie ruchu. Wybierz inną stronę lub zmień ustawienia raportu.</p> :
          <div className="grid gap-5 lg:grid-cols-2">
            <Distribution title="Bezpośrednio następna strona" rows={report.next} population={report.selectedSessions} empty="Brak kolejnej obserwowanej strony w zakresie dla wybranego węzła." />
            <Distribution title="Bezpośrednio poprzednia strona" rows={report.previous} population={report.selectedSessions} empty="Brak poprzedniej obserwowanej strony w zakresie dla wybranego węzła." />
          </div>}
        {report.selectedSessions > 0 ? <Card><CardHeader><CardTitle>Granica obserwacji</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>{number.format(report.noNextInRange)} sesji</strong> bez kolejnej obserwowanej strony w zakresie · {formatShare(report.noNextInRange,report.selectedSessions)} wybranych sesji.</p><p className="text-muted-foreground">To nie jest exit. Sesja mogła trwać dalej, a następna odsłona mogła wystąpić po końcu okna.</p></CardContent></Card> : null}
      </>}
    </section>
  </div>;
}

function Distribution({ title, rows, population, empty }: { title: string; rows: PathCount[]; population: number; empty: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <ol className="divide-y">{rows.map((row) => <li key={row.path} className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><span className="min-w-0 break-all font-semibold">{row.path}</span><Count sessions={row.sessions} population={population} /></li>)}</ol>}</CardContent></Card>;
}

function Count({ sessions, population }: { sessions: number; population: number }) {
  return <span className="shrink-0 text-right text-sm"><strong className="block tabular-nums">{number.format(sessions)} sesji</strong><span className="text-xs text-muted-foreground">{formatShare(sessions,population)}</span></span>;
}
function formatShare(sessions: number, population: number) { const value = share(sessions,population); return value === null ? "Brak bazy" : `${number.format(value)}%`; }
function Notice({ title, body }: { title: string; body: string }) { return <Card role="alert"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="text-sm">{body}</CardContent></Card>; }
