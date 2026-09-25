import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/admin";
import { type DashboardRange } from "@/lib/dashboard-range";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { getAttributionReport } from "@/lib/analytics/attribution-report";
import { type AttributionBasis, type AttributionReport } from "@/lib/analytics/attribution-contract";
import { EVENT_SEMANTICS, KEY_EVENT_NAMES } from "@/lib/analytics/outcome-contract";
import { REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const number = new Intl.NumberFormat("pl-PL");
const basisNames: Record<AttributionBasis, string> = {
  direct_observed: "Bezpośredni kontekst zdarzenia",
  persisted_consented: "Zapisany kontekst consented",
  unattributed: "Bez przypisania",
};
const entityNames = { asset: "Asset", placement: "Placement", tracking_link: "Tracking link" } as const;

export default async function AttributionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const request = resolveAnalyticsReportRequest(params);
  const { range, scope } = request;
  const invalidCustom = request.status === "invalid";
  const { invalidFrom, invalidTo, reversed } = request.custom;
  const report = request.status === "valid" ? await getAttributionReport(range.from, range.toExclusive, scope) : null;

  return <div className="min-w-0 space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Attribution</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Deterministyczne przypisanie przyjętych Key Events na podstawie kontekstu zapisanego na tym samym zdarzeniu. Liczymy zdarzenia, nie osoby.</p>
    </header>

    {invalidCustom ? <Card role="alert"><CardHeader><CardTitle>Nieprawidłowy zakres dat</CardTitle></CardHeader><CardContent>Podaj poprawne daty w kolejności od wcześniejszej do późniejszej. Raport nie został przeliczony.</CardContent></Card> : request.status === "too_long" ?
      <Card role="alert"><CardContent className="pt-5">Zakres jest dłuższy niż 366 dni. Wybierz krótszy okres.</CardContent></Card> : !report ?
      <Card role="alert"><CardHeader><CardTitle>Odczyt Attribution niedostępny</CardTitle></CardHeader><CardContent className="space-y-3"><p>Brak odczytu nie oznacza zerowej aktywności.</p><Link href={`/admin/attribution?${analyticsReportQuery(range, scope)}`} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Ponów odczyt</Link></CardContent></Card> :
      <Results report={report} range={range} scope={scope} />}

    <section id="attribution-settings" aria-label="Ustawienia raportu" className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Okres outcome events</h2>
        <p className="text-xs text-muted-foreground">{invalidCustom ? "Popraw zakres własny poniżej." : `Aktywny zakres: ${range.from}–${range.toInclusive}`}</p>
        <nav aria-label="Okres Attribution" className="flex flex-wrap gap-2">
          {([ ["today","Dziś"], ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([key,label]) =>
            <Link key={key} href={`/admin/attribution?${analyticsReportQuery(range, scope, { rangeKey: key })}`}
              aria-current={range.key === key ? "page" : undefined}
              className={cn(buttonVariants({ variant: range.key === key ? "accent" : "outline" }), "min-h-11")}>{label}</Link>)}
        </nav>
        <form method="get" action="/admin/attribution" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="hidden" name="range" value="custom" />
          {scope === "diagnostic" ? <Input type="hidden" name="scope" value={scope} /> : null}
          <div className="space-y-2"><Label htmlFor="attribution-from">Od</Label><Input id="attribution-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom ? request.custom.from : ""} aria-invalid={invalidFrom || reversed || undefined} aria-describedby={invalidCustom ? "attribution-date-error" : undefined} required /></div>
          <div className="space-y-2"><Label htmlFor="attribution-to">Do</Label><Input id="attribution-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom ? request.custom.to : ""} aria-invalid={invalidTo || reversed || undefined} aria-describedby={invalidCustom ? "attribution-date-error" : undefined} required /></div>
          <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
        </form>
        {invalidCustom ? <p id="attribution-date-error" className="text-sm text-destructive">Sprawdź daty „Od” i „Do”: obie muszą być poprawne, a początek nie może być późniejszy niż koniec.</p> : null}
        <p className="text-xs text-muted-foreground">Dni według Europe/Warsaw; początek dnia włącznie, początek następnego dnia wyłącznie. Maksymalnie 366 dni.</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-bold">Zakres ruchu</h2>
        <nav aria-label="Zakres ruchu Attribution" className="flex flex-wrap gap-2">
          {REPORTING_SCOPES.map((value) => <Link key={value} href={`/admin/attribution?${analyticsReportQuery(range, value)}`}
            aria-current={scope === value ? "page" : undefined}
            className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline" }), "h-auto min-h-11 max-w-full whitespace-normal text-left")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
        </nav>
        <p className="text-xs leading-relaxed text-muted-foreground">Business: production/external. Diagnostic: wszystkie przyjęte zdarzenia, również preview, test, internal i bot. Filtr dotyczy outcome i działa przed agregacją.</p>
      </div>
    </section>

    <Card><CardHeader><CardTitle>Jak to liczymy</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed">
      <p>Attribution = przyjęty eligible Key Event + kontekst acquisition zapisany na tym outcome. Najpierw wybieramy bezpośrednio obserwowany kontekst zdarzenia, jeśli istnieje; w przeciwnym razie istniejący zapisany kontekst sesji consented. Kontekstów nie łączymy.</p>
      <p>Coverage = przypisane Key Event events / wszystkie przyjęte eligible Key Event events w okresie. To miara kompletności przypisania, nie conversion rate. Każde wystąpienie liczy się osobno; <code>contact_click</code> i <code>outbound_click</code> mają różne znaczenia.</p>
      <p>Cookieless może korzystać tylko z kontekstu na tym samym zdarzeniu. Link /r z wcześniejszego momentu, destination, bliskość czasowa ani wspólna ścieżka nie przypisują późniejszego outcome. Brak kontekstu jest prawidłowym wynikiem.</p>
      <p>Campaign i poziomy graph pokazujemy tylko przy zapisanym stable ID. Etykiety są bieżącym opisem; zmiana nazwy nie zmienia historycznego ID. Nie wyprowadzamy kampanii z aktualnej relacji tracking linku.</p>
    </CardContent></Card>
  </div>;
}

function Results({ report, range, scope }: { report: AttributionReport; range: DashboardRange; scope: ReportingScope }) {
  const s = report.summary;
  const count = (eventName: string, mode: string, basis: AttributionBasis) => report.splits.find((r) => r.eventName === eventName && r.mode === mode && r.basis === basis)?.events ?? 0;
  return <section aria-labelledby="attribution-results" className="space-y-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="attribution-results" className="text-lg font-bold">Wyniki: {range.from}–{range.toInclusive}</h2>
      <p className="text-xs text-muted-foreground">{REPORTING_SCOPE_LABELS[scope]} · <a href="#attribution-settings" className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Zmień zakres</a></p>
    </div>
    {s.total === 0 ? <Card><CardContent className="space-y-2 pt-5 text-sm"><p className="font-bold">Brak Key Events w tym zakresie.</p><p className="text-muted-foreground">Zmień daty lub zakres ruchu. Pusty Business może współistnieć z danymi Diagnostic.</p></CardContent></Card> : null}
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Key Event events",s.total,"Przyjęte eligible zdarzenia"],
        ["Attributed",s.attributed,"Kontekst acquisition na outcome"],
        ["Unattributed",s.unattributed,"Bez wystarczającego kontekstu"],
        ["Attribution coverage",s.coverage === null ? "—" : `${(s.coverage * 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`,"Attributed / wszystkie Key Event events"],
      ].map(([label,value,description]) => <div key={label} className="min-w-0 rounded-xl border bg-card p-4"><dt className="text-sm font-bold">{label}</dt><dd className="mt-2 text-3xl font-black tabular-nums">{typeof value === "number" ? number.format(value) : value}<span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span></dd></div>)}
    </dl>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Podstawa przypisania</CardTitle></CardHeader><CardContent><dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4"><dt>{basisNames.direct_observed}</dt><dd className="font-bold tabular-nums">{number.format(s.directObserved)}</dd></div>
        <div className="flex justify-between gap-4"><dt>{basisNames.persisted_consented}</dt><dd className="font-bold tabular-nums">{number.format(s.persistedConsented)}</dd></div>
        <div className="flex justify-between gap-4 border-t pt-3"><dt>Z campaign ID</dt><dd className="font-bold tabular-nums">{number.format(s.campaignAttributed)}</dd></div>
        <div className="flex justify-between gap-4"><dt>Częściowy kontekst bez campaign ID</dt><dd className="font-bold tabular-nums">{number.format(s.partialContext)}</dd></div>
      </dl><p className="mt-4 text-xs text-muted-foreground">Udziały podstaw odnoszą się do {number.format(s.attributed)} przypisanych zdarzeń. {number.format(s.consentedSessionsWithAttributedOutcome)} odrębnych sesji consented miało co najmniej jeden przypisany outcome; cookieless nie ma sesji.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Outcome i tryb</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
        {KEY_EVENT_NAMES.map((name) => <div key={name} className="space-y-2 border-b pb-4 last:border-0 last:pb-0"><h3 className="font-bold">{EVENT_SEMANTICS[name].label}</h3>
          {(["cookieless","consented"] as const).map((mode) => <div key={mode} className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4"><span className="font-semibold capitalize">{mode}</span><span>Direct: {number.format(count(name,mode,"direct_observed"))}</span><span>{mode === "consented" ? `Persisted: ${number.format(count(name,mode,"persisted_consented"))}` : "Persisted: —"}</span><span>Bez przypisania: {number.format(count(name,mode,"unattributed"))}</span></div>)}
        </div>)}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Unattributed</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{number.format(s.unattributed)} przyjętych outcomes nie ma wystarczającego kontekstu na swoim zdarzeniu. To nie jest błąd Data Quality.</p><p className="text-muted-foreground">Podział według outcome type i trybu jest powyżej. Cookieless nie dziedziczy wcześniejszego wejścia; consented bez zapisanego contextu także pozostaje tutaj.</p></CardContent></Card>
    <section className="space-y-3"><h3 className="text-lg font-bold">Kampanie</h3><p className="text-sm text-muted-foreground">Ranking według liczby outcomes z campaign ID zapisanym w wybranym kontekście. Jednostka: zdarzenie.</p>
      <div className="space-y-2">{report.campaigns.length ? report.campaigns.map((r) => <div key={r.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><h4 className="min-w-0 break-words font-semibold">{r.name || `ID: ${r.id}`}{r.status === "archived" ? " · archiwalna" : ""}</h4><strong className="tabular-nums">{number.format(r.events)} zdarzeń</strong></div><ul className="space-y-1 text-xs text-muted-foreground">{r.outcomes.map((outcome) => <li key={`${outcome.eventName}-${outcome.basis}`} className="flex flex-wrap justify-between gap-x-4"><span>{EVENT_SEMANTICS[outcome.eventName].label} · {basisNames[outcome.basis]}</span><span className="tabular-nums">{number.format(outcome.events)}</span></li>)}</ul></div>) : <p className="rounded-lg border p-4 text-sm text-muted-foreground">Brak outcome z udowodnionym campaign ID.</p>}</div>
      {report.campaignRows > report.campaigns.length ? <p className="text-xs text-muted-foreground">Pokazano {report.campaigns.length} z {report.campaignRows} kampanii; pełne liczniki są w podsumowaniu.</p> : null}
    </section>
    <section className="space-y-3"><h3 className="text-lg font-bold">Campaign Graph</h3><p className="text-sm text-muted-foreground">Asset, placement i tracking link tylko przy ID zapisanym na outcome. Brak campaign ID nie jest uzupełniany z aktualnej relacji.</p>
      <div className="space-y-2">{report.graph.length ? report.graph.map((r) => <div key={`${r.entityType}-${r.id}-${r.campaignId}-${r.eventName}-${r.basis}`} className="grid min-w-0 gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"><span className="min-w-0 break-words font-semibold">{entityNames[r.entityType]} · {r.label || `ID: ${r.id}`}</span><span>{EVENT_SEMANTICS[r.eventName].label}</span><span>{basisNames[r.basis]}{!r.campaignId ? " · bez campaign ID" : ""}</span><strong className="tabular-nums">{number.format(r.events)}</strong></div>) : <p className="rounded-lg border p-4 text-sm text-muted-foreground">Brak udowodnionych identyfikatorów graph.</p>}</div>
      {report.graphRows > report.graph.length ? <p className="text-xs text-muted-foreground">Pokazano {report.graph.length} z {report.graphRows} kombinacji graph.</p> : null}
    </section>
  </section>;
}
