import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ReadUnavailable({ title }: { title: string }) {
  return <Card role="alert"><CardHeader><h1 className="text-lg font-bold tracking-tight">Odczyt {title} niedostępny</h1></CardHeader><CardContent>Nie udało się pobrać danych. Brak odczytu nie oznacza pustej listy ani zerowej aktywności. Spróbuj odświeżyć stronę.</CardContent></Card>;
}
