"use client";

import { useActionState } from "react";
import { createTrackingLinkAction } from "@/app/(admin)/admin/links/actions";
import { AdminInputField, AdminNativeSelectField } from "@/components/admin/admin-form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { NativeSelectOption } from "@/components/ui/native-select";
import { initialAdminFormState } from "@/lib/admin-form-state";

export function TrackingLinkForm({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createTrackingLinkAction, initialAdminFormState, "/admin/links");

  return <form key={state.submission} action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <AdminInputField label="Nazwa" name="label" placeholder="Plakat V2 · wejście" required defaultValue={state.values.label ?? ""} error={state.fieldErrors.label} />
    <AdminNativeSelectField label="Kampania" name="campaignId" defaultValue={state.values.campaignId ?? ""} error={state.fieldErrors.campaignId}>
      <NativeSelectOption value="">Bez kampanii</NativeSelectOption>
      {campaigns.map((campaign) => <NativeSelectOption value={campaign.id} key={campaign.id}>{campaign.name}</NativeSelectOption>)}
    </AdminNativeSelectField>
    <AdminNativeSelectField label="Kanał" name="channelGroup" defaultValue={state.values.channelGroup ?? "offline"} error={state.fieldErrors.channelGroup}>
      <NativeSelectOption value="offline">Offline</NativeSelectOption>
      <NativeSelectOption value="organic_social">Organic social</NativeSelectOption>
      <NativeSelectOption value="ai_referral">AI referral</NativeSelectOption>
      <NativeSelectOption value="referral">Referral</NativeSelectOption>
    </AdminNativeSelectField>
    <AdminInputField label="Source" name="source" defaultValue={state.values.source ?? "poster"} error={state.fieldErrors.source} required />
    <AdminInputField label="Medium" name="medium" defaultValue={state.values.medium ?? "qr"} error={state.fieldErrors.medium} required />
    <AdminInputField label="Asset" name="asset" placeholder="pink-v2" defaultValue={state.values.asset ?? ""} error={state.fieldErrors.asset} />
    <AdminInputField label="Placement" name="placement" placeholder="entrance" defaultValue={state.values.placement ?? ""} error={state.fieldErrors.placement} />
    <AdminNativeSelectField label="Landing" name="landingPath" defaultValue={state.values.landingPath ?? "/"} error={state.fieldErrors.landingPath}>
      <NativeSelectOption value="/">Strona główna</NativeSelectOption>
      <NativeSelectOption value="/kontakt">Kontakt</NativeSelectOption>
    </AdminNativeSelectField>
    {state.formError ? <p role="alert" className="text-sm text-destructive md:col-span-2 xl:col-span-3">{state.formError}</p> : null}
    {state.status === "saved" ? <p role="status" className="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Link i QR zostały utworzone.</p> : null}
    <div className="md:col-span-2 xl:col-span-3"><SubmitButton idle="Wygeneruj link i QR" pending="Generuję…" /></div>
  </form>;
}
