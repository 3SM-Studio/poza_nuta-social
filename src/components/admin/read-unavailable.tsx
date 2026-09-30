import { AdminNotice } from "@/components/admin/admin-notice";

export function ReadUnavailable({ title }: { title: string }) {
  return <AdminNotice tone="error" title={`Odczyt ${title} niedostępny`} titleLevel={1}>Nie udało się pobrać danych. Brak odczytu nie oznacza pustej listy ani zerowej aktywności. Spróbuj odświeżyć stronę.</AdminNotice>;
}
