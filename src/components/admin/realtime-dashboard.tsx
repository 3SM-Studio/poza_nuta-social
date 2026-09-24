"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REALTIME_METRICS, REALTIME_WINDOWS, realtimeMetricValue, realtimeModeShare,
  type RealtimeReport, type RealtimeWindow,
} from "@/lib/analytics/realtime-contract";
import { cn } from "cn";

const POLL_INTERVAL_MS = 30_000;
const numberFormat = new Intl.NumberFormat("pl-PL");
const timeFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Warsaw" });

function formatTime(value: string) { return timeFormat.format(new Date(value)); }

export function RealtimeDashboard({ initialReport, initialWindow }: { initialReport: RealtimeReport | null; initialWindow: RealtimeWindow }) {
  const [report, setReport] = useState(initialReport);
  const [readFailed, setReadFailed] = useState(!initialReport);
  const [refreshing, setRefreshing] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 10_000);
    inFlight.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch(`/admin/realtime/data?window=${initialWindow}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("realtime_read_failed");
      const next = await response.json() as RealtimeReport;
      if (!controller.signal.aborted) { setReport(next); setReadFailed(false); }
    } catch {
      if (!controller.signal.aborted || timedOut) setReadFailed(true);
    } finally {
      window.clearTimeout(timeout);
      if (inFlight.current === controller) inFlight.current = null;
      if (!controller.signal.aborted || timedOut) setRefreshing(false);
    }
  }, [initialWindow]);

  useEffect(() => {
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, POLL_INTERVAL_MS);
    const onVisibility = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [refresh]);

  return <div className="space-y-7">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Realtime</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Ostatnia aktywność Poza Nutą w ruchomym oknie. Liczby dotyczą zapisanych zdarzeń, a wskazana osobno liczba sesji obejmuje tylko ruch consented.</p>
        <p className="text-sm font-medium" aria-live="polite">
          Ostatni udany odczyt: {report ? <time dateTime={report.refreshedAt}>{formatTime(report.refreshedAt)}</time> : "brak"}
          {readFailed && report ? " · Dane nieaktualne — ostatnie odświeżenie nie powiodło się" : null}
          {refreshing ? " · Trwa odświeżanie…" : null}
        </p>
      </div>
      <Button variant="outline" onClick={() => void refresh()} disabled={refreshing} aria-label="Odśwież Realtime">
        <RefreshCw aria-hidden="true" /> Odśwież
      </Button>
    </header>

    <nav className="flex flex-wrap gap-2" aria-label="Ruchome okno Realtime">
      {REALTIME_WINDOWS.map((minutes) => <Link key={minutes} href={`/admin/realtime?window=${minutes}`}
        aria-current={initialWindow === minutes ? "page" : undefined}
        className={cn(buttonVariants({ variant: initialWindow === minutes ? "accent" : "outline", size: "default" }))}>
        {minutes} min
      </Link>)}
    </nav>

    {!report ? <Card role="alert"><CardHeader><CardTitle>Odczyt Realtime niedostępny</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground"><p>Nie udało się pobrać danych. Spróbuj odświeżyć widok. Nie oznacza to zera zdarzeń ani awarii publicznego zapisu.</p></CardContent></Card> : <>
      <p className="text-xs text-muted-foreground">Okno: <time dateTime={report.windowStart}>{formatTime(report.windowStart)}</time> – <time dateTime={report.windowEnd}>{formatTime(report.windowEnd)}</time> · Europe/Warsaw · wszystkie środowiska i klasy ruchu · automatyczny odczyt co 30 s na widocznej karcie</p>
      {report.totalEvents === 0 && <Card><CardContent className="pt-5 text-sm text-muted-foreground">Brak zapisanych zdarzeń w tym oknie. Zwiększ zakres do 60 minut lub sprawdź później.</CardContent></Card>}
      <section aria-labelledby="realtime-kpis" className="space-y-3">
        <h2 id="realtime-kpis" className="text-lg font-bold">Co dzieje się teraz</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {(["events", "pageViews", "contactClicks", "trackingEntries", "outboundClicks", "consentedSessionsWithActivity"] as const).map((key) =>
            <Metric key={key} metricKey={key} value={realtimeMetricValue(report, key)} />)}
        </div>
        <Button variant="ghost" className="px-0 underline underline-offset-4" aria-expanded={definitionsOpen} aria-controls="realtime-definitions" onClick={() => setDefinitionsOpen((open) => !open)}>
          {definitionsOpen ? "Ukryj definicje metryk" : "Co dokładnie liczymy?"}
        </Button>
        <Card id="realtime-definitions" hidden={!definitionsOpen}><CardContent className="space-y-4 pt-5">
          {(Object.keys(REALTIME_METRICS) as Array<keyof typeof REALTIME_METRICS>).map((key) => {
            const metric = REALTIME_METRICS[key];
            return <div key={key} className="space-y-1 text-sm"><h3 className="font-bold">{metric.label}</h3><p>{metric.explanation}</p>
              <p className="text-xs text-muted-foreground">Zakres: {metric.population}. Źródło: {metric.source}.</p></div>;
          })}
        </CardContent></Card>
      </section>

      <section aria-labelledby="realtime-modes" className="space-y-3">
        <h2 id="realtime-modes" className="text-lg font-bold">Tryb zapisu</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Mode label="Cookieless" count={report.cookielessEvents} total={report.totalEvents} explanation="Zdarzenia bez trwałej tożsamości przeglądarki i sesji." />
          <Mode label="Consented" count={report.consentedEvents} total={report.totalEvents} explanation="Zdarzenia zapisane po zgodzie na analitykę." />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Ranking title="Najczęściej oglądane strony" rows={report.topPages} unit="odsłony" empty="Brak zapisanych odsłon w tym oknie." note="Ranking liczy tylko wyświetlenia publicznych stron." />
        {report.observedSources.length > 0 && <Ranking title="Obserwowane źródła" rows={report.observedSources.map((row) => ({ label: row.label, count: row.count, detail: `${row.mode} · ${row.kind === "utm_source" ? "parametr UTM" : row.kind === "referrer_host" ? "domena odsyłająca" : "źródło żądania"}` }))}
          unit="zdarzenia" empty="Brak sygnału źródła w zdarzeniach z tego okna." note="Źródło wskazane przez bieżące zdarzenie. Cookieless: parametr UTM lub domena odsyłająca; consented: źródło rozpoznane z żądania. Tryby pozostają osobne. To nie jest atrybucja pozyskania." />}
        {report.topCampaigns.length > 0 && <Ranking title="Kampanie z wejść śledzących" rows={report.topCampaigns} unit="wejścia" empty="Brak wejść /r z zapisanym identyfikatorem kampanii." note="Tylko wejścia przez /r z identyfikatorem kampanii zapisanym w zdarzeniu. Bez przypisywania późniejszych zdarzeń." />}
        {report.topTrackingLinks.length > 0 && <Ranking title="Linki śledzące" rows={report.topTrackingLinks} unit="wejścia" empty="Brak wejść przez linki śledzące." note="Wejścia przez /r; nazwa i kod z bieżącego rekordu linku." />}
        {report.topDestinations.length > 0 && <Ranking title="Destynacje" rows={report.topDestinations} unit="kliknięcia" empty="Brak kliknięć wychodzących." note="Wybory przez /go; nazwa z bieżącego rekordu destynacji." />}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
        <Link className="underline underline-offset-4 hover:text-foreground" href="/admin/data-quality">Data Quality: {report.qualityExceptions === 0 ? "brak zaobserwowanych wyjątków" : `${numberFormat.format(report.qualityExceptions)} wyjątków w oknie`}</Link>
        <Link className="underline underline-offset-4 hover:text-foreground" href="/admin/debug">Sprawdź ostatnie zdarzenia w DebugView</Link>
      </div>
    </>}
  </div>;
}

function Metric({ metricKey, value }: { metricKey: keyof typeof REALTIME_METRICS; value: number }) {
  const metric = REALTIME_METRICS[metricKey];
  return <Card><CardContent className="flex min-h-32 flex-col items-start justify-between gap-2 px-4 py-4 sm:min-h-24 sm:flex-row sm:items-center sm:px-6 sm:py-5">
    <div className="min-w-0"><p className="text-sm font-bold">{metric.label}</p><p className="mt-1 text-xs text-muted-foreground">{metric.population}</p></div>
    <p className="shrink-0 text-3xl font-black tabular-nums">{numberFormat.format(value)}</p>
  </CardContent></Card>;
}

function Mode({ label, count, total, explanation }: { label: string; count: number; total: number; explanation: string }) {
  return <Card><CardContent className="flex flex-wrap items-baseline justify-between gap-3 pt-5">
    <div><p className="font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{explanation}</p></div>
    <p className="text-2xl font-black tabular-nums">{numberFormat.format(count)} <span className="text-sm font-medium text-muted-foreground">{realtimeModeShare(count, total)}</span></p>
  </CardContent></Card>;
}

function Ranking({ title, rows, unit, empty, note }: { title: string; rows: Array<{ label: string; count: number; detail?: string }>; unit: string; empty: string; note: string }) {
  return <Card className="min-w-0"><CardHeader><CardTitle>{title}</CardTitle><p className="text-xs leading-relaxed text-muted-foreground">{note}</p></CardHeader>
    <CardContent>{rows.length ? <ol className="divide-y divide-border">{rows.map((row, index) => <li key={`${row.label}-${row.detail ?? index}`} className="flex min-w-0 items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0"><p className="break-words text-sm font-semibold">{row.label}</p>{row.detail && <p className="text-xs text-muted-foreground">{row.detail}</p>}</div>
      <p className="shrink-0 text-right text-sm tabular-nums"><strong>{numberFormat.format(row.count)}</strong><span className="block text-xs text-muted-foreground">{unit}</span></p>
    </li>)}</ol> : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent>
  </Card>;
}
