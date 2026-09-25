"use client";

import { useActionState } from "react";
import { createDestinationAction } from "@/app/(admin)/admin/destinations/actions";
import { AdminInputField, AdminNativeSelectField } from "@/components/admin/admin-form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { NativeSelectOption } from "@/components/ui/native-select";
import { initialAdminFormState } from "@/lib/admin-form-state";

export function DestinationForm() {
  const [state, action] = useActionState(createDestinationAction, initialAdminFormState, "/admin/destinations");

  return <form key={state.submission} action={action} className="grid gap-4 md:grid-cols-2">
    <AdminInputField label="Nazwa" name="label" placeholder="Instagram" required defaultValue={state.values.label ?? ""} error={state.fieldErrors.label} />
    <AdminInputField label="Slug" name="slug" description="Dozwolone są wyłącznie oficjalne kanały." placeholder="tiktok" defaultValue={state.values.slug ?? ""} error={state.fieldErrors.slug} />
    <AdminInputField label="URL" name="url" type="url" placeholder="https://..." required defaultValue={state.values.url ?? ""} error={state.fieldErrors.url} />
    <AdminNativeSelectField label="Ikona" name="icon" defaultValue={state.values.icon ?? "external-link"} error={state.fieldErrors.icon}>
      <NativeSelectOption value="instagram">Instagram</NativeSelectOption>
      <NativeSelectOption value="music">TikTok / muzyka</NativeSelectOption>
      <NativeSelectOption value="facebook">Facebook</NativeSelectOption>
      <NativeSelectOption value="youtube">YouTube</NativeSelectOption>
      <NativeSelectOption value="globe">Oficjalna strona WWW</NativeSelectOption>
    </AdminNativeSelectField>
    <AdminInputField label="Kolejność" name="sortOrder" type="number" min="0" max="10000" placeholder="10" defaultValue={state.values.sortOrder ?? ""} error={state.fieldErrors.sortOrder} />
    <AdminInputField label="Krótki opis" name="description" placeholder="Relacje, zdjęcia i aktualności" defaultValue={state.values.description ?? ""} error={state.fieldErrors.description} />
    {state.formError ? <p role="alert" className="text-sm text-destructive md:col-span-2">{state.formError}</p> : null}
    {state.status === "saved" ? <p role="status" className="text-sm text-muted-foreground md:col-span-2">Destynacja została zapisana.</p> : null}
    <div className="md:col-span-2"><SubmitButton idle="Zapisz destynację" pending="Zapisuję…" /></div>
  </form>;
}
