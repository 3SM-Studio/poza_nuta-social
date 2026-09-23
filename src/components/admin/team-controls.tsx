"use client";

import { UserCog, UserMinus, UserPlus } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AdminRole } from "@/lib/admin";
import type { AdminMember } from "@/lib/admin-team";
import {
  inviteMemberAction,
  revokeInvitationAction,
  transferOwnershipAction,
  updateMemberAction,
} from "@/app/(admin)/admin/team/actions";

export function InviteMemberDialog({ actorRole }: { actorRole: AdminRole }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden="true" /> Zaproś osobę
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaproś do panelu</DialogTitle>
          <DialogDescription>
            Nowa osoba dostanie jednorazowy link. Istniejące konto zaloguje się własnym magic linkiem.
          </DialogDescription>
        </DialogHeader>
        <form action={inviteMemberAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input id="invite-email" name="email" type="email" autoComplete="email" required placeholder="osoba@pozanuta.pl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Rola</Label>
            <NativeSelect id="invite-role" name="role" defaultValue="viewer">
              <NativeSelectOption value="viewer">Viewer · tylko odczyt</NativeSelectOption>
              {actorRole === "owner" ? <NativeSelectOption value="admin">Admin · operacje</NativeSelectOption> : null}
            </NativeSelect>
          </div>
          <DialogFooter>
            <SubmitButton idle="Wyślij zaproszenie" pending="Przygotowuję…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditMemberDialog({ member }: { member: AdminMember }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <UserCog aria-hidden="true" /> Zmień rolę
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zmień dostęp</DialogTitle>
          <DialogDescription className="break-all">
            Zmiana zacznie obowiązywać przy następnym działaniu osoby: {member.email || member.user_id}
          </DialogDescription>
        </DialogHeader>
        <form action={updateMemberAction} className="space-y-4">
          <Input type="hidden" name="targetUserId" value={member.user_id} />
          <Input type="hidden" name="status" value="active" />
          <div className="space-y-2">
            <Label htmlFor={`member-role-${member.user_id}`}>Rola</Label>
            <NativeSelect id={`member-role-${member.user_id}`} name="role" defaultValue={member.role}>
              <NativeSelectOption value="admin">Admin · operacje</NativeSelectOption>
              <NativeSelectOption value="viewer">Viewer · tylko odczyt</NativeSelectOption>
            </NativeSelect>
          </div>
          <DialogFooter>
            <SubmitButton idle="Zapisz rolę" pending="Zapisuję…" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeactivateMemberDialog({ member }: { member: AdminMember }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <UserMinus aria-hidden="true" /> Dezaktywuj
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odebrać dostęp?</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {member.email || member.user_id} straci dostęp przy następnym działaniu w panelu. Samo konto pozostanie bez zmian.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <form action={updateMemberAction}>
            <Input type="hidden" name="targetUserId" value={member.user_id} />
            <Input type="hidden" name="role" value={member.role} />
            <Input type="hidden" name="status" value="inactive" />
            <SubmitButton idle="Dezaktywuj" pending="Odbieram dostęp…" variant="destructive" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ActivateMemberButton({ member }: { member: AdminMember }) {
  return (
    <form action={updateMemberAction}>
      <Input type="hidden" name="targetUserId" value={member.user_id} />
      <Input type="hidden" name="role" value={member.role} />
      <Input type="hidden" name="status" value="active" />
      <SubmitButton idle="Aktywuj" pending="Aktywuję…" variant="ghost" size="sm" className="max-md:min-h-11" />
    </form>
  );
}

export function TransferOwnershipDialog({ member }: { member: AdminMember }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>Przekaż rolę właściciela</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Przekazać rolę właściciela?</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {member.email || member.user_id} zostanie właścicielem, a Ty administratorem. Po potwierdzeniu Twoje uprawnienia się zmienią.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <form action={transferOwnershipAction}>
            <Input type="hidden" name="targetUserId" value={member.user_id} />
            <SubmitButton idle="Przekaż rolę" pending="Przekazuję…" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RevokeInvitationDialog({ invitationId, email }: { invitationId: string; email: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Cofnij</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cofnąć zaproszenie?</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {email} nie uzyska dostępu z tego zaproszenia. Wysłanej wiadomości nie można wycofać, ale jej akceptacja zostanie odrzucona.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <form action={revokeInvitationAction}>
            <Input type="hidden" name="invitationId" value={invitationId} />
            <SubmitButton idle="Cofnij zaproszenie" pending="Cofam…" variant="destructive" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RetryInvitationButton({ email, role }: { email: string; role: "admin" | "viewer" }) {
  return (
    <form action={inviteMemberAction}>
      <Input type="hidden" name="email" value={email} />
      <Input type="hidden" name="role" value={role} />
      <SubmitButton idle="Ponów" pending="Ponawiam…" variant="outline" size="sm" className="max-md:min-h-11" />
    </form>
  );
}
