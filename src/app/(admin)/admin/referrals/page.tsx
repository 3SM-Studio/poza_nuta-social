import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/admin/copy-button";
import {
  CreateParticipantDialog,
  CreateReferralLinkDialog,
  EditParticipantDialog,
  ParticipantStatusControl,
} from "@/components/admin/referral-controls";
import { canMutateAdmin, requireAdminAccess } from "@/lib/admin";
import { listReferralAdmin } from "@/lib/admin-referrals";
import { resolveDashboardRange } from "@/lib/dashboard-range";
import { getSiteUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const responsiveTable = "max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:block max-md:[&_tr]:mb-3 max-md:[&_tr]:block max-md:[&_tr]:rounded-lg max-md:[&_tr]:border max-md:[&_tr]:border-border max-md:[&_tr]:p-4 max-md:[&_td]:block max-md:[&_td]:p-0 max-md:[&_td]:pt-3 max-md:[&_td:first-child]:pt-0 max-md:[&_td_button]:min-h-11";

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await requireAdminAccess();
  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const { participants, links, memberships, leaderboard } = await listReferralAdmin(range.from, range.toExclusive);
  const canMutate = canMutateAdmin(access.role);
  const siteUrl = getSiteUrl();
  const participantNames = new Map(participants.map((participant) => [participant.id, participant.display_name]));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight text-balance">Polecenia zespołu</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sprawdź wyniki poleceń i zarządzaj linkami zespołu. Ranking pomija ruch wewnętrzny, testowy oraz boty.
          </p>
        </div>
        {canMutate ? <CreateParticipantDialog memberships={memberships} /> : null}
      </header>

      {typeof params.error === "string" ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{referralErrorMessage(params.error)}</p> : null}
      {typeof params.status === "string" ? <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm">{referralSuccessMessage(params.status)}</p> : null}

      <nav className="flex flex-wrap gap-2" aria-label="Zakres rankingu poleceń">
        {[{ key: "today", label: "Dziś" }, { key: "7", label: "7 dni" }, { key: "30", label: "30 dni" }, { key: "90", label: "90 dni" }].map((item) => (
          <Link key={item.key} href={`/admin/referrals?range=${item.key}`} aria-current={range.key === item.key ? "page" : undefined} className={cn(buttonVariants({ variant: range.key === item.key ? "accent" : "outline", size: "sm" }), "max-md:min-h-11")}>{item.label}</Link>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>Ranking pozyskania · {range.label}</CardTitle>
          <CardDescription>„Nowe przeglądarki” liczymy tylko po zgodzie na analitykę. To nie jest liczba osób.</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length ? (
            <Table className={responsiveTable}>
              <TableHeader><TableRow><TableHead>Pozycja</TableHead><TableHead>Uczestnik</TableHead><TableHead className="text-right">Nowe przeglądarki</TableHead><TableHead className="text-right">Sesje pozyskane</TableHead><TableHead className="text-right">Sesje z wyjściem</TableHead><TableHead className="text-right">Wsp. wyjścia</TableHead></TableRow></TableHeader>
              <TableBody>{leaderboard.map((row, index) => <TableRow key={row.participantId}><TableCell className="tabular-nums text-muted-foreground"><span className="md:hidden">Pozycja: </span>{index + 1}</TableCell><TableCell><p className="max-w-64 break-words font-bold">{row.participant}</p>{row.status === "inactive" ? <p className="mt-1 text-xs text-muted-foreground">Nieaktywny</p> : null}</TableCell><TableCell className="tabular-nums font-bold md:text-right"><span className="mr-2 font-normal text-muted-foreground md:hidden">Nowe przeglądarki:</span>{row.newVisitors}</TableCell><TableCell className="tabular-nums md:text-right"><span className="mr-2 text-muted-foreground md:hidden">Sesje pozyskane:</span>{row.acquiredSessions}</TableCell><TableCell className="tabular-nums md:text-right"><span className="mr-2 text-muted-foreground md:hidden">Sesje z wyjściem:</span>{row.outboundSessions}</TableCell><TableCell className="tabular-nums md:text-right"><span className="mr-2 text-muted-foreground md:hidden">Wsp. wyjścia:</span>{row.outboundSessionRate.toFixed(1)}%</TableCell></TableRow>)}</TableBody>
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Brak uczestników do pokazania w rankingu.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Uczestnicy</CardTitle><CardDescription>Uczestnictwo w poleceniach nie przyznaje dostępu do panelu.</CardDescription></CardHeader>
        <CardContent>
          {participants.length ? (
            <Table className={responsiveTable}>
              <TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead>Status</TableHead><TableHead>Powiązane konto</TableHead><TableHead className="text-right">Linki</TableHead>{canMutate ? <TableHead className="text-right">Działania</TableHead> : null}</TableRow></TableHeader>
              <TableBody>{participants.map((participant) => {
                const member = memberships.find((candidate) => candidate.user_id === participant.linked_user_id);
                return <TableRow key={participant.id}><TableCell className="max-w-72 break-words font-bold">{participant.display_name}</TableCell><TableCell><span className="mr-2 text-muted-foreground md:hidden">Status:</span><Badge variant={participant.status === "active" ? "secondary" : "outline"}>{participant.status === "active" ? "aktywny" : "nieaktywny"}</Badge></TableCell><TableCell className="max-w-64 break-all text-muted-foreground"><span className="mr-2 md:hidden">Konto:</span>{member?.email || "Brak"}</TableCell><TableCell className="tabular-nums md:text-right"><span className="mr-2 text-muted-foreground md:hidden">Linki:</span>{links.filter((link) => link.referral_participant_id === participant.id).length}</TableCell>{canMutate ? <TableCell><div className="flex flex-wrap gap-2 md:justify-end"><EditParticipantDialog participant={participant} memberships={memberships} /><ParticipantStatusControl participant={participant} /><CreateReferralLinkDialog participant={participant} /></div></TableCell> : null}</TableRow>;
              })}</TableBody>
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Dodaj pierwszego uczestnika, aby utworzyć link polecający.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Linki polecające</CardTitle><CardDescription>Każdy link korzysta z istniejącego, stabilnego redirectu <code>/r/[kod]</code>.</CardDescription></CardHeader>
        <CardContent>
          {links.length ? <Table className={responsiveTable}><TableHeader><TableRow><TableHead>Nazwa</TableHead><TableHead>Uczestnik</TableHead><TableHead>Adres</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Kopiuj</TableHead></TableRow></TableHeader><TableBody>{links.map((link) => {
            const url = `${siteUrl}/r/${link.code}`;
            return <TableRow key={link.id}><TableCell className="max-w-64 break-words font-bold">{link.label}</TableCell><TableCell><span className="mr-2 text-muted-foreground md:hidden">Uczestnik:</span>{participantNames.get(link.referral_participant_id) || "Nieznany"}</TableCell><TableCell><span className="mr-2 text-muted-foreground md:hidden">Adres:</span><code className="break-all text-xs">/r/{link.code}</code></TableCell><TableCell><span className="mr-2 text-muted-foreground md:hidden">Status:</span>{link.active ? "Aktywny" : "Wyłączony"}</TableCell><TableCell className="md:text-right"><CopyButton value={url} /></TableCell></TableRow>;
          })}</TableBody></Table> : <p className="py-8 text-center text-sm text-muted-foreground">Nie ma jeszcze linków polecających.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function referralSuccessMessage(status: string) {
  if (status === "participant-created") return "Uczestnik został dodany.";
  if (status === "participant-updated") return "Dane uczestnika zostały zapisane.";
  if (status === "link-created") return "Stabilny link polecający został utworzony.";
  return "Zmiana została zapisana.";
}

function referralErrorMessage(error: string) {
  if (error === "invalid-request") return "Brakuje wymaganych danych. Otwórz formularz i spróbuj ponownie.";
  if (error === "participant-create-rejected") return "Nie udało się dodać uczestnika. Sprawdź nazwę i spróbuj ponownie.";
  if (error === "participant-update-rejected") return "Nie udało się zapisać uczestnika. Odśwież dane i spróbuj ponownie.";
  if (error === "link-create-rejected") return "Nie udało się utworzyć linku. Sprawdź, czy uczestnik jest aktywny, i spróbuj ponownie.";
  if (error === "link-code-exhausted") return "Nie udało się nadać unikalnego adresu linku. Spróbuj ponownie za chwilę.";
  return "Nie udało się wykonać działania. Spróbuj ponownie.";
}
