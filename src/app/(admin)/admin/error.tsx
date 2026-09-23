"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <Card><CardHeader><CardTitle>Coś przerwało tę operację.</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">Nie udało się pokazać danych. Spróbuj wczytać je ponownie.</p><Button onClick={retry}>Spróbuj ponownie</Button></CardContent></Card>;
}
