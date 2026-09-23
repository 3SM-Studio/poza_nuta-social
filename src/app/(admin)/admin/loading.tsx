import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-7" aria-label="Ładowanie panelu">
      <div className="space-y-3"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 9 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-3 w-24" /></CardHeader><CardContent><Skeleton className="h-9 w-20" /></CardContent></Card>)}</div>
      <Card><CardHeader><Skeleton className="h-5 w-36" /></CardHeader><CardContent><Skeleton className="h-[260px] w-full" /></CardContent></Card>
    </div>
  );
}
