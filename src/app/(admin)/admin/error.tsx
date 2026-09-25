"use client";

import { Button } from "@/components/ui/button";
import { AdminNotice } from "@/components/admin/admin-notice";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <AdminNotice tone="error" title="Coś przerwało tę operację." titleLevel={1}><p>Nie udało się pokazać danych. Spróbuj wczytać je ponownie.</p><Button onClick={retry}>Spróbuj ponownie</Button></AdminNotice>;
}
