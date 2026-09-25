import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REPORTING_SCOPES, REPORTING_SCOPE_LABELS, type ReportingScope } from "@/lib/analytics/reporting-scope";
import { analyticsReportQuery, type AnalyticsReportRequest } from "@/lib/analytics/report-request";
import { cn } from "cn";

export function AcquisitionRange({ basePath, request }: { basePath: string; request: AnalyticsReportRequest }) {
  const { range, scope } = request;
  const invalidCustom = request.status === "invalid";
  const rangeUrl = (key: "7" | "30" | "90") => `${basePath}?${analyticsReportQuery(range, scope, { rangeKey: key })}`;
  const scopeUrl = (nextScope: ReportingScope) => `${basePath}?${analyticsReportQuery(range, nextScope)}`;
  return <div className="space-y-5 rounded-xl border bg-card p-4 sm:p-5">
    <div className="space-y-2">
      <p className="text-sm font-bold">Okres zdarzeń</p>
      <nav aria-label="Okres analizy pozyskania" className="flex flex-wrap gap-2">
        {([ ["7","7 dni"], ["30","30 dni"], ["90","90 dni"] ] as const).map(([key,label]) =>
          <Link key={key} href={rangeUrl(key)} aria-current={range.key === key ? "page" : undefined}
            className={cn(buttonVariants({ variant: range.key === key ? "accent" : "outline", size: "default" }), "min-h-11")}>{label}</Link>)}
      </nav>
      <form method="get" action={basePath} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input type="hidden" name="range" value="custom" />
        {scope === "diagnostic" ? <Input type="hidden" name="scope" value="diagnostic" /> : null}
        <div className="space-y-2"><Label htmlFor="acquisition-from">Od</Label><Input id="acquisition-from" name="from" type="date" defaultValue={range.key === "custom" ? range.from : invalidCustom ? request.custom.from : ""} aria-invalid={invalidCustom || undefined} required /></div>
        <div className="space-y-2"><Label htmlFor="acquisition-to">Do</Label><Input id="acquisition-to" name="to" type="date" defaultValue={range.key === "custom" ? range.toInclusive : invalidCustom ? request.custom.to : ""} aria-invalid={invalidCustom || undefined} required /></div>
        <Button variant="outline" type="submit" className="min-h-11">Pokaż zakres</Button>
      </form>
      <p className="text-xs text-muted-foreground">Maksymalnie 366 dni. Dni liczymy według Europe/Warsaw; koniec zakresu jest włącznie.</p>
    </div>
    <div className="space-y-2">
      <p className="text-sm font-bold">Zakres ruchu</p>
      <nav aria-label="Zakres ruchu pozyskania" className="flex flex-wrap gap-2">
        {REPORTING_SCOPES.map((value) => <Link key={value} href={scopeUrl(value)} aria-current={scope === value ? "page" : undefined}
          className={cn(buttonVariants({ variant: scope === value ? "accent" : "outline", size: "default" }), "h-auto min-h-11 max-w-full whitespace-normal text-center")}>{REPORTING_SCOPE_LABELS[value]}</Link>)}
      </nav>
      <p className="text-xs leading-relaxed text-muted-foreground">Business obejmuje tylko przyjęte zdarzenia production/external. Diagnostic obejmuje wszystkie przyjęte zdarzenia. Odrzucone, duplikaty i filtrowane próby są osobno w Data Quality.</p>
    </div>
  </div>;
}
