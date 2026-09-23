import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ActivateMemberButton,
  DeactivateMemberDialog,
  EditMemberDialog,
  InviteMemberDialog,
  RetryInvitationButton,
  RevokeInvitationDialog,
  TransferOwnershipDialog,
} from "@/components/admin/team-controls";
import { requireAdminAccess } from "@/lib/admin";
import { listTeamAccess, type AdminInvitation } from "@/lib/admin-team";

export const dynamic = "force-dynamic";

const responsiveTable = "max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:block max-md:[&_tr]:mb-3 max-md:[&_tr]:block max-md:[&_tr]:rounded-lg max-md:[&_tr]:border max-md:[&_tr]:border-border max-md:[&_tr]:p-4 max-md:[&_td]:block max-md:[&_td]:p-0 max-md:[&_td]:pt-3 max-md:[&_td:first-child]:pt-0 max-md:[&_td_button]:min-h-11";

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await requireAdminAccess();
  const { members, invitations, referenceTime } = await listTeamAccess();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : null;
  const error = typeof params.error === "string" ? params.error : null;
  const canInvite = access.role === "owner" || access.role === "admin";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight text-balance">Zespół i dostęp</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Zarządzaj dostępem do panelu. Zmiany ról zaczną obowiązywać przy następnym działaniu danej osoby.
          </p>
        </div>
        {canInvite ? <InviteMemberDialog actorRole={access.role} /> : null}
      </header>

      {status ? <TeamNotice tone="success">{successMessage(status)}</TeamNotice> : null}
      {error ? <TeamNotice tone="error">{errorMessage(error)}</TeamNotice> : null}
      {access.role === "viewer" ? (
        <TeamNotice tone="neutral">Masz dostęp tylko do odczytu. Zmiany członkostwa są niedostępne dla roli viewer.</TeamNotice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Członkowie</CardTitle>
          <CardDescription>Liczba członków: {members.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length ? (
            <Table className={responsiveTable}>
              <TableHeader>
                <TableRow>
                  <TableHead>Osoba</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>Status</TableHead>
                  {access.role === "owner" ? <TableHead className="text-right">Działania</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrent = member.user_id === access.user.id;
                  const canManage = access.role === "owner" && member.role !== "owner";
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell className="md:min-w-52">
                        <p className="break-all font-bold">{member.email || "Brak adresu e-mail"}</p>
                        {isCurrent ? <p className="mt-1 text-xs text-muted-foreground">To Ty</p> : null}
                      </TableCell>
                      <TableCell><span className="mr-2 text-muted-foreground md:hidden">Rola:</span><RoleBadge role={member.role} /></TableCell>
                      <TableCell>
                        <span className="mr-2 text-muted-foreground md:hidden">Status:</span>
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span className={`size-2 rounded-full ${member.status === "active" ? "bg-emerald-400" : "bg-muted-foreground"}`} aria-hidden="true" />
                          {member.status === "active" ? "Aktywny" : "Nieaktywny"}
                        </span>
                      </TableCell>
                      {access.role === "owner" ? (
                        <TableCell className="md:min-w-64">
                          {canManage ? (
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              {member.status === "active" ? <EditMemberDialog key={`edit-${member.user_id}-${member.role}`} member={member} /> : null}
                              {member.status === "active" ? <DeactivateMemberDialog key={`status-${member.user_id}-${member.status}`} member={member} /> : <ActivateMemberButton member={member} />}
                              {member.status === "active" ? <TransferOwnershipDialog member={member} /> : null}
                            </div>
                          ) : <p className="text-xs text-muted-foreground md:text-right">Rolę właściciela zmienisz przez jej przekazanie.</p>}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Nie ma jeszcze członków zespołu.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zaproszenia oczekujące</CardTitle>
          <CardDescription>Sprawdź stan wysyłki. Zaproszenie w panelu i link w wiadomości mają osobne terminy ważności; jeśli link wygaśnie, wyślij go ponownie.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length ? (
            <Table className={responsiveTable}>
              <TableHeader><TableRow><TableHead>Adres</TableHead><TableHead>Rola</TableHead><TableHead>Wysyłka</TableHead><TableHead>Zaproszenie aktywne do</TableHead>{canInvite ? <TableHead className="text-right">Działania</TableHead> : null}</TableRow></TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const canRevoke = access.role === "owner" || (access.role === "admin" && invitation.invited_by === access.user.id && invitation.role === "viewer");
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="break-all font-bold md:min-w-52">{invitation.email}</TableCell>
                      <TableCell><span className="mr-2 text-muted-foreground md:hidden">Rola:</span><RoleBadge role={invitation.role} /></TableCell>
                      <TableCell><span className="mr-2 text-muted-foreground md:hidden">Wysyłka:</span>{deliveryLabel(invitation)}</TableCell>
                      <TableCell className="text-muted-foreground md:whitespace-nowrap"><span className="mr-2 md:hidden">Zaproszenie aktywne do:</span>{expiryLabel(invitation.expires_at)}</TableCell>
                      {canInvite ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {canRevoke && invitation.delivery_status !== "existing_user" && Date.parse(invitation.expires_at) > Date.parse(referenceTime) ? <RetryInvitationButton invitationId={invitation.id} sent={invitation.delivery_status === "sent"} /> : null}
                            {canRevoke ? <RevokeInvitationDialog invitationId={invitation.id} email={invitation.email} /> : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Brak oczekujących lub nieudanych zaproszeń.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "viewer" }) {
  return <Badge variant={role === "owner" ? "default" : role === "admin" ? "secondary" : "outline"}>{role}</Badge>;
}

function TeamNotice({ children, tone }: { children: React.ReactNode; tone: "success" | "error" | "neutral" }) {
  return <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${tone === "error" ? "border-destructive/40 bg-destructive/10" : tone === "success" ? "border-emerald-400/30 bg-emerald-400/10" : "text-muted-foreground"}`}>{children}</p>;
}

function successMessage(status: string) {
  if (status === "sent") return "Zaproszenie zapisano i wysłano e-mailem.";
  if (status === "existing_user") return "Zaproszenie zapisano. Ta osoba ma już konto i może użyć formularza logowania.";
  if (status === "already_pending") return "Wysyłka tego zaproszenia już trwa lub została niedawno rozpoczęta. Sprawdź stan za chwilę.";
  if (status === "ownership-transferred") return "Rola właściciela została przekazana.";
  return "Zmiana została zapisana.";
}

function errorMessage(error: string) {
  if (error === "delivery-failed") return "Nie udało się wysłać zaproszenia. Możesz ponowić próbę na tym samym zaproszeniu.";
  if (error === "reconciliation-required") return "Wysyłka mogła się udać, ale nie zapisaliśmy jej wyniku. Sprawdź stan i ponów próbę na tym samym zaproszeniu, jeśli to konieczne.";
  if (error === "member-update-rejected") return "Nie udało się zmienić członkostwa. Odśwież stronę i sprawdź aktualną rolę.";
  if (error === "transfer-rejected") return "Nie udało się przekazać roli właściciela. Odbiorca musi być aktywnym członkiem, a Ty nadal musisz mieć rolę właściciela.";
  if (error === "retry-rejected") return "Nie można ponowić tego zaproszenia. Sprawdź, czy nadal oczekuje, nie wygasło i masz uprawnienia do jego obsługi.";
  return "Operacja została odrzucona. Odśwież stronę i spróbuj ponownie.";
}

function deliveryLabel(invitation: AdminInvitation) {
  if (invitation.status === "failed" || invitation.delivery_status === "failed") return `Nieudane · prób: ${invitation.attempt_count}`;
  if (invitation.delivery_status === "existing_user") return "Istniejące konto · link logowania";
  if (invitation.delivery_status === "sent") return `Wysłane · prób: ${invitation.attempt_count}`;
  return invitation.attempt_count ? `Wysyłka w toku · prób: ${invitation.attempt_count}` : "Nie rozpoczęto";
}

function expiryLabel(value: string) {
  const date = new Date(value);
  if (date.getTime() <= Date.now()) return "Wygasło";
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(date);
}
