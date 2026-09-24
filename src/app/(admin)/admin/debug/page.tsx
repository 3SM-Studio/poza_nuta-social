import Link from "next/link";
import { DebugRefresh } from "@/components/admin/debug-refresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/admin";
import { EVENT_NAMES } from "@/lib/analytics-taxonomy";
import { DEBUG_LIMIT, getDebugRecords, parseDebugFilters, type DebugRecord } from "@/lib/analytics/debug-view";

export const dynamic = "force-dynamic";

const outcomes = { accepted: "Zapisane", rejected: "Odrzucone", duplicate: "Duplikat", filtered: "Odfiltrowane" } as const;
const modes = { cookieless: "Cookieless", consented: "Consented", unknown: "Brak danych" } as const;
const surfaces = { api_track: "Client API", tracking_redirect: "Redirect /r", outbound_redirect: "Redirect /go", unknown: "Brak danych" } as const;
const reasons = {
  invalid_json: "Niepoprawny JSON", payload_too_large: "Przekroczony limit żądania", forbidden_field: "Niedozwolone pole",
  invalid_event: "Nieznana nazwa zdarzenia", invalid_payload: "Niepoprawne właściwości zdarzenia",
  invalid_event_id: "Niepoprawne ID zdarzenia", invalid_path: "Niepoprawna ścieżka",
  idempotent_retry: "Ponowiona próba tego samego zdarzenia", unsupported_mode: "Zdarzenie niedostępne w tym trybie",
} as const;

export default async function DebugPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const filters = parseDebugFilters(params);
  const readAt = new Date();
  const records = await getDebugRecords(filters, readAt);
  const selectedKey = typeof params.record === "string" ? params.record : null;
  const selected = records?.find((record) => record.key === selectedKey) ?? records?.[0] ?? null;
  const base = new URLSearchParams();
  base.set("window", String(filters.minutes));
  if (filters.eventName) base.set("event", filters.eventName);
  if (filters.outcome) base.set("outcome", filters.outcome);
  if (filters.mode) base.set("mode", filters.mode);
  if (filters.surface) base.set("surface", filters.surface);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">DebugView</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">Ostatnie zdarzenia i wyjątki analityki Poza Nutą. Każdy wpis dotyczy jednej próby; cookieless nie tworzy historii osoby ani sesji.</p>
        <p className="text-xs text-muted-foreground">Odczyt: {formatTime(readAt.toISOString())} · maksymalnie {DEBUG_LIMIT} wpisów · najnowsze najpierw</p>
      </div>
      <DebugRefresh />
    </header>

    <form method="get" aria-label="Filtry DebugView" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
      <Filter label="Zakres czasu" name="window" value={String(filters.minutes)} options={[["30", "30 minut"], ["120", "2 godziny"], ["1440", "24 godziny"]]} />
      <Filter label="Zdarzenie" name="event" value={filters.eventName ?? ""} options={[["", "Wszystkie"], ...EVENT_NAMES.map((name) => [name, name] as [string, string])]} />
      <Filter label="Wynik" name="outcome" value={filters.outcome ?? ""} options={[["", "Wszystkie"], ...Object.entries(outcomes)]} />
      <Filter label="Tryb" name="mode" value={filters.mode ?? ""} options={[["", "Wszystkie"], ...Object.entries(modes)]} />
      <Filter label="Powierzchnia" name="surface" value={filters.surface ?? ""} options={[["", "Wszystkie"], ...Object.entries(surfaces)]} />
      <Button type="submit" variant="accent">Zastosuj filtry</Button>
    </form>

    {!records ? <Card><CardHeader><CardTitle>Odczyt niedostępny</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Nie udało się odczytać diagnostyki. Spróbuj odświeżyć widok. Nie oznacza to, że analityka publiczna przestała zapisywać zdarzenia.</CardContent></Card> :
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section aria-labelledby="debug-stream" className="min-w-0 space-y-3">
          <h2 id="debug-stream" className="text-lg font-bold">Ostatnie zdarzenia <span className="text-sm font-normal text-muted-foreground">({records.length})</span></h2>
          {records.length === 0 ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Brak zdarzeń dla tych filtrów i zakresu. Sprawdź tryb, wynik lub zwiększ zakres do 24 godzin.</CardContent></Card> :
            <div className="space-y-2">{records.map((record) => {
              const query = new URLSearchParams(base);
              query.set("record", record.key);
              return <Link key={record.key} href={`/admin/debug?${query}#debug-inspector`} aria-current={selected?.key === record.key ? "true" : undefined}
                className={`block rounded-xl border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected?.key === record.key ? "border-accent bg-card" : "border-border"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="min-w-0 break-all text-sm">{record.eventName ?? "Nazwa niedostępna"}</strong>
                  <Badge variant="outline">{outcomes[record.outcome]}</Badge>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <time dateTime={record.observedAt}>{formatTime(record.observedAt)}</time><span>{modes[record.analyticsMode]}</span><span>{surfaces[record.surface]}</span>
                </p>
                <p className="mt-1 break-all text-xs"><span className="text-muted-foreground">Ścieżka: </span>{record.canonicalPath ?? "brak danych"}<span className="text-muted-foreground"> · Projekt: </span>Poza Nutą</p>
              </Link>;
            })}</div>}
        </section>
        <section aria-labelledby="debug-inspector" className="min-w-0">
          <h2 id="debug-inspector" className="mb-3 scroll-mt-20 text-lg font-bold">Inspektor zdarzenia</h2>
          {selected ? <Inspector record={selected} /> : <Card><CardContent className="py-8 text-sm text-muted-foreground">Wybierz zdarzenie z listy, aby zobaczyć szczegóły.</CardContent></Card>}
        </section>
      </div>}
  </div>;
}

function Filter({ label, name, value, options }: { label: string; name: string; value: string; options: Array<[string, string]> }) {
  return <div className="space-y-2"><Label htmlFor={`debug-${name}`}>{label}</Label><NativeSelect id={`debug-${name}`} name={name} defaultValue={value}>{options.map(([key, text]) => <NativeSelectOption key={key} value={key}>{text}</NativeSelectOption>)}</NativeSelect></div>;
}

function Inspector({ record }: { record: DebugRecord }) {
  const accepted = record.outcome === "accepted";
  return <Card><CardHeader><CardTitle className="break-all">{record.eventName ?? "Nazwa zdarzenia niedostępna"}</CardTitle></CardHeader><CardContent className="space-y-5 text-sm">
    <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-3">
      <Detail label="Czas" value={formatTime(record.observedAt)} />
      <Detail label="Wynik" value={outcomes[record.outcome]} />
      {!accepted && <Detail label="Powód" value={record.reasonCode ? `${reasons[record.reasonCode]} (${record.reasonCode})` : null} />}
      <Detail label="Tryb" value={modes[record.analyticsMode]} />
      <Detail label="Projekt" value="Poza Nutą" />
      <Detail label="Powierzchnia" value={surfaces[record.surface]} />
      <Detail label="Ścieżka" value={record.canonicalPath} />
      <Detail label="Zapis" value={record.persistence === "cookieless" ? "Tabela analytics_cookieless_events" : record.persistence === "consented" ? "Tabela analytics_events_v2" : "Brak nowego zapisu zdarzenia"} />
      {accepted && <>
        <Detail label="Event ID" value={record.eventId} />
        <Detail label="Klasa ruchu" value={record.trafficClass} />
        <Detail label="Referrer host" value={record.referrerHost} />
        <Detail label="Źródło" value={record.utmSource} />
        <Detail label="Medium" value={record.utmMedium} />
        <Detail label="Kampania" value={record.utmCampaign} />
        <Detail label="Content" value={record.utmContent} />
        <Detail label="Link ID" value={record.trackingLinkId} />
        <Detail label="Destynacja ID" value={record.destinationId} />
      </>}
    </dl>
    <div className="space-y-2 border-t pt-4 text-muted-foreground">
      {accepted ? <p>{record.analyticsMode === "cookieless" ? "Zdarzenie zapisano bez identyfikatora przeglądarki i sesji. Jest samodzielnym wpisem." : "Zdarzenie zapisano po zgodzie w pełnym modelu analityki. Identyfikatorów przeglądarki i sesji nie pokazujemy tutaj."}</p> : <>
        <p>{record.outcome === "duplicate" ? "Ponowienie rozpoznano jako duplikat. Nie powstał drugi accepted event; ten wyjątek nie wskazuje konkretnego rekordu docelowego." : record.outcome === "filtered" ? "Kontrakt trybu pominął tę próbę; zdarzenia nie zapisano." : "Próbę odrzucono z podanego powodu; zdarzenia nie zapisano."}</p>
        <p>Surowy payload i wartości niedozwolonych pól: nieprzechowywane. Tożsamość oraz pełny referrer: niedostępne.</p>
      </>}
    </div>
  </CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-all font-medium">{value ?? "brak danych"}</dd></>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Warsaw" }).format(new Date(value));
}
