import type { Metadata } from "next";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLinkAction } from "./actions";

export const metadata: Metadata = { title: "Logowanie", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md items-center px-5 py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-accent">Poza Nutą</p>
          <CardTitle>Panel Poza Nutą</CardTitle>
          <CardDescription>Logowanie magic linkiem dla aktywnego członka zespołu lub osoby z oczekującym zaproszeniem.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="rounded-md border bg-secondary p-4 text-sm">Link do logowania został wysłany. Otwórz go w tej samej przeglądarce.</p>
          ) : (
            <form action={sendMagicLinkAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required placeholder="ty@pozanuta.pl" />
              </div>
              {error ? <p className="text-sm font-bold text-destructive">Nie udało się dokończyć logowania. Link mógł wygasnąć albo dostęp nie jest już aktywny.</p> : null}
              <div className="[&>button]:w-full"><SubmitButton idle="Wyślij magic link" pending="Wysyłam…" /></div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
