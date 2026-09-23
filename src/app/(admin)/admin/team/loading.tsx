import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Wczytywanie zespołu i dostępu">
      <div className="space-y-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-5 w-full max-w-xl" /></div>
      {[0, 1].map((item) => <Card key={item}><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent className="space-y-3">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-12 w-full" />)}</CardContent></Card>)}
    </div>
  );
}
