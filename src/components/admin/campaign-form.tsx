"use client";

import { useActionState } from "react";
import { createCampaignAction } from "@/app/(admin)/admin/campaigns/actions";
import { AdminNotice } from "@/components/admin/admin-notice";
import { AdminInputField } from "@/components/admin/admin-form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { initialAdminFormState } from "@/lib/admin-form-state";

export function CampaignForm() {
  const [state, action] = useActionState(createCampaignAction, initialAdminFormState, "/admin/campaigns");

  return <form key={state.submission} action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <AdminInputField label="Nazwa" name="name" placeholder="Loch · 20.09.2026" required defaultValue={state.values.name ?? ""} error={state.fieldErrors.name} />
    <AdminInputField label="Slug (opcjonalny)" name="slug" description="Pusty slug powstanie z nazwy kampanii." placeholder="loch-2026-09-20" defaultValue={state.values.slug ?? ""} error={state.fieldErrors.slug} />
    <AdminInputField label="Start" name="startsOn" type="date" defaultValue={state.values.startsOn ?? ""} error={state.fieldErrors.startsOn} />
    <AdminInputField label="Koniec" name="endsOn" type="date" defaultValue={state.values.endsOn ?? ""} error={state.fieldErrors.endsOn} />
    {state.formError ? <div className="md:col-span-2 xl:col-span-4"><AdminNotice tone="error">{state.formError}</AdminNotice></div> : null}
    {state.status === "saved" ? <div className="md:col-span-2 xl:col-span-4"><AdminNotice tone="success">Kampania została utworzona.</AdminNotice></div> : null}
    <div className="md:col-span-2 xl:col-span-4"><SubmitButton idle="Utwórz kampanię" pending="Tworzę…" /></div>
  </form>;
}
