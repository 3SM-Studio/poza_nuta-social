import Link from "next/link";
import { AcquisitionRange } from "@/components/admin/acquisition-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getAcquisitionOverview } from "@/lib/analytics/acquisition";
import { ACQUISITION_METRICS } from "@/lib/analytics/acquisition-contract";
import { REPORTING_SCOPE_LABELS } from "@/lib/analytics/reporting-scope";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { requireAdmin } from "@/lib/admin";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const nf = new Intl.NumberFormat("pl-PL");

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const request = resolveAnalyticsReportRequest(params);
  const { range, scope } = request;
  const offset = typeof params.offset === "string" && /^\d+$/.test(params.offset) ? Math.min(Number(params.offset), 100_000) : 0;
  const report = request.status === "valid" ? await getAcquisitionOverview(range.from, range.toExclusive, scope, offset) : null;
  const query = analyticsReportQuery(range, scope);
  const rowHref = (id: string) => `/admin/acquisition/${id}?${query}`;

  return <div className="space-y-7">
    <header className="space-y-2">
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Pozyskanie i kampanie</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Sprawdź, które linki kampanii przyniosły mierzalne wejścia oraz które późniejsze działania mają utrwalony kontekst kampanii. Nazwy i statusy są aktualnymi danymi encji, a liczby pochodzą z historycznych zdarzeń.</p>
    </header>
    <AcquisitionRange basePath="/admin/acquisition" request={request} />
    {request.status === "invalid" ? <Card role="alert"><CardHeader><CardTitle>Nieprawidłowy zakres dat</CardTitle></CardHeader><CardContent>Podaj poprawne daty w kolejności od wcześniejszej do późniejszej. Raport nie został przeliczony.</CardContent></Card> : request.status === "too_long" ? <Card role="alert"><CardContent className="pt-5">Zakres jest dłuższy niż 366 dni. Wybierz krótszy okres.</CardContent></Card> : !report ?
      <Card role="alert"><CardHeader><CardTitle>Odczyt pozyskania niedostępny</CardTitle></CardHeader><CardContent>Spróbuj ponownie później. Brak odczytu nie oznacza zerowej aktywności.</CardContent></Card> : <>
      <p className="text-xs text-muted-foreground">Zdarzenia: {range.from}–{range.toInclusive} · Europe/Warsaw · {REPORTING_SCOPE_LABELS[scope]}. Każde przyjęte zdarzenie jest liczone raz w jednej kategorii kontekstu.</p>
      <section aria-labelledby="acquisition-overview" className="space-y-3">
        <h2 id="acquisition-overview" className="text-lg font-bold">Aktywność w okresie</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Wejścia przez link" value={report.trackingEntries} note="Wszystkie przyjęte tracking_entry; przypisanie kampanii tylko z ID zdarzenia lub użytego linku." />
          <Summary label="Bezpośredni kontekst kampanii" value={report.directEvents} note="ID kampanii zapisane na tym zdarzeniu lub na użytym linku." />
          <Summary label="Utrwalony kontekst consented" value={report.persistedEvents} note="Kontekst bieżącego dotknięcia zapisany na zdarzeniu consented, bez nowego użycia linku." />
          <Summary label="Bez kontekstu kampanii" value={report.noCampaignEvents} note="Brak wiarygodnego ID kampanii. To może być prawidłowy ruch bezpośredni." />
        </div>
        <p className="text-sm text-muted-foreground">Łącznie {nf.format(report.totalEvents)} przyjętych zdarzeń, w tym {nf.format(report.outboundClicks)} kliknięć wychodzących, {nf.format(report.contactClicks)} kliknięć kontaktu i {nf.format(report.contactViews)} widoków kontaktu. Te sumy obejmują także zdarzenia bez kampanii.</p>
      </section>
      <section aria-labelledby="acquisition-campaigns" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="acquisition-campaigns" className="text-lg font-bold">Kampanie</h2><span className="text-sm text-muted-foreground">{nf.format(report.campaignCount)} rekordów · ranking według wejść przez link</span></div>
        {report.campaigns.length ? <div className="divide-y rounded-xl border bg-card">
          {report.campaigns.map((campaign) => <Link key={campaign.id} href={rowHref(campaign.id)} className="block p-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:p-5">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold">{campaign.name || "Niedostępna kampania"}</h3><p className="mt-1 text-xs text-muted-foreground">{campaign.status === "archived" ? "Archiwalna" : campaign.status === "draft" ? "Szkic" : campaign.status === "active" ? "Aktywna" : "Brak bieżącego rekordu"}</p></div><span className="text-sm font-semibold text-accent">Analizuj →</span></div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <Count label="Wejścia /r" value={campaign.trackingEntries} />
              <Count label="Bezpośrednie zdarzenia" value={campaign.directEvents} />
              <Count label="Utrwalony kontekst" value={campaign.persistedEvents} />
              <Count label="Kliknięcia /go" value={campaign.outboundClicks} />
            </dl>
          </Link>)}
        </div> : <Card><CardContent className="pt-5 text-sm text-muted-foreground">Nie ma kampanii ani zdarzeń z zachowanym ID kampanii. Kampanie możesz utworzyć w sekcji Kampanie.</CardContent></Card>}
        {report.campaignCount > 50 ? <nav aria-label="Strony kampanii" className="flex gap-2">
          {offset > 0 ? <Link href={`/admin/acquisition?${query}&offset=${Math.max(0,offset-50)}`} className={cn(buttonVariants({variant:"outline"}))}>Poprzednie</Link> : null}
          {offset + report.campaigns.length < report.campaignCount ? <Link href={`/admin/acquisition?${query}&offset=${offset+50}`} className={cn(buttonVariants({variant:"outline"}))}>Następne</Link> : null}
        </nav> : null}
      </section>
      <Card><CardHeader><CardTitle>Jak czytać liczby</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
        <p>Ranking dotyczy liczby zdarzeń, nie osób ani sesji. Wejście przez skopiowany link /r jest wejściem przez link; nie dowodzi zeskanowania QR.</p>
        {Object.values(ACQUISITION_METRICS).map((metric) => <p key={metric.event}><strong>{metric.label}:</strong> {metric.population}</p>)}
        <p className="text-muted-foreground">Wszystkie definicje używają zakresu {range.from}–{range.toInclusive} i filtra {REPORTING_SCOPE_LABELS[scope]}. Nie łączymy zdarzeń cookieless w ścieżki użytkownika.</p>
      </CardContent></Card>
    </>}
  </div>;
}

function Summary({ label, value, note }: { label: string; value: number; note: string }) {
  return <Card><CardContent className="space-y-2 pt-5"><h3 className="text-sm font-bold">{label}</h3><p className="text-2xl font-black tabular-nums">{nf.format(value)}</p><p className="text-xs leading-relaxed text-muted-foreground">{note}</p></CardContent></Card>;
}
function Count({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold tabular-nums">{nf.format(value)}</dd></div>; }
