import { Card, CardContent } from "@/components/ui/card";

export default function PathsLoading() {
  return <div className="space-y-5" role="status" aria-label="Ładowanie analizy ścieżek">
    <h1 className="text-3xl font-black tracking-tight">Ścieżki stron</h1>
    <Card><CardContent className="space-y-3 pt-5"><div className="h-5 w-40 animate-pulse rounded bg-muted" /><div className="h-11 max-w-md animate-pulse rounded bg-muted" /></CardContent></Card>
    <Card><CardContent className="space-y-3 pt-5"><div className="h-5 w-48 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /></CardContent></Card>
  </div>;
}
