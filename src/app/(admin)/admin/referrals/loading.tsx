import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralsLoading() {
  return <div className="space-y-8" aria-busy="true" aria-label="Wczytywanie poleceń"><div className="space-y-3"><Skeleton className="h-9 w-72" /><Skeleton className="h-5 w-full max-w-2xl" /></div>{[0,1,2].map((section) => <Card key={section}><CardHeader><Skeleton className="h-6 w-56" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>)}</div>;
}
