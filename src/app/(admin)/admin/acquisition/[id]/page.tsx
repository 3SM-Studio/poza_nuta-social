import Link from "next/link";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { AcquisitionRange } from "@/components/admin/acquisition-range";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getAcquisitionDetail } from "@/lib/analytics/acquisition";
import { acquisitionCount, type AcquisitionDetail, type AcquisitionMetric } from "@/lib/analytics/acquisition-contract";
import { REPORTING_SCOPE_LABELS } from "@/lib/analytics/reporting-scope";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "@/lib/analytics/report-request";
import { requireAdmin } from "@/lib/admin";
import { cn } from "cn";

export const dynamic = "force-dynamic";
const nf = new Intl.NumberFormat("pl-PL");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AcquisitionCampaignPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const queryParams = await searchParams;
  const request = resolveAnalyticsReportRequest(queryParams);
  const { range, scope } = request;
  const report = uuid.test(id) && request.status === "valid" ? await getAcquisitionDetail(range.from, range.toExclusive, scope, id) : null;
  const query = analyticsReportQuery(range, scope);

  return <div className="space-y-7">
    <header className="space-y-3">
      <Link href={`/admin/acquisition?${query}`} className={cn(buttonVariants({variant:"ghost",size:"sm"}),"px-0")}>← Wszystkie kampanie</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="min-w-0 break-words text-3xl font-black tracking-tight sm:text-4xl">{report?.campaign?.name || "Niedostępna kampania"}</h1>
        {report?.campaign?.status ? <Badge variant="outline">{report.campaign.status === "archived" ? "Archiwalna" : report.campaign.status === "draft" ? "Szkic" : "Aktywna"}</Badge> : null}</div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Materiał → umiejscowienie → link /r → strona docelowa. Miejsca i linki pokazują bieżące relacje, a liczby wyłącznie przyjęte zdarzenia z wybranego okresu. Zmiana nazwy nie zmienia ID ani historii liczb.</p>
      <div className="flex flex-wrap gap-2"><Link href="/admin/campaigns" className={cn(buttonVariants({variant:"outline",size:"sm"}))}>Zarządzaj kampaniami</Link><Link href="/admin/links" className={cn(buttonVariants({variant:"outline",size:"sm"}))}>Zarządzaj linkami</Link></div>
    </header>
    <AcquisitionRange basePath={`/admin/acquisition/${id}`} request={request} />
    {request.status === "invalid" ? <AdminNotice tone="error" title="Nieprawidłowy zakres dat">Podaj poprawne daty w kolejności od wcześniejszej do późniejszej. Raport nie został przeliczony.</AdminNotice> : request.status === "too_long" ? <AdminNotice tone="error">Zakres jest dłuższy niż 366 dni. Wybierz krótszy okres.</AdminNotice> : !uuid.test(id) ?
      <AdminNotice tone="error">Nieprawidłowy identyfikator kampanii.</AdminNotice> : !report ?
      <AdminNotice tone="error" title="Odczyt kampanii niedostępny">Spróbuj ponownie później.</AdminNotice> : <CampaignDetail report={report} campaignId={id} rangeLabel={`${range.from}–${range.toInclusive}`} scopeLabel={REPORTING_SCOPE_LABELS[scope]} />}
  </div>;
}

function CampaignDetail({ report, campaignId, rangeLabel, scopeLabel }: { report: AcquisitionDetail; campaignId: string; rangeLabel: string; scopeLabel: string }) {
  const { assets, placements, links, destinations, metrics } = report;
  const assetIds = [...new Set([...assets.map((a) => a.id), ...links.map((l) => l.assetId).filter((id): id is string => !!id), ...metrics.filter((m) => m.kind === "asset").map((m) => m.id)])];
  const placementIds = [...new Set([...placements.map((p) => p.id), ...links.map((l) => l.placementId).filter((id): id is string => !!id), ...metrics.filter((m) => m.kind === "placement").map((m) => m.id)])];
  const linkIds = [...new Set([...links.map((l) => l.id), ...metrics.filter((m) => m.kind === "link").map((m) => m.id)])];
  const destinationIds = [...new Set([...destinations.map((d) => d.id), ...metrics.filter((m) => m.kind === "destination").map((m) => m.id)])];
  const unassignedLinks = links.filter((l) => !l.assetId);

  return <>
    <p className="text-xs text-muted-foreground">{rangeLabel} · Europe/Warsaw · {scopeLabel} · bieżące etykiety encji</p>
    <section aria-labelledby="campaign-results" className="space-y-3">
      <h2 id="campaign-results" className="text-lg font-bold">Obserwowana aktywność kampanii</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Wejścia /r" value={acquisitionCount(metrics,"campaign",campaignId,"tracking_entry")} note="Bezpośrednie użycie linku kampanii." />
        <MetricCard label="Kliknięcia /go" value={acquisitionCount(metrics,"campaign",campaignId,"outbound_click")} note="Tylko zdarzenia z ID tej kampanii w kontekście bezpośrednim lub utrwalonym." />
        <MetricCard label="Kliknięcia kontaktu" value={acquisitionCount(metrics,"campaign",campaignId,"contact_click")} note="Przyjęte contact_click z kontekstem tej kampanii." />
        <MetricCard label="Widoki kontaktu" value={acquisitionCount(metrics,"campaign",campaignId,"contact_view")} note="Przyjęte contact_view z kontekstem tej kampanii." />
      </div>
      <p className="text-sm text-muted-foreground">Bezpośredni kontekst: <strong>{nf.format(acquisitionCount(metrics,"campaign",campaignId,undefined,"direct"))}</strong> zdarzeń. Utrwalony kontekst consented: <strong>{nf.format(acquisitionCount(metrics,"campaign",campaignId,undefined,"persisted"))}</strong> zdarzeń. To różne populacje zdarzeń, nie model wielodotykowej atrybucji.</p>
    </section>
    <section aria-labelledby="campaign-graph" className="space-y-3">
      <h2 id="campaign-graph" className="text-lg font-bold">Materiały i użycia</h2>
      {!assetIds.length && !unassignedLinks.length ? <AdminEmpty title="Brak materiałów i linków" description="Ta kampania nie ma jeszcze materiałów ani linków. Utwórz je w sekcji Linki i QR, a tutaj zobaczysz powiązania i pomiar." action={<Link href="/admin/links" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>Przejdź do linków i QR</Link>} /> : null}
      {assetIds.map((assetId) => {
        const asset = assets.find((a) => a.id === assetId);
        const assetLinks = links.filter((l) => l.assetId === assetId);
        return <Card key={assetId} className="min-w-0"><CardHeader className="space-y-1"><CardTitle className="break-words text-base">{asset?.label || "Niedostępny materiał"}</CardTitle><p className="text-xs text-muted-foreground">{asset?.active === false ? "Nieaktywny · " : ""}{nf.format(acquisitionCount(metrics,"asset",assetId,"tracking_entry"))} wejść /r · {nf.format(acquisitionCount(metrics,"asset",assetId,undefined,"persisted"))} zdarzeń z utrwalonym kontekstem</p></CardHeader>
          <CardContent className="space-y-4">
            {!assetLinks.length ? <p className="text-sm text-muted-foreground">Brak bieżącego linku do tego materiału. Historyczne zdarzenia pozostają w sumie powyżej.</p> : null}
            {[...new Set(assetLinks.map((l) => l.placementId))].map((placementId) => {
              const placement = placements.find((p) => p.id === placementId);
              return <div key={placementId || "none"} className="min-w-0 border-t pt-4 first:border-t-0 first:pt-0"><h3 className="break-words font-semibold">{placementId ? placement?.label || "Niedostępne umiejscowienie" : "Bez umiejscowienia"}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{placement?.active === false ? "Nieaktywne · " : ""}{placementId ? `${nf.format(acquisitionCount(metrics,"placement",placementId,"tracking_entry"))} wejść /r łącznie dla tego miejsca w kampanii` : "Link nie ma przypisanego miejsca."}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">{assetLinks.filter((l) => l.placementId === placementId).map((link) => <LinkCard key={link.id} link={link} metrics={metrics} />)}</div>
              </div>;
            })}
          </CardContent></Card>;
      })}
      {unassignedLinks.length ? <Card><CardHeader><CardTitle className="text-base">Linki bez materiału</CardTitle></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{unassignedLinks.map((link) => <LinkCard key={link.id} link={link} metrics={metrics} />)}</CardContent></Card> : null}
      {linkIds.filter((linkId) => !links.some((l) => l.id === linkId)).map((linkId) => <Card key={linkId}><CardContent className="pt-5 text-sm">Niedostępny link · {nf.format(acquisitionCount(metrics,"link",linkId,"tracking_entry"))} historycznych wejść /r. Rekord powiązania nie jest już dostępny.</CardContent></Card>)}
    </section>
    <section aria-labelledby="placement-breakdown" className="space-y-3"><h2 id="placement-breakdown" className="text-lg font-bold">Umiejscowienia łącznie</h2>
      {placementIds.length ? <div className="divide-y rounded-xl border bg-card">{placementIds.map((id) => {
        const placement = placements.find((p) => p.id === id);
        return <div key={id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span className="min-w-0 break-words font-semibold">{placement?.label || "Niedostępne umiejscowienie"}{placement?.active === false ? " · nieaktywne" : ""}</span><span className="tabular-nums">{nf.format(acquisitionCount(metrics,"placement",id,"tracking_entry"))} wejść /r · {nf.format(acquisitionCount(metrics,"placement",id,undefined,"persisted"))} utrwalonych</span></div>;
      })}</div> : <p className="text-sm text-muted-foreground">Brak przypisanych umiejscowień.</p>}
    </section>
    <section aria-labelledby="destination-breakdown" className="space-y-3"><h2 id="destination-breakdown" className="text-lg font-bold">Destynacje po /go</h2>
      <p className="text-sm text-muted-foreground">Destynacja jest wspólna dla wielu kampanii. Poniższe kliknięcia mają kontekst tej kampanii zapisany na własnym zdarzeniu; sam wybór destynacji nie przypisuje kampanii.</p>
      {destinationIds.length ? <div className="divide-y rounded-xl border bg-card">{destinationIds.map((id) => {
        const destination = destinations.find((d) => d.id === id);
        return <div key={id} className="flex flex-wrap justify-between gap-2 p-4 text-sm"><span className="min-w-0 break-words font-semibold">{destination?.label || "Niedostępna destynacja"}{destination?.active === false ? " · nieaktywna" : ""}</span><span className="tabular-nums">{nf.format(acquisitionCount(metrics,"destination",id,"outbound_click","direct"))} bezpośrednich · {nf.format(acquisitionCount(metrics,"destination",id,"outbound_click","persisted"))} utrwalonych</span></div>;
      })}</div> : <p className="text-sm text-muted-foreground">Brak kliknięć /go z kontekstem tej kampanii w okresie.</p>}
    </section>
  </>;
}

function LinkCard({ link, metrics }: { link: AcquisitionDetail["links"][number]; metrics: AcquisitionMetric[] }) {
  return <div className="min-w-0 border-t pt-3 text-sm first:border-t-0 first:pt-0">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 break-words font-bold">{link.label}</h4><Badge variant="outline">{link.active ? "Aktywny" : "Wyłączony"}</Badge></div>
    <p className="mt-2 break-all text-xs text-muted-foreground">/r/{link.code} → {link.landingPath}</p>
    {link.distributionUnit ? <p className="mt-1 break-words text-xs text-muted-foreground">Jednostka dystrybucji: {link.distributionUnit}</p> : null}
    <dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Wejścia /r</dt><dd className="font-bold tabular-nums">{nf.format(acquisitionCount(metrics,"link",link.id,"tracking_entry","direct"))}</dd></div><div><dt className="text-xs text-muted-foreground">Utrwalony kontekst</dt><dd className="font-bold tabular-nums">{nf.format(acquisitionCount(metrics,"link",link.id,undefined,"persisted"))}</dd></div></dl>
  </div>;
}

function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return <Card><CardContent className="space-y-2 pt-5"><h3 className="text-sm font-bold">{label}</h3><p className="text-2xl font-black tabular-nums">{nf.format(value)}</p><p className="text-xs leading-relaxed text-muted-foreground">{note}</p></CardContent></Card>;
}
