"use client";

import { Link2, Pencil, UserRoundPlus } from "lucide-react";
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
import type { ReferralParticipant } from "@/lib/admin-referrals";
import {
  createReferralLinkAction,
  createReferralParticipantAction,
  updateReferralParticipantAction,
} from "@/app/(admin)/admin/referrals/actions";

type MembershipOption = { user_id: string; email: string | null; status: string };

export function CreateParticipantDialog({ memberships }: { memberships: MembershipOption[] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}><UserRoundPlus aria-hidden="true" /> Dodaj uczestnika</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy uczestnik poleceń</DialogTitle>
          <DialogDescription>Uczestnik jest niezależny od członkostwa w panelu. Powiązanie konta jest opcjonalne.</DialogDescription>
        </DialogHeader>
        <ParticipantForm action={createReferralParticipantAction} memberships={memberships} />
      </DialogContent>
    </Dialog>
  );
}

export function EditParticipantDialog({ participant, memberships }: { participant: ReferralParticipant; memberships: MembershipOption[] }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}><Pencil aria-hidden="true" /> Edytuj</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj uczestnika</DialogTitle>
          <DialogDescription>Zmiana nazwy nie przepisze historycznych etykiet zapisanych przy pozyskaniu.</DialogDescription>
        </DialogHeader>
        <ParticipantForm action={updateReferralParticipantAction} participant={participant} memberships={memberships} />
      </DialogContent>
    </Dialog>
  );
}

export function ParticipantStatusControl({ participant }: { participant: ReferralParticipant }) {
  if (participant.status === "inactive") {
    return (
      <form action={updateReferralParticipantAction}>
        <ParticipantHiddenFields participant={participant} status="active" />
        <SubmitButton idle="Aktywuj" pending="Aktywuję…" variant="outline" size="sm" className="max-md:min-h-11" />
      </form>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Dezaktywuj</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dezaktywować uczestnika?</AlertDialogTitle>
          <AlertDialogDescription>
            {participant.display_name} zachowa historyczne wyniki. Nowe linki będą dostępne po ponownej aktywacji.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <form action={updateReferralParticipantAction}>
            <ParticipantHiddenFields participant={participant} status="inactive" />
            <SubmitButton idle="Dezaktywuj" pending="Dezaktywuję…" variant="destructive" />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CreateReferralLinkDialog({ participant }: { participant: ReferralParticipant }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />} disabled={participant.status !== "active"}>
        <Link2 aria-hidden="true" /> Nowy link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utwórz link polecający</DialogTitle>
          <DialogDescription className="break-words [overflow-wrap:anywhere]">Powstanie stały link <code>/r/[kod]</code> przypisany do {participant.display_name}.</DialogDescription>
        </DialogHeader>
        <form action={createReferralLinkAction} className="space-y-4">
          <Input type="hidden" name="participantId" value={participant.id} />
          <div className="space-y-2">
            <Label htmlFor={`referral-label-${participant.id}`}>Nazwa linku</Label>
            <Input id={`referral-label-${participant.id}`} name="label" required maxLength={120} placeholder="Instagram bio · wrzesień" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`referral-landing-${participant.id}`}>Strona docelowa</Label>
            <NativeSelect id={`referral-landing-${participant.id}`} name="landingPath" defaultValue="/">
              <NativeSelectOption value="/">Strona główna</NativeSelectOption>
              <NativeSelectOption value="/kontakt">Kontakt / współpraca</NativeSelectOption>
            </NativeSelect>
          </div>
          <DialogFooter><SubmitButton idle="Utwórz link" pending="Tworzę…" /></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParticipantForm({
  action,
  participant,
  memberships,
}: {
  action: (formData: FormData) => void | Promise<void>;
  participant?: ReferralParticipant;
  memberships: MembershipOption[];
}) {
  const id = participant?.id || "new";
  return (
    <form action={action} className="space-y-4">
      {participant ? <Input type="hidden" name="participantId" value={participant.id} /> : null}
      {participant ? <Input type="hidden" name="status" value={participant.status} /> : null}
      <div className="space-y-2">
        <Label htmlFor={`participant-name-${id}`}>Nazwa wyświetlana</Label>
        <Input id={`participant-name-${id}`} name="displayName" required maxLength={120} defaultValue={participant?.display_name} placeholder="Imię lub nazwa zespołu" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`participant-account-${id}`}>Powiązane konto (opcjonalnie)</Label>
        <NativeSelect id={`participant-account-${id}`} name="linkedUserId" defaultValue={participant?.linked_user_id || ""}>
          <NativeSelectOption value="">Bez powiązania</NativeSelectOption>
          {memberships.map((member) => <NativeSelectOption key={member.user_id} value={member.user_id}>{member.email || member.user_id} · {member.status}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <DialogFooter><SubmitButton idle={participant ? "Zapisz zmiany" : "Dodaj uczestnika"} pending="Zapisuję…" /></DialogFooter>
    </form>
  );
}

function ParticipantHiddenFields({ participant, status }: { participant: ReferralParticipant; status: "active" | "inactive" }) {
  return (
    <>
      <Input type="hidden" name="participantId" value={participant.id} />
      <Input type="hidden" name="displayName" value={participant.display_name} />
      <Input type="hidden" name="linkedUserId" value={participant.linked_user_id || ""} />
      <Input type="hidden" name="status" value={status} />
    </>
  );
}
